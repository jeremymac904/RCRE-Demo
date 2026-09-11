'use client'

import { useState } from 'react'

/**
 * Reveal a drafted first message.
 *
 * The draft is written in advance and shown on request — it is never generated
 * here and never sent. The point of the interaction is that the recruiter sees
 * a message grounded in what this person actually did, not a template.
 */
export function DraftOutreachButton({
  channel, body,
}: { channel: string; body: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full">
      <button onClick={() => setOpen(o => !o)} className="btn-primary">
        {open ? 'Hide draft' : 'Draft outreach'}
      </button>

      {open && (
        <div className="mt-4 animate-fade-in rounded-panel border border-hair bg-ink-raised">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hair px-4 py-2.5">
            <span className="eyebrow text-brass-dim">{channel}</span>
            <span className="text-micro tracking-normal text-chalk-faint">Not sent</span>
          </div>
          <p className="px-4 py-4 text-body leading-relaxed text-chalk">{body}</p>
          <p className="border-t border-hair px-4 py-2.5 text-micro tracking-normal text-chalk-faint">
            Written from her Academy activity and the pages she read. Sending always
            requires approval — and this environment cannot send.
          </p>
        </div>
      )}
    </div>
  )
}
