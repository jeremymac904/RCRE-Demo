import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { actorOrNull } from '@/lib/platform/auth'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { AcademyCourseCard } from '@/components/AcademyCourseCard'
import { TrainingNav } from '@/components/TrainingNav'
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
import { academyCatalog, academyConfigDurable, academyProgress, orderAcademyCourses } from '@/lib/academy-durable'
import { DurableModuleUnavailable } from '@/components/DurableModuleUnavailable'

export default async function TrainingPage() {
  const user = await currentUser(), actor = await actorOrNull()
  if (!user || !actor) redirect('/login')

  let progress: { completedLessonIds: string[]; lastViewedLessonId?: string }, catalog = courses()
  try { const [savedProgress, config, durable] = await Promise.all([academyProgress(actor), academyConfigDurable(actor), academyCatalog(actor)]); progress = savedProgress; const authored = durable.courses.filter(course => 'source' in course && course.source === 'rcre-authored' && course.state === 'published').map(course => ({ id: course.id, order: course.order, title: course.title, slug: course.id, description: course.description, level: 'Brokerage' as const, lessonCount: durable.lessons.filter(lesson => lesson.courseId === course.id).length, promptCount: 0, resourceCount: 'resources' in course ? course.resources.length : 0, publicPreview: false })); catalog = orderAcademyCourses([...catalog, ...authored], config.order) } catch { return <DurableModuleUnavailable title="Training" detail="The training library is temporarily unavailable. No sample learner progress is shown." /> }
  const overall = overallProgress(progress)
  const next = continueLesson(progress)
  const nextCourse = next ? courseById(next.courseId) : undefined
  const { totals } = ACADEMY
  const preview = catalog.filter(course => course.publicPreview)

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

        <div className="mt-8"><Link href="/training/community" className="btn-quiet">Open Community →</Link></div>

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
