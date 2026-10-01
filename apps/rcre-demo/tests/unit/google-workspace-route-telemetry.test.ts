import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'

const ids = {
  org: '10000000-0000-4000-8000-000000000001',
  user: '20000000-0000-4000-8000-000000000001',
}
const actor: PlatformActor = {
  id: ids.user, userId: ids.user, organizationId: ids.org, role: 'broker_owner',
  name: 'Broker', market: 'Both', teamId: 'all', officeId: 'all',
}
const state = vi.hoisted(() => ({
  actor: null as PlatformActor | null,
  repository: null as MemoryRepository | null,
  service: {} as Record<string, unknown>,
}))

vi.mock('@/lib/platform/auth', () => ({
  AccessError: class AccessError extends Error { constructor(message: string, public status = 403) { super(message) } },
  requireActor: vi.fn(async () => state.actor),
}))
vi.mock('@/lib/db', () => ({ getRepository: vi.fn(async () => state.repository) }))
vi.mock('@/lib/google-workspace/service', () => ({ getGoogleWorkspaceService: () => state.service }))

import { workspacePost } from '@/lib/google-workspace/routes'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

function makeRepository() {
  const seed = emptySeed()
  seed.organizations.push({ id: ids.org, name: 'RCRE', slug: 'rcre' })
  seed.users.push({ id: ids.user, organizationId: ids.org, email: 'broker@example.test', fullName: 'Broker', role: 'owner', fubUserId: null, isActive: true })
  return new MemoryRepository(seed)
}

describe('Google Workspace route failure telemetry', () => {
  it('captures sanitized handled 5xx failures using the supplied static route template', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    state.actor = actor
    state.repository = makeRepository()
    const error = new Error('private@example.test bearer-token-not-for-logs')
    const request = new Request('https://rcre.example/api/integrations/google/calendar/events', {
      method: 'POST', headers: { origin: 'https://rcre.example', 'content-type': 'application/json' }, body: '{}',
    })

    const response = await workspacePost(async () => { throw error }, request, '/api/integrations/google/calendar/events')
    const body = await response.json()
    const records = await state.repository.listDomainRecords({ userId: ids.user, organizationId: ids.org, role: 'owner' }, 'operational_errors')

    expect(response.status).toBe(503)
    expect(body.error).toContain('private@example.test')
    expect(records).toHaveLength(1)
    expect(records[0].data).toMatchObject({ route: '/api/integrations/google/calendar/events', method: 'POST', status: 503, errorCode: 'ERROR' })
    expect(JSON.stringify(records[0].data)).not.toContain('private@example.test')
    expect(JSON.stringify(records[0].data)).not.toContain('bearer-token')
  })

  it('does not capture expected 4xx errors as operational failures', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    state.actor = actor
    const repository = makeRepository()
    state.repository = repository
    const request = new Request('https://rcre.example/api/integrations/google/calendar/events', {
      method: 'POST', headers: { origin: 'https://rcre.example', 'content-type': 'application/json' }, body: '{',
    })

    const response = await workspacePost(async () => null, request, '/api/integrations/google/calendar/events')
    const records = await repository.listDomainRecords({ userId: ids.user, organizationId: ids.org, role: 'owner' }, 'operational_errors')

    expect(response.status).toBe(400)
    expect(records).toHaveLength(0)
  })
})
