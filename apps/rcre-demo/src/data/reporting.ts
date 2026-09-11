/**
 * Funnel reporting — synthetic.
 *
 * Built for the drill-down Taquilla asked for by name: each agent's performance
 * from lead assignment through closing, sliceable by agent, source, stage,
 * market and period.
 *
 * Two things about this file are deliberate and should survive into production:
 *
 * 1. **Every metric here is derived from an event that Follow Up Boss actually
 *    emits.** Nothing is invented because it would look good on a dashboard.
 *    The mapping is in FUB-CAPABILITY-VERIFICATION.md §8.2.
 *
 * 2. **Four of these metrics are forward-only in production.** Response time,
 *    contact attempts, time in stage and pipeline fallout have to be
 *    accumulated from webhooks; they cannot be computed for the past. The UI
 *    says so rather than quietly showing a shorter history.
 *
 * There is no "read receipt" column, and there will not be one — see ADR-0014.
 */

import { PIPELINE_STAGES, USERS, type LeadSource, type Stage } from './demo'

export type Period = '30d' | '90d' | 'ytd'

export const PERIODS: { id: Period; label: string }[] = [
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'ytd', label: 'Year to date' },
]

export interface FunnelRow {
  agentId: string
  source: LeadSource
  /** Leads assigned in the period. */
  assigned: number
  /** Median minutes from assignment to first outbound touch. */
  firstResponseMin: number
  /** Outbound calls + texts + emails, across all assigned leads. */
  attempts: number
  appointments: number
  contracts: number
  closings: number
  /** Assigned leads that went cold without reaching Appointment. */
  lost: number
}

/**
 * Deterministic pseudo-random generator.
 *
 * The numbers must be stable across renders and across a screen share — a
 * dashboard whose figures change when you press back is not credible. A seeded
 * hash gives varied-looking but fixed data without Math.random(), which would
 * also break server/client hydration.
 */
const seeded = (seed: string, min: number, max: number) => {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return min + (Math.abs(h) % (max - min + 1))
}

const SOURCES: LeadSource[] = ['Zillow', 'Facebook', 'Instagram', 'YouTube', 'Website', 'Referral', 'Open House', 'Past Client']

const PERIOD_SCALE: Record<Period, number> = { '30d': 1, '90d': 3, ytd: 8 }

/**
 * The story the numbers tell.
 *
 * Chad responds slowly and converts poorly; Sarah and Vito are strong; Zillow
 * is high volume and low conversion while Referral and Past Client are the
 * reverse. That pattern is real in brokerages, and it is the pattern that makes
 * the report worth opening — a management tool whose data has no shape teaches
 * management nothing.
 */
const AGENT_PROFILE: Record<string, { speed: number; convert: number; volume: number }> = {
  'u-sarah':   { speed: 0.35, convert: 1.25, volume: 1.2 },
  'u-vito':    { speed: 0.5,  convert: 1.15, volume: 1.0 },
  'u-noor':  { speed: 0.9,  convert: 0.95, volume: 0.9 },
  'u-chad':    { speed: 2.8,  convert: 0.45, volume: 1.1 },
  'u-regiena': { speed: 0.7,  convert: 1.05, volume: 0.8 },
}

const SOURCE_QUALITY: Partial<Record<LeadSource, { volume: number; convert: number }>> = {
  Zillow:       { volume: 2.4, convert: 0.7 },
  Facebook:     { volume: 1.8, convert: 0.6 },
  Instagram:    { volume: 0.7, convert: 0.7 },
  YouTube:      { volume: 0.5, convert: 1.1 },
  Website:      { volume: 0.9, convert: 1.2 },
  Referral:     { volume: 0.6, convert: 2.2 },
  'Open House': { volume: 0.7, convert: 1.3 },
  'Past Client':{ volume: 0.4, convert: 2.6 },
}

export function funnelRows(period: Period): FunnelRow[] {
  const agents = USERS.filter(u => u.role === 'agent')
  const rows: FunnelRow[] = []

  for (const a of agents) {
    const p = AGENT_PROFILE[a.id] ?? { speed: 1, convert: 1, volume: 1 }
    for (const source of SOURCES) {
      const q = SOURCE_QUALITY[source] ?? { volume: 1, convert: 1 }
      const assigned = Math.max(
        1,
        Math.round(seeded(`${a.id}${source}vol`, 2, 6) * q.volume * p.volume * PERIOD_SCALE[period]),
      )
      const firstResponseMin = Math.max(
        3,
        Math.round(seeded(`${a.id}${source}spd`, 8, 40) * p.speed),
      )
      const attempts = Math.round(assigned * (seeded(`${a.id}${source}att`, 15, 42) / 10))
      const appointments = Math.min(
        assigned,
        Math.round(assigned * 0.3 * q.convert * p.convert),
      )
      // Floor plus a seeded fraction, rather than round.
      //
      // Rounding each small per-row figure independently collapses the bottom
      // of the funnel: a row with one contract rounds 0.72 up to one closing,
      // so summed across rows contracts and closings come out equal and the
      // report claims a 100% close rate. Carrying a stable fractional part
      // distributes the remainder the way real volume does.
      const contracts = Math.floor(appointments * 0.45 + seeded(`${a.id}${source}ctr`, 0, 99) / 100)
      const closings = Math.floor(contracts * 0.72 + seeded(`${a.id}${source}cls`, 0, 99) / 100)
      const lost = Math.max(0, assigned - appointments - seeded(`${a.id}${source}open`, 0, 2))
      rows.push({ agentId: a.id, source, assigned, firstResponseMin, attempts, appointments, contracts, closings, lost })
    }
  }
  return rows
}

/**
 * Per-stage aging thresholds.
 *
 * PLACEHOLDER. RCRE has not defined these — see assumption A-18 and the blocked
 * requirement P0.2.2. They are shown in the demo so the concept is visible, and
 * labelled in the UI as awaiting the brokerage's own policy. Shipping our
 * numbers as if they were RCRE's would mean the system quietly enforces our
 * standard against their agents.
 */
const STAGE_THRESHOLD: Partial<Record<Stage, number>> = {
  'New Lead': 2,
  'Attempting Contact': 7,
  'Connected': 14,
  'Appointment': 10,
  'Active Buyer': 45,
  'Active Seller': 45,
  'Under Contract': 60,
  'Long-Term Nurture': 120,
  'Closed': 9999,
}

/** Median days a lead currently sits in each stage, and the alert threshold. */
export const STAGE_AGING: { stage: Stage; medianDays: number; thresholdDays: number; over: number }[] =
  PIPELINE_STAGES.map(stage => {
    const medianDays = seeded(`${stage}age`, 2, 26)
    const thresholdDays = STAGE_THRESHOLD[stage] ?? 14
    return { stage, medianDays, thresholdDays, over: seeded(`${stage}over`, 0, 4) }
  })

export const MARKETS = ['Jacksonville, FL', 'Birmingham, AL'] as const
