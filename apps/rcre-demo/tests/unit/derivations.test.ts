import { describe, expect, it } from 'vitest'
import {
  backfillStageSnapshot, deriveStageTransition, measuredSecondsInStage, nextStoredState,
  type StoredStageState,
} from '@/lib/fub/stageHistory'
import {
  backfillAssignmentSnapshot, deriveAssignmentChange, hasAssignmentChanged,
  inferAssignmentReason, markFinalAgent, type AssignmentActor,
} from '@/lib/fub/assignmentHistory'
import type { AssignmentHistoryRow, UserRole } from '@/lib/domain-types'

const ORG = 'org-1'
const PERSON = 'person-1'

const stored = (over: Partial<StoredStageState> = {}): StoredStageState => ({
  stage: 'New Lead', stageId: 1, enteredAt: '2026-08-01T00:00:00.000Z',
  detectedVia: 'webhook', ...over,
})

// ===========================================================================
// Stage history
// ===========================================================================

describe('deriveStageTransition', () => {
  it('produces a transition with from, to, owner and the measured interval', () => {
    const t = deriveStageTransition({
      organizationId: ORG, personId: PERSON,
      previous: stored(),
      toStage: 'Contacted', toStageId: 2,
      occurredAt: '2026-08-03T00:00:00.000Z',
      ownerUserId: 'user-a', teamId: 'team-1',
    })
    expect(t).not.toBeNull()
    expect(t!.fromStage).toBe('New Lead')
    expect(t!.toStage).toBe('Contacted')
    expect(t!.ownerUserId).toBe('user-a')
    expect(t!.teamId).toBe('team-1')
    expect(t!.secondsInFrom).toBe(2 * 86_400)
    expect(t!.detectedVia).toBe('webhook')
  })

  it('returns null when the stage did not actually change', () => {
    // FUB fires peopleStageUpdated on the update, not on a difference. A no-op
    // that produced a row would enter the median as a real, very fast move.
    expect(deriveStageTransition({
      organizationId: ORG, personId: PERSON,
      previous: stored({ stage: 'Contacted' }),
      toStage: 'Contacted',
      occurredAt: '2026-08-03T00:00:00.000Z',
      ownerUserId: 'user-a',
    })).toBeNull()
  })

  it('has a null from_stage and null interval on the first observed stage', () => {
    const t = deriveStageTransition({
      organizationId: ORG, personId: PERSON, previous: null,
      toStage: 'New Lead', occurredAt: '2026-08-03T00:00:00.000Z', ownerUserId: null,
    })
    expect(t!.fromStage).toBeNull()
    expect(t!.secondsInFrom).toBeNull()
  })

  it('rejects an empty stage name and an unusable timestamp instead of guessing', () => {
    const base = { organizationId: ORG, personId: PERSON, previous: null, ownerUserId: null }
    expect(deriveStageTransition({ ...base, toStage: '  ', occurredAt: '2026-08-03T00:00:00Z' })).toBeNull()
    expect(deriveStageTransition({ ...base, toStage: 'Contacted', occurredAt: 'nonsense' })).toBeNull()
  })
})

describe('measuredSecondsInStage — the webhook/backfill distinction', () => {
  it('measures the interval when we observed the entry', () => {
    expect(measuredSecondsInStage(stored(), '2026-08-01T01:00:00.000Z')).toBe(3600)
  })

  it('refuses to measure against a BACKFILL row — we never saw them arrive', () => {
    // This is the whole point of detected_via. A backfill row records the stage
    // as found on connection day; treating that as an entry time would report a
    // year-old lead as having been in the stage for a week.
    expect(measuredSecondsInStage(
      stored({ detectedVia: 'backfill' }), '2026-08-10T00:00:00.000Z',
    )).toBeNull()
  })

  it('returns null, not a negative number, for an out-of-order delivery', () => {
    expect(measuredSecondsInStage(stored(), '2026-07-01T00:00:00.000Z')).toBeNull()
  })

  it('returns null when the previous entry time is unknown', () => {
    expect(measuredSecondsInStage(stored({ enteredAt: null }), '2026-08-03T00:00:00.000Z')).toBeNull()
  })
})

describe('backfillStageSnapshot', () => {
  it('is marked backfill and carries NO interval, permanently', () => {
    const t = backfillStageSnapshot({
      organizationId: ORG, personId: PERSON, stage: 'Active Buyer',
      observedAt: '2026-08-24T00:00:00.000Z', ownerUserId: 'user-a',
    })
    expect(t!.detectedVia).toBe('backfill')
    expect(t!.secondsInFrom).toBeNull()
    expect(t!.fromStage).toBeNull()
  })

  it('a transition following a backfill snapshot still cannot be measured', () => {
    const snap = backfillStageSnapshot({
      organizationId: ORG, personId: PERSON, stage: 'Active Buyer',
      observedAt: '2026-08-24T00:00:00.000Z', ownerUserId: 'user-a',
    })!
    const next = deriveStageTransition({
      organizationId: ORG, personId: PERSON,
      previous: nextStoredState(snap),
      toStage: 'Under Contract', occurredAt: '2026-09-01T00:00:00.000Z', ownerUserId: 'user-a',
    })!
    expect(next.detectedVia).toBe('webhook')
    expect(next.secondsInFrom).toBeNull()
  })

  it('the SECOND webhook transition after a backfill IS measurable', () => {
    const first = deriveStageTransition({
      organizationId: ORG, personId: PERSON,
      previous: stored({ detectedVia: 'backfill' }),
      toStage: 'Contacted', occurredAt: '2026-09-01T00:00:00.000Z', ownerUserId: 'user-a',
    })!
    const second = deriveStageTransition({
      organizationId: ORG, personId: PERSON,
      previous: nextStoredState(first),
      toStage: 'Active Buyer', occurredAt: '2026-09-03T00:00:00.000Z', ownerUserId: 'user-a',
    })!
    expect(second.secondsInFrom).toBe(2 * 86_400)
  })
})

// ===========================================================================
// Assignment history
// ===========================================================================

const ROLES: Record<string, { userId: string; role: UserRole }> = {
  '10': { userId: 'u-owner',  role: 'owner' },
  '11': { userId: 'u-broker', role: 'broker' },
  '12': { userId: 'u-lead',   role: 'team_lead' },
  '13': { userId: 'u-agent',  role: 'agent' },
  '14': { userId: 'u-agent2', role: 'agent' },
}
const resolveUser = (id: number | null): AssignmentActor | null =>
  id == null ? null : ROLES[String(id)] ?? null

describe('hasAssignmentChanged — the cheap no-op discard', () => {
  it('discards the overwhelmingly common no-op', () => {
    // peopleUpdated fires on ANY change to a person. If this were expensive the
    // backfill and the resolve path would starve.
    expect(hasAssignmentChanged(13, 13)).toBe(false)
    expect(hasAssignmentChanged(null, null)).toBe(false)
    expect(hasAssignmentChanged(undefined, null)).toBe(false)
  })

  it('treats unassignment as a real change', () => {
    expect(hasAssignmentChanged(13, null)).toBe(true)
    expect(hasAssignmentChanged(null, 13)).toBe(true)
  })
})

describe('inferAssignmentReason — HEURISTIC, from roles', () => {
  const actor = (role: UserRole | null, userId = 'u', isActive?: boolean): AssignmentActor =>
    ({ userId, role, isActive })

  it('calls the first assignment "initial"', () => {
    expect(inferAssignmentReason({ from: null, to: actor('agent'), isInitialReceipt: true }))
      .toBe('initial')
  })

  it('calls it round_robin only when the caller has evidence of lead flow', () => {
    expect(inferAssignmentReason({
      from: null, to: actor('agent'), isInitialReceipt: true, viaLeadFlow: true,
    })).toBe('round_robin')
  })

  it('reads the Alabama chain: leadership -> team lead -> agent', () => {
    expect(inferAssignmentReason({
      from: actor('broker'), to: actor('team_lead'), isInitialReceipt: false,
    })).toBe('leadership_routed')
    expect(inferAssignmentReason({
      from: actor('team_lead'), to: actor('agent'), isInitialReceipt: false,
    })).toBe('team_lead_distributed')
  })

  it('calls an agent-to-agent hop a manual reassignment', () => {
    expect(inferAssignmentReason({
      from: actor('agent'), to: actor('agent', 'u2'), isInitialReceipt: false,
    })).toBe('manual_reassignment')
  })

  it('recognises a pond claim from the pond id, whatever the roles say', () => {
    expect(inferAssignmentReason({
      from: actor('agent'), to: actor('agent', 'u2'), isInitialReceipt: false, fromPondId: 7,
    })).toBe('pond_claim')
  })

  it('prefers offboarding over role inference when the prior user is deactivated', () => {
    expect(inferAssignmentReason({
      from: actor('agent', 'u1', false), to: actor('agent', 'u2'), isInitialReceipt: false,
    })).toBe('agent_offboarded')
  })

  it('returns unknown rather than the most likely-looking label', () => {
    // The timestamps are facts; the reason is a guess. A guess we cannot
    // support has to look like one in the data.
    expect(inferAssignmentReason({
      from: actor(null), to: actor('agent'), isInitialReceipt: false,
    })).toBe('unknown')
  })
})

describe('deriveAssignmentChange', () => {
  const base = {
    organizationId: ORG, personId: PERSON,
    occurredAt: '2026-08-05T10:00:00.000Z', resolveUser,
  }

  it('returns no_op when assignedUserId is unchanged', () => {
    const r = deriveAssignmentChange({ ...base, storedFubUserId: 13, incomingFubUserId: 13 })
    expect(r.kind).toBe('no_op')
  })

  it('opens the first row as an initial receipt, current and not released', () => {
    const r = deriveAssignmentChange({ ...base, storedFubUserId: null, incomingFubUserId: 11 })
    expect(r.kind).toBe('changed')
    if (r.kind !== 'changed') return
    expect(r.closed).toBeNull()
    expect(r.opened.isInitialReceipt).toBe(true)
    expect(r.opened.isCurrent).toBe(true)
    expect(r.opened.releasedAt).toBeNull()
    expect(r.opened.reason).toBe('initial')
    expect(r.opened.toUserId).toBe('u-broker')
    // The broker routes rather than works, so this is not the response clock.
    expect(r.opened.isFinalAgent).toBe(false)
  })

  it('closes the prior row with releasedAt so holding time is a subtraction', () => {
    const current: AssignmentHistoryRow = {
      organizationId: ORG, personId: PERSON,
      fromUserId: null, toUserId: 'u-lead', fromFubUserId: null, toFubUserId: 12,
      reason: 'leadership_routed', teamId: null, assignedPondId: null,
      assignedAt: '2026-08-05T09:00:00.000Z', releasedAt: null,
      isCurrent: true, isInitialReceipt: false, isFinalAgent: false, detectedVia: 'webhook',
    }
    const r = deriveAssignmentChange({
      ...base, storedFubUserId: 12, incomingFubUserId: 13, currentRow: current,
    })
    if (r.kind !== 'changed') throw new Error('expected a change')
    expect(r.closed!.releasedAt).toBe('2026-08-05T10:00:00.000Z')
    expect(r.closed!.isCurrent).toBe(false)
    expect(r.closed!.isFinalAgent).toBe(false)
    expect(r.opened.reason).toBe('team_lead_distributed')
    expect(r.opened.fromUserId).toBe('u-lead')
    expect(r.opened.isFinalAgent).toBe(true)
  })

  it('records the full Alabama chain across three hops', () => {
    const hop1 = deriveAssignmentChange({ ...base, storedFubUserId: null, incomingFubUserId: 11 })
    if (hop1.kind !== 'changed') throw new Error('hop1')
    const hop2 = deriveAssignmentChange({
      ...base, occurredAt: '2026-08-05T11:00:00.000Z',
      storedFubUserId: 11, incomingFubUserId: 12, currentRow: hop1.opened,
    })
    if (hop2.kind !== 'changed') throw new Error('hop2')
    const hop3 = deriveAssignmentChange({
      ...base, occurredAt: '2026-08-05T12:00:00.000Z',
      storedFubUserId: 12, incomingFubUserId: 13, currentRow: hop2.opened,
    })
    if (hop3.kind !== 'changed') throw new Error('hop3')

    expect([hop1.opened.reason, hop2.opened.reason, hop3.opened.reason])
      .toEqual(['initial', 'leadership_routed', 'team_lead_distributed'])
    // Only the last hop is the agent expected to work it.
    expect([hop1.opened.isFinalAgent, hop2.opened.isFinalAgent, hop3.opened.isFinalAgent])
      .toEqual([false, false, true])
  })

  it('ignores a delivery with an unusable timestamp rather than inventing one', () => {
    expect(deriveAssignmentChange({
      ...base, occurredAt: 'nope', storedFubUserId: null, incomingFubUserId: 13,
    }).kind).toBe('no_op')
  })
})

describe('markFinalAgent', () => {
  const row = (assignedAt: string, toUserId: string): AssignmentHistoryRow => ({
    organizationId: ORG, personId: PERSON,
    fromUserId: null, toUserId, fromFubUserId: null, toFubUserId: null,
    reason: 'unknown', teamId: null, assignedPondId: null,
    assignedAt, releasedAt: null, isCurrent: false,
    isInitialReceipt: false, isFinalAgent: false, detectedVia: 'webhook',
  })
  const roleOf = (r: AssignmentHistoryRow): UserRole | null =>
    r.toUserId === 'u-agent' ? 'agent' : r.toUserId === 'u-lead' ? 'team_lead' : 'broker'

  it('marks the last hop to a working agent, not the last hop overall', () => {
    const rows = markFinalAgent([
      row('2026-08-01T00:00:00.000Z', 'u-broker'),
      row('2026-08-02T00:00:00.000Z', 'u-agent'),
      row('2026-08-03T00:00:00.000Z', 'u-lead'),
    ], roleOf)
    expect(rows.map(r => r.isFinalAgent)).toEqual([false, true, false])
  })

  it('falls back to the most recent row when the lead never reached an agent', () => {
    // Otherwise a lead that stopped with a team lead would silently drop out of
    // the response-time metric entirely.
    const rows = markFinalAgent([
      row('2026-08-01T00:00:00.000Z', 'u-broker'),
      row('2026-08-02T00:00:00.000Z', 'u-lead'),
    ], roleOf)
    expect(rows.map(r => r.isFinalAgent)).toEqual([false, true])
  })

  it('is order-independent — webhooks arrive out of order', () => {
    const a = markFinalAgent([
      row('2026-08-03T00:00:00.000Z', 'u-lead'),
      row('2026-08-02T00:00:00.000Z', 'u-agent'),
      row('2026-08-01T00:00:00.000Z', 'u-broker'),
    ], roleOf)
    expect(a.map(r => r.toUserId)).toEqual(['u-broker', 'u-agent', 'u-lead'])
    expect(a.map(r => r.isFinalAgent)).toEqual([false, true, false])
  })

  it('returns nothing for an empty chain', () => {
    expect(markFinalAgent([], roleOf)).toEqual([])
  })
})

describe('backfillAssignmentSnapshot', () => {
  it('is marked backfill so response time refuses to measure against it', () => {
    const r = backfillAssignmentSnapshot({
      organizationId: ORG, personId: PERSON, fubUserId: 13, userId: 'u-agent',
      observedAt: '2026-08-24T00:00:00.000Z',
    })!
    expect(r.detectedVia).toBe('backfill')
    expect(r.reason).toBe('unknown')
    expect(r.isInitialReceipt).toBe(false)
  })
})
