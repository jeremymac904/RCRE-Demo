import { dataMode } from '@/lib/config/env'

export const metadata = {
  title: 'Join RCRE',
  description: 'An AI-powered real estate business operating system for RCRE agents.',
}

/**
 * RCRE recruiting page — MVP prototype.
 *
 * DELIBERATE OMISSIONS. This page contains no commission figures, no splits, no
 * fees, and no testimonials, because RCRE has not supplied them
 * (discovery items 2 and 9). Inventing them would be worse than leaving the
 * gaps visible — a recruit who is quoted a made-up split and later learns the
 * real one is a lost recruit and a credibility problem.
 *
 * Everything claimed below describes capability that either exists in this MVP
 * or is honestly labelled as in development.
 */

const PLACEHOLDER = dataMode() === 'fixtures'

function Pending({ children }: { children: React.ReactNode }) {
  if (!PLACEHOLDER) return null
  return (
    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      {children}
    </span>
  )
}

export default function JoinPage() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-rcre-accent">
          For licensed agents in Alabama and Florida
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight">
          RCRE gives its agents an AI-powered real estate business operating system.
        </h1>
        <p className="max-w-2xl text-lg text-ink-soft">
          Not a chatbot. Not a training course. A system that knows your pipeline,
          tells you who to contact and why, and prepares the work before you ask.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">What you actually get</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: 'Your morning, prepared',
              body: 'Every weekday: new leads, who never got followed up, who has gone quiet, what is due. Each item explains why it surfaced — not a score, a reason.',
            },
            {
              title: 'It knows your database',
              body: 'Built on the brokerage CRM you already use. Ask who to follow up with today and it answers from your actual contacts, not generic advice.',
            },
            {
              title: 'Work prepared for approval',
              body: 'Follow-ups drafted, tasks queued, campaigns assembled. Nothing sends until you approve it.',
            },
            {
              title: 'An assistant that knows RCRE',
              body: 'Brokerage procedures, forms and process — answered with a citation, so you stop guessing and stop interrupting the broker.',
            },
          ].map(f => (
            <div key={f.title} className="rounded-lg border border-line bg-white p-5">
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Compensation<Pending>Awaiting RCRE</Pending>
        </h2>
        <p className="max-w-2xl text-ink-soft">
          Splits, caps and fees are discussed openly in the first conversation.
          {PLACEHOLDER && (
            <span className="block mt-2 text-sm text-amber-800">
              This section is intentionally blank in the prototype. RCRE has not
              yet supplied the commission schedule, and nothing here will be
              invented.
            </span>
          )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Agents on the team<Pending>Awaiting RCRE</Pending>
        </h2>
        {PLACEHOLDER && (
          <p className="max-w-2xl text-sm text-amber-800">
            Testimonials will come from real RCRE agents with their consent. No
            placeholder quotes are shown — fabricated testimonials are a legal
            and credibility risk, not a design detail.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Start a confidential conversation</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Most agents who contact us are currently licensed somewhere else.
            Inquiries stay inside RCRE — they are never sent to the brokerage CRM
            and never appear in any shared pipeline.
          </p>
        </div>

        <form method="post" action="/api/leads" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="kind" value="recruiting" />
          <label className="text-sm">
            <span className="block font-medium">First name</span>
            <input name="firstName" required
              className="mt-1 w-full rounded border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="block font-medium">Last name</span>
            <input name="lastName"
              className="mt-1 w-full rounded border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="block font-medium">Email</span>
            <input name="email" type="email"
              className="mt-1 w-full rounded border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="block font-medium">Phone</span>
            <input name="phone" type="tel"
              className="mt-1 w-full rounded border border-line px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="block font-medium">What are you looking for?</span>
            <textarea name="message" rows={3}
              className="mt-1 w-full rounded border border-line px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit"
              className="rounded bg-rcre px-5 py-2.5 font-medium text-white hover:bg-rcre-deep">
              Request a confidential conversation
            </button>
            {PLACEHOLDER && (
              <p className="mt-2 text-xs text-amber-800">
                Prototype: submissions are validated and acknowledged but not yet
                persisted or routed to anyone.
              </p>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
