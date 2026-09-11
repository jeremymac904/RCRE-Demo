'use client'

import { useState } from 'react'

/**
 * A prompt quoted inside a post.
 *
 * The copy button really copies. A prompt an agent has to select by hand is a
 * prompt they will not use on the way to a showing, and a button that only
 * looked like it copied would be the kind of small lie this demo does not
 * tell — so the failure path says so instead of flashing "Copied".
 *
 * Not brass. The training feature at the top of the page already spends the
 * page's one brass accent; a second one would flatten it.
 */
export function CommunityPromptBlock({ prompt }: { prompt: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2400)
  }

  return (
    <div className="mt-4 overflow-hidden rounded-control border border-hair bg-ink-sunken">
      <div className="flex items-center justify-between gap-3 border-b border-hair px-3.5 py-2">
        <span className="text-micro uppercase tracking-[0.12em] text-chalk-faint">Prompt</span>
        <button
          type="button"
          onClick={copy}
          className="text-[0.75rem] font-medium text-chalk-muted transition-colors
                     duration-150 hover:text-chalk"
        >
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : 'Copy'}
        </button>
      </div>
      <p className="select-all px-3.5 py-3 text-body text-chalk-muted">{prompt}</p>
    </div>
  )
}
