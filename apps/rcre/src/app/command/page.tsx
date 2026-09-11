import { getActor } from '@/lib/auth/session'
import { getRepository } from '@/lib/db'
import { canSeeWholeBrokerage } from '@/lib/db/repository'
import { buildBrokerMetrics, formatDuration } from '@/lib/insights/engine'
import { EmptyState } from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

/** A tile renders ONLY when its metric has data. No data = no tile. */
function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-ink-mute">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-mute">{hint}</p>}
    </div>
  )
}

export default async function CommandPage() {
  const actor = await getActor()
  if (!actor) return <EmptyState title="Not signed in" detail="Authentication is not wired yet." />

  if (!canSeeWholeBrokerage(actor.role)) {
    const repo = await getRepository()
    await repo.recordAudit({
      organizationId: actor.organizationId, actorUserId: actor.userId,
      actorKind: 'user', action: 'view_command', effect: 'read',
      allowed: false, deniedReason: `role '${actor.role}' is not a broker`,
    })
    return (
      <EmptyState
        title="Broker access only"
        detail="RCRE Command shows the whole brokerage. Your role does not include brokerage-wide visibility."
      />
    )
  }

  const repo = await getRepository()
  const [people, tasks, deals, users] = await Promise.all([
    repo.listPeople(actor), repo.listTasks(actor),
    repo.listDeals(actor), repo.listUsers(actor),
  ])
  const m = buildBrokerMetrics(new Date().toISOString(), people, tasks, deals)
  const nameOf = (id: string) => users.find(u => u.id === id)?.fullName ?? 'Unknown agent'

  await repo.recordAudit({
    organizationId: actor.organizationId, actorUserId: actor.userId,
    actorKind: 'user', action: 'view_command', effect: 'read', allowed: true,
  })

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">RCRE Command</h1>
        <p className="mt-1 text-ink-soft">Exceptions that need a decision — not a dashboard.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="New leads (24h)" value={String(m.newLeads24h)} />
        <Tile label="Unanswered leads" value={String(m.unansweredLeads)}
              hint={m.unansweredLeads > 0 ? 'Needs intervention' : undefined} />
        {/* Rendered only when computable. A zero here would be a lie. */}
        {m.medianFirstResponseMinutes !== null && (
          <Tile label="Median first response" value={formatDuration(m.medianFirstResponseMinutes)} />
        )}
        {(m.activeDeals > 0 || m.stalledDeals > 0) && (
          <Tile label="Active deals" value={String(m.activeDeals)}
                hint={m.stalledDeals > 0 ? `${m.stalledDeals} stalled` : undefined} />
        )}
      </section>

      {m.agentsWithOverdueTasks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
            Agents with overdue follow-up
          </h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-white">
            {m.agentsWithOverdueTasks.map(a => (
              <li key={a.userId} className="flex justify-between px-4 py-3">
                <span>{nameOf(a.userId)}</span>
                <span className="text-ink-mute">
                  {a.count} overdue {a.count === 1 ? 'task' : 'tasks'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {m.leadsBySource.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
            Lead sources (24h)
          </h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-white">
            {m.leadsBySource.map(s => (
              <li key={s.source} className="flex justify-between px-4 py-3">
                <span>{s.source}</span><span className="text-ink-mute">{s.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Honesty panel: name what we cannot compute rather than faking a tile. */}
      {m.unavailable.length > 0 && (
        <section className="rounded-lg border border-dashed border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
            Not yet measurable
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-mute">
            {m.unavailable.map((u, i) => <li key={i}>· {u}</li>)}
          </ul>
        </section>
      )}
    </div>
  )
}
