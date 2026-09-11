'use client'
import { useEffect, useState } from 'react'
import type { TransactionRecord } from '@/lib/services/transactions'
import { calculateDeadline } from '@/lib/services/deadlines'

interface QueueItem extends TransactionRecord {
  nextDeadline: string
  overdue: boolean
}

function PipelineBar({ items }: { items: QueueItem[] }) {
  const total = items.length
  if (!total) return null

  const closed = items.filter((i) => i.status === 'closed').length
  const pending = items.filter((i) => i.status === 'pending_signature').length
  const active = items.filter((i) => i.status === 'active').length

  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-hair gap-px mb-6">
      {active > 0 && <div className="bg-signal-go h-full" style={{ width: `${(active / total) * 100}%` }} />}
      {pending > 0 && <div className="bg-signal-caution h-full" style={{ width: `${(pending / total) * 100}%` }} />}
      {closed > 0 && <div className="bg-chalk-muted h-full" style={{ width: `${(closed / total) * 100}%` }} />}
    </div>
  )
}

function TransactionRow({ item }: { item: QueueItem }) {
  const isOverdue = item.overdue
  return (
    <tr className={`border-b border-hair ${isOverdue ? 'bg-signal-hot/5' : ''}`}>
      <td className="py-3 px-3">
        <a href={`/transactions/${item.id}`} className="text-chalk hover:text-brass font-medium text-sm">
          {item.address}
        </a>
        <p className="text-xs text-chalk-muted mt-0.5">{item.client}</p>
      </td>
      <td className="py-3 px-3">
        <span className="text-xs capitalize text-chalk-muted">{item.representation}</span>
      </td>
      <td className="py-3 px-3">
        {item.nextDeadline !== '9999' ? (
          <span className={`text-xs font-mono ${isOverdue ? 'text-signal-hot' : 'text-chalk'}`}>
            {item.nextDeadline}
          </span>
        ) : (
          <span className="text-xs text-chalk-faint">—</span>
        )}
      </td>
      <td className="py-3 px-3">
        <span className={`text-xs ${
          item.status === 'closed' ? 'text-chalk-muted' :
          item.status === 'pending_signature' ? 'text-signal-caution' :
          isOverdue ? 'text-signal-hot' : 'text-signal-go'
        }`}>
          {item.status === 'active' ? 'Active' :
           item.status === 'pending_signature' ? 'Signatures' :
           item.status === 'closed' ? 'Closed' : item.status}
        </span>
      </td>
      <td className="py-3 px-3 text-right">
        <a href={`/transactions/${item.id}`} className="text-xs text-brass hover:underline">
          Open →
        </a>
      </td>
    </tr>
  )
}

export default function MyTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/transactions/my')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { transactions: TransactionRecord[] }) => setTransactions(data.transactions))
      .catch((e) => setError(e.message))
  }, [])

  const items: QueueItem[] = transactions.map((t) => ({
    ...t,
    nextDeadline: t.deadlines.map((d) => calculateDeadline(d).date).filter(Boolean).sort()[0] ?? '9999',
    overdue: t.deadlines.some((d) => {
      const date = calculateDeadline(d).date
      return date ? new Date(date) < new Date() : false
    }),
  }))

  const sorted = [...items].sort((a, b) => {
    if (a.status === 'closed' && b.status !== 'closed') return 1
    if (b.status === 'closed' && a.status !== 'closed') return -1
    return a.nextDeadline.localeCompare(b.nextDeadline)
  })

  return (
    <div className="mx-auto max-w-5xl p-5 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow text-brass">My Pipeline</p>
          <h1 className="font-display text-h2 mt-1">Transactions</h1>
        </div>
        <span className="rounded-full bg-brass/20 text-brass text-sm font-medium px-3 py-1">
          {transactions.length} total
        </span>
      </div>

      <PipelineBar items={items} />

      {error && <p role="alert" className="text-signal-hot text-sm mb-4">{error}</p>}

      {transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-chalk-muted">No transactions yet.</p>
        </div>
      ) : (
        <div className="rounded-panel border border-hair overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hair bg-canvas">
                <th className="text-left text-xs text-chalk-muted py-2 px-3 font-medium">Property / Client</th>
                <th className="text-left text-xs text-chalk-muted py-2 px-3 font-medium">Side</th>
                <th className="text-left text-xs text-chalk-muted py-2 px-3 font-medium">Next Deadline</th>
                <th className="text-left text-xs text-chalk-muted py-2 px-3 font-medium">Status</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <TransactionRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
