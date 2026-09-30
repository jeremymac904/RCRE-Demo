import { describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { listCrmPrioritiesDurable } from '@/lib/platform/crm-durable'
import type { PlatformActor } from '@/lib/platform/auth'

const ownerId = '00000000-0000-4000-8000-000000000001'
const orgId = '00000000-0000-4000-8000-000000000099'
const actor: PlatformActor = { id: ownerId, userId: ownerId, organizationId: orgId, role: 'broker_owner', name: 'Broker', market: 'Florida', officeId: 'fl', teamId: 'fl' }

describe('durable CRM attention queue', () => {
  it('derives reasons from persisted overdue tasks and recent received time only', async () => {
    const repo = new MemoryRepository(emptySeed())
    const contact = { id: 'lead-1', organizationId: orgId, officeId: 'fl', ownerId, version: 1, firstName: 'Casey', lastName: 'Sample', email: '', phone: '', source: 'Referral', stage: 'New Lead', receivedAt: new Date().toISOString(), timeline: [] }
    await repo.putDomainRecord({ userId: ownerId, organizationId: orgId, role: 'owner' }, { collection: 'crm_contacts', recordId: contact.id, ownerUserId: ownerId, data: contact })
    await repo.putDomainRecord({ userId: ownerId, organizationId: orgId, role: 'owner' }, { collection: 'crm_tasks', recordId: 'task-1', ownerUserId: ownerId, data: { id: 'task-1', organizationId: orgId, officeId: 'fl', ownerId, contactId: contact.id, title: 'Call Casey', dueAt: new Date(Date.now() - 60_000).toISOString(), done: false, version: 1 } })
    const queue = await listCrmPrioritiesDurable(actor, repo)
    expect(queue).toHaveLength(1)
    expect(queue[0].reasons).toContain('Task overdue: Call Casey')
    expect(queue[0].reasons).toContain('New lead received within the last 24 hours')
  })
})
