// Assignment history derivation.
//
// FUB HAS NO ASSIGNMENT EVENT. There is no `peopleAssigned`, and no endpoint
// returns who held a person before the current owner. The only way to learn
// that ownership moved is to diff `assignedUserId` on a `peopleUpdated`
// delivery against the value we already stored.
//
// That makes `peopleUpdated` the noisiest subscription we take: it fires on any
// change to a person — a tag, a phone number, a note count. The overwhelming
// majority are no-ops for our purposes and MUST be discarded before anything
// expensive happens, which is why `hasAssignmentChanged` is a plain integer
// comparison and is checked first. Here efficiency is a correctness concern:
// spending the rate-limit budget on no-ops starves the resolve calls that
// carry real events.
//
// WHY THIS TABLE EXISTS AT ALL: response time is measured from the moment the
// FINAL agent received the lead, not from when it arrived at the brokerage.
// The Alabama chain is source -> leadership -> team lead -> agent, and charging
// the agent for the two routing hops above them would be a fairness failure
// dressed up as a metric.
//
// Pure functions. No I/O, no network, no clock.

import type { AssignmentHistoryRow, AssignmentReason, DetectedVia, UserRole } from '@/lib/domain-types'

/** Who a FUB user id resolves to, and what they are. Resolved by the caller. */
export interface AssignmentActor {
  userId: string | null
  role: UserRole | null
  /** False when the user has been deactivated in FUB — the offboarding signal. */
  isActive?: boolean
}

export type AssignmentChange =
  | { kind: 'no_op' }
  | { kind: 'changed'; closed: AssignmentHistoryRow | null; opened: AssignmentHistoryRow }

/** Roles that route a lead onward rather than work it. */
const ROUTING_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['owner', 'broker', 'staff'])

/** Roles that are expected to actually work a lead. */
const WORKING_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['agent'])

/**
 * The cheap discard. Called on every `peopleUpdated` before anything else.
 *
 * Deliberately compares the FUB user id rather than the resolved RCRE user, so
 * it needs no lookup and no allocation. Unassignment (a value going to null)
 * IS a change — a lead falling back to the pond is exactly the event leadership
 * wants visible.
 */
export function hasAssignmentChanged(
  storedFubUserId: number | null | undefined,
  incomingFubUserId: number | null | undefined,
): boolean {
  return (storedFubUserId ?? null) !== (incomingFubUserId ?? null)
}

/**
 * Infer WHY ownership moved, from the roles either side of the hop.
 *
 * ⚠ HEURISTIC. The timestamps in assignment_history are facts observed from
 * webhooks. This value is a guess: FUB tells us the new owner and nothing about
 * the actor, the intent, or the mechanism. It exists so the Alabama routing
 * chain is legible in a report, and it must never be presented to leadership as
 * something the CRM recorded. Anything the roles cannot explain returns
 * 'unknown' rather than the most likely-looking label.
 */
export function inferAssignmentReason(input: {
  from: AssignmentActor | null
  to: AssignmentActor | null
  isInitialReceipt: boolean
  fromPondId?: number | null
  /** True when the caller has independent evidence FUB's lead flow did the assigning. */
  viaLeadFlow?: boolean
}): AssignmentReason {
  const { from, to, isInitialReceipt } = input

  // A lead claimed out of a pond is unambiguous: we were told the pond id.
  if (input.fromPondId != null && to?.userId) return 'pond_claim'

  if (isInitialReceipt || !from || from.userId === null) {
    // FUB's lead flow distributes on arrival; we only call it round robin when
    // the caller says so, because "arrived already assigned" looks identical.
    return input.viaLeadFlow ? 'round_robin' : 'initial'
  }

  // A hop away from a deactivated user is an offboarding sweep, not a decision
  // about this lead. Checked before role inference — the role is stale by then.
  if (from.isActive === false) return 'agent_offboarded'

  if (from.role && ROUTING_ROLES.has(from.role)) return 'leadership_routed'
  if (from.role === 'team_lead') return 'team_lead_distributed'
  if (from.role && WORKING_ROLES.has(from.role)) return 'manual_reassignment'

  return 'unknown'
}

export interface AssignmentDiffInput {
  organizationId: string
  personId: string
  storedFubUserId: number | null
  incomingFubUserId: number | null
  occurredAt: string
  /** Resolve a FUB user id to an RCRE user and role. Returns null for unknown ids. */
  resolveUser: (fubUserId: number | null) => AssignmentActor | null
  /** The currently-open row for this person, if we have one. */
  currentRow?: AssignmentHistoryRow | null
  teamId?: string | null
  assignedPondId?: number | null
  viaLeadFlow?: boolean
  detectedVia?: DetectedVia
}

/**
 * Diff a `peopleUpdated` delivery into an assignment_history change.
 *
 * Returns `no_op` for the common case, having done one integer comparison.
 * On a real change it returns both halves of the write: the prior row closed
 * with a `releasedAt`, and the new row opened. Storing the release on the prior
 * row means "how long did this person hold it" is a subtraction rather than a
 * window function.
 */
export function deriveAssignmentChange(input: AssignmentDiffInput): AssignmentChange {
  if (!hasAssignmentChanged(input.storedFubUserId, input.incomingFubUserId)) {
    return { kind: 'no_op' }
  }
  const at = new Date(input.occurredAt)
  if (Number.isNaN(at.getTime())) return { kind: 'no_op' }
  const occurredAt = at.toISOString()

  const from = input.resolveUser(input.storedFubUserId ?? null)
  const to = input.resolveUser(input.incomingFubUserId ?? null)
  const isInitialReceipt = input.currentRow == null && (input.storedFubUserId ?? null) === null

  const reason = inferAssignmentReason({
    from,
    to,
    isInitialReceipt,
    fromPondId: input.assignedPondId ?? null,
    viaLeadFlow: input.viaLeadFlow,
  })

  const opened: AssignmentHistoryRow = {
    organizationId: input.organizationId,
    personId: input.personId,
    fromUserId: from?.userId ?? null,
    toUserId: to?.userId ?? null,
    fromFubUserId: input.storedFubUserId ?? null,
    toFubUserId: input.incomingFubUserId ?? null,
    reason,
    teamId: input.teamId ?? null,
    assignedPondId: input.assignedPondId ?? null,
    assignedAt: occurredAt,
    releasedAt: null,
    isCurrent: true,
    isInitialReceipt,
    // Provisional. A hop to a working role is final until something follows it;
    // markFinalAgent recomputes over the whole chain when it is read back.
    isFinalAgent: to?.role != null && WORKING_ROLES.has(to.role),
    detectedVia: input.detectedVia ?? 'webhook',
  }

  const closed: AssignmentHistoryRow | null = input.currentRow
    ? { ...input.currentRow, releasedAt: occurredAt, isCurrent: false, isFinalAgent: false }
    : null

  return { kind: 'changed', closed, opened }
}

/**
 * Recompute `isFinalAgent` over a person's whole chain.
 *
 * The final agent is the most recent hop to someone expected to work the lead.
 * When no hop ever reached a working role — a lead that stopped at a team lead
 * who kept it, or one still sitting with leadership — the most recent row is
 * final, because response time still has to be attributed to whoever holds it.
 * Returning nothing there would silently drop those leads out of the metric.
 */
export function markFinalAgent(
  rows: readonly AssignmentHistoryRow[],
  roleOf: (row: AssignmentHistoryRow) => UserRole | null,
): AssignmentHistoryRow[] {
  const ordered = [...rows].sort((a, b) => a.assignedAt.localeCompare(b.assignedAt))
  if (ordered.length === 0) return []

  let finalIndex = -1
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const role = roleOf(ordered[i])
    if (role != null && WORKING_ROLES.has(role)) { finalIndex = i; break }
  }
  if (finalIndex === -1) finalIndex = ordered.length - 1

  return ordered.map((row, i) => ({ ...row, isFinalAgent: i === finalIndex }))
}

/**
 * The row written during backfill for a person's owner as found on connection
 * day.
 *
 * `assignedAt` is the observation time, not the moment they received it — FUB
 * cannot tell us that. Marked 'backfill' so response-time reporting can refuse
 * to measure against it; a clock started on connection day would report every
 * pre-existing lead as answered in seconds or never.
 */
export function backfillAssignmentSnapshot(input: {
  organizationId: string
  personId: string
  fubUserId: number | null
  userId: string | null
  observedAt: string
  teamId?: string | null
}): AssignmentHistoryRow | null {
  const at = new Date(input.observedAt)
  if (Number.isNaN(at.getTime())) return null
  return {
    organizationId: input.organizationId,
    personId: input.personId,
    fromUserId: null,
    toUserId: input.userId,
    fromFubUserId: null,
    toFubUserId: input.fubUserId,
    reason: 'unknown',
    teamId: input.teamId ?? null,
    assignedPondId: null,
    assignedAt: at.toISOString(),
    releasedAt: null,
    isCurrent: true,
    isInitialReceipt: false,
    isFinalAgent: true,
    detectedVia: 'backfill',
  }
}
