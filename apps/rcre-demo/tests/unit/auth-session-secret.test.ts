import {afterEach,describe,expect,it,vi} from 'vitest'

vi.mock('server-only',()=>({}))
const state=vi.hoisted(()=>({records:new Map<string,Map<string,any>>(),cookie:'',deleted:false}))
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>state.cookie?{value:state.cookie}:undefined,delete:()=>{state.cookie='';state.deleted=true}})}))
vi.mock('@/lib/platform/store',()=>({
 getRecord:(kind:string,id:string)=>state.records.get(kind)?.get(id)??null,
 putRecord:(kind:string,row:any)=>{const table=state.records.get(kind)??new Map();table.set(row.id,row);state.records.set(kind,table);return row},
 readRecords:(kind:string)=>Array.from(state.records.get(kind)?.values()??[]),
}))
import {recover,invite,redeem} from '@/lib/platform/access'
import {AccessError,actorOrNull,authorizeMemberChange,can,createSession,demoEnabled,revokeSession,sessionCookieOptions,type PlatformActor} from '@/lib/platform/auth'

const broker:PlatformActor={id:'u-taquilla',userId:'u-taquilla',organizationId:'rcre-local',role:'managing_broker',name:'Taquilla Allen',market:'Alabama',officeId:'al',teamId:'al'}
const agent:PlatformActor={id:'u-vito',userId:'u-vito',organizationId:'rcre-local',role:'agent',name:'Jordan Ellis',market:'Alabama',officeId:'al',teamId:'al'}
const florida:PlatformActor={...agent,id:'u-sarah',userId:'u-sarah',name:'Alex Morgan',market:'Florida',officeId:'fl',teamId:'fl'}

afterEach(()=>{vi.unstubAllEnvs();state.records.clear();state.cookie='';state.deleted=false})

describe('production authentication boundary',()=>{
 it('does not enable local persona login from a production demo flag',()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('RCRE_DEMO_ENABLED','1');vi.stubEnv('RCRE_SESSION_SECRET','s'.repeat(48))
  expect(demoEnabled()).toBe(false)
  expect(()=>createSession('u-taquilla')).toThrow('Local personas unavailable')
  expect(()=>invite(broker,{name:'New agent',email:'new@example.test',role:'agent',officeId:'al'})).toThrow('Google identity and invitation delivery are not configured')
  expect(()=>recover('new@example.test')).toThrow('Google identity and recovery delivery are not configured')
  expect(()=>redeem('a'.repeat(64))).toThrow('Google sign-in is not configured')
  expect(sessionCookieOptions().secure).toBe(true)
 })
 it('requires server session state and rejects a revoked or missing session',async()=>{
  vi.stubEnv('NODE_ENV','test');vi.stubEnv('RCRE_SESSION_SECRET','s'.repeat(48))
  const token=createSession('u-julio');state.cookie=token
  expect((await actorOrNull())?.id).toBe('u-julio')
  const body=token.split('.')[0];const payload=JSON.parse(Buffer.from(body,'base64url').toString())
  const sessions=state.records.get('sessions')!;const record=sessions.get(payload.sessionId)
  sessions.set(payload.sessionId,{...record,revoked:true})
  expect(await actorOrNull()).toBeNull()
  sessions.delete(payload.sessionId)
  expect(await actorOrNull()).toBeNull()
 })
 it('logout writes revocation before clearing the cookie',async()=>{
  vi.stubEnv('NODE_ENV','test');vi.stubEnv('RCRE_SESSION_SECRET','s'.repeat(48))
  const token=createSession('u-julio');state.cookie=token
  await revokeSession()
  expect(state.deleted).toBe(true)
  expect(await actorOrNull()).toBeNull()
 })
 it('denies expired or disabled users even when the signed cookie is valid',async()=>{
  vi.stubEnv('NODE_ENV','test');vi.stubEnv('RCRE_SESSION_SECRET','s'.repeat(48))
  const token=createSession('u-julio');state.cookie=token
  state.cookie=token+'.tampered'
  expect(await actorOrNull()).toBeNull()
  state.cookie=token
  const body=token.split('.')[0];const payload=JSON.parse(Buffer.from(body,'base64url').toString())
  const sessions=state.records.get('sessions')!;const record=sessions.get(payload.sessionId)
  sessions.set(payload.sessionId,{...record,expiresAt:Date.now()-1})
  expect(await actorOrNull()).toBeNull()
  sessions.set(payload.sessionId,{...record,expiresAt:Date.now()+10000})
  state.records.set('members',new Map([['u-julio',{id:'u-julio',disabled:true}]]))
  expect(await actorOrNull()).toBeNull()
 })
})

describe('member administration boundaries',()=>{
 it('grants Taquilla member administration and denies agents and Margie',()=>{
  expect(can(broker,'settings.people')).toBe(true)
  expect(can(agent,'settings.people')).toBe(false)
  expect(can({...agent,id:'u-tc',role:'transaction_coordinator'},'settings.people')).toBe(false)
 })
 it('allows Taquilla to manage same-office agent lifecycle and role without changing scope',()=>{
  expect(()=>authorizeMemberChange(broker,agent,{role:'team_leader',officeId:'al',teamId:'al'})).not.toThrow()
  expect(()=>authorizeMemberChange(broker,agent,{role:'agent',officeId:'al',teamId:'al'})).not.toThrow()
 })
 it.each([
  ['cross office',florida,{role:'agent' as const,officeId:'fl',teamId:'fl'}],
  ['self',broker,{role:'agent' as const,officeId:'al',teamId:'al'}],
  ['elevation',agent,{role:'broker_owner' as const,officeId:'al',teamId:'al'}],
  ['cross brokerage role',agent,{role:'marketing_admin' as const,officeId:'al',teamId:'al'}],
  ['scope widening',agent,{role:'agent' as const,officeId:'all',teamId:'all'}],
 ] as const)('denies %s changes from a managing broker',(_,target,change)=>{
  expect(()=>authorizeMemberChange(broker,target,change)).toThrow(AccessError)
 })
 it('denies a transaction coordinator attempting to administer members',()=>{
  expect(()=>authorizeMemberChange({...agent,role:'transaction_coordinator'},agent,{role:'agent',officeId:'al',teamId:'al'})).toThrow(AccessError)
 })
})
