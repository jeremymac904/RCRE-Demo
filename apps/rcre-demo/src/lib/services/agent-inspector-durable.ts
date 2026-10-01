import 'server-only'
import type { Actor, Repository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { AccessError, assertCapability, scopedOwner } from '@/lib/platform/auth'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { listContactsPage, type Contact } from '@/lib/platform/service'
import { listCrmAppointmentsDurable, listCrmDealsDurable, listCrmTasksDurable } from '@/lib/platform/crm-durable'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE_SIZE = 100

type AgentInspectionContact = {
  id: string; name: string; source: string; stage: string; receivedAt: string
  stageEnteredAt: string | null; lastOutboundAt: string | null; firstTouchAt: string | null; href: string
}
type AgentInspectionOutput = {
  roster: Array<{ id: string; name: string; market: string; officeId: string; leads: number; overdueTasks: number }>
  agent: null | Record<string, unknown>
  coverage: { source: string; transactions: string; training: string; assignmentHistory: string }
}

function repositoryActor(actor: PlatformActor): Actor {
  if (!UUID.test(actor.id) || !UUID.test(actor.organizationId) || actor.userId !== actor.id) {
    throw new AccessError('A verified durable organization membership is required.', 503)
  }
  return { userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role), officeId: actor.officeId }
}

async function allContacts(actor: PlatformActor, repository: Repository): Promise<Contact[]> {
  const first = await listContactsPage(actor, { page: 1, pageSize: PAGE_SIZE }, repository)
  const contacts = [...first.rows]
  for (let page = 2; page <= first.pageCount; page++) {
    contacts.push(...(await listContactsPage(actor, { page, pageSize: PAGE_SIZE }, repository)).rows)
  }
  return contacts
}

function officeMarket(officeId: string): string {
  if (officeId === 'al') return 'Alabama'
  if (officeId === 'fl') return 'Florida'
  return 'Unknown market'
}

function activityRows(contacts: Contact[]) {
  return contacts.flatMap(contact => (Array.isArray(contact.timeline) ? contact.timeline : []).map((event, index) => {
    const metadata = event as typeof event & { sourceId?: string; fubActivityId?: string; sourceSystem?: string }
    return {
      ...metadata,
      contactId: contact.id,
      contactName: `${contact.firstName} ${contact.lastName}`.trim() || 'Contact',
      evidenceId: String(metadata.sourceId ?? metadata.fubActivityId ?? `${contact.id}:${event.at}:${event.kind}:${index}`),
      href: `/crm/${encodeURIComponent(contact.id)}`,
    }
  })).sort((left, right) => String(right.at).localeCompare(String(left.at)))
}

/**
 * PostgreSQL-backed leadership projection. It reads only the durable member and
 * CRM repositories, and delegates contact/task/calendar scoping to the same
 * access-controlled services used by the CRM workspace. No legacy store, demo
 * fixtures, training, or transaction store is consulted here.
 */
export async function inspectAgentsDurable(actor: PlatformActor, selectedId: string | undefined, repository: Repository, now = Date.now()): Promise<AgentInspectionOutput> {
  assertCapability(actor, 'command')
  const scope = repositoryActor(actor)
  const user = await repository.getUser(scope, actor.id)
  if (!user || !user.isActive || user.organizationId !== actor.organizationId || user.role !== scope.role) {
    throw new AccessError('An active durable organization membership is required.', 403)
  }

  const [users, contacts, tasks] = await Promise.all([
    repository.listUsers(scope),
    allContacts(actor, repository),
    listCrmTasksDurable(actor, repository),
  ])
  const currentUsers = users.filter(member => member.organizationId === actor.organizationId && member.isActive
    && ['agent', 'team_lead'].includes(member.role)
    && scopedOwner(actor, member.id, member.officeId ?? undefined))
  const visibleIds = new Set(currentUsers.map(member => member.id))
  const visibleContacts = contacts.filter(contact => contact.organizationId === actor.organizationId
    && visibleIds.has(contact.ownerId) && scopedOwner(actor, contact.ownerId, contact.officeId))
  const visibleTasks = tasks.filter(task => task.organizationId === actor.organizationId && visibleIds.has(task.ownerId)
    && scopedOwner(actor, task.ownerId, task.officeId))
  const roster = currentUsers.map(member => ({
    id: member.id,
    name: member.fullName?.trim() || 'Name not provided',
    market: officeMarket(member.officeId ?? ''),
    officeId: member.officeId ?? '',
    leads: visibleContacts.filter(contact => contact.ownerId === member.id).length,
    overdueTasks: visibleTasks.filter(task => task.ownerId === member.id && !Boolean(task.done)
      && Number.isFinite(Date.parse(String(task.dueAt))) && Date.parse(String(task.dueAt)) < now).length,
  })).sort((left, right) => right.overdueTasks - left.overdueTasks || left.name.localeCompare(right.name))

  const coverage = {
    source: 'Durable RCRE CRM records. Source and event counts reflect records currently available to RCRE; earlier history is not inferred.',
    transactions: 'Not included in this CRM-only projection.',
    training: 'Not included in this CRM-only projection.',
    assignmentHistory: 'Available only for assignment events recorded in the durable CRM repository.',
  }
  if (!selectedId) return { roster, agent: null, coverage }
  const selected = currentUsers.find(member => member.id === selectedId)
  if (!selected || selected.organizationId !== actor.organizationId || !scopedOwner(actor, selected.id, selected.officeId ?? undefined)) {
    throw new AccessError('Agent outside your authorized scope', 404)
  }

  const officeId = selected.officeId ?? ''
  const owned = visibleContacts.filter(contact => contact.ownerId === selected.id)
  const ownedTasks = visibleTasks.filter(task => task.ownerId === selected.id)
  const [appointments, deals, assignmentRows] = await Promise.all([
    listCrmAppointmentsDurable(actor, repository),
    listCrmDealsDurable(actor, repository),
    listDomainRows(repository, scope, 'crm_assignment_history'),
  ])
  const ownedAppointments = appointments.filter(event => event.organizationId === actor.organizationId && event.ownerId === selected.id
    && scopedOwner(actor, event.ownerId, event.officeId))
    .sort((left, right) => String(left.startsAt).localeCompare(String(right.startsAt)))
  const ownedDeals = deals.filter(deal => deal.organizationId === actor.organizationId && deal.ownerId === selected.id
    && scopedOwner(actor, deal.ownerId, deal.officeId))
  // Without a durable, approved brokerage cadence, inactivity is unknown.
  const inactiveDays: number | null = null
  const events = activityRows(owned)
  const outboundCalls = events.filter(event => event.kind === 'call' && ['out', 'outbound'].includes(String(event.direction)))
  const contactedInactive = null
  const stageEvidence = owned.flatMap(contact => {
    const reasons: string[] = []
    if (!contact.firstTouchAt) reasons.push('No recorded first outreach')
    const overdue = ownedTasks.some(task => task.contactId === contact.id && !Boolean(task.done)
      && Number.isFinite(Date.parse(String(task.dueAt))) && Date.parse(String(task.dueAt)) < now)
    if (overdue) reasons.push('An assigned task is overdue')
    return reasons.length ? [{ contactId: contact.id, name: `${contact.firstName} ${contact.lastName}`.trim() || 'Contact', reasons, href: `/crm/${encodeURIComponent(contact.id)}` }] : []
  })
  const sourceCounts = new Map<string, number>()
  for (const contact of owned) {
    const source = String(contact.source || 'Unknown')
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1)
  }
  const assignmentHistory = assignmentRows.filter(row => row.organizationId === actor.organizationId && owned.some(contact => contact.id === row.contactId)
    && scopedOwner(actor, String(row.ownerId ?? row.to ?? selected.id), String(row.officeId ?? officeId)))
    .map(row => ({ organizationId: actor.organizationId, contactId: String(row.contactId), from: String(row.from ?? ''), to: String(row.to ?? ''),
      at: String(row.at ?? ''), actorId: String(row.actorId ?? '') }))
    .sort((left, right) => right.at.localeCompare(left.at))

  const sourceSystems = [...new Set(owned.map(contact => String(contact.sourceSystem ?? 'RCRE')))]
  return {
    roster,
    coverage,
    agent: {
      id: selected.id,
      name: selected.fullName?.trim() || 'Name not provided',
      market: officeMarket(officeId),
      officeId,
      inactiveDays,
      generatedAt: new Date(now).toISOString(),
      summary: {
        leads: owned.length,
        noRecordedFirstOutreach: owned.filter(contact => !contact.firstTouchAt).length,
        contactedInactive,
        recordedCallAttempts: outboundCalls.length,
        explicitConnectedConversations: outboundCalls.filter(event => String(event.label ?? '').startsWith('Connected conversation')).length,
        overdueTasks: ownedTasks.filter(task => !Boolean(task.done) && Number.isFinite(Date.parse(String(task.dueAt))) && Date.parse(String(task.dueAt)) < now).length,
      },
      contacts: owned.map(contact => ({
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`.trim() || 'Contact',
        source: contact.source || 'Unknown', stage: contact.stage || 'Unknown', receivedAt: contact.receivedAt,
        stageEnteredAt: contact.stageEnteredAt ?? null, lastOutboundAt: contact.lastOutboundAt ?? null,
        firstTouchAt: contact.firstTouchAt ?? null, href: `/crm/${encodeURIComponent(contact.id)}`,
      })),
      tasks: ownedTasks,
      appointments: ownedAppointments,
      events,
      stageEvidence,
      transactionConcerns: [],
      training: { completedLessonCount: null, totalImportedLessons: null, lastViewedLessonId: null, updatedAt: null, assignments: [], availability: 'Not included in this CRM-only projection.' },
      assignmentHistory,
      sourceCoverage: [...sourceCounts].map(([source, records]) => ({
        source, records,
        coverage: `${records} durable CRM lead records; CRM source system${sourceSystems.length === 1 ? '' : 's'} observed: ${sourceSystems.join(', ')}. Message bodies and history before collection are not inferred.`,
      })),
      coverage: { ...coverage, leadInactivityThreshold: 'Unavailable; inactive count is not evaluated because no durable approved cadence is present.', deals: `${ownedDeals.length} durable CRM deal records visible to this agent.` },
    },
  }
}

async function listDomainRows(repository: Repository, actor: Actor, collection: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  for (let offset = 0; ; offset += 200) {
    const page = await repository.listDomainRecords(actor, collection, { limit: 200, offset })
    rows.push(...page.map(record => ({ ...record.data, id: record.recordId, version: record.version, ownerId: record.ownerUserId })))
    if (page.length < 200) return rows
  }
}

