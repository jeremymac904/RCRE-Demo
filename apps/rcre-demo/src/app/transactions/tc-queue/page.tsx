'use client'
import { useEffect, useState } from 'react'
import type { TransactionRecord } from '@/lib/services/transactions'
import { calculateDeadline, type DeadlineTerm } from '@/lib/services/deadlines'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = 'oldest' | 'deadline' | 'newest'
type StatusFilter = 'all' | 'active' | 'pending_signature' | 'closed'

interface QueueItem extends TransactionRecord {
  nextDeadline: string
  overdueCount: number
  daysInStage: number
}

interface ApiResponse {
  transactions: TransactionRecord[]
  actor: { id: string; name: string; role: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextDeadline(t: TransactionRecord): string {
  return t.deadlines
    .map((d) => calculateDeadline(d).date)
    .filter((d): d is string => !!d)
    .sort()[0] ?? '9999'
}

function overdueCount(t: TransactionRecord): number {
  const now = new Date()
  return t.deadlines.filter((d) => {
    const date = calculateDeadline(d).date
    if (!date) return false
    return new Date(date) < now
  }).length
}

function daysInStage(t: TransactionRecord): number {
  const lastUpdate = new Date(t.updatedAt).getTime()
  return Math.floor((Date.now() - lastUpdate) / 86400000)
}

function buildQueueItem(t: TransactionRecord): QueueItem {
  return {
    ...t,
    nextDeadline: nextDeadline(t),
    overdueCount: overdueCount(t),
    daysInStage: daysInStage(t),
  }
}

function statusLabel(s: TransactionRecord['status']): string {
  return {
    active: 'In Progress',
    pending_signature: 'Awaiting Signatures',
    closed: 'Closed',
    archived: 'Archived',
  }[s]
}

function statusColor(s: TransactionRecord['status']): string {
  return {
    active: 'text-signal-go',
    pending_signature: 'text-signal-caution',
    closed: 'text-chalk-muted',
    archived: 'text-chalk-faint',
  }[s]
}

function criticalDeadlines(items: QueueItem[]): QueueItem[] {
  const twoDaysFromNow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  return items.filter(
    (i) => i.nextDeadline !== '9999' && i.nextDeadline <= twoDaysFromNow
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CriticalBanner({ items }: { items: QueueItem[] }) {
  if (!items.length) return null
  return (
    <div className="rounded-panel border border-signal-caution bg-signal-caution/10 p-4 mb-6">
      <p className="font-display text-signal-caution text-sm">
        ⚠ {items.length} transaction{items.length > 1 ? 's' : ''} with deadlines within 48 hours
      </p>
      <ul className="mt-2 space-y-1">
        {items.slice(0, 5).map((i) => (
          <li key={i.id} className="text-xs text-chalk-muted">
            {i.address} — deadline {i.nextDeadline}
            {overdueCount(i) > 0 && ' · OVERDUE'}
          </li>
        ))}
        {items.length > 5 && (
          <li className="text-xs text-chalk-muted">…and {items.length - 5} more</li>
        )}
      </ul>
    </div>
  )
}

function QueueCard({ item }: { item: QueueItem }) {
  const [open, setOpen] = useState(false)
  const isOverdue = overdueCount(item) > 0

  return (
    <div className={`rounded-panel border p-4 ${isOverdue ? 'border-signal-hot/50 bg-signal-hot/5' : 'border-hair bg-canvas'}`}>
      <button
        className="w-full text-left flex items-start justify-between gap-3"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="font-medium text-chalk truncate">{item.address}</p>
          <p className="text-sm text-chalk-muted">
            {item.client}
            {item.representation !== 'unknown' && (
              <span className="ml-2 text-brass">({item.representation})</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-1">
          <span className={`text-xs font-mono ${statusColor(item.status)}`}>
            {statusLabel(item.status)}
          </span>
          {isOverdue && (
            <span className="text-xs text-signal-hot font-medium">
              {overdueCount(item)} overdue
            </span>
          )}
          <span className="text-xs text-chalk-faint">
            {item.daysInStage}d
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-hair space-y-2">
          {item.nextDeadline !== '9999' && (
            <div className="flex justify-between text-sm">
              <span className="text-chalk-muted">Next deadline</span>
              <span className={`font-mono ${isOverdue ? 'text-signal-hot' : 'text-chalk'}`}>
                {item.nextDeadline}
              </span>
            </div>
          )}
          {item.deadlines.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-chalk-muted uppercase tracking-wider">Deadlines</p>
              {item.deadlines.slice(0, 6).map((d) => {
                const calc = calculateDeadline(d)
                const overdue = calc.date ? new Date(calc.date) < new Date() : false
                return (
                  <div key={d.id} className="flex justify-between text-xs">
                    <span className="text-chalk-muted">{d.label}</span>
                    <span className={overdue ? 'text-signal-hot' : 'text-chalk'}>{calc.date ?? 'pending'}</span>
                  </div>
                )
              })}
            </div>
          )}
          {item.checklist.filter((c) => !c.done).length > 0 && (
            <div>
              <p className="text-xs text-chalk-muted uppercase tracking-wider">
                Open items ({item.checklist.filter((c) => !c.done).length})
              </p>
              {item.checklist
                .filter((c) => !c.done)
                .slice(0, 4)
                .map((c) => (
                  <p key={c.id} className="text-xs text-chalk-muted mt-1">• {c.label}</p>
                ))}
            </div>
          )}
          <a
            href={`/transactions/${item.id}`}
            className="btn-ghost text-xs mt-2 inline-block"
          >
            Open transaction →
          </a>
        </div>
      )}
    </div>
  )
}

function StatusColumn({
  label,
  items,
  accent,
}: {
  label: string
  items: QueueItem[]
  accent: string
}) {
  return (
    <div className="flex-1 min-w-64">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${accent}`} />
        <h3 className="font-display text-sm">{label}</h3>
        <span className="text-xs text-chalk-muted ml-auto">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-chalk-faint italic py-4 text-center">No transactions</p>
        )}
        {items.map((item) => (
          <QueueCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TCQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [tcName, setTcName] = useState('')
  const [sort, setSort] = useState<SortKey>('oldest')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/transactions/tc-queue')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: ApiResponse) => {
        setTcName(data.actor.name)
        setQueue(data.transactions.map(buildQueueItem))
      })
      .catch((e) => setError(e.message))
  }, [])

  const filtered = queue.filter(
    (t) => filter === 'all' || t.status === filter || (filter === 'closed' && t.status === 'closed')
  )

  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'closed' && b.status !== 'closed') return 1
    if (b.status === 'closed' && a.status !== 'closed') return -1
    if (sort === 'oldest') return a.daysInStage - b.daysInStage
    if (sort === 'deadline') return a.nextDeadline.localeCompare(b.nextDeadline)
    return b.nextDeadline.localeCompare(a.nextDeadline) // 'newest'
  })

  const columns: { key: TransactionRecord['status']; label: string; color: string }[] = [
    { key: 'active', label: 'In Progress', color: 'bg-signal-go' },
    { key: 'pending_signature', label: 'Awaiting Signatures', color: 'bg-signal-caution' },
    { key: 'closed', label: 'Closed', color: 'bg-chalk-muted' },
  ]

  const critItems = criticalDeadlines(sorted)

  return (
    <div className="mx-auto max-w-7xl p-5 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow text-brass">Transaction Coordinator</p>
          <h1 className="font-display text-h2 mt-1">My Queue</h1>
          {tcName && <p className="text-sm text-chalk-muted mt-1">{tcName}</p>}
        </div>
        <div className="flex gap-3 items-center">
          <span className="rounded-full bg-brass/20 text-brass text-sm font-medium px-3 py-1">
            {queue.length} total
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex gap-2">
          {(['oldest', 'deadline', 'newest'] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                sort === k
                  ? 'border-brass bg-brass/20 text-brass'
                  : 'border-hair text-chalk-muted hover:border-chalk-muted'
              }`}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'pending_signature', 'closed'] as StatusFilter[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === k
                  ? 'border-brass bg-brass/20 text-brass'
                  : 'border-hair text-chalk-muted hover:border-chalk-muted'
              }`}
            >
              {k === 'all' ? 'All' : statusLabel(k)}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-signal-hot text-sm">{error}</p>}

      <CriticalBanner items={critItems} />

      {/* Pipeline columns */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((col) => (
          <StatusColumn
            key={col.key}
            label={col.label}
            accent={col.color}
            items={sorted.filter((t) => t.status === col.key)}
          />
        ))}
      </div>
    </div>
  )
}
