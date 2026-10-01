import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'

const objectState = vi.hoisted(() => ({ asset: null as any, bytes: null as Buffer | null }))
vi.mock('@/lib/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage')>('@/lib/storage')
  return {
    ...actual,
    createStorageService: (authorization: any) => ({
      upload: async (input: any) => {
        const asset = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', organizationId: input.actor.organizationId, ownerId: input.actor.id, category: input.category, visibility: input.visibility, filename: input.filename, contentType: input.contentType, size: input.bytes.length, sha256: 'a'.repeat(64), createdAt: '2026-09-30T12:00:00.000Z', provider: 'local' }
        if (!await authorization.authorize(input.actor, 'upload', asset)) throw new Error('Upload denied')
        objectState.asset = asset
        objectState.bytes = input.bytes
        await input.persistMetadata?.(asset)
        return asset
      },
      download: async (actor: any, id: string) => {
        const asset = objectState.asset
        if (!asset || asset.id !== id || !await authorization.authorize(actor, 'download', asset)) throw new Error('Download denied')
        return { asset, bytes: objectState.bytes! }
      },
    }),
  }
})
import { archiveLibraryAssetDurable, downloadLibraryAssetDurable, listLibraryAssetsDurable, uploadLibraryAssetDurable } from '@/lib/platform/library-durable'

const manager: PlatformActor = { id: '11111111-1111-4111-8111-111111111111', userId: '11111111-1111-4111-8111-111111111111', organizationId: '22222222-2222-4222-8222-222222222222', role: 'managing_broker', name: 'Taquilla', market: 'Alabama', teamId: 'al', officeId: 'al' }
let repository: MemoryRepository
beforeEach(() => {
  objectState.asset = null
  objectState.bytes = null
  repository = new MemoryRepository(emptySeed())
})

describe('durable marketing asset library', () => {
  it('stores metadata and content through the object storage boundary, then authorizes retrieval', async () => {
    const bytes = Buffer.from('%PDF-1.7 demo')
    const asset = await uploadLibraryAssetDurable(manager, { filename: 'brand guide.pdf', contentType: 'application/pdf', bytes }, repository)
    expect(asset).toMatchObject({ name: 'brand guide.pdf', mime: 'application/pdf', size: bytes.length, provider: 'local', visibility: 'private', archived: false })
    expect(await listLibraryAssetsDurable(manager, repository)).toHaveLength(1)
    const fetched = await downloadLibraryAssetDurable(manager, asset.id, repository)
    expect(fetched.bytes.equals(bytes)).toBe(true)
    expect(fetched.asset.id).toBe(asset.id)
  })

  it('archives metadata without deleting the private object or erasing audit history', async () => {
    const asset = await uploadLibraryAssetDurable(manager, { filename: 'brand guide.pdf', contentType: 'application/pdf', bytes: Buffer.from('%PDF-1.7 demo') }, repository)
    expect(await archiveLibraryAssetDurable(manager, asset.id, repository)).toEqual({ archived: true })
    expect(await listLibraryAssetsDurable(manager, repository)).toHaveLength(0)
    const context = { userId: manager.id, organizationId: manager.organizationId, role: 'broker' as const, officeId: 'al' }
    const stored = await repository.getDomainRecord(context, 'marketing_assets', asset.id)
    expect(stored?.data.archived).toBe(true)
    expect((await repository.listAudit(context)).map(event => event.action).sort()).toEqual(['marketing.asset-archived', 'marketing.asset-uploaded'])
  })
})
