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

const stage = z.enum(['New inquiry', 'Contacted', 'Meeting scheduled', 'Considering', 'Joined', 'Paused', 'Rejected', 'Do not contact', 'Withdrawn'])
const draftSchema = z.object({
  name: z.string().trim().min(2).max(160),
  stage: stage.default('New inquiry'),
  nextAction: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
  consent: z.boolean().default(false),
}).strict()

type Prospect = z.infer<typeof draftSchema> & { id: string; organizationId: string; ownerId: string; officeId: string; version: number; createdAt: string; updatedAt: string; invitationId?: string }
const repositoryActor = (actor: PlatformActor): RepositoryActor => ({ userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role) })
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
  const input = draftSchema.parse(Object.fromEntries(['name', 'stage', 'nextAction', 'source', 'notes', 'consent'].filter(key => key in fields).map(key => [key, fields[key]])))
  const now = new Date().toISOString()
  const id = typeof raw === 'object' && raw !== null && 'id' in raw && typeof raw.id === 'string' ? raw.id : randomUUID()
  const prior = await repo.getDomainRecord<Prospect>(repositoryActor(actor), 'recruiting_prospects', id)
  if (prior && !visibleTo(actor, prior.data)) throw new AccessError('Prospect not found', 404)
  const expected = typeof raw === 'object' && raw !== null && 'version' in raw ? Number(raw.version) : undefined
  if (prior && expected !== prior.version) throw new AccessError('Prospect changed; refresh before saving', 409)
  const data: Prospect = {
    ...input, id, organizationId: actor.organizationId, ownerId: prior?.data.ownerId ?? actor.id,
    officeId: prior?.data.officeId ?? actor.officeId, version: (prior?.version ?? 0) + 1,
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

export async function appendRecruitingEventDurable(actor: PlatformActor, prospectId: string, raw: unknown, repository?: Repository) {
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
    const invitations = await listInvitations(actor)
    const existing = invitations.find(invite => invite.email.toLowerCase() === email && ['pending', 'queued', 'sent'].includes(invite.status))
    const invitation = existing ?? await createInvitation(actor, { email, name: prospect.name, role: 'agent', officeId: prospect.officeId, teamId: prospect.officeId, market: prospect.officeId })
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
