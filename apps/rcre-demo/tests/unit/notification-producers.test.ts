import { afterEach, describe, expect, it } from 'vitest'
import { configureAuthPersistenceForTests, type AuthPersistence, type MemberSummary } from '@/lib/auth/persistence'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { notifyTrainingAssignment, enqueueNoticeForMemberId, enqueueScheduledOperationalNotices, enqueueMemberNotice } from '@/lib/services/notification-producers'
import { durableNotifications } from '@/lib/services/notifications-durable'

const org = '00000000-0000-4000-8000-000000000001'
const leader: PlatformActor = { id: '00000000-0000-4000-8000-000000000010', userId: '00000000-0000-4000-8000-000000000010', organizationId: org, role: 'broker_owner', name: 'Broker', market: 'All', teamId: 'all', officeId: 'all' }
const member = (userId: string, change: Partial<MemberSummary> = {}): MemberSummary => ({ userId, organizationId: org, canonicalPersonId: null, email: `${userId}@example.test`, name: 'Test Member', platformRole: 'agent', active: true, accountStatus: 'active', officeId: 'fl', teamId: 'fl', market: 'Florida', lastLoginAt: null, ...change })
const repository = () => new MemoryRepository(emptySeed())
afterEach(() => configureAuthPersistenceForTests(null))

describe('durable notification producers', () => {
  it('fans a training assignment out only to matching active, non-exempt members and is idempotent', async () => {
    const repo = repository()
    const florida = member('00000000-0000-4000-8000-000000000011')
    const alabama = member('00000000-0000-4000-8000-000000000012', { officeId: 'al', teamId: 'al', market: 'Alabama' })
    const inactive = member('00000000-0000-4000-8000-000000000013', { active: false })
    configureAuthPersistenceForTests({ listMembers: async () => [florida, alabama, inactive] } as unknown as AuthPersistence)
    const assignment = { id: 'assignment-42', organizationId: org, ownerId: leader.id, courseId: 'course-1', targetType: 'office', target: 'fl', due: '2026-10-15', exemptions: [] }
    const first = await notifyTrainingAssignment(leader, assignment, repo)
    const second = await notifyTrainingAssignment(leader, assignment, repo)
    expect(first).toEqual({ recipients: 1, queued: 1 })
    expect(second).toEqual({ recipients: 1, queued: 1 })
    const recipientActor = { userId: florida.userId, organizationId: org, role: 'agent' as const, officeId: 'fl' }
    const rows = await durableNotifications(repo).list(recipientActor)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ eventType: 'training_assignment', title: 'Training assigned', href: '/training', ownerUserId: florida.userId })
    expect(await durableNotifications(repo).list({ ...recipientActor, userId: alabama.userId })).toHaveLength(0)
  })

  it('resolves direct event recipients from the active organization roster before enqueuing', async () => {
    const repo = repository()
    const recipient = member('00000000-0000-4000-8000-000000000021')
    configureAuthPersistenceForTests({ listMembers: async () => [recipient] } as unknown as AuthPersistence)
    const queued = await enqueueNoticeForMemberId(leader, recipient.userId, {
      idempotencyKey: 'lead-assignment:lead-1:recipient-1', eventType: 'lead_assignment',
      title: 'A lead was assigned to you', source: 'CRM', href: '/crm/lead-1',
    }, repo)
    const unknown = await enqueueNoticeForMemberId(leader, '00000000-0000-4000-8000-000000000022', {
      idempotencyKey: 'lead-assignment:lead-1:unknown', eventType: 'lead_assignment',
      title: 'A lead was assigned to you', source: 'CRM', href: '/crm/lead-1',
    }, repo)
    expect(queued).toBe(true)
    expect(unknown).toBe(false)
    expect(await durableNotifications(repo).list({ userId: recipient.userId, organizationId: org, role: 'agent', officeId: 'fl' })).toHaveLength(1)
  })

  it('queues email only for explicitly enabled event preferences and never duplicates the email outbox row', async () => {
    const repo = repository()
    const recipient = member('00000000-0000-4000-8000-000000000041')
    const identity = { userId: recipient.userId, organizationId: org, role: 'agent' as const, officeId: 'fl' }
    const notifications = durableNotifications(repo)
    await notifications.updatePreferences(identity, { inAppEnabled: true, emailEnabled: true, eventTypes: { lead_assignment: true, appointment: false } })
    const input = { idempotencyKey: 'lead-assignment-email-test', eventType: 'lead_assignment' as const, title: 'A lead was assigned', source: 'CRM' }
    expect(await enqueueMemberNotice(recipient, input, repo)).toBe(true)
    expect(await enqueueMemberNotice(recipient, input, repo)).toBe(true)
    await enqueueMemberNotice(recipient, { ...input, idempotencyKey: 'appointment-email-test', eventType: 'appointment', title: 'An appointment is coming up' }, repo)
    const outbox = await notifications.listOutbox(identity, { limit: 20 })
    expect(outbox.filter(row => row.channel === 'email')).toHaveLength(1)
    expect(outbox.find(row => row.channel === 'email')?.eventType).toBe('lead_assignment')
  })

  it('rejects assignment notifications that do not belong to the authenticated organization or author', async () => {
    configureAuthPersistenceForTests({ listMembers: async () => [] } as unknown as AuthPersistence)
    await expect(notifyTrainingAssignment(leader, { id: 'x', organizationId: 'other-org', ownerId: leader.id, courseId: 'c', targetType: 'all', target: '', due: '2026-10-15' }, repository())).rejects.toThrow(/scope mismatch/)
  })


  it('schedules tenant-scoped task, appointment, transaction deadline and approval notices idempotently without source details', async () => {
    const seed = emptySeed()
    seed.organizations.push({ id: org, name: 'RCRE', slug: 'rcre' })
    seed.users.push(
      { id: leader.id, organizationId: org, email: 'broker@example.test', fullName: 'Broker', role: 'broker', fubUserId: null, isActive: true },
      { id: '00000000-0000-4000-8000-000000000031', organizationId: org, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true, officeId: 'fl' },
      { id: '00000000-0000-4000-8000-000000000032', organizationId: org, email: 'tc@example.test', fullName: 'Coordinator', role: 'transaction_coordinator', fubUserId: null, isActive: true, officeId: 'fl' },
    )
    seed.tasks.push({ id: 'task-1', organizationId: org, personId: null, assignedUserId: '00000000-0000-4000-8000-000000000031', fubTaskId: null, title: 'Private task title', dueAt: '2026-09-29T10:00:00.000Z', isCompleted: false })
    seed.tasks.push({ id: 'task-complete', organizationId: org, personId: null, assignedUserId: '00000000-0000-4000-8000-000000000031', fubTaskId: null, title: 'Completed', dueAt: '2026-09-29T10:00:00.000Z', isCompleted: true })
    seed.appointments.push({ id: 'appointment-1', organizationId: org, personId: null, assignedUserId: '00000000-0000-4000-8000-000000000031', fubAppointmentId: null, title: 'Private appointment title', startsAt: '2026-09-30T13:00:00.000Z', endsAt: '2026-09-30T14:00:00.000Z', location: 'Private address', outcome: null })
    seed.appointments.push({ id: 'appointment-canceled', organizationId: org, personId: null, assignedUserId: '00000000-0000-4000-8000-000000000031', fubAppointmentId: null, title: 'Canceled', startsAt: '2026-09-30T13:00:00.000Z', endsAt: '2026-09-30T14:00:00.000Z', location: null, outcome: 'canceled' })
    const repo = new MemoryRepository(seed)
    const now = new Date('2026-09-30T12:00:00.000Z')
    await repo.putTransactionDomainRecord({ ...leader, role: 'broker' }, {
      collection: 'transactions', recordId: 'tx-1', ownerUserId: '00000000-0000-4000-8000-000000000031', createOnly: true,
      data: { id: 'tx-1', organizationId: org, ownerId: '00000000-0000-4000-8000-000000000031', tcId: '00000000-0000-4000-8000-000000000032', teamId: 'fl', officeId: 'fl', status: 'active', closingDate: '2026-09-30', address: 'Private street address', client: 'Private customer name', version: 1, deadlines: [], checklist: [], comments: [], updatedAt: now.toISOString() },
    })
    await repo.putTransactionDomainRecord({ ...leader, role: 'broker' }, {
      collection: 'transaction_drafts', recordId: 'draft-1', ownerUserId: '00000000-0000-4000-8000-000000000031', createOnly: true,
      data: { id: 'draft-1', transactionId: 'tx-1', organizationId: org, ownerId: '00000000-0000-4000-8000-000000000031', tcId: '00000000-0000-4000-8000-000000000032', teamId: 'fl', state: 'awaiting_approval', version: 2, body: 'Private draft body' },
    })
    await repo.putDomainRecord({ ...leader, role: 'broker' }, {
      collection: 'marketing_campaigns', recordId: 'campaign-1', ownerUserId: '00000000-0000-4000-8000-000000000031', createOnly: true,
      data: { id: 'campaign-1', organizationId: org, ownerId: '00000000-0000-4000-8000-000000000031', officeId: 'fl', status: 'review', version: 4, title: 'Private campaign content', body: 'Private draft copy' },
    })
    const preferences = durableNotifications(repo)
    await preferences.updatePreferences({ ...leader, userId: '00000000-0000-4000-8000-000000000031', role: 'agent' }, {
      inAppEnabled: true, emailEnabled: true, eventTypes: { overdue_task: true, appointment: false, transaction_deadline: false, approval: false },
    })

    const first = await enqueueScheduledOperationalNotices({ ...leader, role: 'broker' }, repo, now)
    expect(first).toEqual({ tasks: 1, appointments: 1, transactionDeadlines: 2, approvals: 2 })
    const second = await enqueueScheduledOperationalNotices({ ...leader, role: 'broker' }, repo, now)
    expect(second).toEqual({ tasks: 0, appointments: 0, transactionDeadlines: 0, approvals: 0 })

    const inbox = await preferences.list({ ...leader, role: 'broker' }, { limit: 50 })
    expect(inbox).toHaveLength(7)
    expect(inbox.map(row => row.title)).toContain('A CRM task needs attention')
    expect(inbox.map(row => row.title)).toContain('A transaction deadline is due')
    expect(inbox.map(row => row.title)).toContain('A transaction draft needs review')
    expect(inbox.map(row => row.title)).toContain('Marketing content needs review')
    expect(inbox.map(row => row.body ?? '').join(' ')).not.toContain('Private')
    expect(inbox.map(row => row.body ?? '').join(' ')).not.toContain('street address')
    expect(inbox.map(row => row.body ?? '').join(' ')).not.toContain('customer name')

    const email = await preferences.listOutbox({ ...leader, role: 'broker' }, { limit: 50 })
    expect(email.filter(row => row.channel === 'email')).toHaveLength(1)
    expect(email.some(row => row.channel === 'email' && row.eventType === 'overdue_task')).toBe(true)
  })

  it('refuses to run the brokerage-wide scheduler under a non-broker actor', async () => {
    await expect(enqueueScheduledOperationalNotices({ ...leader, role: 'agent' }, repository(), new Date()))
      .rejects.toThrow(/worker scope required/)
  })
})
