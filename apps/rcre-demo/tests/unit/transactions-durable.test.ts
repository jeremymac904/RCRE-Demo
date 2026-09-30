import { beforeEach, expect, it } from 'vitest'
import { emptySeed, MemoryRepository, type Actor } from '@/lib/db/repository'
import { DurableTransactionService } from '@/lib/services/transactions-durable'

const org = '11111111-1111-4111-8111-111111111111'
const ownerId = '22222222-2222-4222-8222-222222222222'
const otherId = '33333333-3333-4333-8333-333333333333'
const actor: Actor & { teamId: string } = { userId: ownerId, organizationId: org, role: 'agent', teamId: 'team-a' }
const outsider: Actor = { userId: otherId, organizationId: org, role: 'agent' }
let repo: MemoryRepository
let service: DurableTransactionService

beforeEach(() => { repo = new MemoryRepository(emptySeed()); service = new DurableTransactionService({ repository: repo }) })

it('persists transaction, checklist, dates, note, version history and audit through the shared repository', async () => {
  const created = await service.create(actor, { address: '100 Example Way', client: 'Demo Client', closingDate: '2026-10-15' })
  expect((await service.get(actor, created.id)).closingDate).toBe('2026-10-15')
  const changed = await service.update(actor, created.id, 1, { checklist: [{ id: 'inspection', label: 'Inspection', done: false }] })
  expect(changed.version).toBe(2)
  expect((await service.addNote(actor, created.id, 'Confirm earnest money receipt')).body).toBe('Confirm earnest money receipt')
  expect(changed.history?.map(row => row.previousVersion)).toEqual([1])
  expect((await repo.listAudit({ ...actor, role: 'owner' })).map(row => row.action)).toContain('transaction.updated')
})

it('enforces tenant/owner visibility and optimistic concurrency', async () => {
  const created = await service.create(actor, { address: '200 Example Way', client: 'Demo Client' })
  await expect(service.get(outsider, created.id)).rejects.toThrow(/denied/i)
  await expect(service.update(actor, created.id, 0, { address: 'Different' })).rejects.toThrow(/Conflict/i)
})

it('rejects invalid dates and never records a signature as complete', async () => {
  const created = await service.create(actor, { address: '300 Example Way', client: 'Demo Client' })
  await expect(service.create(actor, { address: 'Bad date', client: 'Demo Client', closingDate: '2026-02-30' })).rejects.toThrow(/valid calendar date/i)
  await expect(service.update(actor, created.id, 1, { status: 'pending_signature' })).rejects.toThrow(/approved provider verifies completion/i)
  expect((await service.get(actor, created.id)).status).toBe('active')
})

it('lets an assigned transaction coordinator update coordination fields but never assign themselves or widen CRM scope', async () => {
  const created = await service.create(actor, { address: '400 Example Way', client: 'Demo Client' })
  const broker: Actor = { userId: '44444444-4444-4444-8444-444444444444', organizationId: org, role: 'owner' }
  const assigned = await repo.putTransactionDomainRecord(broker, {
    collection: 'transactions', recordId: created.id, ownerUserId: ownerId,
    data: { ...created, version: 2, tcId: otherId }, expectedVersion: 1,
  })
  const coordinator = new DurableTransactionService({ repository: repo })
  const asTc: Actor = { userId: otherId, organizationId: org, role: 'transaction_coordinator' }
  const changed = await coordinator.update(asTc, created.id, assigned.version, { checklist: [{ id: 'title', label: 'Title', done: true }] })
  expect(changed.checklist[0].done).toBe(true)
  await expect(repo.putDomainRecord(asTc, { collection: 'transactions', recordId: created.id, ownerUserId: otherId, data: { ...changed, ownerId: otherId, tcId: otherId } })).rejects.toThrow(/participant-checked transaction write API/i)
  await expect(repo.putTransactionDomainRecord(asTc, { collection: 'transactions', recordId: created.id, ownerUserId: ownerId, data: { ...changed, tcId: otherId, ownerId: otherId }, expectedVersion: changed.version })).rejects.toThrow(/brokerage administrators|owner and repository owner/i)
  expect((await repo.listPeople(asTc))).toEqual([])
})
