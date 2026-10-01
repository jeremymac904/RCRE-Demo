import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('live application core configuration', () => {
  it('requires PostgreSQL but permits CRM startup without optional Follow Up Boss credentials', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_DATA_MODE', 'live')
    vi.stubEnv('DATABASE_URL', 'postgres://rcre-test.invalid/platform')
    vi.stubEnv('FUB_API_KEY', '')
    vi.stubEnv('FUB_SYSTEM', '')
    vi.stubEnv('FUB_SYSTEM_KEY', '')

    const { assertLiveConfig, env } = await import('@/lib/config/env')

    expect(() => assertLiveConfig()).not.toThrow()
    expect(env.fub.apiKey).toBeUndefined()
  })

  it('fails live core configuration when PostgreSQL is absent', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_DATA_MODE', 'live')
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('FUB_API_KEY', '')

    const { assertLiveConfig } = await import('@/lib/config/env')

    expect(() => assertLiveConfig()).toThrow('DATABASE_URL is required in live mode')
  })
})
