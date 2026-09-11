import Link from 'next/link'
import { Avatar } from './Avatar'

/**
 * The right rail: what this room is, and who has been in it.
 *
 * PARTICIPATION, NOT POINTS. The reference material this was drawn from runs a
 * points leaderboard with levels and trophies. RCRE is a brokerage, and a
 * scoreboard that ranks colleagues by a number nobody agreed to compete on is
 * the fastest way to make agents stop posting. So this lists two real
 * quantities — lessons finished and posts written — with no rank numbers, no
 * badges and a line saying plainly that it decides nothing.
 */
export function CommunityRail({
  about, leaders,
}: {
  about: { posts: number; categories: number; courses: number; lessons: number }
  leaders: { userId: string; name: string; initials: string; photo?: string;
             lessonsComplete: number; posts: number }[]
}) {
  return (
    <aside className="space-y-10">
      <section>
        <RailHead title="About this community" />
        <p className="mt-3 text-body text-chalk-muted">
          A room for RCRE agents learning to work with AI. Ask the question you think is too basic,
          post the thing that worked, and open your next lesson when you have fifteen
          minutes.
        </p>
        <dl className="mt-4 space-y-2">
          <RailStat label="Posts" value={String(about.posts)} />
          <RailStat label="Categories" value={String(about.categories)} />
          <RailStat label="Curriculum" value={`${about.courses} courses · ${about.lessons} lessons`} />
        </dl>
        <Link href="/training/classroom" className="link-rule mt-5 inline-block">
          Open the Classroom
        </Link>
      </section>

      <section>
        <RailHead title="Learning this month" />
        {leaders.length === 0 && <p className="mt-3 text-body text-chalk-muted">Your course progress and assigned learning are available in the Classroom. No comparative performance is inferred from community activity.</p>}
        <ul className="mt-3 space-y-3">
          {leaders.map(l => (
            <li key={l.userId} className="flex items-center gap-3">
              <Avatar initials={l.initials} photo={l.photo} name={l.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-chalk">{l.name}</p>
                <p className="text-label text-chalk-faint">
                  {l.lessonsComplete} {l.lessonsComplete === 1 ? 'lesson' : 'lessons'} ·{' '}
                  {l.posts} {l.posts === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-micro tracking-normal text-chalk-faint">
          Recognition, not a score. Nothing here affects leads, pay or standing.
        </p>
      </section>
    </aside>
  )
}

function RailHead({ title }: { title: string }) {
  return (
    <h2 className="border-b border-hair pb-2 text-label font-semibold uppercase
                   tracking-[0.1em] text-chalk-muted">
      {title}
    </h2>
  )
}

function RailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-body text-chalk-muted">{label}</dt>
      <dd className="text-body font-medium text-chalk">{value}</dd>
    </div>
  )
}
