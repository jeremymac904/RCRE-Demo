import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireActor: vi.fn(),
  getRepository: vi.fn(),
  listKnowledgeDocuments: vi.fn(),
  recordCaughtRouteFailure: vi.fn(),
}))

vi.mock('@/lib/platform/auth', () => ({
  requireActor: mocks.requireActor,
  AccessError: class AccessError extends Error { status: number; constructor(message: string, status = 403) { super(message); this.status = status } },
}))
vi.mock('@/lib/db', () => ({ getRepository: mocks.getRepository }))
vi.mock('@/lib/db/repository', () => ({ DomainRecordConflictError: class DomainRecordConflictError extends Error {} }))
vi.mock('@/lib/services/ai-knowledge', () => ({
  domainKnowledgeRepository: (repository: unknown) => repository,
  createKnowledgeDocument: vi.fn(), updateKnowledgeDocument: vi.fn(), archiveKnowledgeDocument: vi.fn(),
  listKnowledgeDocuments: mocks.listKnowledgeDocuments, searchKnowledge: vi.fn(), getKnowledgeDocument: vi.fn(),
}))
vi.mock('@/lib/platform/knowledge-access', () => ({ trustedKnowledgeActor: (actor: unknown) => actor }))
vi.mock('@/lib/auth/request-origin', () => ({ assertSameOriginMutation: vi.fn() }))
vi.mock('@/lib/operations/caught-route-failure', () => ({ recordCaughtRouteFailure: mocks.recordCaughtRouteFailure }))

import { GET } from '@/app/api/knowledge/route'
import { AccessError } from '@/lib/platform/auth'

const actor = { id: 'owner', userId: 'owner', organizationId: 'org', role: 'broker_owner', name: 'Owner', market: 'Florida', officeId: 'fl', teamId: 'fl' }

afterEach(() => vi.clearAllMocks())

describe('knowledge route failure handling', () => {
  it('returns a generic service error and captures unexpected database failures', async () => {
    mocks.requireActor.mockResolvedValue(actor)
    mocks.getRepository.mockResolvedValue({})
    mocks.listKnowledgeDocuments.mockRejectedValue(new Error('password=secret private@example.test'))
    const request = new Request('https://rcre.test/api/knowledge')
    const response = await GET(request)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Knowledge services are temporarily unavailable.' })
    expect(mocks.recordCaughtRouteFailure).toHaveBeenCalledWith(request, '/api/knowledge', actor, 503, expect.any(Error))
  })

  it('keeps authorization errors visible without recording them as server failures', async () => {
    mocks.requireActor.mockRejectedValue(new AccessError('Sign in required', 401))
    const response = await GET(new Request('https://rcre.test/api/knowledge'))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Sign in required' })
    expect(mocks.recordCaughtRouteFailure).toHaveBeenCalledWith(expect.any(Request), '/api/knowledge', null, 401, expect.any(AccessError))
  })
})
