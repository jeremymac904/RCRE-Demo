import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { emptySeed, MemoryRepository, type Actor } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'

const mocks = vi.hoisted(() => ({ getRepository: vi.fn() }))
vi.mock('@/lib/db', () => ({ getRepository: mocks.getRepository }))

import { platformApiFailure } from '@/lib/operations/route-failure'

const organizationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const actor: PlatformActor = { id: userId, userId, organizationId, role: 'broker_owner', name: 'Owner', market: 'Both', teamId: 'all', officeId: 'all' }
const dbActor: Actor = { userId, organizationId, role: 'owner' }

function memoryRepository() {
  const seed = emptySeed()
  seed.organizations.push({ id: organizationId, name: 'RCRE', slug: 'rcre' })
  seed.users.push({ id: userId, organizationId, email: 'owner@example.test', fullName: 'Owner', role: 'owner', fubUserId: null, isActive: true })
  return new MemoryRepository(seed)
}

describe('authenticated production route failure capture', () => {
  beforeEach(() => { vi.stubEnv('NODE_ENV', 'production') })
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  it('persists only safe route metadata and preserves the generic 500 response', async () => {
    const repository = memoryRepository()
    mocks.getRepository.mockResolvedValue(repository)
    const response = await platformApiFailure(new Error('private SQL query for person@example.test'), new Request('https://rcre.example/api/platform/contacts/private-id', {
      method: 'POST', headers: { 'x-rcre-request-id': '01234567-89ab-cdef-0123-456789abcdef' },
    }), actor)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'The request could not be completed. Please try again later.' })
    const rows = await repository.listDomainRecords(dbActor, 'operational_errors')
    expect(rows).toHaveLength(1)
    expect(rows[0].data).toMatchObject({ category: 'route_failure', route: '/api/platform/[...path]', method: 'POST', status: 500, errorCode: 'ERROR' })
    expect(JSON.stringify(rows[0].data)).not.toContain('private-id')
    expect(JSON.stringify(rows[0].data)).not.toContain('person@example.test')
  })

  it('does not recurse or change the response if durable capture is unavailable', async () => {
    mocks.getRepository.mockRejectedValue(new Error('database URL secret'))
    const response = await platformApiFailure(new Error('sensitive cause'), new Request('https://rcre.example/api/platform/contacts/x'), actor)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'The request could not be completed. Please try again later.' })
  })
})
