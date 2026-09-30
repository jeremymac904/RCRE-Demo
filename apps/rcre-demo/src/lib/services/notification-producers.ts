import 'server-only'
import type { Repository, Actor } from '@/lib/db/repository'
import type { PlatformActor, PlatformRole } from '@/lib/platform/auth'
import type { MemberSummary } from '@/lib/auth/persistence'
import { getAuthPersistence } from '@/lib/auth/persistence'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { durableNotifications } from '@/lib/services/notifications-durable'
import type { User } from '@/lib/domain-types'
import { calculateDeadline } from '@/lib/services/deadlines'

type NotificationInput = {
  idempotencyKey: string
  eventType: 'new_lead' | 'lead_assignment' | 'overdue_task' | 'appointment' | 'transaction_deadline' | 'training_assignment' | 'invitation' | 'website_lead' | 'approval'
  title: string
  body?: string
  href?: string
  source: string
}

function memberActor(member: Pick<MemberSummary, 'userId' | 'organizationId' | 'platformRole' | 'officeId'>): Actor {
  return {
    userId: member.userId,
    organizationId: member.organizationId,
    role: repositoryRoleForPlatform(member.platformRole),
    officeId: member.officeId,
  }
}

/**
 * Queue a notice for a verified member after its source record is committed.
 * The outbox is the only side effect; no mail or external communication is
 * sent from these producers. Failures are recorded without leaking details or
 * making an already-committed source action appear rolled back.
 */
export async function enqueueMemberNotice(
  member: Pick<MemberSummary, 'userId' | 'organizationId' | 'platformRole' | 'officeId'>,
  input: NotificationInput,
  repository?: Repository,
): Promise<boolean> {
  const service = durableNotifications(repository)
  const actor = memberActor(member)
  try {
    await service.enqueue(actor, input)
  } catch {
    console.error(JSON.stringify({ event: 'notification_enqueue_failed', eventType: input.eventType, channel: 'in_app' }))
    return false
  }
  // Email delivery is explicitly preference-gated and stays queued for the
  // authenticated worker; this producer never invokes a mail transport.
  try {
    const preferences = await service.preferences(actor)
    if (preferences.emailEnabled && preferences.eventTypes[input.eventType] !== false) {
      await service.enqueue(actor, { ...input, idempotencyKey: `${input.idempotencyKey}:email`, channel: 'email' })
    }
  } catch {
    console.error(JSON.stringify({ event: 'notification_enqueue_failed', eventType: input.eventType, channel: 'email' }))
  }
  return true
}

/** Resolve the recipient from the authenticated organization roster before queuing. */
export async function enqueueNoticeForMemberId(
  actor: PlatformActor,
  recipientUserId: string,
  input: NotificationInput,
  repository?: Repository,
): Promise<boolean> {
  try {
    if (recipientUserId === actor.id) {
      return await enqueueMemberNotice(memberNotificationIdentity(actor), input, repository)
    }
    const member = (await (await getAuthPersistence()).listMembers(actor))
      .find(candidate => candidate.userId === recipientUserId && candidate.organizationId === actor.organizationId && candidate.active)
    if (!member) return false
    return await enqueueMemberNotice(member, input, repository)
  } catch {
    console.error(JSON.stringify({ event: 'notification_recipient_resolution_failed', eventType: input.eventType }))
    return false
  }
}

function matchesAssignment(member: MemberSummary, assignment: {
  targetType: string; target: string; exemptions?: string[]
}): boolean {
  if (!member.active || assignment.exemptions?.includes(member.userId)) return false
  switch (assignment.targetType) {
    case 'all': return true
    case 'agent': return member.userId === assignment.target
    case 'role': return member.platformRole === assignment.target
    case 'market': return member.market === assignment.target
    case 'office': return member.officeId === assignment.target
    case 'team': return member.teamId === assignment.target
    default: return false
  }
}

/** Fan out a published course assignment only to active, server-verified members. */
export async function notifyTrainingAssignment(
  actor: PlatformActor,
  assignment: { id: string; organizationId: string; ownerId: string; courseId: string; targetType: string; target: string; due: string; exemptions?: string[] },
  repository?: Repository,
): Promise<{ recipients: number; queued: number }> {
  if (assignment.organizationId !== actor.organizationId || assignment.ownerId !== actor.id) throw new Error('Training assignment notification scope mismatch')
  let members: MemberSummary[]
  try { members = await (await getAuthPersistence()).listMembers(actor) }
  catch {
    console.error(JSON.stringify({ event: 'notification_recipient_resolution_failed', eventType: 'training_assignment' }))
    return { recipients: 0, queued: 0 }
  }
  const recipients = members.filter(member => member.organizationId === actor.organizationId && matchesAssignment(member, assignment))
  const results = await Promise.all(recipients.map(member => enqueueMemberNotice(member, {
    idempotencyKey: `training-assignment:${assignment.id}:${member.userId}`,
    eventType: 'training_assignment',
    title: 'Training assigned',
    body: `A course has been assigned in RCRE Training. Due ${assignment.due}.`,
    href: '/training',
    source: 'Training',
  }, repository)))
  return { recipients: recipients.length, queued: results.filter(Boolean).length }
}

/** Map a trusted platform identity to the repository role used by notification writes. */
export function memberNotificationIdentity(input: { id: string; organizationId: string; role: PlatformRole; officeId: string }): Pick<MemberSummary, 'userId' | 'organizationId' | 'platformRole' | 'officeId'> {
  return { userId: input.id, organizationId: input.organizationId, platformRole: input.role, officeId: input.officeId }
}


type ScheduledNoticeCounts = { tasks: number; appointments: number; transactionDeadlines: number; approvals: number }
const PAGE_SIZE = 200
const DAY_MS = 24 * 60 * 60 * 1000
const APPROVER_ROLES = new Set(['owner', 'broker', 'managing_broker', 'marketing_admin'])

async function allDomainRecords<T extends Record<string, unknown>>(repository: Repository, actor: Actor, collection: string): Promise<T[]> {
  const all: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await repository.listDomainRecords<T>(actor, collection, { limit: PAGE_SIZE, offset })
    all.push(...page.map(row => row.data))
    if (page.length < PAGE_SIZE) return all
  }
}

function utcDay(value: Date): string { return value.toISOString().slice(0, 10) }
function validDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

async function enqueueScheduledNotice(actor: Actor, repository: Repository, recipientUserId: string, input: NotificationInput): Promise<boolean> {
  const notifications = durableNotifications(repository)
  let created = false
  try {
    const result = await notifications.enqueue(actor, input, { recipientUserId })
    created = !result.duplicate
  } catch {
    console.error(JSON.stringify({ event: 'notification_enqueue_failed', eventType: input.eventType, channel: 'in_app' }))
    return false
  }
  // Email is another outbox row with its own idempotency identity. Only create
  // it when the recipient has explicitly enabled both email and this event.
  try {
    const preferences = await notifications.preferences({ ...actor, userId: recipientUserId })
    if (preferences.emailEnabled && preferences.eventTypes[input.eventType] !== false) {
      await notifications.enqueue(actor, {
        ...input, idempotencyKey: `${input.idempotencyKey}:email`, channel: 'email',
      }, { recipientUserId })
    }
  } catch {
    console.error(JSON.stringify({ event: 'notification_enqueue_failed', eventType: input.eventType, channel: 'email' }))
  }
  return created
}

function reviewRecipients(users: User[], designated: string[]): User[] {
  const active = users.filter(user => user.isActive && APPROVER_ROLES.has(user.role))
  return designated.length ? active.filter(user => designated.includes(user.id)) : active
}

/**
 * Produce durable in-app reminders and approval notices from already persisted
 * records. Email rows are queued only when the recipient opted in; this is
 * intended for the authenticated server job only and never sends mail directly.
 * It includes no customer names/addresses/message text, and uses
 * source identities plus due-date/version buckets for retry-safe idempotency.
 */
export async function enqueueScheduledOperationalNotices(actor: Actor, repository: Repository, now = new Date()): Promise<ScheduledNoticeCounts> {
  if (!['owner', 'broker'].includes(actor.role)) throw new Error('Brokerage notification worker scope required')
  const counts: ScheduledNoticeCounts = { tasks: 0, appointments: 0, transactionDeadlines: 0, approvals: 0 }
  const users = (await repository.listUsers(actor)).filter(user => user.organizationId === actor.organizationId && user.isActive)
  const members = new Set(users.map(user => user.id))
  const due = now.getTime()
  const day = utcDay(now)
  const queue = async (recipient: string, input: NotificationInput, field: keyof ScheduledNoticeCounts) => {
    if (await enqueueScheduledNotice(actor, repository, recipient, input)) counts[field]++
  }

  for (const task of await repository.listTasks(actor)) {
    if (!task.assignedUserId || !members.has(task.assignedUserId) || task.isCompleted || !task.dueAt) continue
    const dueAt = Date.parse(task.dueAt)
    if (!Number.isFinite(dueAt) || dueAt > due) continue
    await queue(task.assignedUserId, {
      idempotencyKey: `crm-overdue-task:${task.id}`,
      eventType: 'overdue_task', title: 'A CRM task needs attention',
      body: 'An assigned task is overdue. Review your task list in RCRE.', href: '/crm/tasks', source: 'CRM',
    }, 'tasks')
  }

  for (const appointment of await repository.listAppointments(actor)) {
    const recipient = appointment.assignedUserId
    if (!recipient || !members.has(recipient) || !appointment.startsAt || isInactiveAppointment(appointment.outcome)) continue
    const startsAt = Date.parse(appointment.startsAt)
    if (!Number.isFinite(startsAt) || startsAt <= due || startsAt > due + DAY_MS) continue
    await queue(recipient, {
      idempotencyKey: `scheduled-appointment:${appointment.id}:${appointment.startsAt}`,
      eventType: 'appointment', title: 'An appointment is coming up',
      body: 'An appointment is scheduled within the next day. Review your RCRE calendar.', href: '/crm/calendar', source: 'CRM',
    }, 'appointments')
  }

  const transactions = await allDomainRecords<Record<string, unknown>>(repository, actor, 'transactions')
  for (const transaction of transactions) {
    if (transaction.organizationId !== actor.organizationId || ['closed', 'archived'].includes(String(transaction.status))) continue
    const recipients = [...new Set([transaction.ownerId, transaction.tcId].filter((id): id is string => typeof id === 'string' && members.has(id)))]
    if (!recipients.length) continue
    const dates = new Set<string>()
    if (validDateOnly(transaction.closingDate)) dates.add(transaction.closingDate)
    if (Array.isArray(transaction.deadlines)) for (const rawTerm of transaction.deadlines) {
      if (!rawTerm || typeof rawTerm !== 'object' || Array.isArray(rawTerm)) continue
      const term = rawTerm as Record<string, unknown>
      if (typeof term.sourceTerm !== 'string' || typeof term.effectiveDate !== 'string'
        || typeof term.timezone !== 'string' || typeof term.confirmed !== 'boolean'
        || (term.days !== null && typeof term.days !== 'number')
        || !['calendar', 'business'].includes(String(term.convention))
        || !Array.isArray(term.holidays) || !term.holidays.every(day => typeof day === 'string')) continue
      const result = calculateDeadline(term as unknown as Parameters<typeof calculateDeadline>[0])
      if (result.date) dates.add(result.date)
    }
    for (const date of dates) {
      if (date > utcDay(new Date(due + DAY_MS))) continue
      const overdue = date < day
      for (const recipient of recipients) await queue(recipient, {
        idempotencyKey: `scheduled-transaction-deadline:${transaction.id}:${date}:${overdue ? day : 'due'}`,
        eventType: 'transaction_deadline', title: overdue ? 'A transaction deadline is overdue' : 'A transaction deadline is due',
        body: 'Review the confirmed dates in the RCRE transaction workspace.',
        href: `/transactions?id=${encodeURIComponent(String(transaction.id ?? ''))}`, source: 'Transactions',
      }, 'transactionDeadlines')
    }
  }

  const transactionById = new Map(transactions.map(row => [String(row.id ?? ''), row]))
  for (const draft of await allDomainRecords<Record<string, unknown>>(repository, actor, 'transaction_drafts')) {
    if (draft.organizationId !== actor.organizationId || draft.state !== 'awaiting_approval') continue
    const transaction = transactionById.get(String(draft.transactionId ?? ''))
    if (!transaction || !Number.isSafeInteger(draft.version) || Number(draft.version) < 1) continue
    const orgSettings = await repository.getDomainRecord<Record<string, unknown>>(actor, 'platform_settings', 'brokerage:organization')
    const officeSettings = typeof transaction.officeId === 'string' && transaction.officeId
      ? await repository.getDomainRecord<Record<string, unknown>>(actor, 'platform_settings', `brokerage:${transaction.officeId}`) : null
    const designated = String((officeSettings?.data ?? orgSettings?.data ?? {}).documentOwners ?? '').split(',').map(value => value.trim()).filter(Boolean)
    const reviewers = reviewRecipients(users, designated).filter(user => user.id !== draft.ownerId)
    for (const reviewer of reviewers) await queue(reviewer.id, {
      idempotencyKey: `approval:transaction-draft:${String(draft.id)}:${String(draft.version)}:${reviewer.id}`,
      eventType: 'approval', title: 'A transaction draft needs review',
      body: 'An exact transaction draft version is awaiting approval in RCRE.',
      href: `/transactions?id=${encodeURIComponent(String(transaction.id ?? ''))}`, source: 'Transactions',
    }, 'approvals')
  }

  // Persisted marketing status "review" is the request-for-approval state.
  // Keep campaign copy and any associated lead data out of notification text.
  const campaigns = await allDomainRecords<Record<string, unknown>>(repository, actor, 'marketing_campaigns')
  const orgSettings = await repository.getDomainRecord<Record<string, unknown>>(actor, 'platform_settings', 'brokerage:organization')
  for (const campaign of campaigns) {
    if (campaign.organizationId !== actor.organizationId || campaign.status !== 'review') continue
    const officeSettings = typeof campaign.officeId === 'string' && campaign.officeId
      ? await repository.getDomainRecord<Record<string, unknown>>(actor, 'platform_settings', `brokerage:${campaign.officeId}`) : null
    const designated = String((officeSettings?.data ?? orgSettings?.data ?? {}).contentOwners ?? '').split(',').map(value => value.trim()).filter(Boolean)
    const reviewers = reviewRecipients(users, designated).filter(user => user.id !== campaign.ownerId)
    const version = Number(campaign.version) || 1
    for (const reviewer of reviewers) await queue(reviewer.id, {
      idempotencyKey: `approval:marketing:${String(campaign.id)}:${version}:${reviewer.id}`,
      eventType: 'approval', title: 'Marketing content needs review',
      body: 'A marketing item is awaiting review in RCRE.',
      href: `/marketing?content=${encodeURIComponent(String(campaign.id ?? ''))}`, source: 'Marketing',
    }, 'approvals')
  }
  return counts
}

function isInactiveAppointment(outcome: string | null): boolean {
  return Boolean(outcome && /^(canceled|cancelled|completed|held|missed|no show)$/i.test(outcome.trim()))
}
