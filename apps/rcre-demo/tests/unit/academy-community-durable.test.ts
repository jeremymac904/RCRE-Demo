import { describe, expect, it } from 'vitest'
import { MemoryRepository, emptySeed } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { academyCourseAccessible, academyManageData, academyProgress, communityActionDurable, listCommunityDurable, manageAcademyDurable, runCommunityYoutubeDemoDurable, saveAcademyProgress, saveCommunityYoutubeConfigDurable } from '@/lib/academy-durable'

const leader: PlatformActor = { id: 'u-owner', userId: 'u-owner', organizationId: 'org-rcre', role: 'broker_owner', name: 'Broker Owner', market: 'Both markets', teamId: 'all', officeId: 'all' }
const trainer: PlatformActor = { ...leader, id: 'u-trainer', userId: 'u-trainer', role: 'trainer', name: 'Trainer' }
const makeRepo = () => new MemoryRepository(emptySeed())

describe('durable Academy and Community records', () => {
  it('persists lesson progress per signed-in learner and rejects unknown lesson ids', async () => {
    const repo = makeRepo()
    expect((await academyProgress(leader, repo)).completedLessonIds).toEqual([])
    const updated = await saveAcademyProgress(leader, { lessonId: 'c01-l01', complete: true, bookmark: true, seconds: 45 }, repo)
    expect(updated.completedLessonIds).toEqual(['c01-l01'])
    expect(updated.bookmarks).toEqual(['c01-l01'])
    expect((await academyProgress(leader, repo)).positions['c01-l01']).toBe(45)
    await expect(saveAcademyProgress(leader, { lessonId: 'made-up', complete: true }, repo)).rejects.toThrow('Lesson unavailable')
  })

  it('stores authored courses, lesson content, category settings, and assignments through Repository', async () => {
    const repo = makeRepo()
    const draft = await manageAcademyDurable(trainer, { action: 'course', title: 'Brokerage Orientation', body: 'Approved material only.', category: 'Compliance and Forms' }, repo) as { id: string; state: string; version: number }
    expect(draft.state).toBe('draft')
    expect(await academyCourseAccessible(trainer, draft.id, repo)).toBe(true)
    const review = await manageAcademyDurable(trainer, { action: 'course', id: draft.id, version: draft.version, title: 'Brokerage Orientation', body: 'Approved material only.', category: 'Compliance and Forms', status: 'review' }, repo) as { version: number }
    const published = await manageAcademyDurable(leader, { action: 'course', id: draft.id, version: review.version, title: 'Brokerage Orientation', body: 'Approved material only.', category: 'Compliance and Forms', status: 'published' }, repo) as { state: string; version: number }
    expect(published.state).toBe('published')
    await expect(manageAcademyDurable(trainer, { action: 'lesson', courseId: draft.id, title: 'Orientation lesson', description: 'Use source-approved documents.', order: 1, status: 'draft' }, repo)).resolves.toMatchObject({ status: 'draft' })
    await expect(manageAcademyDurable(leader, { action: 'assignment', courseId: 'c01', targetType: 'all', due: '2026-12-31' }, repo)).resolves.toMatchObject({ courseId: 'c01', targetType: 'all' })
    const config = await manageAcademyDurable(leader, { action: 'config', categories: ['General Discussion', 'Training'], order: ['c01', 'c02'] }, repo) as { categories: string[] }
    expect(config.categories).toEqual(['General Discussion', 'Training'])
    expect((await academyManageData(leader, repo)).assignments).toHaveLength(1)
  })

  it('persists Community posts, reactions, comments, and moderation records', async () => {
    const repo = makeRepo()
    const post = await communityActionDurable(leader, { action: 'create', title: 'Training discussion', body: 'What helped you this week?', category: 'Training', draft: false }, repo) as { id: string }
    await communityActionDurable(leader, { action: 'comment', id: post.id, body: 'A useful course.' }, repo)
    await communityActionDurable(leader, { action: 'like', id: post.id }, repo)
    await communityActionDurable(leader, { action: 'pin', id: post.id }, repo)
    expect(await listCommunityDurable(leader, repo)).toMatchObject([{ id: post.id, pinned: true, likes: ['u-owner'], comments: [{ body: 'A useful course.' }] }])
    await communityActionDurable(leader, { action: 'delete', id: post.id }, repo)
    expect(await listCommunityDurable(leader, repo)).toEqual([])
  })

  it('creates a private internal video draft once and never contacts YouTube', async () => {
    const repo = makeRepo()
    await saveCommunityYoutubeConfigDurable(leader, { sourceType: 'channel', sourceUrl: 'https://www.youtube.com/@rcregroup', category: 'RCRE Updates', version: 0 }, repo)
    const input = { title: 'Brokerage update', summary: 'A short update.', watchUrl: 'https://youtu.be/abcdefghijk', discussionPrompt: 'What stood out?', category: 'RCRE Updates' }
    const first = await runCommunityYoutubeDemoDurable(leader, input, repo)
    const second = await runCommunityYoutubeDemoDurable(leader, input, repo)
    expect(first).toMatchObject({ duplicate: false, post: { draft: true } })
    expect(second).toMatchObject({ duplicate: true, postId: first.postId })
    expect((await listCommunityDurable(leader, repo))).toHaveLength(1)
    expect(await academyCourseAccessible(leader, 'unknown', repo)).toBe(false)
  })
})
