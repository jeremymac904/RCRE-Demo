import type { PlatformActor } from '@/lib/platform/auth'
import { getRecord, putRecord, readRecords } from '@/lib/platform/store'
import { calculateDeadline } from './deadlines'
import { listTransactions, type TransactionRecord } from './transactions'

export type ExceptionType = 'overdue_approval' | 'compliance_flag' | 'deadline_breach' | 'disputed_item' | 'stalled_negotiation' | 'missing_document'
export interface TransactionException {
  id: string
  organizationId: string
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
interface ResolutionRecord {
  id: string
  organizationId: string
  transactionId: string
  actorId: string
  actorName: string
  resolution: string
  resolvedAt: string
  snapshot: Omit<TransactionException, 'resolved' | 'resolvedAt' | 'resolvedBy' | 'resolution'>
}

const MANAGEMENT_ROLES = ['broker_owner', 'managing_broker']

function ensureBroker(a: PlatformActor) {
  if (!MANAGEMENT_ROLES.includes(a.role)) throw new Error('Broker access denied')
}

function ageSince(value: string, now: Date) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((now.getTime() - timestamp) / 86400000)) : 0
}

function unresolvedFor(t: TransactionRecord, now: Date): Omit<TransactionException, 'resolved' | 'resolvedAt' | 'resolvedBy' | 'resolution'>[] {
  if (t.status === 'closed' || t.status === 'archived') return []
  const common = {
    organizationId: t.organizationId,
    transaction: { id: t.id, address: t.address, client: t.client, status: t.status, updatedAt: t.updatedAt },
    assignedTc: t.tcId || 'Unassigned',
    assignedAgent: t.ownerId,
  }
  const result: Omit<TransactionException, 'resolved' | 'resolvedAt' | 'resolvedBy' | 'resolution'>[] = []

  for (const d of t.deadlines) {
    const calc = calculateDeadline(d)
    if (calc.date && Date.parse(`${calc.date}T00:00:00Z`) < now.getTime()) {
      const ageDays = ageSince(`${calc.date}T00:00:00Z`, now)
      result.push({
        ...common,
        id: `exc-${t.id}-${d.id}`,
        transactionId: t.id,
        type: 'deadline_breach',
        description: `Deadline "${d.label}" is ${ageDays} days overdue`,
        severity: 'critical',
        createdAt: calc.date,
        ageDays,
      })
    }
  }

  if (!t.tcId && t.status === 'active') {
    result.push({
      ...common,
      id: `exc-${t.id}-no-tc`,
      transactionId: t.id,
      type: 'missing_document',
      description: 'No transaction coordinator assigned',
      severity: 'high',
      createdAt: t.updatedAt,
      ageDays: ageSince(t.updatedAt, now),
    })
  }

  const completedItems = t.checklist.filter((item) => item.done).length
  const daysOld = ageSince(t.updatedAt, now)
  if (daysOld > 5 && completedItems === 0 && t.status === 'active') {
    result.push({
      ...common,
      id: `exc-${t.id}-stalled`,
      transactionId: t.id,
      type: 'stalled_negotiation',
      description: `No checklist activity for ${daysOld} days`,
      severity: 'medium',
      createdAt: t.updatedAt,
      ageDays: daysOld,
    })
  }
  return result
}

export function listTransactionExceptions(a: PlatformActor, now = new Date()) {
  ensureBroker(a)
  const resolutions = readRecords<ResolutionRecord>('transaction_exception_resolutions')
    .filter((item) => item.organizationId === a.organizationId)
  const byId = new Map(resolutions.map((item) => [item.id, item]))
  const current = listTransactions(a).flatMap((t) => unresolvedFor(t, now))
  const results = current.map((exception) => {
    const resolution = byId.get(exception.id)
    return resolution
      ? { ...exception, resolved: true, resolvedAt: resolution.resolvedAt, resolvedBy: resolution.actorName, resolution: resolution.resolution }
      : { ...exception, resolved: false }
  })
  const present = new Set(results.map((exception) => exception.id))
  for (const resolution of resolutions) {
    if (!present.has(resolution.id)) {
      results.push({ ...resolution.snapshot, resolved: true, resolvedAt: resolution.resolvedAt, resolvedBy: resolution.actorName, resolution: resolution.resolution })
    }
  }
  return results
}

export function resolveTransactionException(a: PlatformActor, exceptionId: string, note: string) {
  ensureBroker(a)
  const resolution = note.trim()
  if (!resolution || resolution.length > 2000) throw new Error('A resolution note of 1–2000 characters is required')
  const current = listTransactionExceptions(a).find((item) => item.id === exceptionId)
  if (!current) throw new Error('Open transaction exception not found in your authorized scope')
  if (current.resolved) throw new Error('Transaction exception was already resolved')
  const record: ResolutionRecord = {
    id: current.id,
    organizationId: a.organizationId,
    transactionId: current.transactionId,
    actorId: a.userId,
    actorName: a.name,
    resolution,
    resolvedAt: new Date().toISOString(),
    snapshot: {
      id: current.id, organizationId: current.organizationId, transactionId: current.transactionId,
      type: current.type, description: current.description, severity: current.severity,
      createdAt: current.createdAt, ageDays: current.ageDays, transaction: current.transaction,
      assignedTc: current.assignedTc, assignedAgent: current.assignedAgent,
    },
  }
  return putRecord('transaction_exception_resolutions', record)
}
