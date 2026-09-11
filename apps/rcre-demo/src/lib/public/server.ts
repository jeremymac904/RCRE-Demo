import {getRecord,readRecords} from '@/lib/platform/store'
import {lenderDefaults,publicAgents,type Lender,type PublicContent} from './content'
export async function getPublicRecord(path:string){const record=await getRecord<PublicContent>('public_content',path);return record&&(!record.organizationId||record.organizationId==='rcre-local')?record:undefined}
export async function getPublished(path:string){const record=await getPublicRecord(path);return record?.status==='archived'?undefined:record?.published}
export async function publishedPages(){return (await readRecords<PublicContent>('public_content')).filter(r=>(!r.organizationId||r.organizationId==='rcre-local')&&r.status!=='archived'&&r.published)}
export async function getLender():Promise<Lender>{const setting=await getRecord<{id:string;value?:{lender?:Partial<Lender>}}>('settings','brokerage');return {...lenderDefaults,...setting?.value?.lender}}

export async function getBrokerage(){const s=await getRecord<{id:string;value?:{displayName?:string;legalName?:string;publicEmail?:string;publicPhone?:string;alOfficeAddress?:string;flOfficeAddress?:string;flPhone?:string}}>('settings','brokerage');return {displayName:s?.value?.displayName||'River City Real Estate Group',legalName:s?.value?.legalName||'RCRE Group',publicEmail:s?.value?.publicEmail||'info@rcregroup.com',publicPhone:s?.value?.publicPhone||'(205) 851-8866',alOfficeAddress:s?.value?.alOfficeAddress??'1 Chase Corporate Dr # 400, Birmingham AL 35244',flOfficeAddress:s?.value?.flOfficeAddress??'',flPhone:s?.value?.flPhone||'(904) 906-9038'}}

export async function archivedPublicPaths(){return readRecords<PublicContent>('public_content').filter(r=>(!r.organizationId||r.organizationId==='rcre-local')&&r.status==='archived').map(r=>r.id)}

export function resolvePublicProfile(path:string){const original=publicAgents.find(a=>path==='/agent/'+a.slug);if(!original)return undefined;const record=getRecord<PublicContent>('public_content',path);if(record?.organizationId&&record.organizationId!=='rcre-local'||record?.status==='archived')return undefined;const p=record?.published;return {...original,...p?.profile,name:p?.title||original.name,bio:p?.body||original.bio,image:p?.image?p.image.src:original.image}}
