'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Avatar } from './Avatar'
import { CommunityPromptBlock } from './CommunityPromptBlock'
import { timeAgo, type CommunityFeedPost } from './CommunityModel'

/**
 * One post in the feed.
 *
 * ROWS, NOT CARDS. A community reads as a conversation, so posts are separated
 * by a hairline and share one column rather than each sitting in its own
 * panel. Nine bordered boxes down a page reads as a dashboard, and Command is
 * already the dashboard.
 *
 * The like and the comment toggle are the only two controls, and both do
 * something visible immediately. Where there is nothing to expand, the count
 * renders as text — a button that opens an empty thread is worse than a label.
 */
export function CommunityPost({
  post, liked, onLike, onRemove,
}: {
  post: CommunityFeedPost
  liked: boolean
  onLike: (id: string) => void
  onRemove?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const replies = post.comments.length
  const likeCount = post.likes + (liked ? 1 : 0)

  return (
    <article
      id={`post-${post.id}`}
      className="scroll-mt-8 border-t border-hair py-7 first:border-t-0 first:pt-0"
    >
      <div className="flex gap-3 sm:gap-4">
        <Avatar initials={post.initials} photo={post.photo} name={post.authorName} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-body font-medium text-chalk">{post.authorName}</span>
            <span className="text-label text-chalk-faint">{post.authorRole}</span>
            <span className="text-label text-chalk-faint">· {timeAgo(post.agoHours)}</span>
            {post.pinned && (
              <span className="text-micro uppercase tracking-[0.1em] text-brass-dim">· Pinned</span>
            )}
            {post.local && (
              <span className="text-micro uppercase tracking-[0.1em] text-chalk-faint">
                · Only in this browser
              </span>
            )}
          </div>

          <h3 className="mt-2 font-display text-h4 font-600 text-chalk">{post.title}</h3>

          <p className="mt-2 max-w-prose whitespace-pre-line text-body text-chalk-muted">
            {post.body}
          </p>

          {post.prompt && <CommunityPromptBlock prompt={post.prompt} />}

          {post.lesson && (
            <Link
              href={post.lesson.href}
              className="mt-4 flex items-center gap-3 rounded-control border border-hair
                         bg-ink-raised px-4 py-3 transition-colors duration-150
                         hover:border-hair-brass"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium text-chalk">
                  {post.lesson.lesson}
                </span>
                <span className="block truncate text-label text-chalk-faint">
                  {post.lesson.course}
                </span>
              </span>
              <span className="shrink-0 text-label text-brass">Open lesson →</span>
            </Link>
          )}

          <footer className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => onLike(post.id)}
              aria-pressed={liked}
              aria-label={liked ? `Remove your like from ${post.title}` : `Like ${post.title}`}
              className={`inline-flex items-center gap-1.5 text-label transition-colors
                          duration-150 ${
                liked ? 'text-signal-urgent' : 'text-chalk-faint hover:text-chalk-muted'}`}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden
                   fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3">
                <path d="M8 13.3 3.1 8.6a3 3 0 0 1 4.2-4.3L8 5l.7-.7a3 3 0 0 1 4.2 4.3Z"
                      strokeLinejoin="round" />
              </svg>
              <span className="tabular">{likeCount}</span>
            </button>

            {replies > 0 ? (
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 text-label text-chalk-faint
                           transition-colors duration-150 hover:text-chalk-muted"
              >
                {replies} {replies === 1 ? 'reply' : 'replies'}
                <span aria-hidden className="text-[0.625rem]">{open ? '▲' : '▼'}</span>
              </button>
            ) : (
              <span className="text-label text-chalk-faint">No replies yet</span>
            )}

            <Link
              href={`/training/community?category=${encodeURIComponent(post.category)}`}
              className="ml-auto rounded-full border border-hair px-2.5 py-0.5 text-[0.6875rem]
                         text-chalk-faint transition-colors duration-150
                         hover:border-hair-strong hover:text-chalk-muted"
            >
              {post.category}
            </Link>

            {post.local && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(post.id)}
                className="text-label text-chalk-faint transition-colors duration-150
                           hover:text-signal-urgent"
              >
                Remove
              </button>
            )}
          </footer>

          {open && replies > 0 && (
            <ul className="mt-5 animate-fade-in space-y-4 border-l border-hair pl-4 sm:pl-5">
              {post.comments.map(c => (
                <li key={c.id} className="flex gap-3">
                  <Avatar initials={c.initials} photo={c.photo} name={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[0.875rem] font-medium text-chalk">{c.name}</span>
                      <span className="text-label text-chalk-faint">{timeAgo(c.agoHours)}</span>
                    </div>
                    <p className="mt-1 max-w-prose text-body text-chalk-muted">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  )
}
