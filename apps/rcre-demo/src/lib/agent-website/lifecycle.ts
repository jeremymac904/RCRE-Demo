import 'server-only'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import { getPgPool } from '@/lib/db/pg'
import type { Repository } from '@/lib/db/repository'
import { getAuthPersistence, type MemberSummary } from '@/lib/auth/persistence'
import { publicAgents } from '@/lib/public/content'
import { AccessError, actorOrNull, assertCapability, type PlatformActor } from '@/lib/platform/auth'
import { repositoryActor, type OnboardingRecord } from '@/lib/platform/onboarding'
import type { AgentProfile, AgentWebsiteConfig, AgentWebsiteTheme } from './types'

const safeImageReference = z.string().trim().max(1000).refine(value => !value || value.startsWith('/') && !value.startsWith('//') || /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:[/?#]|$)/i.test(value), 'Use a secure image URL or a local site asset.')
const themes = ['rcre-signature','rcre-luxury','rcre-rural','rcre-investor','rcre-urban','rcre-suburban','rcre-new-construction','rcre-historic'] as const
const reservedTemplateSlugs = new Set(['birmingham-historic','family','jacksonville-newconstruction','jacksonville-urban','rcre-investor','rcre-luxury','rcre-rural','rcre-suburban','rcre-urban','preview'])
const saveSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,80}$/).refine(value => !reservedTemplateSlugs.has(value), 'This address is reserved for a website preview.'),
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
type CanonicalPersonData = {
  id: string
  slug: string
  userId: string
  organizationId: string
  name: string
  email: string
  phone?: string
  professionalTitle?: string
  biography?: string
  markets?: string[]
  specialties?: string[]
  licenses?: Array<{ state?: string; number?: string }>
  socialLinks?: AgentProfile['socialLinks']
  status: 'pending_review' | 'active' | 'inactive'
  publicVisible: boolean
  [key: string]: unknown
}

export type AgentWebsiteRenderData = { profile: AgentProfile; config: AgentWebsiteConfig; verifiedPersonId: string }

async function getCanonicalPerson(repo: Repository, context: ReturnType<typeof repositoryActor>, slug: string, userId: string) {
  const row = await repo.getDomainRecord<CanonicalPersonData>(context, 'canonical_people', slug)
  const person = row?.data
  if (!row || !person || row.ownerUserId !== userId || person.userId !== userId || person.id !== slug || person.slug !== slug || person.organizationId !== context.organizationId) return null
  return { row, person, legacy: false as const }
}

function getStaticCanonicalPerson(slug: string, profile: Record<string, unknown> | null | undefined, member: MemberSummary | null | undefined) {
  const legacy = publicAgents.find(person => person.slug === slug)
  if (!legacy || member?.canonicalPersonId !== slug || !member.active) return null
  const profileLicenses = Array.isArray(profile?.licenses) ? profile.licenses as Array<{ state?: string; number?: string }> : []
  const licenseNumber = String(legacy.license ?? '').trim()
  return {
    person: {
      id: slug, slug, userId: member.userId, organizationId: member.organizationId,
      name: legacy.name, email: member.email || legacy.email, phone: String(profile?.phone ?? legacy.phone ?? ''),
      professionalTitle: String(profile?.professionalTitle ?? legacy.role ?? 'REALTOR®'),
      biography: String(profile?.biography ?? legacy.bio ?? ''),
      markets: Array.isArray(profile?.markets) ? profile.markets as string[] : [legacy.market],
      specialties: Array.isArray(profile?.specialties) ? profile.specialties as string[] : [],
      licenses: profileLicenses.length ? profileLicenses : (licenseNumber ? [{ number: licenseNumber }] : []),
      socialLinks: profile?.socialLinks as AgentProfile['socialLinks'],
      status: 'active' as const, publicVisible: profile?.publicVisible === true,
    } satisfies CanonicalPersonData,
    legacyImage: legacy.image || undefined,
    legacy: true as const,
  }
}

function publicCanonicalProfile(person: CanonicalPersonData, headshotAssetId?: unknown, fallbackImage?: string): AgentProfile {
  const markets = Array.isArray(person.markets) ? person.markets.filter((value): value is string => typeof value === 'string') : []
  const licenses = Array.isArray(person.licenses) ? person.licenses : []
  return {
    slug: person.slug,
    name: person.name,
    title: String(person.professionalTitle ?? 'REALTOR®'),
    phone: String(person.phone ?? ''),
    email: person.email,
    license: licenses.map(item => `${item.number ?? ''}${item.state ? ` (${item.state})` : ''}`).filter(Boolean).join(' · '),
    market: markets.join(' · '),
    markets,
    specialties: Array.isArray(person.specialties) ? person.specialties.filter((value): value is string => typeof value === 'string') : [],
    bio: String(person.biography ?? ''),
    headshot: typeof headshotAssetId === 'string' && headshotAssetId ? `/api/public/agent-photo/${encodeURIComponent(person.slug)}` : fallbackImage,
    socialLinks: person.socialLinks,
  }
}

function managingBrokerWebsiteTargetAllowed(actor: PlatformActor, member: MemberSummary) {
  if (actor.organizationId !== member.organizationId || member.userId === actor.id || member.officeId !== actor.officeId) return false
  if (!['agent', 'team_leader', 'transaction_coordinator'].includes(member.platformRole)) return false
  const officeState = actor.officeId.toLowerCase() === 'al' ? 'Alabama' : actor.officeId.toLowerCase() === 'fl' ? 'Florida' : null
  const actorState = actor.market === 'Alabama' || actor.market === 'Florida' ? actor.market : null
  if (officeState && actorState && officeState !== actorState) return false
  const state = officeState ?? actorState
  if (!state) return false
  const other = state === 'Alabama' ? 'Florida' : 'Alabama'
  const matchesState = new RegExp(`(^|[^a-z])${state}($|[^a-z])`, 'i').test(member.market)
  const matchesOtherState = new RegExp(`(^|[^a-z])${other}($|[^a-z])`, 'i').test(member.market)
  return matchesState && !matchesOtherState
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
  const memberRows = await (await getAuthPersistence()).listMembers(actor)
  const identity = memberRows.find(row => row.userId === actor.id)
  const member = identity
  const verified = typeof profile?.verifiedPersonId === 'string'
    ? (await getCanonicalPerson(repo, context, profile.verifiedPersonId, actor.id)) ?? getStaticCanonicalPerson(profile.verifiedPersonId, profile, member)
    : null
  const verifiedPerson = verified?.person
  const verifiedLicenses = Array.isArray(verifiedPerson?.licenses) ? verifiedPerson.licenses : []
  const verifiedMarkets = Array.isArray(verifiedPerson?.markets) ? verifiedPerson.markets.filter((value): value is string => typeof value === 'string') : []
  const canonicalImage = verified ? ('legacyImage' in verified ? verified.legacyImage : publicAgents.find(person => person.slug === verified.person.slug)?.image) : undefined
  return {
    profile: profile ?? null,
    canonical: verifiedPerson ? { slug: verifiedPerson.slug, name: verifiedPerson.name, image: canonicalImage ?? undefined, title: verifiedPerson.professionalTitle ?? '', phone: verifiedPerson.phone ?? '', email: verifiedPerson.email, license: verifiedLicenses.map(item => `${item.number ?? ''}${item.state ? ` (${item.state})` : ''}`).filter(Boolean).join(' · '), market: verifiedMarkets.join(' · '), markets: verifiedMarkets, specialties: verifiedPerson.specialties ?? [], bio: verifiedPerson.biography ?? '', socialLinks: verifiedPerson.socialLinks ?? {} } : null,
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
  if (priorSlug && priorSlug !== input.slug && current?.data.published) throw new AccessError('A published website URL is locked; unpublish it before changing the address.', 409)
  const savedAt = new Date().toISOString()
  const { biography, socialLinks, ...siteInput } = input
  const website: WebsiteData = { ...siteInput, ownerUserId: actor.id, organizationId: actor.organizationId, updatedAt: savedAt, published: current?.data.published ?? false }
  const verifiedSlug = typeof priorProfile?.verifiedPersonId === 'string' ? priorProfile.verifiedPersonId : null
  const canonical = verifiedSlug ? await getCanonicalPerson(repo, context, verifiedSlug, actor.id) : null
  const legacyCanonical = verifiedSlug && !canonical ? getStaticCanonicalPerson(verifiedSlug, priorProfile ?? null, self) : null
  if (verifiedSlug && !canonical && !legacyCanonical) throw new AccessError('The canonical Realtor profile is not available to this account.', 409)
  const canonicalData = canonical ? {
    ...canonical.person,
    ...(biography !== undefined ? { biography } : {}),
    ...(socialLinks ? { socialLinks } : {}),
    markets: input.markets,
    specialties: input.specialties,
  } : null
  const nextProfile = { ...(priorProfile ?? {}), ...(biography !== undefined ? { biography } : {}), ...(socialLinks ? { socialLinks } : {}), markets: input.markets, specialties: input.specialties, ...(verifiedSlug ? { verifiedPersonId: verifiedSlug } : {}), id: actor.id, memberId: actor.id, organizationId: actor.organizationId, websiteSlug: input.slug, websiteTemplate: Object.entries(templates).find(([, value]) => value === input.theme)?.[0] ?? 'signature', version: (profileRow?.version ?? 0) + 1, savedAt }
  const writes = [
    { collection: 'agent_websites', recordId: actor.id, ownerUserId: actor.id, data: website as unknown as Record<string, unknown>, ...(current ? { expectedVersion: current.version } : {}) },
    { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: nextProfile as unknown as Record<string, unknown>, ...(profileRow ? { expectedVersion: profileRow.version } : {}) },
    ...(canonical && canonicalData ? [{ collection: 'canonical_people', recordId: verifiedSlug!, ownerUserId: actor.id, data: canonicalData as unknown as Record<string, unknown>, expectedVersion: canonical.row.version }] : []),
  ]
  await repo.putDomainRecordsAtomic(context, writes, [{ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'agent-website.saved', targetType: 'agent_website', targetId: actor.id, effect: 'write', allowed: true, detail: { slug: input.slug, theme: input.theme, published: website.published } }])
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
  if (admin && actor.role === 'managing_broker' && !managingBrokerWebsiteTargetAllowed(actor, member)) throw new AccessError('This agent is outside your authorized scope.', 403)
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const profileRow = await repo.getDomainRecord<OnboardingRecord & Record<string, unknown>>(context, 'member_profiles', userId)
  const verifiedId = profileRow?.data.verifiedPersonId
  const canonical = typeof verifiedId === 'string' ? await getCanonicalPerson(repo, context, verifiedId, userId) : null
  const legacyCanonical = typeof verifiedId === 'string' && !canonical ? getStaticCanonicalPerson(verifiedId, profileRow?.data ?? null, member) : null
  const siteRow = await repo.getDomainRecord<WebsiteData>(context, 'agent_websites', userId)
  if (!siteRow) throw new AccessError('Save website settings before publishing.', 409)
  if (siteRow.version !== expectedVersion) throw new AccessError('Website settings changed in another session; reload before publishing.', 409)
  if (publish) {
    const person = canonical?.person ?? legacyCanonical?.person
    const isPublishable = !!person && person.status === 'active' && person.publicVisible === true && profileRow?.data.publicVisible === true
    if (!isPublishable) throw new AccessError('An active canonical profile with public visibility is required before publishing.', 409)
    const hasLicense = Array.isArray(person.licenses) && person.licenses.length > 0
    const hasHeadshot = Boolean(String(profileRow?.data.headshotAssetId ?? '').trim())
    if (!hasLicense || !String(person.biography ?? '').trim() || !siteRow.data.slug || (canonical && !hasHeadshot)) throw new AccessError('Complete the verified profile, headshot, licensing, biography, and website URL before publishing.', 409)
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
  const result = await getPgPool().query<{ site: { person?: Partial<CanonicalPersonData>; personSlug: string; headshotAssetId?: string; profile: Record<string, unknown>; website: WebsiteData } | null }>(`select rcre_public_agent_website($1::uuid,$2::text) as site`, [organizationId, slug])
  const site = result.rows[0]?.site
  if (!site) return null
  const canonical = site.person?.name && site.person.email && site.person.slug
    ? site.person as CanonicalPersonData
    : getStaticCanonicalPerson(site.personSlug, site.profile, { userId: '', organizationId, canonicalPersonId: site.personSlug, email: '', name: '', platformRole: 'agent', active: true, accountStatus: 'active', officeId: '', teamId: '', market: '', lastLoginAt: null })?.person
  if (!canonical) return null
  const fallbackImage = publicAgents.find(person => person.slug === canonical.slug)?.image ?? undefined
  const profile = publicCanonicalProfile(canonical, site.headshotAssetId ?? site.profile.headshotAssetId, fallbackImage)
  return { profile: { ...profile, slug, website: site.website }, config: site.website as unknown as AgentWebsiteConfig, verifiedPersonId: canonical.slug }
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
    const context = repositoryActor(actor)
    const dynamicCanonical = typeof draft.profile?.verifiedPersonId === 'string' ? await getCanonicalPerson(await getRepository(), context, draft.profile.verifiedPersonId, actor.id) : null
    const canonical = dynamicCanonical ?? (typeof draft.profile?.verifiedPersonId === 'string' ? getStaticCanonicalPerson(draft.profile.verifiedPersonId, draft.profile, { userId: actor.id, organizationId: actor.organizationId, canonicalPersonId: draft.profile.verifiedPersonId, email: draft.member?.email ?? '', name: draft.member?.name ?? '', platformRole: actor.role as MemberSummary['platformRole'], active: Boolean(draft.member?.active), accountStatus: 'active', officeId: actor.officeId, teamId: actor.teamId, market: actor.market, lastLoginAt: null }) : null)
    if (!data || data.slug !== slug || !canonical || !draft.member?.active) return null
    const agent = publicCanonicalProfile(canonical.person, draft.profile?.headshotAssetId, ('legacyImage' in canonical ? canonical.legacyImage : draft.canonical?.image) ?? undefined)
    return { profile: { ...agent, slug, website: data as unknown as AgentWebsiteConfig }, config: data as unknown as AgentWebsiteConfig, verifiedPersonId: canonical.person.slug }
  }
  const service = await import('./agent-service')
  const profile = service.getAgentProfile(slug)
  const config = service.getWebsiteConfig(slug)
  if (!profile || !config) return null
  return { profile, config, verifiedPersonId: slug }
}
