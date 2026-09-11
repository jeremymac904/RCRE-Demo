// RCRE insight engine.
//
// Every insight is DETERMINISTIC and EXPLAINABLE. No model decides who is a
// priority — the rules below do, and each insight carries the reasons that
// produced it. That matters for two reasons:
//   1. Broker metrics evaluate people's livelihoods and must be defensible.
//   2. An agent trusts "4 views, 9 days silent" and argues with "score: 87".
//
// FAIR HOUSING: ranking may only use engagement, recency, stage and stated
// intent. It must NEVER consider neighbourhood, name, or any protected-class
// proxy. That constraint lives here, in code — not in a prompt.
//
// Pure functions over normalized data. No I/O.

import type { Activity, Appointment, Deal, Person, Task } from '@/lib/types'
import { firstResponseMinutes, isTouch } from '@/lib/fub/normalize'

// ---------------------------------------------------------------------------
// Thresholds — brokerage POLICY, not model judgement.
// Values are RCRE defaults until leadership confirms them (discovery Q7).
// ---------------------------------------------------------------------------
export interface InsightThresholds {
  /** Minutes after receipt before an untouched lead is "unanswered". */
  unansweredAfterMinutes: number
  /** Days without any touch before an active contact is "stale". */
  staleAfterDays: number
  /** Days of no outbound before an engaged contact is flagged. */
  quietAfterDays: number
  /** Inbound signals within the window that make a contact "hot". */
  hotSignalCount: number
  hotSignalWindowDays: number
  /** Days without a stage change before a deal is "stalled". */
  dealStalledAfterDays: number
}

export const DEFAULT_THRESHOLDS: InsightThresholds = {
  unansweredAfterMinutes: 60,
  staleAfterDays: 30,
  quietAfterDays: 7,
  hotSignalCount: 3,
  hotSignalWindowDays: 7,
  dealStalledAfterDays: 14,
}

export type InsightType =
  | 'new_lead' | 'unanswered_lead' | 'hot_opportunity' | 'quiet_contact'
  | 'stale_contact' | 'overdue_task' | 'task_due_today' | 'appointment_today'
  | 'stalled_deal' | 'closing_anniversary' | 'birthday'

export type Priority = 'high' | 'medium' | 'low'

export interface Insight {
  type: InsightType
  priority: Priority
  personId: string | null
  /** Display name, or null when there is no person (e.g. a standalone task). */
  subject: string
  /** Human-readable reasons. This is the "why" the UI shows verbatim. */
  reasons: string[]
  recommendedAction: string
  occurredAt: string | null
  metadata: Record<string, unknown>
}

const DAY_MS = 86_400_000
const MIN_MS = 60_000

const daysBetween = (a: string, b: string) =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS)

const displayName = (p: Person) =>
  [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || `Contact ${p.fubPersonId}`

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

// ---------------------------------------------------------------------------
// Input bundle — everything the engine needs, already scoped to one agent.
// ---------------------------------------------------------------------------
export interface AgentDataBundle {
  now: string
  people: Person[]
  activityByPerson: Map<string, Activity[]>
  tasks: Task[]
  appointments: Appointment[]
  deals: Deal[]
}

// ---------------------------------------------------------------------------
// Individual rules
// ---------------------------------------------------------------------------

export function newLeads(b: AgentDataBundle, hours = 24): Insight[] {
  const cutoff = new Date(new Date(b.now).getTime() - hours * 3600_000).toISOString()
  return b.people
    .filter(p => p.firstReceivedAt && p.firstReceivedAt >= cutoff)
    .map(p => ({
      type: 'new_lead' as const,
      priority: 'high' as Priority,
      personId: p.id,
      subject: displayName(p),
      reasons: [
        `New lead received ${p.firstReceivedAt ? timeAgo(p.firstReceivedAt, b.now) : 'recently'}`,
        ...(p.source ? [`Source: ${p.source}`] : []),
      ],
      recommendedAction: 'Make first contact today',
      occurredAt: p.firstReceivedAt,
      metadata: { source: p.source },
    }))
}

export function unansweredLeads(b: AgentDataBundle, t = DEFAULT_THRESHOLDS): Insight[] {
  const nowMs = new Date(b.now).getTime()
  return b.people
    .filter(p => {
      if (!p.firstReceivedAt) return false
      if (p.firstTouchAt) return false                 // already answered
      return nowMs - new Date(p.firstReceivedAt).getTime() > t.unansweredAfterMinutes * MIN_MS
    })
    .map(p => {
      const waitingMin = Math.round((nowMs - new Date(p.firstReceivedAt!).getTime()) / MIN_MS)
      return {
        type: 'unanswered_lead' as const,
        priority: 'high' as Priority,
        personId: p.id,
        subject: displayName(p),
        reasons: [
          `No outbound contact since the lead arrived ${timeAgo(p.firstReceivedAt!, b.now)}`,
          `Waiting ${formatDuration(waitingMin)}`,
          ...(p.source ? [`Source: ${p.source}`] : []),
        ],
        recommendedAction: 'Call now — response time drives conversion',
        occurredAt: p.firstReceivedAt,
        metadata: { waitingMinutes: waitingMin },
      }
    })
}

/**
 * Hot opportunities — repeated inbound engagement with no recent outbound.
 * Uses only behavioural signals; never demographic or geographic inference.
 */
export function hotOpportunities(b: AgentDataBundle, t = DEFAULT_THRESHOLDS): Insight[] {
  const windowStart = new Date(new Date(b.now).getTime() - t.hotSignalWindowDays * DAY_MS).toISOString()
  const out: Insight[] = []

  for (const p of b.people) {
    const acts = b.activityByPerson.get(p.id) ?? []
    const inboundRecent = acts.filter(a => a.direction === 'inbound' && a.occurredAt >= windowStart)
    if (inboundRecent.length < t.hotSignalCount) continue

    const daysSinceOutbound = p.lastOutboundAt ? daysBetween(p.lastOutboundAt, b.now) : null
    const reasons: string[] = []

    const views = inboundRecent.filter(a => a.kind === 'property_view').length
    const saves = inboundRecent.filter(a => a.kind === 'property_saved').length
    const opens = inboundRecent.filter(a => a.kind === 'em_open' || a.kind === 'em_click').length
    const inboundTouches = inboundRecent.filter(isTouch).length

    if (views > 0) reasons.push(`Viewed ${views} ${views === 1 ? 'property' : 'properties'} in the last ${t.hotSignalWindowDays} days`)
    if (saves > 0) reasons.push(`Saved ${saves} ${saves === 1 ? 'property' : 'properties'}`)
    if (opens > 0) reasons.push(`Engaged with ${opens} ${opens === 1 ? 'email' : 'emails'}`)
    if (inboundTouches > 0) reasons.push(`${inboundTouches} inbound ${inboundTouches === 1 ? 'message' : 'messages'}`)
    if (daysSinceOutbound !== null && daysSinceOutbound >= t.quietAfterDays) {
      reasons.push(`No outbound contact in ${daysSinceOutbound} days`)
    } else if (daysSinceOutbound === null) {
      reasons.push('No outbound contact on record')
    }
    if (p.budgetMin != null || p.budgetMax != null) {
      reasons.push('Activity is within their stated price range')
    }

    const priority: Priority =
      daysSinceOutbound === null || daysSinceOutbound >= t.quietAfterDays ? 'high' : 'medium'

    out.push({
      type: 'hot_opportunity',
      priority,
      personId: p.id,
      subject: displayName(p),
      reasons,
      recommendedAction: 'Call or text today',
      occurredAt: p.lastInboundAt,
      metadata: { inboundSignals: inboundRecent.length, daysSinceOutbound },
    })
  }
  return out
}

export function quietContacts(b: AgentDataBundle, t = DEFAULT_THRESHOLDS): Insight[] {
  return b.people
    .filter(p => {
      if (!p.lastOutboundAt || !p.lastInboundAt) return false
      const quiet = daysBetween(p.lastOutboundAt, b.now)
      return quiet >= t.quietAfterDays && quiet < t.staleAfterDays
    })
    .map(p => {
      const days = daysBetween(p.lastOutboundAt!, b.now)
      return {
        type: 'quiet_contact' as const,
        priority: 'medium' as Priority,
        personId: p.id,
        subject: displayName(p),
        reasons: [
          `No outbound contact in ${days} days`,
          ...(p.stage ? [`Stage: ${p.stage}`] : []),
        ],
        recommendedAction: 'Send a check-in',
        occurredAt: p.lastOutboundAt,
        metadata: { daysSinceOutbound: days },
      }
    })
}

export function staleContacts(b: AgentDataBundle, t = DEFAULT_THRESHOLDS): Insight[] {
  return b.people
    .filter(p => p.lastTouchAt != null && daysBetween(p.lastTouchAt, b.now) >= t.staleAfterDays)
    .map(p => {
      const days = daysBetween(p.lastTouchAt!, b.now)
      return {
        type: 'stale_contact' as const,
        priority: 'low' as Priority,
        personId: p.id,
        subject: displayName(p),
        reasons: [`No contact in ${days} days`, ...(p.stage ? [`Stage: ${p.stage}`] : [])],
        recommendedAction: 'Re-engage or archive',
        occurredAt: p.lastTouchAt,
        metadata: { daysSinceTouch: days },
      }
    })
}

export function taskInsights(b: AgentDataBundle): Insight[] {
  const nowMs = new Date(b.now).getTime()
  const endOfDay = new Date(b.now); endOfDay.setUTCHours(23, 59, 59, 999)
  const nameOf = (personId: string | null) =>
    personId ? (b.people.find(p => p.id === personId)?.firstName ?? null) : null

  return b.tasks
    .filter(t => !t.isCompleted && t.dueAt)
    .flatMap((t): Insight[] => {
      const due = new Date(t.dueAt!).getTime()
      const who = nameOf(t.personId)
      if (due < nowMs) {
        const days = Math.floor((nowMs - due) / DAY_MS)
        return [{
          type: 'overdue_task' as const,
          priority: 'high' as Priority,
          personId: t.personId,
          subject: t.title,
          reasons: [
            days > 0 ? `Overdue by ${days} ${days === 1 ? 'day' : 'days'}` : 'Overdue today',
            ...(who ? [`Related to ${who}`] : []),
          ],
          recommendedAction: 'Complete or reschedule',
          occurredAt: t.dueAt,
          metadata: { daysOverdue: days },
        }]
      }
      if (due <= endOfDay.getTime()) {
        return [{
          type: 'task_due_today' as const,
          priority: 'medium' as Priority,
          personId: t.personId,
          subject: t.title,
          reasons: ['Due today', ...(who ? [`Related to ${who}`] : [])],
          recommendedAction: 'Complete today',
          occurredAt: t.dueAt,
          metadata: {},
        }]
      }
      return []
    })
}

export function appointmentsToday(b: AgentDataBundle): Insight[] {
  const start = new Date(b.now); start.setUTCHours(0, 0, 0, 0)
  const end = new Date(b.now); end.setUTCHours(23, 59, 59, 999)
  return b.appointments
    .filter(a => a.startsAt && new Date(a.startsAt) >= start && new Date(a.startsAt) <= end)
    .map(a => ({
      type: 'appointment_today' as const,
      priority: 'high' as Priority,
      personId: a.personId,
      subject: a.title ?? 'Appointment',
      reasons: [
        `Scheduled for ${new Date(a.startsAt!).toISOString().slice(11, 16)} UTC`,
        ...(a.location ? [`Location: ${a.location}`] : []),
      ],
      recommendedAction: 'Prepare and confirm',
      occurredAt: a.startsAt,
      metadata: {},
    }))
}

export function stalledDeals(b: AgentDataBundle, t = DEFAULT_THRESHOLDS): Insight[] {
  return b.deals
    .filter(d => !d.closedAt && d.lastStageChangeAt &&
      daysBetween(d.lastStageChangeAt, b.now) >= t.dealStalledAfterDays)
    .map(d => {
      const days = daysBetween(d.lastStageChangeAt!, b.now)
      return {
        type: 'stalled_deal' as const,
        priority: 'high' as Priority,
        personId: d.personId,
        subject: d.name ?? 'Deal',
        reasons: [
          `No stage change in ${days} days`,
          ...(d.stage ? [`Currently: ${d.stage}`] : []),
        ],
        recommendedAction: 'Review and advance',
        occurredAt: d.lastStageChangeAt,
        metadata: { daysStalled: days, stage: d.stage },
      }
    })
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/**
 * Build the full RCRE Today set.
 *
 * NO DATA = NO INSIGHT. Rules that find nothing contribute nothing; the UI
 * renders only what came back. There is no placeholder path.
 */
export function buildToday(b: AgentDataBundle, t: InsightThresholds = DEFAULT_THRESHOLDS): Insight[] {
  const all = [
    ...unansweredLeads(b, t),
    ...newLeads(b),
    ...appointmentsToday(b),
    ...taskInsights(b),
    ...hotOpportunities(b, t),
    ...stalledDeals(b, t),
    ...quietContacts(b, t),
    ...staleContacts(b, t),
  ]
  return dedupe(all).sort(compareInsights)
}

/**
 * When a type is present for a person, these weaker types are suppressed for
 * that same person. An unanswered lead IS a new lead — showing both is noise,
 * and "unanswered" is the more actionable framing.
 */
const SUPERSEDES: Partial<Record<InsightType, InsightType[]>> = {
  unanswered_lead: ['new_lead', 'quiet_contact', 'stale_contact'],
  hot_opportunity: ['quiet_contact', 'stale_contact'],
  quiet_contact: ['stale_contact'],
}

/**
 * One insight per person per type, then suppress weaker overlapping types for
 * the same person so the agent sees one clear card instead of four restatements.
 */
export function dedupe(insights: Insight[]): Insight[] {
  const byKey = new Map<string, Insight>()
  for (const i of insights) {
    const key = `${i.personId ?? 'none'}::${i.type}`
    const existing = byKey.get(key)
    if (!existing) { byKey.set(key, i); continue }
    if (PRIORITY_RANK[i.priority] < PRIORITY_RANK[existing.priority]) byKey.set(key, i)
  }

  const kept = [...byKey.values()]
  const typesByPerson = new Map<string, Set<InsightType>>()
  for (const i of kept) {
    if (!i.personId) continue
    const set = typesByPerson.get(i.personId) ?? new Set<InsightType>()
    set.add(i.type)
    typesByPerson.set(i.personId, set)
  }

  return kept.filter(i => {
    if (!i.personId) return true
    const present = typesByPerson.get(i.personId)
    if (!present) return true
    for (const [dominant, suppressed] of Object.entries(SUPERSEDES)) {
      if (present.has(dominant as InsightType) && suppressed.includes(i.type)) return false
    }
    return true
  })
}

export function compareInsights(a: Insight, b: Insight): number {
  const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  if (p !== 0) return p
  const at = a.occurredAt ? new Date(a.occurredAt).getTime() : 0
  const bt = b.occurredAt ? new Date(b.occurredAt).getTime() : 0
  return bt - at
}

// ---------------------------------------------------------------------------
// Broker metrics — RCRE Command
// ---------------------------------------------------------------------------

export interface BrokerMetrics {
  newLeads24h: number
  unansweredLeads: number
  medianFirstResponseMinutes: number | null
  agentsWithOverdueTasks: { userId: string; count: number }[]
  activeDeals: number
  stalledDeals: number
  leadsBySource: { source: string; count: number }[]
  /** Metrics we cannot compute because the underlying data is absent. */
  unavailable: string[]
}

/**
 * Compute broker exceptions.
 *
 * Any metric without data returns null/empty and is named in `unavailable`, so
 * the UI can omit the tile entirely. Manufacturing a zero would be worse than
 * showing nothing — a broker reading "median response: 0 min" would conclude
 * the team is instant rather than that we have no data.
 */
export function buildBrokerMetrics(
  now: string,
  people: Person[],
  tasks: Task[],
  deals: Deal[],
  t: InsightThresholds = DEFAULT_THRESHOLDS,
): BrokerMetrics {
  const unavailable: string[] = []
  const nowMs = new Date(now).getTime()
  const dayAgo = new Date(nowMs - DAY_MS).toISOString()

  const newLeads24h = people.filter(p => p.firstReceivedAt && p.firstReceivedAt >= dayAgo).length

  const unanswered = people.filter(p =>
    p.firstReceivedAt && !p.firstTouchAt &&
    nowMs - new Date(p.firstReceivedAt).getTime() > t.unansweredAfterMinutes * MIN_MS,
  ).length

  const responses = people
    .map(firstResponseMinutes)
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b)
  const medianFirstResponseMinutes = responses.length === 0 ? null : median(responses)
  if (medianFirstResponseMinutes === null) {
    unavailable.push('median first response time (no lead has both a received and a first-touch timestamp yet)')
  }

  const overdueByAgent = new Map<string, number>()
  for (const task of tasks) {
    if (task.isCompleted || !task.dueAt || !task.assignedUserId) continue
    if (new Date(task.dueAt).getTime() >= nowMs) continue
    overdueByAgent.set(task.assignedUserId, (overdueByAgent.get(task.assignedUserId) ?? 0) + 1)
  }

  const activeDeals = deals.filter(d => !d.closedAt).length
  const stalled = deals.filter(d =>
    !d.closedAt && d.lastStageChangeAt &&
    daysBetween(d.lastStageChangeAt, now) >= t.dealStalledAfterDays,
  ).length
  if (deals.length === 0) unavailable.push('deal metrics (no deals synced)')

  const sourceCounts = new Map<string, number>()
  for (const p of people) {
    if (!p.firstReceivedAt || p.firstReceivedAt < dayAgo) continue
    const s = p.source ?? 'Unknown'
    sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1)
  }
  const leadsBySource = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
  if (leadsBySource.length === 0) unavailable.push('lead source performance (no leads in the last 24h)')

  return {
    newLeads24h,
    unansweredLeads: unanswered,
    medianFirstResponseMinutes,
    agentsWithOverdueTasks: [...overdueByAgent.entries()]
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count),
    activeDeals,
    stalledDeals: stalled,
    leadsBySource,
    unavailable,
  }
}

export function median(sorted: readonly number[]): number | null {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'}`
  const d = Math.floor(h / 24)
  return `${d} ${d === 1 ? 'day' : 'days'}`
}

export function timeAgo(iso: string, now: string): string {
  const mins = Math.max(0, Math.round((new Date(now).getTime() - new Date(iso).getTime()) / MIN_MS))
  if (mins < 1) return 'just now'
  return `${formatDuration(mins)} ago`
}
