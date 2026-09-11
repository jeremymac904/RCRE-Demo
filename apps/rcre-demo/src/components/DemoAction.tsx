'use client'

import { useState } from 'react'

/**
 * A button that acknowledges the click and says what would happen.
 *
 * Used where the demo deliberately stops short of the real behaviour. A button
 * that does nothing reads as broken software; one that explains its own edge
 * reads as an honest demonstration.
 */
export function DemoAction({
  label, note, variant = 'ghost', className = '',
}: {
  label: string
  note: string
  variant?: 'primary' | 'ghost'
  className?: string
}) {
  const [shown, setShown] = useState(false)

  return (
    <span className={`inline-flex flex-col items-start gap-2.5 ${className}`}>
      <button onClick={() => setShown(s => !s)}
              className={variant === 'primary' ? 'btn-primary' : 'btn-ghost'}>
        {label}
      </button>
      {shown && (
        <span className="animate-fade-in border-l-2 border-hair-brass pl-3 text-body text-chalk-muted">
          {note}
        </span>
      )}
    </span>
  )
}
