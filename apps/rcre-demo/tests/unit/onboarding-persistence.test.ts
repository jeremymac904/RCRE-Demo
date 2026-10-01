import { describe, it, expect } from 'vitest'
import { MemoryRepository, emptySeed } from '../../src/lib/db/repository'
import type { PlatformActor } from '../../src/lib/platform/auth'
import { loadOnboarding, saveOnboarding } from '../../src/lib/platform/onboarding'
const agent: PlatformActor = { id: 'agent-1', userId: 'agent-1', organizationId: 'org-1', name: 'Morgan Agent', role: 'agent', market: 'Florida', officeId: 'fl', teamId: 'fl' }
function repo() { const seed = emptySeed(); seed.users.push({ id: agent.id, organizationId: agent.organizationId, email: 'morgan@example.test', fullName: agent.name, role: 'agent', fubUserId: null, isActive: true }); return new MemoryRepository(seed) }
describe('durable onboarding profile progress', () => {
  it('persists profile and progress in the shared repository scoped to the authenticated user', async () => {
    const database = repo()
    const initial = await loadOnboarding(agent, database)
    expect(initial.profile.verifiedPersonId).toBeNull()
    const saved = await saveOnboarding(agent, { version: 0, phone: '(904) 555-0100', professionalTitle: 'REALTOR®', officeId: 'fl', licenses: [{ state: 'Florida', number: 'SL0000001' }], markets: ['Jacksonville'], specialties: ['First-time buyers'], biography: 'A short profile.', socialLinks: { instagram: '', facebook: '', linkedin: '' }, websiteTemplate: 'urban-modern', websiteSlug: 'agent-example', steps: { identityConfirmed: true, profileReviewed: true, licenseReviewed: true, marketsReviewed: true, websiteSelected: true } }, database)
    const loaded = await loadOnboarding(agent, database)
    expect(loaded.profile.version).toBe(saved.version)
    expect(saved.verifiedPersonId).toMatch(/^morgan-agent-[a-f0-9]{10}$/)
    const person = await database.getDomainRecord<any>({ userId: agent.id, organizationId: agent.organizationId, role: 'agent' }, 'canonical_people', saved.verifiedPersonId!)
    expect(person?.data).toMatchObject({ userId: agent.id, email: 'morgan@example.test', status: 'pending_review', publicVisible: false, name: agent.name, licenses: [{ state: 'Florida', number: 'SL0000001' }] })
    expect(loaded.profile.licenses).toEqual([{ state: 'Florida', number: 'SL0000001' }])
    expect(loaded.profile.officeId).toBe('fl')
    expect(loaded.profile.steps.websiteSelected).toBe(true)
    expect(loaded.displayName).toBe(agent.name)
    expect(loaded.photoUploaded).toBe(false)
    expect((await database.listAudit({ userId: agent.id, organizationId: agent.organizationId, role: 'broker' })).map(row => row.action)).toContain('onboarding.progress-saved')
  })
  it('rejects malformed profile data and stale writes', async () => {
    const database = repo()
    await expect(saveOnboarding(agent, { version: 0, licenses: [{ state: 'Florida', number: '' }] }, database)).rejects.toThrow()
    const version = (await loadOnboarding(agent, database)).profile.version
    await saveOnboarding(agent, { version, phone: '', licenses: [], markets: [], specialties: [], biography: '', socialLinks: { instagram: '', facebook: '', linkedin: '' }, websiteTemplate: 'signature', steps: {} }, database)
    await expect(saveOnboarding(agent, { version, phone: '', licenses: [], markets: [], specialties: [], biography: '', socialLinks: { instagram: '', facebook: '', linkedin: '' }, websiteTemplate: 'signature', steps: {} }, database)).rejects.toThrow(/changed/i)
  })
  it('derives office and canonical identity from trusted account data, not submitted profile fields', async () => {
    const database = repo()
    const saved = await saveOnboarding(agent, {
      officeId: 'al', verifiedPersonId: 'another-person', publicVisible: true,
      phone: '555-0100', professionalTitle: 'REALTOR®', licenses: [], markets: [], specialties: [],
      biography: '', socialLinks: {}, websiteTemplate: 'signature', steps: {},
    }, database)
    expect(saved.officeId).toBe('fl')
    expect(saved.verifiedPersonId).toMatch(/^morgan-agent-[a-f0-9]{10}$/)
    expect(saved.publicVisible).toBe(false)
    const person = await database.getDomainRecord<any>({ userId: agent.id, organizationId: agent.organizationId, role: 'agent' }, 'canonical_people', saved.verifiedPersonId!)
    expect(person?.data).toMatchObject({ status: 'pending_review', publicVisible: false })
  })

  it('rejects cross-user profile reads and writes at the repository boundary', async () => {
    const database = repo()
    const other = { ...agent, id: 'agent-2', userId: 'agent-2' }
    await saveOnboarding(other, { phone: '555', licenses: [], markets: [], specialties: [], biography: '', socialLinks: {}, websiteTemplate: 'signature', steps: {} }, database)
    expect((await loadOnboarding(agent, database)).profile.phone).toBe('')
  })
})
