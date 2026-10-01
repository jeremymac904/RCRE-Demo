import { describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '../../src/lib/db/repository'
import { dayPlanDurable, acceptDayBlockDurable } from '../../src/lib/platform/day-plan-durable'
import type { PlatformActor } from '../../src/lib/platform/auth'

const actor: PlatformActor = {
  id: '00000000-0000-4000-8000-000000000001', userId: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000010', role: 'agent', name: 'Fixture Agent',
  market: 'Florida', teamId: 'fl', officeId: 'fl',
}

describe('PostgreSQL day planning boundary', () => {
  it('plans around durable commitments and saves accepted blocks as RCRE appointments', async () => {
    const repo = new MemoryRepository(emptySeed())
    const owner = actor.id
    await repo.putDomainRecord({ userId: owner, organizationId: actor.organizationId, role: 'agent' }, {
      collection: 'crm_tasks', recordId: 'task-1', ownerUserId: owner,
      data: { id: 'task-1', organizationId: actor.organizationId, ownerId: owner, officeId: 'fl', title: 'Call a client', dueAt: '2098-01-15T12:00:00Z', done: false, version: 1, sourceSystem: 'rcre' },
    })
    await repo.putDomainRecord({ userId: owner, organizationId: actor.organizationId, role: 'agent' }, {
      collection: 'crm_appointments', recordId: 'meeting-1', ownerUserId: owner,
      data: { id: 'meeting-1', organizationId: actor.organizationId, ownerId: owner, officeId: 'fl', title: 'Existing meeting', startsAt: '2098-01-15T14:00:00Z', endsAt: '2098-01-15T15:00:00Z', status: 'planned', version: 1, sourceSystem: 'rcre' },
    })
    await repo.putDomainRecord({ userId: owner, organizationId: actor.organizationId, role: 'agent' }, {
      collection: 'platform_settings', recordId: `personal:${owner}`, ownerUserId: owner,
      data: { timezone: 'America/New_York', workStart: '09:00', workEnd: '11:00', taskEstimateMinutes: 30 },
    })
    const now = Date.parse('2098-01-15T13:00:00Z')
    const plan = await dayPlanDurable(actor, '2098-01-15', repo, now)
    expect(plan.blocks).toHaveLength(1)
    expect(Date.parse(String(plan.blocks[0].startsAt))).toBeGreaterThanOrEqual(Date.parse('2098-01-15T15:00:00Z'))
    const saved = await acceptDayBlockDurable(actor, '2098-01-15', String(plan.blocks[0].key), repo)
    expect(saved.kind).toBe('proposed block')
    expect((await repo.getDomainRecord({ userId: owner, organizationId: actor.organizationId, role: 'agent' }, 'crm_appointments', saved.id))?.data.title).toBe('Call a client')
  })

  it('rejects a stale suggested block without writing an appointment', async () => {
    const repo = new MemoryRepository(emptySeed())
    await expect(acceptDayBlockDurable(actor, '2098-01-15', 'stale-id', repo)).rejects.toMatchObject({ status: 409 })
  })
})
