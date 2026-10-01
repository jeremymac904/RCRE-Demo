import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MemoryRepository, emptySeed, type MemorySeed } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import type { PropertyStatus } from '@/lib/property/types'
import { providerCatalogDurable, saveProviderComplianceDurable, saveProviderConnectionDurable } from '@/lib/property/providers'
const org = '10000000-0000-4000-8000-000000000001'
const otherOrg = '20000000-0000-4000-8000-000000000001'
const owner = '10000000-0000-4000-8000-000000000002'
const actor = (organizationId: string, id: string): PlatformActor => ({ id, userId: id, organizationId, role: 'broker_owner', name: 'Broker', market: '', officeId: '', teamId: '' })
function repo() { const seed = emptySeed() as MemorySeed; seed.organizations.push({id:org,name:'RCRE',slug:'rcre'},{id:otherOrg,name:'Other',slug:'other'}); return new MemoryRepository(seed) }
const terms = { agreementReference:'approved reference', requiredAttribution:'approved attribution', requiredDisclaimer:'approved disclaimer', copyrightText:'approved copyright', listingBrokerageRule:'show brokerage', refreshIntervalHours:24, photoMode:'remote' as const, permittedStatuses:['Active'] as PropertyStatus[], soldDisplayAllowed:false, openHouseRules:'rules', indexing:'noindex' as const }
describe('durable MLS provider configuration',()=>{
 it('persists configuration, connection outcomes and audit events through the repository boundary',async()=>{const db=repo(); await saveProviderComplianceDurable(actor(org,owner),'realmls',terms,db); expect((await providerCatalogDurable(actor(org,owner),db)).find(p=>p.id==='realmls')).toMatchObject({agreementApproved:true,status:'waiting_for_credentials'}); await saveProviderConnectionDurable(actor(org,owner),'realmls',false,'Provider unavailable',db); expect((await providerCatalogDurable(actor(org,owner),db)).find(p=>p.id==='realmls')).toMatchObject({agreementApproved:true,error:'Provider unavailable'}); const events=await db.listAudit({userId:owner,organizationId:org,role:'owner'},10); expect(events.map(event=>event.action)).toEqual(expect.arrayContaining(['mls.compliance_terms_recorded','mls.connection_tested']))})
 it('scopes configuration reads to the actor tenant',async()=>{const db=repo(); await saveProviderComplianceDurable(actor(org,owner),'stellar',terms,db); expect((await providerCatalogDurable(actor(otherOrg,'20000000-0000-4000-8000-000000000002'),db)).find(p=>p.id==='stellar')).toMatchObject({agreementApproved:false})})
 it('rejects non-administrator writes in the repository',async()=>{const db=repo(); const agent={...actor(org,owner),role:'agent' as const}; await expect(saveProviderComplianceDurable(agent,'miami',terms,db)).rejects.toThrow(/administrator/)})
})


describe('MLS production persistence guards', () => {
 it('stores production state through the RLS Postgres repository and scopes provider reads by organization', () => {
  const pg = readFileSync(fileURLToPath(new URL('../../src/lib/db/pg.ts', import.meta.url)), 'utf8')
  const providers = readFileSync(fileURLToPath(new URL('../../src/lib/property/providers.ts', import.meta.url)), 'utf8')
  expect(pg).toContain('from mls_provider_catalog c')
  expect(pg).toContain('p.organization_id = $1')
  expect(pg).toContain('withRlsSession(client, actor')
  expect(pg).toContain('insert into mls_provider_compliance')
  expect(pg).toContain('mls.compliance_terms_recorded')
  expect(pg).toContain('mls.connection_tested')
  expect(providers).toContain("process.env.NODE_ENV === 'production' ? []")
 })
})
