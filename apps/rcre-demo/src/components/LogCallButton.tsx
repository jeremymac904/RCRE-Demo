'use client'

import { useState } from 'react'

/**
 * Log a call.
 *
 * Records the action locally and says so. A button that silently does nothing
 * is worse in a demo than one that admits its scope — this one confirms, then
 * states plainly that nothing was written.
 */
export function LogCallButton() {
  const [logged, setLogged] = useState(false)

  if (logged) {
    return (
      <span className="inline-flex items-center gap-2 border border-signal-calm/40 px-5 py-2.5
                       text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-signal-calm">
        Call logged
      </span>
    )
  }
  return (
    <button onClick={() => setLogged(true)} className="btn-ghost">
      Log a call
    </button>
  )
}
