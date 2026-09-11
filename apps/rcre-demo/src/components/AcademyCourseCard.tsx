import Link from 'next/link'
import { AcademyProgressBar } from './AcademyProgressBar'
import { courseProgress, publicAsset, type AcademyCourse } from '@/lib/academy'

/**
 * A course in the catalog.
 *
 * The card leads with the course goal in Jeremy's own words rather than a
 * lesson count, because the count is not the reason anyone opens a course. The
 * numbers sit underneath as supporting detail.
 *
 * NO COVER, NO GREY BOX. The cover is drawn only when the file is genuinely in
 * public/ — checked on disk, not assumed from the data. A course whose artwork
 * has not been produced yet drops the image entirely rather than reserving a
 * placeholder rectangle, so the catalog never looks half-loaded.
 */
export function AcademyCourseCard({ course }: { course: AcademyCourse }) {
  const progress = courseProgress(course.id)
  const cover = publicAsset(course.cover)
  const started = progress.done > 0
  const finished = progress.total > 0 && progress.done === progress.total

  return (
    <Link
      href={`/training/classroom/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-panel border border-hair bg-ink-raised
                 shadow-panel transition-colors duration-200 hover:border-hair-brass"
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="aspect-[16/9] w-full border-b border-hair object-cover"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">{course.level}</p>
          {finished ? (
            <span className="shrink-0 text-label text-signal-calm">Complete</span>
          ) : started ? (
            <span className="shrink-0 text-label text-brass">
              {progress.done} of {progress.total}
            </span>
          ) : (
            <span className="shrink-0 text-label text-chalk-faint">Not started</span>
          )}
        </div>

        <h3 className="mt-2 font-display text-h4 font-600 text-chalk transition-colors group-hover:text-brass">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-body text-chalk-muted">{course.description}</p>

        <p className="mt-4 text-label text-chalk-faint">
          {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
          {course.promptCount > 0 && ` · ${course.promptCount} prompts`}
          {course.resourceCount > 0 && ` · ${course.resourceCount} resources`}
        </p>

        {started && !finished && (
          <AcademyProgressBar
            className="mt-4"
            percent={progress.percent}
            label={`${course.title} progress`}
          />
        )}
      </div>
    </Link>
  )
}
