import { beforeEach, describe, expect, it, vi } from 'vitest'

const { readRecords, getRecord, getSetting, query } = vi.hoisted(() => ({
  readRecords: vi.fn(),
  getRecord: vi.fn(),
  getSetting: vi.fn(),
  query: vi.fn(),
}))

vi.mock('@/lib/platform/auth', () => ({
  requireActor: vi.fn(async () => ({ id: 'broker', organizationId: 'org', role: 'broker_owner' })),
  assertCapability: vi.fn(),
  AccessError: class AccessError extends Error { status = 403 },
}))
vi.mock('@/lib/platform/store', () => ({
  DurableStoreUnavailableError: class DurableStoreUnavailableError extends Error {},
  readRecords,
  getRecord,
  storageRoot: '/local/sqlite/should-not-be-read',
}))
vi.mock('@/lib/platform/service', () => ({ getSetting }))
vi.mock('@/lib/config/env', () => ({ isProduction: true }))
vi.mock('@/lib/operations/readiness', () => ({
  dependencyReadiness: () => ({ core: { database: { state: 'needs_verification' }, storage: { state: 'not_configured' } }, optional: {} }),
}))
vi.mock('@/lib/db/pg', () => ({ getPgPool: () => ({ query }) }))
vi.mock('@/lib/db', () => ({ getRepository: vi.fn(async () => ({})) }))
vi.mock('@/lib/operations/production-health', () => ({
  productionHealthSnapshot: vi.fn(async () => ({
    worker: { status: 'not_configured' }, notifications: { inApp: { status: 'database_backed' }, email: { status: 'outbox_only' } },
    auditPolicy: { status: 'not_configured' }, backups: { status: 'not_verified' }, operationalErrors: { visibleRecords: 0, records: [] },
  })),
}))

import { GET } from '@/app/api/data-health/route'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('DATABASE_URL', 'postgres://health-test.invalid/rcre')
  query.mockResolvedValue({ rows: [{ '?column?': 1 }] })
})

describe('production data health source selection', () => {
  it('reports PostgreSQL-backed state and never reads the local SQLite adapter', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.mode).toBe('production')
    expect(body.database).toMatchObject({ status: 'connected', healthy: true })
    expect(body.databaseParity).toMatch(/PostgreSQL connectivity was verified/)
    expect(body.counts).toBeNull()
    expect(JSON.stringify(body)).not.toMatch(/local_sqlite|local synthetic data|SQLite adapter/i)
    expect(readRecords).not.toHaveBeenCalled()
    expect(getRecord).not.toHaveBeenCalled()
    expect(getSetting).not.toHaveBeenCalled()
  })

  it('reports database unavailable without falling back to SQLite when PostgreSQL is down', async () => {
    query.mockRejectedValueOnce(new Error('private connection detail'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.database).toMatchObject({ status: 'unavailable', healthy: false })
    expect(body.databaseParity).toMatch(/PostgreSQL is not healthy/)
    expect(JSON.stringify(body)).not.toContain('private connection detail')
    expect(readRecords).not.toHaveBeenCalled()
    expect(getRecord).not.toHaveBeenCalled()
    expect(getSetting).not.toHaveBeenCalled()
  })
})
