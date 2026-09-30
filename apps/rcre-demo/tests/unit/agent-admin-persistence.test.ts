import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRepository, emptySeed } from '../../src/lib/db/repository'
import { configureAuthPersistenceForTests, type AuthPersistence, type MemberSummary } from '../../src/lib/auth/persistence'
import type { PlatformActor } from '../../src/lib/platform/auth'
import { listAdminAgents, revokeAdminAgentSessions, updateAdminAgent } from '../../src/lib/platform/agent-admin'
const owner: PlatformActor = { id: 'owner-1', userId: 'owner-1', organizationId: 'org-1', name: 'Julio', role: 'broker_owner', officeId: 'all', teamId: 'all', market: 'Both markets' }
const manager: PlatformActor = { id: 'manager-1', userId: 'manager-1', organizationId: 'org-1', name: 'Taquilla', role: 'managing_broker', officeId: 'al', teamId: 'al', market: 'Alabama' }
const alAgent: MemberSummary = { userId: 'agent-al', organizationId: 'org-1', canonicalPersonId: null, email: 'agent@example.test', name: 'AL Agent', platformRole: 'agent', active: true, accountStatus: 'active', officeId: 'al', teamId: 'al', market: 'Alabama', lastLoginAt: null }
const flAgent: MemberSummary = { ...alAgent, userId: 'agent-fl', email: 'fl@example.test', officeId: 'fl', teamId: 'fl', market: 'Florida' }
function authMock(members: MemberSummary[]) {
  const mock = { listMembers: vi.fn(async () => members), updateMember: vi.fn(async () => true), revokeUserSessions: vi.fn(async () => 2) }
  configureAuthPersistenceForTests(mock as unknown as AuthPersistence)
  return mock
}
function repository() { return new MemoryRepository(emptySeed()) }
const payload = { role: 'agent', officeId: 'al', teamId: 'al', market: 'Alabama', active: false, publicVisible: false, licenses: [{ state: 'Alabama', number: 'AL123' }], professionalTitle: 'REALTOR®', biography: 'Verified bio', specialties: ['Residential'], markets: ['Birmingham, Alabama'] }
afterEach(() => configureAuthPersistenceForTests(null))
describe('agent lifecycle administration', () => {
  it('lists only office-scoped agents to managing brokers and makes unknown identity mapping explicit', async () => {
    authMock([alAgent, flAgent])
    const agents = await listAdminAgents(manager, repository())
    expect(agents.map(agent => agent.userId)).toEqual(['agent-al'])
    expect(agents[0].canonicalPersonId).toBeNull()
    expect(agents[0].lastLoginAt).toBeNull()
    expect(agents[0].onboardingStepsComplete).toBe(0)
  })
  it('persists role, licensing and profile changes, audits, and revokes sessions on deactivation', async () => {
    const auth = authMock([alAgent])
    const repo = repository()
    const result = await updateAdminAgent(manager, alAgent.userId, payload, repo)
    expect(result).toEqual({ updated: true, sessionsRevoked: true, revokedSessions: 2 })
    expect(auth.updateMember).toHaveBeenCalledWith(manager, alAgent.userId, expect.objectContaining({ active: false, role: 'agent', officeId: 'al' }))
    const profile = await repo.getDomainRecord<any>({ userId: manager.id, organizationId: manager.organizationId, role: 'broker' }, 'member_profiles', alAgent.userId)
    expect(profile?.data.licenses).toEqual([{ state: 'Alabama', number: 'AL123' }])
    expect(profile?.data.biography).toBe('Verified bio')
    expect((await repo.listAudit({ userId: manager.id, organizationId: manager.organizationId, role: 'broker' })).map(event => event.action)).toContain('agent.lifecycle-updated')
  })
  it('blocks cross-office, self and privilege elevation attempts before mutation', async () => {
    const auth = authMock([alAgent, flAgent, { ...alAgent, userId: manager.id, email: 'taquilla@example.test' }])
    await expect(updateAdminAgent(manager, flAgent.userId, { ...payload, officeId: 'fl', teamId: 'fl', market: 'Florida' }, repository())).rejects.toThrow(/scope/i)
    await expect(updateAdminAgent(manager, manager.id, payload, repository())).rejects.toThrow(/scope/i)
    await expect(updateAdminAgent(manager, alAgent.userId, { ...payload, role: 'broker_owner' }, repository())).rejects.toThrow(/authority/i)
    expect(auth.updateMember).not.toHaveBeenCalled()
  })
  it('allows owner session revocation, with an audit event', async () => {
    const auth = authMock([alAgent])
    const repo = repository()
    expect(await revokeAdminAgentSessions(owner, alAgent.userId, repo)).toEqual({ revoked: 2 })
    expect(auth.revokeUserSessions).toHaveBeenCalledWith(owner, alAgent.userId)
    expect((await repo.listAudit({ userId: owner.id, organizationId: owner.organizationId, role: 'owner' })).map(event => event.action)).toContain('agent.sessions-revoked')
  })
})
