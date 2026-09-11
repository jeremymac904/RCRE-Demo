// Stage history derivation.
//
// FUB exposes a person's CURRENT stage and nothing else. There is no endpoint
// that returns when the stage changed or what it changed from, so the interval
// exists only in the moment `peopleStageUpdated` fires. Miss it and it is gone
// permanently — this file is the whole of RCRE's funnel-timing evidence.
//
// The distinction that governs everything here:
//
//   detectedVia 'webhook'  — we saw the person enter the stage and leave it.
//                            `secondsInFrom` is a MEASURED interval.
//   detectedVia 'backfill' — we found the person sitting in a stage on
//                            connection day. We never saw them enter it, so
//                            `secondsInFrom` is null and stays null.
//
// Reporting must exclude backfill rows from time-in-stage. Mixing them would
// average measured intervals with assumed ones and produce a number nobody can
// defend. See RCRE-REPORTING-DATA-MODEL.md §8.
//
// Pure functions. No I/O, no network, no clock.

import type { DetectedVia, StageTransition } from '@/lib/types'

/** What we already believe about a person's stage, read from our own history. */
export interface StoredStageState {
  stage: string | null
  stageId: number | null
  /**
   * When the person entered `stage`, as WE observed it. Null when the entry was
   * never observed (the person was already in this stage at connection).
   */
  enteredAt: string | null
  /** How we learned about `stage`. A backfilled stage has no trustworthy entry. */
  detectedVia: DetectedVia
}

export interface StageChangeInput {
  organizationId: string
  personId: string
  previous: StoredStageState | null
  toStage: string
  toStageId?: number | null
  occurredAt: string
  /** Owner AT THE TIME of the change — resolved by the caller, not looked up later. */
  ownerUserId: string | null
  teamId?: string | null
}

const isoMs = (v: string | null | undefined): number | null => {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * Seconds spent in the stage being left.
 *
 * Returns null in three cases, all of which mean "we do not know" rather than
 * "zero":
 *   - we never observed entry into the previous stage;
 *   - the previous stage itself came from backfill, so its entry time is the
 *     day we connected rather than the day the person arrived there;
 *   - the arithmetic is negative, which means clock skew or an out-of-order
 *     delivery, not a negative duration.
 */
export function measuredSecondsInStage(
  previous: StoredStageState | null,
  occurredAt: string,
): number | null {
  if (!previous || previous.detectedVia !== 'webhook') return null
  const from = isoMs(previous.enteredAt)
  const to = isoMs(occurredAt)
  if (from === null || to === null) return null
  const seconds = Math.round((to - from) / 1000)
  return seconds < 0 ? null : seconds
}

/**
 * Turn a `peopleStageUpdated` delivery into a stage_transitions row.
 *
 * Returns null when the stage did not actually change. FUB fires the event on
 * the update, not on a difference, and a re-delivered or no-op event that
 * produced a row would show as a transition with zero time in stage — which
 * would then be averaged into the median as a real, very fast move.
 */
export function deriveStageTransition(input: StageChangeInput): StageTransition | null {
  const toStage = input.toStage?.trim()
  if (!toStage) return null
  if (input.previous && input.previous.stage === toStage) return null
  if (isoMs(input.occurredAt) === null) return null

  return {
    organizationId: input.organizationId,
    personId: input.personId,
    fromStage: input.previous?.stage ?? null,
    toStage,
    fromStageId: input.previous?.stageId ?? null,
    toStageId: input.toStageId ?? null,
    ownerUserId: input.ownerUserId,
    teamId: input.teamId ?? null,
    occurredAt: new Date(input.occurredAt).toISOString(),
    secondsInFrom: measuredSecondsInStage(input.previous ?? null, input.occurredAt),
    detectedVia: 'webhook',
  }
}

/**
 * The row written during backfill for a person's stage as found on connection
 * day.
 *
 * `fromStage` is null and `secondsInFrom` is null, permanently — we did not see
 * them arrive. `occurredAt` is the observation time, NOT an entry time, and it
 * is only usable as "we know they were here by then".
 */
export function backfillStageSnapshot(input: {
  organizationId: string
  personId: string
  stage: string
  stageId?: number | null
  observedAt: string
  ownerUserId: string | null
  teamId?: string | null
}): StageTransition | null {
  const stage = input.stage?.trim()
  if (!stage) return null
  if (isoMs(input.observedAt) === null) return null
  return {
    organizationId: input.organizationId,
    personId: input.personId,
    fromStage: null,
    toStage: stage,
    fromStageId: null,
    toStageId: input.stageId ?? null,
    ownerUserId: input.ownerUserId,
    teamId: input.teamId ?? null,
    occurredAt: new Date(input.observedAt).toISOString(),
    secondsInFrom: null,
    detectedVia: 'backfill',
  }
}

/** The state to store after a transition, so the next delivery can measure against it. */
export function nextStoredState(t: StageTransition): StoredStageState {
  return {
    stage: t.toStage,
    stageId: t.toStageId,
    enteredAt: t.occurredAt,
    detectedVia: t.detectedVia,
  }
}
