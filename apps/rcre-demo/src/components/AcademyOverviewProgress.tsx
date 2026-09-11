'use client'

import Link from 'next/link'
import { useContinueLesson, useOverallProgress, useClassroomCourse } from './AcademyProgressProvider'
import { AcademyProgressBar } from './AcademyProgressBar'

/**
 * The Overview's progress, read from the live browser record.
 *
 * The server can only render the seed. Once an agent has marked lessons
 * complete in the Classroom, the seed is stale — and an Overview that says
 * "12 of 181" while the Classroom says 14 is the kind of small contradiction
 * that costs a demo its credibility.
 *
 * Both screens now read the same store, mounted once at /training, so they
 * cannot disagree. The server-rendered numbers are handed in as `fallback` and
 * shown until hydration, which keeps the first paint correct rather than empty.
 */
export function AcademyOverallCount({ fallback }: { fallback: { done: number; total: number } }) {
  const live = useOverallProgress()
  const done = live.total > 0 ? live.done : fallback.done
  const total = live.total > 0 ? live.total : fallback.total
  return (
    <div className="text-left sm:text-right">
      <p className="font-display text-h3 font-600 text-brass tabular">{done}/{total}</p>
      <p className="text-label text-chalk-faint">lessons complete</p>
    </div>
  )
}

export function AcademyContinuePanel({
  fallback,
}: {
  fallback: { lessonId: string; courseId: string; title: string; description: string; order: number; courseTitle: string; lessonCount: number } | null
}) {
  const live = useContinueLesson()
  const liveCourse = useClassroomCourse(live?.courseId ?? '')
  const overall = useOverallProgress()

  // Prefer the live record; fall back to what the server rendered so this never
  // flashes empty. Description only exists server-side (it is not worth sending
  // 181 of them to the browser), so it shows only while the two agree.
  const lessonId = live?.id ?? fallback?.lessonId
  const courseId = live?.courseId ?? fallback?.courseId
  const title = live?.title ?? fallback?.title
  const courseTitle = liveCourse?.title ?? fallback?.courseTitle
  const order = live?.order ?? fallback?.order
  const lessonCount = liveCourse?.lessonCount ?? fallback?.lessonCount
  const description = live && fallback && live.id !== fallback.lessonId ? undefined : fallback?.description

  if (!lessonId || !courseId || !title) {
    return (
      <section className="mt-8 rounded-panel border border-hair bg-ink-raised p-6 shadow-panel">
        <p className="eyebrow">Curriculum complete</p>
        <h2 className="mt-2 font-display text-h3 font-600 text-chalk">
          You have finished every lesson in the Academy.
        </h2>
        <p className="mt-3 max-w-prose text-body text-chalk-muted">
          New courses are added as they are produced. The prompt packs and handouts are worth
          returning to.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-8 rounded-panel border border-hair-brass bg-brass-fill/[0.08] p-6">
      <p className="eyebrow text-brass">{overall.done > 0 ? 'Continue' : 'Start here'}</p>
      <h2 className="mt-2 font-display text-h3 font-600 text-chalk">{title}</h2>
      <p className="mt-1 text-label text-chalk-faint">
        {courseTitle}
        {order !== undefined && lessonCount !== undefined && ` · Lesson ${order} of ${lessonCount}`}
      </p>
      {description && (
        <p className="mt-3 line-clamp-3 max-w-prose text-body text-chalk-muted">{description}</p>
      )}
      {overall.total > 0 && (
        <AcademyProgressBar
          className="mt-5"
          percent={overall.percent}
          label="Academy progress"
        />
      )}
      <Link href={`/training/classroom/${courseId}/${lessonId}`} className="btn-primary mt-5">
        Open lesson
      </Link>
    </section>
  )
}
