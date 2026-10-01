import 'server-only'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import type { DomainRecordInput, Repository } from '@/lib/db/repository'
import { publicAgents } from '@/lib/public/content'
import { AccessError, assertCapability, type PlatformActor } from './auth'
import { repositoryActor } from './onboarding'
import { agentProfileInput, type AgentProfileInput, type AgentProfileRecord } from './agent-profiles'

const protectedSlugs = new Set(['julio-arango', 'taquilla-allen'])
const profileId = (organizationId: string, slug: string) => `${organizationId}:${slug}`

function assertScope(actor: PlatformActor, slug: string, market: string) {
  assertCapability(actor, 'settings.people')
  if (actor.role === 'managing_broker') {
    const protectedSlug = slug === 'julio-arango' || slug === 'taquilla-allen' || slug === 'margie-olsen-alvarez'
    if (protectedSlug || !market.includes('Alabama')) throw new AccessError('This canonical profile is outside your authorized scope', 403)
  }
}

function normalizedLicenses(input: string, current: unknown, market: string) {
  const old = Array.isArray(current) ? current.filter((item): item is { state: string; number: string } =>
    !!item && typeof item === 'object' && typeof (item as { state?: unknown }).state === 'string' && typeof (item as { number?: unknown }).number === 'string') : []
  const value = input.trim()
  if (!value) return []
  const existing = old.map(item => item.number).join(', ')
  if (value === existing) return old
  const states = market === 'Alabama & Florida' ? ['Alabama', 'Florida'] : [market]
  const parts = value.split(/[;,]/).map(part => part.trim()).filter(Boolean)
  return parts.map((number, index) => ({ state: states[Math.min(index, states.length - 1)], number }))
}

function fromCanonical(person: (typeof publicAgents)[number], organizationId: string, overlay?: Record<string, unknown>): AgentProfileRecord & { name: string; image: string | null } {
  const data = overlay ?? {}
  return {
    id: person.slug, organizationId, name: person.name, image: person.image,
    publicTitle: typeof data.publicTitle === 'string' ? data.publicTitle : person.role,
    phone: typeof data.phone === 'string' ? data.phone : person.phone,
    email: typeof data.email === 'string' ? data.email : person.email,
    license: typeof data.license === 'string' ? data.license : person.license,
    market: ['Alabama', 'Florida', 'Alabama & Florida'].includes(String(data.market)) ? data.market as AgentProfileInput['market'] : person.market as AgentProfileInput['market'],
    bio: typeof data.bio === 'string' ? data.bio : person.bio,
    specialties: Array.isArray(data.specialties) ? data.specialties.filter((item): item is string => typeof item === 'string') : [],
    socialLinks: data.socialLinks && typeof data.socialLinks === 'object' ? data.socialLinks as AgentProfileInput['socialLinks'] : { instagram: '', facebook: '', linkedin: '' },
    websiteTemplate: (typeof data.websiteTemplate === 'string' ? data.websiteTemplate : 'signature') as AgentProfileInput['websiteTemplate'],
    publicVisible: typeof data.publicVisible === 'boolean' ? data.publicVisible : person.slug !== 'lekeshia-jones',
    version: typeof data.version === 'number' ? data.version : 0,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
  }
}

export async function listAdminAgentProfilesDurable(actor: PlatformActor, repository?: Repository) {
  assertCapability(actor, 'settings.people')
  const repo = repository ?? await getRepository(), context = repositoryActor(actor)
  const users = await repo.listUsers(context)
  const profiles = await Promise.all(users.map(user => repo.getDomainRecord<Record<string, unknown>>(context, 'member_profiles', user.id)))
  const people = await Promise.all(publicAgents.map(async person => {
    const linkedIndex = profiles.findIndex(row => row?.data.verifiedPersonId === person.slug)
    const linkedUser = linkedIndex >= 0 ? users[linkedIndex] : undefined
    const record = await repo.getDomainRecord<Record<string, unknown>>(context, 'agent_profile_overlays', profileId(actor.organizationId, person.slug))
    const profile = fromCanonical(person, actor.organizationId, record?.data)
    const protectedTarget = protectedSlugs.has(person.slug) || ['owner', 'broker', 'managing_broker'].includes(String(linkedUser?.role ?? ''))
    const allowed = actor.role === 'broker_owner' || (actor.role === 'managing_broker' && !protectedTarget && profile.market.includes('Alabama'))
    return allowed ? profile : null
  }))
  return people.filter((value): value is NonNullable<typeof value> => value !== null)
}

export async function saveAdminAgentProfileDurable(actor: PlatformActor, slug: string, input: unknown, repository?: Repository) {
  assertCapability(actor, 'settings.people')
  const person = publicAgents.find(value => value.slug === slug)
  if (!person) throw new AccessError('Canonical RCRE person not found', 404)
  const value = agentProfileInput.parse(input)
  assertScope(actor, slug, person.market)
  const expected = z.object({ version: z.number().int().min(0) }).parse(input).version
  const repo = repository ?? await getRepository(), context = repositoryActor(actor)
  const users = await repo.listUsers(context)
  const profiles = await Promise.all(users.map(user => repo.getDomainRecord<Record<string, unknown>>(context, 'member_profiles', user.id)))
  const linkedIndex = profiles.findIndex(row => row?.data.verifiedPersonId === slug)
  const linkedMember = linkedIndex >= 0 ? users[linkedIndex] : undefined
  if (actor.role === 'managing_broker' && linkedMember && (linkedMember.id === actor.id || linkedMember.officeId !== actor.officeId)) throw new AccessError('This canonical profile is outside your authorized office scope', 403)
  const profileRow = linkedIndex >= 0 ? profiles[linkedIndex] : undefined
  const id = profileId(actor.organizationId, slug)
  const existing = await repo.getDomainRecord<Record<string, unknown>>(context, 'agent_profile_overlays', id)
  if ((existing?.version ?? 0) !== expected) throw new AccessError('Profile changed; reload before saving', 409)
  const now = new Date().toISOString(), record: AgentProfileRecord = {
    ...value, id, organizationId: actor.organizationId, version: expected + 1, updatedAt: now, updatedBy: actor.id,
  }
  const writes: DomainRecordInput[] = [{
    collection: 'agent_profile_overlays', recordId: id, ownerUserId: linkedMember?.id ?? actor.id,
    data: record as unknown as Record<string, unknown>, ...(existing ? { expectedVersion: existing.version } : { createOnly: true }),
  }]

  // When the roster entry is linked to a durable membership, update its canonical
  // profile and member projection atomically with the editor state. Identity and
  // permissions remain owned by canonical_people / the membership, not this UI.
  if (linkedMember && profileRow) {
    const member = linkedMember
    const licenseItems = normalizedLicenses(value.license, profileRow.data.licenses, value.market)
    const markets = value.market === 'Alabama & Florida' ? ['Alabama', 'Florida'] : [value.market]
    const profileData = { ...profileRow.data, phone: value.phone, publicEmail: value.email, professionalTitle: value.publicTitle, licenses: licenseItems, markets, specialties: value.specialties, biography: value.bio, socialLinks: value.socialLinks, websiteTemplate: value.websiteTemplate, publicVisible: value.publicVisible, version: Number(profileRow.data.version ?? 0) + 1, savedAt: now }
    writes.push({ collection: 'member_profiles', recordId: member.id, ownerUserId: member.id, data: profileData, expectedVersion: profileRow.version })
    const personRow = await repo.getDomainRecord<Record<string, unknown>>(context, 'canonical_people', slug)
    if (personRow && personRow.data.userId === member.id) {
      writes.push({ collection: 'canonical_people', recordId: slug, ownerUserId: member.id, data: { ...personRow.data, phone: value.phone, professionalTitle: value.publicTitle, licenses: licenseItems, markets, market: markets[0], specialties: value.specialties, biography: value.bio, socialLinks: value.socialLinks, publicVisible: value.publicVisible, updatedAt: now }, expectedVersion: personRow.version })
    }
  }
  const saved = await repo.putDomainRecordsAtomic(context, writes, [{
    organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'agent.public-profile-updated', targetType: 'canonical_person', targetId: slug, effect: 'write', allowed: true,
    detail: { publicVisible: value.publicVisible, market: value.market, version: expected + 1 },
  }])
  return { ...record, version: saved[0]?.version ?? record.version }
}
