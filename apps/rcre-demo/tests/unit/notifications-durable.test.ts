import { beforeEach, describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository, type Actor } from '@/lib/db/repository'
import { DurableNotificationService } from '@/lib/services/notifications-durable'

const agent: Actor = { userId: '11111111-1111-4111-8111-111111111111', organizationId: '22222222-2222-4222-8222-222222222222', role: 'agent' }
const other: Actor = { ...agent, userId: '33333333-3333-4333-8333-333333333333' }
const owner: Actor = { ...agent, role: 'owner' }
let repository: MemoryRepository
let service: DurableNotificationService
let clock: Date

beforeEach(() => {
  repository = new MemoryRepository(emptySeed())
  clock = new Date('2026-09-30T15:00:00.000Z')
  service = new DurableNotificationService(repository, () => new Date(clock))
})

const event = { idempotencyKey: 'lead:lead-42:assigned:v1', eventType: 'lead_assignment' as const, title: 'A lead was assigned', body: 'Review the new lead.', href: '/crm/lead-42' }

describe('durable notifications', () => {
  it('persists an inbox record and a separate outbox item idempotently', async () => {
    const first = await service.enqueue(agent, event)
    const second = await service.enqueue(agent, event)
    expect(first.duplicate).toBe(false)
    expect(second.duplicate).toBe(true)
    expect(second.notification.id).toBe(first.notification.id)
    expect((await service.list(agent))).toHaveLength(1)
    expect(first.outbox.state).toBe('queued')
    expect(first.outbox.attempts).toBe(0)
    expect(first.outbox.providerReceipt).toBeNull()
    const audit = await repository.listAudit(owner, 10)
    expect(audit.filter(row => row.action === 'notification.queued')).toHaveLength(1)
  })

  it('isolates notification lists by owner and organization', async () => {
    const first = await service.enqueue(agent, event)
    const second = await service.enqueue(other, { ...event, idempotencyKey: 'lead:lead-43:assigned:v1' })
    expect((await service.list(agent)).map(row => row.id)).toEqual([first.notification.id])
    expect((await service.list(other)).map(row => row.id)).toEqual([second.notification.id])
    expect(await service.list({ ...other, organizationId: '44444444-4444-4444-8444-444444444444' })).toEqual([])
  })

  it('saves user preferences and suppresses disabled channels without claiming delivery', async () => {
    const preferences = await service.updatePreferences(agent, { inAppEnabled: false, emailEnabled: true, eventTypes: { overdue_task: false } })
    expect(preferences.inAppEnabled).toBe(false)
    const inApp = await service.enqueue(agent, { ...event, idempotencyKey: 'lead:lead-44:assigned:v1' })
    expect(inApp.notification.deliveryState).toBe('suppressed')
    expect(inApp.outbox.state).toBe('suppressed')
    const email = await service.enqueue(agent, { ...event, idempotencyKey: 'lead:lead-44:email:v1', channel: 'email' })
    expect(email.outbox.state).toBe('queued')
    expect(email.outbox.state).not.toBe('accepted_by_provider')
  })

  it('honors the existing durable personal notification setting', async () => {
    await repository.putDomainRecord(agent, {
      collection: 'platform_settings', recordId: `personal:${agent.userId}`, ownerUserId: agent.userId,
      data: { inAppNotifications: false },
    })
    const queued = await service.enqueue(agent, { ...event, idempotencyKey: 'settings-disabled:v1' })
    expect(queued.notification.deliveryState).toBe('suppressed')
    expect(queued.outbox.state).toBe('suppressed')
  })

  it('applies a recipient preference when brokerage leadership queues for them', async () => {
    await service.updatePreferences(other, { inAppEnabled: false, emailEnabled: false, eventTypes: {} })
    const queued = await service.enqueue(owner, { ...event, idempotencyKey: 'admin:other:v1' }, { recipientUserId: other.userId })
    expect(queued.notification.deliveryState).toBe('suppressed')
    expect(queued.outbox.state).toBe('suppressed')
  })

  it('marks only the owner notification read, idempotently', async () => {
    const saved = await service.enqueue(agent, event)
    await expect(service.markRead(other, saved.notification.id)).rejects.toThrow(/unavailable/i)
    const read = await service.markRead(agent, saved.notification.id)
    expect(read.readAt).toBe(clock.toISOString())
    expect(await service.markRead(agent, saved.notification.id)).toEqual(read)
    expect((await service.list(agent, { unreadOnly: true }))).toHaveLength(0)
  })

  it('records retry state and capped failures without raw error text', async () => {
    const saved = await service.enqueue(agent, event, { maxAttempts: 2 })
    const retry = await service.recordFailure(agent, saved.outbox.id, 'smtp_timeout')
    expect(retry.state).toBe('retry_wait')
    expect(retry.attempts).toBe(1)
    expect(retry.lastFailureCode).toBe('smtp_timeout')
    clock = new Date('2026-09-30T15:02:00.000Z')
    const failed = await service.recordFailure(agent, saved.outbox.id, 'smtp_rejected')
    expect(failed.state).toBe('failed')
    expect(failed.attempts).toBe(2)
    expect(failed.lastFailureCode).toBe('smtp_rejected')
    expect(JSON.stringify(failed)).not.toContain('raw')
  })

  it('records provider acceptance without claiming delivery', async () => {
    const saved = await service.enqueue(agent, { ...event, channel: 'email' })
    const accepted = await service.recordProviderAccepted(agent, saved.outbox.id, 'provider-job-123')
    expect(accepted.state).toBe('accepted_by_provider')
    expect(accepted.providerReceipt).toBe('provider-job-123')
    expect(accepted.state).not.toBe('delivered')
  })

  it('allows brokerage administrators to manage another user but blocks agent escalation', async () => {
    await expect(service.enqueue(agent, event, { recipientUserId: other.userId })).rejects.toThrow(/administrators/i)
    const queued = await service.enqueue(owner, { ...event, idempotencyKey: 'admin:lead-assignment:v1' }, { recipientUserId: other.userId })
    expect(queued.notification.ownerUserId).toBe(other.userId)
    expect((await service.list(other))).toHaveLength(1)
    expect((await service.listOutbox(owner)).map(row => row.id)).toContain(queued.outbox.id)
  })
})
