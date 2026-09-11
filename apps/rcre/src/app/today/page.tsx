import { getActor } from '@/lib/auth/session'
import { getRepository } from '@/lib/db'
import { buildToday, type AgentDataBundle } from '@/lib/insights/engine'
import { InsightCard } from '@/components/InsightCard'
import { EmptyState } from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const actor = await getActor()
  if (!actor) {
    return (
      <EmptyState
        title="Not signed in"
        detail="Authentication is not wired yet. In live mode RCRE fails closed rather than guessing an identity."
      />
    )
  }

  const repo = await getRepository()
  const people = await repo.listPeople(actor)
  const bundle: AgentDataBundle = {
    now: new Date().toISOString(),
    people,
    activityByPerson: await repo.listActivityForPeople(actor, people.map(p => p.id)),
    tasks: await repo.listTasks(actor),
    appointments: await repo.listAppointments(actor),
    deals: await repo.listDeals(actor),
  }

  const insights = buildToday(bundle)
  const user = await repo.getUser(actor.userId)

  await repo.recordAudit({
    organizationId: actor.organizationId, actorUserId: actor.userId,
    actorKind: 'user', action: 'view_today', effect: 'read', allowed: true,
    detail: { insightCount: insights.length },
  })

  const high = insights.filter(i => i.priority === 'high')
  const rest = insights.filter(i => i.priority !== 'high')

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {/* Full name, not the first token — fixture users share a first word,
              and "Good morning, Fixture." reads like a bug rather than a
              deliberate fixture label. */}
          Good morning{user?.fullName ? `, ${user.fullName}` : ''}.
        </h1>
        <p className="mt-1 text-ink-soft">
          {insights.length === 0
            ? 'Nothing needs your attention right now.'
            : `${insights.length} ${insights.length === 1 ? 'item needs' : 'items need'} your attention.`}
        </p>
      </header>

      {insights.length === 0 ? (
        <EmptyState
          title="Nothing surfaced today"
          detail="RCRE only shows insights backed by real connected data. An empty day means nothing met the thresholds — not that data is missing."
        />
      ) : (
        <>
          {high.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
                Do these first
              </h2>
              {high.map((i, n) => <InsightCard key={`h-${n}`} insight={i} />)}
            </section>
          )}
          {rest.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
                Also worth your time
              </h2>
              {rest.map((i, n) => <InsightCard key={`r-${n}`} insight={i} />)}
            </section>
          )}
        </>
      )}
    </div>
  )
}
