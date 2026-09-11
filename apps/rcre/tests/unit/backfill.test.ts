import { describe, expect, it } from 'vitest'
import {
  BACKFILL_ORDER, DEFAULT_PACING, pacingDelayMs, planBackfill, resolveOrder,
  runBackfill, specFor,
  type BackfillHttpClient, type BackfillPage, type BackfillResource,
  type SyncStateStore,
} from '@/lib/sync/backfill'
import type { SyncStateRow } from '@/lib/types'

const ORG = 'org-1'

// ---------------------------------------------------------------------------
// Fakes. Nothing in this file touches the network.
// ---------------------------------------------------------------------------

interface Call { path: string; query: Record<string, string | number | undefined> }

class FakeClient implements BackfillHttpClient {
  calls: Call[] = []
  constructor(private readonly respond: (call: Call, n: number) => BackfillPage) {}
  async getPage(path: string, query: Record<string, string | number | undefined>) {
    const call = { path, query }
    this.calls.push(call)
    return this.respond(call, this.calls.length)
  }
}

class FakeStore implements SyncStateStore {
  rows = new Map<string, SyncStateRow>()
  saves = 0
  async load(resource: BackfillResource) { return this.rows.get(resource) ?? null }
  async save(row: SyncStateRow) { this.saves += 1; this.rows.set(row.resource, { ...row }) }
}

const noSleep = async () => {}
const now = () => '2026-08-24T00:00:00.000Z'

const runner = (over: Partial<Parameters<typeof runBackfill>[0]> = {}) => ({
  organizationId: ORG,
  client: new FakeClient(() => ({ items: [] })),
  store: new FakeStore(),
  sink: async () => {},
  personIds: async () => [],
  now, sleep: noSleep,
  ...over,
})

// ===========================================================================
// Pacing — headers, never a fixed sleep
// ===========================================================================

describe('pacingDelayMs', () => {
  it('waits nothing when the headers told us nothing', () => {
    // Inventing a delay here would be exactly the fixed sleep this module
    // exists to avoid. The client's 429 handling is the backstop.
    expect(pacingDelayMs(undefined)).toBe(0)
    expect(pacingDelayMs({})).toBe(0)
  })

  it('honours Retry-After even when remaining looks healthy', () => {
    // FUB's docs say this explicitly. Never second-guess it.
    expect(pacingDelayMs({ remaining: 240, windowSeconds: 10, retryAfterSeconds: 7 })).toBe(7000)
  })

  it('spends fast while the budget is healthy', () => {
    const d = pacingDelayMs({ remaining: 240, windowSeconds: 10 })
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThan(100)
  })

  it('slows down smoothly as the budget depletes', () => {
    const healthy = pacingDelayMs({ remaining: 200, windowSeconds: 10 })
    const tight = pacingDelayMs({ remaining: 60, windowSeconds: 10 })
    expect(tight).toBeGreaterThan(healthy)
  })

  it('stops spending inside the reserve so live webhook resolves are not starved', () => {
    // A webhook that 429s is a delivery FUB retries for up to eight hours.
    expect(pacingDelayMs({ remaining: DEFAULT_PACING.reserve, windowSeconds: 10 })).toBe(10_000)
    expect(pacingDelayMs({ remaining: 0, windowSeconds: 10 })).toBe(10_000)
  })

  it('caps any single computed delay', () => {
    expect(pacingDelayMs({ remaining: 41, windowSeconds: 600 }))
      .toBe(DEFAULT_PACING.maxDelayMs)
  })

  it('falls back to a 10s window when the window header is absent', () => {
    expect(pacingDelayMs({ remaining: 10 })).toBe(10_000)
  })
})

// ===========================================================================
// Ordering and planning
// ===========================================================================

describe('resource order', () => {
  it('reads reference data, then people, then anything hanging off a person', () => {
    const i = (r: BackfillResource) => BACKFILL_ORDER.indexOf(r)
    expect(i('users')).toBeLessThan(i('people'))
    expect(i('stages')).toBeLessThan(i('people'))
    expect(i('people')).toBeLessThan(i('calls'))
    expect(i('people')).toBeLessThan(i('deals'))
  })

  it('refuses a subset whose dependencies were not requested', () => {
    // Reading calls without people first would attribute activity to nobody.
    expect(() => resolveOrder(['calls'])).toThrow(/requires 'people'/)
  })

  it('orders a valid subset canonically regardless of how it was listed', () => {
    expect(resolveOrder(['people', 'stages', 'users'])).toEqual(['users', 'stages', 'people'])
  })
})

describe('planBackfill', () => {
  it('names the /v1/calls constraint as a verified absence, not an assumption', () => {
    const spec = specFor('calls')
    expect(spec.dateRangeFilter).toBe('none')
    expect(spec.iteration).toBe('perPerson')
  })

  it('warns about the per-person cost of calls, with the number', () => {
    const plan = planBackfill({ personCount: 10_000 })
    const warning = plan.warnings.find(w => w.startsWith('calls:'))
    expect(warning).toContain('no date-range filter')
    expect(warning).toContain('10000')
  })

  it('estimates the floor honestly — per-person fan-out dominates', () => {
    const plan = planBackfill({ personCount: 1000 })
    const perPerson = plan.steps.filter(s => s.iteration === 'perPerson').length
    expect(plan.minimumRequests).toBeGreaterThanOrEqual(perPerson * 1000)
    expect(plan.estimatedSeconds).toBeGreaterThan(0)
  })

  it('costs almost nothing when there are no people yet', () => {
    const plan = planBackfill({ personCount: 0 })
    expect(plan.minimumRequests).toBe(plan.steps.filter(s => s.iteration === 'account').length)
  })
})

// ===========================================================================
// Execution
// ===========================================================================

describe('runBackfill — account resources', () => {
  it('walks keyset pages until the cursor runs out', async () => {
    const client = new FakeClient((_c, n) =>
      n === 1 ? { items: [{ id: 1 }], next: 'cursor-2' } : { items: [{ id: 2 }] })
    const store = new FakeStore()
    const seen: unknown[] = []

    const report = await runBackfill(runner({
      client, store, resources: ['users'],
      sink: async (_r, items) => { seen.push(...items) },
    }))

    expect(client.calls.map(c => c.query.next)).toEqual([undefined, 'cursor-2'])
    expect(seen).toHaveLength(2)
    expect(report.resources[0].status).toBe('complete')
    expect(store.rows.get('users')!.backfillStatus).toBe('complete')
  })

  it('never sends offset — FUB enforces keyset for deep result sets', async () => {
    const client = new FakeClient(() => ({ items: [{ id: 1 }] }))
    await runBackfill(runner({ client, resources: ['users'] }))
    expect(client.calls.every(c => !('offset' in c.query))).toBe(true)
  })

  it('skips a resource already marked complete rather than re-reading it', async () => {
    const store = new FakeStore()
    await store.save({
      organizationId: ORG, resource: 'users', lastCursor: null, lastOffset: null,
      lastSyncedAt: null, lastSeenFubUpdated: null, recordsSeen: 12,
      backfillStatus: 'complete', backfillStartedAt: null, backfillCompletedAt: null,
      lastError: null,
    })
    const client = new FakeClient(() => ({ items: [{ id: 1 }] }))
    const report = await runBackfill(runner({ client, store, resources: ['users'] }))
    expect(client.calls).toHaveLength(0)
    expect(report.resources[0].status).toBe('skipped')
  })

  it('records the failure in sync_state and stops rather than continuing blind', async () => {
    const client = new FakeClient(() => { throw new Error('FUB GET /users failed: 503') })
    const store = new FakeStore()
    const report = await runBackfill(runner({ client, store, resources: ['users', 'teams'] }))
    expect(report.failed).toBe(true)
    expect(store.rows.get('users')!.backfillStatus).toBe('failed')
    expect(store.rows.get('users')!.lastError).toContain('503')
    expect(store.rows.has('teams')).toBe(false)
  })
})

describe('runBackfill — resumability', () => {
  it('resumes an interrupted account walk from the stored cursor', async () => {
    const store = new FakeStore()
    const pages = new Map([
      ['first', { items: [{ id: 1 }], next: 'cursor-2' } as BackfillPage],
      ['cursor-2', { items: [{ id: 2 }], next: 'cursor-3' } as BackfillPage],
      ['cursor-3', { items: [{ id: 3 }] } as BackfillPage],
    ])
    const respond = (c: Call) => pages.get(String(c.query.next ?? 'first'))!

    // First run: stop as soon as a page has been read and its state saved.
    const clientA = new FakeClient(respond)
    const runA = await runBackfill(runner({
      client: clientA, store, resources: ['users'], shouldStop: () => true,
    }))
    expect(runA.interrupted).toBe(true)
    expect(store.rows.get('users')!.lastCursor).toBe('cursor-2')
    expect(store.rows.get('users')!.backfillStatus).toBe('running')

    // Second run: continues, does NOT restart.
    const clientB = new FakeClient(respond)
    const runB = await runBackfill(runner({ client: clientB, store, resources: ['users'] }))
    expect(clientB.calls[0].query.next).toBe('cursor-2')
    expect(runB.resources[0].resumed).toBe(true)
    expect(runB.resources[0].status).toBe('complete')
    // Three pages total across both runs — page 1 was never re-read.
    expect(clientA.calls.length + clientB.calls.length).toBe(3)
  })

  it('resumes per-person fan-out at the person it left off, not at the start', async () => {
    const store = new FakeStore()
    await store.save({
      organizationId: ORG, resource: 'calls', lastCursor: null, lastOffset: 2,
      lastSyncedAt: null, lastSeenFubUpdated: null, recordsSeen: 5,
      backfillStatus: 'running', backfillStartedAt: '2026-08-23T00:00:00.000Z',
      backfillCompletedAt: null, lastError: null,
    })
    const client = new FakeClient(() => ({ items: [] }))
    const report = await runBackfill(runner({
      client, store, resources: ['users', 'stages', 'people', 'calls'],
      personIds: async () => [101, 102, 103, 104],
    }))

    const callIds = client.calls.filter(c => c.path === '/calls').map(c => c.query.personId)
    expect(callIds).toEqual([103, 104])
    expect(report.resources.find(r => r.resource === 'calls')!.resumed).toBe(true)
  })

  it('does not advance the person pointer until that person\'s pages are exhausted', async () => {
    // An interrupt part-way through a heavy contact must resume mid-contact,
    // not skip the rest of their calls.
    const store = new FakeStore()
    const client = new FakeClient(c =>
      c.query.personId === 101 && !c.query.next
        ? { items: [{ id: 1 }], next: 'more' }
        : { items: [{ id: 2 }] })
    await runBackfill(runner({
      client, store, resources: ['users', 'stages', 'people', 'calls'],
      personIds: async () => [101, 102],
      // Stop only once we are mid-way through the first person's calls.
      shouldStop: () => client.calls.some(c => c.path === '/calls'),
    }))
    const state = store.rows.get('calls')!
    expect(state.lastOffset).toBe(0)
    expect(state.lastCursor).toBe('more')
  })

  it('sorts the person list ascending so a resumed index means the same person', async () => {
    const client = new FakeClient(() => ({ items: [] }))
    await runBackfill(runner({
      client, resources: ['users', 'stages', 'people', 'calls'], personIds: async () => [303, 101, 202],
    }))
    expect(client.calls.filter(c => c.path === '/calls').map(c => c.query.personId))
      .toEqual([101, 202, 303])
  })

  it('saves state before waiting, so a kill during the wait loses nothing', async () => {
    const order: string[] = []
    const store = new FakeStore()
    const originalSave = store.save.bind(store)
    store.save = async row => { order.push('save'); await originalSave(row) }
    const client = new FakeClient(() => ({
      items: [{ id: 1 }], rateLimit: { remaining: 45, windowSeconds: 10 },
    }))
    await runBackfill(runner({
      client, store, resources: ['users'],
      sleep: async () => { order.push('sleep') },
    }))
    expect(order.indexOf('sleep')).toBeGreaterThan(order.indexOf('save'))
  })
})

describe('runBackfill — pacing in the loop', () => {
  it('paces from the response headers rather than a constant', async () => {
    const waits: number[] = []
    const client = new FakeClient((_c, n) => ({
      items: n < 3 ? [{ id: n }] : [],
      next: n < 3 ? `c${n}` : undefined,
      rateLimit: { remaining: n === 1 ? 240 : 45, windowSeconds: 10 },
    }))
    await runBackfill(runner({
      client, resources: ['users'], sleep: async ms => { waits.push(ms) },
    }))
    expect(waits[0]).toBeLessThan(waits[1])
  })

  it('waits the full window when a 429 hands back Retry-After', async () => {
    const waits: number[] = []
    const client = new FakeClient(() => ({
      items: [{ id: 1 }], rateLimit: { remaining: 200, retryAfterSeconds: 3 },
    }))
    await runBackfill(runner({
      client, resources: ['users'], sleep: async ms => { waits.push(ms) },
    }))
    expect(waits).toContain(3000)
  })
})

describe('runBackfill — sink', () => {
  it('tags per-person records with the person they belong to', async () => {
    const seen: { resource: string; personId?: number }[] = []
    const client = new FakeClient(() => ({ items: [{ id: 1 }] }))
    await runBackfill(runner({
      client, resources: ['users', 'stages', 'people', 'calls'],
      personIds: async () => [101, 102],
      sink: async (resource, _items, ctx) => { seen.push({ resource, personId: ctx.personId }) },
    }))
    expect(seen.filter(s => s.resource === 'calls').map(s => s.personId)).toEqual([101, 102])
    expect(seen.find(s => s.resource === 'people')!.personId).toBeUndefined()
  })

  it('is not called for an empty page', async () => {
    let calls = 0
    const client = new FakeClient(() => ({ items: [] }))
    await runBackfill(runner({ client, resources: ['users'], sink: async () => { calls += 1 } }))
    expect(calls).toBe(0)
  })
})
