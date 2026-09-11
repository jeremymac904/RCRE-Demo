'use client'
import { useEffect, useState } from 'react'
import type { TransactionRecord } from '@/lib/services/transactions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExceptionType =
  | 'overdue_approval'
  | 'compliance_flag'
  | 'deadline_breach'
  | 'disputed_item'
  | 'stalled_negotiation'
  | 'missing_document'

export interface TransactionException {
  id: string
  transactionId: string
  type: ExceptionType
  description: string
  severity: 'critical' | 'high' | 'medium'
  createdAt: string
  ageDays: number
  transaction: Pick<TransactionRecord, 'id' | 'address' | 'client' | 'status' | 'updatedAt'>
  assignedTc: string
  assignedAgent: string
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  resolution?: string
}

interface ApiResponse {
  exceptions: TransactionException[]
  resolved: TransactionException[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exceptionLabel(type: ExceptionType): string {
  return {
    overdue_approval: 'Overdue Approval',
    compliance_flag: 'Compliance Flag',
    deadline_breach: 'Deadline Breach',
    disputed_item: 'Disputed Item',
    stalled_negotiation: 'Stalled Negotiation',
    missing_document: 'Missing Document',
  }[type]
}

function severityColor(s: 'critical' | 'high' | 'medium'): string {
  return { critical: 'text-signal-hot', high: 'text-signal-caution', medium: 'text-brass' }[s]
}

function severityBg(s: 'critical' | 'high' | 'medium'): string {
  return { critical: 'bg-signal-hot/10 border-signal-hot/40', high: 'bg-signal-caution/10 border-signal-caution/40', medium: 'bg-brass/10 border-brass/40' }[s]
}

// ---------------------------------------------------------------------------
// Exception card
// ---------------------------------------------------------------------------

function ExceptionCard({
  exc,
  onResolve,
}: {
  exc: TransactionException
  onResolve: (id: string) => void
}) {
  const [showResolve, setShowResolve] = useState(false)
  const [note, setNote] = useState('')

  return (
    <div className={`rounded-panel border p-4 ${exc.resolved ? 'opacity-50 border-hair' : severityBg(exc.severity) + ' border'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium ${severityColor(exc.severity)}`}>
              {exc.severity.toUpperCase()}
            </span>
            <span className="text-xs text-chalk-muted">{exceptionLabel(exc.type)}</span>
          </div>
          <p className="font-medium text-chalk mt-1 text-sm">{exc.transaction.address}</p>
          <p className="text-xs text-chalk-muted">{exc.transaction.client}</p>
          <p className="text-xs text-chalk-faint mt-1">
            TC: {exc.assignedTc} · Agent: {exc.assignedAgent}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-chalk-faint">{exc.ageDays}d old</span>
          {exc.resolved && (
            <span className="text-xs text-signal-calm">Resolved</span>
          )}
        </div>
      </div>

      <p className="text-sm text-chalk-muted mt-3">{exc.description}</p>

      {!exc.resolved ? (
        showResolve ? (
          <div className="mt-3 pt-3 border-t border-hair">
            <textarea
              className="w-full rounded-control border border-hair bg-ink px-3 py-2 text-chalk text-sm resize-none"
              rows={2}
              placeholder="Resolution note (required)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button
                className="btn-primary text-xs"
                disabled={!note.trim()}
                onClick={() => { onResolve(exc.id); setShowResolve(false); setNote('') }}
              >
                Confirm resolution
              </button>
              <button className="btn-ghost text-xs" onClick={() => setShowResolve(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-hair flex justify-between items-center">
            <a href={`/transactions/${exc.transactionId}`} className="text-xs text-brass hover:underline">
              View transaction →
            </a>
            <button className="btn-ghost text-xs" onClick={() => setShowResolve(true)}>
              Resolve
            </button>
          </div>
        )
      ) : (
        <div className="mt-3 pt-3 border-t border-hair">
          <p className="text-xs text-chalk-muted italic">
            Resolved by {exc.resolvedBy}: {exc.resolution}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BrokerExceptionsPage() {
  const [exceptions, setExceptions] = useState<TransactionException[]>([])
  const [resolved, setResolved] = useState<TransactionException[]>([])
  const [showResolved, setShowResolved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/transactions/broker-exceptions')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: ApiResponse) => {
        setExceptions(data.exceptions)
        setResolved(data.resolved)
      })
      .catch((e) => setError(e.message))
  }, [])

  async function handleResolve(id: string) {
    setBusy(true)
    try {
      const r = await fetch(`/api/transactions/broker-exceptions/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!r.ok) throw new Error('Resolution failed')
      const updated: TransactionException = await r.json()
      setExceptions((prev) => prev.filter((e) => e.id !== updated.id))
      setResolved((prev) => [updated, ...prev])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Sort exceptions by severity then age
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2 }
  const sorted = [...exceptions].sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      b.ageDays - a.ageDays
  )

  const criticalCount = exceptions.filter((e) => e.severity === 'critical').length

  return (
    <div className="mx-auto max-w-5xl p-5 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow text-brass">Broker Operations</p>
          <h1 className="font-display text-h2 mt-1">Exceptions</h1>
          <p className="text-sm text-chalk-muted mt-1">Transactions requiring broker attention</p>
        </div>
        <div className="flex gap-3 items-center">
          {criticalCount > 0 && (
            <span className="rounded-full bg-signal-hot/20 text-signal-hot text-sm font-medium px-3 py-1">
              {criticalCount} critical
            </span>
          )}
          <span className="rounded-full bg-brass/20 text-brass text-sm font-medium px-3 py-1">
            {exceptions.length} open
          </span>
        </div>
      </div>

      {error && <p role="alert" className="text-signal-hot text-sm mb-4">{error}</p>}

      {exceptions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-chalk-muted">No open exceptions.</p>
          <p className="text-chalk-faint text-sm mt-1">All transactions are in good standing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((exc) => (
            <ExceptionCard key={exc.id} exc={exc} onResolve={handleResolve} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-8 pt-6 border-t border-hair">
          <button
            className="text-sm text-chalk-muted hover:text-chalk flex items-center gap-2"
            onClick={() => setShowResolved((v) => !v)}
          >
            {showResolved ? '▼' : '▶'} Resolved ({resolved.length})
          </button>
          {showResolved && (
            <div className="mt-4 space-y-3">
              {resolved.map((exc) => (
                <ExceptionCard key={exc.id} exc={exc} onResolve={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
