import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlatformActor } from '@/lib/platform/auth'

const mocks = vi.hoisted(() => ({ createInvitation: vi.fn(), encryptMailPayload: vi.fn((_payload: { text: string }) => ({ ciphertext: Buffer.from('sealed'), nonce: Buffer.alloc(12), tag: Buffer.alloc(16) })) }))
vi.mock('@/lib/auth/persistence', () => ({
  getAuthPersistence: async () => ({ createInvitation: mocks.createInvitation }),
  hashSecret: () => 'a'.repeat(64),
  opaqueSecret: () => 'opaque-random-invitation-token',
}))
vi.mock('@/lib/auth/mail', () => ({ encryptMailPayload: mocks.encryptMailPayload }))

import { createInvitation } from '@/lib/auth/invitations'

const owner: PlatformActor = { id: 'owner', userId: 'owner', organizationId: 'org', role: 'broker_owner', name: 'Julio', market: 'Both markets', officeId: 'all', teamId: 'all' }
const manager: PlatformActor = { id: 'manager', userId: 'manager', organizationId: 'org', role: 'managing_broker', name: 'Taquilla', market: 'Alabama', officeId: 'al', teamId: 'al' }

afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })

describe('brokerage invitations', () => {
  it('creates an opaque, hashed invitation and queues mail without exposing the bearer token', async () => {
    vi.stubEnv('RCRE_PUBLIC_URL', 'https://rcre.example')
    mocks.createInvitation.mockResolvedValue({ invitationId: 'invite-1', userId: 'member-1' })
    const result = await createInvitation(owner, { email: '  agent@example.test ', name: '  Example Agent  ', role: 'agent', officeId: 'fl' })
    expect(result).toMatchObject({ id: 'invite-1', status: 'queued' })
    expect(JSON.stringify(result)).not.toContain('opaque-random-invitation-token')
    const saved = mocks.createInvitation.mock.calls[0][1]
    expect(saved).toMatchObject({ email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'fl', tokenHash: 'a'.repeat(64) })
    expect(saved.tokenHash).not.toContain('opaque-random-invitation-token')
    expect(saved.payload.ciphertext.toString()).toBe('sealed')
    expect(mocks.encryptMailPayload.mock.calls[0][0].text).toContain('https://rcre.example/access/opaque-random-invitation-token')
  })

  it('blocks a managing broker from inviting outside the assigned office or to a privileged role', async () => {
    vi.stubEnv('RCRE_PUBLIC_URL', 'https://rcre.example')
    await expect(createInvitation(manager, { email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'fl' })).rejects.toThrow(/requires brokerage owner approval/i)
    await expect(createInvitation(manager, { email: 'new-manager@example.test', name: 'New Manager', role: 'broker_owner', officeId: 'al' })).rejects.toThrow(/requires brokerage owner approval/i)
    expect(mocks.createInvitation).not.toHaveBeenCalled()
  })

  it('requires a valid HTTPS public origin in production before queuing invitations', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_PUBLIC_URL', 'http://rcre.example')
    await expect(createInvitation(owner, { email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'fl' })).rejects.toThrow(/HTTPS/i)
    expect(mocks.createInvitation).not.toHaveBeenCalled()
  })
})
