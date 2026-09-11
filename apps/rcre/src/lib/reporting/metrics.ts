// Reporting derivations — the sixteen metrics in RCRE-REPORTING-DATA-MODEL.md.
//
// Pure functions over rows the caller has already read and scoped. No I/O, no
// clock, no network: `now` is always a parameter, because a metric that reads
// the wall clock cannot be tested at a boundary and these numbers are used to
// evaluate people's work.
//
// SIX RULES HOLD THROUGHOUT. Each one exists because the obvious
// implementation produces a number that is wrong in a way nobody notices:
//
//   1. NEVER-TOUCHED LEADS ARE EXCLUDED FROM RESPONSE-TIME MEDIANS, not scored
//      zero. Scoring zero says the team answers instantly; scoring infinity
//      destroys the median. A lead with no outbound touch has no response time
//      — it belongs in `unansweredLeads`, which is a count, not a duration.
//
//   2. RESPONSE TIME IS MEASURED FROM THE FINAL AGENT'S ASSIGNMENT, never from
//      lead creation. The Alabama chain is source -> leadership -> team lead ->
//      agent; measuring from arrival charges the agent for two routing hops
//      they had no part in. Time-to-route is a separate, leadership-facing
//      number.
//
//   3. TIME-IN-STAGE USES `detectedVia === 'webhook'` ROWS ONLY. A backfill row
//      records a stage found on connection day with no entry time behind it.
//      Averaging it in mixes measured intervals with assumed ones.
//
//   4. FORWARD-ONLY METRICS CLAMP TO `historyStartedAt` AND RETURN THE CLAMPED
//      WINDOW, so the surface can state its own earliest valid date. A chart
//      that silently begins where the data begins implies a history it does
//      not have.
//
//   5. AGGREGATE FIRST, DERIVE RATES SECOND. Rounding each cell independently
//      over the small per-agent, per-source counts real brokerages produce
//      manufactures 100% close rates out of nothing. This was a real bug in the
//      demo generator, found 2026-08-24.
//
//   6. ATTRIBUTION IS THE AGENT ASSIGNED AT THE TIME OF THE EVENT, from
//      assignment_history — not the current owner. A reassignment must not
//      retroactively move an agent's past performance onto someone else.

import type {
  ActivityDirection, ActivityKind, AssignmentHistoryRow,
  StageAgingPolicy, StageTransition,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/**
 * The activity fields reporting needs. Deliberately narrower than `Activity` —
 * message bodies are never stored and are never read here.
 */
export interface ActivityRow {
  personId: string | null
  userId: string | null
  kind: ActivityKind
  direction: ActivityDirection
  occurredAt: string
  /** Call outcome as FUB holds it. Only calls have one; absent means unset. */
  outcome?: string | null
}

export interface TaskRow {
  personId: string | null
  assignedUserId: string | null
  dueAt: string | null
  isCompleted: boolean
}

export interface AppointmentRow {
  personId: string | null
  startsAt: string | null
  outcome?: string | null
}

export interface DealRow {
  personId: string | null
  stage: string | null
  closedAt: string | null
  status?: string | null
}

export interface LeadRow {
  personId: string
  source: string | null
  /** When the lead reached the brokerage. Used for cohorts, never for response time. */
  firstReceivedAt: string | null
}

/** Everything about one person that the per-person metrics need. */
export interface PersonBundle {
  lead: LeadRow
  assignments: AssignmentHistoryRow[]
  activities: ActivityRow[]
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

const MIN_MS = 60_000
const DAY_MS = 86_400_000

const ms = (v: string | null | undefined): number | null => {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * Exact median — no rounding.
 *
 * `insights/engine.median` rounds to a whole minute for display. Reporting must
 * not: rounding inside an aggregate is how rule 5 gets violated by accident.
 * Round at the edge, when rendering, if at all.
 */
export function medianOf(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

/**
 * A rate, or null when the denominator is empty.
 *
 * Null rather than 0: "no leads, so 0% converted" and "forty leads, none
 * converted" are different facts and a dashboard must not render them the same.
 */
export function rateOf(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

// ---------------------------------------------------------------------------
// Rule 4 — window clamping
// ---------------------------------------------------------------------------

export interface ReportWindow { from: string; to: string }

export interface ClampedWindow extends ReportWindow {
  /** True when the requested start predates the day history began. */
  clampedToHistory: boolean
  historyStartedAt: string | null
  /** Ready to render. The surface must show this rather than imply full history. */
  note: string | null
}

/**
 * Clamp a requested window to the day webhook history began.
 *
 * `historyStartedAt` is `integration_state.webhook_activated_at`. When it is
 * null, no history exists at all and the window is empty — an empty window is
 * the honest answer, and it forces the surface to say so instead of charting
 * whatever happens to be in the table.
 */
export function clampWindow(
  window: ReportWindow,
  historyStartedAt: string | null,
): ClampedWindow {
  if (!historyStartedAt) {
    return {
      from: window.to, to: window.to,
      clampedToHistory: true, historyStartedAt: null,
      note: 'No history: webhooks have never been activated, so this metric has no data.',
    }
  }
  const start = ms(window.from)
  const history = ms(historyStartedAt)
  if (start === null || history === null || start >= history) {
    return { ...window, clampedToHistory: false, historyStartedAt, note: null }
  }
  const from = new Date(history).toISOString()
  return {
    from,
    to: window.to,
    clampedToHistory: true,
    historyStartedAt,
    note: `History begins ${from}. Earlier dates in the requested range have no data and are not shown as zero.`,
  }
}

const within = (at: string | null | undefined, w: ReportWindow): boolean => {
  const t = ms(at)
  if (t === null) return false
  const from = ms(w.from)
  const to = ms(w.to)
  return (from === null || t >= from) && (to === null || t <= to)
}

// ---------------------------------------------------------------------------
// Rule 6 — attribution
// ---------------------------------------------------------------------------

/**
 * Who owned this person at a given instant, from assignment_history.
 *
 * Not the current owner. An agent's past calls stay theirs after the lead moves
 * on, and the agent who inherits a lead does not inherit its history.
 */
export function attributedAgentAt(
  assignments: readonly AssignmentHistoryRow[],
  at: string,
): string | null {
  const t = ms(at)
  if (t === null) return null
  let best: AssignmentHistoryRow | null = null
  for (const a of assignments) {
    const start = ms(a.assignedAt)
    if (start === null || start > t) continue
    const end = ms(a.releasedAt)
    if (end !== null && end <= t) continue
    if (best === null || start > (ms(best.assignedAt) ?? 0)) best = a
  }
  return best?.toUserId ?? null
}

// ---------------------------------------------------------------------------
// 1. First response time
// ---------------------------------------------------------------------------

/** Outbound kinds that count as a response. An appointment is an outcome, not an attempt. */
const RESPONSE_KINDS: ReadonlySet<ActivityKind> = new Set<ActivityKind>(['call', 'text', 'email'])

export type ResponseOutcome =
  | { status: 'measured'; minutes: number; assignedAt: string; agentUserId: string | null }
  /** Assigned, never contacted. Belongs in metric 11, NOT in the median as a zero. */
  | { status: 'never_touched'; assignedAt: string; agentUserId: string | null }
  /** No usable clock start — a backfilled assignment, or none at all. */
  | { status: 'no_measurable_assignment'; reason: 'backfill_only' | 'no_assignment' }

/**
 * The final-agent assignment row, or null.
 *
 * A backfilled row is refused on purpose. Its `assignedAt` is the day we
 * connected, not the day the agent received the lead, so measuring against it
 * would report every pre-existing lead as answered within minutes of cutover.
 * That number would be flattering, wrong, and impossible to spot in a chart.
 */
export function finalAgentAssignment(
  assignments: readonly AssignmentHistoryRow[],
): AssignmentHistoryRow | null {
  const measurable = assignments.filter(a => a.isFinalAgent && a.detectedVia !== 'backfill')
  if (measurable.length === 0) return null
  return measurable.reduce((latest, a) =>
    (ms(a.assignedAt) ?? 0) > (ms(latest.assignedAt) ?? 0) ? a : latest)
}

/**
 * Response time for one person — rules 1 and 2 in a single function.
 *
 * Any outbound call, text or email after the final assignment counts, whoever
 * sent it. A team that texts on an agent's behalf has still responded to the
 * client, and refusing to count it would penalise the arrangement rather than
 * measure it.
 */
export function firstResponseForPerson(bundle: PersonBundle): ResponseOutcome {
  const assignment = finalAgentAssignment(bundle.assignments)
  if (!assignment) {
    const reason = bundle.assignments.length === 0 ? 'no_assignment' : 'backfill_only'
    return { status: 'no_measurable_assignment', reason }
  }
  const start = ms(assignment.assignedAt)
  if (start === null) return { status: 'no_measurable_assignment', reason: 'no_assignment' }

  let firstTouch: number | null = null
  for (const a of bundle.activities) {
    if (a.direction !== 'outbound' || !RESPONSE_KINDS.has(a.kind)) continue
    const t = ms(a.occurredAt)
    if (t === null || t < start) continue
    if (firstTouch === null || t < firstTouch) firstTouch = t
  }

  if (firstTouch === null) {
    return {
      status: 'never_touched',
      assignedAt: assignment.assignedAt,
      agentUserId: assignment.toUserId,
    }
  }
  return {
    status: 'measured',
    minutes: (firstTouch - start) / MIN_MS,
    assignedAt: assignment.assignedAt,
    agentUserId: assignment.toUserId,
  }
}

export interface FirstResponseReport {
  medianMinutes: number | null
  /** How many leads contributed a duration. The median means nothing without it. */
  sampleSize: number
  /** Counted, not averaged in. Report beside the median, never inside it. */
  neverTouched: number
  noMeasurableAssignment: number
  window: ClampedWindow
}

/**
 * Median first response over a cohort. FORWARD-ONLY: the window is clamped to
 * `historyStartedAt` and the clamp is returned so the surface can state it.
 */
export function firstResponseReport(input: {
  bundles: readonly PersonBundle[]
  window: ReportWindow
  historyStartedAt: string | null
}): FirstResponseReport {
  const window = clampWindow(input.window, input.historyStartedAt)
  const durations: number[] = []
  let neverTouched = 0
  let noMeasurable = 0

  for (const b of input.bundles) {
    const r = firstResponseForPerson(b)
    if (r.status === 'no_measurable_assignment') { noMeasurable += 1; continue }
    if (!within(r.assignedAt, window)) continue
    if (r.status === 'never_touched') { neverTouched += 1; continue }
    durations.push(r.minutes)
  }

  return {
    medianMinutes: medianOf(durations),
    sampleSize: durations.length,
    neverTouched,
    noMeasurableAssignment: noMeasurable,
    window,
  }
}

// ---------------------------------------------------------------------------
// 2. Contact attempts
// ---------------------------------------------------------------------------

/**
 * Call outcomes that mean nobody was reached.
 *
 * Framed as a deny-list on purpose. FUB lets an account define its own outcome
 * labels, so an unrecognised value must fall into `unclassified` rather than be
 * counted as a conversation — five voicemails is not five conversations, and an
 * accountability metric that cannot tell them apart will be argued with,
 * correctly.
 */
const UNCONNECTED_OUTCOMES: ReadonlySet<string> = new Set([
  'left message', 'no answer', 'busy', 'bad number', 'wrong number',
  'voicemail', 'left voicemail', 'not available', 'hung up',
])

export interface ContactAttempts {
  attempted: number
  connected: number
  /** Outbound calls whose outcome nobody set. Not connected, not "no answer". */
  unclassified: number
  byChannel: { call: number; text: number; email: number }
  leads: number
  /** Rule 5: derived from the totals, not averaged over per-lead rates. */
  attemptsPerLead: number | null
}

export function contactAttempts(input: {
  activities: readonly ActivityRow[]
  /** Distinct leads in scope. Needed because attempts-per-lead rewards volume otherwise. */
  leadCount: number
  window?: ReportWindow
}): ContactAttempts {
  const byChannel = { call: 0, text: 0, email: 0 }
  let attempted = 0
  let connected = 0
  let unclassified = 0

  for (const a of input.activities) {
    if (a.direction !== 'outbound' || !RESPONSE_KINDS.has(a.kind)) continue
    if (input.window && !within(a.occurredAt, input.window)) continue
    attempted += 1
    byChannel[a.kind as 'call' | 'text' | 'email'] += 1
    if (a.kind !== 'call') continue
    const outcome = a.outcome?.trim().toLowerCase()
    if (!outcome) unclassified += 1
    else if (!UNCONNECTED_OUTCOMES.has(outcome)) connected += 1
  }

  return {
    attempted, connected, unclassified, byChannel,
    leads: input.leadCount,
    attemptsPerLead: rateOf(attempted, input.leadCount),
  }
}

// ---------------------------------------------------------------------------
// 3. Appointment set rate · 6/7. Lead to contract / closing
// ---------------------------------------------------------------------------

export interface ConversionResult {
  cohort: number
  converted: number
  rate: number | null
}

/** Rule 5 in its plainest form: count both sides, divide once, round never. */
function conversion(cohort: number, converted: number): ConversionResult {
  return { cohort, converted, rate: rateOf(converted, cohort) }
}

export function appointmentSetRate(input: {
  leadIds: readonly string[]
  appointments: readonly AppointmentRow[]
  window?: ReportWindow
}): ConversionResult {
  const cohort = new Set(input.leadIds)
  const withAppointment = new Set<string>()
  for (const a of input.appointments) {
    if (!a.personId || !cohort.has(a.personId)) continue
    if (input.window && !within(a.startsAt, input.window)) continue
    withAppointment.add(a.personId)
  }
  return conversion(cohort.size, withAppointment.size)
}

/**
 * Lead-to-contract and lead-to-closing.
 *
 * Anchored on the LEAD COHORT, not on the deal date — otherwise a good month of
 * closings from two-year-old leads reads as a good month of new-lead
 * conversion. `contractStages` is supplied by the caller because RCRE's stage
 * names are theirs, not ours; there is no default list, and inventing one would
 * quietly decide what "under contract" means on their behalf.
 */
export function leadToContract(input: {
  leadIds: readonly string[]
  deals: readonly DealRow[]
  contractStages: readonly string[]
}): ConversionResult {
  const cohort = new Set(input.leadIds)
  const stages = new Set(input.contractStages.map(s => s.toLowerCase()))
  const reached = new Set<string>()
  for (const d of input.deals) {
    if (!d.personId || !cohort.has(d.personId)) continue
    if (d.stage && stages.has(d.stage.toLowerCase())) reached.add(d.personId)
  }
  return conversion(cohort.size, reached.size)
}

export function leadToClosing(input: {
  leadIds: readonly string[]
  deals: readonly DealRow[]
  /** Optional. When absent, a non-null closedAt is the signal. */
  closedStages?: readonly string[]
}): ConversionResult {
  const cohort = new Set(input.leadIds)
  const stages = new Set((input.closedStages ?? []).map(s => s.toLowerCase()))
  const closed = new Set<string>()
  for (const d of input.deals) {
    if (!d.personId || !cohort.has(d.personId)) continue
    const byStage = d.stage != null && stages.has(d.stage.toLowerCase())
    if (byStage || d.closedAt != null) closed.add(d.personId)
  }
  return conversion(cohort.size, closed.size)
}

// ---------------------------------------------------------------------------
// 8. Time in stage — rule 3
// ---------------------------------------------------------------------------

export interface TimeInStageRow {
  stage: string
  medianSeconds: number | null
  sampleSize: number
}

export interface TimeInStageReport {
  stages: TimeInStageRow[]
  /** Backfill rows seen and deliberately not counted. Surfaced so the exclusion is visible. */
  excludedBackfillRows: number
  window: ClampedWindow
}

/**
 * Median time in each stage, from MEASURED intervals only.
 *
 * Only `detectedVia === 'webhook'` rows with a non-null `secondsInFrom`
 * qualify. Backfill rows are counted separately rather than dropped silently,
 * so a surface can say "excluded 400 leads whose entry we never observed"
 * instead of presenting a median over an unstated mixture.
 */
export function timeInStage(input: {
  transitions: readonly StageTransition[]
  window: ReportWindow
  historyStartedAt: string | null
}): TimeInStageReport {
  const window = clampWindow(input.window, input.historyStartedAt)
  const buckets = new Map<string, number[]>()
  let excluded = 0

  for (const t of input.transitions) {
    if (t.detectedVia !== 'webhook') { excluded += 1; continue }
    if (t.secondsInFrom == null || t.fromStage == null) continue
    if (!within(t.occurredAt, window)) continue
    const list = buckets.get(t.fromStage) ?? []
    list.push(t.secondsInFrom)
    buckets.set(t.fromStage, list)
  }

  const stages = [...buckets.entries()]
    .map(([stage, values]) => ({
      stage,
      medianSeconds: medianOf(values),
      sampleSize: values.length,
    }))
    .sort((a, b) => a.stage.localeCompare(b.stage))

  return { stages, excludedBackfillRows: excluded, window }
}

// ---------------------------------------------------------------------------
// 9. Stage transition rate
// ---------------------------------------------------------------------------

export interface StageTransitionRateRow {
  stage: string
  forward: number
  backward: number
  lateral: number
  total: number
  forwardRate: number | null
  backwardRate: number | null
}

/**
 * Forward / backward / lateral movement out of each stage.
 *
 * Backward transitions matter more than they sound: Under Contract -> Active
 * Buyer is a deal that fell through, and it is invisible in any report that
 * only counts forward motion. `stageOrder` comes from RCRE's pipeline; a stage
 * absent from it is counted as lateral rather than guessed at.
 */
export function stageTransitionRate(input: {
  transitions: readonly StageTransition[]
  stageOrder: readonly string[]
  window: ReportWindow
  historyStartedAt: string | null
}): { stages: StageTransitionRateRow[]; window: ClampedWindow } {
  const window = clampWindow(input.window, input.historyStartedAt)
  const rank = new Map(input.stageOrder.map((s, i) => [s.toLowerCase(), i]))
  const rows = new Map<string, { forward: number; backward: number; lateral: number }>()

  for (const t of input.transitions) {
    if (t.fromStage == null) continue
    if (!within(t.occurredAt, window)) continue
    const row = rows.get(t.fromStage) ?? { forward: 0, backward: 0, lateral: 0 }
    const from = rank.get(t.fromStage.toLowerCase())
    const to = rank.get(t.toStage.toLowerCase())
    if (from == null || to == null || from === to) row.lateral += 1
    else if (to > from) row.forward += 1
    else row.backward += 1
    rows.set(t.fromStage, row)
  }

  const stages = [...rows.entries()]
    .map(([stage, c]) => {
      const total = c.forward + c.backward + c.lateral
      return {
        stage, ...c, total,
        forwardRate: rateOf(c.forward, total),
        backwardRate: rateOf(c.backward, total),
      }
    })
    .sort((a, b) => a.stage.localeCompare(b.stage))

  return { stages, window }
}

// ---------------------------------------------------------------------------
// 10. Pipeline fallout
// ---------------------------------------------------------------------------

export interface FalloutEntry {
  personId: string
  stage: string
  enteredAt: string
  daysInStage: number
  lastActivityAt: string | null
  /** From stage_aging_policies. Null when RCRE has set no threshold for this stage. */
  thresholdDays: number | null
  /**
   * 'stalled' only where a threshold exists AND is exceeded. Everything else is
   * 'unclassified': a 40-day Active Buyer may be perfectly healthy and a 40-day
   * New Lead is not, and only RCRE can say which.
   */
  classification: 'stalled' | 'unclassified'
}

export function pipelineFallout(input: {
  bundles: readonly { personId: string; transitions: StageTransition[]; activities: ActivityRow[] }[]
  policies: readonly StageAgingPolicy[]
  now: string
  historyStartedAt: string | null
}): { entries: FalloutEntry[]; classified: number; window: ClampedWindow } {
  const window = clampWindow({ from: input.now, to: input.now }, input.historyStartedAt)
  const thresholds = new Map(
    input.policies.filter(p => p.isActive).map(p => [p.stage.toLowerCase(), p.maxDays]),
  )
  const nowMs = ms(input.now) ?? 0
  const entries: FalloutEntry[] = []

  for (const b of input.bundles) {
    const latest = [...b.transitions]
      .filter(t => ms(t.occurredAt) !== null)
      .sort((x, y) => (ms(y.occurredAt) ?? 0) - (ms(x.occurredAt) ?? 0))[0]
    if (!latest) continue

    const enteredMs = ms(latest.occurredAt) ?? 0
    const lastActivity = b.activities
      .map(a => ms(a.occurredAt))
      .filter((t): t is number => t !== null && t > enteredMs)
      .sort((x, y) => y - x)[0]

    const thresholdDays = thresholds.get(latest.toStage.toLowerCase()) ?? null
    const daysInStage = (nowMs - enteredMs) / DAY_MS
    entries.push({
      personId: b.personId,
      stage: latest.toStage,
      enteredAt: latest.occurredAt,
      daysInStage,
      lastActivityAt: lastActivity ? new Date(lastActivity).toISOString() : null,
      thresholdDays,
      classification:
        thresholdDays != null && daysInStage > thresholdDays ? 'stalled' : 'unclassified',
    })
  }

  return {
    entries,
    classified: entries.filter(e => e.classification === 'stalled').length,
    window,
  }
}

// ---------------------------------------------------------------------------
// 11. Unanswered leads — the day-one metric
// ---------------------------------------------------------------------------

export interface UnansweredLead {
  personId: string
  agentUserId: string | null
  assignedAt: string
  waitingMinutes: number
  source: string | null
}

/**
 * Assigned, never contacted outbound.
 *
 * Needs no threshold, no policy and no accumulated history, which is why it is
 * the most valuable metric available on day one. Leads with no measurable
 * assignment are excluded rather than reported as unanswered — we do not know
 * that nobody worked them, only that we cannot tell.
 */
export function unansweredLeads(input: {
  bundles: readonly PersonBundle[]
  now: string
  minimumAgeMinutes?: number
}): UnansweredLead[] {
  const nowMs = ms(input.now) ?? 0
  const minAge = input.minimumAgeMinutes ?? 0
  const out: UnansweredLead[] = []

  for (const b of input.bundles) {
    const r = firstResponseForPerson(b)
    if (r.status !== 'never_touched') continue
    const waitingMinutes = (nowMs - (ms(r.assignedAt) ?? 0)) / MIN_MS
    if (waitingMinutes < minAge) continue
    out.push({
      personId: b.lead.personId,
      agentUserId: r.agentUserId,
      assignedAt: r.assignedAt,
      waitingMinutes,
      source: b.lead.source,
    })
  }
  return out.sort((a, b) => b.waitingMinutes - a.waitingMinutes)
}

// ---------------------------------------------------------------------------
// 12. Overdue follow-ups
// ---------------------------------------------------------------------------

export interface OverdueFollowUps {
  total: number
  byAgent: { userId: string; count: number }[]
  /**
   * Scope warning, carried in the data so a surface cannot omit it: this counts
   * follow-up an agent COMMITTED TO in FUB. An agent who creates no tasks has
   * no overdue tasks. Required-follow-up compliance (metric 16) is the one that
   * measures against a standard, and it lives in policy.ts.
   */
  scope: 'tasks_created_in_fub_only'
}

export function overdueFollowUps(input: {
  tasks: readonly TaskRow[]
  now: string
}): OverdueFollowUps {
  const nowMs = ms(input.now) ?? 0
  const byAgent = new Map<string, number>()
  let total = 0

  for (const t of input.tasks) {
    if (t.isCompleted) continue
    const due = ms(t.dueAt)
    if (due === null || due >= nowMs) continue
    total += 1
    if (t.assignedUserId) byAgent.set(t.assignedUserId, (byAgent.get(t.assignedUserId) ?? 0) + 1)
  }

  return {
    total,
    byAgent: [...byAgent.entries()]
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count),
    scope: 'tasks_created_in_fub_only',
  }
}

// ---------------------------------------------------------------------------
// 15. Agent activity — rule 6
// ---------------------------------------------------------------------------

export interface AgentActivityRow {
  userId: string
  calls: number
  texts: number
  emails: number
  total: number
}

/**
 * Outbound volume per agent, attributed to whoever held the lead when the
 * activity happened.
 *
 * REPORT IT BESIDE OUTCOMES, NEVER ALONE. Volume is the easiest metric to game
 * and the weakest predictor of production; next to appointment rate, a
 * high-activity low-conversion agent reads as a coaching opportunity rather
 * than a top performer.
 *
 * Falls back to the activity's own `userId` when no assignment covers the
 * instant — that is who FUB says did it, and it is better evidence than
 * dropping the row.
 */
export function agentActivity(input: {
  bundles: readonly PersonBundle[]
  window?: ReportWindow
}): AgentActivityRow[] {
  const rows = new Map<string, AgentActivityRow>()

  for (const b of input.bundles) {
    for (const a of b.activities) {
      if (a.direction !== 'outbound' || !RESPONSE_KINDS.has(a.kind)) continue
      if (input.window && !within(a.occurredAt, input.window)) continue
      const userId = attributedAgentAt(b.assignments, a.occurredAt) ?? a.userId
      if (!userId) continue
      const row = rows.get(userId) ?? { userId, calls: 0, texts: 0, emails: 0, total: 0 }
      if (a.kind === 'call') row.calls += 1
      else if (a.kind === 'text') row.texts += 1
      else row.emails += 1
      row.total += 1
      rows.set(userId, row)
    }
  }

  return [...rows.values()].sort((a, b) => b.total - a.total)
}

// ---------------------------------------------------------------------------
// 17. Source performance
// ---------------------------------------------------------------------------

export interface SourcePerformanceRow {
  source: string
  leads: number
  appointments: number
  contracts: number
  closings: number
  appointmentRate: number | null
  contractRate: number | null
  closingRate: number | null
  medianResponseMinutes: number | null
  responseSampleSize: number
  neverTouched: number
}

/**
 * Volume, response time and conversion by lead source.
 *
 * Leadership did not ask for this one. It is here because it is the metric most
 * likely to change a spending decision — where reporting stops describing
 * agents and starts describing where money should go.
 *
 * Rule 5 is the whole implementation: every source accumulates raw counts, and
 * the three rates are derived once at the end. Computing a rate per lead and
 * averaging those is what produced a false 100% close rate in the demo
 * generator.
 */
export function sourcePerformance(input: {
  bundles: readonly PersonBundle[]
  appointments: readonly AppointmentRow[]
  deals: readonly DealRow[]
  contractStages: readonly string[]
  closedStages?: readonly string[]
  window: ReportWindow
  historyStartedAt: string | null
}): { sources: SourcePerformanceRow[]; window: ClampedWindow } {
  const window = clampWindow(input.window, input.historyStartedAt)
  const sourceOf = new Map<string, string>()
  const acc = new Map<string, {
    leads: number; appts: Set<string>; contracts: Set<string>; closings: Set<string>
    durations: number[]; neverTouched: number
  }>()
  const get = (s: string) => {
    let a = acc.get(s)
    if (!a) {
      a = { leads: 0, appts: new Set(), contracts: new Set(), closings: new Set(), durations: [], neverTouched: 0 }
      acc.set(s, a)
    }
    return a
  }

  for (const b of input.bundles) {
    const source = b.lead.source ?? 'Unknown'
    sourceOf.set(b.lead.personId, source)
    const a = get(source)
    a.leads += 1
    const r = firstResponseForPerson(b)
    if (r.status === 'measured') a.durations.push(r.minutes)
    else if (r.status === 'never_touched') a.neverTouched += 1
  }

  for (const appt of input.appointments) {
    const s = appt.personId ? sourceOf.get(appt.personId) : undefined
    if (s && appt.personId) get(s).appts.add(appt.personId)
  }

  const contractStages = new Set(input.contractStages.map(s => s.toLowerCase()))
  const closedStages = new Set((input.closedStages ?? []).map(s => s.toLowerCase()))
  for (const d of input.deals) {
    const s = d.personId ? sourceOf.get(d.personId) : undefined
    if (!s || !d.personId) continue
    const bucket = get(s)
    if (d.stage && contractStages.has(d.stage.toLowerCase())) bucket.contracts.add(d.personId)
    if (d.closedAt != null || (d.stage && closedStages.has(d.stage.toLowerCase()))) {
      bucket.closings.add(d.personId)
    }
  }

  const sources = [...acc.entries()]
    .map(([source, a]) => ({
      source,
      leads: a.leads,
      appointments: a.appts.size,
      contracts: a.contracts.size,
      closings: a.closings.size,
      appointmentRate: rateOf(a.appts.size, a.leads),
      contractRate: rateOf(a.contracts.size, a.leads),
      closingRate: rateOf(a.closings.size, a.leads),
      medianResponseMinutes: medianOf(a.durations),
      responseSampleSize: a.durations.length,
      neverTouched: a.neverTouched,
    }))
    .sort((x, y) => y.leads - x.leads)

  return { sources, window }
}
