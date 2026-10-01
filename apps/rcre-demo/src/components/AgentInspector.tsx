'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { AgentInspection } from '@/lib/agent-inspector'

type LegacyAgent = NonNullable<AgentInspection['agent']>
type InspectorAgent = Omit<LegacyAgent, 'inactiveDays' | 'summary' | 'training'> & {
  inactiveDays: number | null
  summary: Record<string, number | null>
  training: Omit<LegacyAgent['training'], 'completedLessonCount' | 'totalImportedLessons'> & {
    completedLessonCount: number | null
    totalImportedLessons: number | null
    availability?: string
  }
  coverage?: Record<string, string>
}
type InspectorData = Omit<AgentInspection, 'agent'> & {
  agent: InspectorAgent | null
  coverage?: Record<string, string>
}

const date = (s: string | null | undefined) => s ? new Date(s).toLocaleString() : 'Unknown / not recorded'
const displayValue = (value: number | null) => value === null ? 'Unknown' : value
const labels: Record<string, string> = {
  leads: 'Current leads',
  noRecordedFirstOutreach: 'No recorded first outreach',
  contactedInactive: 'Contacted, inactive',
  recordedCallAttempts: 'Recorded outbound call events',
  explicitConnectedConversations: 'Explicit connected conversations',
  overdueTasks: 'Overdue tasks',
}

export function AgentInspector({ agentId }: { agentId?: string }) {
  const [data, setData] = useState<InspectorData | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/agent-inspector' + (agentId ? '?agentId=' + encodeURIComponent(agentId) : ''))
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setData(body as InspectorData)
      setError('')
    } catch (cause) {
      setError((cause as Error).message)
    }
  }, [agentId])

  useEffect(() => { void load() }, [load])
  const agent = data?.agent
  const field = 'border border-hair rounded-control bg-ink-raised px-3 py-2 text-chalk'
  const inactiveAvailable = typeof agent?.inactiveDays === 'number' && Number.isFinite(agent.inactiveDays) && agent.inactiveDays >= 0
  const visibleContacts = agent?.contacts.filter(contact => {
    if (filter === 'never') return !contact.firstTouchAt
    if (filter === 'inactive') return inactiveAvailable && Boolean(contact.firstTouchAt)
      && (!contact.lastOutboundAt || Date.now() - Date.parse(contact.lastOutboundAt) > agent.inactiveDays! * 86_400_000)
    return true
  }) ?? []

  return <div className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10">
    <p className="eyebrow">{data?.coverage?.source ? 'Broker workspace · Durable CRM records' : 'Broker workspace · Synthetic local records'}</p>
    <h1 className="font-display text-h2 mt-3">{agent ? agent.name : 'Agent inspection'}</h1>
    <p className="text-chalk-muted mt-3 max-w-3xl">Inspect recorded evidence, commitments and training in one place. Missing events indicate a coverage gap; they do not prove that a person never made contact.</p>
    {error && <div role="alert" className="border border-red-500 p-4 mt-5">{error}<button className="underline ml-4" onClick={() => void load()}>Retry</button></div>}
    <nav className="flex flex-wrap gap-3 my-6">
      <Link className="btn-ghost" href="/command">Command</Link>
      {agentId && <Link className="btn-ghost" href="/agents">All scoped agents</Link>}
      <button className="btn-ghost" onClick={() => void load()}>Refresh evidence</button>
      {agent && <a className="btn-ghost" href={'/api/agent-inspector?agentId=' + encodeURIComponent(agent.id) + '&download=1'}>Download scoped inspection</a>}
    </nav>

    {!data && !error && <p role="status">Loading scoped records…</p>}
    {data && !agent && <>
      <label className="block">Find an agent<input className={field + ' block w-full max-w-md mt-2'} value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or market" /></label>
      <div className="mt-6 divide-y divide-hair">
        {data.roster.filter(row => `${row.name} ${row.market}`.toLowerCase().includes(query.toLowerCase())).map(row => <article key={row.id} className="py-5 flex flex-wrap justify-between gap-4">
          <div><h2 className="font-display text-h3"><Link href={'/agents/' + row.id}>{row.name}</Link></h2><p className="text-chalk-muted">{row.market} · {row.leads} scoped leads · {row.overdueTasks} overdue tasks</p></div>
          <Link className="btn-ghost" href={'/agents/' + row.id}>Inspect agent →</Link>
        </article>)}
      </div>
      {!data.roster.length && <p>No agents in your authorized office scope.</p>}
    </>}

    {agent && <>
      <p className="text-label text-chalk-muted">{agent.market} · Evidence refreshed {date(agent.generatedAt)}</p>
      <dl className="grid grid-cols-2 lg:grid-cols-3 gap-6 my-8">
        {Object.entries(agent.summary).map(([key, value]) => <div key={key} className="border-t border-hair pt-3">
          <dt className="text-label text-chalk-muted">{key === 'contactedInactive' && agent.inactiveDays === null ? 'Contact inactivity threshold unavailable' : labels[key] ?? key}</dt>
          <dd className="font-display text-h3 mt-2">{displayValue(value)}</dd>
        </div>)}
      </dl>

      <section className="mt-10">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <h2 className="font-display text-h3">Leads and outreach evidence</h2>
          <select aria-label="Outreach evidence filter" className={field} value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="all">All leads</option><option value="never">No recorded first outreach</option>
            <option value="inactive" disabled={!inactiveAvailable}>{inactiveAvailable ? 'Contacted, now inactive' : 'Contact inactivity filter unavailable'}</option>
          </select>
        </div>
        {visibleContacts.map(contact => <article key={contact.id} className="py-4 border-b border-hair">
          <Link className="font-semibold underline" href={contact.href}>{contact.name}</Link>
          <p className="text-chalk-muted text-label mt-1">{contact.source} · {contact.stage} · Current stage entered {date(contact.stageEnteredAt)}</p>
          <p className="text-label mt-1">Last recorded outbound: {date(contact.lastOutboundAt)}</p>
          {agent.stageEvidence.find(item => item.contactId === contact.id)?.reasons.map(reason => <p className="text-label text-chalk-muted mt-1" key={reason}>{reason}</p>)}
        </article>)}
        {!agent.contacts.length && <p className="py-5 text-chalk-muted">No assigned leads.</p>}
        {agent.contacts.length > 0 && !visibleContacts.length && <p className="py-5 text-chalk-muted">No leads match this evidence filter.</p>}
      </section>

      <div className="grid lg:grid-cols-2 gap-10 mt-10">
        <section><h2 className="font-display text-h3">Tasks and commitments</h2>
          {agent.tasks.map(task => <article key={task.id} className="border-b border-hair py-4"><p>{task.done ? 'Completed · ' : ''}{task.title}</p><p className="text-label text-chalk-muted">Due {date(task.dueAt)}</p><Link className="underline text-label" href={task.contactId ? '/crm/' + task.contactId : '/command'}>Open source task</Link></article>)}
          {!agent.tasks.length && <p className="mt-4 text-chalk-muted">No recorded CRM tasks are available in this source.</p>}
        </section>
        <section><h2 className="font-display text-h3">Calendar commitments</h2>
          {agent.appointments.map(event => <article key={event.id} className="border-b border-hair py-4"><p>{event.title}</p><p className="text-label text-chalk-muted">{date(event.startsAt)} – {date(event.endsAt)}</p><p className="text-label">{event.kind === 'proposed block' ? 'Proposed block; not a confirmed client appointment' : 'Local calendar appointment'}</p><Link className="underline text-label" href="/calendar">Open calendar</Link></article>)}
          {!agent.appointments.length && <p className="mt-4 text-chalk-muted">No recorded CRM calendar appointments are available in this source.</p>}
        </section>
      </div>

      <section className="mt-10"><h2 className="font-display text-h3">Transaction concerns</h2>
        {agent.transactionConcerns.map(transaction => <article key={transaction.id} className="border-b border-hair py-5"><Link href={transaction.href} className="font-semibold underline">{transaction.address}</Link><p className="text-label text-chalk-muted mt-2">{transaction.status} · Closing {transaction.closingDate || 'not confirmed'} · {transaction.tcAssigned ? 'TC assigned' : 'TC not assigned'} · {transaction.pendingApprovals} pending approvals</p>{transaction.deadlines.map((deadline, index) => <details key={index} className="mt-3"><summary>{deadline.label}: {deadline.date || 'Cannot calculate'}</summary><p className="text-label text-chalk-muted mt-2">{deadline.reason}</p><p className="text-label mt-2">Source term: {deadline.sourceTerm || 'Missing'}</p></details>)}<p className="text-label mt-3">Incomplete checklist: {transaction.missingItems.join(', ') || 'No incomplete items'}</p></article>)}
        {!agent.transactionConcerns.length && <p className="mt-4 text-chalk-muted">{agent.coverage?.transactions ? `Transaction data unavailable in this view. ${agent.coverage.transactions}` : 'No assigned transactions in your scope.'}</p>}
      </section>

      <section className="mt-10"><h2 className="font-display text-h3">Training progress</h2>
        {agent.training.availability ? <p className="mt-4 text-chalk-muted">Training progress unavailable in this CRM-only view. {agent.training.availability}</p> : <>
          <p className="mt-4">{displayValue(agent.training.completedLessonCount)} completed learner-recorded lesson/course actions · {displayValue(agent.training.totalImportedLessons)} lessons available.</p>
          <p className="text-label text-chalk-muted mt-2">Completion is a learner-recorded action, not proof of learning or certification.</p>
          {agent.training.assignments.map(item => <article key={item.id} className="border-b border-hair py-4"><Link className="underline" href={/^c\d+$/.test(item.courseId) ? '/training/classroom/' + item.courseId : '/training/manage#' + item.courseId}>{item.title}</Link><p className="text-label">Due {item.due} · {item.complete ? 'Completed' : 'Not yet complete'}</p></article>)}
          {!agent.training.assignments.length && <p className="text-chalk-muted mt-3">No current training assignments.</p>}
        </>}
      </section>

      <section className="mt-10"><h2 className="font-display text-h3">Recorded activity ledger</h2><p className="text-label text-chalk-muted mt-3">Most recent {Math.min(agent.events.length, 100)} of {agent.events.length} events. The scoped export includes all events.</p>
        {agent.events.slice(0, 100).map(event => <article key={event.evidenceId} className="border-b border-hair py-3"><Link className="underline" href={event.href}>{event.contactName}</Link><p className="mt-1">{event.label}</p><p className="text-label text-chalk-muted">{date(event.at)} · {event.kind} · {event.direction}</p></article>)}
        {!agent.events.length && <p className="text-chalk-muted mt-4">No captured activity. External history coverage is unknown.</p>}
      </section>

      <section className="mt-10"><h2 className="font-display text-h3">Assignment responsibility history</h2>
        {agent.assignmentHistory.map((history, index) => <p key={index} className="py-3 border-b border-hair text-label"><Link className="underline" href={'/crm/' + history.contactId}>Contact assignment</Link> · {data?.roster.find(row => row.id === history.from)?.name || history.from} → {data?.roster.find(row => row.id === history.to)?.name || history.to} · {date(history.at)}</p>)}
        {!agent.assignmentHistory.length && <p className="text-chalk-muted mt-3">No reassignment event is recorded for the currently assigned leads. Original receipt is not proof of final-assignment responsibility.</p>}
      </section>
      <section className="mt-10 border-t border-hair pt-6"><h2 className="font-display text-h3">Source coverage</h2>
        {agent.sourceCoverage.map(source => <p key={source.source} className="mt-3 text-label text-chalk-muted"><strong>{source.source}: {source.records} records.</strong> {source.coverage}</p>)}
        <p className="mt-4 text-label text-chalk-muted">SMS delivery does not establish a read receipt. Call attempts are distinct from connected conversations. Historical responsibility remains in assignment events and is not attributed automatically to the current agent.</p>
      </section>
    </>}
  </div>
}
