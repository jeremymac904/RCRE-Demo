import { existsSync } from 'node:fs'
import path from 'node:path'
import { academyConfig } from './academy-service'
import { academyAssetPath, protectedHref } from './academy-media'

// ── THE SWITCH ─────────────────────────────────────────────────────────────
// The one line that binds the Academy interface to the curriculum data.
// Nothing else in the app imports course data directly, so swapping the source
// (fixture, a future API, a second brokerage's catalog) is this line alone.
import { academy as INDEX, demoProgress as PROGRESS } from '@/data/academy'
// ───────────────────────────────────────────────────────────────────────────

import type {
  AcademyCourse, AcademyIndex, AcademyLesson, AcademyProgress, AcademyResource,
} from '@/data/academy-types'

/**
 * The Academy's single data boundary.
 *
 * WHY A BOUNDARY AT ALL. The course data is generated from Jeremy's AI
 * Advantage workspace by a separate pass, on a different schedule to the
 * interface. Routing every read through here means the import above is the only
 * thing that changes when the generated file lands — no page, no component, and
 * no ordering rule has to be touched.
 *
 * Everything below is derivation, not data. Ordering, progress and asset
 * availability are computed here so three routes cannot each answer the same
 * question slightly differently.
 */

/**
 * `sourcePath` is stripped here, once, and never leaves this module.
 *
 * WHY AT THE BOUNDARY AND NOT IN EACH COMPONENT. It is maintainer metadata —
 * the path back into Jeremy's AI Advantage workspace — and the contract says it
 * is never shown to users. "Never render it" is a rule a future component can
 * forget, and it turned out not to be enough on its own: React serialises a
 * whole prop object into the streamed payload, so a field nobody printed was
 * still being shipped to the browser and readable in view-source. Deleting it
 * at the single import site is the version of that rule the code enforces.
 */
const withoutSource = <T extends { sourcePath?: string }>(record: T): Omit<T, 'sourcePath'> => {
  const { sourcePath: _omit, ...rest } = record
  return rest
}

export const ACADEMY: AcademyIndex = {
  ...INDEX,
  courses: INDEX.courses.map(withoutSource),
  lessons: INDEX.lessons.map(l => ({
    ...withoutSource(l),
    resources: l.resources.map(withoutSource),
  })),
}

export const ACADEMY_PROGRESS: AcademyProgress = PROGRESS

export type { AcademyCourse, AcademyLesson, AcademyResource }

/* ── Ordering ──────────────────────────────────────────────────────────────
   `order` is the curriculum's own sequence and is authoritative. Array order in
   the generated file is not, so every list is sorted rather than trusted. */

export const courses = (): AcademyCourse[] =>
  [...ACADEMY.courses].sort((a, b) => academyConfig().order.indexOf(a.id) - academyConfig().order.indexOf(b.id))

export const lessonsFor = (courseId: string): AcademyLesson[] =>
  ACADEMY.lessons.filter(l => l.courseId === courseId).sort((a, b) => a.order - b.order)

export const courseById = (id: string): AcademyCourse | undefined =>
  ACADEMY.courses.find(c => c.id === id)

export const lessonById = (id: string): AcademyLesson | undefined =>
  ACADEMY.lessons.find(l => l.id === id)

/** Every lesson in curriculum order across the whole Academy. Used for
 *  "next lesson" once a course runs out — the sequence continues rather than
 *  dead-ending the agent at the last row of a course. */
export const allLessonsInOrder = (): AcademyLesson[] =>
  courses().flatMap(c => lessonsFor(c.id))

/* ── Asset availability ────────────────────────────────────────────────────
   The addendum's hardest rule is that a missing video must never render as a
   player. The same reasoning applies to a handout: a download link that 404s is
   the same lie in a smaller font.

   So availability is checked against the filesystem rather than taken from the
   data. A `/…` href is a path under public/; anything else (an absolute URL) is
   a host we cannot check and therefore trust as given. This also means the
   Academy self-corrects — the day the real media is copied into public/, the
   players and downloads light up with no code change. */

const publicFileExists = (href: string): boolean => {
  if (!href.startsWith('/')) return true // externally hosted; not ours to verify
  let rel = href.split(/[?#]/)[0]
  try { rel = decodeURIComponent(rel) } catch { /* keep the raw path */ }
  if (rel.includes('..')) return false
  return existsSync(academyAssetPath(rel))
}

/** A lesson is playable only when the curriculum says it is finished, a video
 *  is attached, AND the file is really there. Any one of those missing means
 *  in-production, which is an honest state rather than a broken one. */
export const playableVideo = (lesson: AcademyLesson) => {
  if (lesson.status !== 'ready' || !lesson.video) return undefined
  if (!publicFileExists(lesson.video.src)) return undefined
  const { src, poster, captions, seconds } = lesson.video
  return {
    src: protectedHref(src),
    poster: poster && publicFileExists(poster) ? poster : undefined,
    captions: captions && publicFileExists(captions) ? protectedHref(captions) : undefined,
    seconds,
  }
}

/** Artwork that is really on disk, or nothing. Same reasoning as the video and
 *  download checks — a broken image is a small lie, and at 181 lessons a single
 *  missing card would be the one thing a viewer notices. */
export const publicAsset = (href?: string): string | undefined =>
  href && publicFileExists(href) ? href : undefined

/** A resource is downloadable only if a file was actually copied in. Callers
 *  render the un-downloadable ones as listed-but-not-yet-included. */
export const isDownloadable = (r: AcademyResource): boolean =>
  Boolean(r.href) && publicFileExists(r.href as string)

/* ── Progress ──────────────────────────────────────────────────────────────
   Demo-local and read-only. There is no store behind it, so nothing here
   pretends to write. */

export const isComplete = (lessonId: string, p: AcademyProgress = ACADEMY_PROGRESS) =>
  p.completedLessonIds.includes(lessonId)

export interface CourseProgress { done: number; total: number; percent: number }

export const courseProgress = (
  courseId: string, p: AcademyProgress = ACADEMY_PROGRESS,
): CourseProgress => {
  const lessons = lessonsFor(courseId)
  const done = lessons.filter(l => isComplete(l.id, p)).length
  return {
    done,
    total: lessons.length,
    percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
  }
}

export const overallProgress = (p: AcademyProgress = ACADEMY_PROGRESS): CourseProgress => {
  const total = ACADEMY.lessons.length
  const done = p.completedLessonIds.filter(id => lessonById(id)).length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

/**
 * The lesson the continue card points at.
 *
 * Last viewed wins while it is still unfinished — that is where the agent
 * physically left off. Once it is done, the sequence advances rather than
 * re-offering it, and if nothing has been viewed at all we open at the top of
 * the curriculum. Returns undefined only when every lesson is complete, which
 * the home screen renders as a finished state rather than an empty card.
 */
export const continueLesson = (p: AcademyProgress = ACADEMY_PROGRESS): AcademyLesson | undefined => {
  const sequence = allLessonsInOrder()
  const last = p.lastViewedLessonId ? lessonById(p.lastViewedLessonId) : undefined
  if (last && !isComplete(last.id, p)) return last
  if (last) {
    const from = sequence.findIndex(l => l.id === last.id)
    const onward = sequence.slice(from + 1).find(l => !isComplete(l.id, p))
    if (onward) return onward
  }
  return sequence.find(l => !isComplete(l.id, p))
}

/** Neighbours in curriculum order, crossing the course boundary. */
export const lessonNeighbours = (lesson: AcademyLesson) => {
  const sequence = allLessonsInOrder()
  const i = sequence.findIndex(l => l.id === lesson.id)
  return { previous: i > 0 ? sequence[i - 1] : undefined, next: sequence[i + 1] }
}

/* ── Formatting ────────────────────────────────────────────────────────────*/

/** Honest file sizes. A resource with no recorded size says nothing rather
 *  than guessing one. */
export const formatBytes = (bytes?: number): string | undefined => {
  if (!bytes || bytes < 0) return undefined
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export const formatDuration = (seconds?: number): string | undefined => {
  if (!seconds || seconds <= 0) return undefined
  const m = Math.round(seconds / 60)
  return m < 1 ? 'under a minute' : `${m} min`
}

export const RESOURCE_LABEL: Record<AcademyResource['kind'], string> = {
  handout: 'Handout',
  download: 'Download',
  'prompt-pack': 'Prompt pack',
  workbook: 'Workbook',
  template: 'Template',
}
