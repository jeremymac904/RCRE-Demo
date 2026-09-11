// Brokerage policy evaluators — required follow-up (metric 16) and stage aging
// (metric 13).
//
// THE RULE THAT GOVERNS THIS ENTIRE FILE:
//
//   WITH NO POLICY ROWS CONFIGURED, THESE FUNCTIONS RETURN NO VIOLATIONS.
//   Not defaults. Not "our best guess at a reasonable standard". Nothing.
//
// Taquilla Allen asked for an alert when "required follow-up has not occurred".
// RCRE has not yet defined what is required — how many attempts, over what
// window, through which channels. Shipping a default would mean the system
// silently enforces OUR standard against THEIR agents while appearing to
// enforce theirs, and the agent on the receiving end of that alert would have
// no way to know. `follow_up_policies` and `stage_aging_policies` ship empty on
// purpose; the day leadership fills in the policy sheet, the alerts turn on
// with no deploy.
//
// The empty case is tested explicitly. It is a feature, not an edge case.
//
// Pure functions. No I/O, no clock — `now` is a parameter.

import type { ActivityKind, FollowUpPolicy, StageAgingPolicy, StageTransition } from '@/lib/types'
import { finalAgentAssignment, type ActivityRow, type PersonBundle } from './metrics'

const MIN_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

const ms = (v: string | null | undefined): number | null => {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

const CONTACT_KINDS: ReadonlySet<ActivityKind> = new Set<ActivityKind>(['call', 'text', 'email'])

// ---------------------------------------------------------------------------
// Policy selection
// ---------------------------------------------------------------------------

/**
 * The policy governing a lead, or null.
 *
 * A policy with no `sourceMatch` is the fallback rule — one catch-all rather
 * than a rule per source. When several policies match, the most recently
 * effective wins, so a superseded standard cannot keep firing alerts after
 * leadership has replaced it. Returning null (rather than a house default) is
 * the normal outcome today.
 */
export function selectFollowUpPolicy(
  policies: readonly FollowUpPolicy[],
  source: string | null,
  now: string,
): FollowUpPolicy | null {
  const nowMs = ms(now) ?? 0
  const eligible = policies.filter(p => {
    if (!p.isActive) return false
    const from = ms(p.effectiveFrom)
    return from === null || from <= nowMs
  })
  if (eligible.length === 0) return null

  const key = source?.trim().toLowerCase() ?? null
  const specific = eligible.filter(p =>
    p.sourceMatch != null && p.sourceMatch.length > 0 &&
    key != null && p.sourceMatch.some(s => s.trim().toLowerCase() === key))
  const fallback = eligible.filter(p => p.sourceMatch == null || p.sourceMatch.length === 0)

  const pool = specific.length > 0 ? specific : fallback
  if (pool.length === 0) return null
  return pool.reduce((latest, p) =>
    (ms(p.effectiveFrom) ?? 0) > (ms(latest.effectiveFrom) ?? 0) ? p : latest)
}

// ---------------------------------------------------------------------------
// Required follow-up compliance — metric 16
// ---------------------------------------------------------------------------

export type FollowUpViolationKind =
  | 'first_attempt_missing' | 'first_attempt_late'
  | 'insufficient_attempts_24h' | 'insufficient_attempts_7d'
  | 'missing_required_channel' | 'insufficient_distinct_channels'
  | 'nurture_overdue'

export interface FollowUpViolation {
  personId: string
  agentUserId: string | null
  policyId: string
  leadCategory: string
  kind: FollowUpViolationKind
  /** Shown verbatim. A stated fact, phrased against RCRE's own standard. */
  detail: string
  assignedAt: string
  observed: number
  required: number
}

/**
 * Evaluate every lead against RCRE's follow-up standard.
 *
 * Two silences are deliberate:
 *
 *   NO POLICIES -> NO VIOLATIONS. Checked first, before anything else runs.
 *
 *   NO MEASURABLE ASSIGNMENT -> NO VIOLATIONS for that lead. A backfilled
 *   assignment records the day we connected, not the day the agent received the
 *   lead. Measuring a first-attempt window against it would fault agents for
 *   leads that were properly worked months before we existed.
 *
 * Windows that have not yet elapsed are not evaluated: a lead assigned two
 * hours ago cannot have failed a 24-hour requirement, and alerting as though it
 * had would train everyone to ignore the alert.
 */
export function evaluateFollowUpCompliance(input: {
  bundles: readonly PersonBundle[]
  policies: readonly FollowUpPolicy[]
  now: string
}): FollowUpViolation[] {
  // The load-bearing line in this file.
  if (input.policies.length === 0) return []

  const nowMs = ms(input.now) ?? 0
  const violations: FollowUpViolation[] = []

  for (const bundle of input.bundles) {
    const policy = selectFollowUpPolicy(input.policies, bundle.lead.source, input.now)
    if (!policy) continue

    const assignment = finalAgentAssignment(bundle.assignments)
    if (!assignment) continue
    const assignedAt = ms(assignment.assignedAt)
    if (assignedAt === null) continue

    const outbound = bundle.activities
      .filter(a => a.direction === 'outbound' && CONTACT_KINDS.has(a.kind))
      .map(a => ({ kind: a.kind, at: ms(a.occurredAt) }))
      .filter((a): a is { kind: ActivityKind; at: number } => a.at !== null && a.at >= assignedAt)
      .sort((a, b) => a.at - b.at)

    const add = (
      kind: FollowUpViolationKind, detail: string, observed: number, required: number,
    ) => violations.push({
      personId: bundle.lead.personId,
      agentUserId: assignment.toUserId,
      policyId: policy.id,
      leadCategory: policy.leadCategory,
      kind, detail, assignedAt: assignment.assignedAt, observed, required,
    })

    // -- First attempt window
    if (policy.firstAttemptMinutes != null) {
      const deadline = assignedAt + policy.firstAttemptMinutes * MIN_MS
      const first = outbound[0]
      if (!first) {
        if (nowMs > deadline) {
          add('first_attempt_missing',
            `No outbound contact within RCRE's ${policy.firstAttemptMinutes}-minute first-attempt window`,
            0, 1)
        }
      } else if (first.at > deadline) {
        add('first_attempt_late',
          `First contact took ${Math.round((first.at - assignedAt) / MIN_MS)} minutes; RCRE's standard is ${policy.firstAttemptMinutes}`,
          Math.round((first.at - assignedAt) / MIN_MS), policy.firstAttemptMinutes)
      }
    }

    // -- Attempt counts. Only checked once the window has actually elapsed.
    const countWithin = (windowMs: number) =>
      outbound.filter(a => a.at <= assignedAt + windowMs).length

    if (policy.minAttempts24h != null && nowMs >= assignedAt + 24 * HOUR_MS) {
      const n = countWithin(24 * HOUR_MS)
      if (n < policy.minAttempts24h) {
        add('insufficient_attempts_24h',
          `${n} outbound attempt(s) in the first 24 hours; RCRE's standard is ${policy.minAttempts24h}`,
          n, policy.minAttempts24h)
      }
    }

    if (policy.minAttempts7d != null && nowMs >= assignedAt + 7 * DAY_MS) {
      const n = countWithin(7 * DAY_MS)
      if (n < policy.minAttempts7d) {
        add('insufficient_attempts_7d',
          `${n} outbound attempt(s) in the first 7 days; RCRE's standard is ${policy.minAttempts7d}`,
          n, policy.minAttempts7d)
      }
    }

    // -- Channels. Evaluated over the 7-day window, once it has elapsed.
    const required = policy.requiredChannels ?? []
    if (required.length > 0 && nowMs >= assignedAt + 7 * DAY_MS) {
      const used = new Set(outbound.filter(a => a.at <= assignedAt + 7 * DAY_MS).map(a => a.kind))
      for (const channel of required) {
        if (!used.has(channel)) {
          add('missing_required_channel',
            `No outbound ${channel} in the first 7 days; RCRE requires ${required.join(', ')}`,
            0, 1)
        }
      }
      if (policy.requireDistinctChannels && used.size < required.length) {
        add('insufficient_distinct_channels',
          `${used.size} distinct channel(s) used; RCRE requires ${required.length}`,
          used.size, required.length)
      }
    }

    // -- Nurture handoff. An unworked lead that should have moved by now.
    if (policy.nurtureAfterDays != null &&
        outbound.length === 0 &&
        nowMs >= assignedAt + policy.nurtureAfterDays * DAY_MS) {
      add('nurture_overdue',
        `Unworked for ${policy.nurtureAfterDays}+ days; RCRE's standard is to move it to nurture`,
        0, 1)
    }
  }

  return violations
}

// ---------------------------------------------------------------------------
// Stage aging — metric 13
// ---------------------------------------------------------------------------

export interface StageAgingAlert {
  personId: string
  stage: string
  enteredAt: string
  daysInStage: number
  maxDays: number
  ownerUserId: string | null
  audience: StageAgingPolicy['alertAudience']
  /**
   * 'measured'         — we saw the person enter this stage.
   * 'since_connection' — the stage was found on connection day, so the age is a
   *                      FLOOR, not a duration. The person may have been sitting
   *                      there for a year before we existed. Surfaces must say
   *                      "at least N days", never "N days".
   */
  basis: 'measured' | 'since_connection'
}

/**
 * Alert on people sitting in a stage longer than RCRE allows.
 *
 * With `stage_aging_policies` empty this returns nothing, which is the correct
 * behaviour and not a gap: a 40-day-old Active Buyer may be perfectly healthy
 * and a 40-day-old New Lead is not, and only RCRE can say which. A stage with
 * no policy row is never alerted on even when other stages have one.
 */
export function evaluateStageAging(input: {
  people: readonly {
    personId: string
    /** The person's transitions. The most recent one is their current stage. */
    transitions: StageTransition[]
    /** Activity is not consulted — aging is about stage movement, not effort. */
    activities?: ActivityRow[]
  }[]
  policies: readonly StageAgingPolicy[]
  now: string
}): StageAgingAlert[] {
  const active = input.policies.filter(p => p.isActive)
  // The load-bearing line, again.
  if (active.length === 0) return []

  const thresholds = new Map(active.map(p => [p.stage.toLowerCase(), p]))
  const nowMs = ms(input.now) ?? 0
  const alerts: StageAgingAlert[] = []

  for (const person of input.people) {
    const latest = [...person.transitions]
      .filter(t => ms(t.occurredAt) !== null)
      .sort((a, b) => (ms(b.occurredAt) ?? 0) - (ms(a.occurredAt) ?? 0))[0]
    if (!latest) continue

    const policy = thresholds.get(latest.toStage.toLowerCase())
    if (!policy) continue

    const enteredMs = ms(latest.occurredAt) ?? 0
    const daysInStage = (nowMs - enteredMs) / DAY_MS
    if (daysInStage <= policy.maxDays) continue

    alerts.push({
      personId: person.personId,
      stage: latest.toStage,
      enteredAt: latest.occurredAt,
      daysInStage,
      maxDays: policy.maxDays,
      ownerUserId: latest.ownerUserId,
      audience: policy.alertAudience,
      basis: latest.detectedVia === 'webhook' ? 'measured' : 'since_connection',
    })
  }

  return alerts.sort((a, b) => b.daysInStage - a.daysInStage)
}
