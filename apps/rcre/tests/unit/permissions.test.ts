import { describe, expect, it, beforeEach } from 'vitest'
import {
  MemoryRepository, PermissionDeniedError, canSeeRecruiting,
  canSeeWholeBrokerage, type Actor,
} from '@/lib/db/repository'
import { buildSeed, ORG_ID, BROKER_ID, AGENT_A, AGENT_B } from '../fixtures/seed'

const broker: Actor = { userId: BROKER_ID, organizationId: ORG_ID, role: 'broker' }
const agentA: Actor = { userId: AGENT_A,   organizationId: ORG_ID, role: 'agent' }
const agentB: Actor = { userId: AGENT_B,   organizationId: ORG_ID, role: 'agent' }
const foreign: Actor = { userId: AGENT_A, organizationId: 'other-org', role: 'broker' }

let repo: MemoryRepository
beforeEach(() => { repo = new MemoryRepository(buildSeed()) })

describe('role predicates', () => {
  it('only owner and broker see the whole brokerage', () => {
    expect(canSeeWholeBrokerage('owner')).toBe(true)
    expect(canSeeWholeBrokerage('broker')).toBe(true)
    expect(canSeeWholeBrokerage('agent')).toBe(false)
    expect(canSeeWholeBrokerage('team_lead')).toBe(false)
    expect(canSeeWholeBrokerage('viewer')).toBe(false)
  })

  it('recruiting is restricted to owner, broker and recruiter', () => {
    expect(canSeeRecruiting('recruiter')).toBe(true)
    expect(canSeeRecruiting('broker')).toBe(true)
    expect(canSeeRecruiting('agent')).toBe(false)
  })
})

describe('agent cannot read another agent’s book', () => {
  it('an agent sees only people assigned to them', async () => {
    const people = await repo.listPeople(agentA)
    expect(people.every(p => p.assignedUserId === AGENT_A)).toBe(true)
    expect(people.map(p => p.id)).not.toContain('p-other-agent')
  })

  it('agent B cannot see agent A’s contacts', async () => {
    const people = await repo.listPeople(agentB)
    expect(people.map(p => p.id)).toEqual(['p-other-agent'])
  })

  it('getPerson refuses a contact outside the agent’s book', async () => {
    expect(await repo.getPerson(agentA, 'p-other-agent')).toBeNull()
  })

  it('listActivity throws rather than leaking another agent’s history', async () => {
    await expect(repo.listActivity(agentA, 'p-other-agent'))
      .rejects.toBeInstanceOf(PermissionDeniedError)
  })

  it('bulk activity lookup cannot be used to bypass scoping', async () => {
    // Asking for a person id the actor cannot see must return nothing for it,
    // not an error-free leak.
    const map = await repo.listActivityForPeople(agentA, ['p-other-agent', 'p-hot'])
    expect(map.has('p-other-agent')).toBe(false)
  })

  it('an agent sees only their own tasks', async () => {
    const tasks = await repo.listTasks(agentA)
    expect(tasks.every(t => t.assignedUserId === AGENT_A)).toBe(true)
    expect(tasks.map(t => t.id)).not.toContain('t-3')
  })

  it('an agent sees only their own deals and appointments', async () => {
    expect((await repo.listDeals(agentA)).every(d => d.ownerUserId === AGENT_A)).toBe(true)
    expect((await repo.listAppointments(agentA)).every(a => a.assignedUserId === AGENT_A)).toBe(true)
  })
})

describe('broker visibility', () => {
  it('a broker sees every contact in the organization', async () => {
    const people = await repo.listPeople(broker)
    expect(people.map(p => p.id)).toContain('p-other-agent')
    expect(people.length).toBeGreaterThan((await repo.listPeople(agentA)).length)
  })

  it('a broker sees all tasks', async () => {
    expect((await repo.listTasks(broker)).map(t => t.id)).toContain('t-3')
  })
})

describe('organization isolation', () => {
  it('an actor from another organization sees nothing, even as broker', async () => {
    expect(await repo.listPeople(foreign)).toEqual([])
    expect(await repo.listTasks(foreign)).toEqual([])
    expect(await repo.listDeals(foreign)).toEqual([])
  })
})

describe('recruiting data', () => {
  it('an agent is refused', async () => {
    await expect(repo.listRecruitingProspects(agentA))
      .rejects.toBeInstanceOf(PermissionDeniedError)
  })

  it('a broker is allowed', async () => {
    expect((await repo.listRecruitingProspects(broker)).length).toBeGreaterThan(0)
  })
})

describe('audit log', () => {
  it('records events and restricts reads to brokers', async () => {
    await repo.recordAudit({
      organizationId: ORG_ID, actorUserId: AGENT_A, actorKind: 'mcp',
      action: 'get_my_today', effect: 'read', allowed: true,
    })
    expect((await repo.listAudit(broker)).length).toBe(1)
    await expect(repo.listAudit(agentA)).rejects.toBeInstanceOf(PermissionDeniedError)
  })
})
