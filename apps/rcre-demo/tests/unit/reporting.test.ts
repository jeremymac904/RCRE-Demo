import { describe, expect, it } from 'vitest'
import {
  agentActivity, appointmentSetRate, attributedAgentAt, clampWindow, contactAttempts,
  finalAgentAssignment, firstResponseForPerson, firstResponseReport, leadToClosing,
  leadToContract, medianOf, overdueFollowUps, pipelineFallout, rateOf, sourcePerformance,
  stageTransitionRate, timeInStage, unansweredLeads,
  type ActivityRow, type PersonBundle,
} from '@/lib/reporting/metrics'
import {
  evaluateFollowUpCompliance, evaluateStageAging, selectFollowUpPolicy,
} from '@/lib/reporting/policy'
import type {
  AssignmentHistoryRow, FollowUpPolicy, StageAgingPolicy, StageTransition,
} from '@/lib/domain-types'

const ORG = 'org-1'
const NOW = '2026-09-01T00:00:00.000Z'
const WINDOW = { from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T00:00:00.000Z' }
const HISTORY = '2026-08-01T00:00:00.000Z'

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const assignment = (over: Partial<AssignmentHistoryRow> = {}): AssignmentHistoryRow => ({
  organizationId: ORG, personId: 'p1',
  fromUserId: null, toUserId: 'agent-a', fromFubUserId: null, toFubUserId: 13,
  reason: 'initial', teamId: null, assignedPondId: null,
  assignedAt: '2026-08-10T10:00:00.000Z', releasedAt: null,
  isCurrent: true, isInitialReceipt: true, isFinalAgent: true, detectedVia: 'webhook',
  ...over,
})

const act = (
  kind: ActivityRow['kind'], direction: ActivityRow['direction'],
  occurredAt: string, over: Partial<ActivityRow> = {},
): ActivityRow => ({ personId: 'p1', userId: 'agent-a', kind, direction, occurredAt, ...over })

const bundle = (over: Partial<PersonBundle> = {}): PersonBundle => ({
  lead: { personId: 'p1', source: 'Zillow', firstReceivedAt: '2026-08-10T08:00:00.000Z' },
  assignments: [assignment()],
  activities: [],
  ...over,
})

const transition = (over: Partial<StageTransition> = {}): StageTransition => ({
  organizationId: ORG, personId: 'p1',
  fromStage: 'New Lead', toStage: 'Contacted', fromStageId: null, toStageId: null,
  ownerUserId: 'agent-a', teamId: null,
  occurredAt: '2026-08-15T00:00:00.000Z', secondsInFrom: 3600, detectedVia: 'webhook',
  ...over,
})

// ===========================================================================
// Shared helpers
// ===========================================================================

describe('medianOf / rateOf', () => {
  it('does not round — rounding inside an aggregate is how false rates appear', () => {
    expect(medianOf([1, 2])).toBe(1.5)
    expect(medianOf([3, 1, 2])).toBe(2)
  })

  it('returns null for an empty set rather than zero', () => {
    expect(medianOf([])).toBeNull()
    expect(rateOf(0, 0)).toBeNull()
  })

  it('distinguishes "no leads" from "no conversions"', () => {
    expect(rateOf(0, 40)).toBe(0)
    expect(rateOf(0, 0)).toBeNull()
  })
})

// ===========================================================================
// RULE 4 — forward-only clamping
// ===========================================================================

describe('clampWindow', () => {
  it('clamps a window that predates the day history began, and says so', () => {
    const w = clampWindow({ from: '2026-01-01T00:00:00.000Z', to: NOW }, HISTORY)
    expect(w.from).toBe(HISTORY)
    expect(w.clampedToHistory).toBe(true)
    expect(w.note).toContain('History begins')
  })

  it('leaves a window inside the history alone', () => {
    const w = clampWindow({ from: '2026-08-15T00:00:00.000Z', to: NOW }, HISTORY)
    expect(w.from).toBe('2026-08-15T00:00:00.000Z')
    expect(w.clampedToHistory).toBe(false)
    expect(w.note).toBeNull()
  })

  it('collapses to an empty window when webhooks were never activated', () => {
    // The honest answer. Charting whatever is in the table would imply a
    // history that does not exist.
    const w = clampWindow({ from: '2026-01-01T00:00:00.000Z', to: NOW }, null)
    expect(w.from).toBe(w.to)
    expect(w.note).toContain('never been activated')
  })
})

// ===========================================================================
// RULE 6 — attribution at the time of the event
// ===========================================================================

describe('attributedAgentAt', () => {
  const chain = [
    assignment({ toUserId: 'agent-a', assignedAt: '2026-08-01T00:00:00.000Z', releasedAt: '2026-08-10T00:00:00.000Z', isCurrent: false, isFinalAgent: false }),
    assignment({ toUserId: 'agent-b', assignedAt: '2026-08-10T00:00:00.000Z' }),
  ]

  it('attributes to who held the lead THEN, not who holds it now', () => {
    expect(attributedAgentAt(chain, '2026-08-05T00:00:00.000Z')).toBe('agent-a')
    expect(attributedAgentAt(chain, '2026-08-20T00:00:00.000Z')).toBe('agent-b')
  })

  it('returns null before the chain starts rather than guessing the first owner', () => {
    expect(attributedAgentAt(chain, '2026-07-01T00:00:00.000Z')).toBeNull()
  })
})

// ===========================================================================
// RULES 1 & 2 — first response time
// ===========================================================================

describe('finalAgentAssignment', () => {
  it('picks the final-agent row', () => {
    const a = finalAgentAssignment([
      assignment({ toUserId: 'u-broker', isFinalAgent: false }),
      assignment({ toUserId: 'agent-a', assignedAt: '2026-08-10T12:00:00.000Z' }),
    ])
    expect(a!.toUserId).toBe('agent-a')
  })

  it('REFUSES a backfilled assignment — its assignedAt is our connection day', () => {
    // Measuring against it would report every pre-existing lead as answered
    // within minutes of cutover.
    expect(finalAgentAssignment([assignment({ detectedVia: 'backfill' })])).toBeNull()
  })
})

describe('firstResponseForPerson', () => {
  it('measures from FINAL assignment, never from lead creation', () => {
    // The Alabama chain is source -> leadership -> team lead -> agent. Measuring
    // from arrival charges the agent for two routing hops.
    const r = firstResponseForPerson(bundle({
      lead: { personId: 'p1', source: 'Zillow', firstReceivedAt: '2026-08-10T08:00:00.000Z' },
      assignments: [
        assignment({ toUserId: 'u-broker', assignedAt: '2026-08-10T08:00:00.000Z', isFinalAgent: false, releasedAt: '2026-08-10T10:00:00.000Z' }),
        assignment({ toUserId: 'agent-a', assignedAt: '2026-08-10T10:00:00.000Z' }),
      ],
      activities: [act('call', 'outbound', '2026-08-10T10:15:00.000Z')],
    }))
    expect(r.status).toBe('measured')
    if (r.status !== 'measured') return
    // 15 minutes from assignment, not 135 from arrival.
    expect(r.minutes).toBe(15)
  })

  it('reports never_touched — NOT zero — when nobody contacted the lead', () => {
    const r = firstResponseForPerson(bundle())
    expect(r.status).toBe('never_touched')
  })

  it('ignores inbound activity, notes and stage changes', () => {
    const r = firstResponseForPerson(bundle({
      activities: [
        act('call', 'inbound', '2026-08-10T10:05:00.000Z'),
        act('note', 'system', '2026-08-10T10:06:00.000Z'),
        act('stage_change', 'system', '2026-08-10T10:07:00.000Z'),
      ],
    }))
    expect(r.status).toBe('never_touched')
  })

  it('ignores outbound activity that PREDATES the final assignment', () => {
    // A call made by the previous owner is not this agent's response.
    const r = firstResponseForPerson(bundle({
      activities: [act('call', 'outbound', '2026-08-10T09:00:00.000Z')],
    }))
    expect(r.status).toBe('never_touched')
  })

  it('counts an outbound touch from anyone on the team', () => {
    const r = firstResponseForPerson(bundle({
      activities: [act('text', 'outbound', '2026-08-10T10:30:00.000Z', { userId: 'assistant-1' })],
    }))
    expect(r.status).toBe('measured')
  })

  it('reports no_measurable_assignment for a backfill-only chain', () => {
    const r = firstResponseForPerson(bundle({
      assignments: [assignment({ detectedVia: 'backfill' })],
      activities: [act('call', 'outbound', '2026-08-20T10:00:00.000Z')],
    }))
    expect(r).toEqual({ status: 'no_measurable_assignment', reason: 'backfill_only' })
  })
})

describe('firstResponseReport — RULE 1', () => {
  it('EXCLUDES never-touched leads from the median instead of scoring them 0', () => {
    // Scoring 0 tells a broker the team answers instantly. This is the single
    // most consequential rule on this page.
    const report = firstResponseReport({
      bundles: [
        bundle({ activities: [act('call', 'outbound', '2026-08-10T10:10:00.000Z')] }),
        bundle({ activities: [act('call', 'outbound', '2026-08-10T10:30:00.000Z')] }),
        bundle(),   // never touched
        bundle(),   // never touched
      ],
      window: WINDOW, historyStartedAt: HISTORY,
    })
    expect(report.medianMinutes).toBe(20)   // (10 + 30) / 2, not (10+30+0+0)/4
    expect(report.sampleSize).toBe(2)
    expect(report.neverTouched).toBe(2)
  })

  it('reports null rather than a number when nothing is measurable', () => {
    const report = firstResponseReport({
      bundles: [bundle(), bundle()], window: WINDOW, historyStartedAt: HISTORY,
    })
    expect(report.medianMinutes).toBeNull()
    expect(report.sampleSize).toBe(0)
  })

  it('returns the clamped window so the surface can state its earliest valid date', () => {
    const report = firstResponseReport({
      bundles: [], window: { from: '2026-01-01T00:00:00.000Z', to: NOW }, historyStartedAt: HISTORY,
    })
    expect(report.window.clampedToHistory).toBe(true)
    expect(report.window.from).toBe(HISTORY)
  })

  it('drops leads whose assignment falls outside the clamped window', () => {
    const report = firstResponseReport({
      bundles: [bundle({ assignments: [assignment({ assignedAt: '2026-07-01T00:00:00.000Z' })],
        activities: [act('call', 'outbound', '2026-07-01T00:10:00.000Z')] })],
      window: { from: '2026-01-01T00:00:00.000Z', to: NOW }, historyStartedAt: HISTORY,
    })
    expect(report.sampleSize).toBe(0)
  })
})

// ===========================================================================
// Contact attempts
// ===========================================================================

describe('contactAttempts', () => {
  const activities = [
    act('call', 'outbound', '2026-08-11T10:00:00.000Z', { outcome: 'Left Message' }),
    act('call', 'outbound', '2026-08-11T11:00:00.000Z', { outcome: 'No Answer' }),
    act('call', 'outbound', '2026-08-11T12:00:00.000Z', { outcome: 'Talked' }),
    act('call', 'outbound', '2026-08-11T13:00:00.000Z'),
    act('text', 'outbound', '2026-08-11T14:00:00.000Z'),
    act('email', 'outbound', '2026-08-11T15:00:00.000Z'),
    act('call', 'inbound', '2026-08-11T16:00:00.000Z'),
    act('note', 'system', '2026-08-11T17:00:00.000Z'),
  ]

  it('counts outbound only — an inbound call is not an attempt', () => {
    const r = contactAttempts({ activities, leadCount: 2 })
    expect(r.attempted).toBe(6)
    expect(r.byChannel).toEqual({ call: 4, text: 1, email: 1 })
  })

  it('separates attempted from connected — five voicemails is not five conversations', () => {
    const r = contactAttempts({ activities, leadCount: 2 })
    expect(r.connected).toBe(1)
  })

  it('treats an unset outcome as unclassified, never as connected', () => {
    const r = contactAttempts({ activities, leadCount: 2 })
    expect(r.unclassified).toBe(1)
  })

  it('reports attempts per lead so raw volume does not reward whoever got more leads', () => {
    expect(contactAttempts({ activities, leadCount: 2 }).attemptsPerLead).toBe(3)
    expect(contactAttempts({ activities: [], leadCount: 0 }).attemptsPerLead).toBeNull()
  })
})

// ===========================================================================
// RULE 5 — aggregate first, derive rates second
// ===========================================================================

describe('conversion metrics', () => {
  it('appointment set rate counts distinct people, not appointments', () => {
    const r = appointmentSetRate({
      leadIds: ['p1', 'p2', 'p3', 'p4'],
      appointments: [
        { personId: 'p1', startsAt: '2026-08-20T00:00:00.000Z' },
        { personId: 'p1', startsAt: '2026-08-22T00:00:00.000Z' },
        { personId: 'p2', startsAt: '2026-08-21T00:00:00.000Z' },
      ],
    })
    expect(r).toEqual({ cohort: 4, converted: 2, rate: 0.5 })
  })

  it('does not manufacture a 100% close rate out of one lead and one deal', () => {
    // The demo generator produced exactly this by rounding per cell. Rates are
    // derived once, from the totals.
    const r = leadToContract({
      leadIds: ['p1', 'p2', 'p3'],
      deals: [{ personId: 'p1', stage: 'Under Contract', closedAt: null }],
      contractStages: ['Under Contract'],
    })
    expect(r.cohort).toBe(3)
    expect(r.converted).toBe(1)
    expect(r.rate).toBeCloseTo(1 / 3)
  })

  it('reports null, not 0%, for an empty cohort', () => {
    expect(leadToContract({ leadIds: [], deals: [], contractStages: ['Under Contract'] }).rate)
      .toBeNull()
  })

  it('counts a closing from closedAt even when the stage name is unknown to us', () => {
    const r = leadToClosing({
      leadIds: ['p1', 'p2'],
      deals: [{ personId: 'p1', stage: 'Whatever RCRE Calls It', closedAt: '2026-08-30T00:00:00.000Z' }],
    })
    expect(r.converted).toBe(1)
  })

  it('ignores deals for people outside the cohort', () => {
    const r = leadToClosing({
      leadIds: ['p1'],
      deals: [{ personId: 'p9', stage: null, closedAt: '2026-08-30T00:00:00.000Z' }],
    })
    expect(r.converted).toBe(0)
  })
})

// ===========================================================================
// RULE 3 — time in stage, webhook rows only
// ===========================================================================

describe('timeInStage', () => {
  it('uses ONLY detected_via = webhook rows', () => {
    const r = timeInStage({
      transitions: [
        transition({ fromStage: 'New Lead', secondsInFrom: 3600 }),
        transition({ fromStage: 'New Lead', secondsInFrom: 7200 }),
        // A backfill row cannot carry an interval; even if one appeared, it must
        // not be averaged with measured ones.
        transition({ fromStage: 'New Lead', secondsInFrom: 999_999, detectedVia: 'backfill' }),
      ],
      window: WINDOW, historyStartedAt: HISTORY,
    })
    expect(r.stages).toEqual([{ stage: 'New Lead', medianSeconds: 5400, sampleSize: 2 }])
    expect(r.excludedBackfillRows).toBe(1)
  })

  it('skips rows with no measured interval rather than treating them as zero', () => {
    const r = timeInStage({
      transitions: [transition({ secondsInFrom: null })],
      window: WINDOW, historyStartedAt: HISTORY,
    })
    expect(r.stages).toEqual([])
  })

  it('is forward-only: the clamped window comes back with the result', () => {
    const r = timeInStage({
      transitions: [], window: { from: '2020-01-01T00:00:00.000Z', to: NOW },
      historyStartedAt: HISTORY,
    })
    expect(r.window.clampedToHistory).toBe(true)
  })
})

describe('stageTransitionRate', () => {
  const order = ['New Lead', 'Contacted', 'Active Buyer', 'Under Contract', 'Closed']

  it('counts backward transitions — a fallen-through deal is invisible otherwise', () => {
    const r = stageTransitionRate({
      transitions: [
        transition({ fromStage: 'Under Contract', toStage: 'Active Buyer' }),
        transition({ fromStage: 'Under Contract', toStage: 'Closed' }),
      ],
      stageOrder: order, window: WINDOW, historyStartedAt: HISTORY,
    })
    const row = r.stages.find(s => s.stage === 'Under Contract')!
    expect(row.backward).toBe(1)
    expect(row.forward).toBe(1)
    expect(row.backwardRate).toBe(0.5)
  })

  it('treats a stage outside the configured pipeline as lateral, not as progress', () => {
    const r = stageTransitionRate({
      transitions: [transition({ fromStage: 'Contacted', toStage: 'Some Custom Stage' })],
      stageOrder: order, window: WINDOW, historyStartedAt: HISTORY,
    })
    expect(r.stages[0].lateral).toBe(1)
    expect(r.stages[0].forward).toBe(0)
  })
})

// ===========================================================================
// Pipeline fallout, unanswered leads, overdue follow-ups, agent activity
// ===========================================================================

describe('pipelineFallout', () => {
  const people = [{
    personId: 'p1',
    transitions: [transition({ toStage: 'New Lead', occurredAt: '2026-08-01T00:00:00.000Z' })],
    activities: [] as ActivityRow[],
  }]

  it('will not call it fallout without an RCRE threshold', () => {
    // A 40-day Active Buyer may be perfectly healthy; a 40-day New Lead is not.
    // Only RCRE can say which.
    const r = pipelineFallout({ bundles: people, policies: [], now: NOW, historyStartedAt: HISTORY })
    expect(r.entries[0].classification).toBe('unclassified')
    expect(r.entries[0].thresholdDays).toBeNull()
    expect(r.classified).toBe(0)
  })

  it('classifies as stalled once RCRE sets a threshold and it is exceeded', () => {
    const policy: StageAgingPolicy = {
      id: 'sp1', organizationId: ORG, stage: 'New Lead', maxDays: 7,
      alertAudience: ['team_lead'], isActive: true,
    }
    const r = pipelineFallout({ bundles: people, policies: [policy], now: NOW, historyStartedAt: HISTORY })
    expect(r.entries[0].classification).toBe('stalled')
    expect(r.classified).toBe(1)
  })
})

describe('unansweredLeads', () => {
  it('lists assigned-but-never-contacted leads, aged from assignment', () => {
    const r = unansweredLeads({ bundles: [bundle()], now: '2026-08-10T11:00:00.000Z' })
    expect(r).toHaveLength(1)
    expect(r[0].waitingMinutes).toBe(60)
    expect(r[0].agentUserId).toBe('agent-a')
  })

  it('excludes leads that WERE contacted', () => {
    const r = unansweredLeads({
      bundles: [bundle({ activities: [act('call', 'outbound', '2026-08-10T10:05:00.000Z')] })],
      now: NOW,
    })
    expect(r).toEqual([])
  })

  it('excludes leads with no measurable assignment — we cannot tell, so we do not accuse', () => {
    const r = unansweredLeads({
      bundles: [bundle({ assignments: [assignment({ detectedVia: 'backfill' })] })], now: NOW,
    })
    expect(r).toEqual([])
  })
})

describe('overdueFollowUps', () => {
  it('counts past-due uncompleted tasks per agent', () => {
    const r = overdueFollowUps({
      tasks: [
        { personId: 'p1', assignedUserId: 'agent-a', dueAt: '2026-08-01T00:00:00.000Z', isCompleted: false },
        { personId: 'p2', assignedUserId: 'agent-a', dueAt: '2026-08-02T00:00:00.000Z', isCompleted: false },
        { personId: 'p3', assignedUserId: 'agent-b', dueAt: '2026-08-01T00:00:00.000Z', isCompleted: true },
        { personId: 'p4', assignedUserId: 'agent-b', dueAt: '2026-12-01T00:00:00.000Z', isCompleted: false },
      ],
      now: NOW,
    })
    expect(r.total).toBe(2)
    expect(r.byAgent).toEqual([{ userId: 'agent-a', count: 2 }])
  })

  it('carries its own scope warning — an agent who creates no tasks has none overdue', () => {
    expect(overdueFollowUps({ tasks: [], now: NOW }).scope).toBe('tasks_created_in_fub_only')
  })
})

describe('agentActivity — RULE 6', () => {
  it('credits the agent who held the lead at the time, not the current owner', () => {
    const rows = agentActivity({
      bundles: [bundle({
        assignments: [
          assignment({ toUserId: 'agent-a', assignedAt: '2026-08-01T00:00:00.000Z', releasedAt: '2026-08-10T00:00:00.000Z', isCurrent: false, isFinalAgent: false }),
          assignment({ toUserId: 'agent-b', assignedAt: '2026-08-10T00:00:00.000Z' }),
        ],
        activities: [
          act('call', 'outbound', '2026-08-05T00:00:00.000Z', { userId: 'agent-a' }),
          act('call', 'outbound', '2026-08-06T00:00:00.000Z', { userId: 'agent-a' }),
          act('text', 'outbound', '2026-08-15T00:00:00.000Z', { userId: 'agent-b' }),
        ],
      })],
    })
    expect(rows).toEqual([
      { userId: 'agent-a', calls: 2, texts: 0, emails: 0, total: 2 },
      { userId: 'agent-b', calls: 0, texts: 1, emails: 0, total: 1 },
    ])
  })

  it('excludes inbound activity — volume means outbound effort', () => {
    const rows = agentActivity({
      bundles: [bundle({ activities: [act('call', 'inbound', '2026-08-15T00:00:00.000Z')] })],
    })
    expect(rows).toEqual([])
  })
})

describe('sourcePerformance', () => {
  it('aggregates per source, then derives every rate once', () => {
    const r = sourcePerformance({
      bundles: [
        bundle({ lead: { personId: 'p1', source: 'Zillow', firstReceivedAt: null },
          activities: [act('call', 'outbound', '2026-08-10T10:10:00.000Z')] }),
        bundle({ lead: { personId: 'p2', source: 'Zillow', firstReceivedAt: null },
          assignments: [assignment({ personId: 'p2' })] }),
        bundle({ lead: { personId: 'p3', source: null, firstReceivedAt: null },
          assignments: [assignment({ personId: 'p3' })] }),
      ],
      appointments: [{ personId: 'p1', startsAt: '2026-08-20T00:00:00.000Z' }],
      deals: [{ personId: 'p1', stage: 'Under Contract', closedAt: null }],
      contractStages: ['Under Contract'],
      window: WINDOW, historyStartedAt: HISTORY,
    })
    const zillow = r.sources.find(s => s.source === 'Zillow')!
    expect(zillow.leads).toBe(2)
    expect(zillow.appointmentRate).toBe(0.5)
    expect(zillow.contractRate).toBe(0.5)
    expect(zillow.neverTouched).toBe(1)
    // Response median comes from the ONE touched lead, not from both.
    expect(zillow.medianResponseMinutes).toBe(10)
    expect(zillow.responseSampleSize).toBe(1)
    expect(r.sources.find(s => s.source === 'Unknown')!.leads).toBe(1)
  })
})

// ===========================================================================
// POLICY — the empty case is the point
// ===========================================================================

const compliantBundle = bundle({
  assignments: [assignment({ assignedAt: '2026-08-01T00:00:00.000Z' })],
  activities: [],
})

describe('evaluateFollowUpCompliance — NO POLICY MEANS NO VIOLATIONS', () => {
  it('returns nothing at all when follow_up_policies is empty', () => {
    // RCRE has not defined "required follow-up". A default would mean the system
    // enforces OUR standard against THEIR agents while appearing to enforce
    // theirs. This is the load-bearing assertion in this file.
    expect(evaluateFollowUpCompliance({
      bundles: [compliantBundle], policies: [], now: NOW,
    })).toEqual([])
  })

  it('returns nothing when every policy is inactive', () => {
    const policy: FollowUpPolicy = {
      id: 'fp1', organizationId: ORG, leadCategory: 'new_internet_lead', sourceMatch: null,
      firstAttemptMinutes: 5, minAttempts24h: 3, minAttempts7d: 6,
      requiredChannels: ['call', 'text'], requireDistinctChannels: true,
      nurtureAfterDays: 14, isActive: false, effectiveFrom: '2026-01-01T00:00:00.000Z',
    }
    expect(evaluateFollowUpCompliance({
      bundles: [compliantBundle], policies: [policy], now: NOW,
    })).toEqual([])
  })
})

describe('evaluateFollowUpCompliance — once RCRE sets a standard', () => {
  const policy: FollowUpPolicy = {
    id: 'fp1', organizationId: ORG, leadCategory: 'new_internet_lead', sourceMatch: null,
    firstAttemptMinutes: 5, minAttempts24h: 3, minAttempts7d: 6,
    requiredChannels: ['call', 'text'], requireDistinctChannels: true,
    nurtureAfterDays: 14, isActive: true, effectiveFrom: '2026-01-01T00:00:00.000Z',
  }

  it('flags a lead that was never worked', () => {
    const v = evaluateFollowUpCompliance({ bundles: [compliantBundle], policies: [policy], now: NOW })
    const kinds = v.map(x => x.kind)
    expect(kinds).toContain('first_attempt_missing')
    expect(kinds).toContain('insufficient_attempts_24h')
    expect(kinds).toContain('missing_required_channel')
    expect(kinds).toContain('nurture_overdue')
  })

  it('flags a late first attempt with the observed and required numbers', () => {
    const v = evaluateFollowUpCompliance({
      bundles: [bundle({
        assignments: [assignment({ assignedAt: '2026-08-01T00:00:00.000Z' })],
        activities: [act('call', 'outbound', '2026-08-01T00:30:00.000Z')],
      })],
      policies: [policy], now: NOW,
    })
    const late = v.find(x => x.kind === 'first_attempt_late')!
    expect(late.observed).toBe(30)
    expect(late.required).toBe(5)
    expect(late.detail).toContain("RCRE's standard")
  })

  it('does not fault a lead for a window that has not elapsed yet', () => {
    // A lead assigned two hours ago cannot have failed a 24-hour requirement.
    const v = evaluateFollowUpCompliance({
      bundles: [bundle({
        assignments: [assignment({ assignedAt: '2026-08-31T22:00:00.000Z' })],
        activities: [act('call', 'outbound', '2026-08-31T22:01:00.000Z')],
      })],
      policies: [policy], now: NOW,
    })
    expect(v).toEqual([])
  })

  it('does not fault a lead whose assignment is only backfilled', () => {
    // The clock would start on our connection day, not when the agent received
    // the lead. Faulting them for that would be indefensible.
    const v = evaluateFollowUpCompliance({
      bundles: [bundle({ assignments: [assignment({ detectedVia: 'backfill' })] })],
      policies: [policy], now: NOW,
    })
    expect(v).toEqual([])
  })

  it('is satisfied by a properly worked lead', () => {
    const v = evaluateFollowUpCompliance({
      bundles: [bundle({
        assignments: [assignment({ assignedAt: '2026-08-01T00:00:00.000Z' })],
        activities: [
          act('call', 'outbound', '2026-08-01T00:02:00.000Z'),
          act('text', 'outbound', '2026-08-01T02:00:00.000Z'),
          act('email', 'outbound', '2026-08-01T06:00:00.000Z'),
          act('call', 'outbound', '2026-08-02T00:00:00.000Z'),
          act('call', 'outbound', '2026-08-03T00:00:00.000Z'),
          act('text', 'outbound', '2026-08-05T00:00:00.000Z'),
        ],
      })],
      policies: [policy], now: NOW,
    })
    expect(v).toEqual([])
  })
})

describe('selectFollowUpPolicy', () => {
  const mk = (over: Partial<FollowUpPolicy>): FollowUpPolicy => ({
    id: 'x', organizationId: ORG, leadCategory: 'general', sourceMatch: null,
    firstAttemptMinutes: null, minAttempts24h: null, minAttempts7d: null,
    requiredChannels: null, requireDistinctChannels: false, nurtureAfterDays: null,
    isActive: true, effectiveFrom: '2026-01-01T00:00:00.000Z', ...over,
  })

  it('returns null when nothing is configured', () => {
    expect(selectFollowUpPolicy([], 'Zillow', NOW)).toBeNull()
  })

  it('prefers a source-specific rule over the fallback', () => {
    const specific = mk({ id: 'zillow', sourceMatch: ['Zillow'] })
    const fallback = mk({ id: 'fallback', sourceMatch: null })
    expect(selectFollowUpPolicy([fallback, specific], 'zillow', NOW)!.id).toBe('zillow')
  })

  it('falls back for a source nobody wrote a rule for', () => {
    expect(selectFollowUpPolicy([mk({ id: 'fallback' })], 'Realtor.com', NOW)!.id).toBe('fallback')
  })

  it('ignores a policy that is not yet effective', () => {
    expect(selectFollowUpPolicy(
      [mk({ effectiveFrom: '2027-01-01T00:00:00.000Z' })], 'Zillow', NOW,
    )).toBeNull()
  })

  it('a superseded standard stops firing once its replacement is effective', () => {
    const old = mk({ id: 'old', effectiveFrom: '2026-01-01T00:00:00.000Z' })
    const current = mk({ id: 'current', effectiveFrom: '2026-06-01T00:00:00.000Z' })
    expect(selectFollowUpPolicy([old, current], null, NOW)!.id).toBe('current')
  })
})

describe('evaluateStageAging — NO POLICY MEANS NO ALERTS', () => {
  const person = {
    personId: 'p1',
    transitions: [transition({ toStage: 'New Lead', occurredAt: '2026-08-01T00:00:00.000Z' })],
  }

  it('fires nothing when stage_aging_policies is empty', () => {
    expect(evaluateStageAging({ people: [person], policies: [], now: NOW })).toEqual([])
  })

  it('fires nothing for a stage RCRE has not set a threshold for', () => {
    const policy: StageAgingPolicy = {
      id: 'sp1', organizationId: ORG, stage: 'Active Buyer', maxDays: 3,
      alertAudience: ['agent'], isActive: true,
    }
    expect(evaluateStageAging({ people: [person], policies: [policy], now: NOW })).toEqual([])
  })

  it('fires once the configured threshold is exceeded, with the audience', () => {
    const policy: StageAgingPolicy = {
      id: 'sp1', organizationId: ORG, stage: 'New Lead', maxDays: 7,
      alertAudience: ['agent', 'team_lead'], isActive: true,
    }
    const alerts = evaluateStageAging({ people: [person], policies: [policy], now: NOW })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].audience).toEqual(['agent', 'team_lead'])
    expect(alerts[0].basis).toBe('measured')
    expect(alerts[0].ownerUserId).toBe('agent-a')
  })

  it('does not fire inside the threshold', () => {
    const policy: StageAgingPolicy = {
      id: 'sp1', organizationId: ORG, stage: 'New Lead', maxDays: 90,
      alertAudience: ['agent'], isActive: true,
    }
    expect(evaluateStageAging({ people: [person], policies: [policy], now: NOW })).toEqual([])
  })

  it('marks an age derived from a backfill row as a FLOOR, not a duration', () => {
    // The person may have been sitting there for a year before we existed.
    // Surfaces must say "at least N days".
    const policy: StageAgingPolicy = {
      id: 'sp1', organizationId: ORG, stage: 'New Lead', maxDays: 7,
      alertAudience: ['agent'], isActive: true,
    }
    const alerts = evaluateStageAging({
      people: [{ personId: 'p1', transitions: [transition({
        toStage: 'New Lead', occurredAt: '2026-08-01T00:00:00.000Z', detectedVia: 'backfill',
      })] }],
      policies: [policy], now: NOW,
    })
    expect(alerts[0].basis).toBe('since_connection')
  })
})
