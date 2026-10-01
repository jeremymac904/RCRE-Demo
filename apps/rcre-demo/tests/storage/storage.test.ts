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

  it('rejects malformed categories and cross-organization access even with a broad callback', async () => {
    const driver = new MemoryDriver()
    const service = new StorageService(driver, { authorize: () => true }, undefined, false)
    await expect(service.upload({ ...upload(), category: 'constructor' as StorageCategory })).rejects.toThrow(/category/i)
    const asset = await service.upload(upload())
    await expect(service.download({ ...actor, organizationId: 'another-org' }, asset.id)).rejects.toMatchObject({ status: 403 })
    await expect(service.delete({ ...actor, organizationId: 'another-org' }, asset.id)).rejects.toMatchObject({ status: 403 })
    expect(driver.records.has(asset.id)).toBe(true)
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

  it('rejects corrupt or cross-provider manifests before authorization or object access', async () => {
    const driver = new MemoryDriver()
    let authorizationCalls = 0
    const service = new StorageService(driver, { authorize: () => { authorizationCalls++; return true } }, undefined, false)
    const asset = await service.upload(upload())
    driver.records.set(asset.id, { asset: { ...asset, organizationId: '../other-org' } as StorageAsset, bytes: jpeg })
    authorizationCalls = 0
    await expect(service.signedUrl(actor, asset.id)).rejects.toMatchObject({ status: 503 })
    expect(authorizationCalls).toBe(0)
    driver.records.set(asset.id, { asset: { ...asset, category: 'constructor' } as unknown as StorageAsset, bytes: jpeg })
    await expect(service.metadata(actor, asset.id)).rejects.toMatchObject({ status: 503 })
    driver.records.set(asset.id, { asset: { ...asset, provider: 'supabase' } as StorageAsset, bytes: jpeg })
    await expect(service.download(actor, asset.id)).rejects.toMatchObject({ status: 503 })
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

  it('keeps the Supabase driver on its private object and metadata endpoints', async () => {
    const driver = new SupabaseObjectDriver({ NODE_ENV: 'test', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-secret', RCRE_STORAGE_BUCKET: 'rcre-private', RCRE_STORAGE_BUCKET_PRIVATE: 'true' })
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      if (init?.method === 'POST' && String(url).includes('/object/sign/')) return new Response(JSON.stringify({ signedURL: '/object/sign/rcre-private/org/agent-headshot/00000000-0000-0000-0000-000000000001?token=test' }), { status: 200 })
      if ((!init?.method || init.method === 'GET') && String(url).includes('.rcre-metadata')) return new Response(JSON.stringify({ id: '00000000-0000-0000-0000-000000000001', organizationId: 'org-rcre' }), { status: 200 })
      return new Response('', { status: 200 })
    }) as typeof fetch
    try {
      const asset: StorageAsset = { id: '00000000-0000-0000-0000-000000000001', organizationId: 'org-rcre', ownerId: actor.id, category: 'agent-headshot', visibility: 'private', filename: 'photo.jpg', contentType: 'image/jpeg', size: jpeg.length, sha256: 'a'.repeat(64), createdAt: new Date().toISOString(), provider: 'supabase' }
      await driver.put(asset, jpeg)
      expect(await driver.getMetadata(asset.id)).toMatchObject({ id: asset.id })
      expect(await driver.sign(asset, Date.now() + 60_000)).toContain('https://example.supabase.co/object/sign/')
      expect(calls).toHaveLength(4)
      expect(calls.every(call => (call.init?.headers as Record<string, string>).apikey === 'server-only-test-secret')).toBe(true)
      expect(calls.some(call => call.url.includes('/rcre-private/org-rcre/agent-headshot/'))).toBe(true)
      expect(calls.some(call => call.url.includes('.rcre-metadata/'))).toBe(true)
    } finally { globalThis.fetch = originalFetch }
  })

  it('rolls back a Supabase object when its metadata manifest cannot be committed', async () => {
    const driver = new SupabaseObjectDriver({ NODE_ENV: 'test', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-secret', RCRE_STORAGE_BUCKET: 'rcre-private', RCRE_STORAGE_BUCKET_PRIVATE: 'true' })
    const calls: Array<{ url: string; method?: string }> = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const entry = { url: String(url), method: init?.method }
      calls.push(entry)
      if (calls.length === 2) return new Response('metadata write rejected', { status: 500 })
      return new Response('', { status: 200 })
    }) as typeof fetch
    try {
      const asset: StorageAsset = { id: '00000000-0000-0000-0000-000000000001', organizationId: 'org-rcre', ownerId: actor.id, category: 'agent-headshot', visibility: 'private', filename: 'photo.jpg', contentType: 'image/jpeg', size: jpeg.length, sha256: 'a'.repeat(64), createdAt: new Date().toISOString(), provider: 'supabase' }
      await expect(driver.put(asset, jpeg)).rejects.toThrow(/metadata write failed/)
      expect(calls).toHaveLength(3)
      expect(calls[0].method).toBe('POST')
      expect(calls[1].method).toBe('POST')
      expect(calls[2].method).toBe('DELETE')
      expect(calls[2].url).toContain('/org-rcre/agent-headshot/')
    } finally { globalThis.fetch = originalFetch }
  })

  it('does not report Supabase deletion success when the provider rejects removal', async () => {
    const driver = new SupabaseObjectDriver({ NODE_ENV: 'test', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-secret', RCRE_STORAGE_BUCKET: 'rcre-private', RCRE_STORAGE_BUCKET_PRIVATE: 'true' })
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response('provider unavailable', { status: 503 })) as typeof fetch
    try {
      const asset: StorageAsset = { id: '00000000-0000-0000-0000-000000000001', organizationId: 'org-rcre', ownerId: actor.id, category: 'agent-headshot', visibility: 'private', filename: 'photo.jpg', contentType: 'image/jpeg', size: jpeg.length, sha256: 'a'.repeat(64), createdAt: new Date().toISOString(), provider: 'supabase' }
      await expect(driver.delete(asset)).rejects.toThrow(/object deletion failed/)
    } finally { globalThis.fetch = originalFetch }
  })

  it('rejects signed URLs that escape the configured Supabase origin', async () => {
    const driver = new SupabaseObjectDriver({ NODE_ENV: 'test', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-secret', RCRE_STORAGE_BUCKET: 'rcre-private', RCRE_STORAGE_BUCKET_PRIVATE: 'true' })
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify({ signedURL: 'https://attacker.example/collect?token=secret' }), { status: 200 })) as typeof fetch
    try {
      const asset: StorageAsset = { id: '00000000-0000-0000-0000-000000000001', organizationId: 'org-rcre', ownerId: actor.id, category: 'agent-headshot', visibility: 'private', filename: 'photo.jpg', contentType: 'image/jpeg', size: jpeg.length, sha256: 'a'.repeat(64), createdAt: new Date().toISOString(), provider: 'supabase' }
      await expect(driver.sign(asset, Date.now() + 60_000)).rejects.toThrow(/unexpected host/)
    } finally { globalThis.fetch = originalFetch }
  })

  it('requires an explicitly private Supabase bucket and server-only credentials', () => {
    const base: NodeJS.ProcessEnv = { NODE_ENV: 'test', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-secret', RCRE_STORAGE_BUCKET: 'rcre-private' }
    expect(() => new SupabaseObjectDriver(base)).toThrow(/confirmed private/)
    expect(() => new SupabaseObjectDriver({ ...base, RCRE_STORAGE_BUCKET_PRIVATE: 'true' })).not.toThrow()
    expect(() => new SupabaseObjectDriver({ ...base, RCRE_STORAGE_BUCKET_PRIVATE: 'true', SUPABASE_SERVICE_ROLE_KEY: '' })).toThrow(/required/)
  })
})
