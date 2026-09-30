import 'server-only'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import { getPgPool } from '@/lib/db/pg'
import type { Repository } from '@/lib/db/repository'
import { getAuthPersistence } from '@/lib/auth/persistence'
import { publicAgents } from '@/lib/public/content'
import { AccessError, actorOrNull, assertCapability, type PlatformActor } from '@/lib/platform/auth'
import { repositoryActor, type OnboardingRecord } from '@/lib/platform/onboarding'
import type { AgentProfile, AgentWebsiteConfig, AgentWebsiteTheme } from './types'

const safeImageReference = z.string().trim().max(1000).refine(value => !value || value.startsWith('/') && !value.startsWith('//') || /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:[/?#]|$)/i.test(value), 'Use a secure image URL or a local site asset.')
const themes = ['rcre-signature','rcre-luxury','rcre-rural','rcre-investor','rcre-urban','rcre-suburban','rcre-new-construction','rcre-historic'] as const
const saveSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,80}$/),
  theme: z.enum(themes),
  markets: z.array(z.string().trim().min(1).max(100)).max(20),
  specialties: z.array(z.string().trim().min(1).max(100)).max(20),
  headline: z.string().trim().max(180).default(''),
  tagline: z.string().trim().max(240).default(''),
  heroImage: safeImageReference.default(''),
  seoTitle: z.string().trim().max(180).default(''),
  seoDescription: z.string().trim().max(500).default(''),
  customDomain: z.string().trim().max(253).default(''),
  biography: z.string().trim().max(5000).optional(),
  socialLinks: z.object({ instagram: z.string().url().max(300).startsWith('https://').or(z.literal('')), facebook: z.string().url().max(300).startsWith('https://').or(z.literal('')), linkedin: z.string().url().max(300).startsWith('https://').or(z.literal('')) }).optional(),
  published: z.boolean().default(false),
  version: z.number().int().min(0).default(0),
})
type WebsiteData = z.infer<typeof saveSchema> & { ownerUserId: string; organizationId: string; updatedAt: string }

export type AgentWebsiteRenderData = { profile: AgentProfile; config: AgentWebsiteConfig; verifiedPersonId: string }

function verifiedPersonByEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const matches = publicAgents.filter(person => person.email.trim().toLowerCase() === normalized)
  return matches.length === 1 ? matches[0] : null
}

const templates: Record<string, AgentWebsiteTheme> = {
  signature:'rcre-signature', luxury:'rcre-luxury', 'rural-land':'rcre-rural', investor:'rcre-investor',
  'urban-modern':'rcre-urban', 'suburban-family':'rcre-suburban', 'new-construction':'rcre-new-construction', 'historic-heritage':'rcre-historic',
}

/** Loads the current member's durable website state. No legacy SQLite reads in production. */
export async function loadAgentWebsite(actor: PlatformActor, repository?: Repository) {
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const [profileRow, siteRow] = await Promise.all([
    repo.getDomainRecord<OnboardingRecord & Record<string, unknown>>(context, 'member_profiles', actor.id),
    repo.getDomainRecord<WebsiteData>(context, 'agent_websites', actor.id),
  ])
  const profile = profileRow?.data
  const site = siteRow?.data
  const member = (await getAuthPersistence()).listMembers(actor).then(rows => rows.find(row => row.userId === actor.id))
  const identity = await member
  const verified = profile?.verifiedPersonId ? publicAgents.find(person => person.slug === profile.verifiedPersonId) : identity ? verifiedPersonByEmail(identity.email) ?? undefined : undefined
  return {
    profile: profile ?? null,
    canonical: verified ? { slug: verified.slug, name: verified.name, image: verified.image } : null,
    member: identity ? { name: identity.name, email: identity.email, active: identity.active, canonicalPersonId: identity.canonicalPersonId } : null,
    website: site ?? null,
    version: siteRow?.version ?? 0,
    persistence: 'durable-repository' as const,
  }
}

/** Save a private draft. Public identity and operating role are sourced from canonical member/profile records. */
export async function saveAgentWebsite(actor: PlatformActor, raw: unknown, repository?: Repository) {
  const input = saveSchema.parse(raw)
  const members = await (await getAuthPersistence()).listMembers(actor)
  const self = members.find(member => member.userId === actor.id)
  if (!self?.active || !['agent', 'team_leader', 'managing_broker', 'broker_owner'].includes(self.platformRole)) throw new AccessError('An active Realtor membership is required to manage an agent website.', 403)
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const current = await repo.getDomainRecord<WebsiteData>(context, 'agent_websites', actor.id)
  if (input.version !== (current?.version ?? 0)) throw new AccessError('Website settings changed in another session; reload before saving.', 409)
  const profileRow = await repo.getDomainRecord<OnboardingRecord & Record<string, unknown>>(context, 'member_profiles', actor.id)
  const priorProfile = profileRow?.data
  const priorSlug = typeof priorProfile?.websiteSlug === 'string' ? priorProfile.websiteSlug : ''
  if (priorSlug && priorSlug !== input.slug) throw new AccessError('The website URL is already established; contact brokerage administration to change it.', 409)
  const savedAt = new Date().toISOString()
  const { biography, socialLinks, ...siteInput } = input
  const website: WebsiteData = { ...siteInput, ownerUserId: actor.id, organizationId: actor.organizationId, updatedAt: savedAt, published: current?.data.published ?? false }
  const verifiedSlug = typeof priorProfile?.verifiedPersonId === 'string' ? priorProfile.verifiedPersonId : verifiedPersonByEmail(self.email)?.slug ?? null
  const nextProfile = { ...(priorProfile ?? {}), ...(biography !== undefined ? { biography } : {}), ...(socialLinks ? { socialLinks } : {}), ...(verifiedSlug ? { verifiedPersonId: verifiedSlug } : {}), id: actor.id, memberId: actor.id, organizationId: actor.organizationId, websiteSlug: input.slug, websiteTemplate: Object.entries(templates).find(([, value]) => value === input.theme)?.[0] ?? 'signature', version: (profileRow?.version ?? 0) + 1, savedAt }
  await repo.putDomainRecordsAtomic(context, [
    { collection: 'agent_websites', recordId: actor.id, ownerUserId: actor.id, data: website as unknown as Record<string, unknown>, ...(current ? { expectedVersion: current.version } : {}) },
    { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: nextProfile as unknown as Record<string, unknown>, ...(profileRow ? { expectedVersion: profileRow.version } : {}) },
  ], [{ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'agent-website.saved', targetType: 'agent_website', targetId: actor.id, effect: 'write', allowed: true, detail: { slug: input.slug, theme: input.theme, published: website.published } }])
  return { ...website, version: (current?.version ?? 0) + 1 }
}

export async function setAgentWebsitePublication(actor: PlatformActor, userId: string, publish: boolean, expectedVersion: number, repository?: Repository) {
  const admin = actor.id !== userId
  if (admin) assertCapability(actor, 'settings.people')
  else if (!['agent', 'team_leader', 'managing_broker', 'broker_owner'].includes(actor.role)) throw new AccessError('An active Realtor membership is required to publish an agent website.', 403)
  const auth = await getAuthPersistence()
  const members = await auth.listMembers(actor)
  const member = members.find(row => row.userId === userId)
  if (!member || !member.active) throw new AccessError('Active RCRE membership required.', 404)
  if (admin && actor.role === 'managing_broker' && (!member.market.includes('Alabama') || member.officeId !== actor.officeId || member.userId === actor.id)) throw new AccessError('This agent is outside your authorized scope.', 403)
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const profileRow = await repo.getDomainRecord<OnboardingRecord & Record<string, unknown>>(context, 'member_profiles', userId)
  const siteRow = await repo.getDomainRecord<WebsiteData>(context, 'agent_websites', userId)
  if (!siteRow) throw new AccessError('Save website settings before publishing.', 409)
  if (siteRow.version !== expectedVersion) throw new AccessError('Website settings changed in another session; reload before publishing.', 409)
  if (publish) {
    const verifiedId = profileRow?.data.verifiedPersonId
    const canonical = typeof verifiedId === 'string' && publicAgents.some(person => person.slug === verifiedId)
    if (!canonical || profileRow?.data.publicVisible !== true) throw new AccessError('A verified canonical profile with public visibility is required before publishing.', 409)
    const hasLicense = Array.isArray(profileRow.data.licenses) && profileRow.data.licenses.length > 0
    if (!hasLicense || !String(profileRow.data.biography ?? '').trim() || !siteRow.data.slug) throw new AccessError('Complete the verified profile, licensing, biography, and website URL before publishing.', 409)
  }
  const next = { ...siteRow.data, published: publish, updatedAt: new Date().toISOString() }
  await repo.putDomainRecordsAtomic(context, [{ collection: 'agent_websites', recordId: userId, ownerUserId: userId, data: next as unknown as Record<string, unknown>, expectedVersion: siteRow.version }], [{ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: publish ? 'agent-website.published' : 'agent-website.unpublished', targetType: 'agent_website', targetId: userId, effect: 'write', allowed: true, detail: { slug: next.slug } }])
  return { ...next, version: siteRow.version + 1 }
}

/** Only returns the whitelisted public profile projection from the SECURITY DEFINER SQL function. */
export async function getPublishedAgentWebsite(slug: string): Promise<AgentWebsiteRenderData | null> {
  if (process.env.NODE_ENV !== 'production') return null
  const organizationId = process.env.RCRE_ORGANIZATION_ID
  if (!organizationId || !/^[0-9a-f-]{36}$/i.test(organizationId)) return null
  const result = await getPgPool().query<{ site: { personSlug: string; name: string; email: string; phone: string; profile: Record<string, unknown>; website: WebsiteData } | null }>(`select rcre_public_agent_website($1::uuid,$2::text) as site`, [organizationId, slug])
  const site = result.rows[0]?.site
  if (!site) return null
  const canonical = publicAgents.find(person => person.slug === site.personSlug)
  if (!canonical) return null
  const profileData = site.profile
  const configData = site.website
  const profile: AgentProfile = {
    ...canonical,
    name: canonical.name,
    title: String(profileData.professionalTitle || canonical.role || 'REALTOR®'),
    phone: site.phone,
    email: site.email,
    license: Array.isArray(profileData.licenses) ? (profileData.licenses as Array<{ state?: string; number?: string }>).map(item => `${item.number ?? ''}${item.state ? ` (${item.state})` : ''}`).filter(Boolean).join(' · ') : '',
    market: Array.isArray(profileData.markets) ? (profileData.markets as string[]).join(' · ') : canonical.market,
    markets: Array.isArray(profileData.markets) ? profileData.markets as string[] : [],
    specialties: Array.isArray(profileData.specialties) ? profileData.specialties as string[] : [],
    bio: String(profileData.biography ?? ''),
    website: configData,
  }
  return { profile: { ...profile, slug }, config: configData as unknown as AgentWebsiteConfig, verifiedPersonId: site.personSlug }
}

/** Shared renderer resolver: published PostgreSQL records in production; existing local fixture engine elsewhere. */
export async function resolveAgentWebsite(slug: string): Promise<AgentWebsiteRenderData | null> {
  if (process.env.NODE_ENV === 'production') {
    const published = await getPublishedAgentWebsite(slug)
    if (published) return published
    const actor = await actorOrNull()
    if (!actor) return null
    const draft = await loadAgentWebsite(actor)
    const data = draft.website
    const canonical = draft.canonical && publicAgents.find(person => person.slug === draft.canonical!.slug)
    if (!data || data.slug !== slug || !canonical || !draft.member?.active) return null
    const profile: Record<string, unknown> = draft.profile ?? {}
    const agent: AgentProfile = { ...canonical, name: draft.member.name, title: String(profile.professionalTitle ?? canonical.role ?? 'REALTOR®'), email: draft.member.email, phone: String(profile.phone ?? ''), license: Array.isArray(profile.licenses) ? (profile.licenses as Array<{state?:string;number?:string}>).map(item => `${item.number ?? ''}${item.state ? ` (${item.state})` : ''}`).filter(Boolean).join(' · ') : '', market: Array.isArray(profile.markets) ? (profile.markets as string[]).join(' · ') : canonical.market, markets: Array.isArray(profile.markets) ? profile.markets as string[] : [], specialties: Array.isArray(profile.specialties) ? profile.specialties as string[] : [], bio: String(profile.biography ?? ''), website: data }
    return { profile: { ...agent, slug }, config: data as unknown as AgentWebsiteConfig, verifiedPersonId: canonical.slug }
  }
  const service = await import('./agent-service')
  const profile = service.getAgentProfile(slug)
  const config = service.getWebsiteConfig(slug)
  if (!profile || !config) return null
  return { profile, config, verifiedPersonId: slug }
}
