import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/platform/store', () => ({
  getRecord: vi.fn(() => { throw new Error('ephemeral visitor history must not be read') }),
  readRecords: vi.fn(() => { throw new Error('ephemeral visitor history must not be read') }),
  putRecord: vi.fn(() => { throw new Error('ephemeral visitor history must not be written') }),
  deleteRecord: vi.fn(() => { throw new Error('ephemeral visitor history must not be deleted') }),
  transaction: vi.fn(() => { throw new Error('ephemeral visitor history must not be transacted') }),
}))
vi.mock('../../src/lib/services/rate-limit', () => ({
  rateLimitRequest: vi.fn(async () => ({ allowed: true, remaining: 7, retryAfterSeconds: 60 })),
  SharedRateLimitUnavailableError: class SharedRateLimitUnavailableError extends Error {},
}))

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks() })

describe('public chat production behavior', () => {
  it('serves stateless history and clear responses without using ephemeral storage', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const { NextRequest } = await import('next/server')
    const route = await import('../../src/app/api/public/chat/route')
    for (const method of ['GET', 'DELETE'] as const) {
      const request = new NextRequest('https://rcre.example/api/public/chat', { method, headers: { origin: 'https://rcre.example' } })
      const response = await route[method](request)
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toMatchObject({ messages: [], historyPersistent: false, providerConfigured: false })
    }
  })

  it('answers using published deterministic sources without storing user questions', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_ORGANIZATION_ID', '')
    vi.resetModules()
    const { NextRequest } = await import('next/server')
    const route = await import('../../src/app/api/public/chat/route')
    const store = await import('../../src/lib/platform/store')
    const body = JSON.stringify({ prompt: 'Where can I find an agent?' })
    const response = await route.POST(new NextRequest('https://rcre.example/api/public/chat', { method: 'POST', headers: { origin: 'https://rcre.example', 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) }, body }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ historyPersistent: false, providerConfigured: false, messages: [{ mode: 'guide', state: 'complete' }] })
    expect(store.putRecord).not.toHaveBeenCalled()
    expect(store.transaction).not.toHaveBeenCalled()
  })
})
