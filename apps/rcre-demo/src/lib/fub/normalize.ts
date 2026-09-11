// Normalizes FUB records into the RCRE intelligence layer.
//
// FIELD OWNERSHIP (see migration 0001 header):
//   FUB is authoritative for CRM contact data. These functions map FUB -> RCRE.
//   They NEVER produce a FUB write. RCRE-owned timestamps are DERIVED here from
//   activity, never copied from FUB.
//
// Pure functions only — no I/O, no database, no network. That makes the whole
// derivation layer directly unit-testable, which matters because first_touch_at
// cannot be recomputed after the fact if we get it wrong.

import type {
  FubPerson, FubTask, FubAppointment, FubDeal,
  FubCall, FubTextMessage, FubEmail, FubNote,
} from './types'
import type { Activity, ActivityDirection, ActivityKind, Person } from '@/lib/domain-types'

/** Activity input before it is persisted (no id yet). */
export type ActivityDraft = Omit<Activity, 'id'>

const iso = (v: unknown): string | null => {
  if (typeof v !== 'string' || v.length === 0) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/**
 * Map a FUB person onto the FUB-owned columns of an RCRE person.
 *
 * Deliberately returns ONLY FUB-owned fields. RCRE-owned timestamps and
 * intelligence fields are never touched here — that is what stops a webhook
 * replay from clobbering derived state.
 */
export function normalizePerson(
  organizationId: string,
  fub: FubPerson,
  resolveUserId: (fubUserId: number | null | undefined) => string | null,
): Pick<Person,
  | 'organizationId' | 'fubPersonId' | 'firstName' | 'lastName' | 'emails'
  | 'phones' | 'stage' | 'source' | 'assignedUserId' | 'assignedFubUserId'
  | 'tags' | 'price'> & { fubCreatedAt: string | null; fubUpdatedAt: string | null } {
  return {
    organizationId,
    fubPersonId: fub.id,
    firstName: fub.firstName ?? null,
    lastName: fub.lastName ?? null,
    emails: (fub.emails ?? []).map(e => ({ value: e.value, type: e.type })),
    phones: (fub.phones ?? []).map(p => ({ value: p.value, type: p.type })),
    stage: fub.stage ?? null,
    source: fub.source ?? null,
    assignedFubUserId: fub.assignedUserId ?? null,
    assignedUserId: resolveUserId(fub.assignedUserId),
    tags: fub.tags ?? [],
    price: fub.price ?? null,
    fubCreatedAt: iso(fub.created),
    fubUpdatedAt: iso(fub.updated),
  }
}

// ---------------------------------------------------------------------------
// Activity normalization
//
// Direction is the load-bearing decision. Everything the intelligence layer
// does — unanswered leads, first touch, stale contacts — depends on getting
// inbound vs outbound right.
// ---------------------------------------------------------------------------

function direction(isIncoming: unknown): ActivityDirection {
  return isIncoming === true || isIncoming === 1 ? 'inbound' : 'outbound'
}

const base = (organizationId: string, personId: string | null) => ({
  organizationId,
  personId,
  sourceSystem: 'fub',
  metadata: {} as Record<string, unknown>,
})

export function normalizeCall(
  organizationId: string, personId: string | null, userId: string | null, call: FubCall,
): ActivityDraft | null {
  const occurredAt = iso(call.created)
  if (!occurredAt) return null
  return {
    ...base(organizationId, personId),
    userId,
    kind: 'call' as ActivityKind,
    direction: direction(call.isIncoming),
    occurredAt,
    // Summary only. Call notes may contain client detail; we keep the outcome.
    summary: call.outcome ? `Call: ${call.outcome}` : 'Call',
    fubResourceType: 'calls',
    fubResourceId: call.id,
    metadata: { durationSeconds: call.duration ?? null },
  }
}

export function normalizeTextMessage(
  organizationId: string, personId: string | null, userId: string | null, sms: FubTextMessage,
): ActivityDraft | null {
  const occurredAt = iso(sms.created)
  if (!occurredAt) return null
  return {
    ...base(organizationId, personId),
    userId,
    kind: 'text',
    direction: direction(sms.isIncoming),
    occurredAt,
    summary: 'Text message',           // never store the body
    fubResourceType: 'textMessages',
    fubResourceId: sms.id,
    metadata: {},
  }
}

export function normalizeEmail(
  organizationId: string, personId: string | null, userId: string | null, email: FubEmail,
): ActivityDraft | null {
  const occurredAt = iso(email.created)
  if (!occurredAt) return null
  return {
    ...base(organizationId, personId),
    userId,
    kind: 'email',
    direction: direction(email.isIncoming),
    occurredAt,
    summary: email.subject ? `Email: ${email.subject}` : 'Email',
    fubResourceType: 'emails',
    fubResourceId: email.id,
    metadata: {},
  }
}

export function normalizeNote(
  organizationId: string, personId: string | null, userId: string | null, note: FubNote,
): ActivityDraft | null {
  const occurredAt = iso(note.created)
  if (!occurredAt) return null
  return {
    ...base(organizationId, personId),
    userId,
    kind: 'note',
    // A note is an internal record, not contact with the client. It must NOT
    // count as a touch — otherwise "I wrote a note" would satisfy first_touch.
    direction: 'system',
    occurredAt,
    summary: note.subject ? `Note: ${note.subject}` : 'Note',
    fubResourceType: 'notes',
    fubResourceId: note.id,
    metadata: {},
  }
}

export function normalizeAppointmentActivity(
  organizationId: string, personId: string | null, userId: string | null, appt: FubAppointment,
): ActivityDraft | null {
  const occurredAt = iso(appt.start)
  if (!occurredAt) return null
  return {
    ...base(organizationId, personId),
    userId,
    kind: 'appointment',
    direction: 'outbound',
    occurredAt,
    summary: appt.title ? `Appointment: ${appt.title}` : 'Appointment',
    fubResourceType: 'appointments',
    fubResourceId: appt.id,
    metadata: { outcome: appt.outcome ?? null },
  }
}

// ---------------------------------------------------------------------------
// Tasks / appointments / deals
// ---------------------------------------------------------------------------

export function normalizeTask(
  organizationId: string, personId: string | null, assignedUserId: string | null, t: FubTask,
) {
  return {
    organizationId,
    personId,
    assignedUserId,
    fubTaskId: t.id,
    title: t.name ?? 'Task',
    dueAt: iso(t.dueDate),
    isCompleted: t.isCompleted === true,
    completedAt: iso(t.completedDate),
  }
}

export function normalizeAppointment(
  organizationId: string, personId: string | null, assignedUserId: string | null, a: FubAppointment,
) {
  return {
    organizationId,
    personId,
    assignedUserId,
    fubAppointmentId: a.id,
    title: a.title ?? null,
    startsAt: iso(a.start),
    endsAt: iso(a.end),
    location: a.location ?? null,
    outcome: a.outcome ?? null,
  }
}

export function normalizeDeal(
  organizationId: string, personId: string | null, ownerUserId: string | null, d: FubDeal,
) {
  return {
    organizationId,
    personId,
    ownerUserId,
    fubDealId: d.id,
    fubPipelineId: d.pipelineId ?? null,
    name: d.name ?? null,
    stage: d.stageName ?? null,
    price: d.price ?? null,
    projectedCloseOn: d.projectedCloseDate ?? null,
    closedAt: iso(d.closedDate),
    status: d.status ?? null,
  }
}

// ---------------------------------------------------------------------------
// DERIVED TIMESTAMPS — the heart of the intelligence layer
// ---------------------------------------------------------------------------

export interface DerivedTimestamps {
  firstTouchAt: string | null
  lastTouchAt: string | null
  lastInboundAt: string | null
  lastOutboundAt: string | null
  firstAssignedAt: string | null
}

/**
 * Which activity kinds count as a genuine "touch" of the client.
 *
 * Deliberately excludes notes, stage changes, assignments and system events.
 * A note is a record of thinking about someone, not contacting them — counting
 * it would make first-response metrics dishonest, and those metrics are used to
 * evaluate people.
 */
const TOUCH_KINDS: ReadonlySet<ActivityKind> = new Set<ActivityKind>([
  'call', 'text', 'email', 'appointment',
])

export function isTouch(a: Pick<Activity, 'kind' | 'direction'>): boolean {
  return TOUCH_KINDS.has(a.kind) && a.direction !== 'system'
}

/**
 * Derive person timestamps from the full activity set.
 *
 * Order-independent by construction: it scans and takes min/max rather than
 * assuming chronological arrival. Webhooks arrive out of order routinely, so
 * this must never depend on insertion sequence.
 *
 * `existingFirstTouchAt` is honoured as a floor — if we already recorded a
 * first touch, a later backfill of older activity can move it EARLIER but a
 * replay can never move it later or erase it.
 */
export function deriveTimestamps(
  activities: readonly Pick<Activity, 'kind' | 'direction' | 'occurredAt'>[],
  existing?: { firstTouchAt?: string | null; firstAssignedAt?: string | null },
): DerivedTimestamps {
  let firstTouch: string | null = existing?.firstTouchAt ?? null
  let lastTouch: string | null = null
  let lastInbound: string | null = null
  let lastOutbound: string | null = null

  for (const a of activities) {
    if (!a.occurredAt) continue
    const t = a.occurredAt

    if (isTouch(a)) {
      if (a.direction === 'outbound') {
        if (firstTouch === null || t < firstTouch) firstTouch = t
        if (lastOutbound === null || t > lastOutbound) lastOutbound = t
      } else if (a.direction === 'inbound') {
        if (lastInbound === null || t > lastInbound) lastInbound = t
      }
      if (lastTouch === null || t > lastTouch) lastTouch = t
    } else if (a.direction === 'inbound') {
      // Inbound non-touch signals (property views, email opens) still update
      // engagement recency, but never satisfy first_touch.
      if (lastInbound === null || t > lastInbound) lastInbound = t
    }
  }

  const assignments = activities
    .filter(a => a.kind === 'assignment' && a.occurredAt)
    .map(a => a.occurredAt)
    .sort()
  const firstAssigned = existing?.firstAssignedAt ?? assignments[0] ?? null

  return {
    firstTouchAt: firstTouch,
    lastTouchAt: lastTouch,
    lastInboundAt: lastInbound,
    lastOutboundAt: lastOutbound,
    firstAssignedAt: firstAssigned,
  }
}

/**
 * Minutes from lead receipt to first outbound touch.
 * Null when either end is unknown — never guess, and never report zero.
 */
export function firstResponseMinutes(p: Pick<Person, 'firstReceivedAt' | 'firstTouchAt'>): number | null {
  if (!p.firstReceivedAt || !p.firstTouchAt) return null
  const ms = new Date(p.firstTouchAt).getTime() - new Date(p.firstReceivedAt).getTime()
  return ms < 0 ? null : Math.round(ms / 60_000)
}
