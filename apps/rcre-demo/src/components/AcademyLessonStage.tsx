import { AcademyVideo } from './AcademyVideo'
import { formatDuration, playableVideo, publicAsset, type AcademyLesson } from '@/lib/academy'

/**
 * The top of a lesson: the video, or the lesson's own artwork instead of one.
 *
 * THE RULE THIS COMPONENT ENFORCES. Two of the 181 lessons have been filmed.
 * Faking a player for the other 179 — an empty frame, a play button that does
 * nothing, an invented runtime — would misrepresent the state of Jeremy's own
 * product to the brokerage he is showing it to.
 *
 * BUT THE ABSENCE IS NOT THE HEADLINE. This used to open with a heading
 * announcing that the video had not been recorded. Repeated across 179 lessons
 * that is 179 apologies for a curriculum that is finished, and it made a
 * complete lesson read as a broken page. The written lesson IS the product
 * today, so the artwork the course already owns leads, and the production note
 * is one quiet line of caption underneath — said once per page, where an agent
 * is genuinely looking for a player and the answer is useful.
 *
 * NO ARTWORK, NO FRAME. If the image is not really on disk the block disappears
 * rather than reserving an empty rectangle, and the lesson simply starts with
 * its title.
 *
 * The playable branch is chosen by `playableVideo`, which also checks the file
 * is actually on disk — so the day more media is copied in, this lights up with
 * no change here.
 */
export function AcademyLessonStage({ lesson }: { lesson: AcademyLesson }) {
  const video = playableVideo(lesson)
  const card = publicAsset(lesson.image)

  if (video) {
    const duration = formatDuration(video.seconds)

    return (
      <figure className="overflow-hidden rounded-panel border border-hair bg-ink-sunken">
        {/* No autoplay, ever. An agent opening a lesson at a desk beside a
            client should not have sound start on its own. `preload="metadata"`
            for the same reason a 77MB file should not download itself. */}
        <AcademyVideo lessonId={lesson.id} {...video} />
        {(duration || video.captions) && (
          <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hair px-5 py-3 text-label text-chalk-faint">
            {duration && <span>{duration}</span>}
            {duration && video.captions && <span aria-hidden>·</span>}
            {video.captions && <span>Captions available</span>}
          </figcaption>
        )}
      </figure>
    )
  }

  if (!card) return null

  return (
    <figure>
      {/* The lesson's own card art, and nothing on top of it. No play triangle,
          no scrim, no duration — it is artwork the course already has, framed as
          artwork. The moment it looks like a poster it becomes a promise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card}
        alt=""
        className="aspect-[16/9] w-full rounded-panel border border-hair object-cover"
      />
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label text-chalk-faint">
        <span className="text-chalk-muted">Written lesson</span>
        <span aria-hidden>·</span>
        <span>No video attached</span>
      </figcaption>
    </figure>
  )
}
