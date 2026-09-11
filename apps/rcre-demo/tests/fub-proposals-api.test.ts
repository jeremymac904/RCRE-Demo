import {describe,it,expect,vi} from 'vitest'
import {randomUUID} from 'node:crypto'
const session=vi.hoisted(()=>({id:'u-sarah'}))
vi.mock('../src/lib/platform/auth',async()=>{const actual=await vi.importActual<any>('../src/lib/platform/auth');return {...actual,requireActor:async()=>actual.PERSONAS.find((p:any)=>p.id===session.id)}})
import {GET,POST} from '../src/app/api/platform/[...path]/route'
import {getRecord,putRecord} from '../src/lib/platform/store'
import {PERSONAS} from '../src/lib/platform/auth'
import {createContact} from '../src/lib/platform/service'
const agent=PERSONAS.find(p=>p.id==='u-sarah')!
const params=(...path:string[])=>({params:Promise.resolve({path})})
const request=(route:string,body?:unknown)=>new Request('http://localhost:3200/api/platform/'+route,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined)
describe('FUB proposed change API',()=>{
 it('returns a truthful staged result and supports scoped list/discard without changing the replica',async()=>{session.id=agent.id;const c=createContact(agent,{firstName:'Source '+randomUUID(),lastName:'Synthetic'});putRecord('contacts',{...c,sourceSystem:'fub-local-fixture',fubId:88199});const r=await POST(request('contacts/'+c.id,{version:c.version,firstName:'Proposed only'}),params('contacts',c.id));expect(r.status).toBe(200);const result=await r.json();expect(result.changeStatus).toBe('awaiting_connector');expect(result.message).toContain('source fields remain unchanged');expect(getRecord<any>('contacts',c.id).firstName).toBe(c.firstName);const list=await (await GET(request('fub-proposals?contactId='+c.id),params('fub-proposals'))).json();expect(list.some((p:any)=>p.id===result.proposedChangeId)).toBe(true);const discarded=await POST(request('fub-proposals',{id:result.proposedChangeId,action:'discard'}),params('fub-proposals'));expect(discarded.status).toBe(200);expect(getRecord<any>('fub_proposed_changes',result.proposedChangeId).state).toBe('discarded')})
 it('does not expose proposals to an unrelated agent and denies execution',async()=>{session.id='u-vito';const listed=await (await GET(request('fub-proposals'),params('fub-proposals'))).json();expect(listed.every((p:any)=>p.ownerId==='u-vito')).toBe(true);const execute=await POST(request('fub-proposals',{action:'execute',id:'anything'}),params('fub-proposals'));expect(execute.status).toBe(403)})
 it('serves authorized retained history explicitly while excluding it from active CRM',async()=>{session.id=agent.id;const c=createContact(agent,{firstName:'Archived synthetic',lastName:'History'});putRecord('contacts',{...c,sourceDeleted:true});expect((await GET(request('contacts/'+c.id),params('contacts',c.id))).status).toBe(404);const archived=await GET(request('contacts/'+c.id+'?includeDeleted=1'),params('contacts',c.id));expect((await archived.json()).sourceDeleted).toBe(true);session.id='u-vito';expect((await GET(request('contacts/'+c.id+'?includeDeleted=1'),params('contacts',c.id))).status).toBe(404)})
})
