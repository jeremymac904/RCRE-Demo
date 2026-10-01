import { describe, expect, it } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { getSettingDurable, saveSettingDurable } from '@/lib/platform/settings-durable'

const actor = (role: PlatformActor['role'], id: string, officeId = 'al'): PlatformActor => ({
  id, userId: id, organizationId: 'org-rcre', role, name: 'Test member', market: officeId === 'al' ? 'Alabama' : 'Florida', officeId, teamId: officeId,
})

describe('Postgres settings domain service', () => {
  it('persists personal preferences with optimistic version checks and audit', async () => {
    const repo = new MemoryRepository(emptySeed()), user = actor('agent', 'agent-1')
    const initial = await getSettingDurable(user, 'personal', repo)
    const saved = await saveSettingDurable(user, 'personal', { theme: 'dark', reducedMotion: true }, initial.version, repo)
    expect(saved.version).toBe(1)
    expect((await getSettingDurable(user, 'personal', repo)).value).toEqual({ theme: 'dark', reducedMotion: true })
    await expect(saveSettingDurable(user, 'personal', { theme: 'light' }, initial.version, repo)).rejects.toMatchObject({ status: 409 })
    expect((await repo.listAudit({ userId: user.id, organizationId: user.organizationId, role: 'owner' })).map(e => e.action)).toContain('platform-setting.updated')
  })

  it('rejects invalid settings and denies groups outside role capabilities', async () => {
    const repo = new MemoryRepository(emptySeed()), user = actor('agent', 'agent-1')
    await expect(saveSettingDurable(user, 'personal', { theme: 'ultraviolet' }, 0, repo)).rejects.toThrow()
    await expect(getSettingDurable(user, 'leads', repo)).rejects.toMatchObject({ status: 403 })
    await expect(saveSettingDurable(user, 'brokerage', { publicPhone: '555' }, 0, repo)).rejects.toMatchObject({ status: 403 })
  })

  it('keeps leadership lead policies keyed to the leader office', async () => {
    const repo = new MemoryRepository(emptySeed()), leader = actor('managing_broker', 'mb-1', 'al')
    const policy = { enabled: true, responseMinutes: 30, graceMinutes: 5, stageDays: {} }
    const saved = await saveSettingDurable(leader, 'leads', policy, 0, repo)
    expect(saved.id).toBe('leads:al')
    expect((await getSettingDurable(leader, 'leads', repo)).value).toEqual(policy)
  })
})
