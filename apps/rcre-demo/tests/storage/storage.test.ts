import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalObjectDriver, StorageService, SupabaseObjectDriver, verifyLocalSignature } from '../../src/lib/storage'
import type { ObjectDriver } from '../../src/lib/storage/drivers'
import type { StorageAsset, StorageAuthorization, StorageCategory } from '../../src/lib/storage/types'

const actor = { id: 'agent-1', organizationId: 'org-rcre', role: 'agent' }
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01])
class MemoryDriver implements ObjectDriver {
  readonly name = 'local' as const
  records = new Map<string, { asset: StorageAsset; bytes: Buffer }>()
  async put(asset: StorageAsset, bytes: Buffer) { this.records.set(asset.id, { asset, bytes }) }
  async get(asset: StorageAsset) { const item = this.records.get(asset.id); if (!item) throw Error('missing'); return item.bytes }
  async getMetadata(id: string) { return this.records.get(id)?.asset ?? null }
  async delete(asset: StorageAsset) { this.records.delete(asset.id) }
  async sign(asset: StorageAsset, expiresAt: number) { return `/signed/${asset.id}?expires=${expiresAt}` }
}
const allow: StorageAuthorization = { authorize: () => true }
const upload = (category: StorageCategory = 'agent-headshot', overrides: Partial<{ filename: string; contentType: string; bytes: Buffer }> = {}) => ({
  actor, category, filename: 'portrait.jpg', contentType: 'image/jpeg', bytes: jpeg, ...overrides,
})

afterEach(() => { vi.unstubAllEnvs() })

describe('storage service', () => {
  it('validates MIME signatures, size and filename before accepting an upload', async () => {
    const service = new StorageService(new MemoryDriver(), allow, undefined, false)
    await expect(service.upload(upload('agent-headshot', { filename: '../portrait.jpg' }))).resolves.toMatchObject({ filename: '.._portrait.jpg' })
    await expect(service.upload(upload('agent-headshot', { contentType: 'image/png' }))).rejects.toThrow(/does not match/)
    await expect(service.upload(upload('agent-headshot', { bytes: Buffer.alloc(8 * 1024 * 1024 + 1) }))).rejects.toThrow(/limit/)
    await expect(service.upload(upload('agent-headshot', { filename: '   ' }))).rejects.toThrow(/file name/i)
  })

  it('requires explicit policy approval for upload, download, signing and delete', async () => {
    const driver = new MemoryDriver()
    const denied: StorageAuthorization = { authorize: (_a, action) => action === 'upload' }
    const service = new StorageService(driver, denied, undefined, false)
    const asset = await service.upload(upload())
    await expect(service.download(actor, asset.id)).rejects.toMatchObject({ status: 403 })
    await expect(service.signedUrl(actor, asset.id)).rejects.toMatchObject({ status: 403 })
    await expect(service.delete(actor, asset.id)).rejects.toMatchObject({ status: 403 })
  })

  it('keeps metadata and payload organization-scoped and supports lifecycle operations', async () => {
    const driver = new MemoryDriver()
    const service = new StorageService(driver, allow, undefined, false)
    const asset = await service.upload({ ...upload(), visibility: 'public' })
    expect(asset).toMatchObject({ organizationId: actor.organizationId, ownerId: actor.id, visibility: 'public', provider: 'local', size: jpeg.length })
    expect((await service.metadata(actor, asset.id)).sha256).toMatch(/^[a-f0-9]{64}$/)
    expect((await service.download(actor, asset.id)).bytes).toEqual(jpeg)
    const signed = await service.signedUrl(actor, asset.id, 300)
    expect(signed.url).toContain(asset.id)
    await expect(service.signedUrl(actor, asset.id, 901)).rejects.toThrow(/between 1 and 900/)
    await service.delete(actor, asset.id)
    await expect(service.metadata(actor, asset.id)).rejects.toMatchObject({ status: 404 })
  })

  it('fails closed on production uploads without a malware scanner and on failed scans', async () => {
    const service = new StorageService(new MemoryDriver(), allow, undefined, true)
    await expect(service.upload(upload())).rejects.toMatchObject({ status: 503 })
    const infected = new StorageService(new MemoryDriver(), allow, { scan: async () => ({ clean: false }) }, true)
    await expect(infected.upload(upload())).rejects.toMatchObject({ code: 'MALWARE_DETECTED', status: 422 })
    const scannerDown = new StorageService(new MemoryDriver(), allow, { scan: async () => { throw Error('offline') } }, true)
    await expect(scannerDown.upload(upload())).rejects.toMatchObject({ status: 503 })
  })

  it('uses only an RCRE-confined local runtime path and validates signed link expiry', async () => {
    vi.stubEnv('RCRE_STORAGE_SIGNING_SECRET', 'x'.repeat(40))
    const driver = new LocalObjectDriver()
    const service = new StorageService(driver, allow, { scan: async () => ({ clean: true }) }, false)
    const asset = await service.upload(upload())
    const result = await service.signedUrl(actor, asset.id)
    expect(result.url).toContain('/api/storage/local/')
    const params = new URL(result.url, 'http://localhost').searchParams
    expect(verifyLocalSignature(asset.id, Number(params.get('expires')), params.get('signature')!)).toBe(true)
    expect(verifyLocalSignature(asset.id, Date.now() - 1, params.get('signature')!)).toBe(false)
    expect((await service.download(actor, asset.id)).bytes).toEqual(jpeg)
    await service.delete(actor, asset.id)
  })

  it('requires an explicitly private Supabase bucket and server-only credentials', () => {
    const base: NodeJS.ProcessEnv = { NODE_ENV: 'test', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-secret', RCRE_STORAGE_BUCKET: 'rcre-private' }
    expect(() => new SupabaseObjectDriver(base)).toThrow(/confirmed private/)
    expect(() => new SupabaseObjectDriver({ ...base, RCRE_STORAGE_BUCKET_PRIVATE: 'true' })).not.toThrow()
    expect(() => new SupabaseObjectDriver({ ...base, RCRE_STORAGE_BUCKET_PRIVATE: 'true', SUPABASE_SERVICE_ROLE_KEY: '' })).toThrow(/required/)
  })
})
