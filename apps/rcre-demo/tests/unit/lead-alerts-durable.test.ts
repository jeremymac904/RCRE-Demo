import { describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { generateLeadAlertsDurable } from '@/lib/platform/lead-alerts-durable'
import type { PlatformActor } from '@/lib/platform/auth'
import type { MemberSummary } from '@/lib/auth/persistence'

const org = '22222222-2222-4222-8222-222222222222'
const ownerId = '11111111-1111-4111-8111-111111111111'
const actor: PlatformActor = { id: ownerId, userId: ownerId, organizationId: org, role: 'broker_owner', name: 'Broker', market: 'Florida', officeId: 'all', teamId: 'all' }
const owner: MemberSummary = { userId: ownerId, organizationId: org, canonicalPersonId: null, email: 'broker@example.test', name: 'Broker', platformRole: 'broker_owner', active: true, accountStatus: 'active', officeId: 'all', teamId: 'all', market: 'Both markets', lastLoginAt: null }

function setup() {
  const repository = new MemoryRepository(emptySeed())
  const scope = { userId: ownerId, organizationId: org, role: 'owner' as const }
  return { repository, scope }
}

describe('durable CRM lead alerts', () => {
  it('records idempotent in-app alerts from persisted priorities without sending email', async () => {
    const { repository, scope } = setup()
    await repository.putDomainRecord(scope, { collection: 'platform_settings', recordId: 'leads:organization', ownerUserId: ownerId, data: { enabled: true, alertRecipient: ownerId, escalationMinutes: 0 } })
    await repository.putDomainRecord(scope, { collection: 'crm_contacts', recordId: 'lead-1', ownerUserId: ownerId, data: { id: 'lead-1', organizationId: org, officeId: 'fl', ownerId, firstName: 'Taylor', lastName: 'Example', source: 'Referral', stage: 'New Lead', receivedAt: new Date().toISOString(), version: 1 } })
    await repository.putDomainRecord(scope, { collection: 'crm_tasks', recordId: 'task-1', ownerUserId: ownerId, data: { id: 'task-1', organizationId: org, officeId: 'fl', ownerId, contactId: 'lead-1', title: 'Call Taylor', dueAt: new Date(Date.now() - 60_000).toISOString(), done: false, version: 1 } })

    const dependencies = { repository, listMembers: async () => [owner] }
    const first = await generateLeadAlertsDurable(actor, dependencies)
    const second = await generateLeadAlertsDurable(actor, dependencies)

    expect(first.created).toBe(2)
    expect(first.suppressed).toBe(0)
    expect(second.created).toBe(0)
    expect((await repository.listDomainRecords(scope, 'notification_inbox', { limit: 20 })).map(row => row.data.eventType).sort()).toEqual(['new_lead', 'overdue_task'])
    expect((await repository.listDomainRecords(scope, 'notification_outbox', { limit: 20 })).every(row => row.data.channel === 'in_app')).toBe(true)
  })

  it('does not create alerts when the persisted policy is paused', async () => {
    const { repository, scope } = setup()
    await repository.putDomainRecord(scope, { collection: 'platform_settings', recordId: 'leads:organization', ownerUserId: ownerId, data: { enabled: false } })
    const result = await generateLeadAlertsDurable(actor, { repository, listMembers: async () => [owner] })
    expect(result).toMatchObject({ created: 0, suppressed: 0 })
    expect(await repository.listDomainRecords(scope, 'notification_inbox', { limit: 20 })).toEqual([])
  })

  it('rejects an inactive or out-of-scope alert recipient', async () => {
    const { repository, scope } = setup()
    await repository.putDomainRecord(scope, { collection: 'platform_settings', recordId: 'leads:organization', ownerUserId: ownerId, data: { enabled: true, alertRecipient: '33333333-3333-4333-8333-333333333333' } })
    await expect(generateLeadAlertsDurable(actor, { repository, listMembers: async () => [owner] })).rejects.toThrow(/recipient is inactive or outside/i)
  })
})
