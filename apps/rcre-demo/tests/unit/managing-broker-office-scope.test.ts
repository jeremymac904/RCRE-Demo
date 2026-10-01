import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository, PermissionDeniedError, canSeeRecruiting, canSeeWholeBrokerage, type Actor } from '@/lib/db/repository'

const org = '10000000-0000-4000-8000-000000000001'
const managerId = '20000000-0000-4000-8000-000000000001'
const agentA = '20000000-0000-4000-8000-000000000002'
const tcA = '20000000-0000-4000-8000-000000000003'
const agentB = '20000000-0000-4000-8000-000000000004'
const manager: Actor = { organizationId: org, userId: managerId, role: 'managing_broker' }
const repoRoot = join(process.cwd(), 'supabase', 'migrations')

function user(id: string, role: 'managing_broker' | 'agent' | 'transaction_coordinator', officeId: string) {
  return { id, organizationId: org, email: `${id}@example.test`, fullName: id, role, fubUserId: null, isActive: true, officeId }
}

function seedWithOffices() {
  const seed = emptySeed()
  seed.users.push(user(managerId, 'managing_broker', 'office-a'), user(agentA, 'agent', 'office-a'), user(tcA, 'transaction_coordinator', 'office-a'), user(agentB, 'agent', 'office-b'))
  return seed
}

describe('Managing Broker office authorization', () => {
  it('limits user and people reads to the canonical office while Broker Owner remains brokerage-wide', async () => {
    const seed = seedWithOffices()
    seed.people.push(
      { id: '30000000-0000-4000-8000-000000000001', organizationId: org, fubPersonId: 1, firstName: 'Office', lastName: 'A', emails: [], phones: [], stage: 'Lead', source: null, assignedUserId: agentA, assignedFubUserId: null, tags: [], price: null, firstReceivedAt: null, firstAssignedAt: null, firstTouchAt: null, lastTouchAt: null, lastInboundAt: null, lastOutboundAt: null, isBuyer: null, isSeller: null, budgetMin: null, budgetMax: null, birthday: null, deletedInFub: false },
      { id: '30000000-0000-4000-8000-000000000002', organizationId: org, fubPersonId: 2, firstName: 'Office', lastName: 'B', emails: [], phones: [], stage: 'Lead', source: null, assignedUserId: agentB, assignedFubUserId: null, tags: [], price: null, firstReceivedAt: null, firstAssignedAt: null, firstTouchAt: null, lastTouchAt: null, lastInboundAt: null, lastOutboundAt: null, isBuyer: null, isSeller: null, budgetMin: null, budgetMax: null, birthday: null, deletedInFub: false },
    )
    const repository = new MemoryRepository(seed)
    expect((await repository.listUsers(manager)).map(row => row.id).sort()).toEqual([managerId, agentA, tcA].sort())
    expect((await repository.listPeople(manager)).map(row => row.id)).toEqual(['30000000-0000-4000-8000-000000000001'])
    expect(await repository.getUser(manager, agentB)).toBeNull()
    expect(canSeeWholeBrokerage('managing_broker')).toBe(false)
    expect(canSeeWholeBrokerage('owner')).toBe(true)
  })

  it('does not trust a caller-supplied office or grant office-less managers expanded reads', async () => {
    const seed = seedWithOffices()
    const repository = new MemoryRepository(seed)
    const spoofed: Actor = { ...manager, officeId: 'office-b' }
    expect((await repository.listUsers(spoofed)).map(row => row.id)).toEqual([managerId])
    expect((await repository.listUsers({ ...manager, officeId: undefined })).map(row => row.id).sort()).toEqual([managerId, agentA, tcA].sort())
  })

  it('allows office-owned domain writes but blocks cross-office writes and takeovers', async () => {
    const repository = new MemoryRepository(seedWithOffices())
    await repository.putDomainRecord(manager, { collection: 'agent_preferences', recordId: 'own', ownerUserId: agentA, data: { enabled: true } })
    await expect(repository.putDomainRecord(manager, { collection: 'agent_preferences', recordId: 'other', ownerUserId: agentB, data: { enabled: true } })).rejects.toBeInstanceOf(PermissionDeniedError)
    const owner: Actor = { organizationId: org, userId: agentB, role: 'agent' }
    await repository.putDomainRecord(owner, { collection: 'agent_preferences', recordId: 'private', ownerUserId: agentB, data: { secret: true } })
    await expect(repository.putDomainRecord(manager, { collection: 'agent_preferences', recordId: 'private', ownerUserId: agentA, data: { secret: false } })).rejects.toBeInstanceOf(PermissionDeniedError)
    await expect(repository.putDomainRecord(manager, { collection: 'shared', recordId: 'shared', data: { text: 'global write' } })).rejects.toBeInstanceOf(PermissionDeniedError)
  })

  it('permits a Managing Broker to administer an office transaction and rejects cross-office participant assignment', async () => {
    const repository = new MemoryRepository(seedWithOffices())
    const transaction = { organizationId: org, ownerId: agentA, tcId: '', teamId: '', officeId: 'office-a', property: 'fixture' }
    await repository.putTransactionDomainRecord(manager, { collection: 'transactions', recordId: 'tx-1', ownerUserId: agentA, data: transaction, createOnly: true })
    await repository.putTransactionDomainRecord(manager, { collection: 'transactions', recordId: 'tx-1', ownerUserId: agentA, data: { ...transaction, tcId: tcA }, expectedVersion: 1 })
    await expect(repository.putTransactionDomainRecord(manager, { collection: 'transactions', recordId: 'tx-1', ownerUserId: agentB, data: { ...transaction, ownerId: agentB }, expectedVersion: 2 })).rejects.toBeInstanceOf(PermissionDeniedError)
    await expect(repository.putTransactionDomainRecord(manager, { collection: 'transactions', recordId: 'tx-2', ownerUserId: agentB, data: { ...transaction, ownerId: agentB }, createOnly: true })).rejects.toBeInstanceOf(PermissionDeniedError)
  })

  it('scopes transaction children through their parent transaction, even when child JSON omits officeId', async () => {
    const repository = new MemoryRepository(seedWithOffices())
    const owner: Actor = { organizationId: org, userId: 'owner-account', role: 'owner' }
    const parent = (officeId: string, id: string, ownerId: string) => ({ organizationId: org, ownerId, tcId: '', teamId: '', officeId })
    await repository.putTransactionDomainRecord(owner, { collection: 'transactions', recordId: 'tx-office-a', ownerUserId: agentA, data: parent('office-a', 'tx-office-a', agentA), createOnly: true })
    await repository.putTransactionDomainRecord(owner, { collection: 'transactions', recordId: 'tx-office-b', ownerUserId: agentB, data: parent('office-b', 'tx-office-b', agentB), createOnly: true })
    const child = (transactionId: string, ownerId: string) => ({ organizationId: org, transactionId, ownerId, tcId: '', teamId: '', note: 'internal' })
    await repository.putTransactionDomainRecord(owner, { collection: 'transaction_notes', recordId: 'note-office-a', ownerUserId: null, data: child('tx-office-a', agentA), createOnly: true })
    await repository.putTransactionDomainRecord(owner, { collection: 'transaction_notes', recordId: 'note-office-b', ownerUserId: null, data: child('tx-office-b', agentB), createOnly: true })

    expect((await repository.listDomainRecords(manager, 'transaction_notes')).map(row => row.recordId)).toEqual(['note-office-a'])
  })

  it('does not broaden confidential recruiting prospect PII to Managing Brokers', () => {
    expect(canSeeRecruiting('managing_broker')).toBe(false)
    expect(canSeeRecruiting('broker')).toBe(true)
  })

  it('pins office-scoped SQL and management capabilities without widening broker-owner scope', () => {
    const role = readFileSync(join(repoRoot, '0017_managing_broker_role.sql'), 'utf8')
    const scope = readFileSync(join(repoRoot, '0018_managing_broker_office_scope.sql'), 'utf8')
    expect(role).toMatch(/add value if not exists 'managing_broker'/)
    expect(scope).toMatch(/rcre_current_role\(\)='managing_broker'[\s\S]*?u\.office_id=.*actor\.office_id/)
    expect(scope).toMatch(/rcre_is_broker\(\) or \(rcre_current_role\(\)='managing_broker'/)
    expect(scope).toMatch(/data->>'officeId' is distinct from office/)
    expect(scope).toMatch(/create or replace function rcre_managing_broker_transaction_in_office/)
    expect(scope).toMatch(/parent\.collection='transactions'[\s\S]*?parent\.data->>'officeId'=p_office_id/)
    expect(scope).toMatch(/owner_user_id is null and rcre_is_org_member\(\) and collection not like 'transaction%'/)
    expect(scope).toMatch(/owner_user_id in \(select rcre_scoped_user_ids\(\)\) and \(rcre_current_role\(\)<>'managing_broker' or collection not like 'transaction%'\)/)
    expect(scope).toMatch(/rcre_domain_records_update[\s\S]*?rcre_managing_broker_transaction_in_office\(organization_id,collection,data/)
    expect(scope).toMatch(/with check[\s\S]*?rcre_managing_broker_transaction_in_office\(organization_id,collection,data/)
    expect(scope).toMatch(/community_comments','community_reactions'[\s\S]*?rcre_community_post_is_published\(data->>'postId'\)/)
    expect(scope).toMatch(/collection='community_moderation'[\s\S]*?rcre_community_post_is_published\(data->>'postId'\)/)
    expect(scope).toMatch(/rcre_current_role\(\)='managing_broker'[\s\S]*?academy_courses','academy_lessons','academy_config','academy_policies','academy_assignments','community_posts'[\s\S]*?collection<>'academy_assignments' or data->>'officeId'=/)
    expect(scope).toMatch(/rcre_current_role\(\)='marketing_admin' and collection in \('marketing_campaigns','marketing_batches','marketing_schedule'\)/)
    expect(scope).toMatch(/rcre_guard_marketing_admin_owner[\s\S]*?new\.owner_user_id is distinct from old\.owner_user_id/)
    expect(scope).toMatch(/new.data->>'transactionId' is distinct from old.data->>'transactionId'/)
    expect(scope).toMatch(/rcre_current_role\(\)='marketing_admin' and collection in \('marketing_campaigns','marketing_batches','marketing_schedule'\)/)
    expect(scope).toMatch(/rcre_guard_marketing_admin_owner[\s\S]*?new\.owner_user_id is distinct from old\.owner_user_id/)
    expect(scope).toMatch(/actor_role in \('broker','managing_broker'\)/)
    expect(scope).toMatch(/p_platform_role not in \('agent','team_leader','transaction_coordinator'\)/)
    expect(scope).toMatch(/when 'managing_broker' then 'managing_broker'::rcre_user_role/)
    expect(scope).not.toMatch(/rcre_current_role\(\) in \([^)]*'managing_broker'[^)]*\)[\s\S]{0,200}recruiting_prospects/)
  })
})
