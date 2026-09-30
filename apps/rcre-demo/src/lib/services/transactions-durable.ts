import 'server-only'
import { randomUUID } from 'node:crypto'
import { getRepository } from '@/lib/db'
import type { Actor, Repository } from '@/lib/db/repository'
import type { AuditEvent } from '@/lib/domain-types'
import { StorageAuthorizationError } from '@/lib/storage'
import { getAuthPersistence, type MemberSummary } from '@/lib/auth/persistence'
import type { PlatformActor } from '@/lib/platform/auth'
import { transactionRepositoryActor, type TransactionFileActor } from './transaction-files'

export interface DurableTransaction extends Record<string, unknown> {
  id: string
  organizationId: string
  ownerId: string
  officeId: string
  teamId: string
  tcId: string
  address: string
  client: string
  representation: 'buyer' | 'seller' | 'unknown'
  status: 'active' | 'pending_signature' | 'closed' | 'archived'
  closingDate: string
  version: number
  updatedAt: string
  deadlines: Record<string, unknown>[]
  checklist: { id: string; label: string; done: boolean }[]
  comments: Record<string, unknown>[]
  history?: Record<string, unknown>[]
}

export interface DurableTransactionDependencies {
  repository?: Repository
  listMembers?: (actor: PlatformActor) => Promise<MemberSummary[]>
}

export function durableTransactionActor(actor: { userId: string; organizationId: string; role: string; teamId?: string }): TransactionFileActor {
  return { userId: actor.userId, organizationId: actor.organizationId, role: actor.role, teamId: actor.teamId }
}

function access(actor: TransactionFileActor, tx: DurableTransaction): boolean {
  if (tx.organizationId !== actor.organizationId) return false
  if (['owner', 'broker_owner', 'broker', 'managing_broker'].includes(actor.role)) return true
  if (tx.ownerId === actor.userId || tx.tcId === actor.userId) return true
  return ['team_lead', 'team_leader'].includes(actor.role) && Boolean(actor.teamId) && tx.teamId === actor.teamId
}
function audit(actor: Actor, action: string, targetId: string): AuditEvent {
  return { organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action,
    targetType: 'transaction', targetId, effect: 'write', allowed: true }
}
function makeAudit(actor: TransactionFileActor, action: string, targetId: string) { return audit(transactionRepositoryActor(actor), action, targetId) }
function validDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** PostgreSQL-backed transaction operations. SQLite remains the explicit fixture/dev adapter. */
export class DurableTransactionService {
  constructor(private readonly deps: DurableTransactionDependencies = {}) {}
  private async db() { return this.deps.repository ?? await getRepository() }
  private async members(actor: PlatformActor) {
    return this.deps.listMembers ? this.deps.listMembers(actor) : (await getAuthPersistence()).listMembers(actor)
  }

  async assignmentOptions(actor: PlatformActor) {
    const canAssign = actor.role === 'broker_owner' || actor.role === 'managing_broker'
    if (!canAssign) return { canAssign: false, assignmentOptions: [] as { id: string; name: string; role: 'agent' | 'transaction_coordinator'; officeId: string; teamId: string }[] }
    const members = await this.members(actor)
    const assignmentOptions = members
      .filter(member => member.active && ['agent', 'transaction_coordinator'].includes(member.platformRole)
        && (actor.role === 'broker_owner' || member.officeId === actor.officeId))
      .map(member => ({ id: member.userId, name: member.name, role: member.platformRole as 'agent' | 'transaction_coordinator', officeId: member.officeId, teamId: member.teamId }))
    return { canAssign: true, assignmentOptions }
  }

  async list(actor: TransactionFileActor): Promise<DurableTransaction[]> {
    const repo = await this.db(), scoped = transactionRepositoryActor(actor)
    const rows: DurableTransaction[] = []
    for (let offset = 0; ; offset += 200) {
      const page = await repo.listDomainRecords<DurableTransaction>(scoped, 'transactions', { limit: 200, offset })
      rows.push(...page.map(row => row.data).filter(row => access(actor, row) && row.organizationId === actor.organizationId && row.status !== 'archived'))
      if (page.length < 200) break
    }
    return rows.sort((a, b) => String(a.closingDate || '9999').localeCompare(String(b.closingDate || '9999')))
  }

  async get(actor: TransactionFileActor, id: string): Promise<DurableTransaction> {
    const record = await (await this.db()).getDomainRecord<DurableTransaction>(transactionRepositoryActor(actor), 'transactions', id)
    if (!record || !access(actor, record.data)) throw new StorageAuthorizationError()
    return record.data
  }

  async create(actor: TransactionFileActor, input: { address: string; client: string; representation?: 'buyer' | 'seller'; closingDate?: string; officeId?: string; teamId?: string }): Promise<DurableTransaction> {
    const repo = await this.db(), scoped = transactionRepositoryActor(actor)
    if (!['owner', 'broker_owner', 'broker', 'managing_broker', 'team_lead', 'team_leader', 'agent', 'transaction_coordinator'].includes(actor.role)) throw new StorageAuthorizationError()
    const address = input.address.trim(), client = input.client.trim()
    if (!address || address.length > 200 || !client || client.length > 100) throw new Error('Property and client are required')
    const closingDate = input.closingDate ?? ''
    if (closingDate && !validDateOnly(closingDate)) throw new Error('Closing date must be a valid calendar date')
    const id = randomUUID(), now = new Date().toISOString()
    const tx: DurableTransaction = {
      id, organizationId: actor.organizationId, ownerId: actor.userId, officeId: input.officeId ?? '', teamId: input.teamId ?? actor.teamId ?? '', tcId: '',
      address, client, representation: input.representation ?? 'buyer', status: 'active', closingDate, version: 1,
      updatedAt: now, deadlines: [], checklist: [], comments: [],
    }
    const saved = await repo.putTransactionDomainRecord(scoped,
      { collection: 'transactions', recordId: id, ownerUserId: actor.userId, data: tx, createOnly: true },
      [makeAudit(actor, 'transaction.created', id)],
    )
    return saved.data as DurableTransaction
  }

  async assign(actor: PlatformActor, id: string, version: number, ownerId: string, tcId = ''): Promise<DurableTransaction> {
    if (!['broker_owner', 'managing_broker'].includes(actor.role)) throw new StorageAuthorizationError()
    const who = durableTransactionActor(actor), repository = await this.db(), scoped = transactionRepositoryActor(who)
    const current = await this.get(who, id)
    if (current.version !== version) throw new Error('Conflict: refresh to review the latest version')
    if (actor.role === 'managing_broker' && current.officeId !== actor.officeId) throw new StorageAuthorizationError()
    const members = await this.members(actor)
    const owner = members.find(member => member.userId === ownerId && member.organizationId === actor.organizationId && member.active && member.platformRole === 'agent')
    if (!owner || (actor.role === 'managing_broker' && owner.officeId !== actor.officeId)) throw new Error('Choose an active agent within your authorized office')
    const coordinator = tcId ? members.find(member => member.userId === tcId && member.organizationId === actor.organizationId && member.active && member.platformRole === 'transaction_coordinator') : undefined
    if (tcId && (!coordinator || coordinator.officeId !== owner.officeId)) throw new Error('Choose an active transaction coordinator in the assigned agent office')
    const now = new Date().toISOString()
    const history = [...(current.history ?? []), { event: 'assignment', actorId: actor.id, previousVersion: current.version, snapshot: current, fromOwnerId: current.ownerId, toOwnerId: owner.userId, fromTcId: current.tcId, toTcId: coordinator?.userId ?? '', createdAt: now }].slice(-100)
    const updated: DurableTransaction = { ...current, ownerId: owner.userId, officeId: owner.officeId, teamId: owner.teamId, tcId: coordinator?.userId ?? '', history, version: current.version + 1, updatedAt: now }
    const saved = await repository.putTransactionDomainRecord(scoped, { collection: 'transactions', recordId: id, ownerUserId: owner.userId, data: updated, expectedVersion: current.version }, [makeAudit(who, 'transaction.assignment-changed', id)])
    return saved.data as DurableTransaction
  }

  async update(actor: TransactionFileActor, id: string, version: number, patch: Partial<Pick<DurableTransaction, 'client' | 'address' | 'closingDate' | 'status' | 'deadlines' | 'checklist'>>): Promise<DurableTransaction> {
    const repo = await this.db(), scoped = transactionRepositoryActor(actor), current = await this.get(actor, id)
    if (current.version !== version) throw new Error('Conflict: refresh to review the latest version')
    if (patch.status === 'pending_signature') throw new Error('Signature status is unavailable until an approved provider verifies completion')
    if (patch.closingDate && !validDateOnly(patch.closingDate)) throw new Error('Closing date must be a valid calendar date')
    if (patch.checklist && new Set(patch.checklist.map(row => row.id)).size !== patch.checklist.length) throw new Error('Checklist item identifiers must be unique')
    const now = new Date().toISOString()
    const history = [...(current.history ?? []), { actorId: actor.userId, previousVersion: current.version, snapshot: current, createdAt: now }].slice(-100)
    const updated: DurableTransaction = { ...current, ...patch, history, id, organizationId: actor.organizationId, ownerId: current.ownerId,
      tcId: current.tcId, teamId: current.teamId, officeId: current.officeId, version: current.version + 1, updatedAt: now }
    const saved = await repo.putTransactionDomainRecord(scoped,
      { collection: 'transactions', recordId: id, ownerUserId: current.ownerId, data: updated, expectedVersion: current.version },
      [makeAudit(actor, 'transaction.updated', id)],
    )
    return saved.data as DurableTransaction
  }

  async related(actor: TransactionFileActor, id: string, collection: `transaction_${string}`): Promise<Record<string, unknown>[]> {
    await this.get(actor, id)
    const repo = await this.db(), scoped = transactionRepositoryActor(actor)
    const rows = await repo.listDomainRecords<Record<string, unknown>>(scoped, collection, { limit: 200 })
    return rows.map(row => row.data).filter(data => data.transactionId === id && data.organizationId === actor.organizationId)
  }

  async addNote(actor: TransactionFileActor, id: string, body: string) {
    const repo = await this.db(), tx = await this.get(actor, id)
    if (!body.trim() || body.length > 4000) throw new Error('Note must contain 1–4000 characters')
    const scoped = transactionRepositoryActor(actor), row = { id: randomUUID(), transactionId: id, organizationId: actor.organizationId,
      ownerId: tx.ownerId, tcId: tx.tcId, teamId: tx.teamId, authorId: actor.userId, body: body.trim(), createdAt: new Date().toISOString() }
    await repo.putTransactionDomainRecord(scoped, { collection: 'transaction_notes', recordId: row.id, ownerUserId: actor.userId, data: row, createOnly: true }, [makeAudit(actor, 'transaction.note-added', id)])
    return row
  }
}

export function durableTransactions(deps?: DurableTransactionDependencies) { return new DurableTransactionService(deps) }
