import { ACADEMY, type AcademyCourse } from '@/lib/academy'

/**
 * Which Academy courses may be shown to agents who do not work at RCRE.
 *
 * WHAT CHANGED AND WHY. This file used to hold a hard-coded list of two course
 * ids, on the reasoning that openness is a recruiting policy rather than a
 * property of a course. That reasoning is now wrong: the real AI Advantage
 * curriculum has been imported, and it carries its own designation —
 * `publicPreview` on each course — because the source project sells most of it.
 * Guessing which courses are free would eventually publish paid lesson content
 * on a public recruiting page.
 *
 * So public exposure is read from the data and never inferred. There is
 * deliberately no override, no "open ids" constant and no heuristic on level or
 * order. If a course should become public, the data says so.
 *
 * This still matters to the recruiting story: the demo prospect Nia Okonkwo met
 * RCRE by finishing a free course, not by answering an ISA call. Keeping the
 * rule in one place means /join and /training can never advertise different
 * courses as open.
 */

/** The single source of truth for "may this appear on a public surface". */
export const isOpenCourse = (course: AcademyCourse) => course.publicPreview === true

/** Courses cleared for public surfaces, in curriculum order. */
export const OPEN_COURSES: AcademyCourse[] =
  ACADEMY.courses.filter(isOpenCourse).sort((a, b) => a.order - b.order)

/** Everything else — countable in public copy, but never displayed there. */
export const RESTRICTED_COURSE_COUNT = ACADEMY.courses.length - OPEN_COURSES.length

/** A quiet marker, not a badge. Loud styling would make the Academy look like
 *  a storefront, and only a minority of the curriculum is open. */
export function OpenCourseMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-micro uppercase tracking-[0.14em] text-brass ${className}`}
    >
      <span aria-hidden className="h-1 w-1 rounded-full bg-brass-fill" />
      Open to any agent
    </span>
  )
}
