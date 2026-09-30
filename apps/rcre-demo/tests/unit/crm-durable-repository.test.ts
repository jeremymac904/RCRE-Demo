import { describe, expect, it } from 'vitest'
import { DomainRecordConflictError, emptySeed, MemoryRepository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { createContactDurable, listContactsPage } from '@/lib/platform/service'
import { persistIntakeDurable, IntakeError } from '@/lib/public/intake'

const org = '10000000-0000-4000-8000-000000000001'
const agentId = '20000000-0000-4000-8000-000000000001'
const brokerId = '20000000-0000-4000-8000-000000000002'
const agent: PlatformActor = { id: agentId, userId: agentId, organizationId: org, role: 'agent', name: 'Agent', market: 'Florida', teamId: 'fl', officeId: 'fl' }
const seed = () => {
  const value = emptySeed()
  value.organizations.push({ id: org, name: 'RCRE', slug: 'rcre' })
  value.users.push({ id: agentId, organizationId: org, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true })
  value.users.push({ id: brokerId, organizationId: org, email: 'broker@example.test', fullName: 'Broker', role: 'broker', fubUserId: null, isActive: true })
  value.users.push({ id: '20000000-0000-4000-8000-000000000003', organizationId: org, email: 'molly@rcregroup.com', fullName: 'Molly Plude', role: 'agent', fubUserId: null, isActive: true })
  return value
}
const contact = (id: string, receivedAt: string, source: string, stage: string) => ({
  id, organizationId: org, officeId: 'fl', ownerId: agentId, version: 1, firstName: id, lastName: 'Person',
  initials: id.slice(0, 2), stage, source, email: `${id}@example.test`, phone: '', location: 'Florida', receivedAt,
  stageEnteredAt: receivedAt, firstTouchAt: null, lastTouchAt: null, lastInboundAt: null, lastOutboundAt: null,
  timeline: [], priority: null, reasons: [], tags: [], consent: false,
})

describe('durable CRM repository contract', () => {
  it('filters, sorts, counts, and pages only actor-visible contacts', async () => {
    const repository = new MemoryRepository(seed())
    const repoAgent = { userId: agentId, organizationId: org, role: 'agent' as const }
    await repository.putDomainRecord(repoAgent, { collection: 'crm_contacts', recordId: 'old', ownerUserId: agentId, data: contact('old', '2026-01-01T00:00:00.000Z', 'Referral', 'New Lead') })
    await repository.putDomainRecord(repoAgent, { collection: 'crm_contacts', recordId: 'new', ownerUserId: agentId, data: contact('new', '2026-02-01T00:00:00.000Z', 'Website', 'Connected') })
    const page = await listContactsPage(agent, { query: 'example.test', source: 'Referral', page: 1, pageSize: 1 }, repository)
    expect(page).toMatchObject({ total: 1, page: 1, pageSize: 1, pageCount: 1 })
    expect(page.rows.map(row => row.id)).toEqual(['old'])
  })

  it('applies atomic domain writes together and rolls back when an idempotency key already exists', async () => {
    const repository = new MemoryRepository(seed())
    const actor = { userId: brokerId, organizationId: org, role: 'broker' as const }
    await repository.putDomainRecord(actor, { collection: 'idempotency', recordId: 'claimed', ownerUserId: agentId, data: { hash: 'same' } })
    await expect(repository.putDomainRecordsAtomic(actor, [
      { collection: 'contacts', recordId: 'contact-1', ownerUserId: agentId, data: { name: 'Client' } },
      { collection: 'idempotency', recordId: 'claimed', ownerUserId: agentId, data: { hash: 'same' }, createOnly: true },
    ])).rejects.toBeInstanceOf(DomainRecordConflictError)
    expect(await repository.getDomainRecord(actor, 'contacts', 'contact-1')).toBeNull()
    const saved = await repository.putDomainRecordsAtomic(actor, [
      { collection: 'contacts', recordId: 'contact-1', ownerUserId: agentId, data: { name: 'Client' } },
      { collection: 'idempotency', recordId: 'fresh', ownerUserId: agentId, data: { hash: 'fresh' }, createOnly: true },
    ])
    expect(saved).toHaveLength(2)
    expect(await repository.getDomainRecord(actor, 'contacts', 'contact-1')).toMatchObject({ data: { name: 'Client' } })
  })

  it('persists an assigned CRM lead into the tenant/owner scoped repository', async () => {
    const repository = new MemoryRepository(seed())
    const created = await createContactDurable(agent, { firstName: 'River', lastName: 'Client', email: 'RIVER@example.test', source: 'Instagram', consent: true }, repository)
    expect(created).toMatchObject({ organizationId: org, ownerId: agentId, officeId: 'fl', source: 'Instagram', email: 'river@example.test', stage: 'New Lead', consent: true })
    expect(await repository.getDomainRecord({ userId: agentId, organizationId: org, role: 'agent' }, 'crm_contacts', created.id)).toMatchObject({ data: { email: 'river@example.test' }, ownerUserId: agentId })
  })
})


describe('durable public inquiry intake', () => {
  it('routes to the canonical active site owner, preserves attribution, queues notification, and is idempotent', async () => {
    const repository = new MemoryRepository(seed())
    const actor = { userId: brokerId, organizationId: org, role: 'broker' as const }
    const siteOwnerId = '20000000-0000-4000-8000-000000000003'
    await repository.putDomainRecord(actor, { collection: 'member_profiles', recordId: siteOwnerId, ownerUserId: siteOwnerId, data: { officeId: 'fl', market: 'Florida', role: 'agent', verifiedPersonId: 'molly-plude', websiteSlug: 'molly-homes', publicVisible: true } })
    await repository.putDomainRecord(actor, { collection: 'agent_websites', recordId: siteOwnerId, ownerUserId: siteOwnerId, data: { slug: 'molly-homes', published: true } })
    const input = { submissionId: 'a0a8b2a4-f352-49cf-b4c0-6ea4a71b9a00', kind: 'property', name: 'Demo Client', email: 'client@example.test', market: 'Florida', agentSlug: 'molly-homes', consent: true, listingId: 'listing-1', providerId: 'realmls', mlsListingId: '123', landingPage: '/homes/listing-1', utmSource: 'campaign', propertyAddress: '12 Main Street' }
    const [first, retry] = await Promise.all([
      persistIntakeDurable(input, repository, actor),
      persistIntakeDurable(input, repository, actor),
    ])
    expect(first).toMatchObject({ status: 'saved', persistence: 'postgres', duplicate: false })
    expect(retry).toMatchObject({ id: first.id, duplicate: true })
    const inquiry = await repository.getDomainRecord(actor, 'public_inquiries', first.id)
    expect(inquiry?.data).toMatchObject({ ownerId: siteOwnerId, agentWebsiteSlug: 'molly-homes', listingId: 'listing-1', providerId: 'realmls', utmSource: 'campaign' })
    expect(await repository.getDomainRecord(actor, 'notification_outbox', `website-lead:${first.id}`)).toMatchObject({ data: { status: 'queued', kind: 'website_lead' } })
    const altered = { ...input, message: 'different payload' }
    await expect(persistIntakeDurable(altered, repository, actor)).rejects.toBeInstanceOf(IntakeError)
  })

  it('fails closed for unknown agent website slugs instead of using brokerage fallback routing', async () => {
    const repository = new MemoryRepository(seed())
    const actor = { userId: brokerId, organizationId: org, role: 'broker' as const }
    await repository.putDomainRecord(actor, { collection: 'settings', recordId: 'leads', ownerUserId: null, data: { routing: { fl: agentId }, defaultOwnerId: agentId } })
    const input = { submissionId: 'b0a8b2a4-f352-49cf-b4c0-6ea4a71b9a00', kind: 'property', name: 'Demo Client', email: 'client@example.test', market: 'Florida', agentSlug: 'not-a-published-site', consent: true }
    await expect(persistIntakeDurable(input, repository, actor)).rejects.toMatchObject({ status: 503 })
  })
})
