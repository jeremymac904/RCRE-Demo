import {describe,it,expect} from 'vitest'
import {PERSONAS} from '../../src/lib/platform/auth'
import {listAdminAgentProfiles,saveAdminAgentProfile,visiblePublicAgentSlugs} from '../../src/lib/platform/agent-profiles'
import {getRecord} from '../../src/lib/platform/store'
import {getWebsiteConfig} from '../../src/lib/agent-website/agent-service'
import {resolvePublicProfile} from '../../src/lib/public/server'
import {publicAgents} from '../../src/lib/public/content'
import {agentProfileFor} from '../../src/lib/platform/agent-profiles'
const owner=PERSONAS.find(p=>p.role==='broker_owner')!
const taquilla=PERSONAS.find(p=>p.id==='u-taquilla')!
const complete=(profile:any,overrides:any={})=>({...profile,...overrides})
describe('canonical public agent administration',()=>{
 it('returns canonical roster to owner and only authorized Alabama profiles to managing broker',()=>{
  expect(listAdminAgentProfiles(owner)).toHaveLength(13)
  expect(listAdminAgentProfiles(owner).find(p=>p.id==='lekeshia-jones')).toBeDefined()
  expect(agentProfileFor('lekeshia-jones')?.publicVisible).toBe(false)
  expect(visiblePublicAgentSlugs(owner.organizationId)).toHaveLength(12)
  expect(visiblePublicAgentSlugs(owner.organizationId)).not.toContain('lekeshia-jones')
  const local=listAdminAgentProfiles(taquilla)
  expect(local.some(p=>p.id==='julio-arango'||p.id==='taquilla-allen')).toBe(false)
  expect(local.every(p=>p.market.includes('Alabama'))).toBe(true)
  expect(()=>listAdminAgentProfiles(PERSONAS[0])).toThrow()
 })
 it('retains Lekeshia historically, allows owner reactivation, and keeps Margies public title separate from TC access',()=>{
  const lekeshia=listAdminAgentProfiles(owner).find(p=>p.id==='lekeshia-jones')!
  const reactivated=saveAdminAgentProfile(owner,lekeshia.id,complete(lekeshia,{version:lekeshia.version,publicVisible:true}))
  expect(visiblePublicAgentSlugs(owner.organizationId)).toContain('lekeshia-jones')
  saveAdminAgentProfile(owner,lekeshia.id,complete(reactivated,{version:reactivated.version,publicVisible:false}))
  expect(publicAgents.find(p=>p.slug==='margie-olsen-alvarez')?.role).toBe('REALTOR®')
  expect(agentProfileFor('margie-olsen-alvarez')?.publicTitle).toBe('REALTOR®')
  expect(PERSONAS.find(p=>p.id==='u-tc')?.role).toBe('transaction_coordinator')
 })
 it('persists public profile fields while keeping identity and operating role separate',async()=>{
  const p=listAdminAgentProfiles(owner).find(x=>x.id==='sarah-brockner')!
  const saved=saveAdminAgentProfile(owner,p.id,complete(p,{version:p.version,publicTitle:'REALTOR®',market:'Florida',bio:'Verified review bio.',publicVisible:false}))
  expect(saved.bio).toBe('Verified review bio.')
  expect(saved.publicVisible).toBe(false)
  expect(getRecord<any>('members','u-sarah')?.role).not.toBe('REALTOR®')
  expect(visiblePublicAgentSlugs(owner.organizationId)).not.toContain('sarah-brockner')
  expect(await resolvePublicProfile('/agent/sarah-brockner')).toBeUndefined()
 })
 it('prevents managing broker from editing Florida-only, self, and leadership public identities',()=>{
  const target=listAdminAgentProfiles(owner).find(x=>x.id==='urban-garrett')!
  expect(()=>saveAdminAgentProfile(taquilla,'julio-arango',complete(target,{version:target.version}))).toThrow(/scope/i)
  expect(()=>saveAdminAgentProfile(taquilla,'taquilla-allen',complete(target,{version:target.version}))).toThrow(/scope/i)
  expect(()=>saveAdminAgentProfile(taquilla,target.id,complete(target,{version:target.version,market:'Florida'}))).toThrow(/Alabama/i)
 })
 it('requires optimistic concurrency and validates links and public role fields',()=>{
  const p=listAdminAgentProfiles(owner).find(x=>x.id==='molly-plude')!
  saveAdminAgentProfile(owner,p.id,complete(p,{version:0,bio:'First saved version',websiteTemplate:'urban-modern'}))
  expect(getWebsiteConfig('molly-plude')?.theme).toBe('rcre-urban')
  expect(()=>saveAdminAgentProfile(owner,p.id,complete(p,{version:0,bio:'Stale update'}))).toThrow(/changed/i)
  expect(()=>saveAdminAgentProfile(owner,'molly-plude',complete(p,{version:1,socialLinks:{instagram:'javascript:alert(1)',facebook:'',linkedin:''}}))).toThrow()
  expect(()=>saveAdminAgentProfile(owner,'missing-person',p)).toThrow(/not found/i)
 })
})
