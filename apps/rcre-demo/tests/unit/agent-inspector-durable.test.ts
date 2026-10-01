import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRepository, emptySeed, type Actor as RepositoryActor, type MemorySeed } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { AccessError } from '@/lib/platform/auth'
import { inspectAgentsDurable } from '@/lib/services/agent-inspector-durable'

const org = '10000000-0000-4000-8000-000000000001'
const brokerId = '10000000-0000-4000-8000-000000000002'
const managerId = '10000000-0000-4000-8000-000000000003'
const alAgentId = '10000000-0000-4000-8000-000000000004'
const flAgentId = '10000000-0000-4000-8000-000000000005'
const otherOrg = '20000000-0000-4000-8000-000000000001'
const otherAgentId = '20000000-0000-4000-8000-000000000002'
const now = Date.parse('2026-09-30T16:00:00.000Z')

const user = (id: string, organizationId: string, role: 'owner' | 'managing_broker' | 'agent', officeId: string) => ({
  id, organizationId, email: `${id}@example.test`, fullName: `Name ${id.slice(-1)}`, role,
  fubUserId: null, isActive: true, officeId,
})

function actor(role: 'broker_owner' | 'managing_broker', id: string, officeId: string): PlatformActor {
  return { id, userId: id, organizationId: org, role, name: `Leader ${id.slice(-1)}`, market: officeId, officeId, teamId: officeId }
}

function makeRepository() {
  const seed = emptySeed() as MemorySeed
  seed.organizations.push({ id: org, name: 'RCRE', slug: 'rcre' }, { id: otherOrg, name: 'Other', slug: 'other' })
  seed.users.push(
    user(brokerId, org, 'owner', 'all'),
    user(managerId, org, 'managing_broker', 'al'),
    user(alAgentId, org, 'agent', 'al'),
    user(flAgentId, org, 'agent', 'fl'),
    user(otherAgentId, otherOrg, 'agent', 'al'),
  )
  return new MemoryRepository(seed)
}

async function put(repo: MemoryRepository, repositoryActor: RepositoryActor, collection: string, id: string, ownerId: string, data: Record<string, unknown>) {
  await repo.putDomainRecord(repositoryActor, { collection, recordId: id, ownerUserId: ownerId, data })
}

const contact = (id: string, ownerId: string, officeId: string, overrides: Record<string, unknown> = {}) => ({
  id, organizationId: org, ownerId, officeId, version: 1, firstName: 'Lead', lastName: id, initials: 'L',
  stage: 'New Lead', source: 'Facebook', email: '', phone: '', location: officeId, receivedAt: '2026-09-29T10:00:00.000Z',
  stageEnteredAt: null, firstTouchAt: null, lastTouchAt: null, lastInboundAt: null, lastOutboundAt: null,
  timeline: [], priority: null, reasons: [], tags: [], ...overrides,
})

describe('durable leadership agent inspection', () => {
  let repo: MemoryRepository
  beforeEach(() => { repo = makeRepository() })

  it('projects scoped durable CRM lead, task, appointment, deal and timeline evidence without inventing cadence', async () => {
    const writeActor: RepositoryActor = { userId: brokerId, organizationId: org, role: 'owner' }
    const callAt = '2026-09-29T12:00:00.000Z'
    await put(repo, writeActor, 'crm_contacts', 'lead-1', alAgentId, contact('lead-1', alAgentId, 'al', {
      firstTouchAt: callAt, lastOutboundAt: callAt,
      timeline: [{ at: callAt, kind: 'call', direction: 'outbound', label: 'Connected conversation: call completed', sourceSystem: 'rcre', sourceId: 'event-1' }],
    }))
    await put(repo, writeActor, 'crm_contacts', 'lead-2', alAgentId, contact('lead-2', alAgentId, 'al'))
    await put(repo, writeActor, 'crm_tasks', 'task-1', alAgentId, {
      id: 'task-1', organizationId: org, ownerId: alAgentId, officeId: 'al', title: 'Call lead', contactId: 'lead-2', dueAt: '2026-09-29T09:00:00.000Z', done: false, sourceSystem: 'rcre', version: 1,
    })
    await put(repo, writeActor, 'crm_appointments', 'appointment-1', alAgentId, {
      id: 'appointment-1', organizationId: org, ownerId: alAgentId, officeId: 'al', title: 'Consultation', contactId: 'lead-1', startsAt: '2026-10-01T15:00:00.000Z', endsAt: '2026-10-01T16:00:00.000Z', status: 'planned', version: 1,
    })
    await put(repo, writeActor, 'crm_deals', 'deal-1', alAgentId, {
      id: 'deal-1', organizationId: org, ownerId: alAgentId, officeId: 'al', name: 'Buyer deal', contactId: 'lead-1', stage: 'Open', status: 'open', version: 1,
    })

    const result = await inspectAgentsDurable(actor('broker_owner', brokerId, 'all'), alAgentId, repo, now)

    expect(result.roster.find(row => row.id === alAgentId)).toMatchObject({ leads: 2, overdueTasks: 1 })
    expect(result.agent?.summary).toMatchObject({ leads: 2, noRecordedFirstOutreach: 1, recordedCallAttempts: 1, explicitConnectedConversations: 1, overdueTasks: 1 })
    expect(result.agent?.summary).not.toHaveProperty('openDeals')
    expect(result.agent?.inactiveDays).toBeNull()
    expect(result.agent?.summary).toMatchObject({ contactedInactive: null })
    expect(result.agent?.events).toEqual(expect.arrayContaining([expect.objectContaining({ evidenceId: 'event-1', sourceSystem: 'rcre' })]))
    expect(result.agent?.appointments).toHaveLength(1)
    expect(result.agent?.coverage).toMatchObject({
      source: expect.stringContaining('Durable RCRE CRM'),
      transactions: expect.stringContaining('Not included'),
      training: expect.stringContaining('Not included'),
      leadInactivityThreshold: expect.stringContaining('Unavailable'),
    })
  })

  it('keeps managing broker roster and selected-agent access within canonical office scope', async () => {
    const writeActor: RepositoryActor = { userId: brokerId, organizationId: org, role: 'owner' }
    await put(repo, writeActor, 'crm_contacts', 'lead-al', alAgentId, contact('lead-al', alAgentId, 'al'))
    await put(repo, writeActor, 'crm_contacts', 'lead-fl', flAgentId, contact('lead-fl', flAgentId, 'fl'))

    const result = await inspectAgentsDurable(actor('managing_broker', managerId, 'al'), undefined, repo, now)

    expect(result.roster.map(row => row.id)).toContain(alAgentId)
    expect(result.roster.map(row => row.id)).not.toContain(flAgentId)
    await expect(inspectAgentsDurable(actor('managing_broker', managerId, 'al'), flAgentId, repo, now))
      .rejects.toMatchObject({ status: 404 })
  })

  it('rejects an actor without an active matching durable membership', async () => {
    const inactiveSeed = emptySeed() as MemorySeed
    inactiveSeed.organizations.push({ id: org, name: 'RCRE', slug: 'rcre' })
    inactiveSeed.users.push({ ...user(brokerId, org, 'owner', 'all'), isActive: false })
    const inactiveRepo = new MemoryRepository(inactiveSeed)

    await expect(inspectAgentsDurable(actor('broker_owner', brokerId, 'all'), undefined, inactiveRepo, now))
      .rejects.toBeInstanceOf(AccessError)
  })
})
