import {it,expect} from 'vitest'
import {PERSONAS} from '../../src/lib/platform/auth'
import {canEditMarketing,canReadMarketing} from '../../src/lib/platform/service'
const owner=PERSONAS.find(a=>a.role==='broker_owner')!,leader=PERSONAS.find(a=>a.role==='team_leader')!,agent=PERSONAS[0],marketer=PERSONAS.find(a=>a.role==='marketing_admin')!
it('restricts private drafts by office and exposes only approved reuse across offices',()=>{const draft={organizationId:owner.organizationId,ownerId:agent.id,officeId:'fl',status:'draft'};expect(canEditMarketing(leader,draft)).toBe(false);expect(canReadMarketing(leader,draft)).toBe(false);expect(canReadMarketing(leader,{...draft,status:'approved'})).toBe(true);expect(canEditMarketing(leader,{...draft,status:'approved'})).toBe(false);expect(canEditMarketing(marketer,draft)).toBe(true);expect(canReadMarketing({...owner,organizationId:'another'},draft)).toBe(false)})
