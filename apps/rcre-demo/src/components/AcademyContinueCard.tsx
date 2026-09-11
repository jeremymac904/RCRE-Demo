'use client'

import Link from 'next/link'
import { AcademyProgressBar } from './AcademyProgressBar'
import {
  useClassroomCourse, useContinueLesson, useCourseProgress, useOverallProgress,
} from './AcademyProgressProvider'

/**
 * "Pick up where you left off", at the top of the Classroom.
 *
 * THE ONLY THING A RETURNING AGENT IS HERE FOR. Fourteen covers are the right
 * way to browse and the wrong way to resume, so the resume answer is given
 * before the catalog rather than found inside it.
 *
 * IT HAS TO BE CLIENT-SIDE. The answer depends on what this browser has
 * finished and last opened, which only the progress store knows — and it has to
 * change the moment a lesson is completed, without a reload.
 *
 * `artwork` is a server-verified map of lesson id to card image. The paths are
 * checked on disk by `publicAsset` before they are sent, so this component
 * never renders a broken image and never needs to guess a filename.
 */
export function AcademyContinueCard({ artwork }: { artwork: Record<string, string> }) {
  const lesson = useContinueLesson()
  const overall = useOverallProgress()
  const course = useClassroomCourse(lesson?.courseId ?? '')
  const courseProgress = useCourseProgress(lesson?.courseId ?? '')

  // Everything complete. A finished state, not an empty one.
  if (!lesson || !course) {
    return (
      <section className="mt-8 rounded-panel border border-hair bg-ink-raised p-6 shadow-panel sm:p-8">
        <p className="eyebrow">Curriculum complete</p>
        <h2 className="mt-2 max-w-prose font-display text-h3 font-600 text-chalk">
          You have finished every lesson in the Classroom.
        </h2>
        <p className="mt-3 max-w-prose text-body text-chalk-muted">
          Every course below stays open. The prompt packs and handouts are the part worth
          returning to once the lessons are behind you.
        </p>
      </section>
    )
  }

  const art = artwork[lesson.id]

  return (
    <section
      aria-label="Continue learning"
      className="mt-8 overflow-hidden rounded-panel border border-hair-brass bg-brass-fill/[0.08]"
    >
      <div className="flex flex-col sm:flex-row">
        {art && (
          // Held to a fixed column from `sm` up so the copy keeps the width it
          // needs; full-bleed above a phone-width card, where a side-by-side
          // split would leave two unreadable columns.
          <div className="shrink-0 border-b border-hair-brass sm:w-64 sm:border-b-0 sm:border-r lg:w-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={art}
              alt=""
              className="aspect-[16/9] h-full w-full object-cover sm:aspect-auto"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 p-6 sm:p-8">
          <p className="eyebrow text-brass">
            {overall.done > 0 ? 'Continue where you left off' : 'Start here'}
          </p>
          <h2 className="mt-2 font-display text-h3 font-600 text-chalk">{lesson.title}</h2>
          <p className="mt-1.5 text-label text-chalk-faint">
            {course.title} · Lesson {lesson.order} of {course.lessonCount}
          </p>

          {courseProgress.done > 0 && (
            <AcademyProgressBar
              className="mt-5 max-w-sm"
              percent={courseProgress.percent}
              label={`${course.title} progress`}
            />
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href={`/training/classroom/${lesson.courseId}/${lesson.id}`}
              className="btn-primary"
            >
              {overall.done > 0 ? 'Resume lesson' : 'Open lesson'}
            </Link>
            <Link href={`/training/classroom/${lesson.courseId}`} className="btn-quiet">
              View course →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
