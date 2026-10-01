import { describe, expect, it } from 'vitest'
import { MemoryRepository, emptySeed } from '@/lib/db/repository'
import { repositoryActor } from '@/lib/platform/onboarding'
import { PERSONAS } from '@/lib/platform/auth'
import { listAdminAgentProfilesDurable, saveAdminAgentProfileDurable } from '@/lib/platform/agent-profiles-durable'

const owner = PERSONAS.find(person => person.role === 'broker_owner')!
const ownerContext = repositoryActor(owner)

function seeded() {
  const seed = emptySeed()
  seed.users.push(
    { id: owner.id, organizationId: owner.organizationId, email: 'owner@example.test', fullName: owner.name, role: 'owner', fubUserId: null, isActive: true, officeId: 'all' },
    { id: 'u-sarah', organizationId: owner.organizationId, email: 'sarah@example.test', fullName: 'Sarah Brockner', role: 'agent', fubUserId: null, isActive: true, officeId: 'fl' },
  )
  return new MemoryRepository(seed)
}

const profile = (base: any, overrides: Record<string, unknown> = {}) => ({
  ...base, publicTitle: 'REALTOR®', phone: '(904) 555-0100', email: 'sarah@example.test', license: 'SL123456', market: 'Florida',
  bio: 'Verified profile biography.', specialties: ['Residential'], socialLinks: { instagram: '', facebook: '', linkedin: '' }, websiteTemplate: 'signature', publicVisible: true, version: 0, ...overrides,
})

describe('durable admin public agent profile', () => {
  it('reads and writes profile state through the repository and updates its linked canonical projection atomically', async () => {
    const repo = seeded()
    await repo.putDomainRecord(ownerContext, { collection: 'member_profiles', recordId: 'u-sarah', ownerUserId: 'u-sarah', data: { id: 'u-sarah', verifiedPersonId: 'sarah-brockner', publicVisible: true, phone: '', professionalTitle: '', licenses: [], markets: ['Florida'], specialties: [], biography: '', socialLinks: {}, websiteTemplate: 'signature', version: 0 } })
    await repo.putDomainRecord(ownerContext, { collection: 'canonical_people', recordId: 'sarah-brockner', ownerUserId: 'u-sarah', data: { id: 'sarah-brockner', slug: 'sarah-brockner', userId: 'u-sarah', organizationId: owner.organizationId, name: 'Sarah Brockner', email: 'sarah@example.test', status: 'active', publicVisible: true, licenses: [], markets: ['Florida'], specialties: [], biography: '' } })
    const listed = await listAdminAgentProfilesDurable(owner, repo)
    const current = listed.find(row => row.id === 'sarah-brockner')!
    const saved = await saveAdminAgentProfileDurable(owner, current.id, profile(current, { version: 0, phone: '(904) 555-0144', bio: 'Updated and persisted.', publicVisible: false }), repo)
    expect(saved.version).toBe(1)
    expect((await repo.getDomainRecord<any>(ownerContext, 'agent_profile_overlays', `${owner.organizationId}:sarah-brockner`))?.data).toMatchObject({ phone: '(904) 555-0144', publicVisible: false })
    expect((await repo.getDomainRecord<any>(ownerContext, 'member_profiles', 'u-sarah'))?.data).toMatchObject({ phone: '(904) 555-0144', biography: 'Updated and persisted.', publicVisible: false })
    expect((await repo.getDomainRecord<any>(ownerContext, 'canonical_people', 'sarah-brockner'))?.data).toMatchObject({ phone: '(904) 555-0144', biography: 'Updated and persisted.', publicVisible: false })
    expect(await repo.listAudit(ownerContext)).toHaveLength(1)
  })

  it('rejects stale versions and keeps managing broker scope limited to Alabama', async () => {
    const repo = seeded()
    const current = (await listAdminAgentProfilesDurable(owner, repo)).find(row => row.id === 'urban-garrett')!
    await saveAdminAgentProfileDurable(owner, current.id, profile(current), repo)
    await expect(saveAdminAgentProfileDurable(owner, current.id, profile(current), repo)).rejects.toThrow(/changed/i)
    const taquilla = PERSONAS.find(person => person.id === 'u-taquilla')!
    const rows = await listAdminAgentProfilesDurable(taquilla, repo)
    expect(rows.every(row => row.market.includes('Alabama'))).toBe(true)
    expect(rows.some(row => ['julio-arango', 'taquilla-allen'].includes(row.id))).toBe(false)
    const sarah = (await listAdminAgentProfilesDurable(owner, repo)).find(row => row.id === 'sarah-brockner')!
    await expect(saveAdminAgentProfileDurable(taquilla, 'sarah-brockner', profile(sarah, { market: 'Alabama' }), repo)).rejects.toThrow(/scope/i)
  })
})
