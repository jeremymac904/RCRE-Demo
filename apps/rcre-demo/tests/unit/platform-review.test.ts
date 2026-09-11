import {afterAll,describe,it,expect} from 'vitest'
import {randomUUID} from 'node:crypto'
import {createAppointment,getSetting,saveSetting,updateContact,listContacts,createContact} from '../../src/lib/platform/service'
import {putRecord,readRecords,deleteRecord} from '../../src/lib/platform/store'
import type {PlatformActor} from '../../src/lib/platform/auth'
const org='review-'+randomUUID();const agent:PlatformActor={id:org+'-agent',userId:org+'-agent',organizationId:org,role:'agent',name:'Review Agent',market:'Florida',teamId:'fl',officeId:'fl'}
const leader:PlatformActor={...agent,id:org+'-leader',userId:org+'-leader',role:'team_leader'}
afterAll(()=>{for(const kind of ['appointments','contacts','settings','audit'])for(const r of readRecords<{id:string;organizationId?:string}>(kind))if(r.organizationId===org||r.id.includes(org))deleteRecord(kind,r.id)})
describe('Independent platform acceptance review',()=>{
 it('denies a TC direct calendar writes without calendar capability',()=>{expect(()=>createAppointment({...agent,role:'transaction_coordinator'},{title:'Unauthorized',startsAt:'2027-01-02T12:00:00Z',endsAt:'2027-01-02T13:00:00Z'})).toThrow()})
 it('preserves the original owner when a leader edits a scoped appointment',()=>{const id=org+'-appointment';putRecord('appointments',{id,organizationId:org,officeId:'fl',ownerId:agent.id,title:'Original',contactId:null,startsAt:'2027-02-02T12:00:00Z',endsAt:'2027-02-02T13:00:00Z',version:1});const next=createAppointment(leader,{id,version:1,title:'Edited',startsAt:'2027-02-02T14:00:00Z',endsAt:'2027-02-02T15:00:00Z'});expect(next.ownerId).toBe(agent.id)})
 it('rejects stale appointment edits',()=>{const id=org+'-stale';putRecord('appointments',{id,organizationId:org,officeId:'fl',ownerId:agent.id,title:'Current',contactId:null,startsAt:'2027-03-02T12:00:00Z',endsAt:'2027-03-02T13:00:00Z',version:2});expect(()=>createAppointment(agent,{id,version:1,title:'Stale',startsAt:'2027-03-02T14:00:00Z',endsAt:'2027-03-02T15:00:00Z'})).toThrow()})
 it('isolates personal settings when identity IDs repeat across organizations',()=>{saveSetting(agent,'personal',{name:'First organization'},0);expect(getSetting({...agent,organizationId:org+'-other'},'personal').value).toEqual({})})
 it('denies cross-office contact access and protects stale contact edits',()=>{const contact=createContact(agent,{firstName:'Synthetic',lastName:'Review',email:''});expect(listContacts({...leader,officeId:'al'}).some(c=>c.id===contact.id)).toBe(false);updateContact(agent,contact.id,{version:1,firstName:'Edited'});expect(()=>updateContact(agent,contact.id,{version:1,firstName:'Stale'})).toThrow()})
})
