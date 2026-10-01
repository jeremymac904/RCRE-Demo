import type { PlatformActor } from '@/lib/platform/auth'
import { getRecord, putRecord, readRecords } from '@/lib/platform/store'
import { calculateDeadline } from './deadlines'
import { listTransactions, type TransactionRecord } from './transactions'
import 'server-only'
import { getRepository } from '@/lib/db'
import type { Repository } from '@/lib/db/repository'
import { durableTransactionActor, durableTransactions, type DurableTransactionService } from './transactions-durable'
import { transactionRepositoryActor } from './transaction-files'

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
interface ResolutionRecord extends Record<string, unknown> {
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


/** Production exception work queue. Resolution snapshots are transaction children
 * in PostgreSQL, so authorization, tenant scope, audit, and retention use the
 * same durable boundary as the transaction itself. */
export interface DurableTransactionExceptionDependencies {
  repository?: Repository
  transactions?: DurableTransactionService
}

export class DurableTransactionExceptionService {
  constructor(private readonly dependencies: DurableTransactionExceptionDependencies = {}) {}

  private async services() {
    const repository = this.dependencies.repository ?? await getRepository()
    const transactions = this.dependencies.transactions ?? durableTransactions({ repository })
    return { repository, transactions }
  }

  async list(actor: PlatformActor, now = new Date()) {
    ensureBroker(actor)
    const { repository, transactions } = await this.services()
    const txActor = durableTransactionActor(actor)
    const rows = await transactions.list(txActor)
    const visible = rows.filter(transaction => transaction.organizationId === actor.organizationId)
    const byId = new Map<string, ResolutionRecord>()
    const scoped = transactionRepositoryActor(txActor)
    for (let offset = 0; ; offset += 200) {
      const page = await repository.listDomainRecords<ResolutionRecord>(scoped, 'transaction_exception_resolutions', { limit: 200, offset })
      for (const row of page) {
        const resolution = row.data
        if (resolution.organizationId === actor.organizationId && visible.some(transaction => transaction.id === resolution.transactionId)) byId.set(row.recordId, resolution)
      }
      if (page.length < 200) break
    }
    const results = visible.flatMap(transaction => unresolvedFor(transaction as unknown as TransactionRecord, now)).map(exception => {
      const resolution = byId.get(exception.id)
      return resolution
        ? { ...exception, resolved: true, resolvedAt: resolution.resolvedAt, resolvedBy: resolution.actorName, resolution: resolution.resolution }
        : { ...exception, resolved: false }
    })
    const present = new Set(results.map(exception => exception.id))
    for (const resolution of byId.values()) {
      if (!present.has(resolution.id)) results.push({ ...resolution.snapshot, resolved: true, resolvedAt: resolution.resolvedAt, resolvedBy: resolution.actorName, resolution: resolution.resolution })
    }
    return results
  }

  async resolve(actor: PlatformActor, exceptionId: string, note: string) {
    ensureBroker(actor)
    const resolution = note.trim()
    if (!resolution || resolution.length > 2000) throw new Error('A resolution note of 1–2000 characters is required')
    const current = (await this.list(actor)).find(item => item.id === exceptionId)
    if (!current) throw new Error('Open transaction exception not found in your authorized scope')
    if (current.resolved) throw new Error('Transaction exception was already resolved')
    const { repository, transactions } = await this.services()
    const txActor = durableTransactionActor(actor)
    const scoped = transactionRepositoryActor(txActor)
    const transaction = await transactions.get(txActor, current.transactionId)
    const record: ResolutionRecord = {
      id: current.id, organizationId: current.organizationId, transactionId: current.transactionId,
      actorId: actor.userId, actorName: actor.name, resolution, resolvedAt: new Date().toISOString(),
      snapshot: {
        id: current.id, organizationId: current.organizationId, transactionId: current.transactionId,
        type: current.type, description: current.description, severity: current.severity,
        createdAt: current.createdAt, ageDays: current.ageDays, transaction: current.transaction,
        assignedTc: current.assignedTc, assignedAgent: current.assignedAgent,
      },
    }
    const auditEvent = {
      organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user' as const,
      action: 'transaction.exception-resolved', targetType: 'transaction_exception', targetId: exceptionId,
      effect: 'write' as const, allowed: true,
    }
    await repository.putTransactionDomainRecord(scoped, {
      collection: 'transaction_exception_resolutions', recordId: exceptionId, ownerUserId: transaction.ownerId,
      data: { ...record, ownerId: transaction.ownerId, tcId: transaction.tcId, teamId: transaction.teamId },
      createOnly: true,
    }, [auditEvent])
    return record
  }
}

export function durableTransactionExceptions(dependencies?: DurableTransactionExceptionDependencies) {
  return new DurableTransactionExceptionService(dependencies)
}
