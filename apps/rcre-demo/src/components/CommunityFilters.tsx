import Link from 'next/link'

/**
 * Category filter.
 *
 * Server-rendered links rather than client state, so a filtered view is a real
 * URL an agent can send to somebody. Counts come from the same function the
 * feed reads, so the number on the chip is the number of posts you get.
 *
 * Wraps rather than scrolls. A hidden tenth category is a category nobody
 * clicks, and at 375px a horizontal strip hides four of them.
 */
export function CommunityFilters({
  counts, active,
}: {
  counts: { label: string; count: number }[]
  active?: string
}) {
  const chip = (on: boolean) =>
    `inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem]
     transition-colors duration-150 ${
      on
        ? 'border-hair-strong bg-ink-elevated text-chalk'
        : 'border-hair text-chalk-muted hover:border-hair-strong hover:text-chalk'}`

  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
      <Link href="/training/community" aria-current={!active ? 'page' : undefined}
            className={chip(!active)}>
        All
        <span className="tabular text-[0.6875rem] text-chalk-faint">
          {counts.reduce((n, c) => n + c.count, 0)}
        </span>
      </Link>

      {counts.map(c => {
        const on = c.label === active
        return (
          <Link
            key={c.label}
            href={`/training/community?category=${encodeURIComponent(c.label)}`}
            aria-current={on ? 'page' : undefined}
            className={chip(on)}
          >
            {c.label}
            <span className="tabular text-[0.6875rem] text-chalk-faint">{c.count}</span>
          </Link>
        )
      })}
    </nav>
  )
}
