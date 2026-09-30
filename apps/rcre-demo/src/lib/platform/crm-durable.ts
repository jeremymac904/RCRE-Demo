import 'server-only'
import { randomUUID } from 'node:crypto'
import type { Repository, Actor as RepositoryActor, DomainRecordInput } from '@/lib/db/repository'
import type { PlatformActor } from './auth'
import { AccessError, assertCapability, scopedOwner } from './auth'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { getContactDurable } from './service'

type Row = Record<string, unknown> & { id: string; organizationId: string; ownerId: string; officeId: string; version: number }

function repositoryActor(actor: PlatformActor): RepositoryActor {
  if (!isUuid(actor.id) || !isUuid(actor.organizationId) || actor.userId !== actor.id) {
    throw new AccessError('A verified durable organization membership is required.', 503)
  }
  return { userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role) }
}
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const now = () => new Date().toISOString()
const assertOrg = (actor: PlatformActor, row: Row) => {
  if (row.organizationId !== actor.organizationId || !scopedOwner(actor, row.ownerId, row.officeId)) throw new AccessError('Record not found', 404)
}

async function listRows<T extends Row>(actor: PlatformActor, repo: Repository, collection: string): Promise<(T & { sourceCollection: string })[]> {
  assertCapability(actor, collection === 'crm_appointments' ? 'calendar' : 'crm')
  const scope = repositoryActor(actor)
  const result: (T & { sourceCollection: string })[] = []
  for (let offset = 0; ; offset += 200) {
    const page = await repo.listDomainRecords(scope, collection, { limit: 200, offset })
    result.push(...page.map(record => ({ ...record.data, id: record.recordId, version: record.version, sourceCollection: collection }) as T & { sourceCollection: string }))
    if (page.length < 200) break
  }
  return result.filter(row => row.organizationId === actor.organizationId && scopedOwner(actor, row.ownerId, row.officeId))
}

function visibleSource(row: Row) {
  return String(row.sourceSystem ?? row.source ?? 'rcre').toLowerCase()
}

async function write(actor: PlatformActor, repo: Repository, collection: string, row: Row, expectedVersion?: number, createOnly = false) {
  const scope = repositoryActor(actor)
  assertOrg(actor, row)
  // Team leaders can create work for their team while the database envelope
  // remains owned by the trusted team-lead membership. The responsible agent
  // is still recorded separately in row.ownerId and checked on every read.
  const recordOwner = actor.role === 'team_leader' ? actor.id : row.ownerId
  const audit = {
    organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user' as const,
    action: `${collection.replace(/^crm_/, 'crm.')}.saved`, targetType: collection,
    targetId: row.id, effect: 'write' as const, allowed: true,
    detail: { sourceSystem: visibleSource(row) },
  }
  const [saved] = await repo.putDomainRecordsAtomic(scope, [{ collection, recordId: row.id, ownerUserId: recordOwner, data: row, ...(expectedVersion === undefined ? {} : { expectedVersion }), ...(createOnly ? { createOnly: true } : {}) }], [audit])
  return { ...saved.data, id: saved.recordId, version: saved.version } as Row
}

async function getRow(actor: PlatformActor, repo: Repository, collection: string, id: string) {
  const record = await repo.getDomainRecord(repositoryActor(actor), collection, id)
  if (!record) throw new AccessError('Record not found', 404)
  const row = { ...record.data, id: record.recordId, version: record.version } as Row
  assertOrg(actor, row)
  return row
}

export const listCrmTasksDurable = (actor: PlatformActor, repo: Repository) => listRows(actor, repo, 'crm_tasks')
export const listCrmAppointmentsDurable = (actor: PlatformActor, repo: Repository) => listRows(actor, repo, 'crm_appointments')
export const listCrmDealsDurable = (actor: PlatformActor, repo: Repository) => listRows(actor, repo, 'crm_deals')
export const listCrmActivitiesDurable = (actor: PlatformActor, repo: Repository, contactId?: string) => listRows(actor, repo, 'crm_activities').then(rows => contactId ? rows.filter(row => row.contactId === contactId) : rows)

export async function createCrmTaskDurable(actor: PlatformActor, input: Record<string, unknown>, repo: Repository) {
  assertCapability(actor, 'crm')
  let contact: Row | null = null
  if (typeof input.contactId === 'string' && input.contactId) contact = await getContactDurable(actor, input.contactId, repo) as unknown as Row
  const title = String(input.title ?? '').trim()
  const task: Row = {
    id: randomUUID(), organizationId: actor.organizationId, ownerId: contact?.ownerId ?? actor.id,
    officeId: String(contact?.officeId ?? actor.officeId), version: 1, title,
    contactId: contact?.id ?? null, dueAt: input.dueAt, done: false, sourceSystem: 'rcre', createdAt: now(),
    taskType: input.taskType ?? 'follow_up',
  }
  if (!title || title.length > 4000 || typeof task.dueAt !== 'string' || !Number.isFinite(Date.parse(task.dueAt))) throw new AccessError('A task title and valid due date are required', 400)
  return write(actor, repo, 'crm_tasks', task, undefined, true)
}

export async function completeCrmTaskDurable(actor: PlatformActor, id: string, version: number, done: boolean, repo: Repository) {
  assertCapability(actor, 'crm')
  const old = await getRow(actor, repo, 'crm_tasks', id)
  if (visibleSource(old).startsWith('fub')) throw new AccessError('Follow Up Boss tasks are read only. This action did not change the source task.', 403)
  if (old.version !== version) throw new AccessError('Task changed; reload', 409)
  return write(actor, repo, 'crm_tasks', { ...old, done, completedAt: done ? now() : null }, version)
}

export async function saveCrmAppointmentDurable(actor: PlatformActor, input: Record<string, unknown>, repo: Repository) {
  assertCapability(actor, 'calendar')
  const id = typeof input.id === 'string' ? input.id : randomUUID()
  const old = typeof input.id === 'string' ? await getRow(actor, repo, 'crm_appointments', id) : null
  if (old && visibleSource(old).startsWith('fub')) throw new AccessError('Imported Follow Up Boss appointments are read only.', 403)
  if (old && old.version !== input.version) throw new AccessError('Appointment changed; reload', 409)
  let contact: Row | null = null
  if (typeof input.contactId === 'string' && input.contactId) contact = await getContactDurable(actor, input.contactId, repo) as unknown as Row
  const start = Date.parse(String(input.startsAt ?? ''))
  const end = Date.parse(String(input.endsAt ?? ''))
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new AccessError('End must follow start', 400)
  const status = String(input.status ?? old?.status ?? 'planned')
  if (status === 'held' && start > Date.now()) throw new AccessError('A future appointment cannot be marked held', 400)
  const ownerId = String(old?.ownerId ?? contact?.ownerId ?? actor.id)
  const officeId = String(old?.officeId ?? contact?.officeId ?? actor.officeId)
  const existing = await listCrmAppointmentsDurable(actor, repo)
  if (!['canceled', 'completed'].includes(status) && existing.some(event => event.id !== id && !['canceled', 'completed'].includes(String(event.status ?? 'planned')) && event.ownerId === ownerId && Date.parse(String(event.startsAt)) < end && Date.parse(String(event.endsAt)) > start)) {
    throw new AccessError('This overlaps an existing appointment', 409)
  }
  const title = String(input.title ?? '').trim()
  const row: Row = {
    id, organizationId: actor.organizationId, ownerId, officeId, version: old?.version ?? 1,
    title, contactId: contact?.id ?? old?.contactId ?? null,
    startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(),
    location: String(input.location ?? ''), kind: String(input.kind ?? old?.kind ?? 'appointment'),
    status, taskId: input.taskId ?? old?.taskId ?? null, createdAt: old?.createdAt ?? now(), sourceSystem: 'rcre',
  }
  if (!title || title.length > 4000) throw new AccessError('An appointment title is required', 400)
  return write(actor, repo, 'crm_appointments', row, old?.version, !old)
}

export async function saveCrmDealDurable(actor: PlatformActor, input: Record<string, unknown>, repo: Repository) {
  assertCapability(actor, 'crm')
  const id = typeof input.id === 'string' ? input.id : randomUUID()
  const old = typeof input.id === 'string' ? await getRow(actor, repo, 'crm_deals', id) : null
  if (old && visibleSource(old).startsWith('fub')) throw new AccessError('Imported Follow Up Boss deals are read only.', 403)
  if (old && old.version !== input.version) throw new AccessError('Deal changed; reload', 409)
  const contactId = typeof input.contactId === 'string' ? input.contactId : old?.contactId
  const contact = typeof contactId === 'string' ? await getContactDurable(actor, contactId, repo) as unknown as Row : null
  const priceValue = input.price === undefined ? old?.price ?? null : Number(input.price)
  const price = priceValue === null ? null : Number(priceValue)
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new AccessError('Deal price must be a non-negative number', 400)
  const ownerId = String(old?.ownerId ?? contact?.ownerId ?? actor.id)
  const name = String(input.name ?? old?.name ?? '').trim()
  const row: Row = {
    id, organizationId: actor.organizationId, ownerId, officeId: String(old?.officeId ?? contact?.officeId ?? actor.officeId),
    version: old?.version ?? 1, name, contactId: contact?.id ?? null,
    pipeline: String(input.pipeline ?? old?.pipeline ?? 'Default'), stage: String(input.stage ?? old?.stage ?? 'Lead'),
    price, projectedCloseOn: input.projectedCloseOn ?? old?.projectedCloseOn ?? null,
    closedAt: input.closedAt ?? old?.closedAt ?? null, status: String(input.status ?? old?.status ?? 'open'),
    sourceSystem: 'rcre', createdAt: old?.createdAt ?? now(),
  }
  if (!name || name.length > 4000) throw new AccessError('A deal name is required', 400)
  return write(actor, repo, 'crm_deals', row, old?.version, !old)
}

export async function logCrmActivityDurable(actor: PlatformActor, contactId: string, input: { label: string; kind: 'call' | 'note'; connected?: boolean }, repo: Repository) {
  assertCapability(actor, 'crm')
  const contact = await getContactDurable(actor, contactId, repo)
  if (contact.sourceSystem?.startsWith('fub') && input.kind === 'call') {
    // Recording an observed call locally is allowed; the FUB source itself is never modified.
  }
  const at = now()
  const activity: Row = {
    id: randomUUID(), organizationId: actor.organizationId, ownerId: contact.ownerId, officeId: contact.officeId,
    version: 1, contactId, kind: input.kind, direction: input.kind === 'call' ? 'outbound' : 'system',
    label: input.kind === 'call' ? `${input.connected ? 'Connected conversation' : 'Call attempted'}: ${input.label}` : input.label,
    occurredAt: at, authorId: actor.id, sourceSystem: 'rcre',
  }
  const updated = {
    ...contact, version: contact.version + 1, timeline: [...(contact.timeline ?? []), { at, kind: input.kind, direction: activity.direction, label: activity.label, sourceSystem: 'rcre', sourceId: activity.id }],
    ...(input.kind === 'call' ? { firstTouchAt: contact.firstTouchAt ?? at, lastTouchAt: at, lastOutboundAt: at } : {}),
  }
  const scope = repositoryActor(actor)
  const actorEnvelopeOwner = actor.role === 'team_leader' ? actor.id : contact.ownerId
  await repo.putDomainRecordsAtomic(scope, [
    { collection: 'crm_activities', recordId: activity.id, ownerUserId: actorEnvelopeOwner, data: activity, createOnly: true },
    { collection: 'crm_contacts', recordId: contact.id, ownerUserId: actor.role === 'team_leader' ? actor.id : contact.ownerId, data: updated, expectedVersion: contact.version },
  ], [{ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: `crm.activity.${input.kind}`, targetType: 'crm_contacts', targetId: contactId, effect: 'write', allowed: true, detail: { activityId: activity.id, sourceSystem: 'rcre' } }])
  return { ...updated, version: contact.version + 1 }
}

export async function updateCrmContactDurable(actor: PlatformActor, id: string, input: Record<string, unknown>, repo: Repository) {
  assertCapability(actor, 'crm')
  const contact = await getContactDurable(actor, id, repo)
  if (Number(input.version) !== contact.version) throw new AccessError('Record changed. Reload and retry.', 409)
  const allowed = ['firstName', 'lastName', 'phone', 'email', 'stage', 'tags', 'intent']
  const patch = Object.fromEntries(allowed.filter(key => key in input).map(key => [key, input[key]]))
  if ('ownerId' in input && input.ownerId !== contact.ownerId) {
    if (actor.role === 'agent' || !['broker_owner', 'managing_broker', 'team_leader'].includes(actor.role)) throw new AccessError('Assignment is outside your scope', 403)
    const ownerId = String(input.ownerId)
    const owner = await repo.getUser(repositoryActor(actor), ownerId)
    if (!owner?.isActive || !['agent', 'team_lead'].includes(owner.role)) throw new AccessError('Assigned agent is not active in this organization.', 400)
    const profile = await repo.getDomainRecord(repositoryActor(actor), 'member_profiles', ownerId)
    const officeId = String(profile?.data.officeId ?? '')
    if (!officeId || (actor.role !== 'broker_owner' && officeId !== actor.officeId)) throw new AccessError('Assignment is outside your office scope.', 403)
    patch.ownerId = ownerId
    patch.officeId = officeId
  }
  if (contact.sourceSystem?.startsWith('fub') && Object.keys(patch).length) {
    const proposalId = randomUUID()
    const proposal = { id: proposalId, organizationId: actor.organizationId, ownerId: contact.ownerId, officeId: contact.officeId, contactId: id, sourceVersion: contact.version, patch, state: 'awaiting_connector', submittedBy: actor.id, createdAt: now(), sourceSystem: 'rcre' }
    const scope = repositoryActor(actor)
    await repo.putDomainRecordsAtomic(scope, [{ collection: 'crm_fub_proposals', recordId: proposalId, ownerUserId: actor.role === 'team_leader' ? actor.id : contact.ownerId, data: proposal, createOnly: true }], [{ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'crm.fub_change_proposed', targetType: 'crm_fub_proposals', targetId: proposalId, effect: 'draft', allowed: true, detail: { contactId: id, fields: Object.keys(patch) } }])
    return { ...contact, proposedChangeId: proposalId, changeStatus: 'awaiting_connector', message: 'Proposed change saved. Follow Up Boss source fields remain unchanged.' }
  }
  const next = { ...contact, ...patch, version: contact.version + 1 } as unknown as Row
  if (patch.stage && patch.stage !== contact.stage) {
    const at = now()
    next.stageEnteredAt = at
    next.timeline = [...(contact.timeline ?? []), { at, kind: 'stage', direction: 'system', label: `Stage changed from ${contact.stage} to ${patch.stage}`, sourceSystem: 'rcre' }]
  }
  const envelope = actor.role === 'team_leader' ? actor.id : String(next.ownerId)
  const scope = repositoryActor(actor)
  const inputs: DomainRecordInput[] = [{ collection: 'crm_contacts', recordId: id, ownerUserId: envelope, data: next, expectedVersion: contact.version }]
  if (patch.ownerId && patch.ownerId !== contact.ownerId) inputs.push({ collection: 'crm_assignment_history', recordId: `${id}:${randomUUID()}`, ownerUserId: envelope, data: { organizationId: actor.organizationId, contactId: id, from: contact.ownerId, to: patch.ownerId, at: now(), actorId: actor.id, kind: 'manual reassignment' }, createOnly: true })
  await repo.putDomainRecordsAtomic(scope, inputs, [{ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'crm.contact.updated', targetType: 'crm_contacts', targetId: id, effect: 'write', allowed: true, detail: { fields: Object.keys(patch) } }])
  return next
}

export async function listCrmSavedViewsDurable(actor: PlatformActor, repo: Repository) {
  assertCapability(actor, 'crm')
  return (await listRows(actor, repo, 'crm_saved_views')).filter(row => row.ownerId === actor.id || ['broker_owner', 'managing_broker'].includes(actor.role) || row.visibility === 'shared')
}

export async function saveCrmSavedViewDurable(actor: PlatformActor, input: Record<string, unknown>, repo: Repository) {
  assertCapability(actor, 'crm')
  const id = typeof input.id === 'string' ? input.id : randomUUID()
  const old = typeof input.id === 'string' ? await getRow(actor, repo, 'crm_saved_views', id) : null
  if (old && old.ownerId !== actor.id && !['broker_owner', 'managing_broker'].includes(actor.role)) throw new AccessError('View is outside your scope', 404)
  if (old && old.version !== input.version) throw new AccessError('View changed; reload', 409)
  const name = String(input.name ?? '').trim()
  if (!name || name.length > 200) throw new AccessError('A view name is required', 400)
  const visibility = input.visibility === 'shared' ? 'shared' : 'private'
  if (visibility === 'shared' && !['broker_owner', 'managing_broker', 'team_leader'].includes(actor.role)) throw new AccessError('Only brokerage leadership can share a view', 403)
  const row: Row = { id, organizationId: actor.organizationId, ownerId: actor.id, officeId: actor.officeId, version: old?.version ?? 1, name, query: input.query ?? '', filters: input.filters ?? {}, sort: input.sort ?? 'newest', columns: input.columns ?? [], visibility, source: 'RCRE View', createdAt: old?.createdAt ?? now() }
  return write(actor, repo, 'crm_saved_views', row, old?.version, !old)
}

export async function getCrmContactCoverage(actor: PlatformActor, id: string, repo: Repository) {
  const contact = await getContactDurable(actor, id, repo)
  const [activities, tasks, appointments, deals] = await Promise.all([
    listCrmActivitiesDurable(actor, repo, id), listCrmTasksDurable(actor, repo).then(rows => rows.filter(row => row.contactId === id)),
    listCrmAppointmentsDurable(actor, repo).then(rows => rows.filter(row => row.contactId === id)), listCrmDealsDurable(actor, repo).then(rows => rows.filter(row => row.contactId === id)),
  ])
  return { contact, activities, tasks, appointments, deals, coverage: { source: contact.sourceSystem ?? 'RCRE', messageContent: 'Not Available unless explicitly imported', activityCount: activities.length, observedHistoryFrom: activities.map(row => String(row.occurredAt)).sort()[0] ?? null } }
}


export async function reportCrmDurable(actor: PlatformActor, from: string, to: string, repo: Repository) {
  assertCapability(actor, 'reporting')
  const start = Date.parse(from)
  const end = Date.parse(to) + 86_400_000
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new AccessError('Choose a valid date range', 400)
  // Reporting is a bounded server computation over tenant-scoped repository pages;
  // no CRM arrays are returned to the browser beyond the evidence already in the report.
  const contactsPage = await import('./service').then(({ listContactsPage }) => listContactsPage(actor, { page: 1, pageSize: 100 }, repo))
  const contacts = [...contactsPage.rows]
  for (let page = 2; page <= contactsPage.pageCount; page++) contacts.push(...(await import('./service').then(({ listContactsPage }) => listContactsPage(actor, { page, pageSize: 100 }, repo))).rows)
  const [tasks, calendar, deals] = await Promise.all([listCrmTasksDurable(actor, repo), listCrmAppointmentsDurable(actor, repo), listCrmDealsDurable(actor, repo)])
  const cohort = contacts.filter(contact => Date.parse(contact.receivedAt) >= start && Date.parse(contact.receivedAt) < end)
  const events = contacts.flatMap(contact => (contact.timeline ?? []).filter((event: any) => Date.parse(event.at) >= start && Date.parse(event.at) < end).map((event: any) => ({ ...event, contactId: contact.id, name: `${contact.firstName} ${contact.lastName}` })))
  const calls = events.filter(event => event.kind === 'call' && event.direction === 'out')
  const responseMinutes = cohort.map(contact => contact.firstTouchAt ? (Date.parse(contact.firstTouchAt) - Date.parse(contact.receivedAt)) / 60_000 : null).filter((value): value is number => value !== null && value >= 0).sort((a, b) => a - b)
  const median = responseMinutes.length ? (responseMinutes[Math.floor((responseMinutes.length - 1) / 2)] + responseMinutes[Math.floor(responseMinutes.length / 2)]) / 2 : null
  const appointments = calendar.filter(event => Date.parse(String(event.startsAt)) >= start && Date.parse(String(event.startsAt)) < end)
  const tasksDue = tasks.filter(task => typeof task.dueAt === 'string' && Date.parse(task.dueAt) >= start && Date.parse(task.dueAt) < end)
  const stageTimes: Record<string, { days: number; count: number }> = {}
  for (const contact of contacts) {
    const transitions = (contact.timeline ?? []).filter((event: any) => event.kind === 'stage' && event.label?.startsWith('Stage changed from ')).sort((a: any, b: any) => a.at.localeCompare(b.at))
    for (let index = 0; index < transitions.length - 1; index++) {
      const entered = Date.parse(transitions[index].at), exited = Date.parse(transitions[index + 1].at)
      if (entered < start || exited >= end || exited < entered) continue
      const stage = transitions[index].label.split(' to ').at(-1)!
      const aggregate = stageTimes[stage] ?? { days: 0, count: 0 }
      aggregate.days += (exited - entered) / 86_400_000
      aggregate.count++
      stageTimes[stage] = aggregate
    }
  }
  const closed = cohort.filter(contact => (contact.timeline ?? []).some((event: any) => event.kind === 'stage' && event.label?.endsWith('to Closed') && Date.parse(event.at) < end)).length
  return {
    from, to, cohort, events, calls: calls.length, connected: calls.filter(event => String(event.label).startsWith('Connected conversation')).length,
    appointments: appointments.length, appointmentEvidence: appointments, appointmentSetEvents: calendar.filter(event => event.createdAt && Date.parse(String(event.createdAt)) >= start && Date.parse(String(event.createdAt)) < end && event.kind !== 'proposed block').length,
    appointmentTimestampCoverage: calendar.filter(event => event.createdAt).length,
    appointmentsHeld: appointments.some(event => !event.status || event.status === 'planned') ? null : appointments.filter(event => event.status === 'held').length,
    cohortClosed: closed, recordedClosingConversion: cohort.length ? closed / cohort.length : null,
    contracts: events.filter(event => event.kind === 'stage' && event.label.endsWith('to Under Contract')).length,
    closings: events.filter(event => event.kind === 'stage' && event.label.endsWith('to Closed')).length,
    firstResponseMedianMinutes: median, responseDenominator: responseMinutes.length,
    stageTimes: Object.entries(stageTimes).map(([stage, aggregate]) => ({ stage, meanDays: aggregate.days / aggregate.count, completedIntervals: aggregate.count })),
    fallout: null, tasksDue: tasksDue.length, overdueTasks: tasks.filter(task => !Boolean(task.done) && Date.parse(String(task.dueAt)) < Date.now()).length,
    deals: deals.length, openDeals: deals.filter(deal => deal.status !== 'closed' && deal.status !== 'archived').length,
    leadSourceCoverage: cohort.reduce((acc: Record<string, number>, contact) => { const source = String(contact.source || 'Unknown'); acc[source] = (acc[source] ?? 0) + 1; return acc }, {}),
    coverage: { source: 'RCRE durable records', completeness: 'Partial coverage', stageHistory: 'Observed from collection start; earlier transitions are unavailable', firstResponse: 'Recorded RCRE activity only', externalMessages: 'Not available unless explicitly imported' },
  }
}

/** Action queue from persisted evidence only; absence of a threshold/history is not a breach. */
export async function listCrmPrioritiesDurable(actor: PlatformActor, repo: Repository) {
  assertCapability(actor, 'crm')
  const [contactsPage, tasks] = await Promise.all([
    import('./service').then(({ listContactsPage }) => listContactsPage(actor, { page: 1, pageSize: 100 }, repo)),
    listCrmTasksDurable(actor, repo),
  ])
  const contacts = [...contactsPage.rows]
  for (let page = 2; page <= contactsPage.pageCount; page++) {
    contacts.push(...(await import('./service').then(({ listContactsPage }) => listContactsPage(actor, { page, pageSize: 100 }, repo))).rows)
  }
  const nowMs = Date.now(), dayAgo = nowMs - 86_400_000
  return contacts.map(contact => {
    const reasons: string[] = []
    const overdue = tasks.filter(task => task.contactId === contact.id && !Boolean(task.done) && Date.parse(String(task.dueAt)) < nowMs)
    for (const task of overdue) reasons.push(`Task overdue: ${String(task.title ?? 'Follow up')}`)
    const received = Date.parse(contact.receivedAt)
    if (Number.isFinite(received) && received >= dayAgo) reasons.push('New lead received within the last 24 hours')
    return { contact, reasons, score: reasons.length }
  }).filter(item => item.reasons.length > 0)
    .sort((a, b) => b.score - a.score || Date.parse(a.contact.receivedAt) - Date.parse(b.contact.receivedAt))
}
