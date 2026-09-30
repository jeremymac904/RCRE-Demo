import { actorOrNull } from '@/lib/platform/auth'
import { academyCatalog, academyCourseAccessible } from '@/lib/academy-durable'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { BackLink } from '@/components/BackLink'
import { AcademyLessonRow } from '@/components/AcademyLessonRow'
import { AcademyCourseResume } from '@/components/AcademyCourseResume'
import {
  courseById, courses, lessonsFor, playableVideo, publicAsset,
} from '@/lib/academy'

export const dynamic = 'force-dynamic'

/**
 * Course detail.
 *
 * The lesson list is the screen. Everything above it — cover, goal, level,
 * counts — is there to answer "is this worth my afternoon", and everything
 * below is the afternoon.
 *
 * ORDERING IS THE CURRICULUM'S, NOT THE FILE'S. `lessonsFor` sorts on `order`
 * rather than trusting array position in the generated data, because a
 * regenerated file could reorder rows and a course taught out of sequence is
 * worse than no course.
 *
 * SERVER RENDERS THE COURSE, THE BROWSER RENDERS THE PROGRESS. Covers, artwork
 * and video availability are resolved here because they are checked against the
 * filesystem. Completion state is resolved in the rows and in the header's
 * resume block, which read this browser's record — so pressing Back from a
 * lesson shows the row already ticked.
 */
import { DurableModuleUnavailable } from '@/components/DurableModuleUnavailable'

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const user = await currentUser()
  if (!user) redirect('/login')

  const { courseId } = await params
  const actor = await actorOrNull()
  if (!actor) redirect('/login')
  let durableCatalog
  try {
    if (!await academyCourseAccessible(actor, courseId)) redirect('/training?denied=course')
    durableCatalog = await academyCatalog(actor)
  } catch { return <DurableModuleUnavailable title="Classroom" detail="The training library is temporarily unavailable." /> }
  const course = courseById(courseId)
  if (!course) {
    const authored = durableCatalog.courses.find(item => item.id === courseId && 'source' in item && item.source === 'rcre-authored')
    if (!authored) notFound()
    const authoredLessons = durableCatalog.lessons.filter(item => item.courseId === courseId).sort((a, b) => a.order - b.order)
    return <AppShell user={user}><div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-14"><BackLink fallback="/training/classroom" fallbackLabel="Classroom"/><header className="mt-8 border-b border-hair pb-8"><p className="eyebrow mb-2">{authored.category}</p><h1 className="font-display text-h2 font-600 text-chalk">{authored.title}</h1><p className="mt-3 max-w-prose text-lead text-chalk-muted">{authored.description}</p><p className="mt-4 text-label text-chalk-faint">{authoredLessons.length} {authoredLessons.length === 1 ? 'lesson' : 'lessons'}</p><AcademyCourseResume courseId={authored.id} courseTitle={authored.title}/></header><section className="mt-8"><h2 className="eyebrow mb-2">Lessons</h2><ul className="divide-y divide-hair border-b border-hair">{authoredLessons.map(lesson=><li key={lesson.id}><Link href={`/training/classroom/${courseId}/${lesson.id}`} className="block py-5 hover:text-brass"><span className="text-label text-chalk-faint">Lesson {lesson.order}</span><span className="mt-1 block font-display text-h4 text-chalk">{lesson.title}</span><span className="mt-1 block text-body text-chalk-muted">{lesson.description}</span></Link></li>)}</ul></section></div></AppShell>
  }

  const lessons = lessonsFor(course.id)
  const cover = publicAsset(course.cover)
  // Counted here rather than trusted from the data: `playableVideo` also checks
  // the file is genuinely on disk, so the number can never overstate what an
  // agent will find. Stated as a plain fact in the meta line, and only when
  // there is something to state.
  const recorded = lessons.filter(l => playableVideo(l)).length

  // Next course in the curriculum. Offered at the foot of every course rather
  // than only on completion — an agent skimming ahead has the same question.
  const order = courses()
  const following = order[order.findIndex(c => c.id === course.id) + 1]

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-14">
        <div className="mb-8">
          <BackLink fallback="/training/classroom" fallbackLabel="Classroom" />
        </div>

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="mb-8 aspect-[21/9] w-full rounded-panel border border-hair object-cover"
          />
        )}

        <header className="border-b border-hair pb-8">
          <p className="eyebrow mb-2">{course.level}</p>
          <h1 className="font-display text-h2 font-600 text-chalk">{course.title}</h1>
          {/* The course goal in the curriculum's own words. Not rewritten. */}
          <p className="mt-3 max-w-prose text-lead text-chalk-muted">{course.description}</p>
          <p className="mt-4 text-label text-chalk-faint">
            {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
            {course.promptCount > 0 && ` · ${course.promptCount} prompts`}
            {course.resourceCount > 0 && ` · ${course.resourceCount} resources`}
            {recorded > 0 && ` · ${recorded} with video`}
          </p>

          <AcademyCourseResume courseId={course.id} courseTitle={course.title} />
        </header>

        <section className="mt-8">
          <h2 className="eyebrow mb-2">Lessons</h2>
          <ul className="divide-y divide-hair border-b border-hair">
            {lessons.map(l => (
              <AcademyLessonRow
                key={l.id}
                artwork={publicAsset(l.image)}
                hasVideo={Boolean(playableVideo(l))}
                lesson={{
                  id: l.id,
                  courseId: l.courseId,
                  order: l.order,
                  title: l.title,
                  description: l.description,
                  promptCount: l.promptCount,
                  resourceCount: l.resources.length,
                }}
              />
            ))}
          </ul>
        </section>

        {following && (
          <section className="mt-10 rounded-panel border border-hair bg-ink-raised p-6 shadow-panel">
            <p className="eyebrow">Next in the curriculum</p>
            <h2 className="mt-2 font-display text-h4 font-600 text-chalk">{following.title}</h2>
            <p className="mt-2 line-clamp-2 max-w-prose text-body text-chalk-muted">
              {following.description}
            </p>
            <Link
              href={`/training/classroom/${following.id}`}
              className="link-rule mt-5 inline-block"
            >
              Open {following.level.toLowerCase()} course
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  )
}
