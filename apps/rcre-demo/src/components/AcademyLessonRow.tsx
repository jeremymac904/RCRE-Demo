'use client'

import Link from 'next/link'
import { useAcademyProgress, useCourseResume } from './AcademyProgressProvider'

/**
 * One lesson inside a course.
 *
 * THREE STATES, STATED IN WORDS: done, where you are, and everything else.
 * "Where you are" is the row an agent scans for, so it is the only one that
 * gets a mark in the margin — a second brass thing in the same list would make
 * the first one mean nothing.
 *
 * WHY IT IS A CLIENT COMPONENT NOW. Completion lives in the browser, and a row
 * that only learned about it on the next server render would still say
 * "incomplete" after the agent pressed Mark complete and came back.
 *
 * WHAT IT NO LONGER SAYS. This row used to carry "Video in production" on every
 * lesson without a recording. On a nineteen-lesson course that is nineteen
 * apologies in one column, and the fact does not help anyone decide what to open
 * — every lesson is written either way. A "Video" marker now appears only where
 * there is genuinely something to watch, and the production note is made once,
 * quietly, on the lesson page itself.
 */
export interface LessonRowLesson {
  id: string
  courseId: string
  order: number
  title: string
  description: string
  promptCount: number
  resourceCount: number
}

export function AcademyLessonRow({
  lesson, artwork, hasVideo,
}: { lesson: LessonRowLesson; artwork?: string; hasVideo: boolean }) {
  const { isComplete } = useAcademyProgress()
  const resume = useCourseResume(lesson.courseId)

  const done = isComplete(lesson.id)
  const current = !done && resume?.id === lesson.id

  return (
    <li className="relative">
      {current && (
        <span
          aria-hidden
          className="absolute inset-y-3 left-0 w-[2px] rounded-full bg-brass-fill"
        />
      )}
      <Link
        href={`/training/classroom/${lesson.courseId}/${lesson.id}`}
        aria-current={current ? 'step' : undefined}
        className="group -mx-4 flex items-start gap-4 px-4 py-4 transition-colors hover:bg-ink-elevated sm:gap-5"
      >
        <span
          aria-hidden
          className={`mt-0.5 shrink-0 text-label tabular ${done ? 'text-brass' : 'text-chalk-faint'}`}
        >
          {String(lesson.order).padStart(2, '0')}
        </span>

        {/* Held back below `sm`. Three columns at 375px would squeeze the title
            into a two-word column, and a lesson list has to stay readable
            before it is pretty. */}
        {artwork && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artwork}
            alt=""
            loading="lazy"
            className={`hidden w-24 shrink-0 rounded-control border border-hair object-cover sm:block
                        ${done ? 'opacity-60' : ''}`}
          />
        )}

        <span className="min-w-0 flex-1">
          <span className="block font-display text-h4 font-600 text-chalk transition-colors group-hover:text-brass">
            {lesson.title}
          </span>
          {/* No `block` here on purpose: Tailwind's line-clamp sets its own
              display, and a display utility beside it silently wins and undoes
              the clamp. A course with nineteen four-line descriptions is a wall
              of text, not a list. */}
          <span className="mt-1 line-clamp-2 text-body text-chalk-muted">
            {lesson.description}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-chalk-faint">
            {hasVideo && <span className="text-brass">Video</span>}
            {lesson.promptCount > 0 && <span>{lesson.promptCount} prompts</span>}
            {lesson.resourceCount > 0 && (
              <span>
                {lesson.resourceCount} {lesson.resourceCount === 1 ? 'resource' : 'resources'}
              </span>
            )}
          </span>
        </span>

        <span className="shrink-0 pt-0.5 text-right text-label">
          {done && <span className="text-signal-calm">Complete</span>}
          {current && <span className="text-brass">Up next</span>}
        </span>
      </Link>
    </li>
  )
}
