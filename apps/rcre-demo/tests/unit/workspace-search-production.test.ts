import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ reads: 0 }))
const actor = { id: 'agent-1', userId: 'agent-1', organizationId: 'org-1', role: 'agent', officeId: 'fl' }

vi.mock('@/lib/platform/auth', () => ({
  requireActor: vi.fn(async () => actor),
  can: vi.fn(() => true),
  AccessError: class AccessError extends Error { status: number; constructor(message: string, status = 403) { super(message); this.status = status } },
}))
vi.mock('@/lib/platform/service', () => ({
  listContacts: vi.fn(() => { throw new Error('legacy fixture access') }),
  listTasks: vi.fn(() => { throw new Error('legacy fixture access') }),
  canReadMarketing: vi.fn(() => true),
  listContactsPage: vi.fn(async () => ({ rows: [{ id: 'contact-1', firstName: 'Dana', lastName: 'Example', email: 'dana@example.test', stage: 'Lead', tags: [] }], total: 1 })),
}))
vi.mock('@/lib/platform/store', () => ({ readRecords: vi.fn(() => { state.reads++; throw new Error('legacy store accessed') }) }))
vi.mock('@/lib/services/transactions', () => ({ listTransactions: vi.fn(() => { throw new Error('legacy fixture access') }) }))
vi.mock('@/lib/db', () => ({ getRepository: vi.fn(async () => ({})) }))
vi.mock('@/lib/platform/crm-durable', () => ({ listCrmTasksDurable: vi.fn(async () => [{ id: 'task-1', title: 'Call Dana', done: false, contactId: 'contact-1' }]) }))
vi.mock('@/lib/services/transactions-durable', () => ({ durableTransactions: vi.fn(() => ({ list: async () => [{ id: 'tx-1', address: 'Example Rd', client: 'Dana Example', status: 'active' }] })) }))
vi.mock('@/lib/platform/marketing-durable', () => ({ listMarketingDurable: vi.fn(async () => [{ id: 'campaign-1', title: 'Dana campaign', workflow: 'review', channel: 'email', status: 'draft' }]) }))
vi.mock('@/lib/platform/recruiting-durable', () => ({ listRecruitingDurable: vi.fn(async () => [{ id: 'prospect-1', name: 'Dana Prospect', stage: 'New inquiry', source: 'Referral' }]) }))
vi.mock('@/lib/academy-durable', () => ({ academyCatalog: vi.fn(async () => ({ courses: [{ id: 'course-1', title: 'Dana onboarding', description: 'New agent', category: 'Training' }] })) }))
vi.mock('@/lib/config/env', () => ({ isProduction: true }))

afterEach(() => { vi.resetModules(); vi.clearAllMocks(); state.reads = 0 })

describe('production workspace search', () => {
  it('searches durable scoped services and never reads fixture SQLite', async () => {
    const { POST } = await import('../../src/app/api/workspace-search/route')
    const response = await POST(new Request('https://rcre.example/api/workspace-search', {
      method: 'POST', headers: { origin: 'https://rcre.example', 'content-type': 'application/json' }, body: JSON.stringify({ query: 'dana' }),
    }))
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.total).toBe(6)
    expect(result.results.map((row: { kind: string }) => row.kind)).toEqual(['Contact', 'Task', 'Transaction', 'Content', 'Recruiting', 'Course'])
    expect(state.reads).toBe(0)
  })
})
