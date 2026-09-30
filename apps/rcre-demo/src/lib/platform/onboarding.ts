import 'server-only'
import {z} from 'zod'
import {AccessError,type PlatformActor} from './auth'
import {audit} from './service'
import {getRecord,putRecord} from './store'
const safeSocialUrl=z.string().url().max(300).refine(value=>value.startsWith('https://'),'Social links must use HTTPS').or(z.literal(''))
export const onboardingInput=z.object({
  phone:z.string().trim().max(80).default(''),
  licenses:z.array(z.object({state:z.enum(['Alabama','Florida']),number:z.string().trim().min(1).max(100)})).max(10).default([]),
  markets:z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  specialties:z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  biography:z.string().trim().max(5000).default(''),
  socialLinks:z.object({instagram:safeSocialUrl.default(''),facebook:safeSocialUrl.default(''),linkedin:safeSocialUrl.default('')}).default({}),
  websiteTemplate:z.enum(['signature','luxury','rural-land','investor','urban-modern','suburban-family','new-construction','historic-heritage']).default('signature'),
  websiteSlug:z.string().regex(/^[a-z0-9-]{3,80}$/).optional().or(z.literal('')),
  steps:z.object({identityConfirmed:z.boolean().default(false),profileReviewed:z.boolean().default(false),licenseReviewed:z.boolean().default(false),marketsReviewed:z.boolean().default(false),websiteSelected:z.boolean().default(false)}).default({}),
  version:z.number().int().min(0).optional(),
})
export type OnboardingRecord=z.infer<typeof onboardingInput>&{id:string;organizationId:string;memberId:string;savedAt:string}
const key=(a:PlatformActor)=>a.organizationId+':'+a.id
export function loadOnboarding(a:PlatformActor){const id=key(a),stored=getRecord<OnboardingRecord>('onboarding_profiles',id);return {profile:stored??{id,organizationId:a.organizationId,memberId:a.id,phone:'',licenses:[],markets:[],specialties:[],biography:'',socialLinks:{instagram:'',facebook:'',linkedin:''},websiteTemplate:'signature',websiteSlug:'',steps:{identityConfirmed:false,profileReviewed:false,licenseReviewed:false,marketsReviewed:false,websiteSelected:false},version:0},displayName:a.name,photoUploaded:!!getRecord('profile_photos',id)}}
export function saveOnboarding(a:PlatformActor,raw:unknown){const value=onboardingInput.parse(raw),id=key(a),old=getRecord<OnboardingRecord>('onboarding_profiles',id);if(value.version!==undefined&&value.version!==(old?.version??0))throw new AccessError('Onboarding changed in another session; reload before saving',409);const record={...value,id,organizationId:a.organizationId,memberId:a.id,version:(old?.version??0)+1,savedAt:new Date().toISOString()};putRecord('onboarding_profiles',record);audit(a,'onboarding.progress-saved',a.id);return record}
