import Link from 'next/link'
import { Avatar } from './Avatar'

/**
 * Secondary attention items.
 *
 * Rows, not cards — so they read as a list to work through rather than as
 * peers of the priority item above them.
 */
export function AttentionRow({
  href, initials, title, meta, reason, tone = 'neutral', action,
}: {
  href: string
  initials?: string
  title: string
  meta: string
  reason: string
  tone?: 'urgent' | 'warm' | 'neutral'
  action?: string
}) {
  const dot = {
    urgent: 'bg-signal-urgent',
    warm: 'bg-brass-fill',
    neutral: 'bg-chalk-faint/50',
  }[tone]

  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-control px-3 py-3.5 transition-colors
                 duration-150 hover:bg-ink-raised -mx-3"
    >
      {initials
        ? <Avatar initials={initials} size="sm" />
        : <span aria-hidden className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-body font-medium text-chalk">{title}</span>
          <span className="text-label text-chalk-faint">{meta}</span>
        </span>
        <span className="mt-0.5 block text-body text-chalk-muted">{reason}</span>
      </span>

      <span aria-hidden
            className="mt-0.5 hidden shrink-0 text-label text-chalk-faint transition-all
                       duration-150 group-hover:translate-x-0.5 group-hover:text-brass sm:block">
        {action ?? 'Open'} →
      </span>
    </Link>
  )
}
