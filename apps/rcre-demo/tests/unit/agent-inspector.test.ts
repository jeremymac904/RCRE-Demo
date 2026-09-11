import {describe,it,expect,afterAll} from 'vitest'
import {randomUUID} from 'node:crypto'
import {inspectAgents} from '../../src/lib/agent-inspector'
import {createContact,createTask} from '../../src/lib/platform/service'
import {putRecord,readRecords,deleteRecord} from '../../src/lib/platform/store'
import {updateProgress,manageAcademy} from '../../src/lib/academy-service'
import type {PlatformActor} from '../../src/lib/platform/auth'
const org='inspector-'+randomUUID(),now=Date.parse('2026-09-08T12:00:00Z')
const agent:PlatformActor={id:org+'-a',userId:org+'-a',organizationId:org,role:'agent',name:'Synthetic inspector fixture',market:'Florida',officeId:'fl',teamId:'fl'}
const leader:PlatformActor={...agent,id:org+'-leader',userId:org+'-leader',role:'team_leader'}
afterAll(()=>{for(const kind of ['contacts','tasks','audit','academy_progress','academy_assignment'])for(const r of readRecords<{id:string;organizationId?:string}>(kind))if(r.organizationId===org)deleteRecord(kind,r.id)})
describe('Scoped agent inspection',()=>{
 it('separates attempted outreach, connected evidence and inactive/never contact states',()=>{const c=createContact(agent,{firstName:'Contacted',lastName:'Example',email:''});putRecord('contacts',{...c,firstTouchAt:'2026-08-01T12:00:00Z',lastOutboundAt:'2026-08-02T12:00:00Z',timeline:[{at:'2026-08-01T12:00:00Z',kind:'call',direction:'out',label:'Call attempted: no answer'},{at:'2026-08-02T12:00:00Z',kind:'call',direction:'out',label:'Connected conversation: confirmed next step'}]});createContact(agent,{firstName:'Never',lastName:'Recorded',email:''});createTask(agent,{contactId:c.id,title:'Synthetic overdue task',dueAt:'2026-09-07T12:00:00Z'});const result=inspectAgents(leader,agent.id,now).agent!;expect(result.summary.recordedCallAttempts).toBe(2);expect(result.summary.explicitConnectedConversations).toBe(1);expect(result.summary.contactedInactive).toBe(1);expect(result.summary.noRecordedFirstOutreach).toBe(1);expect(result.summary.overdueTasks).toBe(1);expect(result.events.every(e=>e.href==='/crm/'+c.id)).toBe(true)})
 it('returns actual assigned training and stored completion',()=>{updateProgress(agent,{lessonId:'c01-l01',complete:true});manageAcademy({...leader,role:'trainer'},{action:'assignment',courseId:'c01',targetType:'agent',target:agent.id,due:'2026-10-01'});const result=inspectAgents(leader,agent.id,now).agent!;expect(result.training.completedLessonCount).toBe(1);expect(result.training.assignments).toHaveLength(1);expect(result.training.assignments[0].complete).toBe(false)})
 it('denies ordinary roles and direct cross-office or tenant inspection',()=>{expect(()=>inspectAgents(agent,agent.id,now)).toThrow();expect(()=>inspectAgents({...leader,officeId:'al'},agent.id,now)).toThrow();expect(()=>inspectAgents({...leader,organizationId:'unrelated'},agent.id,now)).toThrow();expect(inspectAgents(leader,undefined,now).roster.every(r=>r.officeId==='fl')).toBe(true)})
})
