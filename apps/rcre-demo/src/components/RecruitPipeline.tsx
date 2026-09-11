import Link from 'next/link'
import type { DemoRecruit } from '@/data/demo'

/**
 * The recruiting pipeline, as a pipeline.
 *
 * Recruiting a licensed agent is a courtship with stages, not a list — a
 * prospect who has been "Considering" for a month is a different problem from
 * one who has been "Contacted" for a month, and the shape of the board is what
 * makes that visible. Empty stages are kept rather than collapsed: a pipeline
 * with nothing in Onboarding is telling you something.
 *
 * Columns scroll horizontally on a phone rather than reflowing, because the
 * left-to-right order IS the meaning.
 */
export const RECRUIT_STAGES = [
  'New Prospect', 'Contacted', 'Conversation', 'Meeting', 'Considering', 'Onboarding', 'Joined',
] as const

export function RecruitPipeline({ recruits, from }: { recruits: DemoRecruit[]; from: string }) {
  return (
    <div className="-mx-6 overflow-x-auto px-6 lg:-mx-12 lg:px-12">
      <ol className="flex min-w-max gap-3 pb-1">
        {RECRUIT_STAGES.map(stage => {
          const inStage = recruits.filter(r => r.stage === stage)
          return (
            <li key={stage} className="w-[11.5rem] shrink-0">
              <div className="flex items-baseline justify-between gap-2 border-b border-hair pb-2">
                <span className="text-micro uppercase tracking-[0.1em] text-chalk-faint">{stage}</span>
                <span className={`font-display text-body font-600 ${
                  inStage.length ? 'text-chalk' : 'text-chalk-faint'}`}>
                  {inStage.length}
                </span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {inStage.map(r => (
                  <li key={r.id}>
                    <Link href={`/recruiting/${r.id}?from=${encodeURIComponent(from)}`}
                          className={`block rounded-control border px-2.5 py-2 transition-colors ${
                            r.priority === 'high'
                              ? 'border-hair-brass bg-brass-fill/[0.08] hover:bg-brass-fill/[0.14]'
                              : 'border-hair bg-ink-raised hover:border-hair-strong'}`}>
                      <span className="block truncate text-body text-chalk">{r.name}</span>
                      <span className="block truncate text-micro tracking-normal text-chalk-faint">
                        {r.channel}
                      </span>
                    </Link>
                  </li>
                ))}
                {inStage.length === 0 && (
                  <li className="rounded-control border border-dashed border-hair px-2.5 py-2
                                 text-micro tracking-normal text-chalk-faint">
                    Empty
                  </li>
                )}
              </ul>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
