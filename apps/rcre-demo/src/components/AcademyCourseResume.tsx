'use client'

import Link from 'next/link'
import { AcademyProgressBar } from './AcademyProgressBar'
import { useCourseProgress, useCourseResume } from './AcademyProgressProvider'

/**
 * The live half of a course header: how far in, and the way back in.
 *
 * Split out of the page so the rest of the course header — cover, goal, counts
 * — stays server-rendered. Only the two things that change when a lesson is
 * completed cross into the browser.
 *
 * THE ACTION RESUMES THIS COURSE, NOT THE ACADEMY. `useCourseResume` deliberately
 * ignores the Academy-wide continue lesson: an agent who opened Course 8 wants
 * Course 8, and being thrown back into Course 2 because that is where they last
 * stopped is the kind of helpfulness people learn to distrust.
 */
export function AcademyCourseResume({
  courseId, courseTitle,
}: { courseId: string; courseTitle: string }) {
  const progress = useCourseProgress(courseId)
  const resume = useCourseResume(courseId)
  const finished = progress.total > 0 && progress.done === progress.total

  return (
    <>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AcademyProgressBar
          className="min-w-0 flex-1"
          percent={progress.percent}
          label={`${courseTitle} progress`}
        />
        <p className="shrink-0 text-label tabular text-chalk-faint">
          {progress.done} of {progress.total} complete
        </p>
      </div>

      {resume ? (
        <Link href={`/training/classroom/${courseId}/${resume.id}`} className="btn-primary mt-6">
          {progress.done > 0 ? 'Continue course' : 'Start course'}
        </Link>
      ) : finished && (
        <p className="mt-6 border-l-2 border-hair-brass pl-4 text-body text-chalk-muted">
          Every lesson in this course is complete. It stays open — the prompt packs and handouts
          are the part worth returning to.
        </p>
      )}
    </>
  )
}
