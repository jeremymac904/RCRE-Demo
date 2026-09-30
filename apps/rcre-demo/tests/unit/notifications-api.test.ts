import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
const session = vi.hoisted(() => ({ id: 'u-sarah' }))
vi.mock('../../src/lib/platform/auth', async () => {
  const actual = await vi.importActual<any>('../../src/lib/platform/auth')
  return { ...actual, requireActor: async () => actual.PERSONAS.find((person: any) => person.id === session.id) }
})
import { GET, POST } from '../../src/app/api/platform/[...path]/route'
import { deleteRecord, getRecord, putRecord, readRecords } from '../../src/lib/platform/store'
import { PERSONAS } from '../../src/lib/platform/auth'
import { getSetting, saveSetting } from '../../src/lib/platform/service'

const agent = PERSONAS.find(person => person.id === 'u-sarah')!
const params = (...path: string[]) => ({ params: Promise.resolve({ path }) })
const request = (path: string, body?: unknown) => new Request('http://localhost:3200/api/platform/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
const cleanup: string[] = []
afterAll(() => { for (const id of cleanup) { deleteRecord('notifications', id); deleteRecord('audit', id) } })

describe('notification API scope and delivery claims', () => {
  it('writes an in-app preview under the authenticated actor and reports email as unavailable', async () => {
    session.id = agent.id
    const prefs = getSetting(agent, 'personal')
    saveSetting(agent, 'personal', { ...prefs.value, inAppNotifications: false }, prefs.version)
    const response = await POST(request('notifications', { action: 'test' }), params('notifications'))
    expect(response.status).toBe(200)
    const notification = await response.json()
    cleanup.push(notification.id)
    expect(notification.organizationId).toBe(agent.organizationId)
    expect(notification.ownerId).toBe(agent.id)
    expect(notification.channel).toBe('in_app')
    expect(notification.deliveryState).toBe('suppressed')
    expect(notification.emailStatus).toBe('not_configured')
    expect(readRecords<any>('audit').some(row => row.actorId === agent.id && row.action === 'notification.preview_recorded' && row.resource === notification.id)).toBe(true)
  })

  it('lists only the actor’s notifications within the actor’s organization', async () => {
    session.id = agent.id
    const ownId = randomUUID(), foreignTenantId = randomUUID(), foreignOwnerId = randomUUID()
    cleanup.push(ownId)
    putRecord('notifications', { id: ownId, organizationId: agent.organizationId, ownerId: agent.id, title: 'Own', read: false })
    putRecord('notifications', { id: foreignTenantId, organizationId: 'other-org', ownerId: agent.id, title: 'Other tenant', read: false })
    putRecord('notifications', { id: foreignOwnerId, organizationId: agent.organizationId, ownerId: 'u-vito', title: 'Other owner', read: false })
    const response = await GET(request('notifications'), params('notifications'))
    const rows = await response.json()
    expect(response.status).toBe(200)
    expect(rows.map((row: any) => row.id)).toContain(ownId)
    expect(rows.map((row: any) => row.id)).not.toContain(foreignTenantId)
    expect(rows.map((row: any) => row.id)).not.toContain(foreignOwnerId)
    deleteRecord('notifications', foreignTenantId)
    deleteRecord('notifications', foreignOwnerId)
  })

  it('refuses to mark another tenant’s record read', async () => {
    session.id = agent.id
    const id = randomUUID()
    putRecord('notifications', { id, organizationId: 'other-org', ownerId: agent.id, title: 'Do not mutate', read: false })
    const response = await POST(request('notifications', { id }), params('notifications'))
    expect(response.status).toBe(404)
    expect(getRecord<any>('notifications', id)?.read).toBe(false)
    deleteRecord('notifications', id)
  })
})
