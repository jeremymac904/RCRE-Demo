import 'server-only'
import { cookies } from 'next/headers'
import { randomBytes, createHash } from 'node:crypto'
import { getRecord, putRecord, readRecords } from './store'
export type PlatformRole='agent'|'team_leader'|'managing_broker'|'broker_owner'|'transaction_coordinator'|'marketing_admin'|'trainer'
export interface PlatformActor {id:string;userId:string;organizationId:string;role:PlatformRole;name:string;market:string;teamId:string;officeId:string}
export const PERSONAS:PlatformActor[]=[
{id:'u-sarah',name:'Alex Morgan',role:'agent',market:'Florida',teamId:'fl',officeId:'fl'},
{id:'u-vito',name:'Jordan Ellis',role:'agent',market:'Alabama',teamId:'al',officeId:'al'},
{id:'u-leader',name:'Casey Brooks',role:'team_leader',market:'Alabama',teamId:'al',officeId:'al'},
{id:'u-taquilla',name:'Morgan Reed',role:'managing_broker',market:'Alabama',teamId:'al',officeId:'al'},
{id:'u-julio',name:'Taylor Hayes',role:'broker_owner',market:'Both markets',teamId:'all',officeId:'all'},
{id:'u-tc',name:'Riley Parker',role:'transaction_coordinator',market:'Florida',teamId:'fl',officeId:'fl'},
{id:'u-marketing',name:'Avery Lane',role:'marketing_admin',market:'Both markets',teamId:'all',officeId:'all'},
{id:'u-trainer',name:'Quinn Davis',role:'trainer',market:'Both markets',teamId:'all',officeId:'all'},
].map(p=>({...p,role:p.role as PlatformRole,userId:p.id,organizationId:'rcre-local'}))
export function directory(organizationId:string){const members=readRecords<any>('members');const known=[...PERSONAS,...members.filter(m=>m.actor&&!PERSONAS.some(p=>p.id===m.id)).map(m=>m.actor as PlatformActor)];return known.filter(p=>p.organizationId===organizationId).map(p=>{const m=members.find(m=>m.id===p.id);return {...p,role:m?.role??p.role,officeId:m?.officeId??p.officeId,teamId:m?.teamId??p.teamId,market:m?.officeId==='al'?'Alabama':m?.officeId==='fl'?'Florida':p.market,disabled:!!m?.disabled}})}
export const SESSION_COOKIE='rcre_local_session'
export class AccessError extends Error { constructor(message='Access denied',public status=403){super(message)} }
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
export function demoEnabled(){return process.env.RCRE_APP_MODE==='local' || process.env.NODE_ENV!=='production'}
export function createSession(id:string){if(!demoEnabled())throw new AccessError('Local personas unavailable',403);const actor=PERSONAS.find(p=>p.id===id)??getRecord<{actor:PlatformActor}>('members',id)?.actor;if(!actor)throw new AccessError('Unknown persona',400);if(getRecord<any>('members',id)?.disabled)throw new AccessError('Membership inactive');const token=randomBytes(32).toString('hex');putRecord('sessions',{id:hash(token),actorId:id,createdAt:new Date().toISOString(),expiresAt:Date.now()+12*3600000,revoked:false});return token}
export async function actorOrNull():Promise<PlatformActor|null>{if(!demoEnabled())return null;const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)return null;const s=getRecord<{actorId:string;expiresAt:number;revoked:boolean}>('sessions',hash(token));if(!s||s.revoked||s.expiresAt<Date.now())return null;const actor=PERSONAS.find(p=>p.id===s.actorId)??getRecord<{actor:PlatformActor}>('members',s.actorId)?.actor;if(!actor)return null;const member=getRecord<{id:string;disabled?:boolean;role?:PlatformRole}>('members',actor.id);if(member?.disabled)return null;return directory(actor.organizationId).find(p=>p.id===actor.id)??null}
export async function requireActor(){const a=await actorOrNull();if(!a)throw new AccessError('Session expired. Sign in again.',401);return a}
export async function revokeSession(){const t=(await cookies()).get(SESSION_COOKIE)?.value;if(t){const id=hash(t);const s=getRecord<{id:string}>('sessions',id);if(s)putRecord('sessions',{...s,revoked:true})}}
export function can(a:PlatformActor,c:string):boolean {
if(c==='ai'||c.startsWith('ai.')||c==='personal'||c==='community.read'||c==='academy.read')return true
if(a.role==='broker_owner')return true
const leadership=['team_leader','managing_broker'].includes(a.role)
if(c.startsWith('transactions.'))return ['agent','team_leader','managing_broker','transaction_coordinator'].includes(a.role)
if(c==='calendar'&&a.role==='marketing_admin')return true
if(c==='approvals'&&a.role==='marketing_admin')return true
if(c.startsWith('crm')||c==='calendar'||c==='pipeline')return a.role==='agent'||leadership
if(c==='command'||c==='reporting'||c==='recruiting'||c==='approvals')return leadership
if(c.startsWith('marketing'))return ['agent','marketing_admin','team_leader','managing_broker'].includes(a.role)
if(c.startsWith('academy.')||c.startsWith('community.'))return a.role==='trainer'||leadership
if(c==='cms')return a.role==='marketing_admin'
if(c.startsWith('settings.'))return c==='settings.personal'||c==='settings.account'||c==='settings.ai'||(c==='settings.marketing'&&a.role==='marketing_admin')||(c==='settings.academy'&&a.role==='trainer')||(c==='settings.leads'&&leadership)
return false }
export function assertCapability(a:PlatformActor,c:string){if(!can(a,c))throw new AccessError()}
export function scopedOwner(a:PlatformActor,ownerId:string,officeId?:string){if(a.role==='broker_owner')return true;if(a.role==='agent')return ownerId===a.id;if(['team_leader','managing_broker'].includes(a.role))return officeId===a.officeId;return false}
export function sessionList(a:PlatformActor){return readRecords<{id:string;actorId:string;createdAt:string;expiresAt:number;revoked:boolean}>('sessions').filter(s=>s.actorId===a.id).map(({id,createdAt,expiresAt,revoked})=>({id,createdAt,expiresAt,revoked}))}
