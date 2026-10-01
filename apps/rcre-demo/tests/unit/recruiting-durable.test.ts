import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import { appendRecruitingEventDurable, listRecruitingDurable, recruitingProspectDurable, resolveRecruitingScopeFromMembers, saveRecruitingDurable } from '@/lib/platform/recruiting-durable'
import type { PlatformActor } from '@/lib/platform/auth'

const broker: PlatformActor = { id:'11111111-1111-4111-8111-111111111111', userId:'11111111-1111-4111-8111-111111111111', organizationId:'22222222-2222-4222-8222-222222222222', role:'managing_broker', name:'Taquilla Allen', market:'Alabama', teamId:'al', officeId:'al' }
const other: PlatformActor = { ...broker, id:'33333333-3333-4333-8333-333333333333', userId:'33333333-3333-4333-8333-333333333333', role:'team_leader', name:'Team Lead', officeId:'fl', teamId:'fl' }
let repository: MemoryRepository
beforeEach(() => { repository = new MemoryRepository(emptySeed()) })

describe('durable recruiting records', () => {
  it('creates scoped prospects and persists a versioned update plus audit', async () => {
    const created = await saveRecruitingDurable(broker, { name:'Taylor Recruit', source:'Referral' }, repository)
    expect(created.stage).toBe('New inquiry')
    const updated = await saveRecruitingDurable(broker, { ...created, notes:'Interested in brokerage support.' }, repository)
    expect(updated.version).toBe(2)
    expect((await recruitingProspectDurable(broker, created.id, repository)).notes).toContain('support')
    expect((await repository.listAudit({ userId: broker.id, organizationId: broker.organizationId, role:'broker' })).map(e => e.action).sort()).toEqual(['recruiting.prospect_created', 'recruiting.prospect_updated'].sort())
  })

  it('rejects stale versions and cross-office access', async () => {
    const created = await saveRecruitingDurable(broker, { name:'Taylor Recruit' }, repository)
    await expect(saveRecruitingDurable(broker, { ...created, version:99 }, repository)).rejects.toThrow(/changed/i)
    await expect(recruitingProspectDurable(other, created.id, repository)).rejects.toThrow(/not found/i)
  })

  it('hands a joined prospect into the invitation queue once without creating another person', async () => {
    const created = await saveRecruitingDurable(broker, { name:'Taylor Recruit', stage:'Joined', consent:true }, repository)
    const create = vi.fn(async () => ({ id:'invitation-1' }))
    const list = vi.fn(async () => [])
    const linked = await appendRecruitingEventDurable(broker, created.id, { kind:'onboard', email:'taylor@example.test', version:created.version }, repository, { list, create })
    expect(create).toHaveBeenCalledWith(broker, expect.objectContaining({ email:'taylor@example.test', role:'agent', officeId:'al', teamId:'al', market:'Alabama' }))
    expect(linked.invitationId).toBe('invitation-1')
    const state = await recruitingProspectDurable(broker, created.id, repository)
    expect(state.events.map(event => event.kind)).toEqual(['invitation'])
    expect((await repository.listPeople({ userId:broker.id, organizationId:broker.organizationId, role:'broker' })).some(person => person.id === created.id)).toBe(false)
    await expect(appendRecruitingEventDurable(broker, created.id, { kind:'onboard', email:'taylor@example.test', version:state.version }, repository, { list, create })).rejects.toThrow(/already linked/i)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('resolves broker-owner invitations from active office memberships, never the all-office role', () => {
    const members = [
      { active:true, officeId:'all', teamId:'all', market:'Both markets', platformRole:'broker_owner' },
      { active:true, officeId:'fl-office', teamId:'fl-team', market:'Florida', platformRole:'agent' },
      { active:true, officeId:'second-office', teamId:'second-team', market:'Alabama', platformRole:'agent' },
      { active:false, officeId:'al-office', teamId:'al-team', market:'Alabama', platformRole:'agent' },
    ]
    expect(resolveRecruitingScopeFromMembers(members, 'fl-office')).toEqual({ officeId:'fl-office', teamId:'fl-team', market:'Florida' })
    expect(() => resolveRecruitingScopeFromMembers(members, 'all')).toThrow(/active RCRE office|select the office/i)
    expect(() => resolveRecruitingScopeFromMembers(members, 'al-office')).toThrow(/active RCRE office/i)
    expect(() => resolveRecruitingScopeFromMembers(members)).toThrow(/select the office/i)
  })

  it('does not invite a prospect before it reaches Joined', async () => {
    const created = await saveRecruitingDurable(broker, { name:'Taylor Recruit' }, repository)
    const create = vi.fn(async () => ({ id:'should-not-create' }))
    await expect(appendRecruitingEventDurable(broker, created.id, { kind:'onboard', email:'taylor@example.test', version:created.version }, repository, { list:async () => [], create })).rejects.toThrow(/Joined/i)
    expect(create).not.toHaveBeenCalled()
  })

  it('records tasks and stage history atomically and list counts are scoped', async () => {
    const created = await saveRecruitingDurable(broker, { name:'Taylor Recruit' }, repository)
    await appendRecruitingEventDurable(broker, created.id, { kind:'task', text:'Schedule a conversation', dueAt:'2026-10-01T13:00:00.000Z', version:created.version }, repository)
    const updated = await recruitingProspectDurable(broker, created.id, repository)
    const staged = await appendRecruitingEventDurable(broker, updated.id, { kind:'stage', stage:'Meeting scheduled', text:'Meeting booked', version:updated.version }, repository)
    expect(staged.stage).toBe('Meeting scheduled')
    expect((await repository.listDomainRecords({ userId:broker.id, organizationId:broker.organizationId, role:'broker' }, 'recruiting_events')).length).toBe(2)
    expect(await listRecruitingDurable(other, repository)).toEqual([])
  })
})
