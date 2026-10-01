import { expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { DurableTransactionExceptionService } from '@/lib/services/transaction-exceptions'
import { DurableTransactionService } from '@/lib/services/transactions-durable'
import type { PlatformActor } from '@/lib/platform/auth'

const organizationId = '11111111-1111-4111-8111-111111111111'
const ownerId = '22222222-2222-4222-8222-222222222222'
const actor: PlatformActor = {
  id: ownerId, userId: ownerId, organizationId, role: 'broker_owner', name: 'Broker Owner',
  market: 'Florida', officeId: 'fl', teamId: 'fl',
}

it('persists transaction exception resolutions and audit in the durable transaction repository', async () => {
  const repository = new MemoryRepository(emptySeed())
  const transactions = new DurableTransactionService({ repository })
  const transaction = await transactions.create(actor, { address: '100 Example Way', client: 'Synthetic Client' })
  await transactions.update(actor, transaction.id, 1, {
    deadlines: [{
      id: 'inspection', label: 'Inspection', sourceTerm: 'Inspection within 1 day', effectiveDate: '2020-01-01',
      days: 1, convention: 'calendar', timezone: 'America/New_York', holidays: [], confirmed: true,
    }],
  })
  const service = new DurableTransactionExceptionService({ repository, transactions })
  const exception = (await service.list(actor, new Date('2020-01-10T12:00:00.000Z'))).find(item => item.type === 'deadline_breach')!
  expect(exception).toBeDefined()
  const saved = await service.resolve(actor, exception.id, 'Reviewed and recorded the next step.')
  expect(saved).toMatchObject({ id: exception.id, transactionId: transaction.id, actorId: ownerId })
  expect((await service.list(actor, new Date('2020-01-10T12:00:00.000Z'))).find(item => item.id === exception.id)).toMatchObject({
    resolved: true, resolvedBy: actor.name, resolution: 'Reviewed and recorded the next step.',
  })
  await expect(service.resolve(actor, exception.id, 'Duplicate')).rejects.toThrow(/already resolved/i)
  const audit = await repository.listAudit({ userId: ownerId, organizationId, role: 'owner' })
  expect(audit.map(row => row.action)).toContain('transaction.exception-resolved')
})

it('does not allow an agent to read or resolve broker transaction exceptions', async () => {
  const repository = new MemoryRepository(emptySeed())
  const service = new DurableTransactionExceptionService({ repository })
  const agent: PlatformActor = { ...actor, id: '33333333-3333-4333-8333-333333333333', userId: '33333333-3333-4333-8333-333333333333', role: 'agent' }
  await expect(service.list(agent)).rejects.toThrow(/Broker access denied/i)
  await expect(service.resolve(agent, 'exception-id', 'Review')).rejects.toThrow(/Broker access denied/i)
})
