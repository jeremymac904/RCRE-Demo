import { PILLARS } from './PublicPillars'

/**
 * The recruiting-page arrangement of the same six pillars.
 *
 * /join has a reader who is deciding, not browsing, so each pillar carries the
 * extra "in your week" line that the landing page leaves out. The copy itself
 * is imported rather than rewritten — the two public surfaces must never tell
 * different stories about what the brokerage offers.
 */
export function JoinPillars() {
  return (
    <div>
      {PILLARS.map((p, i) => (
        <div
          key={p.name}
          className={`grid gap-4 py-8 lg:grid-cols-12 lg:gap-10 ${i > 0 ? 'border-t border-hair' : ''}`}
        >
          <div className="flex items-baseline gap-4 lg:col-span-5">
            <span className="font-display text-h4 font-600 text-brass-dim">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="text-micro uppercase tracking-[0.16em] text-chalk-faint">{p.name}</p>
              <p className="mt-1 font-display text-h4 font-600 text-chalk">{p.headline}</p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="max-w-prose text-body text-chalk-muted">{p.body}</p>
            <p className="mt-3 flex max-w-prose gap-3 text-body text-chalk">
              <span aria-hidden className="mt-[0.7rem] h-px w-4 shrink-0 bg-brass-fill" />
              <span>{p.week}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
