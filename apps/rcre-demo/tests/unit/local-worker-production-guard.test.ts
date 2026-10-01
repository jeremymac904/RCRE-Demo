import { afterEach, describe, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
describe('local worker production guard', () => {
  it('cannot be re-enabled by local worker mode and a secret in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_APP_MODE', 'local')
    vi.stubEnv('RCRE_LOCAL_WORKER_KEY', 'configured-key')
    vi.resetModules()
    const { POST } = await import('../../src/app/api/local-worker/route')
    const response = await POST(new Request('https://rcre.example/api/local-worker', { method: 'POST', headers: { authorization: 'Bearer configured-key' } }))
    expect(response.status).toBe(404)
  })
})
