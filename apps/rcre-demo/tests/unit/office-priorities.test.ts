import {it,expect} from 'vitest'
import {PERSONAS} from '../../src/lib/platform/auth'
import {createContact,getSetting,saveSetting,priorities} from '../../src/lib/platform/service'
import {putRecord} from '../../src/lib/platform/store'
it('uses the contact office policy in owner views and honors a paused policy',()=>{
 const owner=PERSONAS.find(p=>p.role==='broker_owner')!,leader=PERSONAS.find(p=>p.role==='team_leader')!,agent=PERSONAS.find(p=>p.id==='u-vito')!
 const c=createContact(agent,{firstName:'Synthetic',lastName:'Office policy'})
 putRecord('contacts',{...c,receivedAt:new Date(Date.now()-30*60000).toISOString(),firstTouchAt:null})
 const policy=getSetting(leader,'leads')
 saveSetting(leader,'leads',{...policy.value,enabled:true,responseMinutes:1,graceMinutes:0},policy.version)
 expect(priorities(owner).some(p=>p.contact.id===c.id)).toBe(true)
 const current=getSetting(leader,'leads')
 saveSetting(leader,'leads',{...current.value,enabled:false},current.version)
 expect(priorities(owner).some(p=>p.contact.id===c.id)).toBe(false)
 expect(priorities(agent).some(p=>p.contact.id===c.id)).toBe(false)
})
