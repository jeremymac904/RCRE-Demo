import { describe, expect, it, vi } from 'vitest'
import { emptySeed, MemoryRepository, type Actor } from '@/lib/db/repository'
import { DevelopmentMailCapture } from '@/lib/auth/mail'
import { DurableNotificationService } from '@/lib/services/notifications-durable'
import { handleDurableNotificationJob } from '@/lib/services/notification-job'

const organizationId = '22222222-2222-4222-8222-222222222222'
const worker: Actor = { userId: '11111111-1111-4111-8111-111111111111', organizationId, role: 'broker' }
const agent: Actor = { userId: '33333333-3333-4333-8333-333333333333', organizationId, role: 'agent' }
const config = { secret: 'a'.repeat(48), organizationId, workerUserId: worker.userId }
const request = (authorization = `Bearer ${config.secret}`, suffix = '') => new Request(`https://rcre.example/api/internal/jobs/notifications${suffix}`, { method: 'POST', headers: { authorization } })

function repositoryWithMembers() {
  const seed = emptySeed()
  seed.organizations.push({ id: organizationId, name: 'RCRE', slug: 'rcre' })
  seed.users.push(
    { id: worker.userId, organizationId, email: 'worker@example.test', fullName: 'Notification Worker', role: 'broker', fubUserId: null, isActive: true },
    { id: agent.userId, organizationId, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true },
  )
  return new MemoryRepository(seed)
}

describe('durable notification job route', () => {
  it('rejects unauthenticated calls before touching repository or transport', async () => {
    const getRepository = vi.fn(async () => repositoryWithMembers())
    const getTransport = vi.fn(() => new DevelopmentMailCapture())
    const response = await handleDurableNotificationJob(request('Bearer wrong'), { config, getRepository, getTransport })
    expect(response.status).toBe(404)
    expect(getRepository).not.toHaveBeenCalled()
    expect(getTransport).not.toHaveBeenCalled()
  })

  it('still schedules durable reminders when mail delivery is not configured', async () => {
    const getRepository = vi.fn(async () => repositoryWithMembers())
    const produceScheduledNotices = vi.fn(async () => ({ tasks: 1, appointments: 0, transactionDeadlines: 0, approvals: 0 }))
    const response = await handleDurableNotificationJob(request(), { config, getRepository, getTransport: () => null, produceScheduledNotices })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ state: 'waiting_for_mail_configuration', scheduled: { tasks: 1, appointments: 0, transactionDeadlines: 0, approvals: 0 } })
    expect(getRepository).toHaveBeenCalledOnce()
    expect(produceScheduledNotices).toHaveBeenCalledOnce()
  })

  it('uses only the mock transport and enforces the bounded batch limit', async () => {
    const repository = repositoryWithMembers()
    const service = new DurableNotificationService(repository)
    await service.updatePreferences(agent, { inAppEnabled: true, emailEnabled: true, eventTypes: {} })
    await service.enqueue(worker, {
      idempotencyKey: 'worker-test-notification-01', eventType: 'lead_assignment', channel: 'email',
      title: 'Synthetic lead assignment', body: 'This is an integration test.', source: 'RCRE test',
    }, { recipientUserId: agent.userId })
    const transport = new DevelopmentMailCapture()
    const response = await handleDurableNotificationJob(request(undefined, '?limit=2'), {
      config, getRepository: async () => repository, getTransport: () => transport,
      produceScheduledNotices: async () => ({ tasks: 0, appointments: 0, transactionDeadlines: 0, approvals: 0 }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ state: 'processed', processed: 1, accepted: 1 })
    expect(transport.messages).toHaveLength(1)
    expect(transport.messages[0].to).toBe('agent@example.test')
    const invalid = await handleDurableNotificationJob(request(undefined, '?limit=51'), {
      config, getRepository: async () => repository, getTransport: () => transport,
    })
    expect(invalid.status).toBe(400)
  })

  it('requires an active persisted brokerage worker identity', async () => {
    const repository = repositoryWithMembers()
    const response = await handleDurableNotificationJob(request(), {
      config: { ...config, workerUserId: agent.userId }, getRepository: async () => repository,
      getTransport: () => new DevelopmentMailCapture(),
    })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ state: 'waiting_for_worker_configuration' })
  })
})
