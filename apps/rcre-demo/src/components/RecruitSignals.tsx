import { DEMO_NOW, type DemoRecruit } from '@/data/demo'

/**
 * The four recruiting signals that are not a phone call.
 *
 * Academy progress, public-site behaviour, last contact and onboarding step
 * are what separate a prospect who is already sold from one who answered the
 * phone politely. They are shown as facts with dates rather than as a score,
 * because a recruiter has to be able to say where the number came from.
 *
 * Every figure is synthetic demonstration data.
 */

const since = (iso: string | null) => {
  if (!iso) return null
  const d = Math.floor((DEMO_NOW.getTime() - new Date(iso).getTime()) / 86_400_000)
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`
}

export function RecruitTraining({ training }: { training: DemoRecruit['training'] }) {
  if (!training) return null
  const pct = training.coursesTotal === 0 ? 0
    : Math.round((training.coursesCompleted / training.coursesTotal) * 100)
  const last = since(training.lastActivityAt)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body text-chalk-muted">AI Academy</span>
        <span className="text-body text-chalk">
          {training.coursesCompleted}/{training.coursesTotal} courses
        </span>
      </div>
      <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-ink-sunken">
        <div className="h-full rounded-full bg-brass-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-micro tracking-normal text-chalk-faint">
        {last ? `Last lesson ${last}` : 'Never enrolled'}
      </p>
    </div>
  )
}

export function RecruitWebsite({ web }: { web: DemoRecruit['websiteEngagement'] }) {
  if (!web) return null
  const last = since(web.lastVisitAt)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body text-chalk-muted">Join page</span>
        <span className="text-body text-chalk">
          {web.joinPageViews} {web.joinPageViews === 1 ? 'visit' : 'visits'}
        </span>
      </div>
      <p className="mt-1.5 text-micro tracking-normal text-chalk-faint">
        {last ? `${web.minutesOnSite} minutes on site · last ${last}` : 'Has not visited the site'}
      </p>
    </div>
  )
}

/** Movement toward onboarding. Steps are the RCRE joining sequence, not a CRM stage. */
const ONBOARDING_STEPS = [
  'Not started', 'Paperwork sent', 'License transfer', 'Systems setup', 'Complete',
] as const

export function RecruitOnboarding({ step }: { step: DemoRecruit['onboardingStep'] }) {
  const current = ONBOARDING_STEPS.indexOf(step ?? 'Not started')
  return (
    <div>
      <ol className="flex gap-1.5">
        {ONBOARDING_STEPS.slice(1).map((label, i) => (
          <li key={label} className="flex-1" title={label}>
            <span aria-hidden className={`block h-[3px] rounded-full ${
              i < current ? 'bg-brass-fill' : 'bg-hair-strong'}`} />
          </li>
        ))}
      </ol>
      <p className="mt-2 text-body text-chalk-muted">
        Onboarding: <span className="text-chalk">{step ?? 'Not started'}</span>
        {current <= 0 && <span className="text-chalk-faint"> — nothing to chase yet</span>}
      </p>
    </div>
  )
}

/** Urgency stated in words; colour reinforces it rather than carrying it alone. */
export function RecruitUrgency({ urgency }: { urgency: 'now' | 'today' | 'this week' }) {
  return (
    <span className={`text-micro uppercase tracking-[0.1em] ${
      urgency === 'now' ? 'text-signal-urgent'
        : urgency === 'today' ? 'text-brass'
        : 'text-chalk-faint'}`}>
      {urgency}
    </span>
  )
}

export function RecruitPriority({ priority }: { priority?: 'high' | 'medium' | 'low' }) {
  if (!priority) return null
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-micro uppercase tracking-[0.1em] ${
      priority === 'high'
        ? 'border-hair-brass text-brass'
        : 'border-hair text-chalk-faint'}`}>
      {priority} priority
    </span>
  )
}
