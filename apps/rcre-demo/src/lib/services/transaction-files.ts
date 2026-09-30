import 'server-only'
import { getRepository } from '@/lib/db'
import type { Actor, Repository } from '@/lib/db/repository'
import { createStorageService, StorageAuthorizationError, StorageUnavailableError, type MalwareScanner } from '@/lib/storage'
import type { ObjectDriver } from '@/lib/storage/drivers'

export interface TransactionFileRecord extends Record<string, unknown> {
  id: string
  transactionId: string
  organizationId: string
  ownerId: string
  tcId: string
  teamId: string
  filename: string
  contentType: string
  size: number
  sha256: string
  storageAssetId: string
  createdAt: string
  removedAt?: string
  version: number
  scanStatus: 'not-scanned'
}

export interface TransactionFileActor {
  userId: string
  organizationId: string
  role: string
  teamId?: string
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Refuses demo persona IDs and untrusted tenant context before opening Postgres. */
export function transactionRepositoryActor(actor: TransactionFileActor): Actor {
  if (!uuid.test(actor.userId) || !uuid.test(actor.organizationId)) throw new StorageAuthorizationError()
  const roles: Record<string, Actor['role']> = {
    owner: 'owner', broker_owner: 'owner', broker: 'broker', managing_broker: 'broker',
    team_lead: 'team_lead', team_leader: 'team_lead', agent: 'agent', transaction_coordinator: 'transaction_coordinator',
  }
  const role = roles[actor.role]
  if (!role) throw new StorageAuthorizationError()
  return { userId: actor.userId, organizationId: actor.organizationId, role, ...(actor.teamId ? { teamIds: [actor.teamId] } : {}) }
}

function hasTransactionAccess(actor: TransactionFileActor, transaction: Record<string, unknown>): boolean {
  if (transaction.organizationId !== actor.organizationId) return false
  if (['owner', 'broker', 'broker_owner', 'managing_broker'].includes(actor.role)) return true
  if (transaction.ownerId === actor.userId || transaction.tcId === actor.userId) return true
  return ['team_lead', 'team_leader'].includes(actor.role) && typeof actor.teamId === 'string' && transaction.teamId === actor.teamId
}

async function transactionFor(repository: Repository, actor: TransactionFileActor, id: string) {
  const dbActor = transactionRepositoryActor(actor)
  const record = await repository.getDomainRecord<Record<string, unknown>>(dbActor, 'transactions', id)
  if (!record || !hasTransactionAccess(actor, record.data)) throw new StorageAuthorizationError()
  return record.data
}

export interface TransactionFileDependencies {
  repository?: Repository
  driver?: ObjectDriver
  scanner?: MalwareScanner
}

/** Private transaction file boundary. Files are bytes in object storage; only metadata lives in PostgreSQL. */
export class TransactionFileService {
  constructor(private readonly deps: TransactionFileDependencies = {}) {}

  private async dependencies(actor: TransactionFileActor) {
    const repository = this.deps.repository ?? await getRepository()
    return { repository, storage: createStorageService({
      authorize: async (storageActor, action, asset) => {
        if (storageActor.organizationId !== asset.organizationId || asset.visibility !== 'private' || asset.category !== 'transaction-document') return false
        if (action === 'upload') return storageActor.id === asset.ownerId
        // StorageActor intentionally carries no team claims. Preserve the trusted
        // actor resolved at the authenticated route boundary for authorization.
        if (storageActor.id !== actor.userId || storageActor.organizationId !== actor.organizationId || storageActor.role !== actor.role) return false
        const record = await repository.getDomainRecord<TransactionFileRecord>(
          transactionRepositoryActor(actor),
          'transaction_files', asset.id,
        )
        if (!record || record.data.removedAt) return false
        const tx = await repository.getDomainRecord<Record<string, unknown>>(
          transactionRepositoryActor(actor),
          'transactions', record.data.transactionId,
        )
        return !!tx && hasTransactionAccess(actor, tx.data)
      },
    }, this.deps.scanner, this.deps.driver)
    }
  }

  async list(actor: TransactionFileActor, transactionId: string): Promise<TransactionFileRecord[]> {
    const { repository } = await this.dependencies(actor)
    await transactionFor(repository, actor, transactionId)
    const dbActor = transactionRepositoryActor(actor)
    const all = await repository.listDomainRecords<TransactionFileRecord>(dbActor, 'transaction_files', { limit: 200 })
    return all.map(row => row.data).filter(row => row.transactionId === transactionId && row.organizationId === actor.organizationId && !row.removedAt)
  }

  async upload(actor: TransactionFileActor, transactionId: string, filename: string, contentType: string, bytes: Buffer, replaceId?: string): Promise<TransactionFileRecord> {
    const { repository, storage } = await this.dependencies(actor)
    const transaction = await transactionFor(repository, actor, transactionId)
    const previous = replaceId ? (await this.list(actor, transactionId)).find(row => row.id === replaceId) : undefined
    if (replaceId && !previous) throw new StorageAuthorizationError()
    let record: TransactionFileRecord | undefined
    const uploaded = await storage.upload({ actor: { id: actor.userId, organizationId: actor.organizationId, role: actor.role }, category: 'transaction-document', visibility: 'private', filename, contentType, bytes,
      persistMetadata: async asset => {
        record = {
          id: asset.id, transactionId, organizationId: actor.organizationId, ownerId: String(transaction.ownerId),
          tcId: String(transaction.tcId ?? ''), teamId: String(transaction.teamId ?? ''), filename: asset.filename,
          contentType: asset.contentType, size: asset.size, sha256: asset.sha256, storageAssetId: asset.id,
          createdAt: asset.createdAt, version: (previous?.version ?? 0) + 1, scanStatus: 'not-scanned',
        }
        await repository.putTransactionDomainRecord(transactionRepositoryActor(actor), {
          collection: 'transaction_files', recordId: record.id, ownerUserId: actor.userId,
          data: record as unknown as Record<string, unknown>, createOnly: true,
        })
      },
    })
    if (!record || uploaded.id !== record.id) throw new StorageUnavailableError('Transaction file metadata could not be committed')
    return record
  }

  async download(actor: TransactionFileActor, transactionId: string, fileId: string): Promise<{ record: TransactionFileRecord; bytes: Buffer }> {
    const { repository, storage } = await this.dependencies(actor)
    const parent = await transactionFor(repository, actor, transactionId)
    const metadata = await repository.getDomainRecord<TransactionFileRecord>(transactionRepositoryActor(actor), 'transaction_files', fileId)
    if (!metadata || metadata.data.removedAt || metadata.data.transactionId !== transactionId || metadata.data.organizationId !== actor.organizationId || !hasTransactionAccess(actor, parent)) throw new StorageAuthorizationError()
    const result = await storage.download({ id: actor.userId, organizationId: actor.organizationId, role: actor.role }, fileId)
    return { record: metadata.data, bytes: result.bytes }
  }

  async remove(actor: TransactionFileActor, transactionId: string, fileId: string): Promise<void> {
    const { repository } = await this.dependencies(actor)
    const tx = await transactionFor(repository, actor, transactionId)
    if (!['owner', 'broker', 'broker_owner', 'managing_broker'].includes(actor.role) && actor.userId !== tx.ownerId) throw new StorageAuthorizationError()
    const metadata = await repository.getDomainRecord<TransactionFileRecord>(transactionRepositoryActor(actor), 'transaction_files', fileId)
    if (!metadata || metadata.data.transactionId !== transactionId) throw new StorageAuthorizationError()
    if (metadata.data.removedAt) return
    // Transaction records are append-only for audit and retention. A remove is
    // an access-revoking tombstone; retain private bytes and metadata instead
    // of deleting the blob before a database operation that cannot be undone.
    const removedAt = new Date().toISOString()
    await repository.putTransactionDomainRecord(transactionRepositoryActor(actor), {
      collection: 'transaction_files', recordId: fileId, ownerUserId: metadata.ownerUserId,
      data: { ...metadata.data, removedAt, version: metadata.version + 1 }, expectedVersion: metadata.version,
    })
  }
}

export function transactionFileService(deps?: TransactionFileDependencies): TransactionFileService { return new TransactionFileService(deps) }

/** Signing remains unavailable until a configured provider returns a verifiable completion receipt. */
export function assertSigningProviderAvailable(_provider?: string): never {
  throw new StorageUnavailableError('Electronic signing is unavailable until an approved provider and verified callback are configured')
}
