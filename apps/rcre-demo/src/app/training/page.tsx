import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { AcademyCourseCard } from '@/components/AcademyCourseCard'
import { TrainingNav } from '@/components/TrainingNav'
import { Avatar } from '@/components/Avatar'
import { POSTS, trainingOfTheDay } from '@/data/community'
import {
  AcademyContinuePanel, AcademyOverallCount,
} from '@/components/AcademyOverviewProgress'
import {
  ACADEMY, continueLesson, courseById, courses, overallProgress,
} from '@/lib/academy'
import type { AcademyCourse } from '@/data/academy-types'

export const dynamic = 'force-dynamic'

/**
 * RCRE Academy — home.
 *
 * DRIVEN BY REAL CURRICULUM, NOT BY PLACEHOLDERS. Every course and lesson on
 * this screen originates in Jeremy's AI Advantage workspace and reaches the UI
 * through one module boundary, `@/lib/academy`. That is what makes the
 * recruiting claim checkable: an agent can open a course and find that it is
 * genuinely written.
 *
 * DELIBERATELY NOT AN LMS. No enrolment, no quizzes, no certificates, no
 * discussion. Leadership named three functions that matter and an oversized
 * course platform is not one of them. What this screen owes an agent is
 * narrow — where I left off, what I have finished, what to open next.
 *
 * THE HONEST TOTALS BLOCK IS NOT DECORATION. The curriculum is written and the
 * videos are not recorded yet. Saying so once, at the top, is what lets every
 * lesson below be calm about it instead of each one apologising.
 */

/** Grouping gives the catalog a shape — foundation, then practice, then the
 *  advanced work — without building a curriculum engine to derive it. */
export default async function TrainingPage() {
  const user = await currentUser()
  if (!user) redirect('/login')

  const catalog = courses()
  const overall = overallProgress()
  const next = continueLesson()
  const nextCourse = next ? courseById(next.courseId) : undefined
  const { totals } = ACADEMY
  const preview = catalog.filter(c => c.publicPreview)
  const featured = trainingOfTheDay()
  // Newest first. The overview shows the last few things that happened in the
  // room, not the whole feed — the point is to make Training feel inhabited,
  // then get out of the way.
  const recent = [...POSTS].sort((a, b) => a.agoHours - b.agoHours).slice(0, 4)
  const ago = (h: number) =>
    h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-14">
        <PageHeader
          eyebrow="RCRE AI Academy"
          title="Training"
          sub="Short, practical courses. Nothing theoretical, nothing you cannot use the same week."
          action={<AcademyOverallCount fallback={{ done: overall.done, total: overall.total }} />}
        />

        <TrainingNav active="overview" />

        {/* Continue learning, from the live browser record rather than the
            server seed — see AcademyOverviewProgress for why that matters. */}
        <AcademyContinuePanel
          fallback={next && nextCourse ? {
            lessonId: next.id,
            courseId: next.courseId,
            title: next.title,
            description: next.description,
            order: next.order,
            courseTitle: nextCourse.title,
            lessonCount: nextCourse.lessonCount,
          } : null}
        />

        {/* Today's training, and the room it came from. This is the bridge:
            the community post and the lesson are the same thing seen from two
            sides, so an agent who reads the post lands in the Classroom. */}
        {featured && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between gap-4 border-b border-hair pb-3">
              <h2 className="eyebrow">Today in the community</h2>
              <Link href="/training/community" className="btn-quiet">Open Community →</Link>
            </div>

            <Link
              href={`/training/classroom/${featured.lesson.courseId}/${featured.lesson.id}`}
              className="group mt-5 flex flex-col gap-4 rounded-panel border border-hair-brass
                         bg-brass-fill/[0.08] p-5 transition-colors hover:bg-brass-fill/[0.13]
                         sm:flex-row sm:items-center"
            >
              {featured.lesson.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.lesson.image} alt="" aria-hidden
                     className="h-24 w-full rounded-control object-cover sm:w-40" loading="lazy" />
              )}
              <span className="min-w-0 flex-1">
                <span className="eyebrow text-brass">AI Training of the Day</span>
                <span className="mt-1.5 block font-display text-h4 font-600 text-chalk
                                 group-hover:text-brass">
                  {featured.lesson.title}
                </span>
                <span className="mt-1 block text-label text-chalk-faint">
                  {featured.course?.title} · posted by {featured.post.authorName}
                </span>
              </span>
              <span aria-hidden className="hidden shrink-0 text-label text-chalk-faint
                                           transition-all group-hover:translate-x-0.5
                                           group-hover:text-brass sm:block">
                Open lesson →
              </span>
            </Link>

            <ul className="mt-5 divide-y divide-hair">
              {recent.map(post => (
                <li key={post.id}>
                  <Link href={`/training/community?post=${post.id}`}
                        className="group -mx-3 flex items-start gap-3.5 rounded-control px-3 py-3
                                   transition-colors hover:bg-ink-elevated">
                    <Avatar initials={post.initials} photo={post.photo} name={post.authorName} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-chalk group-hover:text-brass">
                        {post.title}
                      </span>
                      <span className="block truncate text-label text-chalk-faint">
                        {post.authorName} · {post.category} · {ago(post.agoHours)}
                        {post.comments.length > 0 &&
                          ` · ${post.comments.length} ${post.comments.length === 1 ? 'reply' : 'replies'}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Where to go next, rather than a second copy of the catalog. */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4 border-b border-hair pb-3">
            <h2 className="eyebrow">The classroom</h2>
            <Link href="/training/classroom" className="btn-quiet">All {totals.courses} courses →</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {(nextCourse ? [nextCourse, ...catalog.filter(c => c.id !== nextCourse.id)] : catalog)
              .slice(0, 2)
              .map(c => <AcademyCourseCard key={c.id} course={c} />)}
          </div>
        </section>

        {/* The recruiting connection. Which courses may be shown publicly is a
            property of the course data (`publicPreview`), not a decision this
            screen gets to make — paid lesson content must not leak onto public
            surfaces just because a marketing page wanted something to show. */}
        {preview.length > 0 && (
          <section className="mt-12 rounded-panel border border-hair bg-ink-raised p-6 shadow-panel">
            <p className="eyebrow mb-2">Why some of this is public</p>
            <h2 className="max-w-2xl font-display text-h4 font-600 text-chalk">
              {preview.map(c => c.title).join(' and ')}{' '}
              {preview.length === 1 ? 'is' : 'are'} previewed to agents who do not work here.
            </h2>
            <p className="mt-3 max-w-prose text-body text-chalk-muted">
              It is the front door. An agent looks at the curriculum because they want the skill,
              sees how RCRE works while they are in it, and decides in their own time. That is a
              better first conversation than a cold recruiting call, and it starts with someone
              you already know.
            </p>
            <Link href="/join" className="link-rule mt-5 inline-block">
              See what a prospect reads
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  )
}
