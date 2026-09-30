import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { AccessError, type PlatformActor } from '@/lib/platform/auth'

const auth = vi.hoisted(() => ({ requireActor: vi.fn() }))
const db = vi.hoisted(() => ({ getRepository: vi.fn() }))
vi.mock('@/lib/platform/auth', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/platform/auth')>()), requireActor: auth.requireActor }))
vi.mock('@/lib/db', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/db')>()), getRepository: db.getRepository }))

import { DELETE, GET, PATCH, POST } from '@/app/api/knowledge/route'

const broker: PlatformActor = { id: 'taquilla', userId: 'taquilla', organizationId: 'rcre-test', role: 'managing_broker', name: 'Taquilla Allen', market: 'Alabama', officeId: 'al', teamId: 'al' }
const agent: PlatformActor = { ...broker, id: 'agent-a', userId: 'agent-a', role: 'agent', name: 'Agent A' }
const input = {
  id: 'verified-al-resource', title: 'Approved Alabama forms index', category: 'Alabama', source: 'Approved internal source', state: 'AL',
  audience: { kind: 'all' }, visibility: 'state', classification: 'internal', externalUseAllowed: false, tags: ['forms'], content: 'Verified reference text only.',
}
const request = (method: string, body?: unknown) => new Request('http://localhost/api/knowledge', { method, headers: { 'content-type': 'application/json', origin: 'http://localhost' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

let repository: MemoryRepository

describe('authenticated knowledge management API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repository = new MemoryRepository(emptySeed())
    auth.requireActor.mockImplementation(async () => broker)
    db.getRepository.mockResolvedValue(repository)
  })

  it('allows managing brokers to add a verified source and persists it via the shared domain repository', async () => {
    const response = await POST(request('POST', input))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.document).toMatchObject({ id: input.id, organizationId: 'rcre-test', title: input.title, source: input.source, state: 'AL', version: 1 })
    expect(await repository.getDomainRecord({ userId: 'taquilla', organizationId: 'rcre-test', role: 'broker' }, 'rcre_ai_knowledge', input.id)).not.toBeNull()
  })

  it('derives write authority from the authenticated session and refuses an agent even if body claims broker role', async () => {
    auth.requireActor.mockResolvedValue(agent)
    const response = await POST(request('POST', { ...input, role: 'broker_owner', userId: 'taquilla', organizationId: 'other-org' }))
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ error: 'Brokerage administrator access required' })
  })

  it('updates with optimistic version and archives rather than deleting approved history', async () => {
    const createResponse = await POST(request('POST', input))
    const created = (await createResponse.json()).document
    const update = await PATCH(request('PATCH', { id: input.id, expectedVersion: created.version, patch: { content: 'New reviewed version.' } }))
    expect(update.status).toBe(200)
    const updated = (await update.json()).document
    expect(updated.version).toBe(2)
    const archivedResponse = await DELETE(request('DELETE', { id: input.id, expectedVersion: updated.version }))
    expect(archivedResponse.status).toBe(200)
    const archived = (await archivedResponse.json()).document
    expect(archived.archivedAt).toBeTruthy()
    expect(await repository.getDomainRecord({ userId: 'taquilla', organizationId: 'rcre-test', role: 'broker' }, 'rcre_ai_knowledge', input.id)).not.toBeNull()
  })

  it('rejects cross-origin changes and requires authentication before listing', async () => {
    const crossOrigin = new Request('http://localhost/api/knowledge', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://other.example' }, body: JSON.stringify(input) })
    expect((await POST(crossOrigin)).status).toBe(403)
    auth.requireActor.mockRejectedValue(new AccessError('Session expired. Sign in again.', 401))
    expect((await GET(new Request('http://localhost/api/knowledge'))).status).toBe(401)
  })
})
