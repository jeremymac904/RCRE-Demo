import { afterEach, describe, expect, it, vi } from 'vitest'

const actor = { id: 'broker-1', userId: 'broker-1', organizationId: 'org-1', role: 'broker_owner', officeId: 'fl' }
vi.mock('@/lib/platform/auth', () => ({ requireActor: vi.fn(async () => actor), can: vi.fn(() => true), AccessError: class AccessError extends Error { status = 403 } }))
vi.mock('@/lib/platform/service', () => ({ canEditMarketing: vi.fn(() => true) }))
vi.mock('@/lib/platform/store', () => ({ readRecords: vi.fn(() => { throw new Error('fixture store accessed') }) }))
vi.mock('@/lib/services/transactions', () => ({ listTransactions: vi.fn(() => { throw new Error('fixture transaction service accessed') }), drafts: vi.fn() }))
vi.mock('@/lib/academy-service', () => ({ academyReviews: vi.fn(() => { throw new Error('fixture academy accessed') }) }))
vi.mock('@/lib/config/env', () => ({ isProduction: true }))
vi.mock('@/lib/db', () => ({ getRepository: vi.fn(async () => ({})) }))
vi.mock('@/lib/services/transactions-durable', () => ({ durableTransactions: vi.fn(() => ({
  list: async () => [{ id: 'tx-1', address: 'Example Road' }],
  related: async () => [{ id: 'draft-1', state: 'awaiting_approval', version: 2 }],
})) }))
vi.mock('@/lib/platform/marketing-durable', () => ({ listMarketingDurable: vi.fn(async () => [{ id: 'campaign-1', title: 'Campaign', status: 'review', version: 3 }]) }))
vi.mock('@/lib/academy-durable', () => ({ academyCatalog: vi.fn(async () => ({ customCourses: [{ id: 'course-1', title: 'Course', state: 'review', submittedBy: actor.id, version: 4 }] })) }))
vi.mock('@/lib/operations/caught-route-failure', () => ({ recordCaughtRouteFailure: vi.fn(async () => undefined) }))

afterEach(() => { vi.resetModules(); vi.clearAllMocks() })

describe('production approval center', () => {
  it('aggregates transaction, marketing and course reviews from durable services', async () => {
    const { GET } = await import('../../src/app/api/approval-center/route')
    const response = await GET(new Request('https://rcre.example/api/approval-center'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    const rows = await response.json()
    expect(rows.map((row: { kind: string }) => row.kind)).toEqual(['Inspection coordination draft', 'Marketing content', 'Course publication'])
    expect(rows[2].state).toBe('Awaiting an independent reviewer')
  })
})
