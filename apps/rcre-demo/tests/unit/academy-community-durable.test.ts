import { afterEach, describe, expect, it } from 'vitest'
import { configureAuthPersistenceForTests, type AuthPersistence } from '@/lib/auth/persistence'
import { MemoryRepository, emptySeed } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { academyCourseAccessible, academyManageData, academyProgress, communityActionDurable, listCommunityDurable, manageAcademyDurable, runCommunityYoutubeDemoDurable, saveAcademyProgress, saveCommunityYoutubeConfigDurable } from '@/lib/academy-durable'

const leader: PlatformActor = { id: 'u-owner', userId: 'u-owner', organizationId: 'org-rcre', role: 'broker_owner', name: 'Broker Owner', market: 'Both markets', teamId: 'all', officeId: 'all' }
const trainer: PlatformActor = { ...leader, id: 'u-trainer', userId: 'u-trainer', role: 'trainer', name: 'Trainer' }
const learner: PlatformActor = { ...leader, id: 'u-agent', userId: 'u-agent', role: 'agent', name: 'Agent' }
const makeRepo = () => new MemoryRepository(emptySeed())
afterEach(() => configureAuthPersistenceForTests(null))

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

  it('shares approved courses, policies, lessons, and assignments only after brokerage publication', async () => {
    const repo = makeRepo()
    const draft = await manageAcademyDurable(trainer, { action: 'course', title: 'Office Orientation', body: 'Approved material.' }, repo) as { id: string; version: number }
    const review = await manageAcademyDurable(trainer, { action: 'course', id: draft.id, version: draft.version, title: 'Office Orientation', body: 'Approved material.', status: 'review' }, repo) as { version: number }
    await expect(academyCourseAccessible(learner, draft.id, repo)).resolves.toBe(false)
    await expect(manageAcademyDurable(leader, { action: 'course', id: draft.id, version: review.version, title: 'Office Orientation', body: 'Approved material.', status: 'published' }, repo)).resolves.toMatchObject({ state: 'published' })
    await expect(academyCourseAccessible(learner, draft.id, repo)).resolves.toBe(true)
    expect((await academyManageData(learner, repo)).courses.map(course => course.id)).toContain(draft.id)
    await expect(manageAcademyDurable(trainer, { action: 'assignment', courseId: draft.id, targetType: 'all', due: '2026-12-31' }, repo)).rejects.toThrow('Brokerage leadership')
    await expect(manageAcademyDurable(leader, { action: 'assignment', courseId: draft.id, targetType: 'all', due: '2026-12-31' }, repo)).resolves.toMatchObject({ targetType: 'all' })
    await expect(manageAcademyDurable(leader, { action: 'assignment', courseId: draft.id, targetType: 'market', target: 'Florida', due: '2026-02-31' }, repo)).rejects.toThrow('Due date required')
    await expect(manageAcademyDurable(leader, { action: 'assignment', courseId: draft.id, targetType: 'market', due: '2026-12-31' }, repo)).rejects.toThrow('Choose a target')
    expect((await academyManageData(learner, repo)).assignments).toHaveLength(1)
  })

  it('limits Managing Broker training assignments to verified members in the managers office', async () => {
    const manager: PlatformActor = { ...leader, id: 'manager-fl', userId: 'manager-fl', role: 'managing_broker', officeId: 'fl', teamId: 'fl', market: 'Florida', name: 'Florida Managing Broker' }
    configureAuthPersistenceForTests({ listMembers: async () => [
      { userId: 'agent-fl', organizationId: manager.organizationId, canonicalPersonId: null, email: 'fl@example.test', name: 'Florida Agent', platformRole: 'agent', active: true, accountStatus: 'active', officeId: 'fl', teamId: 'fl', market: 'Florida', lastLoginAt: null },
      { userId: 'agent-al', organizationId: manager.organizationId, canonicalPersonId: null, email: 'al@example.test', name: 'Alabama Agent', platformRole: 'agent', active: true, accountStatus: 'active', officeId: 'al', teamId: 'al', market: 'Alabama', lastLoginAt: null },
    ] } as unknown as AuthPersistence)
    const repo = makeRepo()
    await expect(manageAcademyDurable(manager, { action: 'assignment', courseId: 'c01', targetType: 'all', due: '2026-12-31' }, repo)).rejects.toThrow('only to a verified learner or their own office/team')
    await expect(manageAcademyDurable(manager, { action: 'assignment', courseId: 'c01', targetType: 'agent', target: 'agent-al', due: '2026-12-31' }, repo)).rejects.toThrow('only to a verified learner or their own office/team')
  })

  it('persists course completion for lessonless authored courses and returns authored lesson bookmarks', async () => {
    const repo = makeRepo()
    const draft = await manageAcademyDurable(trainer, { action: 'course', title: 'Local Procedures', body: 'Only approved material.' }, repo) as { id: string; version: number }
    const review = await manageAcademyDurable(trainer, { action: 'course', id: draft.id, version: draft.version, title: 'Local Procedures', body: 'Only approved material.', status: 'review' }, repo) as { version: number }
    await manageAcademyDurable(leader, { action: 'course', id: draft.id, version: review.version, title: 'Local Procedures', body: 'Only approved material.', status: 'published' }, repo)
    const completion = await saveAcademyProgress(learner, { lessonId: draft.id, complete: true }, repo)
    expect(completion.completedLessonIds).toContain(draft.id)

    const lesson = await manageAcademyDurable(trainer, { action: 'lesson', courseId: draft.id, title: 'Practice', description: 'Use the approved source.', order: 1, status: 'draft' }, repo) as { id: string; version: number }
    const lessonReview = await manageAcademyDurable(trainer, { action: 'lesson', id: lesson.id, version: lesson.version, courseId: draft.id, title: 'Practice', description: 'Use the approved source.', order: 1, status: 'review' }, repo) as { version: number }
    await manageAcademyDurable(leader, { action: 'lesson', id: lesson.id, version: lessonReview.version, courseId: draft.id, title: 'Practice', description: 'Use the approved source.', order: 1, status: 'published' }, repo)
    await saveAcademyProgress(learner, { lessonId: lesson.id, bookmark: true }, repo)
    expect((await academyManageData(learner, repo)).bookmarks).toContainEqual({ id: lesson.id, title: 'Practice', courseId: draft.id })
    await expect(saveAcademyProgress(learner, { lessonId: draft.id, complete: true }, repo)).rejects.toThrow('Complete each published lesson')
  })

  it('requires an independent reviewer to approve the exact submitted course or lesson version', async () => {
    const repo = makeRepo()
    const secondBroker = { ...leader, id: 'u-owner-2', userId: 'u-owner-2', name: 'Second Broker' }
    const draft = await manageAcademyDurable(leader, { action: 'course', title: 'Broker Course', body: 'Version one.' }, repo) as { id: string; version: number }
    const review = await manageAcademyDurable(leader, { action: 'course', id: draft.id, version: draft.version, title: 'Broker Course', body: 'Version one.', status: 'review' }, repo) as { version: number }
    await expect(manageAcademyDurable(leader, { action: 'course', id: draft.id, version: review.version, title: 'Broker Course', body: 'Version one.', status: 'published' }, repo)).rejects.toThrow('different brokerage leader')
    await expect(manageAcademyDurable(secondBroker, { action: 'course', id: draft.id, version: review.version, title: 'Broker Course', body: 'Altered after review.', status: 'published' }, repo)).rejects.toThrow('Reviewed course content changed')

    const authored = await manageAcademyDurable(trainer, { action: 'course', title: 'Lesson Course', body: 'Source-approved.' }, repo) as { id: string }
    const lesson = await manageAcademyDurable(trainer, { action: 'lesson', courseId: authored.id, title: 'A lesson', description: 'First text.', order: 1, status: 'draft' }, repo) as { id: string; version: number }
    const lessonReview = await manageAcademyDurable(trainer, { action: 'lesson', id: lesson.id, version: lesson.version, courseId: authored.id, title: 'A lesson', description: 'First text.', order: 1, status: 'review' }, repo) as { version: number }
    await expect(manageAcademyDurable(leader, { action: 'lesson', id: lesson.id, version: lessonReview.version, courseId: authored.id, title: 'A lesson', description: 'Changed text.', order: 1, status: 'published' }, repo)).rejects.toThrow('Reviewed lesson content changed')
  })

  it('fails closed when authored course policy records are not visible to a learner', async () => {
    const repo = makeRepo()
    await expect(academyCourseAccessible(learner, 'unknown-custom-course', repo)).resolves.toBe(false)
  })

  it('persists Community posts, reactions, comments, moderation, and prevents interaction after removal', async () => {
    const repo = makeRepo()
    const post = await communityActionDurable(leader, { action: 'create', title: 'Training discussion', body: 'What helped you this week?', category: 'Training', draft: false }, repo) as { id: string }
    await communityActionDurable(leader, { action: 'comment', id: post.id, body: 'A useful course.' }, repo)
    await communityActionDurable(leader, { action: 'like', id: post.id }, repo)
    await communityActionDurable(leader, { action: 'pin', id: post.id }, repo)
    expect(await listCommunityDurable(leader, repo)).toMatchObject([{ id: post.id, pinned: true, likes: ['u-owner'], comments: [{ body: 'A useful course.' }] }])
    await communityActionDurable(learner, { action: 'comment', id: post.id, body: 'Visible to the team.' }, repo)
    await communityActionDurable(trainer, { action: 'like', id: post.id }, repo)
    const shared = await listCommunityDurable(learner, repo)
    expect(shared[0].id).toBe(post.id)
    expect(shared[0].likes).toEqual(expect.arrayContaining(['u-owner', 'u-trainer']))
    expect(shared[0].comments.map(comment => comment.body)).toEqual(expect.arrayContaining(['A useful course.', 'Visible to the team.']))
    await communityActionDurable(leader, { action: 'delete', id: post.id }, repo)
    expect(await listCommunityDurable(leader, repo)).toEqual([])
    await expect(communityActionDurable(leader, { action: 'comment', id: post.id, body: 'Late comment' }, repo)).rejects.toThrow('Post unavailable')
    await expect(communityActionDurable(leader, { action: 'like', id: post.id }, repo)).rejects.toThrow('Post unavailable')
  })

  it('requires brokerage approval to publish drafts and moderator permission to pin posts', async () => {
    const repo = makeRepo()
    const post = await communityActionDurable(learner, { action: 'create', title: 'Question', body: 'Can someone help?', draft: true }, repo) as { id: string }
    await expect(communityActionDurable(learner, { action: 'edit', id: post.id, title: 'Question', body: 'Now public', draft: false }, repo)).rejects.toThrow('Brokerage approval')
    await expect(communityActionDurable(learner, { action: 'pin', id: post.id }, repo)).rejects.toThrow('Moderator permission')
    await communityActionDurable(learner, { action: 'edit', id: post.id, title: 'Question', body: 'Ready for review', draft: true }, repo)
    await communityActionDurable(leader, { action: 'publish', id: post.id }, repo)
    expect(await listCommunityDurable(learner, repo)).toMatchObject([{ id: post.id, draft: false, body: 'Ready for review' }])
    await expect(communityActionDurable(learner, { action: 'pin', id: post.id }, repo)).rejects.toThrow('Moderator permission')
  })

  it('does not allow a trainer to edit another trainer’s course or publish an unpublished lesson', async () => {
    const repo = makeRepo()
    const course = await manageAcademyDurable(trainer, { action: 'course', title: 'Team Orientation', body: 'Approved orientation.' }, repo) as { id: string; version: number }
    const otherTrainer = { ...trainer, id: 'u-trainer-2', userId: 'u-trainer-2', name: 'Second Trainer' }
    await expect(manageAcademyDurable(otherTrainer, { action: 'course', id: course.id, version: course.version, title: 'Hijacked', body: 'Changed by another trainer.' }, repo)).rejects.toThrow('Course not found')
    await expect(saveAcademyProgress(leader, { lessonId: 'lesson-not-published', complete: true }, repo)).rejects.toThrow('Lesson unavailable')
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
