import { describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { persistIntakeDurable } from '@/lib/public/intake'
import { durableNotifications } from '@/lib/services/notifications-durable'

const org = '10000000-0000-4000-8000-000000000001'
const agentId = '20000000-0000-4000-8000-000000000001'
const brokerId = '20000000-0000-4000-8000-000000000002'
const agentActor = { userId: agentId, organizationId: org, role: 'agent' as const }
const brokerActor = { userId: brokerId, organizationId: org, role: 'broker' as const }

function repository() {
  const seed = emptySeed()
  seed.organizations.push({ id: org, name: 'RCRE', slug: 'rcre' })
  seed.users.push({ id: agentId, organizationId: org, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true })
  seed.users.push({ id: brokerId, organizationId: org, email: 'broker@example.test', fullName: 'Broker', role: 'broker', fubUserId: null, isActive: true })
  return new MemoryRepository(seed)
}

const input = {
  submissionId: 'd4aeb81b-07a0-4f66-b918-c89cbdf5e942', kind: 'buyer', name: 'Demo Client',
  email: 'client@example.test', market: 'Florida', agentSlug: 'molly-homes', consent: true,
}

async function seedPublishedAgentSite(repo: MemoryRepository) {
  await repo.putDomainRecord(brokerActor, { collection: 'member_profiles', recordId: agentId, ownerUserId: agentId,
    data: { officeId: 'fl', market: 'Florida', role: 'agent', verifiedPersonId: 'molly-plude', websiteSlug: 'molly-homes', publicVisible: true } })
  await repo.putDomainRecord(brokerActor, { collection: 'agent_websites', recordId: agentId, ownerUserId: agentId,
    data: { slug: 'molly-homes', published: true } })
}

describe('public lead notification outbox', () => {
  it('atomically creates the portal inbox item and compatible retryable outbox row', async () => {
    const repo = repository()
    await seedPublishedAgentSite(repo)

    const saved = await persistIntakeDurable(input, repo, brokerActor)
    const inbox = await repo.listDomainRecords<Record<string, any>>(agentActor, 'notification_inbox')
    const outbox = await durableNotifications(repo).listOutbox(agentActor)

    expect(inbox).toHaveLength(1)
    expect(inbox[0].data).toMatchObject({
      organizationId: org, ownerUserId: agentId, eventType: 'website_lead', channel: 'in_app',
      title: 'New website lead received', deliveryState: 'queued', readAt: null,
      href: `/crm/${saved.contactId}`, source: 'RCRE',
    })
    expect(outbox).toHaveLength(1)
    expect(outbox[0]).toMatchObject({
      organizationId: org, ownerUserId: agentId, notificationId: inbox[0].recordId,
      eventType: 'website_lead', channel: 'in_app', state: 'queued', attempts: 0,
      maxAttempts: 5, lastFailureCode: null, providerReceipt: null,
    })
    expect(JSON.stringify([inbox, outbox])).not.toContain('client@example.test')

    const key = `website-lead:${saved.id}`
    const duplicate = await durableNotifications(repo).enqueue(brokerActor, {
      idempotencyKey: key, eventType: 'website_lead', channel: 'in_app',
      title: 'New website lead received', href: `/crm/${saved.contactId}`, source: 'RCRE',
    }, { recipientUserId: agentId })
    expect(duplicate.duplicate).toBe(true)
    expect(duplicate.outbox.id).toBe(outbox[0].id)
  })

  it('honors the existing personal Settings toggle when no separate preference row exists', async () => {
    const repo = repository()
    await seedPublishedAgentSite(repo)
    await repo.putDomainRecord(brokerActor, { collection: 'platform_settings', recordId: `personal:${agentId}`, ownerUserId: agentId,
      data: { inAppNotifications: false } })

    await persistIntakeDurable({ ...input, submissionId: '27b4f9a0-4c18-4304-a3f3-306d9bb9854c' }, repo, brokerActor)
    const inbox = await repo.listDomainRecords<Record<string, any>>(agentActor, 'notification_inbox')
    const outbox = await durableNotifications(repo).listOutbox(agentActor)
    expect(inbox[0].data.deliveryState).toBe('suppressed')
    expect(outbox[0].state).toBe('suppressed')
  })

  it('suppresses both inbox and outbox consistently with recipient preferences', async () => {
    const repo = repository()
    await seedPublishedAgentSite(repo)
    await repo.putDomainRecord(brokerActor, { collection: 'notification_preferences', recordId: agentId, ownerUserId: agentId,
      data: { inAppEnabled: false, emailEnabled: false, eventTypes: {} } })

    await persistIntakeDurable({ ...input, submissionId: '10957762-9afe-43f4-a10e-8633177ca008' }, repo, brokerActor)
    const inbox = await repo.listDomainRecords<Record<string, any>>(agentActor, 'notification_inbox')
    const outbox = await durableNotifications(repo).listOutbox(agentActor)
    expect(inbox[0].data.deliveryState).toBe('suppressed')
    expect(outbox[0].state).toBe('suppressed')
  })
})
