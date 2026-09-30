import { describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { createContactDurable } from '@/lib/platform/service'
import {
  completeCrmTaskDurable, createCrmTaskDurable, listCrmTasksDurable, logCrmActivityDurable,
  reportCrmDurable, saveCrmAppointmentDurable, saveCrmDealDurable, saveCrmSavedViewDurable, updateCrmContactDurable,
} from '@/lib/platform/crm-durable'

const org = '10000000-0000-4000-8000-000000000001'
const agentId = '20000000-0000-4000-8000-000000000001'
const otherId = '20000000-0000-4000-8000-000000000002'
const brokerId = '20000000-0000-4000-8000-000000000003'
const agent: PlatformActor = { id: agentId, userId: agentId, organizationId: org, role: 'agent', name: 'Agent', market: 'Florida', teamId: 'fl', officeId: 'fl' }
const broker: PlatformActor = { id: brokerId, userId: brokerId, organizationId: org, role: 'broker_owner', name: 'Broker', market: 'All', teamId: 'all', officeId: 'all' }
function repository() {
  const seed = emptySeed()
  seed.organizations.push({ id: org, name: 'RCRE', slug: 'rcre' })
  seed.users.push(
    { id: agentId, organizationId: org, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true },
    { id: otherId, organizationId: org, email: 'other@example.test', fullName: 'Other', role: 'agent', fubUserId: null, isActive: true },
    { id: brokerId, organizationId: org, email: 'broker@example.test', fullName: 'Broker', role: 'owner', fubUserId: null, isActive: true },
  )
  return new MemoryRepository(seed)
}

describe('durable CRM workspace actions', () => {
  it('persists local tasks and prevents a user from completing imported source tasks', async () => {
    const repo = repository()
    const contact = await createContactDurable(agent, { firstName: 'River', lastName: 'Client' }, repo)
    const task = await createCrmTaskDurable(agent, { title: 'Call client', dueAt: '2026-10-01T14:00:00.000Z', contactId: contact.id }, repo)
    expect(task).toMatchObject({ contactId: contact.id, ownerId: agentId, sourceSystem: 'rcre', done: false, version: 1 })
    expect(await completeCrmTaskDurable(agent, task.id, 1, true, repo)).toMatchObject({ done: true, version: 2 })
    expect((await listCrmTasksDurable(agent, repo))).toHaveLength(1)

    const sourceTask = { ...task, id: 'fub-task-1', sourceSystem: 'fub', done: false }
    await repo.putDomainRecord({ userId: agentId, organizationId: org, role: 'agent' }, { collection: 'crm_tasks', recordId: sourceTask.id, ownerUserId: agentId, data: sourceTask })
    await expect(completeCrmTaskDurable(agent, sourceTask.id, 1, true, repo)).rejects.toMatchObject({ status: 403 })
    expect(await repo.getDomainRecord({ userId: agentId, organizationId: org, role: 'agent' }, 'crm_tasks', sourceTask.id)).toMatchObject({ data: { done: false } })
  })

  it('persists notes and call evidence as RCRE events with stable IDs and atomically updates contact context', async () => {
    const repo = repository()
    const contact = await createContactDurable(agent, { firstName: 'River', lastName: 'Client' }, repo)
    const updated = await logCrmActivityDurable(agent, contact.id, { kind: 'call', label: 'Discussed next steps', connected: true }, repo)
    const savedContact = updated as any
    expect(savedContact.timeline.at(-1)).toMatchObject({ kind: 'call', direction: 'outbound', sourceSystem: 'rcre' })
    const activityId = savedContact.timeline.at(-1).sourceId
    expect(await repo.getDomainRecord({ userId: agentId, organizationId: org, role: 'agent' }, 'crm_activities', String(activityId))).toMatchObject({ data: { contactId: contact.id, label: 'Connected conversation: Discussed next steps' } })
    expect(savedContact.firstTouchAt).toBeTruthy()
    await expect(logCrmActivityDurable(agent, contact.id, { kind: 'note', label: 'Should not overwrite the concurrent update' }, repo)).resolves.toMatchObject({ version: 3 })
  })

  it('persists appointments and deals separately from contact stages and rejects overlapping commitments', async () => {
    const repo = repository()
    const contact = await createContactDurable(agent, { firstName: 'River', lastName: 'Client' }, repo)
    const event = await saveCrmAppointmentDurable(agent, { title: 'Buyer consultation', startsAt: '2026-10-02T15:00:00.000Z', endsAt: '2026-10-02T16:00:00.000Z', contactId: contact.id }, repo)
    await expect(saveCrmAppointmentDurable(agent, { title: 'Overlapping', startsAt: '2026-10-02T15:30:00.000Z', endsAt: '2026-10-02T16:30:00.000Z' }, repo)).rejects.toMatchObject({ status: 409 })
    const deal = await saveCrmDealDurable(agent, { name: 'Purchase agreement', contactId: contact.id, stage: 'Offer', price: 425000, projectedCloseOn: '2026-11-15' }, repo)
    expect(deal).toMatchObject({ contactId: contact.id, stage: 'Offer', status: 'open', price: 425000 })
    expect(event).toMatchObject({ kind: 'appointment', status: 'planned', sourceSystem: 'rcre' })
    expect((await repo.getDomainRecord({ userId: agentId, organizationId: org, role: 'agent' }, 'crm_deals', deal.id))?.data).toMatchObject({ stage: 'Offer' })
  })

  it('keeps contact ownership and visibility scoped while allowing an owner to reassign within the organization', async () => {
    const repo = repository()
    await repo.putDomainRecord({ userId: brokerId, organizationId: org, role: 'owner' }, { collection: 'member_profiles', recordId: otherId, ownerUserId: otherId, data: { officeId: 'fl' } })
    const contact = await createContactDurable(agent, { firstName: 'River', lastName: 'Client' }, repo)
    await expect(updateCrmContactDurable(agent, contact.id, { version: 1, ownerId: otherId }, repo)).rejects.toMatchObject({ status: 403 })
    const changed = await updateCrmContactDurable(broker, contact.id, { version: 1, ownerId: otherId, stage: 'Connected' }, repo)
    expect(changed).toMatchObject({ ownerId: otherId, officeId: 'fl', stage: 'Connected' })
    await expect(createCrmTaskDurable(agent, { title: 'Inaccessible lead task', contactId: contact.id, dueAt: '2026-10-01T14:00:00.000Z' }, repo)).rejects.toMatchObject({ status: 404 })
  })

  it('stores saved views as RCRE views instead of fixture-store records', async () => {
    const repo = repository()
    const view = await saveCrmSavedViewDurable(agent, { name: 'My open buyers', query: '', filters: { stage: 'Active Buyer' }, sort: 'newest', columns: ['stage'] }, repo)
    expect(view).toMatchObject({ ownerId: agentId, source: 'RCRE View', visibility: 'private', filters: { stage: 'Active Buyer' } })
  })

  it('reports only persisted evidence and leaves unobserved response history unknown', async () => {
    const repo = repository()
    const report = await reportCrmDurable(broker, '2026-10-01', '2026-10-31', repo)
    expect(report).toMatchObject({ calls: 0, appointments: 0, deals: 0, firstResponseMedianMinutes: null, responseDenominator: 0, fallout: null, coverage: { completeness: 'Partial coverage', externalMessages: 'Not available unless explicitly imported' } })
    expect(report.leadSourceCoverage).toEqual({})
  })
})
