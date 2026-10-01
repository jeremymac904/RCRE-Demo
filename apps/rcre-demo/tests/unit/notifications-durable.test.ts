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

  it('requires a live worker claim and provider transport before recording acceptance', async () => {
    const seed = emptySeed()
    seed.organizations.push({ id: agent.organizationId, name: 'RCRE', slug: 'rcre' })
    seed.users.push({ id: agent.userId, organizationId: agent.organizationId, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true })
    repository = new MemoryRepository(seed)
    service = new DurableNotificationService(repository, () => new Date(clock))
    await service.updatePreferences(agent, { inAppEnabled: true, emailEnabled: true, eventTypes: {} })
    const saved = await service.enqueue(agent, { ...event, channel: 'email' })
    await expect(service.recordProviderAccepted(agent, saved.outbox.id, 'unverified-provider-job'))
      .rejects.toThrow(/delivery claim is stale/i)
    const transport = { send: async () => ({ providerMessageId: 'provider-job-123' }) }
    const processed = await service.processEmailBatch(agent, transport)
    expect(processed).toMatchObject({ processed: 1, accepted: 1 })
    const accepted = (await service.listOutbox(agent)).find(row => row.id === saved.outbox.id)!
    expect(accepted.state).toBe('accepted_by_provider')
    expect(accepted.providerReceipt).toBe('provider-job-123')
    expect(accepted.state).not.toBe('delivered')
  })



  it('claims email once with an expiring lease and rejects a stale worker receipt', async () => {
    const seed = emptySeed()
    seed.organizations.push({ id: agent.organizationId, name: 'RCRE', slug: 'rcre' })
    seed.users.push({ id: agent.userId, organizationId: agent.organizationId, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true })
    repository = new MemoryRepository(seed)
    service = new DurableNotificationService(repository, () => new Date(clock))
    await service.updatePreferences(agent, { inAppEnabled: true, emailEnabled: true, eventTypes: {} })
    const saved = await service.enqueue(agent, { ...event, channel: 'email' })
    const [first, competing] = await Promise.all([service.claimEmailOutbox(agent), service.claimEmailOutbox(agent)])
    expect(first).toHaveLength(1)
    expect(competing).toHaveLength(0)
    expect(first[0].outbox.state).toBe('sending')
    expect(first[0].outbox.attempts).toBe(1)
    clock = new Date(clock.getTime() + 121_000)
    const recovered = await service.claimEmailOutbox(agent)
    expect(recovered).toHaveLength(1)
    expect(recovered[0].outbox.attempts).toBe(2)
    expect(recovered[0].claimToken).not.toBe(first[0].claimToken)
    await expect(service.recordProviderAccepted(agent, saved.outbox.id, 'stale-receipt', first[0].claimToken)).rejects.toThrow(/stale/i)
  })

  it('processes due email through an injected mock transport with stable idempotency and honest receipt state', async () => {
    const seed = emptySeed()
    seed.organizations.push({ id: agent.organizationId, name: 'RCRE', slug: 'rcre' })
    seed.users.push({ id: agent.userId, organizationId: agent.organizationId, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true })
    repository = new MemoryRepository(seed)
    service = new DurableNotificationService(repository, () => new Date(clock))
    await service.updatePreferences(agent, { inAppEnabled: true, emailEnabled: true, eventTypes: {} })
    const saved = await service.enqueue(agent, { ...event, channel: 'email', href: '/crm?lead=42' })
    const sent: Array<{ to: string; subject: string; text: string; html?: string; idempotencyKey: string }> = []
    const transport = { send: async (message: typeof sent[number]) => { sent.push(message); return { providerMessageId: 'mock-receipt-1' } } }
    const result = await service.processEmailBatch(agent, transport)
    expect(result).toEqual({ processed: 1, accepted: 1, retried: 0, failed: 0, receiptPending: 0 })
    expect(sent[0].to).toBe('agent@example.test')
    expect(sent[0].idempotencyKey).toBe(`rcre-notification:${saved.outbox.id}`)
    expect(sent[0].html).not.toContain('rcre.example')
    expect(sent[0].html).not.toContain('Open RCRE')
    const outbox = await service.listOutbox(agent)
    expect(outbox[0]).toMatchObject({ state: 'accepted_by_provider', providerReceipt: 'mock-receipt-1', attempts: 1, claimToken: null, leaseUntil: null })
    expect(JSON.stringify(result)).not.toContain('agent@example.test')
  })

  it('schedules a safe retry after a provider error, then completes with provider acceptance', async () => {
    const seed = emptySeed()
    seed.organizations.push({ id: agent.organizationId, name: 'RCRE', slug: 'rcre' })
    seed.users.push({ id: agent.userId, organizationId: agent.organizationId, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true })
    repository = new MemoryRepository(seed)
    service = new DurableNotificationService(repository, () => new Date(clock))
    await service.updatePreferences(agent, { inAppEnabled: true, emailEnabled: true, eventTypes: {} })
    const saved = await service.enqueue(agent, { ...event, channel: 'email' })
    const failing = { send: async () => { throw Object.assign(new Error('private provider response text'), { code: 'smtp_timeout' }) } }
    expect(await service.processEmailBatch(agent, failing)).toEqual({ processed: 1, accepted: 0, retried: 1, failed: 0, receiptPending: 0 })
    let outbox = (await service.listOutbox(agent))[0]
    expect(outbox).toMatchObject({ state: 'retry_wait', attempts: 1, lastFailureCode: 'smtp_timeout', providerReceipt: null })
    expect(JSON.stringify(outbox)).not.toContain('private provider response text')
    clock = new Date(Date.parse(outbox.nextAttemptAt) + 1)
    const recovered = { send: async () => ({ providerMessageId: 'mock-receipt-retry' }) }
    expect(await service.processEmailBatch(agent, recovered)).toEqual({ processed: 1, accepted: 1, retried: 0, failed: 0, receiptPending: 0 })
    outbox = (await service.listOutbox(agent))[0]
    expect(outbox).toMatchObject({ state: 'accepted_by_provider', attempts: 2, providerReceipt: 'mock-receipt-retry' })
    expect(saved.outbox.id).toBe(outbox.id)
  })

  it('suppresses queued email if preferences are disabled before a delivery claim', async () => {
    const seed = emptySeed()
    seed.organizations.push({ id: agent.organizationId, name: 'RCRE', slug: 'rcre' })
    seed.users.push({ id: agent.userId, organizationId: agent.organizationId, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true })
    repository = new MemoryRepository(seed)
    service = new DurableNotificationService(repository, () => new Date(clock))
    await service.updatePreferences(agent, { inAppEnabled: true, emailEnabled: true, eventTypes: {} })
    const saved = await service.enqueue(agent, { ...event, channel: 'email' })
    await service.updatePreferences(agent, { inAppEnabled: true, emailEnabled: false, eventTypes: {} })
    expect(await service.claimEmailOutbox(agent)).toEqual([])
    expect((await service.listOutbox(agent))[0].state).toBe('suppressed')
    expect((await service.list(agent))[0].deliveryState).toBe('suppressed')
    expect(saved.outbox.id).toBe((await service.listOutbox(agent))[0].id)
  })

  it('allows brokerage administrators to manage another user but blocks agent escalation', async () => {
    await expect(service.enqueue(agent, event, { recipientUserId: other.userId })).rejects.toThrow(/administrators/i)
    const queued = await service.enqueue(owner, { ...event, idempotencyKey: 'admin:lead-assignment:v1' }, { recipientUserId: other.userId })
    expect(queued.notification.ownerUserId).toBe(other.userId)
    expect((await service.list(other))).toHaveLength(1)
    expect((await service.listOutbox(owner)).map(row => row.id)).toContain(queued.outbox.id)
  })
})
