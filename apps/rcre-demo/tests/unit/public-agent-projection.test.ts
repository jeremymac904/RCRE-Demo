import { describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'

const org = '22222222-2222-4222-8222-222222222222'
const broker = '11111111-1111-4111-8111-111111111111'
const active = '33333333-3333-4333-8333-333333333333'
const hidden = '44444444-4444-4444-8444-444444444444'
const inactive = '55555555-5555-4555-8555-555555555555'
const otherOrg = '66666666-6666-4666-8666-666666666666'

describe('public agent lifecycle projection', () => {
  it('projects only active, explicitly public canonical profiles in the requested organization', async () => {
    const seed = emptySeed()
    seed.users.push(
      { id: broker, organizationId: org, email: 'broker@example.test', fullName: 'Broker', role: 'broker', fubUserId: null, isActive: true },
      { id: active, organizationId: org, email: 'active@example.test', fullName: 'Active', role: 'agent', fubUserId: null, isActive: true },
      { id: hidden, organizationId: org, email: 'hidden@example.test', fullName: 'Hidden', role: 'agent', fubUserId: null, isActive: true },
      { id: inactive, organizationId: org, email: 'inactive@example.test', fullName: 'Inactive', role: 'agent', fubUserId: null, isActive: false },
      { id: otherOrg, organizationId: '77777777-7777-4777-8777-777777777777', email: 'other@example.test', fullName: 'Other', role: 'agent', fubUserId: null, isActive: true },
    )
    const repository = new MemoryRepository(seed)
    const actor = { userId: broker, organizationId: org, role: 'broker' as const }
    for (const [id, publicVisible, slug] of [[active, true, 'sarah-brockner'], [hidden, false, 'johann-velez'], [inactive, true, 'vito-lombardo'], [otherOrg, true, 'taquilla-allen']] as const) {
      await repository.putDomainRecord(actor, { collection: 'member_profiles', recordId: id, ownerUserId: id, createOnly: true, data: { verifiedPersonId: slug, publicVisible, phone: '555-0100' } })
    }
    const projection = await repository.listPublicAgentProfiles(org)
    expect(projection.map(profile => profile.verifiedPersonId)).toEqual(['sarah-brockner'])
    expect(projection[0]?.profile).toMatchObject({ verifiedPersonId: 'sarah-brockner', phone: '555-0100' })
  })
})
