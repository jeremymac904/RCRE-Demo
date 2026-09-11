'use client'

import { useState } from 'react'
import { DemoAction } from '@/components/DemoAction'

/**
 * Listing campaign builder.
 *
 * Runs a scripted sequence so the demo can show the SHAPE of agentic work —
 * research, then generation, then a compliance gate, then held-for-review
 * output. No model is called.
 */
const STEPS = [
  { label: 'Reading the listing', detail: 'address, price, features, photography' },
  { label: 'Researching the area', detail: 'recent comparables, school zones, commute' },
  { label: 'Writing the campaign', detail: 'social, email, open house, follow-up' },
  { label: 'Fair housing review', detail: 'checking for steering language and protected-class proxies' },
]

/**
 * The campaign this demo produces.
 *
 * CORRECTED: three of these lines said "San Marco" while the listing they are
 * generated for — and the email body in the same array — say Ortega Boulevard.
 * A campaign that names the wrong neighbourhood is exactly the failure a
 * broker would fear from AI marketing, so it cannot be the thing on screen
 * when this is demonstrated. The listing is 4407 Ortega Boulevard: 5 bed,
 * 4 bath, 3,910 sqft, $812,000, Coming Soon.
 */
const OUTPUT = [
  { kind: 'Social — Instagram', body: 'Coming soon in Ortega. Five bedrooms, 3,910 square feet, and a screened porch that runs the whole back of the house. Open Saturday 1–3.' },
  { kind: 'Email — sphere', body: 'Subject: New in Ortega\n\nA new listing came up on Ortega Boulevard this week — 5 bed, 4 bath, 3,910 sqft at $812,000. Open house Saturday 1–3pm if you or someone you know is looking in the area.' },
  { kind: 'Open house plan', body: 'Saturday 1–3pm · sign-in via QR to RCRE capture · 40 neighbour invitations · same-day follow-up drafted for every registrant' },
  { kind: 'Video script — 45s', body: 'Open on the porch. "Three thousand nine hundred square feet on Ortega Boulevard, and the part everyone stops at is back here…"' },
]

export function CampaignBuilder({ address }: { address: string }) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [step, setStep] = useState(-1)
  const [approved, setApproved] = useState(false)

  const run = () => {
    setPhase('running')
    setStep(0)
    STEPS.forEach((_, i) => {
      window.setTimeout(() => setStep(i + 1), (i + 1) * 850)
    })
    window.setTimeout(() => setPhase('done'), STEPS.length * 850 + 400)
  }

  if (phase === 'idle') {
    return (
      <div className="rounded-panel border border-hair-brass bg-brass-fill/[0.08] p-6">
        <p className="eyebrow text-brass">RCRE AI</p>
        <h2 className="mt-2 font-display text-h3 font-600 text-chalk">Build the marketing campaign</h2>
        <p className="mt-2 max-w-prose text-body text-chalk-muted">
          Social posts, a sphere email, the open house plan and a video script — drafted from
          this listing and held for your review.
        </p>
        <button onClick={run} className="btn-primary mt-5">Build campaign for {address}</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-panel border border-hair bg-ink-raised p-6">
        <p className="eyebrow text-brass">RCRE AI</p>
        <ol className="mt-4 space-y-3">
          {STEPS.map((s, i) => {
            const state = step > i ? 'done' : step === i ? 'active' : 'todo'
            return (
              <li key={s.label} className="flex items-start gap-3">
                <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  state === 'done' ? 'bg-signal-calm'
                  : state === 'active' ? 'animate-pulse-soft bg-brass-fill'
                  : 'bg-hair-strong'}`} />
                <span className="min-w-0">
                  <span className={`block text-body ${state === 'todo' ? 'text-chalk-faint' : 'text-chalk'}`}>
                    {s.label}
                  </span>
                  <span className="block text-label text-chalk-faint">{s.detail}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {phase === 'done' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair pb-3">
            <h3 className="text-label font-semibold uppercase tracking-[0.1em] text-chalk-muted">
              Ready for review
            </h3>
            <span className="text-label text-brass">Compliance review required</span>
          </div>

          {OUTPUT.map(o => (
            <div key={o.kind} className="rounded-panel border border-hair bg-ink-raised">
              <p className="border-b border-hair px-4 py-2.5 text-micro uppercase tracking-[0.1em] text-brass-dim">
                {o.kind}
              </p>
              <p className="whitespace-pre-line px-4 py-4 text-body leading-relaxed text-chalk">
                {o.body}
              </p>
            </div>
          ))}

          {approved ? (
            <div className="rounded-panel border border-signal-calm/40 bg-signal-calm/[0.07] px-4 py-3">
              <p className="text-body text-chalk">Approved and queued for Thursday launch.</p>
              <p className="mt-1 text-body text-chalk-muted">
                In production this schedules the listing email, the two social posts and the
                single-property page. Nothing was scheduled or published here.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-start gap-2.5 pt-1">
              <button onClick={() => setApproved(true)} className="btn-primary">
                Approve and schedule
              </button>
              <DemoAction label="Edit"
                          note="Each asset becomes editable in place. The fair-housing check re-runs on every edit." />
              <DemoAction label="Send to broker for review"
                          note="Routes to Taquilla's approval queue. Public marketing needs broker sign-off before it goes out." />
            </div>
          )}
          <p className="text-micro tracking-normal text-chalk-faint">
            Nothing publishes from this demonstration. In production, public marketing requires
            broker approval before it goes out.
          </p>
        </div>
      )}
    </div>
  )
}
