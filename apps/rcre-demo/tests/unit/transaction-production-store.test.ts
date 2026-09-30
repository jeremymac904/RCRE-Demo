import { expect, it, vi } from 'vitest'

it('fails closed with HTTP-ready 503 semantics instead of using SQLite in production runtime', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('NEXT_PHASE', '')
  vi.resetModules()
  try {
    const store = await import('../../src/lib/platform/store')
    let thrown: unknown
    try {
      store.getRecord('transaction_records', 'transaction-id')
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(store.DurableStoreUnavailableError)
    expect((thrown as { status: number }).status).toBe(503)
  } finally {
    vi.unstubAllEnvs()
    vi.resetModules()
  }
})
