'use client'

import { useId, useState } from 'react'
import { Avatar } from './Avatar'
import { DemoAction } from './DemoAction'
import type {
  CommunityAuthor, CommunityComposerCourse, CommunityLocalPost,
} from './CommunityModel'

/**
 * Share with the community.
 *
 * COLLAPSED UNTIL ASKED FOR. An open form at the top of a feed pushes the
 * conversation below the fold and makes the room feel like a submission
 * queue. One line that looks like somewhere to type is enough.
 *
 * THE LESSON SELECT IS THE POINT. It is drawn from the real curriculum, so a
 * post an agent writes here links into the Classroom exactly the way Jeremy's
 * do. That is the whole bridge between the two rooms, and it would be worth
 * less if the agent could only link to something we had pre-chosen.
 *
 * The post does not leave the browser, and the composer says so where it is
 * being written rather than in a footnote somewhere else on the page.
 */
export function CommunityComposer({
  author, categories, courses, defaultCategory, onPost,
}: {
  author: CommunityAuthor
  categories: string[]
  courses: CommunityComposerCourse[]
  defaultCategory?: string
  onPost: (post: CommunityLocalPost) => void
}) {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(defaultCategory ?? categories[0])
  const [lessonRef, setLessonRef] = useState('')
  const [posted, setPosted] = useState(false)

  const ready = title.trim().length > 0 && body.trim().length > 0

  const reset = () => {
    setTitle(''); setBody(''); setLessonRef(''); setCategory(defaultCategory ?? categories[0])
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return

    // The select carries both ids so the href can be built without a second
    // lookup — and so a value that does not resolve simply drops the link.
    const [courseId, lessonId] = lessonRef.split('/')
    const course = courses.find(c => c.id === courseId)
    const lesson = course?.lessons.find(l => l.id === lessonId)

    onPost({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      title: title.trim(),
      body: body.trim(),
      createdAt: Date.now(),
      lesson: course && lesson
        ? {
            href: `/training/classroom/${course.id}/${lesson.id}`,
            lesson: lesson.title,
            course: course.title,
          }
        : undefined,
    })

    reset()
    setOpen(false)
    setPosted(true)
  }

  if (!open) {
    return (
      <div className="mb-8">
        <button
          type="button"
          onClick={() => { setOpen(true); setPosted(false) }}
          className="flex w-full items-center gap-3 rounded-control border border-hair
                     bg-ink-raised px-4 py-3.5 text-left transition-colors duration-150
                     hover:border-hair-strong"
        >
          <Avatar initials={author.initials} photo={author.photo} name={author.name} size="sm" />
          <span className="text-body text-chalk-faint">
            Share something with the community…
          </span>
        </button>
        {posted && (
          <p role="status" className="mt-2 animate-fade-in text-label text-signal-calm">
            Posted. It is at the top of the feed, and it stays in this browser.
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="mb-8 rounded-panel border border-hair bg-ink-raised p-4 shadow-panel sm:p-5"
    >
      <div className="flex items-center gap-3">
        <Avatar initials={author.initials} photo={author.photo} name={author.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-chalk">{author.name}</p>
          <p className="truncate text-label text-chalk-faint">{author.role}</p>
        </div>
      </div>

      <label htmlFor={`${uid}-title`} className="sr-only">Title</label>
      <input
        id={`${uid}-title`}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What is this about?"
        maxLength={120}
        autoFocus
        className="field mt-4 rounded-control"
      />

      <label htmlFor={`${uid}-body`} className="sr-only">Post</label>
      <textarea
        id={`${uid}-body`}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write it the way you would say it."
        rows={5}
        maxLength={2000}
        className="field mt-3 resize-y rounded-control"
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-cat`} className="mb-1.5 block text-label text-chalk-muted">
            Category
          </label>
          <select
            id={`${uid}-cat`}
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="field rounded-control"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor={`${uid}-lesson`} className="mb-1.5 block text-label text-chalk-muted">
            Link a lesson <span className="text-chalk-faint">· optional</span>
          </label>
          <select
            id={`${uid}-lesson`}
            value={lessonRef}
            onChange={e => setLessonRef(e.target.value)}
            className="field rounded-control"
          >
            <option value="">No lesson</option>
            {courses.map(c => (
              <optgroup key={c.id} label={c.title}>
                {c.lessons.map(l => (
                  <option key={l.id} value={`${c.id}/${l.id}`}>
                    {l.order}. {l.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-hair pt-4
                      sm:flex-row sm:items-start sm:justify-between">
        <DemoAction
          label="Attach"
          note="Images, video and handouts attach to a post in the built product. Nothing is uploaded from this demonstration."
        />
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => { reset(); setOpen(false) }} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={!ready} className="btn-primary">
            Post
          </button>
        </div>
      </div>

      <p className="mt-4 text-micro tracking-normal text-chalk-faint">
        Posts you write here are saved in this browser only. Nothing is sent to RCRE, to the other
        agents in this feed, or anywhere else.
      </p>
    </form>
  )
}
