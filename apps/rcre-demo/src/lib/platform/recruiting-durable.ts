import 'server-only'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import type { PlatformActor } from './auth'
import { AccessError, assertCapability } from './auth'
import type { AuditEvent } from '@/lib/domain-types'
import type { Repository, Actor as RepositoryActor } from '@/lib/db/repository'
import { createInvitation, listInvitations } from '@/lib/auth/invitations'
import { getAuthPersistence } from '@/lib/auth/persistence'

const stage = z.enum(['New inquiry', 'Contacted', 'Meeting scheduled', 'Considering', 'Joined', 'Paused', 'Rejected', 'Do not contact', 'Withdrawn'])
const draftSchema = z.object({
  name: z.string().trim().min(2).max(160),
  stage: stage.default('New inquiry'),
  nextAction: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
  consent: z.boolean().default(false),
  officeId: z.string().trim().min(1).max(120).optional(),
}).strict()

type Prospect = Omit<z.infer<typeof draftSchema>, 'officeId'> & { id: string; organizationId: string; ownerId: string; officeId: string; teamId: string; market: string; version: number; createdAt: string; updatedAt: string; invitationId?: string }
const repositoryActor = (actor: PlatformActor): RepositoryActor => ({ userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role), officeId: actor.officeId })
const auditEvent = (actor: RepositoryActor, action: string, id: string): AuditEvent => ({
  organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action,
  targetType: 'recruiting_prospect', targetId: id, effect: 'write', allowed: true,
})

function visibleTo(actor: PlatformActor, record: Prospect): boolean {
  return record.organizationId === actor.organizationId
    && (actor.role === 'broker_owner' || record.ownerId === actor.id || record.officeId === actor.officeId && ['managing_broker', 'team_leader'].includes(actor.role))
}

export async function listRecruitingDurable(actor: PlatformActor, repository?: Repository): Promise<Prospect[]> {
  assertCapability(actor, 'recruiting')
  const repo = repository ?? await getRepository()
  const rows = await repo.listDomainRecords<Prospect>(repositoryActor(actor), 'recruiting_prospects', { limit: 200 })
  return rows.map(row => row.data).filter(record => visibleTo(actor, record))
}

export async function saveRecruitingDurable(actor: PlatformActor, raw: unknown, repository?: Repository): Promise<Prospect> {
  assertCapability(actor, 'recruiting')
  const repo = repository ?? await getRepository()
  const fields = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {}
  const input = draftSchema.parse(Object.fromEntries(['name', 'stage', 'nextAction', 'source', 'notes', 'consent', 'officeId'].filter(key => key in fields).map(key => [key, fields[key]])))
  const now = new Date().toISOString()
  const id = typeof raw === 'object' && raw !== null && 'id' in raw && typeof raw.id === 'string' ? raw.id : randomUUID()
  const prior = await repo.getDomainRecord<Prospect>(repositoryActor(actor), 'recruiting_prospects', id)
  if (prior && !visibleTo(actor, prior.data)) throw new AccessError('Prospect not found', 404)
  if (prior && input.officeId && input.officeId !== prior.data.officeId) throw new AccessError('A recruiting prospect office cannot be changed after creation', 409)
  const expected = typeof raw === 'object' && raw !== null && 'version' in raw ? Number(raw.version) : undefined
  if (prior && expected !== prior.version) throw new AccessError('Prospect changed; refresh before saving', 409)
  const assignedScope = prior
    ? { officeId: prior.data.officeId, teamId: prior.data.teamId || actor.teamId, market: prior.data.market || actor.market }
    : await resolveRecruitingScope(actor, input.officeId)
  const data: Prospect = {
    ...input, id, organizationId: actor.organizationId, ownerId: prior?.data.ownerId ?? actor.id,
    ...assignedScope, version: (prior?.version ?? 0) + 1,
    createdAt: prior?.data.createdAt ?? now, updatedAt: now,
    ...(prior?.data.invitationId ? { invitationId: prior.data.invitationId } : {}),
  }
  const scoped = repositoryActor(actor)
  const [saved] = await repo.putDomainRecordsAtomic(scoped, [{
    collection: 'recruiting_prospects', recordId: id, ownerUserId: prior?.ownerUserId ?? actor.id,
    data: data as unknown as Record<string, unknown>, ...(prior ? { expectedVersion: prior.version } : { createOnly: true }),
  }], [auditEvent(scoped, prior ? 'recruiting.prospect_updated' : 'recruiting.prospect_created', id)])
  return { ...data, version: saved.version }
}

/** A broker owner must select an active office; scoped leaders use their verified assignment. */
async function resolveRecruitingScope(actor: PlatformActor, requestedOfficeId?: string) {
  if (actor.role !== 'broker_owner') {
    if (requestedOfficeId && requestedOfficeId !== actor.officeId) throw new AccessError('Prospect office is outside your authorized scope', 403)
    if (!actor.officeId || actor.officeId === 'all') throw new AccessError('Choose a brokerage office before creating this recruiting prospect', 400)
    return { officeId: actor.officeId, teamId: actor.teamId, market: actor.market }
  }

  const memberships = await (await getAuthPersistence()).listMembers(actor)
  return resolveRecruitingScopeFromMembers(memberships, requestedOfficeId)
}

/** Resolve a broker-owner prospect target only from active member assignments. */
export function resolveRecruitingScopeFromMembers(
  members: Array<{ active: boolean; officeId: string; teamId: string; market: string; platformRole: string }>,
  requestedOfficeId?: string,
) {
  const activeMembers = members.filter(member => member.active && member.officeId && member.officeId !== 'all')
  const offices = [...new Set(activeMembers.map(member => member.officeId))]
  const officeId = requestedOfficeId ?? (offices.length === 1 ? offices[0] : undefined)
  if (!officeId || officeId === 'all') throw new AccessError('Select the office where this prospective agent would be based', 400)
  const officeMembers = activeMembers.filter(member => member.officeId === officeId)
  if (!officeMembers.length) throw new AccessError('Choose an active RCRE office', 400)
  const canonicalScope = officeMembers.find(member => member.platformRole === 'agent' || member.platformRole === 'team_leader') ?? officeMembers[0]
  if (!canonicalScope.teamId || !canonicalScope.market) throw new AccessError('The selected office needs a configured team and market before recruiting invitations can be created', 409)
  if (officeMembers.some(member => member.teamId !== canonicalScope.teamId || member.market !== canonicalScope.market)) {
    throw new AccessError('Office members have inconsistent team or market assignments; resolve that in Admin before recruiting here', 409)
  }
  return { officeId, teamId: canonicalScope.teamId, market: canonicalScope.market }
}

export async function recruitingProspectDurable(actor: PlatformActor, id: string, repository?: Repository): Promise<Prospect & { events: Record<string, unknown>[] }> {
  assertCapability(actor, 'recruiting')
  const repo = repository ?? await getRepository()
  const scoped = repositoryActor(actor)
  const row = await repo.getDomainRecord<Prospect>(scoped, 'recruiting_prospects', id)
  if (!row || !visibleTo(actor, row.data)) throw new AccessError('Prospect not found', 404)
  const events = (await repo.listDomainRecords<Record<string, unknown>>(scoped, 'recruiting_events', { limit: 200 }))
    .map(event => event.data).filter(event => event.prospectId === id)
  return { ...row.data, version: row.version, events }
}

type RecruitingInvitationOps = {
  list(actor: PlatformActor): Promise<Array<{ id: string; email: string; status: string }>>
  create(actor: PlatformActor, input: { email: string; name: string; role: 'agent'; officeId: string; teamId: string; market: string }): Promise<{ id: string }>
}

export async function appendRecruitingEventDurable(actor: PlatformActor, prospectId: string, raw: unknown, repository?: Repository, invitationOps: RecruitingInvitationOps = { list: listInvitations, create: createInvitation }) {
  assertCapability(actor, 'recruiting')
  const repo = repository ?? await getRepository()
  const prospect = await recruitingProspectDurable(actor, prospectId, repo)
  const input = z.object({ kind: z.enum(['note', 'call', 'task', 'stage', 'meeting', 'complete', 'onboard']), email: z.string().email().max(250).optional(), text: z.string().trim().min(1).max(5000).optional(), dueAt: z.string().datetime().optional(), startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional(), location: z.string().max(300).optional(), taskId: z.string().optional(), stage: stage.optional(), version: z.number().int().positive() }).strict().parse(raw)
  if (input.version !== prospect.version) throw new AccessError('Prospect changed; refresh before saving', 409)
  if (['note', 'call', 'task'].includes(input.kind) && !input.text) throw new AccessError('Enter the interaction details', 400)
  if (input.kind === 'task' && !input.dueAt) throw new AccessError('A due date is required for a recruiting task', 400)
  if (input.kind === 'stage' && !input.stage) throw new AccessError('Choose a valid recruiting stage', 400)
  if (input.kind === 'meeting' && (!input.startsAt || !input.endsAt || Date.parse(input.endsAt) <= Date.parse(input.startsAt))) throw new AccessError('Choose a valid meeting time range', 400)
  const now = new Date().toISOString(), id = randomUUID(), scoped = repositoryActor(actor)
  if (input.kind === 'onboard') {
    if (!['broker_owner', 'managing_broker'].includes(actor.role)) throw new AccessError('Only brokerage leadership may invite a prospect', 403)
    if (prospect.stage !== 'Joined') throw new AccessError('Move the prospect to Joined before creating an invitation', 409)
    if (prospect.invitationId) throw new AccessError('An invitation is already linked to this prospect', 409)
    const email = z.string().email().max(250).transform(value => value.trim().toLowerCase()).parse(input.email)
    const invitations = await invitationOps.list(actor)
    const existing = invitations.find(invite => invite.email.toLowerCase() === email && ['pending', 'queued', 'sent'].includes(invite.status))
    const invitation = existing ?? await invitationOps.create(actor, { email, name: prospect.name, role: 'agent', officeId: prospect.officeId, teamId: prospect.teamId, market: prospect.market })
    const next = { ...prospect, invitationId: invitation.id, invitationEmail: email, updatedAt: now, version: prospect.version + 1 }
    await repo.putDomainRecordsAtomic(scoped, [
      { collection: 'recruiting_prospects', recordId: prospectId, ownerUserId: prospect.ownerId, data: next as unknown as Record<string, unknown>, expectedVersion: prospect.version },
      { collection: 'recruiting_events', recordId: id, ownerUserId: prospect.ownerId, data: { id, prospectId, organizationId: actor.organizationId, actorId: actor.id, kind: 'invitation', text: 'Invitation linked to the RCRE invitation system', invitationId: invitation.id, createdAt: now }, createOnly: true },
    ], [auditEvent(scoped, 'recruiting.invitation_linked', prospectId)])
    return next
  }
  if (input.kind === 'complete') {
    const taskId = input.taskId ?? ''
    const task = await repo.getDomainRecord<Record<string, unknown>>(scoped, 'recruiting_events', taskId)
    if (!task || task.data.prospectId !== prospectId || task.data.kind !== 'task') throw new AccessError('Recruiting task not found', 404)
    const completed = { ...task.data, done: true, completedAt: now }
    const next = { ...prospect, updatedAt: now, version: prospect.version + 1 }
    await repo.putDomainRecordsAtomic(scoped, [
      { collection: 'recruiting_events', recordId: taskId, ownerUserId: prospect.ownerId, data: completed, expectedVersion: task.version },
      { collection: 'recruiting_prospects', recordId: prospectId, ownerUserId: prospect.ownerId, data: next as unknown as Record<string, unknown>, expectedVersion: prospect.version },
    ], [auditEvent(scoped, 'recruiting.task_completed', prospectId)])
    return next
  }
  const event = { id, prospectId, organizationId: actor.organizationId, actorId: actor.id, kind: input.kind, text: input.kind === 'stage' ? `Stage changed from ${prospect.stage} to ${input.stage}` : input.kind === 'meeting' ? 'Local recruiting meeting recorded' : input.text, ...(input.dueAt ? { dueAt: input.dueAt, done: false } : {}), ...(input.startsAt ? { startsAt: input.startsAt, endsAt: input.endsAt, location: input.location ?? '' } : {}), createdAt: now }
  const next = { ...prospect, ...(input.kind === 'stage' && input.stage ? { stage: input.stage } : {}), updatedAt: now, version: prospect.version + 1 }
  await repo.putDomainRecordsAtomic(scoped, [
    { collection: 'recruiting_events', recordId: id, ownerUserId: prospect.ownerId, data: event, createOnly: true },
    { collection: 'recruiting_prospects', recordId: prospectId, ownerUserId: prospect.ownerId, data: next as unknown as Record<string, unknown>, expectedVersion: prospect.version },
  ], [auditEvent(scoped, `recruiting.${input.kind}`, prospectId)])
  return next
}
