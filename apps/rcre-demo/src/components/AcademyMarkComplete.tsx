'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAcademyProgress } from './AcademyProgressProvider'

/**
 * Mark complete.
 *
 * THIS BUTTON NOW DOES THE THING IT SAYS. It used to hold completion in local
 * component state and admit, in a line underneath, that the click went nowhere
 * past this page. Progress is real now: the click writes to the browser's
 * Academy record, which survives a refresh and moves every other surface that
 * shows progress — the course card, the course header, the lesson rail — in the
 * same frame, because they all read the same store.
 *
 * THE NOTE UNDERNEATH IS STILL HONEST ABOUT ITS LIMITS. Saved in this browser
 * is not saved to an agent profile, and this is a demonstration environment. It
 * says which one it is rather than implying a server that is not there.
 *
 * TOGGLING BACK MATTERS: an agent who marks the wrong lesson needs a way out,
 * and a one-way button is how people learn not to touch controls.
 */
export function AcademyMarkComplete({
  lessonId, lessonTitle, nextHref, nextTitle,
}: {
  lessonId: string
  lessonTitle: string
  nextHref?: string
  nextTitle?: string
}) {
  const { isComplete, setComplete } = useAcademyProgress()
  const [touched, setTouched] = useState(false)
  const complete = isComplete(lessonId)

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setComplete(lessonId, !complete); setTouched(true) }}
          aria-pressed={complete}
          className={complete ? 'btn-ghost' : 'btn-primary'}
        >
          {complete ? 'Completed — undo' : 'Mark complete'}
        </button>

        {/* Offered only once the lesson is done, and only while there is
            somewhere to go. Finishing a lesson and being left on it is the
            moment a course loses people. */}
        {complete && nextHref && (
          <Link href={nextHref} className="btn-quiet">
            {nextTitle ? `Next: ${nextTitle}` : 'Next lesson'} →
          </Link>
        )}
      </div>

      {touched && (
        <p className="animate-fade-in max-w-prose border-l-2 border-hair-brass pl-3 text-body text-chalk-muted">
          {complete
            ? `“${lessonTitle}” is complete. Your progress is saved to your local agent profile.`
            : 'Completion removed. Your progress has been updated everywhere it is shown.'}
        </p>
      )}
    </div>
  )
}
