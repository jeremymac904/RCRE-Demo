import {it,expect} from 'vitest'
import {PERSONAS} from '../../src/lib/platform/auth'
import {queue,jobs} from '../../src/lib/services/ai'
import {hermesCredentials} from '../../src/lib/services/hermes-runtime'
import {putRecord,getRecord} from '../../src/lib/platform/store'
it('recovers an abandoned running request as a durable failure without rerunning its action',()=>{
 const a=PERSONAS[0],j=queue(a,'Synthetic interrupted request')
 putRecord('ai_jobs',{...j,state:'running',updatedAt:new Date(Date.now()-181000).toISOString()})
 const recovered=jobs(a).find(r=>r.id===j.id)!
 expect(recovered.state).toBe('failed');expect(recovered.error).toContain('restarted')
 expect(getRecord<any>('ai_jobs',j.id).state).toBe('failed')
 expect(jobs(PERSONAS[1]).some(r=>r.id===j.id)).toBe(false)
})
it('does not accept an endpoint or an environment flag as owner-isolation credentials',()=>{
 const prior=process.env.RCRE_HERMES_ISOLATED;process.env.RCRE_HERMES_ISOLATED='true'
 try{expect(()=>hermesCredentials('unconfigured-test-owner','rcre-local','http://127.0.0.1:8642')).toThrow('dedicated OS-isolated')}finally{if(prior===undefined)delete process.env.RCRE_HERMES_ISOLATED;else process.env.RCRE_HERMES_ISOLATED=prior}
})
