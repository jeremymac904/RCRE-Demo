import { beforeEach, describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { listMarketingDurable, saveMarketingDurable } from '@/lib/platform/marketing-durable'
import type { PlatformActor } from '@/lib/platform/auth'
const manager: PlatformActor = { id:'11111111-1111-4111-8111-111111111111', userId:'11111111-1111-4111-8111-111111111111', organizationId:'22222222-2222-4222-8222-222222222222', role:'managing_broker', name:'Taquilla', market:'Alabama', teamId:'al', officeId:'al' }
const agent: PlatformActor = { ...manager, id:'33333333-3333-4333-8333-333333333333', userId:'33333333-3333-4333-8333-333333333333', role:'agent', name:'Agent', market:'Alabama' }
let repository: MemoryRepository
const draft = { title:'Buyer workshop', body:'A local draft for review.', channel:'Email', workflow:'Newsletter', status:'draft' as const }
beforeEach(() => { repository = new MemoryRepository(emptySeed()) })

describe('durable marketing workflows', () => {
  it('persists drafts and audit, and limits agent visibility to owned campaigns', async () => {
    const created = await saveMarketingDurable(agent, draft, repository)
    expect(created.version).toBe(1)
    expect(await listMarketingDurable(agent, repository)).toHaveLength(1)
    expect(await listMarketingDurable(manager, repository)).toHaveLength(1)
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

  it('schedules an approved immutable version without pretending provider delivery happened', async () => {
    const created = await saveMarketingDurable(agent, draft, repository)
    const approved = await saveMarketingDurable(manager, { ...draft, id:created.id, version:created.version, status:'approved' }, repository)
    const scheduled = await saveMarketingDurable(manager, { ...draft, id:approved.id, version:approved.version, status:'scheduled', scheduleAt:'2099-03-01T12:00:00.000Z' }, repository)
    expect(scheduled.status).toBe('scheduled')
    const jobs = await repository.listDomainRecords({ userId:manager.id, organizationId:manager.organizationId, role:'broker' }, 'marketing_schedule')
    expect(jobs[0]?.data.state).toBe('awaiting provider configuration')
  })
})
