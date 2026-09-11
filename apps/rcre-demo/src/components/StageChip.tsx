import type { Stage } from '@/data/demo'

/** Stage colours are muted by design — the stage is context, not the headline. */
const TONE: Record<string, string> = {
  'New Lead':           'border-signal-urgent/35 text-signal-urgent',
  'Attempting Contact': 'border-hair-strong text-chalk-muted',
  'Connected':          'border-hair-strong text-chalk-muted',
  'Appointment':        'border-hair-brass text-brass',
  'Active Buyer':       'border-hair-brass text-brass',
  'Active Seller':      'border-hair-brass text-brass',
  'Under Contract':     'border-signal-calm/40 text-signal-calm',
  'Closed':             'border-hair text-chalk-faint',
  'Long-Term Nurture':  'border-hair text-chalk-faint',
}

export function StageChip({ stage }: { stage: Stage | string }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-micro uppercase ${TONE[stage] ?? 'border-hair text-chalk-faint'}`}>
      {stage}
    </span>
  )
}
