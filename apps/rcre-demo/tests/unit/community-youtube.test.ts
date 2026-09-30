import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import * as auth from '@/lib/platform/auth'
import { deleteRecord, getRecord, readRecords } from '@/lib/platform/store'
import { communityYoutubeConfig, runCommunityYoutubeDemo, saveCommunityYoutubeConfig } from '@/lib/community-youtube'
import { GET as communityRouteGet } from '@/app/api/community/youtube/route'
import { GET as academyManageGet } from '@/app/api/academy/manage/route'
import { POST as academyProgressPost } from '@/app/api/academy/progress/route'
import { GET as communityGet } from '@/app/api/community/route'
import { POST as academyUploadPost } from '@/app/api/academy/uploads/route'
import { POST as communityAttachmentPost } from '@/app/api/community/attachments/route'
import { academyManager, manageAcademy } from '@/lib/academy-service'

const org = `community-youtube-${randomUUID()}`
const actor: auth.PlatformActor = { id: 'broker', userId: 'broker', organizationId: org, role: 'broker_owner', name: 'Demo Broker', market: 'Florida', officeId: 'fl', teamId: 'fl' }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

function clear() {
  for (const kind of ['community_post', 'community_youtube_run', 'community_youtube_config'])
    for (const record of readRecords<{ id: string; organizationId?: string }>(kind))
      if (record.organizationId === org || record.id === org) deleteRecord(kind, record.id)
}

describe('Community video automation safety', () => {
  afterEach(clear)

  it('reports production Community storage unavailable before calling session or store access', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PHASE', '')
    const authSpy = vi.spyOn(auth, 'actorOrNull')
    const response = await communityRouteGet()
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: 'DURABLE_STORE_UNAVAILABLE' })
    expect(authSpy).not.toHaveBeenCalled()
  })

  it('fails closed across Training and Community data APIs in production before session or SQLite access', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PHASE', '')
    const authSpy = vi.spyOn(auth, 'actorOrNull')
    const results = await Promise.all([
      academyManageGet(),
      academyProgressPost(new Request('https://rcre.test/api/academy/progress', { method: 'POST', body: '{}' })),
      communityGet(),
      academyUploadPost(new Request('https://rcre.test/api/academy/uploads', { method: 'POST' })),
      communityAttachmentPost(new Request('https://rcre.test/api/community/attachments', { method: 'POST' })),
    ])
    expect(results.map(result => result.status)).toEqual([503, 503, 503, 503, 503])
    expect(authSpy).not.toHaveBeenCalled()
  })

  it('grants course management to brokerage leadership while keeping transaction coordinators out', () => {
    vi.stubEnv('NODE_ENV', 'test')
    const leader = { ...actor, id: 'managing-broker', role: 'managing_broker' as const }
    const tc = { ...actor, id: 'transaction-coordinator', role: 'transaction_coordinator' as const }
    expect(academyManager(leader)).toBe(true)
    expect(academyManager(tc)).toBe(false)
    const created = manageAcademy(leader, { title: 'Leadership authored demo course', body: 'Supplied local demo course content.', status: 'draft' }) as { organizationId: string; id: string }
    expect(created.organizationId).toBe(org)
    deleteRecord('academy_course', created.id)
  })

  it('stores approved manually supplied metadata as a private draft and deduplicates by organization and video ID', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('RCRE_DEMO_ENABLED', '1')
    const first = runCommunityYoutubeDemo(actor, { title: 'Approved demo video', summary: 'Short supplied summary.', watchUrl: 'https://www.youtube.com/watch?v=AbCdEf12345', discussionPrompt: 'What stood out?' })
    const duplicate = runCommunityYoutubeDemo(actor, { title: 'Revised metadata', summary: 'Another supplied summary.', watchUrl: 'https://youtu.be/AbCdEf12345', discussionPrompt: 'Discuss.' })
    expect(first.duplicate).toBe(false)
    expect(duplicate).toMatchObject({ duplicate: true, postId: first.postId })
    expect(getRecord<any>('community_post', first.postId)).toMatchObject({ draft: true, video: { provider: 'youtube', videoId: 'AbCdEf12345', source: 'manual_approved_metadata' } })
    expect(readRecords<any>('community_post').filter(post => post.id === first.postId)).toHaveLength(1)
    expect(readRecords<any>('community_youtube_run').filter(run => run.organizationId === org)).toHaveLength(1)
  })

  it('does not perform or imply a connected source and requires a proper approved video URL', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('RCRE_DEMO_ENABLED', '1')
    expect(communityYoutubeConfig(actor)).toMatchObject({ status: 'not_connected', sourceUrl: '', defaultDraft: true })
    for (const watchUrl of ['http://youtube.com/watch?v=AbCdEf12345', 'https://youtube.com/watch?v=bad', 'https://evil.example/watch?v=AbCdEf12345']) {
      expect(() => runCommunityYoutubeDemo(actor, { title: 'Title', summary: 'Summary', watchUrl, discussionPrompt: 'Discuss?' })).toThrow()
    }
    expect(readRecords<any>('community_post').filter(post => post.organizationId === org)).toHaveLength(0)
  })

  it('refuses the demo run when the explicit local demo flag is off', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('RCRE_DEMO_ENABLED', '0')
    expect(() => runCommunityYoutubeDemo(actor, { title: 'Title', summary: 'Summary', watchUrl: 'https://youtube.com/watch?v=AbCdEf12345', discussionPrompt: 'Discuss?' })).toThrow('Demo automation is disabled')
    expect(readRecords<any>('community_post').filter(post => post.organizationId === org)).toHaveLength(0)
  })

  it('enforces optimistic version checks for source configuration', () => {
    vi.stubEnv('NODE_ENV', 'test')
    const initial = communityYoutubeConfig(actor)
    const saved = saveCommunityYoutubeConfig(actor, { sourceType: 'channel', sourceUrl: 'https://www.youtube.com/@rcre', category: initial.category, version: initial.version })
    expect(saved).toMatchObject({ status: 'not_connected', version: 1 })
    expect(() => saveCommunityYoutubeConfig(actor, { sourceType: 'channel', sourceUrl: '', category: initial.category, version: 0 })).toThrow('changed')
  })
})
