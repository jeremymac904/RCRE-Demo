import Link from 'next/link'

/**
 * Today's plan.
 *
 * Leadership named the three things agents struggle with most: consistent
 * follow-up, organisation, and time blocking. A priority list addresses the
 * first. It does nothing for the other two — knowing you have seven things to
 * do is not the same as knowing when to do them, and for an agent whose problem
 * is organisation, a longer list is the problem rather than the fix.
 *
 * So the same signals that produce the priority list are also arranged into a
 * suggested day. Two deliberate limits:
 *
 *   - It is a SUGGESTION, not a calendar. No availability logic, no conflict
 *     resolution, no two-way sync. Those are real engineering and the concept
 *     has to earn them first.
 *   - Three named actions, capped. The cap is the feature.
 */

export interface Block {
  start: string
  end?: string
  label: string
  detail?: string
  kind: 'fixed' | 'work' | 'admin'
  href?: string
  /** Minutes since midnight. The plan is sorted by this, not by list order. */
  at: number
}

export function DayPlan({
  blocks, topThree,
}: { blocks: Block[]; topThree: { label: string; href?: string }[] }) {
  return (
    <section className="mt-11">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hair pb-2.5">
        <h2 className="text-label font-semibold uppercase tracking-[0.1em] text-chalk-muted">
          Today&rsquo;s plan
        </h2>
        <span className="text-micro tracking-normal text-chalk-faint">
          Built from your pipeline · yours to change
        </span>
      </div>

      <ol className="mt-5 space-y-px">
        {[...blocks].sort((a, b) => a.at - b.at).map((b, i) => {
          const body = (
            <>
              <span className="w-[6.5rem] shrink-0 pt-0.5 text-label tabular text-chalk-faint">
                {b.start}{b.end ? `–${b.end}` : ''}
              </span>
              <span
                aria-hidden
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  b.kind === 'fixed' ? 'bg-brass-fill'
                    : b.kind === 'work' ? 'bg-signal-calm'
                    : 'bg-hair-strong'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-body text-chalk">{b.label}</span>
                {b.detail && (
                  <span className="block text-label text-chalk-faint">{b.detail}</span>
                )}
              </span>
              {b.href && (
                <span aria-hidden className="hidden shrink-0 self-center text-label text-chalk-faint
                                             transition-all group-hover:translate-x-0.5
                                             group-hover:text-brass sm:block">
                  Open →
                </span>
              )}
            </>
          )
          return (
            <li key={i}>
              {b.href ? (
                <Link href={b.href}
                      className="group -mx-3 flex gap-3.5 rounded-control px-3 py-3
                                 transition-colors duration-150 hover:bg-ink-elevated">
                  {body}
                </Link>
              ) : (
                <span className="-mx-3 flex gap-3.5 px-3 py-3">{body}</span>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-7 rounded-panel border border-hair-brass bg-brass-fill/[0.08] p-5">
        <p className="eyebrow text-brass">If you only do three things</p>
        <ol className="mt-4 space-y-2.5">
          {topThree.map((t, i) => (
            <li key={i} className="flex gap-3.5 text-body text-chalk">
              <span aria-hidden className="shrink-0 font-display text-body font-600 text-brass">
                {i + 1}
              </span>
              {t.href
                ? <Link href={t.href} className="transition-colors hover:text-brass">{t.label}</Link>
                : <span>{t.label}</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
