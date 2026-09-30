import 'server-only'
import { z } from 'zod'
import { publicAgents } from '@/lib/public/content'
import { AccessError, assertCapability, type PlatformActor } from './auth'
import { getRecord, putRecord, readRecords } from './store'
import { audit } from './service'

const safeSocialUrl=z.string().url().max(300).refine(value=>value.startsWith('https://'),'Social links must use HTTPS').or(z.literal(''))
export const agentProfileInput = z.object({
  publicTitle: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(80),
  email: z.string().trim().email().max(250),
  license: z.string().trim().max(300),
  market: z.enum(['Alabama', 'Florida', 'Alabama & Florida']),
  bio: z.string().trim().max(5000),
  specialties: z.array(z.string().trim().min(1).max(80)).max(12),
  socialLinks: z.object({
    instagram: safeSocialUrl,
    facebook: safeSocialUrl,
    linkedin: safeSocialUrl,
  }),
  websiteTemplate: z.enum(['signature','luxury','rural-land','investor','urban-modern','suburban-family','new-construction','historic-heritage']),
  publicVisible: z.boolean(),
})
export type AgentProfileInput = z.infer<typeof agentProfileInput>
export type AgentProfileRecord = AgentProfileInput & {id:string;organizationId:string;version:number;updatedAt:string;updatedBy:string}

const leadership = (title:string) => /broker|owner|managing/i.test(title)
function canonical(slug:string){return publicAgents.find(p=>p.slug===slug)}
export function agentProfileFor(slug:string,organizationId='rcre-local') {
  const person=canonical(slug)
  if(!person)return null
  const overlay=getRecord<AgentProfileRecord>('agent_profile_overlays',organizationId+':'+slug)
  return {
    id:slug, organizationId, version:overlay?.version??0,
    publicTitle:overlay?.publicTitle??person.role,
    phone:overlay?.phone??person.phone, email:overlay?.email??person.email,
    license:overlay?.license??person.license, market:overlay?.market??person.market,
    bio:overlay?.bio??person.bio, specialties:overlay?.specialties??[],
    socialLinks:overlay?.socialLinks??{instagram:'',facebook:'',linkedin:''},
    websiteTemplate:overlay?.websiteTemplate??'signature',
    publicVisible:overlay?.publicVisible??true, image:person.image,
  }
}
export function listAdminAgentProfiles(actor:PlatformActor) {
  assertCapability(actor,'settings.people')
  return publicAgents.flatMap(person=>{
    const profile=agentProfileFor(person.slug,actor.organizationId)!
    return actor.role==='broker_owner' || (actor.role==='managing_broker' && person.slug!=='taquilla-allen' && !leadership(person.role) && person.market.includes('Alabama')) ? [profile] : []
  })
}
export function saveAdminAgentProfile(actor:PlatformActor,slug:string,input:unknown) {
  assertCapability(actor,'settings.people')
  const person=canonical(slug)
  if(!person)throw new AccessError('Canonical RCRE person not found',404)
  if(actor.role==='managing_broker' && (slug==='taquilla-allen'||leadership(person.role)||!person.market.includes('Alabama')))
    throw new AccessError('This canonical profile is outside your authorized scope',403)
  const value=agentProfileInput.parse(input)
  if(actor.role==='managing_broker' && !value.market.includes('Alabama'))
    throw new AccessError('Managing broker edits must retain the Alabama market relationship',403)
  const id=actor.organizationId+':'+slug
  const old=getRecord<AgentProfileRecord>('agent_profile_overlays',id)
  const expected=z.object({version:z.number().int().min(0)}).parse(input).version
  if(expected!==(old?.version??0))throw new AccessError('Profile changed; reload before saving',409)
  const record:AgentProfileRecord={...value,id,organizationId:actor.organizationId,version:(old?.version??0)+1,updatedAt:new Date().toISOString(),updatedBy:actor.id}
  putRecord('agent_profile_overlays',record)
  audit(actor,'agent.public-profile-updated',slug)
  return record
}
export function visiblePublicAgentSlugs(organizationId='rcre-local') {
  return publicAgents.filter(p=>agentProfileFor(p.slug,organizationId)?.publicVisible!==false).map(p=>p.slug)
}
export function agentProfileOverlayCount(organizationId='rcre-local') {
  return readRecords<AgentProfileRecord>('agent_profile_overlays').filter(r=>r.organizationId===organizationId).length
}
