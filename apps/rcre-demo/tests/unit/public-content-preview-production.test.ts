import { afterEach, describe, expect, it, vi } from 'vitest'
const actor = { id: 'editor-1', userId: 'editor-1', organizationId: 'org-1', role: 'marketing_admin' }
const record = { id: '/blog/preview-check', organizationId: 'org-1', status: 'draft', revision: 2, title: 'Draft preview', description: 'Draft description', body: 'Draft copy' }
vi.mock('@/lib/platform/auth', () => ({ assertCapability: vi.fn() }))
vi.mock('@/lib/config/env', () => ({ isProduction: true }))
vi.mock('@/lib/db', () => ({ getRepository: vi.fn(async () => ({ listDomainRecords: vi.fn(async () => [{ data: record }]) })) }))
vi.mock('@/lib/platform/store', () => ({ getRecord: vi.fn(() => { throw new Error('SQLite must not be read in production') }) }))
afterEach(() => { vi.resetModules(); vi.clearAllMocks() })
describe('production CMS draft preview', () => {
  it('loads an organization scoped draft from the durable admin repository', async () => {
    const { getPublicContentPreview } = await import('../../src/lib/public/cms')
    const loaded = await getPublicContentPreview(actor as never, record.id)
    expect(loaded?.title).toBe('Draft preview')
    expect((await import('../../src/lib/platform/store')).getRecord).not.toHaveBeenCalled()
  })
})
