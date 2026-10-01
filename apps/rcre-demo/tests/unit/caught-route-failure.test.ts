import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySeed, MemoryRepository, type Actor } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'

const mocks = vi.hoisted(() => ({ getRepository: vi.fn() }))
vi.mock('@/lib/db', () => ({ getRepository: mocks.getRepository }))

import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

const organizationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const actor: PlatformActor = { id: userId, userId, organizationId, role: 'broker_owner', name: 'Owner', market: 'Both', teamId: 'all', officeId: 'all' }
const dbActor: Actor = { userId, organizationId, role: 'owner' }

function repository() {
  const seed = emptySeed()
  seed.organizations.push({ id: organizationId, name: 'RCRE', slug: 'rcre' })
  seed.users.push({ id: userId, organizationId, email: 'owner@example.test', fullName: 'Owner', role: 'owner', fubUserId: null, isActive: true })
  return new MemoryRepository(seed)
}

describe('route-local failure capture', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'))
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  it('stores only static route and safe failure metadata for an authenticated 5xx', async () => {
    const repo = repository()
    mocks.getRepository.mockResolvedValue(repo)
    const request = new Request('https://rcre.example/api/admin/agents/private-id?email=person@example.test', {
      method: 'POST', headers: { 'x-rcre-request-id': '01234567-89ab-cdef-0123-456789abcdef' },
    })
    await recordCaughtRouteFailure(request, '/api/admin/agents/[id]', actor, 503, new Error('secret token and person@example.test'))
    const records = await repo.listDomainRecords(dbActor, 'operational_errors')
    expect(records).toHaveLength(1)
    expect(records[0].data).toMatchObject({ route: '/api/admin/agents/[id]', method: 'POST', status: 503, errorCode: 'ERROR' })
    expect(JSON.stringify(records[0].data)).not.toContain('private-id')
    expect(JSON.stringify(records[0].data)).not.toContain('person@example.test')
  })

  it('does not persist client errors, unauthenticated failures, or non-production failures', async () => {
    mocks.getRepository.mockResolvedValue(repository())
    const request = new Request('https://rcre.example/api/admin/agents')
    await recordCaughtRouteFailure(request, '/api/admin/agents', actor, 400, new Error('invalid'))
    await recordCaughtRouteFailure(request, '/api/admin/agents', null, 500, new Error('auth'))
    vi.stubEnv('NODE_ENV', 'test')
    await recordCaughtRouteFailure(request, '/api/admin/agents', actor, 500, new Error('dev'))
    expect(mocks.getRepository).not.toHaveBeenCalled()
  })

  it('never throws when durable telemetry storage is unavailable', async () => {
    mocks.getRepository.mockRejectedValue(new Error('database secret'))
    await expect(recordCaughtRouteFailure(
      new Request('https://rcre.example/api/admin/invitations', { method: 'POST' }),
      '/api/admin/invitations', actor, 500, new Error('private payload'),
    )).resolves.toBeUndefined()
  })
})
