// FUB webhook ingestion.
//
// FUB requires a 2XX within 10 SECONDS or it retries (5 attempts, escalating
// waits, up to 8 hours). So the receive path does the minimum:
//
//   receive → verify signature → persist to ledger → 200 OK
//                                                      ↓ (out of band)
//                                    process → fetch authoritative record → normalize
//
// Two properties this design guarantees:
//
//   IDEMPOTENCY — the ledger has a unique index on (provider, fub_event_id).
//     A duplicate delivery is recorded as a duplicate and never processed twice.
//
//   OUT-OF-ORDER SAFETY — webhook payloads carry only resourceIds, never the
//     record itself. Processing always re-fetches the CURRENT state from FUB,
//     so a stale event can never overwrite newer data. This is why we do not
//     trust the payload body for anything except routing.

import type { FubWebhookPayload } from './types'

export type IngestOutcome =
  | { status: 'accepted'; eventId: string }
  | { status: 'duplicate'; eventId: string }
  | { status: 'rejected'; reason: string }

export interface WebhookLedger {
  /**
   * Insert, or report that this fub_event_id already exists.
   * Implementations rely on the unique index rather than a read-then-write,
   * so concurrent duplicate deliveries cannot both succeed.
   */
  insertIfNew(record: {
    provider: string
    fubEventId: string
    eventType: string
    resourceIds: number[]
    uri: string | null
    payload: unknown
    signatureValid: boolean
  }): Promise<{ inserted: boolean }>
}

export function parseWebhookPayload(raw: string): FubWebhookPayload | null {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return null }
  if (typeof parsed !== 'object' || parsed === null) return null
  const p = parsed as Record<string, unknown>
  if (typeof p.event !== 'string' || p.event.length === 0) return null
  if (typeof p.eventId !== 'string' || p.eventId.length === 0) return null
  const ids = Array.isArray(p.resourceIds)
    ? p.resourceIds.filter((n): n is number => typeof n === 'number')
    : []
  return {
    eventId: p.eventId,
    eventCreated: typeof p.eventCreated === 'string' ? p.eventCreated : new Date().toISOString(),
    event: p.event,
    resourceIds: ids,
    uri: typeof p.uri === 'string' ? p.uri : null,
    data: typeof p.data === 'object' && p.data !== null ? (p.data as Record<string, unknown>) : undefined,
  }
}

/**
 * The fast path. Never fetches from FUB, never touches the domain tables.
 *
 * `signatureValid: false` is persisted rather than dropped: an unverified
 * delivery is evidence worth keeping, and dropping it silently would hide a
 * misconfiguration or an attack. It is recorded but NOT queued for processing.
 */
export async function ingestWebhook(
  rawBody: string,
  signatureValid: boolean,
  ledger: WebhookLedger,
): Promise<IngestOutcome> {
  const payload = parseWebhookPayload(rawBody)
  if (!payload) return { status: 'rejected', reason: 'malformed payload' }

  const { inserted } = await ledger.insertIfNew({
    provider: 'fub',
    fubEventId: payload.eventId,
    eventType: payload.event,
    resourceIds: payload.resourceIds,
    uri: payload.uri,
    payload,
    signatureValid,
  })

  return inserted
    ? { status: 'accepted', eventId: payload.eventId }
    : { status: 'duplicate', eventId: payload.eventId }
}

// ---------------------------------------------------------------------------
// Event routing
// ---------------------------------------------------------------------------

export type ResourceKind =
  | 'people' | 'notes' | 'tasks' | 'appointments' | 'deals'
  | 'calls' | 'textMessages' | 'emails' | 'emEvents' | 'unknown'

/**
 * Which FUB resource an event refers to, and whether it is a deletion.
 * Deletions are handled by soft-marking locally — we never hard-delete
 * RCRE-owned derived data because of a remote event.
 */
export function routeEvent(eventType: string): { kind: ResourceKind; deleted: boolean } {
  const deleted = /Deleted$/.test(eventType)
  const kind: ResourceKind =
    eventType.startsWith('people') ? 'people'
    : eventType.startsWith('notes') ? 'notes'
    : eventType.startsWith('tasks') ? 'tasks'
    : eventType.startsWith('appointments') ? 'appointments'
    : eventType.startsWith('deals') ? 'deals'
    : eventType.startsWith('calls') ? 'calls'
    : eventType.startsWith('textMessages') ? 'textMessages'
    : eventType.startsWith('emails') ? 'emails'
    : eventType.startsWith('emEvents') ? 'emEvents'
    : 'unknown'
  return { kind, deleted }
}

/** Events the MVP acts on. Anything else is recorded and skipped. */
/**
 * The events this ingestion path will act on.
 *
 * This list is the code half of a commitment made to RCRE in writing — see
 * 08-mvp/FUB-EVENT-SUBSCRIPTION-SET.md, which justifies each subscription
 * against a leadership metric, and the activation checklist §8, which tells
 * RCRE what we will never store.
 *
 * NOTES ARE DELIBERATELY ABSENT. Notes are where agents write candid things
 * about clients; the checklist promises we do not read them, and an ingestion
 * path that accepts them makes that promise false regardless of what happens
 * downstream. A note is also not evidence of client contact — it is a record of
 * someone thinking — so it would corrupt contact-attempt counts if it were.
 *
 * Deletion events are absent for a different reason: in read-only mode we keep
 * our own history, and a FUB deletion is usually a merge or a mistake.
 * Reconciliation handles genuine removals during periodic sync.
 */
export const SUPPORTED_EVENTS: ReadonlySet<string> = new Set([
  // Person lifecycle — assignment history and the whole funnel rest on these.
  'peopleCreated', 'peopleUpdated', 'peopleStageUpdated',
  // Contact attempts.
  'callsCreated', 'callsUpdated',
  'textMessagesCreated', 'textMessagesUpdated',
  'emailsCreated',
  // Engagement — what the CLIENT did. Kept strictly separate from attempts.
  'emEventsOpened', 'emEventsClicked', 'eventsCreated',
  // Outcomes.
  'appointmentsCreated', 'appointmentsUpdated',
  'dealsCreated', 'dealsUpdated',
  // Accountability.
  'tasksCreated', 'tasksUpdated',
])

export function isSupportedEvent(eventType: string): boolean {
  return SUPPORTED_EVENTS.has(eventType)
}
