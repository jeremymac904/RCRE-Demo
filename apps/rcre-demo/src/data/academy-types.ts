/**
 * RCRE Academy — data contract.
 *
 * This file is the interface between the AI Advantage asset import and the
 * Academy user interface, so the two can be built in parallel without
 * inventing different shapes. It is types only; the data lives in academy.ts,
 * generated from the real curriculum.
 *
 * PROVENANCE. Every course and lesson here originates in Jeremy's existing
 * "AI Advantage for Real Estate Agents" production workspace — 14 courses,
 * 181 lessons, an approved curriculum described by its own README as the
 * source of truth. Nothing in the Academy is invented. `sourcePath` records
 * where each asset came from so a future maintainer can trace it back.
 *
 * ONE THING THIS MODEL WILL NOT DO: pretend a video exists. The source
 * manifest may contain selected completed videos; remaining lessons retain
 * optional video fields and render their actual text and resources. A player with nothing behind it would
 * misrepresent the state of Jeremy's own product to the brokerage he is
 * pitching it to.
 */

export type LessonStatus = 'ready' | 'in-production'

export interface AcademyResource {
  kind: 'handout' | 'download' | 'prompt-pack' | 'workbook' | 'template'
  title: string
  /** Authorized delivery path for a resource copied into RCRE; original public paths are not an entitlement boundary. */
  href?: string
  /** Bytes, for an honest download affordance. */
  bytes?: number
  format?: 'PDF' | 'ZIP' | 'MD' | 'DOCX'
  /** Where this came from in the source workspace. Never shown to users. */
  sourcePath?: string
}

export interface AcademyLesson {
  id: string
  courseId: string
  order: number
  title: string
  /** Jeremy's own words, from the approved curriculum. Not rewritten. */
  description: string
  status: LessonStatus
  /** Present only when a real video file was copied in. */
  video?: { src: string; poster?: string; captions?: string; seconds?: number }
  /** Lesson card artwork, where one exists. */
  image?: string
  resources: AcademyResource[]
  /** Student-facing prompts attached to this lesson. */
  promptCount: number
  sourcePath?: string
}

export interface AcademyCourse {
  id: string
  order: number
  title: string
  slug: string
  /** The course goal as written in the curriculum. */
  description: string
  level: 'Foundation' | 'Practitioner' | 'Advanced'
  cover?: string
  lessonCount: number
  /** Total prompts across the course's lessons. */
  promptCount: number
  resourceCount: number
  /**
   * Whether this course may be shown on public recruiting surfaces.
   *
   * Default is false. The addendum is explicit that paid or private lesson
   * content must not be exposed publicly unless the source designates it for
   * public use, so this is opt-in per course rather than a blanket allow.
   */
  publicPreview: boolean
  sourcePath?: string
}

/** Per-agent progress. Demo-local; a real implementation would persist it. */
export interface AcademyProgress {
  completedLessonIds: string[]
  lastViewedLessonId?: string
}

export interface AcademyIndex {
  courses: AcademyCourse[]
  lessons: AcademyLesson[]
  /** Counts for the honest "what exists" statement on the Academy home. */
  totals: {
    courses: number
    lessons: number
    prompts: number
    handouts: number
    downloads: number
    lessonsWithVideo: number
  }
}
