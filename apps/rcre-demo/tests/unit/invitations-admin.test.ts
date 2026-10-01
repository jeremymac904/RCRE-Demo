import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlatformActor } from '@/lib/platform/auth'

const mocks = vi.hoisted(() => ({ createInvitation: vi.fn(), resendInvitation: vi.fn(), listInvitations: vi.fn(), listMembers: vi.fn(), encryptMailPayload: vi.fn((_payload: { text: string }) => ({ ciphertext: Buffer.from('sealed'), nonce: Buffer.alloc(12), tag: Buffer.alloc(16) })) }))
vi.mock('@/lib/auth/persistence', () => ({
  getAuthPersistence: async () => ({ createInvitation: mocks.createInvitation, resendInvitation: mocks.resendInvitation, listInvitations: mocks.listInvitations, listMembers: mocks.listMembers }),
  hashSecret: () => 'a'.repeat(64),
  opaqueSecret: () => 'opaque-random-invitation-token',
}))
vi.mock('@/lib/auth/mail', () => ({ encryptMailPayload: mocks.encryptMailPayload }))

import { createInvitation, invitationById, resendInvitation } from '@/lib/auth/invitations'

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

  it('binds Managing Broker invitations to their own state before generating or persisting tokens', async () => {
    vi.stubEnv('RCRE_PUBLIC_URL', 'https://rcre.example')
    await expect(createInvitation(manager, { email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'al', market: 'Florida' })).rejects.toThrow(/requires brokerage owner approval/i)
    await expect(createInvitation(manager, { email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'al', market: 'Alabama & Florida' })).rejects.toThrow(/requires brokerage owner approval/i)
    expect(mocks.createInvitation).not.toHaveBeenCalled()

    mocks.createInvitation.mockResolvedValue({ invitationId: 'invite-al', userId: 'member-al' })
    await createInvitation(manager, { email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'al' })
    expect(mocks.createInvitation.mock.calls[0][1].market).toBe('Alabama')
  })


  it('blocks a Managing Broker from resending an invitation assigned outside their state', async () => {
    vi.stubEnv('RCRE_PUBLIC_URL', 'https://rcre.example')
    await expect(resendInvitation(manager, { id: 'invite-fl', email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'al', market: 'Florida' })).rejects.toThrow(/requires brokerage owner approval/i)
    await expect(resendInvitation(manager, { id: 'invite-both', email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'al', market: 'Alabama & Florida' })).rejects.toThrow(/requires brokerage owner approval/i)
    expect(mocks.resendInvitation).not.toHaveBeenCalled()
  })

  it('resolves the persisted invite market from the scoped invited member before resending', async () => {
    mocks.listInvitations.mockResolvedValue([{ id: 'invite-al', email: 'agent@example.test', name: 'Example Agent', role: 'agent', status: 'pending', createdAt: '', expiresAt: '', acceptedAt: null, mailStatus: 'queued' }])
    mocks.listMembers.mockResolvedValue([{ userId: 'member-al', email: 'agent@example.test', market: 'Alabama' }])
    await expect(invitationById(manager, 'invite-al')).resolves.toMatchObject({ id: 'invite-al', market: 'Alabama' })
  })

  it('requires a valid HTTPS public origin in production before queuing invitations', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_PUBLIC_URL', 'http://rcre.example')
    await expect(createInvitation(owner, { email: 'agent@example.test', name: 'Example Agent', role: 'agent', officeId: 'fl' })).rejects.toThrow(/HTTPS/i)
    expect(mocks.createInvitation).not.toHaveBeenCalled()
  })
})
