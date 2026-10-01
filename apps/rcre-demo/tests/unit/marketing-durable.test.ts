import { beforeEach, describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { createMarketingBatchDurable, listMarketingBatchesDurable, listMarketingDurable, saveMarketingDurable, updateMarketingBatchDurable } from '@/lib/platform/marketing-durable'
import type { PlatformActor } from '@/lib/platform/auth'
const manager: PlatformActor = { id:'11111111-1111-4111-8111-111111111111', userId:'11111111-1111-4111-8111-111111111111', organizationId:'22222222-2222-4222-8222-222222222222', role:'managing_broker', name:'Taquilla', market:'Alabama', teamId:'al', officeId:'al' }
const marketingAdmin: PlatformActor = { ...manager, id:'55555555-5555-4555-8555-555555555555', userId:'55555555-5555-4555-8555-555555555555', role:'marketing_admin', name:'Marketing Admin' }
const agent: PlatformActor = { ...manager, id:'33333333-3333-4333-8333-333333333333', userId:'33333333-3333-4333-8333-333333333333', role:'agent', name:'Agent', market:'Alabama' }
let repository: MemoryRepository
const draft = { title:'Buyer workshop', body:'A local draft for review.', channel:'Email', workflow:'Newsletter', status:'draft' as const }
beforeEach(() => {
  const seed = emptySeed()
  seed.users.push(
    { id: manager.id, organizationId: manager.organizationId, email: 'manager@example.test', fullName: manager.name, role: 'managing_broker', fubUserId: null, isActive: true, officeId: 'al' },
    { id: agent.id, organizationId: agent.organizationId, email: 'agent@example.test', fullName: agent.name, role: 'agent', fubUserId: null, isActive: true, officeId: 'al' },
    { id: marketingAdmin.id, organizationId: marketingAdmin.organizationId, email: 'marketing@example.test', fullName: marketingAdmin.name, role: 'marketing_admin', fubUserId: null, isActive: true, officeId: 'al' },
  )
  repository = new MemoryRepository(seed)
})

describe('durable marketing workflows', () => {
  it('persists drafts and audit, and limits agent visibility to owned campaigns', async () => {
    const created = await saveMarketingDurable(agent, draft, repository)
    expect(created.version).toBe(1)
    expect(await listMarketingDurable(agent, repository)).toHaveLength(1)
    expect(await listMarketingDurable(manager, repository)).toHaveLength(1)
    expect(await listMarketingDurable(marketingAdmin, repository)).toHaveLength(1)
    const outsider = { ...agent, id:'44444444-4444-4444-8444-444444444444', userId:'44444444-4444-4444-8444-444444444444' }
    expect(await listMarketingDurable(outsider, repository)).toHaveLength(0)
  })

  it('requires review authority and invalidates approval when the copy changes', async () => {
    const created = await saveMarketingDurable(agent, draft, repository)
    await expect(saveMarketingDurable(agent, { ...draft, id:created.id, version:created.version, status:'approved' }, repository)).rejects.toThrow(/reviewer/i)
    const approved = await saveMarketingDurable(manager, { ...draft, id:created.id, version:created.version, status:'approved' }, repository)
    expect(approved.approvedVersion).toBe(2)
    const edited = await saveMarketingDurable(manager, { ...draft, id:approved.id, version:approved.version, title:'New copy' }, repository)
    expect(edited.status).toBe('draft')
    expect(edited.approvedVersion).toBeNull()
  })

  it('creates, lists, and cancels durable batches atomically without external delivery', async () => {
    const source = await saveMarketingDurable(agent, draft, repository)
    const batch = await createMarketingBatchDurable(agent, { title:'Spring outreach', ids:[source.id, source.id] }, repository)
    expect(batch.contentIds).toHaveLength(1)
    expect(batch.contents[0]).toMatchObject({ status:'draft', title:'Buyer workshop — batch draft' })
    expect(await listMarketingBatchesDurable(agent, repository)).toHaveLength(1)
    const canceled = await updateMarketingBatchDurable(agent, { action:'cancel', id:batch.id, version:batch.version }, repository)
    expect(canceled).toMatchObject({ status:'canceled', updated:1, externalMessagesSent:0 })
    expect((await listMarketingDurable(agent, repository)).find(item => item.id === batch.contentIds[0])?.status).toBe('canceled')
    await expect(updateMarketingBatchDurable(agent, { action:'pause', id:batch.id, version:batch.version }, repository)).rejects.toThrow(/changed/i)
  })

  it('keeps source scheduling separate when a scheduled item is copied into a draft batch', async () => {
    const source = await saveMarketingDurable(agent, draft, repository)
    const approved = await saveMarketingDurable(manager, { ...draft, id:source.id, version:source.version, status:'approved' }, repository)
    const scheduled = await saveMarketingDurable(manager, { ...draft, id:approved.id, version:approved.version, status:'scheduled', scheduleAt:'2099-03-01T12:00:00.000Z' }, repository)
    const batch = await createMarketingBatchDurable(agent, { title:'Scheduled content review', ids:[scheduled.id] }, repository)
    await updateMarketingBatchDurable(agent, { action:'cancel', id:batch.id, version:batch.version }, repository)
    const intent = await repository.getDomainRecord({ userId:manager.id, organizationId:manager.organizationId, role:'managing_broker', officeId:'al' }, 'marketing_schedule', `${scheduled.id}:${scheduled.approvedVersion}`)
    expect(intent?.data.state).toBe('awaiting provider configuration')
    expect((await listMarketingDurable(manager, repository)).find(item => item.id === scheduled.id)?.status).toBe('scheduled')
  })

  it('schedules an approved immutable version without pretending provider delivery happened', async () => {
    const created = await saveMarketingDurable(agent, draft, repository)
    const approved = await saveMarketingDurable(manager, { ...draft, id:created.id, version:created.version, status:'approved' }, repository)
    const scheduled = await saveMarketingDurable(manager, { ...draft, id:approved.id, version:approved.version, status:'scheduled', scheduleAt:'2099-03-01T12:00:00.000Z' }, repository)
    expect(scheduled.status).toBe('scheduled')
    const jobs = await repository.listDomainRecords({ userId:manager.id, organizationId:manager.organizationId, role:'managing_broker', officeId:'al' }, 'marketing_schedule')
    expect(jobs[0]?.data.state).toBe('awaiting provider configuration')
  })
})
