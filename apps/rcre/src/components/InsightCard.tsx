import type { Insight, Priority } from '@/lib/insights/engine'

const TONE: Record<Priority, string> = {
  high:   'border-l-4 border-l-rose-500',
  medium: 'border-l-4 border-l-amber-500',
  low:    'border-l-4 border-l-slate-300',
}

const LABEL: Record<Priority, string> = {
  high: 'High priority', medium: 'Worth attention', low: 'Low priority',
}

const TYPE_LABEL: Record<Insight['type'], string> = {
  new_lead: 'New lead',
  unanswered_lead: 'Unanswered lead',
  hot_opportunity: 'Hot opportunity',
  quiet_contact: 'Gone quiet',
  stale_contact: 'Stale contact',
  overdue_task: 'Overdue task',
  task_due_today: 'Task due today',
  appointment_today: 'Appointment today',
  stalled_deal: 'Stalled deal',
  closing_anniversary: 'Closing anniversary',
  birthday: 'Birthday',
}

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className={`rounded-lg border border-line bg-white p-4 ${TONE[insight.priority]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">{insight.subject}</h3>
        <span className="text-xs uppercase tracking-wide text-ink-mute">
          {TYPE_LABEL[insight.type]} · {LABEL[insight.priority]}
        </span>
      </div>

      {/* The "why". Every insight explains itself — this is the whole point. */}
      <ul className="mt-3 space-y-1 text-sm text-ink-soft">
        {insight.reasons.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="text-ink-mute">·</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm font-medium text-rcre">
        Recommended: {insight.recommendedAction}
      </p>
    </article>
  )
}
