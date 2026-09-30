import { describe, expect, it } from 'vitest'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'

describe('production repository role mapping', () => {
  it.each([
    ['transaction_coordinator', 'transaction_coordinator'],
    ['marketing_admin', 'marketing_admin'],
    ['trainer', 'trainer'],
    ['broker_owner', 'owner'],
    ['managing_broker', 'broker'],
  ] as const)('preserves the %s platform boundary', (platformRole, repositoryRole) => {
    expect(repositoryRoleForPlatform(platformRole)).toBe(repositoryRole)
  })

  it('does not give a Transaction Coordinator organization-wide contact visibility', async () => {
    const org = '10000000-0000-4000-8000-000000000001'
    const own = '20000000-0000-4000-8000-000000000001'
    const other = '20000000-0000-4000-8000-000000000002'
    const seed = emptySeed()
    seed.people.push(
      { id: '30000000-0000-4000-8000-000000000001', organizationId: org, fubPersonId: 1, firstName: 'Own', lastName: 'Lead', emails: [], phones: [], stage: null, source: null, assignedUserId: own, assignedFubUserId: null, tags: [], price: null, firstReceivedAt: null, firstAssignedAt: null, firstTouchAt: null, lastTouchAt: null, lastInboundAt: null, lastOutboundAt: null, isBuyer: null, isSeller: null, budgetMin: null, budgetMax: null, birthday: null, deletedInFub: false },
      { id: '30000000-0000-4000-8000-000000000002', organizationId: org, fubPersonId: 2, firstName: 'Broker', lastName: 'Lead', emails: [], phones: [], stage: null, source: null, assignedUserId: other, assignedFubUserId: null, tags: [], price: null, firstReceivedAt: null, firstAssignedAt: null, firstTouchAt: null, lastTouchAt: null, lastInboundAt: null, lastOutboundAt: null, isBuyer: null, isSeller: null, budgetMin: null, budgetMax: null, birthday: null, deletedInFub: false },
    )
    const repo = new MemoryRepository(seed)
    expect((await repo.listPeople({ organizationId: org, userId: own, role: repositoryRoleForPlatform('transaction_coordinator') })).map(person => person.id)).toEqual(['30000000-0000-4000-8000-000000000001'])
  })
})
