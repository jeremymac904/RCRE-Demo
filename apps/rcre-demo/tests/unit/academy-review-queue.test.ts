import {it,expect} from 'vitest'
import {PERSONAS} from '../../src/lib/platform/auth'
import {academyReviews,manageAcademy} from '../../src/lib/academy-service'
const trainer=PERSONAS.find(p=>p.role==='trainer')!,owner=PERSONAS.find(p=>p.role==='broker_owner')!
it('keeps publication review scoped and removes a published exact version from the shared queue',()=>{
 const course=manageAcademy(trainer,{title:'Synthetic queue lesson',body:'Original local course review fixture',status:'review'}) as any
 expect(academyReviews(PERSONAS[0])).toEqual([])
 expect(academyReviews({...owner,organizationId:'unrelated'})).toEqual([])
 expect(academyReviews(trainer).find(r=>r.id==='academy:'+course.id)?.state).toBe('Awaiting an independent reviewer')
 expect(academyReviews(owner).find(r=>r.id==='academy:'+course.id)?.href).toBe('/training/manage#'+course.id)
 expect(()=>manageAcademy(trainer,{...course,status:'published'})).toThrow('different instructor')
 manageAcademy(owner,{...course,status:'published'})
 expect(academyReviews(owner).some(r=>r.id==='academy:'+course.id)).toBe(false)
})
