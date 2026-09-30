import { beforeEach, describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository, type Actor } from '@/lib/db/repository'
import { StorageService, StorageAuthorizationError, type StorageAsset } from '@/lib/storage'
import type { ObjectDriver } from '@/lib/storage/drivers'
import { TransactionFileService, transactionRepositoryActor } from '@/lib/services/transaction-files'

const org = '11111111-1111-4111-8111-111111111111'
const agentId = '22222222-2222-4222-8222-222222222222'
const otherId = '33333333-3333-4333-8333-333333333333'
const agent: Actor = { userId: agentId, organizationId: org, role: 'agent' }
const other: Actor = { userId: otherId, organizationId: org, role: 'agent' }
const txId = 'transaction-one'

class MemoryObjects implements ObjectDriver {
  readonly name = 'local' as const
  private blobs = new Map<string, Buffer>()
  private metadata = new Map<string, StorageAsset>()
  async put(asset: StorageAsset, bytes: Buffer) { this.blobs.set(asset.id, Buffer.from(bytes)); this.metadata.set(asset.id, asset) }
  async get(asset: StorageAsset) { const value = this.blobs.get(asset.id); if (!value) throw new Error('missing'); return Buffer.from(value) }
  async getMetadata(id: string) { return this.metadata.get(id) ?? null }
  assetCount() { return this.metadata.size }
  async delete(asset: StorageAsset) { this.metadata.delete(asset.id); this.blobs.delete(asset.id) }
  async sign(): Promise<string> { throw new Error('Signing private transaction files is not permitted') }
}

let repository: MemoryRepository
let objects: MemoryObjects
let service: TransactionFileService
beforeEach(async () => {
  repository = new MemoryRepository(emptySeed())
  objects = new MemoryObjects()
  service = new TransactionFileService({ repository, driver: objects })
  await repository.putTransactionDomainRecord(agent, {
    collection: 'transactions', recordId: txId, ownerUserId: agentId,
    data: { id: txId, organizationId: org, ownerId: agentId, tcId: '', teamId: '' },
  })
})

const pdf = Buffer.from('%PDF-1.7\nfixture')

describe('transaction private file boundary', () => {
  it('rejects demo identities before repository access', () => {
    expect(() => transactionRepositoryActor({ userId: 'u-agent', organizationId: org, role: 'agent' })).toThrow(StorageAuthorizationError)
  })

  it('stores file bytes privately and persists metadata separately', async () => {
    const file = await service.upload({ ...agent, role: 'agent' }, txId, '../../contract.pdf', 'application/pdf', pdf)
    expect(file.filename).toBe('.._.._contract.pdf')
    expect(file.contentType).toBe('application/pdf')
    expect(file.sha256).toHaveLength(64)
    expect((await repository.getDomainRecord(agent, 'transaction_files', file.id))?.data.storageAssetId).toBe(file.id)
    const downloaded = await service.download({ ...agent, role: 'agent' }, txId, file.id)
    expect(downloaded.bytes.equals(pdf)).toBe(true)
  })

  it('blocks cross-tenant and unassigned transaction access', async () => {
    const file = await service.upload({ ...agent, role: 'agent' }, txId, 'contract.pdf', 'application/pdf', pdf)
    const outsiderRepo = new MemoryRepository(emptySeed())
    const outsiderService = new TransactionFileService({ repository: outsiderRepo, driver: objects })
    await expect(outsiderService.download({ ...other, role: 'agent' }, txId, file.id)).rejects.toThrow(StorageAuthorizationError)
  })

  it('rejects invalid MIME, bad magic, and scanner-unavailable production uploads', async () => {
    await expect(service.upload({ ...agent, role: 'agent' }, txId, 'bad.pdf', 'application/pdf', Buffer.from('not a pdf'))).rejects.toThrow(/File type/)
    await expect(service.upload({ ...agent, role: 'agent' }, txId, 'bad.exe', 'application/octet-stream', pdf)).rejects.toThrow(/File type/)
    const productionStorage = new StorageService(objects, { authorize: () => true }, undefined, true)
    await expect(productionStorage.upload({ actor: { id: agentId, organizationId: org, role: 'agent' }, category: 'transaction-document', visibility: 'private', filename: 'clean.pdf', contentType: 'application/pdf', bytes: pdf })).rejects.toThrow(/malware scanner/)
  })

  it('removes the private blob when the durable metadata commit fails', async () => {
    const failingRepository = new Proxy(repository, {
      get(target, key) {
        if (key === 'putTransactionDomainRecord') return async () => { throw new Error('database unavailable') }
        const value = Reflect.get(target, key)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    const failing = new TransactionFileService({ repository: failingRepository, driver: objects })
    await expect(failing.upload({ ...agent, role: 'agent' }, txId, 'contract.pdf', 'application/pdf', pdf)).rejects.toThrow(/database unavailable/)
    expect(objects.assetCount()).toBe(0)
  })

  it('never claims signing completion without a provider receipt', async () => {
    const { assertSigningProviderAvailable } = await import('@/lib/services/transaction-files')
    expect(() => assertSigningProviderAvailable()).toThrow(/unavailable/)
  })
})
