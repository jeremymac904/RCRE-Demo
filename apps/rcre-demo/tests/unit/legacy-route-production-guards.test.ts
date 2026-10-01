import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('legacy-store API route production guards', () => {
  it.each([
    ['lead-campaign GET', '../../src/app/api/lead-campaign/route', 'GET'],
    ['lead-campaign POST', '../../src/app/api/lead-campaign/route', 'POST'],
    ['approval-center GET', '../../src/app/api/approval-center/route', 'GET'],
    ['workspace-search POST', '../../src/app/api/workspace-search/route', 'POST'],
    ['public engagement POST', '../../src/app/api/public/engagement/route', 'POST'],
  ])('%s fails closed before auth or legacy store access in production', async (_name, modulePath, method) => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const route = await import(modulePath) as Record<string, (request?: Request) => Promise<Response>>
    const handler = route[method]
    const request = method === 'POST'
      ? new Request('https://rcre.example/api/guard-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      : undefined
    const response = await handler(request)
    expect(response.status).toBe(503)
    expect((await response.json()).error).toMatch(/unavailable|available/i)
  })
})
