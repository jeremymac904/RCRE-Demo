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
    const row=await (await getRepository()).getPublicContentProjection(organizationId,path)
    return row?asCmsRecord(row,organizationId):undefined
  }
  const record=await getRecord<PublicContent>('public_content',path);return record&&(!record.organizationId||record.organizationId==='rcre-local')?record:undefined
}
export async function getPublished(path:string){const record=await getPublicRecord(path);return record?.status==='archived'?undefined:record?.published}
export async function publishedPages(){
  if(dataMode()==='live'){const organizationId=publicOrganizationId();if(!organizationId)return [];return (await (await getRepository()).listPublicContentProjections(organizationId)).filter(row=>row.status==='published'&&row.published).map(row=>asCmsRecord(row,organizationId))}
  return (await readRecords<PublicContent>('public_content')).filter(r=>(!r.organizationId||r.organizationId==='rcre-local')&&r.status!=='archived'&&r.published)
}
export async function getLender():Promise<Lender>{const setting=await getRecord<{id:string;value?:{lender?:Partial<Lender>}}>('settings','brokerage');return {...lenderDefaults,...setting?.value?.lender}}

export async function getBrokerage(){const s=await getRecord<{id:string;value?:{displayName?:string;legalName?:string;publicEmail?:string;publicPhone?:string;alOfficeAddress?:string;flOfficeAddress?:string;flPhone?:string}}>('settings','brokerage');return {displayName:s?.value?.displayName||'River City Real Estate Group',legalName:s?.value?.legalName||'RCRE Group',publicEmail:s?.value?.publicEmail||'info@rcregroup.com',publicPhone:s?.value?.publicPhone||'(205) 851-8866',alOfficeAddress:s?.value?.alOfficeAddress??'1 Chase Corporate Dr # 400, Birmingham AL 35244',flOfficeAddress:s?.value?.flOfficeAddress??'',flPhone:s?.value?.flPhone||'(904) 906-9038'}}

export async function archivedPublicPaths(){if(dataMode()==='live'){const organizationId=publicOrganizationId();if(!organizationId)return [];return (await (await getRepository()).listPublicContentProjections(organizationId)).filter(row=>row.status==='archived').map(row=>row.id)}return readRecords<PublicContent>('public_content').filter(r=>(!r.organizationId||r.organizationId==='rcre-local')&&r.status==='archived').map(r=>r.id)}

export function resolvePublicProfile(path:string){const original=publicAgents.find(a=>path==='/agent/'+a.slug);if(!original)return undefined;const managed=agentProfileFor(original.slug);if(!managed?.publicVisible)return undefined;const record=getRecord<PublicContent>('public_content',path);if(record?.organizationId&&record.organizationId!=='rcre-local'||record?.status==='archived')return undefined;const p=record?.published;return {...original,phone:managed.phone,email:managed.email,license:managed.license,market:managed.market,role:managed.publicTitle,...p?.profile,name:p?.title||original.name,bio:p?.body||managed.bio,image:p?.image?p.image.src:original.image}}
