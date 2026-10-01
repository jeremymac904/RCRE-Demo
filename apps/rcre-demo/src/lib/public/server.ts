import {getRecord,readRecords} from '@/lib/platform/store'
import {dataMode} from '@/lib/config/env'
import {getRepository} from '@/lib/db'
import {lenderDefaults,publicAgents,type Lender,type PublicContent} from './content'
import {agentProfileFor} from '@/lib/platform/agent-profiles'
const publicOrganizationId = () => {
  const value = process.env.RCRE_ORGANIZATION_ID ?? ''
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : ''
}
const asCmsRecord = (row: { id: string; status: 'published' | 'archived'; revision: number; published?: Record<string, unknown> }, organizationId: string): PublicContent => ({
  ...(row.published ?? {}), id: row.id, organizationId, status: row.status, revision: row.revision,
}) as PublicContent
export async function getPublicRecord(path:string){
  if(dataMode()==='live'){
    const organizationId=publicOrganizationId();if(!organizationId)return undefined
    try {
      const row=await (await getRepository()).getPublicContentProjection(organizationId,path)
      return row?asCmsRecord(row,organizationId):undefined
    } catch {
      // Do not fall through to local SQLite when the durable public projection is unavailable.
      return undefined
    }
  }
  const record=await getRecord<PublicContent>('public_content',path);return record&&(!record.organizationId||record.organizationId==='rcre-local')?record:undefined
}
export async function getPublished(path:string){const record=await getPublicRecord(path);return record?.status==='archived'?undefined:record?.published}
export async function publishedPages(){
  if(dataMode()==='live'){const organizationId=publicOrganizationId();if(!organizationId)return [];try{return (await (await getRepository()).listPublicContentProjections(organizationId)).filter(row=>row.status==='published'&&row.published).map(row=>asCmsRecord(row,organizationId))}catch{return []}}
  return (await readRecords<PublicContent>('public_content')).filter(r=>(!r.organizationId||r.organizationId==='rcre-local')&&r.status!=='archived'&&r.published)
}
export async function getLender():Promise<Lender>{if(dataMode()==='live')return {...lenderDefaults};const setting=await getRecord<{id:string;value?:{lender?:Partial<Lender>}}>('settings','brokerage');return {...lenderDefaults,...setting?.value?.lender}}

export async function getBrokerage(){const s=dataMode()==='live'?null:await getRecord<{id:string;value?:{displayName?:string;legalName?:string;publicEmail?:string;publicPhone?:string;alOfficeAddress?:string;flOfficeAddress?:string;flPhone?:string}}>('settings','brokerage');return {displayName:s?.value?.displayName||'River City Real Estate Group',legalName:s?.value?.legalName||'RCRE Group',publicEmail:s?.value?.publicEmail||'info@rcregroup.com',publicPhone:s?.value?.publicPhone||'(205) 851-8866',alOfficeAddress:s?.value?.alOfficeAddress??'1 Chase Corporate Dr # 400, Birmingham AL 35244',flOfficeAddress:s?.value?.flOfficeAddress??'',flPhone:s?.value?.flPhone||'(904) 906-9038'}}

export async function archivedPublicPaths(){if(dataMode()==='live'){const organizationId=publicOrganizationId();if(!organizationId)return [];try{return (await (await getRepository()).listPublicContentProjections(organizationId)).filter(row=>row.status==='archived').map(row=>row.id)}catch{return []}}return readRecords<PublicContent>('public_content').filter(r=>(!r.organizationId||r.organizationId==='rcre-local')&&r.status==='archived').map(r=>r.id)}

const activePublicAgent = (slug:string) => slug !== 'lekeshia-jones'
export function publicAgentDirectoryAvailable(){return true}
async function livePublicAgentProfiles() {
  const organizationId = publicOrganizationId()
  if (!organizationId) return []
  try {
    const repository = await getRepository()
    return repository.listPublicAgentProfiles ? await repository.listPublicAgentProfiles(organizationId) : []
  } catch { return [] }
}
export async function publicAgentDirectorySlugs(){
  return (await publicAgentProfiles()).map(profile => profile.slug)
}
function publicAgentFromProjection(slug: string, projection?: { profile: Record<string, unknown> }) {
  const original = publicAgents.find(agent => agent.slug === slug)
  if (!original || !activePublicAgent(slug)) return undefined
  const profile = projection?.profile
  if (!profile || profile.publicVisible !== true) return undefined
  const licenses = Array.isArray(profile.licenses) ? profile.licenses.map((license: unknown) => {
    if (!license || typeof license !== 'object') return ''
    const item = license as Record<string, unknown>
    return [item.state, item.number].filter(value => typeof value === 'string' && value.trim()).join(' ')
  }).filter(Boolean).join(' · ') : ''
  const markets = Array.isArray(profile.markets) ? profile.markets.filter(value => typeof value === 'string').join(', ') : ''
  return { ...original, phone: typeof profile.phone === 'string' && profile.phone ? profile.phone : original.phone, email: typeof profile.email === 'string' && profile.email ? profile.email : original.email, license: licenses || original.license, market: markets || original.market, role: typeof profile.professionalTitle === 'string' && profile.professionalTitle ? profile.professionalTitle : original.role, bio: typeof profile.biography === 'string' && profile.biography ? profile.biography : original.bio, publicVisible: true }
}
function publicCanonicalAgentFromProjection(projection: { verifiedPersonId: string; profile: Record<string, unknown>; person?: Record<string, unknown>; websiteSlug?: string }) {
  const person = projection.person
  const slug = typeof person?.slug === 'string' ? person.slug : ''
  const websiteSlug = projection.websiteSlug
  if (!slug || !websiteSlug || person?.publicVisible !== true || projection.profile.publicVisible !== true || publicAgents.some(agent => agent.slug === slug)) return undefined
  const array = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  const licenseItems = Array.isArray(person.licenses) ? person.licenses : []
  const licenses = licenseItems.map(value => {
    if (!value || typeof value !== 'object') return ''
    const license = value as Record<string, unknown>
    return [license.number, license.state ? `(${license.state})` : ''].filter(value => typeof value === 'string' && value.trim()).join(' ')
  }).filter(Boolean).join(' · ')
  const markets = array(person.markets)
  return {
    slug: websiteSlug,
    canonicalPersonId: slug,
    name: String(person.name ?? ''),
    phone: String(person.phone ?? ''),
    email: String(projection.profile.email ?? person.email ?? ''),
    license: licenses,
    market: markets.join(', '),
    role: String(person.professionalTitle ?? 'REALTOR®'),
    bio: String(person.biography ?? ''),
    image: projection.profile.headshotAssetId ? `/api/public/agent-photo/${encodeURIComponent(websiteSlug)}` : null,
    specialties: array(person.specialties),
    publicVisible: true,
  }
}
export async function publicAgentProfiles() {
  if (dataMode() === 'live') {
    const projections = await livePublicAgentProfiles()
    const bySlug = new Map(projections.map(profile => [profile.verifiedPersonId, profile]))
    const legacy = publicAgents.flatMap(agent => {
      const profile = publicAgentFromProjection(agent.slug, bySlug.get(agent.slug))
      return profile ? [profile] : []
    })
    const legacySlugs = new Set(publicAgents.map(agent => agent.slug))
    const canonical = projections.flatMap(projection => {
      const profile = publicCanonicalAgentFromProjection(projection)
      return profile && !legacySlugs.has(projection.verifiedPersonId) ? [profile] : []
    })
    return [...legacy, ...canonical]
  }
  return publicAgents.flatMap(agent => {
    if (!activePublicAgent(agent.slug)) return []
    const managed = agentProfileFor(agent.slug)
    return managed?.publicVisible ? [{ ...agent, phone: managed.phone, email: managed.email, license: managed.license, market: managed.market, role: managed.publicTitle, bio: managed.bio, publicVisible: true }] : []
  })
}
export async function publicAgentProfileFor(slug:string){
  return (await publicAgentProfiles()).find(profile => profile.slug === slug)
}
export async function resolvePublicProfile(path:string){
  const slug = path.startsWith('/agent/') ? path.slice('/agent/'.length) : undefined
  if(!slug || slug.includes('/'))return undefined
  const profile=await publicAgentProfileFor(slug)
  if(!profile)return undefined
  if(dataMode()==='live')return profile
  const record=getRecord<PublicContent>('public_content',path)
  if(record?.organizationId&&record.organizationId!=='rcre-local'||record?.status==='archived')return undefined
  const p=record?.published
  return {...profile,...p?.profile,name:p?.title||profile.name,bio:p?.body||profile.bio,image:p?.image?p.image.src:profile.image}
}
