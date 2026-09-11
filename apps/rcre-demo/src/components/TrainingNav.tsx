import Link from 'next/link'

/**
 * Navigation inside Training.
 *
 * Training is now two rooms — a Community and a Classroom — so it needs its own
 * navigation. This sits INSIDE the page content, beneath the page header; the
 * application sidebar is untouched, because Training is one destination in the
 * operating system rather than a second product.
 *
 * Only tabs that go somewhere real appear here. Resources and Leaderboard live
 * inside Classroom and Community respectively rather than as their own tabs,
 * because a tab that reveals one widget is a worse experience than the widget
 * where it belongs — and an empty tab is worse than both.
 */
const TABS = [
  { href: '/training/manage', label: 'Manage' },
  { href: '/training', label: 'Overview', exact: true },
  { href: '/training/community', label: 'Community' },
  { href: '/training/classroom', label: 'Classroom' },
]

export function TrainingNav({ active }: { active: 'overview' | 'community' | 'classroom' | 'manage' }) {
  return (
    <nav aria-label="Training" className="mt-6 border-b border-hair">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map(t => {
          const key = t.label.toLowerCase() as typeof active
          const on = key === active
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-4 py-2.5 text-label
                            transition-colors duration-150 ${
                  on
                    ? 'border-brass-fill text-chalk'
                    : 'border-transparent text-chalk-muted hover:border-hair-strong hover:text-chalk'
                }`}
              >
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
