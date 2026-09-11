import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THRESHOLDS, buildBrokerMetrics, buildToday, dedupe, hotOpportunities,
  median, newLeads, staleContacts, taskInsights, unansweredLeads,
  type AgentDataBundle,
} from '@/lib/insights/engine'
import { MemoryRepository, type Actor } from '@/lib/db/repository'
import { buildSeed, NOW, ORG_ID, AGENT_A, BROKER_ID } from '../fixtures/seed'

const agentA: Actor  = { userId: AGENT_A,   organizationId: ORG_ID, role: 'agent' }
const broker: Actor  = { userId: BROKER_ID, organizationId: ORG_ID, role: 'broker' }

async function bundleFor(actor: Actor): Promise<AgentDataBundle> {
  const repo = new MemoryRepository(buildSeed())
  const people = await repo.listPeople(actor)
  return {
    now: NOW,
    people,
    activityByPerson: await repo.listActivityForPeople(actor, people.map(p => p.id)),
    tasks: await repo.listTasks(actor),
    appointments: await repo.listAppointments(actor),
    deals: await repo.listDeals(actor),
  }
}

describe('unanswered leads', () => {
  it('flags a lead received but never touched', async () => {
    const found = unansweredLeads(await bundleFor(agentA))
    expect(found.map(i => i.personId)).toContain('p-unanswered')
  })

  it('does not flag a lead that was answered', async () => {
    const found = unansweredLeads(await bundleFor(agentA))
    expect(found.map(i => i.personId)).not.toContain('p-new')
  })

  it('does not flag a lead still inside the response window', async () => {
    const b = await bundleFor(agentA)
    const patient = { ...DEFAULT_THRESHOLDS, unansweredAfterMinutes: 60 * 24 }
    expect(unansweredLeads(b, patient).map(i => i.personId)).not.toContain('p-unanswered')
  })

  it('explains itself — reasons are never empty', async () => {
    for (const i of unansweredLeads(await bundleFor(agentA))) {
      expect(i.reasons.length).toBeGreaterThan(0)
      expect(i.recommendedAction).toBeTruthy()
    }
  })
})

describe('hot opportunities', () => {
  it('surfaces repeated inbound engagement with no recent outbound', async () => {
    const hot = hotOpportunities(await bundleFor(agentA))
    const dana = hot.find(i => i.personId === 'p-hot')
    expect(dana).toBeDefined()
    expect(dana!.priority).toBe('high')
  })

  it('states the concrete signals that produced it', async () => {
    const dana = hotOpportunities(await bundleFor(agentA)).find(i => i.personId === 'p-hot')!
    const joined = dana.reasons.join(' | ')
    expect(joined).toMatch(/Viewed 3 properties/)
    expect(joined).toMatch(/Saved 1 property/)
    expect(joined).toMatch(/No outbound contact in 9 days/)
  })

  it('requires the signal threshold to be met', async () => {
    const strict = { ...DEFAULT_THRESHOLDS, hotSignalCount: 99 }
    expect(hotOpportunities(await bundleFor(agentA), strict)).toEqual([])
  })
})

describe('stale contacts', () => {
  it('flags a contact untouched beyond the threshold', async () => {
    expect(staleContacts(await bundleFor(agentA)).map(i => i.personId)).toContain('p-stale')
  })

  it('does not flag recently touched contacts', async () => {
    expect(staleContacts(await bundleFor(agentA)).map(i => i.personId)).not.toContain('p-new')
  })
})

describe('new leads', () => {
  it('includes leads received in the window', async () => {
    const ids = newLeads(await bundleFor(agentA)).map(i => i.personId)
    expect(ids).toContain('p-new')
    expect(ids).toContain('p-unanswered')
  })

  it('excludes older leads', async () => {
    expect(newLeads(await bundleFor(agentA)).map(i => i.personId)).not.toContain('p-stale')
  })
})

describe('tasks', () => {
  it('separates overdue from due-today', async () => {
    const t = taskInsights(await bundleFor(agentA))
    expect(t.find(i => i.subject.includes('Mandarin Lakes'))?.type).toBe('overdue_task')
    expect(t.find(i => i.subject.includes('Priya'))?.type).toBe('task_due_today')
  })

  it('never shows another agent’s tasks', async () => {
    const t = taskInsights(await bundleFor(agentA))
    expect(t.map(i => i.subject)).not.toContain('Agent B private task')
  })
})

describe('buildToday', () => {
  it('returns only insights backed by real data — no placeholders', async () => {
    const today = buildToday(await bundleFor(agentA))
    expect(today.length).toBeGreaterThan(0)
    for (const i of today) {
      expect(i.reasons.length).toBeGreaterThan(0)
      expect(i.subject).toBeTruthy()
    }
  })

  it('returns an EMPTY list when there is no data — it does not invent any', () => {
    const empty: AgentDataBundle = {
      now: NOW, people: [], activityByPerson: new Map(),
      tasks: [], appointments: [], deals: [],
    }
    expect(buildToday(empty)).toEqual([])
  })

  it('sorts high priority first', async () => {
    const today = buildToday(await bundleFor(agentA))
    const rank = { high: 0, medium: 1, low: 2 } as const
    for (let i = 1; i < today.length; i++) {
      expect(rank[today[i - 1].priority]).toBeLessThanOrEqual(rank[today[i].priority])
    }
  })

  it('contains nothing belonging to another agent', async () => {
    const today = buildToday(await bundleFor(agentA))
    expect(today.map(i => i.personId)).not.toContain('p-other-agent')
  })
})

describe('dedupe', () => {
  it('keeps the highest priority for a person+type pair', () => {
    const mk = (priority: 'high' | 'low') => ({
      type: 'hot_opportunity' as const, priority, personId: 'p1', subject: 'X',
      reasons: ['r'], recommendedAction: 'a', occurredAt: NOW, metadata: {},
    })
    const out = dedupe([mk('low'), mk('high')])
    expect(out).toHaveLength(1)
    expect(out[0].priority).toBe('high')
  })
})

describe('broker metrics', () => {
  it('computes counts across the whole brokerage', async () => {
    const repo = new MemoryRepository(buildSeed())
    const m = buildBrokerMetrics(NOW,
      await repo.listPeople(broker), await repo.listTasks(broker), await repo.listDeals(broker))
    expect(m.newLeads24h).toBeGreaterThanOrEqual(3)
    expect(m.unansweredLeads).toBeGreaterThanOrEqual(2)  // Marcus + Tobias
  })

  it('reports median first response only from leads that have both timestamps', async () => {
    const repo = new MemoryRepository(buildSeed())
    const m = buildBrokerMetrics(NOW,
      await repo.listPeople(broker), await repo.listTasks(broker), await repo.listDeals(broker))
    // Three fixture leads have both timestamps:
    //   Priya  6h -> 5h    =    60 min
    //   Ellis  400d -> 399d = 1440 min
    //   Dana   40d  -> 38d  = 2880 min
    // Leads never touched (Marcus, Tobias) are EXCLUDED rather than counted as
    // zero — including them would flatter the median.
    expect(m.medianFirstResponseMinutes).toBe(1440)
  })

  it('excludes never-touched leads from the median rather than scoring them 0', async () => {
    const repo = new MemoryRepository(buildSeed())
    const people = await repo.listPeople(broker)
    const m = buildBrokerMetrics(NOW, people, [], [])
    const untouched = people.filter(p => p.firstReceivedAt && !p.firstTouchAt)
    expect(untouched.length).toBeGreaterThan(0)
    expect(m.medianFirstResponseMinutes).toBeGreaterThan(0)
  })

  it('returns NULL and names the gap when no metric can be computed', () => {
    const m = buildBrokerMetrics(NOW, [], [], [])
    expect(m.medianFirstResponseMinutes).toBeNull()
    expect(m.unavailable.join(' ')).toMatch(/median first response/)
    expect(m.unavailable.join(' ')).toMatch(/deal metrics/)
  })

  it('attributes overdue tasks to the right agent', async () => {
    const repo = new MemoryRepository(buildSeed())
    const m = buildBrokerMetrics(NOW,
      await repo.listPeople(broker), await repo.listTasks(broker), await repo.listDeals(broker))
    expect(m.agentsWithOverdueTasks.length).toBeGreaterThan(0)
  })
})

describe('median', () => {
  it('handles odd, even and empty inputs', () => {
    expect(median([1, 2, 3])).toBe(2)
    expect(median([10, 20, 30, 40])).toBe(25)
    expect(median([])).toBeNull()
  })
})

describe('dedupe — suppression of weaker overlapping insights', () => {
  const mk = (type: 'unanswered_lead' | 'new_lead' | 'hot_opportunity' | 'quiet_contact' | 'stale_contact',
              personId: string) => ({
    type, priority: 'high' as const, personId, subject: 'X',
    reasons: ['r'], recommendedAction: 'a', occurredAt: NOW, metadata: {},
  })

  it('suppresses new_lead when the same person is an unanswered lead', () => {
    const out = dedupe([mk('unanswered_lead', 'p1'), mk('new_lead', 'p1')])
    expect(out.map(i => i.type)).toEqual(['unanswered_lead'])
  })

  it('suppresses quiet/stale when the person is a hot opportunity', () => {
    const out = dedupe([mk('hot_opportunity', 'p1'), mk('quiet_contact', 'p1'), mk('stale_contact', 'p1')])
    expect(out.map(i => i.type)).toEqual(['hot_opportunity'])
  })

  it('does not suppress across different people', () => {
    const out = dedupe([mk('unanswered_lead', 'p1'), mk('new_lead', 'p2')])
    expect(out).toHaveLength(2)
  })

  it('keeps insights that have no person attached', () => {
    const task = { type: 'overdue_task' as const, priority: 'high' as const, personId: null,
                   subject: 'T', reasons: ['r'], recommendedAction: 'a', occurredAt: NOW, metadata: {} }
    expect(dedupe([task])).toHaveLength(1)
  })
})
