import 'server-only'
import {getRecord,putRecord} from '@/lib/platform/store'
import { getRepository } from '@/lib/db'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import type { Actor, MlsProviderComplianceInput, MlsProviderState, Repository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import type {ProviderAdapter,ProviderCapabilities,ProviderDescriptor,ProviderConnection,PropertySearchFilters,PropertyListing,PropertyImage,PropertyOpenHouse,ProviderCompliance,PropertyStatus} from './types'
const noCapabilities:ProviderCapabilities={activeListings:false,comingSoon:false,pending:false,closed:false,openHouses:false,history:false,members:false,offices:false,photos:false,virtualTours:false,documents:false,geographicFields:false,waterfront:false,newConstruction:false,land:false,farm:false,rental:false,manufacturedHomes:false,incrementalUpdates:false,mapBounds:false}
const catalog=[
{id:'realmls',name:'realMLS / Flexmls',systems:['Flexmls'],states:['FL' as const],accessPaths:['Spark API','RESO Web API'],credentialEnv:['REALMLS_API_KEY','REALMLS_CLIENT_ID','REALMLS_CLIENT_SECRET']},
{id:'stellar',name:'Stellar MLS',systems:['Bridge API','MLS Grid'],states:['FL' as const],accessPaths:['Bridge API','MLS Grid'],credentialEnv:['STELLAR_MLS_API_KEY','STELLAR_MLS_CLIENT_ID','STELLAR_MLS_CLIENT_SECRET']},
{id:'miami',name:'MIAMI REALTORS',systems:['TRESTLE','Bridge'],states:['FL' as const],accessPaths:['TRESTLE','Bridge API'],credentialEnv:['MIAMI_MLS_API_KEY','MIAMI_MLS_CLIENT_ID','MIAMI_MLS_CLIENT_SECRET']},
{id:'greater-alabama',name:'Greater Alabama MLS',systems:['Paragon','OpenMLS','RESO'],states:['AL' as const],accessPaths:['Approved RESO Web API','Approved provider feed'],credentialEnv:['GALMLS_API_KEY','GALMLS_CLIENT_ID','GALMLS_CLIENT_SECRET']},
]
function hasCredentials(names:string[]){return names.some(name=>Boolean(process.env[name]?.trim()))}
const providerCodes: Record<string, string> = { realmls: 'realmls_flexmls', stellar: 'stellar_mls', miami: 'miami_realtors', 'greater-alabama': 'greater_alabama_mls' }
const repoActor = (actor: PlatformActor): Actor => ({ userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role), officeId: actor.officeId })
function descriptor(provider: typeof catalog[number], saved: (Partial<MlsProviderState> & Record<string, any>) | undefined): ProviderDescriptor {
  const credentialConfigured = hasCredentials(provider.credentialEnv) || saved?.secretConfigured === true
  const complianceRow: any = saved?.compliance
  const agreementApproved = saved?.agreementApproved === true || complianceRow?.approvalState === 'approved'
  const connected = (saved?.lastConnectionOk === true || saved?.status === 'connected') && credentialConfigured && agreementApproved
  const compliance: ProviderCompliance = {
    status: agreementApproved ? 'approved' : 'pending', displayName: provider.name,
    photoMode: 'not-approved', permittedStatuses: [] as PropertyStatus[], soldDisplayAllowed: null, indexing: 'pending',
    ...(complianceRow ? {
      requiredAttribution: complianceRow.requiredAttribution ?? undefined,
      requiredDisclaimer: complianceRow.requiredDisclaimer ?? undefined,
      copyrightText: complianceRow.copyrightText ?? undefined,
      listingBrokerageRule: complianceRow.listingBrokerageRules?.rule ?? complianceRow.listingBrokerageRule,
      refreshIntervalHours: complianceRow.refreshRequirements?.intervalHours ?? complianceRow.refreshIntervalHours,
      photoMode: typeof complianceRow.photoRules?.mode === 'string' ? complianceRow.photoRules.mode as ProviderCompliance['photoMode'] : (complianceRow.photoMode ?? 'not-approved'),
      permittedStatuses: complianceRow.permittedStatuses as PropertyStatus[], soldDisplayAllowed: complianceRow.soldDisplayAllowed,
      openHouseRules: typeof complianceRow.openHouseRules?.rules === 'string' ? complianceRow.openHouseRules.rules : typeof complianceRow.openHouseRules === 'string' ? complianceRow.openHouseRules : undefined,
      indexing: typeof complianceRow.indexing === 'string' ? complianceRow.indexing : complianceRow.searchIndexingAllowed == null ? 'pending' : complianceRow.searchIndexingAllowed ? 'allowed' : 'noindex',
      agreementReference: complianceRow.approvedSource ?? complianceRow.agreementReference, approvedAt: complianceRow.approvedAt,
    } : {})
  }
  const status = saved?.status === 'disabled' ? 'disabled' : connected ? 'connected' : !credentialConfigured ? 'waiting_for_credentials' : agreementApproved ? 'ready_for_connection' : 'waiting_for_agreement'
  return { id: provider.id, name: provider.name, systems: provider.systems, states: provider.states, status, accessPaths: provider.accessPaths, credentialConfigured, agreementApproved, mode: saved?.connectionMode ?? saved?.mode ?? 'disabled', capabilities: { ...noCapabilities }, compliance, lastAttemptedSync: saved?.lastConnectionTestAt ?? saved?.lastAttemptedSync, error: saved?.lastConnectionError ?? saved?.error ?? undefined }
}
export function providerCatalog(organizationId='rcre-local'):ProviderDescriptor[]{
  // Production never consults SQLite/platform-store state. Public search stays fail-closed
  // until provider activation consumes a durable status projection.
  const rows = process.env.NODE_ENV === 'production' ? [] : catalog.map(provider => getRecord<any>('mls_provider_state',organizationId+':'+provider.id)).filter(Boolean)
  return catalog.map(provider => descriptor(provider, rows.find(row => row.providerId === provider.id) as (Partial<MlsProviderState> & Record<string, any>) | undefined))
}
export async function providerCatalogDurable(actor: PlatformActor, repository?: Repository): Promise<ProviderDescriptor[]> {
  const repo = repository ?? await getRepository()
  const states = await repo.listMlsProviderStates(repoActor(actor))
  return catalog.map(provider => descriptor(provider, states.find(state => state.providerCode === providerCodes[provider.id])))
}
export async function saveProviderComplianceDurable(actor: PlatformActor, providerId: string, compliance: { agreementReference: string; requiredAttribution: string; requiredDisclaimer: string; copyrightText: string; listingBrokerageRule: string; refreshIntervalHours: number; photoMode: 'remote'|'cached'|'local-derivative'; permittedStatuses: PropertyStatus[]; soldDisplayAllowed: boolean; openHouseRules: string; indexing: 'allowed'|'noindex' }, repository?: Repository) {
  const provider = catalog.find(row => row.id === providerId)
  if (!provider) throw new Error('Provider not found')
  const repo = repository ?? await getRepository()
  const input: MlsProviderComplianceInput = { providerCode: providerCodes[providerId]!, agreementReference: compliance.agreementReference, requiredAttribution: compliance.requiredAttribution, requiredDisclaimer: compliance.requiredDisclaimer, copyrightText: compliance.copyrightText, listingBrokerageRules: { rule: compliance.listingBrokerageRule }, refreshRequirements: { intervalHours: compliance.refreshIntervalHours }, photoRules: { mode: compliance.photoMode }, permittedStatuses: compliance.permittedStatuses, soldDisplayAllowed: compliance.soldDisplayAllowed ?? false, openHouseRules: { rules: compliance.openHouseRules ?? '' }, searchIndexingAllowed: compliance.indexing === 'allowed', approvedBy: actor.id }
  return repo.saveMlsProviderCompliance(repoActor(actor), input)
}
export async function saveProviderConnectionDurable(actor: PlatformActor, providerId: string, ok: boolean, message: string, repository?: Repository) {
  const code = providerCodes[providerId]
  if (!code) throw new Error('Provider not found')
  return (repository ?? await getRepository()).recordMlsProviderConnection(repoActor(actor), code, ok, message)
}
export function providerById(id:string){return providerCatalog().find(p=>p.id===id)}
export function allCapabilitiesKnownFalse(){return{...noCapabilities}}
export class UnconfiguredProviderAdapter implements ProviderAdapter{constructor(readonly providerId:string,private readonly providerName:string){}async testConnection():Promise<ProviderConnection>{return{ok:false,providerId:this.providerId,checkedAt:new Date().toISOString(),message:this.providerName+' is waiting for its approved API adapter and access configuration.'}}async discoverCapabilities(){return{...noCapabilities}}async discoverMetadata(){return{providerId:this.providerId,discovery:'blocked until provider credentials, approved scope, and API metadata are available'}}async search(_filters:PropertySearchFilters){return{items:[] as PropertyListing[]}}async getListing(_id:string){return null}async getPhotos(_id:string){return[] as PropertyImage[]}async getOpenHouses(_id:string){return[] as PropertyOpenHouse[]}}
export function providerAdapters():ProviderAdapter[]{return catalog.map(p=>new UnconfiguredProviderAdapter(p.id,p.name))}
export function adapterFor(id:string){const provider=catalog.find(p=>p.id===id);return provider?new UnconfiguredProviderAdapter(provider.id,provider.name):null}
export function saveProviderCompliance(organizationId:string,providerId:string,compliance:Omit<ProviderCompliance,'status'|'displayName'|'approvedAt'>,approvedBy:string){const provider=catalog.find(p=>p.id===providerId);if(!provider)throw new Error('Provider not found');const key=organizationId+':'+providerId,old=getRecord<any>('mls_provider_state',key),now=new Date().toISOString(),state={...(old??{}),id:key,organizationId,providerId,agreementApproved:true,approvedBy,approvedAt:now,status:'ready_for_connection',mode:old?.mode??'disabled',compliance:{...compliance,status:'approved',displayName:provider.name,approvedAt:now},lastConnectionOk:false,error:undefined};putRecord('mls_provider_state',state);return state}
export function saveProviderConnection(organizationId:string,providerId:string,ok:boolean,message:string){const key=organizationId+':'+providerId,old=getRecord<any>('mls_provider_state',key),state={...(old??{id:key,organizationId,providerId}),lastAttemptedSync:new Date().toISOString(),lastConnectionOk:ok,status:ok?'connected':old?.status??'degraded',error:ok?undefined:message};putRecord('mls_provider_state',state);return state}
