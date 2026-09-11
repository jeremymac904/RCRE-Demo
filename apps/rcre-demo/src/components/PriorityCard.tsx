import Link from 'next/link'
import { Avatar } from './Avatar'
import type { DemoContact } from '@/data/demo'
import { fullName } from '@/data/demo'

/**
 * The lead priority card.
 *
 * There is exactly ONE of these on Today — the single most important thing.
 * It is visually unlike anything else on the page, which is what makes the
 * hierarchy read at a glance rather than requiring the eye to compare cards.
 */
export function PriorityCard({ contact }: { contact: DemoContact }) {
  return (
    <article className="relative overflow-hidden rounded-panel border border-hair-brass bg-ink-raised">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brass-fill" />
      <div className="relative p-6 lg:p-7">
        <div className="flex items-start gap-4">
          <Avatar initials={contact.initials} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="font-display text-h3 font-600 text-chalk">{fullName(contact)}</h3>
              <span className="rounded-full border border-hair-brass px-2.5 py-0.5 text-micro uppercase text-brass">
                Highest priority
              </span>
            </div>
            <p className="mt-1 text-label text-chalk-faint">
              {contact.stage} · {contact.source} · {contact.location}
            </p>
          </div>
        </div>

        {/* The "why". This is the product. */}
        <ul className="mt-5 space-y-2">
          {contact.reasons.map((r, i) => (
            <li key={i} className="flex gap-3 text-body text-chalk-muted">
              <span aria-hidden className="mt-[0.7rem] h-[1.5px] w-3 shrink-0 rounded-full bg-brass-fill" />
              <span>{r}</span>
            </li>
          ))}
        </ul>

        {contact.recommendation && (
          <p className="mt-5 border-l-2 border-brass-fill pl-4 text-body text-chalk">
            {contact.recommendation}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={`/assistant?ask=why-dana`} className="btn-primary">Ask RCRE AI why</Link>
          <Link href={`/assistant?ask=draft-dana`} className="btn-ghost">Draft a message</Link>
          <Link href={`/crm/${contact.id}`} className="btn-quiet">Open contact →</Link>
        </div>
      </div>
    </article>
  )
}
