import type { DemoContact } from '@/data/demo'
import { STAGE_THRESHOLD_DAYS, daysInStage, isStageStale } from '@/data/demo'

/**
 * The two signals that turn a contact list into an accountability tool:
 * what happens next, and how long this person has been waiting for it.
 *
 * They live in one file because they are always read together — a next action
 * with no age is a to-do list, and an age with no next action is a complaint.
 */

/** Urgency is carried by colour only at the top of the scale; everything
 *  brass-coloured stops meaning anything. */
const URGENCY_TONE: Record<string, string> = {
  now: 'text-signal-urgent',
  today: 'text-brass',
  'this week': 'text-chalk-muted',
}

export function CrmNextAction({
  contact, className = '',
}: { contact: DemoContact; className?: string }) {
  const action = contact.nextAction
  if (!action) return <span className={`text-body text-chalk-faint ${className}`}>—</span>

  return (
    <span className={`block ${className}`}>
      <span className={`text-body ${URGENCY_TONE[action.urgency] ?? 'text-chalk-muted'}`}>
        {action.label}
      </span>
      <span className="mt-0.5 block text-micro uppercase tracking-[0.1em] text-chalk-faint">
        {action.urgency}
      </span>
    </span>
  )
}

/**
 * Time in stage.
 *
 * Rendered quietly until it crosses the threshold, then in urgent tone — the
 * point of stage aging is the exception, not the number.
 */
export function CrmStageAge({
  contact, className = '',
}: { contact: DemoContact; className?: string }) {
  const days = daysInStage(contact)
  if (days === null) return null
  const stale = isStageStale(contact)
  const limit = STAGE_THRESHOLD_DAYS[contact.stage]

  return (
    <span className={`block text-micro tracking-normal ${
      stale ? 'text-signal-urgent' : 'text-chalk-faint'} ${className}`}>
      {days}d in stage{stale && limit !== undefined ? ` · over the ${limit}d guide` : ''}
    </span>
  )
}

/** Small inline flag for headers, where the age line would be too quiet. */
export function CrmStaleFlag({ contact }: { contact: DemoContact }) {
  if (!isStageStale(contact)) return null
  return (
    <span className="inline-flex shrink-0 rounded-full border border-signal-urgent/40 px-2.5 py-0.5
                     text-micro uppercase text-signal-urgent">
      Sitting too long
    </span>
  )
}

/** Repeated wherever a threshold is shown: RCRE has not set these yet. */
export const STAGE_THRESHOLD_NOTE =
  'Stage thresholds are placeholders — where the line sits is a brokerage policy decision, not a technical one.'
