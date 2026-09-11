'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { AcademyProgressBar } from './AcademyProgressBar'
import {
  useAcademyProgress, useCourseLessons, useCourseProgress,
} from './AcademyProgressProvider'

/**
 * Where you are in the course, on a lesson page.
 *
 * TWO PRESENTATIONS, ONE LIST, BECAUSE A PHONE IS NOT A NARROW DESKTOP. On a
 * large screen the whole course sits in a sticky rail beside the lesson: it
 * costs nothing there and it is the fastest way to jump. At 375px that rail
 * would either eat the reading column or become a nineteen-row wall the agent
 * has to scroll past to reach the video — so on a phone it collapses to a single
 * bar that states position ("Lesson 5 of 19") and opens the list on demand.
 * Squeezing the desktop sidebar onto a phone is the failure this avoids.
 *
 * `<details>` rather than a state toggle: it opens with no JavaScript, it is
 * keyboard-operable for free, and the browser already knows how to expose it.
 *
 * IT ALSO RECORDS THE VISIT. Opening a lesson is what makes it the lesson an
 * agent resumes, so `markViewed` runs here — the one component guaranteed to be
 * on every lesson page.
 */
export function AcademyLessonNavigator({
  courseId, courseTitle, lessonId, lessonOrder,
}: {
  courseId: string
  courseTitle: string
  lessonId: string
  lessonOrder: number
}) {
  const { markViewed } = useAcademyProgress()
  const progress = useCourseProgress(courseId)

  useEffect(() => { markViewed(lessonId) }, [markViewed, lessonId])

  return (
    <>
      {/* Phone and tablet: a position bar that opens the list. */}
      <details className="group mb-8 rounded-panel border border-hair bg-ink-raised shadow-panel lg:hidden">
        <summary
          className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4
                     [&::-webkit-details-marker]:hidden"
        >
          <span className="min-w-0">
            <span className="block truncate text-label text-chalk-faint">{courseTitle}</span>
            <span className="mt-0.5 block font-display text-h4 font-600 text-chalk">
              Lesson {lessonOrder} of {progress.total}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="text-label tabular text-chalk-faint">{progress.percent}%</span>
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden
              className="text-chalk-faint transition-transform duration-200 group-open:rotate-180"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </summary>
        <LessonList
          courseId={courseId}
          currentId={lessonId}
          className="max-h-[60vh] overflow-y-auto border-t border-hair px-2 py-2"
        />
      </details>

      {/* Desktop: the whole course, always visible. */}
      <div className="sticky top-8 hidden lg:block">
        <Link
          href={`/training/classroom/${courseId}`}
          className="block font-display text-h4 font-600 text-chalk transition-colors hover:text-brass"
        >
          {courseTitle}
        </Link>
        <p className="mt-1 text-label tabular text-chalk-faint">
          {progress.done} of {progress.total} complete
        </p>
        <AcademyProgressBar
          className="mt-3"
          percent={progress.percent}
          label={`${courseTitle} progress`}
        />
        <LessonList
          courseId={courseId}
          currentId={lessonId}
          scrollToCurrent
          className="mt-5 max-h-[calc(100vh-16rem)] overflow-y-auto border-t border-hair pt-2"
        />
      </div>
    </>
  )
}

/**
 * The list itself, shared by both presentations.
 *
 * The scroll box IS the <ol> rather than a wrapper around it: `offsetTop` is
 * measured against the nearest positioned ancestor, so the element being
 * measured within and the element being scrolled have to be the same one — and
 * it has to be `relative` for that measurement to mean anything.
 */
function LessonList({
  courseId, currentId, scrollToCurrent = false, className = '',
}: {
  courseId: string
  currentId: string
  scrollToCurrent?: boolean
  className?: string
}) {
  const lessons = useCourseLessons(courseId)
  const { isComplete } = useAcademyProgress()
  const box = useRef<HTMLOListElement>(null)
  const active = useRef<HTMLLIElement>(null)

  // Lesson 17 of 19 should not require scrolling a rail to find yourself. The
  // container is scrolled directly rather than with scrollIntoView, which would
  // also move the page and drop the agent below the video they came for.
  useEffect(() => {
    if (!scrollToCurrent || !box.current || !active.current) return
    const top = active.current.offsetTop
    const { scrollTop, clientHeight } = box.current
    if (top < scrollTop || top > scrollTop + clientHeight - 48) {
      box.current.scrollTop = Math.max(0, top - 64)
    }
  }, [scrollToCurrent, currentId])

  return (
    <ol ref={box} className={`relative min-w-0 ${className}`}>
      {lessons.map(l => {
        const done = isComplete(l.id)
        const here = l.id === currentId

        return (
          <li key={l.id} ref={here ? active : undefined}>
            <Link
              href={`/training/classroom/${l.courseId}/${l.id}`}
              aria-current={here ? 'page' : undefined}
              className={`flex items-start gap-3 rounded-control px-3 py-2.5 transition-colors ${
                here ? 'bg-ink-elevated' : 'hover:bg-ink-elevated/70'
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 shrink-0 text-label tabular ${
                  done || here ? 'text-brass' : 'text-chalk-faint'
                }`}
              >
                {done ? '✓' : String(l.order).padStart(2, '0')}
              </span>
              <span
                className={`min-w-0 flex-1 text-[0.8125rem] leading-5 ${
                  here ? 'font-semibold text-chalk' : 'text-chalk-muted'
                }`}
              >
                {l.title}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
