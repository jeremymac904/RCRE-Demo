import { readFileSync } from 'node:fs'
import { academyAssetPath } from '@/lib/academy-media'
import { AcademyLessonTools } from '@/components/AcademyLessonTools'
import { actorOrNull } from '@/lib/platform/auth'
import { courseAllowed } from '@/lib/academy-service'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { BackLink } from '@/components/BackLink'
import { AcademyLessonStage } from '@/components/AcademyLessonStage'
import { AcademyLessonNavigator } from '@/components/AcademyLessonNavigator'
import { AcademyResourceList } from '@/components/AcademyResourceList'
import { AcademyMarkComplete } from '@/components/AcademyMarkComplete'
import { courseById, lessonById, lessonNeighbours } from '@/lib/academy'

export const dynamic = 'force-dynamic'

/**
 * Lesson detail.
 *
 * THE ORDER OF THE PAGE IS THE ARGUMENT. Position in the course, then the
 * lesson's title, then the video — or the lesson's own artwork where filming has
 * not happened yet. Then the lesson in Jeremy's own words, which IS finished. So
 * the page is about what exists rather than about what is missing.
 *
 * TWO COLUMNS ABOVE `lg`, ONE BELOW. The course rail is genuinely useful on a
 * desktop and genuinely in the way on a phone, so the navigator ships both
 * presentations and CSS picks one. The reading column is capped at prose width
 * regardless — a lesson is something you read.
 *
 * NOTHING INTERNAL LEAKS. `sourcePath` is stripped at the module boundary in
 * `@/lib/academy` and never reaches this page; an agent has no use for a
 * production filename and showing one would expose the source tree.
 *
 * A LESSON CANNOT BE OPENED UNDER THE WRONG COURSE. The URL carries both ids,
 * so a mismatched pair 404s rather than rendering a lesson under a course it
 * does not belong to and offering the wrong neighbours.
 */
export default async function LessonPage({
  params,
}: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const user = await currentUser()
  if (!user) redirect('/login')

  const { courseId, lessonId } = await params
  const actor = await actorOrNull()
  if (!actor || !courseAllowed(actor, courseId)) redirect('/training?denied=course')
  const course = courseById(courseId)
  const lesson = lessonById(lessonId)
  if (!course || !lesson || lesson.courseId !== course.id) notFound()

  // Neighbours walk the whole curriculum, so the last lesson of a course leads
  // into the next course rather than dead-ending. Static ordering, so it is
  // resolved here rather than in the browser.
  const { previous, next } = lessonNeighbours(lesson)
  const nextCourse = next && next.courseId !== course.id ? courseById(next.courseId) : undefined

  const promptResource = lesson.resources.find(r => r.kind === 'prompt-pack' && r.href?.endsWith('.md'))
  let prompts: string | undefined
  if (promptResource?.href) { try { prompts = readFileSync(academyAssetPath(promptResource.href), 'utf8') } catch {} }
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12 lg:py-14">
        <div className="mb-8">
          <BackLink fallback={`/training/classroom/${course.id}`} fallbackLabel={course.title} />
        </div>

        <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-14">
          <aside aria-label="Course lessons" className="min-w-0">
            <AcademyLessonNavigator
              courseId={course.id}
              courseTitle={course.title}
              lessonId={lesson.id}
              lessonOrder={lesson.order}
            />
          </aside>

          <article className="min-w-0">
            <header className="mb-6">
              {/* Below `lg` the navigator bar directly above already states
                  position, and saying it twice in fifty pixels reads as a
                  layout mistake rather than as emphasis. */}
              <p className="eyebrow mb-2 hidden lg:block">
                Lesson {lesson.order} of {course.lessonCount}
              </p>
              <h1 className="font-display text-h2 font-600 text-chalk">{lesson.title}</h1>
            </header>

            <AcademyLessonStage lesson={lesson} />
            <AcademyLessonTools lessonId={lesson.id} prompts={prompts} />

            {/* Jeremy's description, verbatim. Rewriting it here would quietly
                fork the curriculum away from its own source of truth. */}
            <section className="mt-10">
              <h2 className="eyebrow mb-3">In this lesson</h2>
              <p className="max-w-prose text-lead text-chalk-muted">{lesson.description}</p>
            </section>

            {lesson.promptCount > 0 && (
              <section className="mt-10 rounded-panel border border-hair bg-ink-raised p-6 shadow-panel">
                <p className="eyebrow mb-2">Prompts</p>
                <p className="max-w-prose text-body text-chalk-muted">
                  <span className="font-display text-h4 font-600 tabular text-chalk">
                    {lesson.promptCount}
                  </span>{' '}
                  {lesson.promptCount === 1 ? 'prompt is' : 'prompts are'} attached to this lesson —
                  written for real estate work, ready to paste into whichever assistant you use.
                  {lesson.resources.some(r => r.kind === 'prompt-pack')
                    ? ' They are in the prompt pack below.'
                    : ' They arrive with the lesson recording.'}
                </p>
              </section>
            )}

            {lesson.resources.length > 0 && (
              <section className="mt-10">
                <h2 className="eyebrow mb-3">Resources</h2>
                <AcademyResourceList resources={lesson.resources} />
              </section>
            )}

            <section className="mt-10 border-t border-hair pt-8">
              <AcademyMarkComplete
                lessonId={lesson.id}
                lessonTitle={lesson.title}
                nextHref={next ? `/training/classroom/${next.courseId}/${next.id}` : undefined}
                nextTitle={next?.title}
              />
            </section>

            <nav
              aria-label="Lesson navigation"
              className="mt-10 flex flex-col gap-6 border-t border-hair pt-8 sm:flex-row sm:justify-between"
            >
              {previous ? (
                <Link
                  href={`/training/classroom/${previous.courseId}/${previous.id}`}
                  className="group min-w-0 sm:max-w-[45%]"
                >
                  <span className="block text-label text-chalk-faint">← Previous</span>
                  <span className="mt-1 block text-body font-medium text-chalk transition-colors group-hover:text-brass">
                    {previous.title}
                  </span>
                </Link>
              ) : <span />}

              {next && (
                <Link
                  href={`/training/classroom/${next.courseId}/${next.id}`}
                  className="group min-w-0 sm:max-w-[45%] sm:text-right"
                >
                  <span className="block text-label text-chalk-faint">Next →</span>
                  <span className="mt-1 block text-body font-medium text-chalk transition-colors group-hover:text-brass">
                    {next.title}
                  </span>
                  {nextCourse && (
                    <span className="mt-0.5 block text-label text-chalk-faint">
                      {nextCourse.title}
                    </span>
                  )}
                </Link>
              )}
            </nav>
          </article>
        </div>
      </div>
    </AppShell>
  )
}
