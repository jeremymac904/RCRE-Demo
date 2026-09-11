/**
 * Miniature representations of the five RCRE product surfaces, for the public
 * pages.
 *
 * WHY THESE ARE DRAWN RATHER THAN CAPTURED.
 * The goal asks for polished product previews on the public experience, and to
 * use the product itself as the recruiting proof point. Screenshots would have
 * been the obvious route and are the wrong one here: there is no capture
 * pipeline, a PNG cannot follow the theme, it goes stale the moment a screen
 * changes, and it cannot be read by anyone using a screen reader. So each
 * preview is markup, built from the same tokens as the real screen — a
 * stylised likeness that re-themes, reflows and stays legible.
 *
 * WHY MOST OF THE COPY IS LITERAL RATHER THAN IMPORTED FROM src/data.
 * These are marketing surfaces. Wiring them to the demo fixtures would mean a
 * change to a seeded contact silently rewrites the public page, and the
 * relative dates in the fixtures ("9 days") would drift. So the first four
 * previews carry literal strings that mirror, word for word, what the demo
 * actually renders for Dana Whitfield and the Ortega Boulevard listing.
 *
 * The Academy preview is the exception and reads from the curriculum data,
 * because which courses may be shown publicly is a property of the data and
 * must never be retyped here. See PreviewAcademy below.
 *
 * TRUTHFULNESS RULES OBSERVED HERE:
 *   · nothing claims a send, a write or a live connection
 *   · the approval states use the product's own three-state vocabulary —
 *     done / drafted, not sent / needs your approval
 *   · no split, fee, testimonial, production figure or agent count appears
 *   · every frame is labelled with the route it depicts, so a viewer can go
 *     and check it behind the login
 */

import type { ReactNode } from 'react'
import { OPEN_COURSES } from './TrainingAccess'

/* -------------------------------------------------------------------------
   Shared chrome
   ------------------------------------------------------------------------- */

/**
 * The frame around a preview.
 *
 * The header names the surface and its route. That route label is doing real
 * work: it is the difference between "here is a picture of software" and "here
 * is the screen, and you can go look at it".
 */
function PreviewFrame({
  surface, route, caption, children,
}: {
  surface: string
  route: string
  caption: string
  children: ReactNode
}) {
  return (
    <figure className="flex h-full flex-col overflow-hidden rounded-panel border border-hair bg-ink-raised shadow-panel">
      <div className="flex items-center justify-between gap-3 border-b border-hair px-4 py-2.5">
        <span className="truncate text-micro uppercase text-chalk-faint">{surface}</span>
        <code className="shrink-0 font-mono text-[0.6875rem] text-chalk-faint">{route}</code>
      </div>

      <div className="flex-1 p-4 sm:p-5">{children}</div>

      <figcaption className="border-t border-hair px-4 py-3 text-label text-chalk-faint">
        {caption}
      </figcaption>
    </figure>
  )
}

/** The product's status vocabulary, reproduced. See Assistant.tsx StatusPill. */
function PreviewPill({ state }: { state: 'done' | 'drafted' | 'approval' }) {
  const { label, cls } = {
    done:     { label: 'Done', cls: 'border-signal-calm/40 text-signal-calm' },
    drafted:  { label: 'Drafted · not sent', cls: 'border-hair-strong text-chalk-muted' },
    approval: { label: 'Needs your approval', cls: 'border-hair-brass text-brass' },
  }[state]
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5
                      text-[0.625rem] uppercase tracking-[0.1em] ${cls}`}>
      {label}
    </span>
  )
}

/** A reason line — the brass tick-mark used everywhere the product explains itself. */
function PreviewReason({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[0.8125rem] leading-5 text-chalk-muted">
      <span aria-hidden className="mt-[0.5rem] h-[1.5px] w-2.5 shrink-0 rounded-full bg-brass-fill" />
      <span>{children}</span>
    </li>
  )
}

/* -------------------------------------------------------------------------
   The five surfaces
   ------------------------------------------------------------------------- */

/** RCRE Today — the one priority card, and the reasons behind it. */
export function PreviewToday() {
  return (
    <PreviewFrame
      surface="RCRE Today"
      route="/today"
      caption="One priority, with the evidence for it — not a list of everything."
    >
      <div className="relative overflow-hidden rounded-panel border border-hair-brass bg-ink p-4">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brass-fill" />

        <div className="flex items-start gap-3">
          <span aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair-brass
                           text-[0.75rem] font-medium text-brass">
            DW
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-display text-h4 font-600 text-chalk">Dana Whitfield</p>
              <span className="rounded-full border border-hair-brass px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-brass">
                Highest priority
              </span>
            </div>
            <p className="mt-0.5 text-[0.6875rem] tracking-normal text-chalk-faint">
              Active Buyer · Zillow · Mandarin, Jacksonville
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          <PreviewReason>Viewed three properties in Mandarin this week</PreviewReason>
          <PreviewReason>Saved 4321 Windward Court</PreviewReason>
          <PreviewReason>Opened your last two emails</PreviewReason>
          <PreviewReason>No outbound contact in 9 days</PreviewReason>
        </ul>

        <p className="mt-4 border-l-2 border-brass-fill pl-3 text-[0.8125rem] leading-5 text-chalk">
          Reach out today while engagement is high.
        </p>
      </div>
    </PreviewFrame>
  )
}

/** RCRE AI — an exchange, including the part where it stops and asks. */
export function PreviewAssistant() {
  return (
    <PreviewFrame
      surface="RCRE AI"
      route="/assistant"
      caption="It shows where its facts came from, and it stops before anything is sent."
    >
      <div className="space-y-3.5">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-panel rounded-br-sm bg-ink-elevated px-3 py-2 text-[0.8125rem] leading-5 text-chalk">
            Why should I contact Dana Whitfield?
          </p>
        </div>

        {/* Tool activity, shown rather than hidden — as on the real screen. */}
        <div className="space-y-1">
          {[
            ['rcre.get_contact', 'Dana Whitfield'],
            ['rcre.get_contact_history', '11 events since April'],
          ].map(([label, detail]) => (
            <div key={label} className="flex flex-wrap items-center gap-2 text-[0.6875rem] tracking-normal text-chalk-faint">
              <span aria-hidden className="h-1 w-1 rounded-full bg-signal-calm" />
              <code className="font-mono text-chalk-muted">{label}</code>
              <span>{detail}</span>
            </div>
          ))}
        </div>

        <p className="text-[0.8125rem] leading-5 text-chalk">
          She came back this week after going quiet, and nobody has reached out.
        </p>

        <div className="rounded-panel border border-hair bg-ink">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hair px-3 py-2">
            <span className="text-micro uppercase text-brass-dim">Text message</span>
            <PreviewPill state="drafted" />
          </div>
          <p className="px-3 pb-3 pt-2 text-[0.8125rem] leading-5 text-chalk">
            Hi Dana — saw you were back looking at Mandarin this week. Windward Court is a good
            one; I know that street well and there are two more coming that haven&rsquo;t hit yet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-control border border-hair-brass px-2.5 py-1 text-[0.75rem] font-medium text-brass">
            Approve and send
          </span>
          <span className="rounded-control border border-hair px-2.5 py-1 text-[0.75rem] text-chalk-muted">
            Edit
          </span>
        </div>
      </div>
    </PreviewFrame>
  )
}

/**
 * CRM Intelligence — the database with a next action attached to each record.
 *
 * The real screen uses a wide table above `sm`. A table would be the wrong
 * shape at preview scale, so this reproduces the mobile card row instead: the
 * same three facts, in the same order, with no horizontal scroll at any width.
 */
export function PreviewCrm() {
  /** Three demo records, verbatim — the stage, the place and the next action
   *  each one actually carries behind the login. */
  const rows = [
    { name: 'Dana Whitfield', where: 'Mandarin, Jacksonville', stage: 'Active Buyer', tone: 'brass',
      next: 'Text her about Windward Court' },
    { name: 'Marcus Ordonez', where: 'Riverside, Jacksonville', stage: 'New Lead', tone: 'urgent',
      next: 'Call — first contact, 9 hours overdue' },
    { name: 'Althea Njoku', where: 'Nocatee, St. Johns', stage: 'Under Contract', tone: 'calm',
      next: 'Submit the repair request — contingency ends Friday' },
  ] as const

  const chip = {
    brass:  'border-hair-brass text-brass',
    urgent: 'border-signal-urgent/35 text-signal-urgent',
    calm:   'border-signal-calm/40 text-signal-calm',
  }

  return (
    <PreviewFrame
      surface="CRM Intelligence"
      route="/crm"
      caption="Every record carries a stage, an age and the next action — derived, not typed in."
    >
      <ul className="divide-y divide-hair">
        {rows.map(r => (
          <li key={r.name} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="truncate text-[0.875rem] font-medium text-chalk">{r.name}</p>
              <p className="mt-0.5 text-[0.6875rem] tracking-normal text-chalk-faint">{r.where}</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:items-end">
              <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] ${chip[r.tone]}`}>
                {r.stage}
              </span>
              <p className="text-[0.75rem] leading-4 text-chalk-muted sm:text-right">{r.next}</p>
            </div>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  )
}

/**
 * Marketing — a listing campaign, assembled and held for approval.
 *
 * Listing facts and campaign text are the demo's own: 4407 Ortega Boulevard,
 * Coming Soon, and the campaign CampaignBuilder actually produces for it.
 *
 * The status line says review is REQUIRED, not that a check passed. An earlier
 * version claimed "Fair housing check passed" and no such check existed —
 * see ADR-0016. Do not reintroduce a passing claim until something evaluates
 * the copy and can fail it.
 */
export function PreviewMarketing() {
  return (
    <PreviewFrame
      surface="Marketing"
      route="/marketing"
      caption="A listing campaign written from the listing itself, and held until you approve it."
    >
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-micro uppercase text-brass-dim">
            4407 Ortega Boulevard
          </p>
          <PreviewPill state="approval" />
        </div>

        <div className="rounded-panel border border-hair bg-ink">
          <p className="border-b border-hair px-3 py-2 text-[0.625rem] uppercase tracking-[0.1em] text-brass-dim">
            Social — Instagram
          </p>
          <p className="px-3 py-2.5 text-[0.8125rem] leading-5 text-chalk">
            Coming soon in Ortega. Five bedrooms, 3,910 square feet, and a screened porch
            that runs the whole back of the house. Open Saturday 1–3.
          </p>
        </div>

        <div className="rounded-panel border border-hair bg-ink">
          <p className="border-b border-hair px-3 py-2 text-[0.625rem] uppercase tracking-[0.1em] text-brass-dim">
            Open house plan
          </p>
          <p className="px-3 py-2.5 text-[0.8125rem] leading-5 text-chalk">
            Saturday 1–3pm · sign-in via QR · 40 neighbour invitations · same-day follow-up
            drafted for every registrant.
          </p>
        </div>

        <p className="flex items-center gap-2 text-[0.75rem] text-brass">
          <span aria-hidden className="h-1 w-1 rounded-full bg-brass-fill" />
          Compliance review required
        </p>
      </div>
    </PreviewFrame>
  )
}

/**
 * Training — the AI Academy.
 *
 * THIS ONE IS DATA-DRIVEN, unlike the other four, and deliberately so. The
 * Academy is the real AI Advantage curriculum, and most of it is paid content
 * in the source project. Retyping course titles here would eventually put a
 * paid course on a public page, so the rows come from OPEN_COURSES — the
 * courses the curriculum itself designates as publicly viewable. If that set
 * changes, this preview changes with it.
 *
 * Progress is shown because continuing where you left off is the behaviour the
 * Academy is built around. The percentages illustrate one agent's place in the
 * demo; they are not a claim about completion rates, and the caption says the
 * curriculum is written rather than filmed, because only two of its lessons
 * have finished video.
 */
export function PreviewAcademy() {
  /** Illustrative positions — first course finished, second underway, third
   *  untouched — so the progress affordance has something to show. */
  const progressByIndex = [100, 40, 0]

  return (
    <PreviewFrame
      surface="Training"
      route="/training"
      caption="The AI Advantage curriculum, with progress carried forward. Written lessons, prompts and handouts."
    >
      <ul className="divide-y divide-hair">
        {OPEN_COURSES.slice(0, 3).map((c, i) => {
          const progress = progressByIndex[i] ?? 0
          return (
            <li key={c.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="min-w-0 text-[0.875rem] font-medium text-chalk">{c.title}</p>
                <span className={`shrink-0 text-[0.75rem] ${
                  progress === 100 ? 'text-signal-calm'
                    : progress > 0 ? 'text-brass'
                    : 'text-chalk-faint'
                }`}>
                  {progress === 100 ? 'Complete' : progress > 0 ? `${progress}%` : 'Not started'}
                </span>
              </div>
              <p className="mt-0.5 text-[0.6875rem] tracking-normal text-chalk-faint">
                {c.level} · {c.lessonCount} lessons · {c.promptCount} prompts
              </p>
              <div aria-hidden className="mt-2 h-1 overflow-hidden rounded-full bg-hair">
                <div className="h-full rounded-full bg-brass-fill" style={{ width: `${progress}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </PreviewFrame>
  )
}
