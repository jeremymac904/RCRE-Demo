import 'server-only'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import type { Repository } from '@/lib/db/repository'
import { getAuthPersistence, type MemberSummary } from '@/lib/auth/persistence'
import { AccessError, assertCapability, type PlatformActor } from './auth'
import { repositoryActor, type OnboardingRecord } from './onboarding'
import { publicAgents } from '@/lib/public/content'

export type CanonicalPersonChoice = { id: string; name: string; email: string; market: string }

export type AdminAgent = MemberSummary & {
  publicVisible: boolean | null
  licenses: Array<{ state: 'Alabama' | 'Florida'; number: string }>
  onboardingComplete: boolean
  onboardingStepsComplete: number
  licenseStates: string[]
  websiteTemplate: string | null
  websiteSlug: string | null
  professionalTitle: string
  biography: string
  specialties: string[]
  markets: string[]
}

function inScope(actor: PlatformActor, member: MemberSummary) {
  if (actor.organizationId !== member.organizationId) return false
  if (actor.role === 'broker_owner') return true
  return actor.role === 'managing_broker' && member.officeId === actor.officeId && member.userId !== actor.id && ['agent', 'team_leader', 'transaction_coordinator'].includes(member.platformRole)
}

function managingBrokerState(actor: PlatformActor): 'Alabama' | 'Florida' | null {
  const officeState = actor.officeId.toLowerCase() === 'al' ? 'Alabama'
    : actor.officeId.toLowerCase() === 'fl' ? 'Florida' : null
  const actorState = actor.market === 'Alabama' || actor.market === 'Florida' ? actor.market : null
  if (officeState && actorState && officeState !== actorState) return null
  return officeState ?? actorState
}

function belongsToSingleState(value: string, state: 'Alabama' | 'Florida'): boolean {
  const other = state === 'Alabama' ? 'Florida' : 'Alabama'
  const hasState = new RegExp(`(^|[^a-z])${state}($|[^a-z])`, 'i').test(value)
  const hasOtherState = new RegExp(`(^|[^a-z])${other}($|[^a-z])`, 'i').test(value)
  return hasState && !hasOtherState
}

export async function listAdminAgents(actor: PlatformActor, repository?: Repository): Promise<AdminAgent[]> {
  assertCapability(actor, 'settings.people')
  const auth = await getAuthPersistence()
  const [members, repo] = await Promise.all([auth.listMembers(actor), repository ?? getRepository()])
  const context = repositoryActor(actor)
  return Promise.all(members.filter(member => inScope(actor, member)).map(async member => {
    const stored = await repo.getDomainRecord<OnboardingRecord>(context, 'member_profiles', member.userId)
    const profile = stored?.data
    const completedSteps = profile ? Object.values(profile.steps).filter(Boolean).length : 0
    return {
      ...member,
      canonicalPersonId: typeof profile?.verifiedPersonId === 'string' && publicAgents.some(person => person.slug === profile.verifiedPersonId) ? profile.verifiedPersonId : null,
      publicVisible: profile ? Boolean(profile.publicVisible) : null,
      licenses: profile?.licenses ?? [],
      onboardingComplete: completedSteps === 5,
      onboardingStepsComplete: completedSteps,
      licenseStates: profile?.licenses.map(license => license.state) ?? [],
      websiteTemplate: profile?.websiteTemplate ?? null,
      websiteSlug: profile?.websiteSlug || null,
      professionalTitle: profile?.professionalTitle ?? '',
      biography: profile?.biography ?? '',
      specialties: profile?.specialties ?? [],
      markets: profile?.markets ?? [],
    }
  }))
}

export async function updateAdminAgent(actor: PlatformActor, userId: string, raw: unknown, repository?: Repository) {
  assertCapability(actor, 'settings.people')
  const change = z.object({
    role: z.enum(['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer']),
    officeId: z.string().min(1).max(100),
    teamId: z.string().min(1).max(100),
    market: z.string().min(1).max(120),
    active: z.boolean(),
    publicVisible: z.boolean(),
    licenses: z.array(z.object({ state: z.enum(['Alabama', 'Florida']), number: z.string().trim().min(1).max(100) })).max(10),
    professionalTitle: z.string().trim().max(100),
    biography: z.string().trim().max(5000),
    specialties: z.array(z.string().trim().min(1).max(100)).max(20),
    markets: z.array(z.string().trim().min(1).max(100)).max(20),
    canonicalPersonId: z.string().regex(/^[a-z0-9-]{2,80}$/).nullable().optional(),
  }).parse(raw)
  const auth = await getAuthPersistence()
  const members = await auth.listMembers(actor)
  const target = members.find(member => member.userId === userId)
  if (!target || !inScope(actor, target)) throw new AccessError('Member is outside your authorized scope', 403)
  if (userId === actor.id) throw new AccessError('You cannot change your own brokerage role or account status', 403)
  const managerState = actor.role === 'managing_broker' ? managingBrokerState(actor) : null
  if (actor.role === 'managing_broker' && (!managerState
    || !['agent', 'team_leader', 'transaction_coordinator'].includes(change.role)
    || change.officeId !== actor.officeId || change.teamId !== actor.officeId
    || !belongsToSingleState(change.market, managerState) || !belongsToSingleState(target.market, managerState)
    || change.markets.some(market => !belongsToSingleState(market, managerState))
    || change.licenses.some(license => license.state !== managerState))) {
    throw new AccessError('This change is outside your managing broker authority', 403)
  }
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const current = await repo.getDomainRecord<OnboardingRecord & { publicVisible?: boolean }>(context, 'member_profiles', userId)
  const profile = current?.data ?? ({ id: userId, memberId: userId, organizationId: actor.organizationId, phone: '', professionalTitle: '', officeId: change.officeId, licenses: [], markets: [], specialties: [], biography: '', socialLinks: { instagram: '', facebook: '', linkedin: '' }, websiteTemplate: 'signature', websiteSlug: '', steps: { identityConfirmed: false, profileReviewed: false, licenseReviewed: false, marketsReviewed: false, websiteSelected: false }, version: 0, verifiedPersonId: null, savedAt: new Date().toISOString() } as OnboardingRecord)
  const canonicalPersonId = change.canonicalPersonId === undefined ? (typeof profile.verifiedPersonId === 'string' ? profile.verifiedPersonId : null) : change.canonicalPersonId
  if (canonicalPersonId !== null) {
    const canonicalPerson = publicAgents.find(person => person.slug === canonicalPersonId)
    if (!canonicalPerson) throw new AccessError('Choose a person from the verified RCRE roster.', 400)
    if (actor.role === 'managing_broker' && (!managerState || !belongsToSingleState(canonicalPerson.market, managerState))) throw new AccessError('This canonical identity is outside your managing broker authority.', 403)
    const existingLink = members.find(member => member.userId !== userId && member.canonicalPersonId === canonicalPersonId)
    if (existingLink) throw new AccessError('This verified RCRE person is already linked to another member.', 409)
  }
  const next = { ...profile, verifiedPersonId: canonicalPersonId, publicVisible: change.publicVisible, licenses: change.licenses, professionalTitle: change.professionalTitle, biography: change.biography, specialties: change.specialties, officeId: change.officeId, markets: change.markets, version: (current?.version ?? 0) + 1, savedAt: new Date().toISOString() }
  try {
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: userId, ownerUserId: userId, data: next as unknown as Record<string, unknown>, ...(current ? { expectedVersion: current.version } : {}) })
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string }
    if (pgError.code === '23505' && pgError.constraint === 'rcre_member_profile_verified_person_unique') throw new AccessError('This verified RCRE person is already linked to another member.', 409)
    throw error
  }
  const updated = await auth.updateMember(actor, userId, { role: change.role, officeId: change.officeId, teamId: change.teamId, market: change.market, active: change.active })
  if (!updated) throw new AccessError('Member could not be updated; profile changes were saved, reload and retry the account change', 409)
  await repo.recordAudit(context, { organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'agent.lifecycle-updated', targetType: 'member', targetId: userId, effect: 'write', allowed: true, detail: { role: change.role, active: change.active, officeId: change.officeId, publicVisible: change.publicVisible, canonicalPersonId, licenseCount: change.licenses.length } })
  const revokedSessions = change.active ? 0 : await auth.revokeUserSessions(actor, userId)
  return { updated: true, sessionsRevoked: !change.active, revokedSessions }
}

export async function listCanonicalPersonChoices(actor: PlatformActor): Promise<(CanonicalPersonChoice & { assignedToUserId: string | null; assignedToName: string | null })[]> {
  assertCapability(actor, 'settings.people')
  const managerState = actor.role === 'managing_broker' ? managingBrokerState(actor) : null
  const members = await (await getAuthPersistence()).listMembers(actor)
  return publicAgents
    .filter(person => actor.role !== 'managing_broker' || Boolean(managerState && belongsToSingleState(person.market, managerState)))
    .map(person => {
      const assigned = members.find(member => member.canonicalPersonId === person.slug)
      return { id: person.slug, name: person.name, email: person.email, market: person.market, assignedToUserId: assigned?.userId ?? null, assignedToName: assigned?.name ?? null }
    })
}

export async function revokeAdminAgentSessions(actor: PlatformActor, userId: string, repository?: Repository) {
  assertCapability(actor, 'settings.people')
  const auth = await getAuthPersistence()
  const members = await auth.listMembers(actor)
  const target = members.find(member => member.userId === userId)
  if (!target || !inScope(actor, target)) throw new AccessError('Member is outside your authorized scope', 403)
  const revoked = await auth.revokeUserSessions(actor, userId)
  const context = repositoryActor(actor)
  const repo = repository ?? await getRepository()
  await repo.recordAudit(context, { organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'agent.sessions-revoked', targetType: 'member', targetId: userId, effect: 'write', allowed: true, detail: { revoked } })
  return { revoked }
}
