import {describe,it,expect} from 'vitest'
import {PERSONAS} from '../../src/lib/platform/auth'
import {loadOnboarding,saveOnboarding} from '../../src/lib/platform/onboarding'
const agent=PERSONAS.find(p=>p.role==='agent')!
describe('onboarding profile progress',()=>{
 it('saves optional profile fields and progress per authenticated actor',()=>{
  const saved=saveOnboarding(agent,{version:0,phone:'(904) 555-0100',licenses:[{state:'Florida',number:'SL0000001'}],markets:['Jacksonville'],specialties:['First-time buyers'],biography:'A short profile.',socialLinks:{instagram:'',facebook:'',linkedin:''},websiteTemplate:'urban-modern',websiteSlug:'agent-example',steps:{identityConfirmed:true,profileReviewed:true,licenseReviewed:true,marketsReviewed:true,websiteSelected:true}})
  const loaded=loadOnboarding(agent)
  expect(loaded.profile.version).toBe(saved.version)
  expect(loaded.profile.licenses).toEqual([{state:'Florida',number:'SL0000001'}])
  expect(loaded.profile.steps.websiteSelected).toBe(true)
  expect(loaded.displayName).toBe(agent.name)
  expect(loaded.photoUploaded).toBe(false)
 })
 it('rejects malformed identity-bearing profile data and stale saves',()=>{
  expect(()=>saveOnboarding(agent,{version:0,licenses:[{state:'Florida',number:''}]})).toThrow()
  const version=loadOnboarding(agent).profile.version
  saveOnboarding(agent,{version,phone:'',licenses:[],markets:[],specialties:[],biography:'',socialLinks:{instagram:'',facebook:'',linkedin:''},websiteTemplate:'signature',steps:{}})
  expect(()=>saveOnboarding(agent,{version,phone:'',licenses:[],markets:[],specialties:[],biography:'',socialLinks:{instagram:'',facebook:'',linkedin:''},websiteTemplate:'signature',steps:{}})).toThrow(/changed/i)
 })
})
