'use client'

import Link from 'next/link'
import { AcademyProgressBar } from './AcademyProgressBar'
import { useCourseProgress, useCourseResume } from './AcademyProgressProvider'

/**
 * A course cover in the Classroom catalog.
 *
 * NOT THE SAME CARD AS THE ONE ON THE TRAINING OVERVIEW. `AcademyCourseCard`
 * summarises a course inside a page that is mostly about something else, and
 * stays a server component for it. This one is the Classroom's primary object:
 * the cover carries the card, and the card carries an action. The Classroom is
 * meant to feel more visual than the CRM, and a course is the one thing in this
 * product that arrives with real artwork — so the artwork gets the space.
 *
 * TWO DESTINATIONS, ONE CARD. The card opens the course; the button opens the
 * lesson you would actually resume. Nesting one link inside another is invalid,
 * so the title link is stretched over the card with `after:absolute` and the
 * button is lifted above it. That keeps a single obvious click target for
 * browsing and a precise one for continuing.
 *
 * PROGRESS IS LIVE. `useCourseProgress` reads the browser's record through the
 * Classroom provider, so a lesson marked complete on a lesson page has already
 * moved this card by the time the agent presses Back.
 */
export interface CatalogCourse {
  id: string
  title: string
  description: string
  level: string
  lessonCount: number
  promptCount: number
  resourceCount: number
}

export function AcademyCatalogCard({
  course, cover,
}: { course: CatalogCourse; cover?: string }) {
  const progress = useCourseProgress(course.id)
  const resume = useCourseResume(course.id)
  const started = progress.done > 0
  const finished = progress.total > 0 && progress.done === progress.total

  // Finished courses still open — the prompt packs are worth returning to — so
  // the action changes word rather than disappearing.
  const target = resume ?? { id: undefined }
  const actionHref = target.id
    ? `/training/classroom/${course.id}/${target.id}`
    : `/training/classroom/${course.id}`
  const actionLabel = finished ? 'Review course' : started ? 'Continue' : 'Start course'

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-panel border border-hair
                 bg-ink-raised shadow-panel transition-colors duration-200 hover:border-hair-brass
                 focus-within:border-hair-brass"
    >
      {/* NO COVER, NO GREY BOX. `publicAsset` resolved this on the server, so a
          course whose artwork has not been produced drops the image entirely
          rather than reserving a placeholder rectangle. */}
      {cover && (
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-hair bg-ink-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out
                       group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          {finished && (
            <span
              className="absolute left-3 top-3 rounded-control border border-hair-brass bg-ink-raised/90
                         px-2.5 py-1 text-micro uppercase tracking-[0.12em] text-brass backdrop-blur"
            >
              Complete
            </span>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">{course.level}</p>
          <span className="shrink-0 text-label tabular text-chalk-faint">
            {progress.done} / {progress.total}
          </span>
        </div>

        <h3 className="mt-2 font-display text-h4 font-600 text-chalk">
          <Link
            href={`/training/classroom/${course.id}`}
            className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brass"
          >
            {course.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-body text-chalk-muted">{course.description}</p>

        <p className="mt-3 text-label text-chalk-faint">
          {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
          {course.promptCount > 0 && ` · ${course.promptCount} prompts`}
          {course.resourceCount > 0 && ` · ${course.resourceCount} resources`}
        </p>

        {/* Pushed to the bottom so a row of cards with descriptions of different
            lengths still lines its actions up. */}
        <div className="mt-auto pt-5">
          <AcademyProgressBar
            percent={progress.percent}
            label={`${course.title} progress`}
          />
          <Link
            href={actionHref}
            className={`relative z-10 mt-4 w-full sm:w-auto ${started && !finished ? 'btn-primary' : 'btn-ghost'}`}
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </article>
  )
}
