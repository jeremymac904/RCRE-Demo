import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRepository, emptySeed } from '../../src/lib/db/repository'
import { configureAuthPersistenceForTests, type AuthPersistence, type MemberSummary } from '../../src/lib/auth/persistence'
import type { PlatformActor } from '../../src/lib/platform/auth'
import { listAdminAgents, listCanonicalPersonChoices, revokeAdminAgentSessions, updateAdminAgent } from '../../src/lib/platform/agent-admin'
const owner: PlatformActor = { id: 'owner-1', userId: 'owner-1', organizationId: 'org-1', name: 'Julio', role: 'broker_owner', officeId: 'all', teamId: 'all', market: 'Both markets' }
const manager: PlatformActor = { id: 'manager-1', userId: 'manager-1', organizationId: 'org-1', name: 'Taquilla', role: 'managing_broker', officeId: 'al', teamId: 'al', market: 'Alabama' }
const floridaManager: PlatformActor = { id: 'manager-fl', userId: 'manager-fl', organizationId: 'org-1', name: 'Florida Manager', role: 'managing_broker', officeId: 'fl', teamId: 'fl', market: 'Florida' }
const alAgent: MemberSummary = { userId: 'agent-al', organizationId: 'org-1', canonicalPersonId: null, email: 'agent@example.test', name: 'AL Agent', platformRole: 'agent', active: true, accountStatus: 'active', officeId: 'al', teamId: 'al', market: 'Alabama', lastLoginAt: null }
const flAgent: MemberSummary = { ...alAgent, userId: 'agent-fl', email: 'fl@example.test', officeId: 'fl', teamId: 'fl', market: 'Florida' }
function authMock(members: MemberSummary[]) {
  const mock = { listMembers: vi.fn(async () => members), updateMember: vi.fn(async () => true), revokeUserSessions: vi.fn(async () => 2) }
  configureAuthPersistenceForTests(mock as unknown as AuthPersistence)
  return mock
}
function repository() {
  const seed = emptySeed()
  seed.users.push(
    { id: manager.id, organizationId: manager.organizationId, email: 'manager@example.test', fullName: 'Taquilla Allen', role: 'managing_broker', fubUserId: null, isActive: true, officeId: 'al' },
    { id: alAgent.userId, organizationId: alAgent.organizationId, email: alAgent.email, fullName: alAgent.name, role: 'agent', fubUserId: null, isActive: true, officeId: 'al' },
    { id: flAgent.userId, organizationId: flAgent.organizationId, email: flAgent.email, fullName: flAgent.name, role: 'agent', fubUserId: null, isActive: true, officeId: 'fl' },
    { id: owner.id, organizationId: owner.organizationId, email: 'owner@example.test', fullName: 'Julio Arango', role: 'owner', fubUserId: null, isActive: true, officeId: 'all' },
    { id: floridaManager.id, organizationId: floridaManager.organizationId, email: 'manager-fl@example.test', fullName: floridaManager.name, role: 'managing_broker', fubUserId: null, isActive: true, officeId: 'fl' },
  )
  return new MemoryRepository(seed)
}
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
  it('lets brokerage leadership link an invited membership only to an existing verified canonical person', async () => {
    const auth = authMock([flAgent])
    const repo = repository()
    const change = { ...payload, officeId: 'fl', teamId: 'fl', market: 'Florida', licenses: [{ state: 'Florida' as const, number: 'SL123' }], markets: ['Jacksonville, Florida'], canonicalPersonId: 'sarah-brockner' }
    const result = await updateAdminAgent(owner, flAgent.userId, change, repo)
    expect(result.updated).toBe(true)
    const profile = await repo.getDomainRecord<any>({ userId: owner.id, organizationId: owner.organizationId, role: 'owner' }, 'member_profiles', flAgent.userId)
    expect(profile?.data.verifiedPersonId).toBe('sarah-brockner')
    expect((await listAdminAgents(owner, repo)).find(agent => agent.userId === flAgent.userId)?.canonicalPersonId).toBe('sarah-brockner')
    expect(auth.updateMember).toHaveBeenCalledOnce()
  })

  it('rejects identity claims outside the verified roster and duplicate canonical links', async () => {
    const invalidAuth = authMock([flAgent])
    await expect(updateAdminAgent(owner, flAgent.userId, { ...payload, officeId: 'fl', teamId: 'fl', market: 'Florida', canonicalPersonId: 'unknown-person-slug' }, repository())).rejects.toThrow(/verified RCRE roster/i)
    expect(invalidAuth.updateMember).not.toHaveBeenCalled()
    const alreadyLinked = { ...alAgent, canonicalPersonId: 'sarah-brockner' }
    const duplicateAuth = authMock([flAgent, alreadyLinked])
    await expect(updateAdminAgent(owner, flAgent.userId, { ...payload, officeId: 'fl', teamId: 'fl', market: 'Florida', canonicalPersonId: 'sarah-brockner' }, repository())).rejects.toThrow(/already linked/i)
    expect(duplicateAuth.updateMember).not.toHaveBeenCalled()
  })

  it('offers only verified roster choices within the managing broker state and marks existing links', async () => {
    authMock([alAgent, { ...flAgent, canonicalPersonId: 'sarah-brockner' }])
    const choices = await listCanonicalPersonChoices(manager)
    expect(choices.every(person => /Alabama/i.test(person.market) && !/Florida/i.test(person.market))).toBe(true)
    expect(choices.find(person => person.id === 'sarah-brockner')).toBeUndefined()
    const ownerChoices = await listCanonicalPersonChoices(owner)
    expect(ownerChoices.find(person => person.id === 'sarah-brockner')).toMatchObject({ assignedToUserId: flAgent.userId, assignedToName: flAgent.name })
  })

  it('limits managing brokers to canonical people in their verified state', async () => {
    const auth = authMock([alAgent])
    await expect(updateAdminAgent(manager, alAgent.userId, { ...payload, canonicalPersonId: 'sarah-brockner' }, repository())).rejects.toThrow(/outside your managing broker authority/i)
    expect(auth.updateMember).not.toHaveBeenCalled()
  })

  it('persists role, licensing and profile changes, audits, and revokes sessions on deactivation', async () => {
    const auth = authMock([alAgent])
    const repo = repository()
    const result = await updateAdminAgent(manager, alAgent.userId, payload, repo)
    expect(result).toEqual({ updated: true, sessionsRevoked: true, revokedSessions: 2 })
    expect(auth.updateMember).toHaveBeenCalledWith(manager, alAgent.userId, expect.objectContaining({ active: false, role: 'agent', officeId: 'al' }))
    const profile = await repo.getDomainRecord<any>({ userId: manager.id, organizationId: manager.organizationId, role: 'managing_broker', officeId: 'al' }, 'member_profiles', alAgent.userId)
    expect(profile?.data.licenses).toEqual([{ state: 'Alabama', number: 'AL123' }])
    expect(profile?.data.biography).toBe('Verified bio')
    expect((await repo.listAudit({ userId: manager.id, organizationId: manager.organizationId, role: 'managing_broker', officeId: 'al' })).map(event => event.action)).toContain('agent.lifecycle-updated')
  })
  it('blocks cross-office, self and privilege elevation attempts before mutation', async () => {
    const auth = authMock([alAgent, flAgent, { ...alAgent, userId: manager.id, email: 'taquilla@example.test' }])
    await expect(updateAdminAgent(manager, flAgent.userId, { ...payload, officeId: 'fl', teamId: 'fl', market: 'Florida' }, repository())).rejects.toThrow(/scope/i)
    await expect(updateAdminAgent(manager, manager.id, payload, repository())).rejects.toThrow(/scope/i)
    await expect(updateAdminAgent(manager, alAgent.userId, { ...payload, role: 'broker_owner' }, repository())).rejects.toThrow(/authority/i)
    expect(auth.updateMember).not.toHaveBeenCalled()
  })
  it('prevents self role or account changes before mutating member or profile state', async () => {
    const auth = authMock([{ ...alAgent, userId: owner.id, platformRole: 'broker_owner', officeId: 'all', market: 'Both markets' }])
    const repo = repository()
    await expect(updateAdminAgent(owner, owner.id, { ...payload, role: 'agent', active: false }, repo)).rejects.toThrow(/own brokerage role/i)
    expect(auth.updateMember).not.toHaveBeenCalled()
    expect(await repo.getDomainRecord({ userId: owner.id, organizationId: owner.organizationId, role: 'owner' }, 'member_profiles', owner.id)).toBeNull()
  })

  it('fails closed when a managing broker state conflicts with the assigned office', async () => {
    const auth = authMock([alAgent])
    const inconsistentManager = { ...manager, market: 'Florida' }
    await expect(updateAdminAgent(inconsistentManager, alAgent.userId, payload, repository())).rejects.toThrow(/authority/i)
    expect(auth.updateMember).not.toHaveBeenCalled()
  })

  it('does not allow an Alabama managing broker to assign cross-state markets', async () => {
    const auth = authMock([alAgent])
    await expect(updateAdminAgent(manager, alAgent.userId, { ...payload, market: 'Alabama and Florida', markets: ['Birmingham, Alabama', 'Jacksonville, Florida'] }, repository())).rejects.toThrow(/authority/i)
    expect(auth.updateMember).not.toHaveBeenCalled()
  })

  it('applies the same state boundary to Florida managing brokers without hard-coded Alabama assumptions', async () => {
    const auth = authMock([flAgent])
    const flPayload = { ...payload, officeId: 'fl', teamId: 'fl', market: 'Florida', markets: ['Jacksonville, Florida'], licenses: [{ state: 'Florida' as const, number: 'SL0001' }] }
    const result = await updateAdminAgent(floridaManager, flAgent.userId, flPayload, repository())
    expect(result.updated).toBe(true)
    expect(auth.updateMember).toHaveBeenCalledWith(floridaManager, flAgent.userId, expect.objectContaining({ officeId: 'fl', market: 'Florida' }))
  })

  it('allows owner session revocation, with an audit event', async () => {
    const auth = authMock([alAgent])
    const repo = repository()
    expect(await revokeAdminAgentSessions(owner, alAgent.userId, repo)).toEqual({ revoked: 2 })
    expect(auth.revokeUserSessions).toHaveBeenCalledWith(owner, alAgent.userId)
    expect((await repo.listAudit({ userId: owner.id, organizationId: owner.organizationId, role: 'owner' })).map(event => event.action)).toContain('agent.sessions-revoked')
  })
})
