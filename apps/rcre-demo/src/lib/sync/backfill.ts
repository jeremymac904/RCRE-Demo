// FUB historical backfill — planner and executor.
//
// The backfill is the only part of the integration that puts real pressure on
// the rate limit. Steady-state webhook traffic at a brokerage of RCRE's size is
// far below 250 requests / 10s; a first read of the whole account is not. So
// this module is built around three properties, in order of importance:
//
//   1. PACED BY THE HEADERS, NOT BY A SLEEP. Every response carries
//      X-RateLimit-Remaining and X-RateLimit-Window, and a 429 carries
//      Retry-After. FUB's own documentation warns that Retry-After must be
//      honoured "even if X-RateLimit-Remaining shows you should have requests
//      remaining". A fixed sleep is either too slow (a week-long backfill) or
//      too fast (429s that stall the webhook resolve path we share the budget
//      with). `pacingDelayMs` is a pure function of the headers, so the pacing
//      policy is unit-testable without a network.
//
//   2. RESUMABLE. Cursor state is persisted per resource in `sync_state` after
//      every page. An interrupted run continues from the last saved page rather
//      than restarting, which matters because a restart is not merely slow —
//      it spends budget re-reading data we already hold.
//
//   3. NO NETWORK IN THIS FILE. The HTTP client is injected. Tests drive it
//      with a fake that returns canned pages and headers.
//
// ---------------------------------------------------------------------------
// THE /v1/calls CONSTRAINT — verified, and it is expensive
// ---------------------------------------------------------------------------
// `/v1/calls` has NO date-range filter. There is no `createdAfter`, no
// `updatedAfter`, no `from`/`to`. That has two consequences worth stating
// plainly before anyone budgets the run:
//
//   * We cannot ask for "calls since last sync". Incremental catch-up over the
//     account-wide collection is not available.
//   * Therefore call history is read PER PERSON (`/v1/calls?personId=N`), which
//     costs at least one request per person in the database, plus one more per
//     additional page for anyone with more than `pageLimit` calls.
//
// At 10,000 people that is a floor of 10,000 requests for calls alone. At the
// registered limit of 250 requests / 10s, and reserving headroom for webhook
// resolves, that is roughly 10–15 minutes of continuous paced reading for
// calls, before the other per-person resources. This is why the cutover plan
// runs the backfill BEFORE webhook registration rather than alongside it, and
// why `planBackfill` reports the estimate up front instead of discovering it
// halfway through.
//
// Contact attempts (metric 2) is the metric that pays this cost. It is worth
// paying — but it should be a decision, not a surprise.

import type { SyncStateRow } from '@/lib/domain-types'

// ---------------------------------------------------------------------------
// Resources, in dependency order
// ---------------------------------------------------------------------------

export type BackfillResource =
  | 'users' | 'teams' | 'stages' | 'pipelines' | 'people'
  | 'calls' | 'textMessages' | 'emails' | 'appointments' | 'deals' | 'tasks' | 'events'

export interface ResourceSpec {
  resource: BackfillResource
  path: string
  /** Key in the FUB response body holding the array. */
  collection: string
  dependsOn: BackfillResource[]
  /**
   * 'account'   — one keyset walk over the whole collection.
   * 'perPerson' — one keyset walk per person, fanned out over our people table.
   */
  iteration: 'account' | 'perPerson'
  /**
   * Whether a date-range filter exists, so an incremental re-run is possible.
   * 'none' is a VERIFIED absence. 'unverified' means we have not confirmed one
   * and iterate per person, which is correct either way — it is never wrong,
   * only more expensive than a filtered read would be.
   */
  dateRangeFilter: 'none' | 'unverified' | 'updatedAfter'
  note?: string
}

/**
 * Dependency order. Reference data first, then people, then everything that
 * hangs off a person.
 *
 * The ordering is not cosmetic: per-person resources fan out over the people we
 * have already stored, and users/teams must exist before an activity row can be
 * attributed to the agent who owned the lead at the time.
 */
export const BACKFILL_SPECS: readonly ResourceSpec[] = [
  { resource: 'users',     path: '/users',     collection: 'users',     dependsOn: [], iteration: 'account', dateRangeFilter: 'unverified' },
  { resource: 'teams',     path: '/teams',     collection: 'teams',     dependsOn: ['users'], iteration: 'account', dateRangeFilter: 'unverified',
    note: 'Team leadership comes from FUB (leaderIds) so the two systems cannot drift.' },
  { resource: 'stages',    path: '/stages',    collection: 'stages',    dependsOn: [], iteration: 'account', dateRangeFilter: 'unverified' },
  { resource: 'pipelines', path: '/pipelines', collection: 'pipelines', dependsOn: [], iteration: 'account', dateRangeFilter: 'unverified' },
  { resource: 'people',    path: '/people',    collection: 'people',    dependsOn: ['users', 'stages'], iteration: 'account', dateRangeFilter: 'updatedAfter',
    note: 'Requires fields=allFields or custom fields are silently absent.' },

  { resource: 'calls',        path: '/calls',        collection: 'calls',        dependsOn: ['people'], iteration: 'perPerson', dateRangeFilter: 'none',
    note: 'VERIFIED: no date-range filter exists. Per-person iteration is the only complete read, at >= 1 request per person.' },
  { resource: 'textMessages', path: '/textMessages', collection: 'textmessages', dependsOn: ['people'], iteration: 'perPerson', dateRangeFilter: 'unverified' },
  { resource: 'emails',       path: '/emails',       collection: 'emails',       dependsOn: ['people'], iteration: 'perPerson', dateRangeFilter: 'unverified' },
  { resource: 'appointments', path: '/appointments', collection: 'appointments', dependsOn: ['people', 'users'], iteration: 'perPerson', dateRangeFilter: 'unverified' },
  { resource: 'deals',        path: '/deals',        collection: 'deals',        dependsOn: ['people', 'pipelines'], iteration: 'perPerson', dateRangeFilter: 'unverified' },
  { resource: 'tasks',        path: '/tasks',        collection: 'tasks',        dependsOn: ['people', 'users'], iteration: 'perPerson', dateRangeFilter: 'unverified' },
  { resource: 'events',       path: '/events',       collection: 'events',       dependsOn: ['people'], iteration: 'perPerson', dateRangeFilter: 'unverified',
    note: 'GET /events has its own rate-limit context at 20/10s — a fifth of the global budget.' },
] as const

export const BACKFILL_ORDER: readonly BackfillResource[] = BACKFILL_SPECS.map(s => s.resource)

export function specFor(resource: BackfillResource): ResourceSpec {
  const spec = BACKFILL_SPECS.find(s => s.resource === resource)
  if (!spec) throw new Error(`Unknown backfill resource: ${resource}`)
  return spec
}

/**
 * Order a requested subset, pulling in nothing implicitly.
 *
 * A subset whose dependencies are missing is rejected rather than quietly
 * expanded: reading calls without people first would attribute activity to
 * nobody, and a backfill that silently did more than it was asked to is worse
 * than one that refuses.
 */
export function resolveOrder(requested: readonly BackfillResource[]): BackfillResource[] {
  const wanted = new Set(requested)
  for (const r of requested) {
    for (const dep of specFor(r).dependsOn) {
      if (!wanted.has(dep)) {
        throw new Error(`Backfill of '${r}' requires '${dep}', which was not requested`)
      }
    }
  }
  return BACKFILL_ORDER.filter(r => wanted.has(r))
}

// ---------------------------------------------------------------------------
// Rate-limit pacing
// ---------------------------------------------------------------------------

/** What the response headers told us. All fields optional — headers can be absent. */
export interface RateLimitSnapshot {
  limit?: number
  remaining?: number
  windowSeconds?: number
  context?: string
  /** From a 429. Honoured unconditionally. */
  retryAfterSeconds?: number
}

export interface PacingOptions {
  /**
   * Requests left unspent in each window. The backfill shares its budget with
   * the webhook resolve path, and a webhook that 429s is a delivery FUB retries
   * for up to eight hours. Starving live ingestion to finish a historical read
   * an hour sooner is the wrong trade.
   */
  reserve: number
  /** Ceiling on any single computed delay, so one odd header cannot stall a run. */
  maxDelayMs: number
  /** Used only when the response carried no X-RateLimit-Window. */
  defaultWindowSeconds: number
}

export const DEFAULT_PACING: PacingOptions = {
  reserve: 40,
  maxDelayMs: 15_000,
  defaultWindowSeconds: 10,
}

/**
 * How long to wait before the next request, from the headers alone.
 *
 * Not a fixed sleep. The delay is the remaining window divided by the requests
 * we are still willing to spend, so the run is fast while the budget is healthy
 * and slows smoothly as it depletes, instead of sprinting into a 429 and then
 * stalling.
 */
export function pacingDelayMs(
  rl: RateLimitSnapshot | undefined,
  opts: PacingOptions = DEFAULT_PACING,
): number {
  if (!rl) return 0

  // FUB's docs are explicit that Retry-After wins even when the remaining
  // counter looks healthy. Never second-guess it.
  if (rl.retryAfterSeconds != null && rl.retryAfterSeconds > 0) {
    return Math.ceil(rl.retryAfterSeconds * 1000)
  }

  // No counter means no information. Inventing a delay here would be the fixed
  // sleep this module exists to avoid; the client's 429 handling is the
  // backstop.
  if (rl.remaining == null || !Number.isFinite(rl.remaining)) return 0

  const windowMs = (rl.windowSeconds && rl.windowSeconds > 0
    ? rl.windowSeconds
    : opts.defaultWindowSeconds) * 1000

  const spendable = rl.remaining - opts.reserve
  // Inside the reserve: stop spending until the sliding window rolls over.
  if (spendable <= 0) return windowMs

  return Math.min(opts.maxDelayMs, Math.ceil(windowMs / spendable))
}

// ---------------------------------------------------------------------------
// Injected collaborators
// ---------------------------------------------------------------------------

export interface BackfillPage {
  items: unknown[]
  /** FUB keyset token. Absent/null on the last page. */
  next?: string | null
  rateLimit?: RateLimitSnapshot
}

/** The only thing that touches the network. Never implemented in this file. */
export interface BackfillHttpClient {
  getPage(
    path: string,
    query: Record<string, string | number | undefined>,
  ): Promise<BackfillPage>
}

/**
 * Cursor persistence. Backed by `sync_state`, one row per (organization,
 * resource).
 *
 * COLUMN MEANING for per-person resources, which is not obvious from the schema:
 *   last_offset — index into the ascending person-id list of the person whose
 *                 read is NEXT. Ascending order makes the index stable across
 *                 runs even as new people arrive at the end.
 *   last_cursor — the keyset token WITHIN that person's pages, so an interrupt
 *                 partway through a heavy contact resumes mid-contact.
 */
export interface SyncStateStore {
  load(resource: BackfillResource): Promise<SyncStateRow | null>
  save(row: SyncStateRow): Promise<void>
}

/** Where fetched records go. Persisting them is the caller's business. */
export type BackfillSink = (
  resource: BackfillResource,
  items: readonly unknown[],
  context: { personId?: number },
) => Promise<void>

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export interface PlannedStep {
  resource: BackfillResource
  iteration: 'account' | 'perPerson'
  dateRangeFilter: ResourceSpec['dateRangeFilter']
  /** Floor, assuming one page per person / per collection. Real cost is higher. */
  minimumRequests: number
  note?: string
}

export interface BackfillPlan {
  steps: PlannedStep[]
  personCount: number
  minimumRequests: number
  /** Floor on wall-clock seconds at the paced rate. Honest about being a floor. */
  estimatedSeconds: number
  warnings: string[]
}

/**
 * Plan the run without executing it.
 *
 * Pure. This exists so the cost of a full read — which is dominated by
 * per-person fan-out, and by `/v1/calls` in particular — is a number someone
 * approves in advance rather than a surprise discovered at request 40,000.
 */
export function planBackfill(input: {
  personCount: number
  resources?: readonly BackfillResource[]
  pacing?: Partial<PacingOptions>
  rateLimitPerWindow?: number
}): BackfillPlan {
  const pacing = { ...DEFAULT_PACING, ...input.pacing }
  const order = resolveOrder(input.resources ?? BACKFILL_ORDER)
  const warnings: string[] = []

  const steps = order.map<PlannedStep>(resource => {
    const spec = specFor(resource)
    const minimumRequests = spec.iteration === 'perPerson'
      ? Math.max(input.personCount, 0)
      : 1
    if (spec.dateRangeFilter === 'none') {
      warnings.push(
        `${resource}: no date-range filter exists, so every run is a full per-person read ` +
        `(>= ${minimumRequests} requests). Incremental catch-up is not available.`,
      )
    }
    return {
      resource,
      iteration: spec.iteration,
      dateRangeFilter: spec.dateRangeFilter,
      minimumRequests,
      note: spec.note,
    }
  })

  const minimumRequests = steps.reduce((n, s) => n + s.minimumRequests, 0)
  const limit = input.rateLimitPerWindow ?? 250
  const spendablePerWindow = Math.max(1, limit - pacing.reserve)
  const estimatedSeconds = Math.ceil(
    (minimumRequests / spendablePerWindow) * pacing.defaultWindowSeconds,
  )

  return { steps, personCount: input.personCount, minimumRequests, estimatedSeconds, warnings }
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export interface BackfillOptions {
  organizationId: string
  client: BackfillHttpClient
  store: SyncStateStore
  sink: BackfillSink
  /** Ascending FUB person ids to fan out over. Read from OUR people table. */
  personIds: () => Promise<number[]>
  now: () => string
  sleep: (ms: number) => Promise<void>
  resources?: readonly BackfillResource[]
  pacing?: Partial<PacingOptions>
  pageLimit?: number
  /**
   * Cooperative interruption, checked between pages. Returning true stops the
   * run with state saved, which is how resumption is tested without killing a
   * process.
   */
  shouldStop?: () => boolean
}

export interface ResourceResult {
  resource: BackfillResource
  status: 'complete' | 'interrupted' | 'skipped' | 'failed'
  requests: number
  records: number
  /** True when this run picked up from stored cursor state rather than starting over. */
  resumed: boolean
  error?: string
}

export interface BackfillReport {
  resources: ResourceResult[]
  requests: number
  records: number
  interrupted: boolean
  failed: boolean
}

const emptyState = (
  organizationId: string,
  resource: BackfillResource,
): SyncStateRow => ({
  organizationId,
  resource,
  lastCursor: null,
  lastOffset: null,
  lastSyncedAt: null,
  lastSeenFubUpdated: null,
  recordsSeen: 0,
  backfillStatus: 'pending',
  backfillStartedAt: null,
  backfillCompletedAt: null,
  lastError: null,
})

/**
 * Run (or resume) the backfill.
 *
 * Every page is followed by a state save, then a paced wait. Saving before
 * waiting rather than after is deliberate: a process killed during the wait has
 * already recorded the page it read, so resumption never re-reads it.
 */
export async function runBackfill(opts: BackfillOptions): Promise<BackfillReport> {
  const pacing = { ...DEFAULT_PACING, ...opts.pacing }
  const pageLimit = opts.pageLimit ?? 100
  const order = resolveOrder(opts.resources ?? BACKFILL_ORDER)

  const results: ResourceResult[] = []
  let totalRequests = 0
  let totalRecords = 0
  let interrupted = false
  let failed = false

  // Fanned-out resources all walk the same list. Read once, ascending, so a
  // resumed run indexes into the same positions it left off in.
  let people: number[] | null = null
  const peopleList = async () => {
    if (people === null) people = [...(await opts.personIds())].sort((a, b) => a - b)
    return people
  }

  for (const resource of order) {
    if (interrupted || failed) break
    const spec = specFor(resource)
    const stored = (await opts.store.load(resource)) ?? emptyState(opts.organizationId, resource)

    // Already finished in an earlier run. Re-reading it would spend budget to
    // learn nothing.
    if (stored.backfillStatus === 'complete') {
      results.push({ resource, status: 'skipped', requests: 0, records: 0, resumed: false })
      continue
    }

    const resumed = stored.lastCursor != null || (stored.lastOffset ?? 0) > 0
    const state: SyncStateRow = {
      ...stored,
      backfillStatus: 'running',
      backfillStartedAt: stored.backfillStartedAt ?? opts.now(),
      lastError: null,
    }
    await opts.store.save(state)

    let requests = 0
    let records = 0
    let stopped = false

    const readPages = async (
      query: Record<string, string | number | undefined>,
      personId: number | undefined,
      startCursor: string | null,
      onPage: (cursor: string | null) => Promise<void>,
    ) => {
      let cursor = startCursor
      for (;;) {
        const page = await opts.client.getPage(spec.path, {
          ...query,
          limit: pageLimit,
          ...(cursor ? { next: cursor } : {}),
        })
        requests += 1
        const items = page.items ?? []
        records += items.length
        if (items.length > 0) await opts.sink(resource, items, { personId })

        cursor = page.next && items.length > 0 ? page.next : null
        await onPage(cursor)

        const wait = pacingDelayMs(page.rateLimit, pacing)
        if (wait > 0) await opts.sleep(wait)

        if (cursor === null) return
        if (opts.shouldStop?.()) { stopped = true; return }
      }
    }

    try {
      if (spec.iteration === 'account') {
        await readPages({}, undefined, stored.lastCursor, async cursor => {
          state.lastCursor = cursor
          state.recordsSeen = stored.recordsSeen + records
          state.lastSyncedAt = opts.now()
          await opts.store.save(state)
        })
      } else {
        const ids = await peopleList()
        let index = stored.lastOffset ?? 0
        let cursorForCurrent = stored.lastCursor
        while (index < ids.length) {
          const personId = ids[index]
          await readPages({ personId }, personId, cursorForCurrent, async cursor => {
            cursorForCurrent = cursor
            // Advance the person pointer only once their pages are exhausted;
            // otherwise an interrupt mid-contact would skip the rest of them.
            state.lastOffset = cursor === null ? index + 1 : index
            state.lastCursor = cursor
            state.recordsSeen = stored.recordsSeen + records
            state.lastSyncedAt = opts.now()
            await opts.store.save(state)
          })
          if (stopped) break
          index += 1
          cursorForCurrent = null
          if (opts.shouldStop?.()) { stopped = true; break }
        }
      }
    } catch (err) {
      failed = true
      state.backfillStatus = 'failed'
      state.lastError = err instanceof Error ? err.message : String(err)
      state.lastSyncedAt = opts.now()
      await opts.store.save(state)
      results.push({
        resource, status: 'failed', requests, records, resumed, error: state.lastError,
      })
      totalRequests += requests
      totalRecords += records
      break
    }

    if (stopped) {
      interrupted = true
      state.backfillStatus = 'running'
      await opts.store.save(state)
      results.push({ resource, status: 'interrupted', requests, records, resumed })
    } else {
      state.backfillStatus = 'complete'
      state.backfillCompletedAt = opts.now()
      state.lastCursor = null
      await opts.store.save(state)
      results.push({ resource, status: 'complete', requests, records, resumed })
    }
    totalRequests += requests
    totalRecords += records
  }

  return { resources: results, requests: totalRequests, records: totalRecords, interrupted, failed }
}
