/**
 * The shapes the Community feed travels in, and the two keys it stores under.
 *
 * WHY A VIEW MODEL AT ALL. The feed is interactive — likes, comment threads and
 * locally composed posts all change after hydration — so the post list has to
 * reach a client component. It cannot carry the types from `@/data/community`,
 * because that module reaches through to `@/lib/academy`, which reads the
 * filesystem to decide what is really on disk. So the server resolves every
 * lesson reference to a plain href here and the browser receives prose and
 * links, never a curriculum index.
 */

/** A resolved link into the Classroom. Built on the server; the client only
 *  ever follows it, so a post can never point at a lesson that is not real. */
export interface CommunityLessonLink {
  href: string
  lesson: string
  course: string
}

export interface CommunityFeedComment {
  id: string
  name: string
  initials: string
  photo?: string
  body: string
  agoHours: number
}

export interface CommunityFeedPost {
  id: string
  category: string
  title: string
  body: string
  authorName: string
  authorRole: string
  initials: string
  photo?: string
  agoHours: number
  likes: number
  pinned?: boolean
  prompt?: string
  lesson?: CommunityLessonLink
  comments: CommunityFeedComment[]
  /** True only for posts this browser composed. Rendered as such. */
  local?: boolean
}

/** What the composer writes to localStorage. Deliberately smaller than a feed
 *  post — the author is whoever is signed in now, and the age is derived from
 *  the timestamp, so neither is stored. */
export interface CommunityLocalPost {
  id: string
  category: string
  title: string
  body: string
  createdAt: number
  lesson?: CommunityLessonLink
}

export interface CommunityComposerCourse {
  id: string
  title: string
  lessons: { id: string; title: string; order: number }[]
}

export interface CommunityAuthor {
  name: string
  role: string
  initials: string
  photo?: string
}

/* Versioned, because the shape above is allowed to change and a stale record
   should be dropped rather than half-rendered. */
export const COMMUNITY_POSTS_KEY = 'rcre-community-posts-v1'
export const COMMUNITY_LIKES_KEY = 'rcre-community-likes-v1'

/** Hours to something an agent would actually say out loud. */
export function timeAgo(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h ago`
  if (hours < 48) return 'yesterday'
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
