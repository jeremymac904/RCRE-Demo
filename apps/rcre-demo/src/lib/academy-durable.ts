import 'server-only'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import type { Actor, DomainRecord, Repository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { AccessError, can } from '@/lib/platform/auth'
import { repositoryActor } from '@/lib/platform/onboarding'
import { createStorageService } from '@/lib/storage'
import { academy } from '@/data/academy'

const COURSE = 'academy_courses'
const LESSON = 'academy_lessons'
const RESOURCE = 'academy_resources'
const ASSIGNMENT = 'academy_assignments'
const PROGRESS = 'academy_progress'
const POLICY = 'academy_policies'
const CONFIG = 'academy_config'
const POST = 'community_posts'
const COMMENT = 'community_comments'
const REACTION = 'community_reactions'
const MODERATION = 'community_moderation'
const YOUTUBE_CONFIG = 'community_youtube_config'
const YOUTUBE_RUN = 'community_youtube_runs'

export type DurableCourse = {
  id: string; organizationId: string; ownerId: string; title: string; description: string
  category: string; state: 'draft' | 'review' | 'published' | 'archived'; version: number
  createdAt: string; updatedAt: string; source: 'rcre-authored'; order: number; prerequisite: string; resources: { id: string; name: string; type: string }[]; revisions: { version: number; title: string; body: string; at: string }[]
}
export type DurableLesson = {
  id: string; organizationId: string; ownerId: string; courseId: string; title: string
  description: string; order: number; status: 'draft' | 'review' | 'published' | 'archived'
  resources: { id: string; name: string; contentType: string; size: number }[]
  version: number; createdAt: string; updatedAt: string
}
export type DurableProgress = {
  id: string; organizationId: string; ownerId: string; completedLessonIds: string[]
  bookmarks: string[]; positions: Record<string, number>; lastViewedLessonId?: string; updatedAt: string
}
export type DurableAssignment = {
  id: string; organizationId: string; ownerId: string; courseId: string; targetType: string
  target: string; due: string; createdAt: string; exemptions: string[]
}
export type DurablePost = {
  id: string; organizationId: string; ownerId: string; author: string; category: string
  title: string; body: string; lessonId: string; draft: boolean; createdAt: string
  attachments: { id: string; name: string }[]; video?: {
    provider: 'youtube'; videoId: string; title: string; summary: string; watchUrl: string
    thumbnailUrl?: string; discussionPrompt: string; source: 'manual_approved_metadata'
  }
}
export type DurableComment = { id: string; organizationId: string; postId: string; ownerId: string; author: string; body: string; at: string }
export type DurableReaction = { id: string; organizationId: string; postId: string; ownerId: string; kind: 'like'; createdAt: string }
export type DurableModeration = { id: string; organizationId: string; postId: string; ownerId: string; kind: 'pin' | 'remove'; value: boolean; at: string }
export type DurableCommunityPost = DurablePost & { comments: DurableComment[]; likes: string[]; pinned: boolean }
type DurableAsset = { id: string; organizationId: string; ownerId: string; filename: string; contentType: string; size: number; category: 'training-resource' | 'community-attachment'; createdAt: string }

const manager = (actor: PlatformActor) => can(actor, 'academy.manage')
const communityManager = (actor: PlatformActor) => can(actor, 'community.manage')
const ctx = (actor: PlatformActor) => repositoryActor(actor)
const repoOf = async (repository?: Repository) => repository ?? getRepository()
const isoNow = () => new Date().toISOString()
const clean = (value: unknown, max = 5000) => String(value ?? '').trim().slice(0, max)
const recordInput = <T extends Record<string, unknown>>(collection: string, recordId: string, ownerUserId: string, data: T, prior?: DomainRecord) => ({
  collection, recordId, ownerUserId, data,
  ...(prior ? { expectedVersion: prior.version } : { createOnly: true }),
})

export function emptyProgress(actor: PlatformActor): DurableProgress {
  return { id: actor.id, organizationId: actor.organizationId, ownerId: actor.id, completedLessonIds: [], bookmarks: [], positions: {}, updatedAt: isoNow() }
}

export async function academyProgress(actor: PlatformActor, repository?: Repository): Promise<DurableProgress> {
  const row = await (await repoOf(repository)).getDomainRecord<DurableProgress>(ctx(actor), PROGRESS, actor.id)
  return row?.data ?? emptyProgress(actor)
}

export async function saveAcademyProgress(actor: PlatformActor, input: { lessonId: string; complete?: boolean; bookmark?: boolean; seconds?: number }, repository?: Repository) {
  const repo = await repoOf(repository), scoped = ctx(actor)
  const lessonId = clean(input.lessonId, 160)
  const localLesson = academy.lessons.find(item => item.id === lessonId)
  const customLesson = await repo.getDomainRecord<DurableLesson>(scoped, LESSON, lessonId)
  const customCourse = customLesson ? await repo.getDomainRecord<DurableCourse>(scoped, COURSE, customLesson.data.courseId) : null
  const isPublished = Boolean(localLesson || customLesson?.data.status === 'published' && customCourse?.data.state === 'published')
  if (!lessonId || !isPublished) throw new AccessError('Lesson unavailable', 404)
  if (input.seconds !== undefined && (!Number.isFinite(input.seconds) || input.seconds < 0 || input.seconds > 86400)) throw new AccessError('Invalid lesson position', 400)
  const prior = await repo.getDomainRecord<DurableProgress>(scoped, PROGRESS, actor.id)
  const p = prior?.data ?? emptyProgress(actor)
  for (const [key, value] of [['completedLessonIds', input.complete], ['bookmarks', input.bookmark]] as const) {
    if (typeof value !== 'boolean') continue
    const values = p[key]
    p[key] = value ? [...new Set([...values, lessonId])] : values.filter(id => id !== lessonId)
  }
  if (input.seconds !== undefined) p.positions[lessonId] = input.seconds
  p.lastViewedLessonId = lessonId
  p.updatedAt = isoNow()
  const [saved] = await repo.putDomainRecordsAtomic(scoped, [recordInput(PROGRESS, actor.id, actor.id, p as unknown as Record<string, unknown>, prior ?? undefined)])
  return { ...p, version: saved.version }
}

export async function academyCatalog(actor: PlatformActor, repository?: Repository) {
  const repo = await repoOf(repository), scoped = ctx(actor)
  const customCourseRows = await repo.listDomainRecords<DurableCourse>(scoped, COURSE, { limit: 200 })
  const customCourses = customCourseRows.map(row => ({ ...row.data, version: row.version }))
  const visibleCourses = customCourses.filter(course => manager(actor) || course.state === 'published')
  const staticCourses = academy.courses
  const courseIds = new Set([...staticCourses.map(c => c.id), ...visibleCourses.map(c => c.id)])
  const lessonRows = await repo.listDomainRecords<DurableLesson>(scoped, LESSON, { limit: 200 })
  const customLessons = lessonRows.map(row => ({ ...row.data, version: row.version })).filter(lesson => manager(actor) || lesson.status === 'published')
  const courses = [
    ...staticCourses.map(course => ({ ...course, source: 'approved-curriculum' as const, status: 'published' as const, category: 'AI Training' })),
    ...visibleCourses,
  ]
  return { courses, customCourses, lessons: customLessons.filter(lesson => courseIds.has(lesson.courseId)) }
}

export function orderAcademyCourses<T extends { id: string; order?: number }>(catalog: T[], order: unknown) {
  const ids = Array.isArray(order) ? order.map(String) : []
  const position = new Map(ids.map((id, index) => [id, index]))
  return [...catalog].sort((a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER) || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
}

export async function academyCourseAccessible(actor: PlatformActor, courseId: string, repository?: Repository) {
  if (!courseId) return false
  if (academy.courses.some(course => course.id === courseId)) return true
  const row = await (await repoOf(repository)).getDomainRecord<DurableCourse>(ctx(actor), COURSE, courseId)
  return Boolean(row && (manager(actor) || row.data.state === 'published'))
}

export async function academyConfigDurable(actor: PlatformActor, repository?: Repository) {
  const row = await (await repoOf(repository)).getDomainRecord<Record<string, unknown>>(ctx(actor), CONFIG, actor.organizationId)
  return row?.data ?? { id: actor.organizationId, categories: ['General Discussion', 'AI Questions', 'Lead Follow Up', 'Marketing', 'Listings', 'AI Tools', 'Wins', 'Training', 'RCRE Updates'], order: academy.courses.map(course => course.id) }
}

export async function academyManageData(actor: PlatformActor, repository?: Repository) {
  const repo = await repoOf(repository), scoped = ctx(actor)
  const progress = await academyProgress(actor, repo)
  const catalog = await academyCatalog(actor, repo)
  const [assignments, policies, config] = await Promise.all([
    repo.listDomainRecords<DurableAssignment>(scoped, ASSIGNMENT, { limit: 200 }),
    repo.listDomainRecords<Record<string, unknown>>(scoped, POLICY, { limit: 200 }),
    repo.getDomainRecord<Record<string, unknown>>(scoped, CONFIG, actor.organizationId),
  ])
  const allProgress = manager(actor) ? (await repo.listDomainRecords<DurableProgress>(scoped, PROGRESS, { limit: 200 })).map(row => ({ ...row.data, version: row.version })) : []
  const bookmarks = progress.bookmarks.map(id => {
    const local = academy.lessons.find(lesson => lesson.id === id)
    return local ? { id: local.id, title: local.title, courseId: local.courseId } : null
  }).filter(Boolean)
  const visibleAssignments = assignments.map(row => row.data).filter(item => manager(actor) || item.targetType === 'all' || ({ agent: actor.id, role: actor.role, market: actor.market, office: actor.officeId, team: actor.teamId } as Record<string, string>)[item.targetType] === item.target).filter(item => !item.exemptions?.includes(actor.id))
  return {
    bookmarks, config: config?.data ?? { id: actor.organizationId, categories: ['General Discussion', 'AI Questions', 'Lead Follow Up', 'Marketing', 'Listings', 'AI Tools', 'Wins', 'Training', 'RCRE Updates'], order: academy.courses.map(course => course.id) },
    policies: policies.map(row => ({ ...row.data, id: `${row.data.organizationId}:${row.data.courseId}` })), ownProgress: progress,
    manager: manager(actor), assignments: visibleAssignments, courses: catalog.customCourses.map(course => ({ ...course, status: course.state, body: course.description, order: course.order, prerequisite: course.prerequisite, resources: course.resources, revisions: course.revisions })), lessons: catalog.lessons,
    progress: allProgress,
  }
}

export async function manageAcademyDurable(actor: PlatformActor, raw: Record<string, unknown>, repository?: Repository) {
  if (!manager(actor)) throw new AccessError('Trainer permission required', 403)
  const repo = await repoOf(repository), scoped = ctx(actor), action = String(raw.action ?? '')
  if (action === 'config') {
    const categories = Array.isArray(raw.categories) ? raw.categories.map(value => clean(value, 70)).filter(Boolean) : []
    const order = Array.isArray(raw.order) ? raw.order.map(String) : []
    if (categories.length < 1 || categories.length > 20 || new Set(categories).size !== categories.length) throw new AccessError('Provide 1–20 unique category names', 400)
    if (order.some(id => !academy.courses.some(course => course.id === id)) || new Set(order).size !== order.length) throw new AccessError('Course order contains an unknown or duplicate course', 400)
    const prior = await repo.getDomainRecord<Record<string, unknown>>(scoped, CONFIG, actor.organizationId)
    const data = { id: actor.organizationId, organizationId: actor.organizationId, ownerId: prior?.data.ownerId ?? actor.id, categories, order, updatedAt: isoNow() }
    return (await repo.putDomainRecord(scoped, { collection: CONFIG, recordId: actor.organizationId, ownerUserId: prior?.ownerUserId ?? actor.id, data, ...(prior ? { expectedVersion: prior.version } : {}) })).data
  }
  if (action === 'policy') {
    const courseId = clean(raw.courseId, 160), roles = Array.isArray(raw.roles) ? raw.roles.map(value => clean(value, 80)) : []
    if (!academy.courses.some(course => course.id === courseId) && !(await repo.getDomainRecord(scoped, COURSE, courseId))) throw new AccessError('Unknown course', 404)
    const id = `${actor.organizationId}:${courseId}`, prior = await repo.getDomainRecord<Record<string, unknown>>(scoped, POLICY, id)
    const data = { id, organizationId: actor.organizationId, courseId, ownerId: prior?.data.ownerId ?? actor.id, roles: [...new Set(roles)], publicPreview: raw.publicPreview === true, updatedAt: isoNow() }
    return (await repo.putDomainRecord(scoped, { collection: POLICY, recordId: id, ownerUserId: prior?.ownerUserId ?? actor.id, data, ...(prior ? { expectedVersion: prior.version } : {}) })).data
  }
  if (action === 'assignment') {
    const courseId = clean(raw.courseId, 160), due = clean(raw.due, 10), targetType = clean(raw.targetType, 32)
    const catalog = await academyCatalog(actor, repo)
    if (!catalog.courses.some(course => course.id === courseId && (course.source === 'approved-curriculum' || course.state === 'published'))) throw new AccessError('Choose a published course', 400)
    if (!['all', 'agent', 'role', 'market', 'office', 'team'].includes(targetType)) throw new AccessError('Invalid assignment target', 400)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(Date.parse(due))) throw new AccessError('Due date required', 400)
    const id = randomUUID(), data: DurableAssignment = { id, organizationId: actor.organizationId, ownerId: actor.id, courseId, targetType, target: clean(raw.target, 120), due, createdAt: isoNow(), exemptions: [] }
    return (await repo.putDomainRecord(scoped, { collection: ASSIGNMENT, recordId: id, ownerUserId: actor.id, data: data as unknown as Record<string, unknown>, createOnly: true })).data
  }
  if (action === 'remind' || action === 'exempt') {
    const id = clean(raw.id, 160), prior = await repo.getDomainRecord<DurableAssignment>(scoped, ASSIGNMENT, id)
    if (!prior) throw new AccessError('Assignment unavailable', 404)
    if (prior.data.ownerId !== actor.id && !['broker_owner', 'managing_broker'].includes(actor.role)) throw new AccessError('Only the assignment author or brokerage leadership may change it', 403)
    if (action === 'exempt') {
      const learnerId = clean(raw.learnerId, 160)
      if (!learnerId) throw new AccessError('Choose a learner to exempt', 400)
      const data = { ...prior.data, exemptions: [...new Set([...prior.data.exemptions, learnerId])] }
      return (await repo.putDomainRecord(scoped, { collection: ASSIGNMENT, recordId: id, ownerUserId: prior.ownerUserId ?? prior.data.ownerId, data: data as unknown as Record<string, unknown>, expectedVersion: prior.version })).data
    }
    const reminderId = randomUUID(), reminder = { id: reminderId, organizationId: actor.organizationId, ownerId: actor.id, assignmentId: id, state: 'recorded', delivery: 'not-sent', recordedAt: isoNow() }
    await repo.putDomainRecord(scoped, { collection: 'academy_assignment_reminders', recordId: reminderId, ownerUserId: actor.id, data: reminder, createOnly: true })
    return reminder
  }
  if (action === 'course') {
    const id = clean(raw.id, 160) || randomUUID(), prior = await repo.getDomainRecord<DurableCourse>(scoped, COURSE, id)
    if (raw.id && !prior) throw new AccessError('Course not found', 404)
    if (prior && Number(raw.version) !== prior.version) throw new AccessError('Course changed; reload before saving', 409)
    const title = clean(raw.title, 180), description = clean(raw.body ?? raw.description, 50000), state = clean(raw.status ?? raw.state, 20) || 'draft', order = Number(raw.order || prior?.data.order || 1), prerequisite = clean(raw.prerequisite, 160)
    if (!title || !description || !Number.isInteger(order) || order < 1 || order > 1000 || !['draft', 'review', 'published', 'archived'].includes(state)) throw new AccessError('Title, course text, and a valid status are required', 400)
    if (state === 'published' && (!prior || prior.data.state !== 'review' || prior.data.ownerId === actor.id)) throw new AccessError('A different trainer or leader must review this course before publication', 403)
    if (prerequisite && !academy.courses.some(course => course.id === prerequisite) && !(await repo.getDomainRecord(scoped, COURSE, prerequisite))) throw new AccessError('Unknown prerequisite course', 400)
    const resources = Array.isArray(raw.resources) ? await Promise.all(raw.resources.slice(0, 30).map(async value => { if (typeof value !== 'object' || value === null) throw new AccessError('Invalid course resource', 400); const item = value as Record<string, unknown>, assetId = clean(item.id, 160), stored = await repo.getDomainRecord<DurableAsset>(scoped, RESOURCE, assetId); if (!stored || stored.data.organizationId !== actor.organizationId) throw new AccessError('Resource unavailable', 403); return { id: assetId, name: stored.data.filename, type: stored.data.contentType } })) : prior?.data.resources ?? []
    const data: DurableCourse = { id, organizationId: actor.organizationId, ownerId: prior?.data.ownerId ?? actor.id, title, description, category: clean(raw.category, 70) || 'AI Training', state: state as DurableCourse['state'], version: (prior?.version ?? 0) + 1, createdAt: prior?.data.createdAt ?? isoNow(), updatedAt: isoNow(), source: 'rcre-authored', order, prerequisite, resources, revisions: prior ? [...prior.data.revisions, { version: prior.version, title: prior.data.title, body: prior.data.description, at: isoNow() }] : [] }
    const saved = await repo.putDomainRecord(scoped, { collection: COURSE, recordId: id, ownerUserId: prior?.ownerUserId ?? actor.id, data: data as unknown as Record<string, unknown>, ...(prior ? { expectedVersion: prior.version } : { createOnly: true }) })
    return { ...saved.data, version: saved.version }
  }
  if (action === 'lesson') {
    const id = clean(raw.id, 160) || randomUUID(), courseId = clean(raw.courseId, 160), prior = await repo.getDomainRecord<DurableLesson>(scoped, LESSON, id)
    if (raw.id && !prior) throw new AccessError('Lesson not found', 404)
    if (prior && Number(raw.version) !== prior.version) throw new AccessError('Lesson changed; reload before saving', 409)
    const course = await repo.getDomainRecord<DurableCourse>(scoped, COURSE, courseId)
    if (!course || course.data.ownerId !== actor.id && !['broker_owner', 'managing_broker'].includes(actor.role)) throw new AccessError('Choose a course you can manage', 403)
    const title = clean(raw.title, 180), description = clean(raw.description, 10000), order = Number(raw.order || 1), status = clean(raw.status, 20) || 'draft'
    if (!title || !description || !Number.isInteger(order) || order < 1 || order > 1000 || !['draft', 'review', 'published', 'archived'].includes(status)) throw new AccessError('Lesson title, text, order, and status are required', 400)
    if (status === 'published' && (!prior || prior.data.status !== 'review' || prior.data.ownerId === actor.id)) throw new AccessError('A different trainer or leader must review this lesson before publication', 403)
    const resources = Array.isArray(raw.resources) ? await Promise.all(raw.resources.slice(0, 30).map(async value => {
      if (typeof value !== 'object' || value === null) throw new AccessError('Invalid lesson resource', 400)
      const resource = value as Record<string, unknown>, assetId = clean(resource.id, 160), stored = await repo.getDomainRecord<DurableAsset>(scoped, RESOURCE, assetId)
      if (!stored || stored.data.organizationId !== actor.organizationId) throw new AccessError('Resource unavailable', 403)
      return { id: assetId, name: stored.data.filename, contentType: stored.data.contentType, size: stored.data.size }
    })) : prior?.data.resources ?? []
    const data: DurableLesson = { id, organizationId: actor.organizationId, ownerId: prior?.data.ownerId ?? actor.id, courseId, title, description, order, status: status as DurableLesson['status'], resources, version: (prior?.version ?? 0) + 1, createdAt: prior?.data.createdAt ?? isoNow(), updatedAt: isoNow() }
    const saved = await repo.putDomainRecord(scoped, { collection: LESSON, recordId: id, ownerUserId: prior?.ownerUserId ?? actor.id, data: data as unknown as Record<string, unknown>, ...(prior ? { expectedVersion: prior.version } : { createOnly: true }) })
    return { ...saved.data, version: saved.version }
  }
  throw new AccessError('Choose a supported Training management action', 400)
}

export async function uploadAcademyAsset(actor: PlatformActor, input: { filename: string; contentType: string; bytes: Buffer; category: 'training-resource' | 'community-attachment' }, repository?: Repository) {
  if (input.category === 'training-resource' && !manager(actor)) throw new AccessError('Trainer permission required', 403)
  const repo = await repoOf(repository), scoped = ctx(actor)
  let authorized = false
  const storage = createStorageService({ authorize: (who, action, asset) => who.id === actor.id && who.organizationId === actor.organizationId && asset.category === input.category && (action === 'upload' || authorized) })
  const asset = await storage.upload({ actor: { id: actor.id, organizationId: actor.organizationId, role: actor.role }, category: input.category, visibility: 'private', filename: input.filename, contentType: input.contentType, bytes: input.bytes, persistMetadata: async value => {
    const metadata: DurableAsset = { id: value.id, organizationId: value.organizationId, ownerId: value.ownerId, filename: value.filename, contentType: value.contentType, size: value.size, category: input.category, createdAt: value.createdAt }
    await repo.putDomainRecord(scoped, { collection: input.category === 'training-resource' ? RESOURCE : 'community_attachments', recordId: value.id, ownerUserId: actor.id, data: metadata as unknown as Record<string, unknown>, createOnly: true })
  } })
  authorized = true
  return { id: asset.id, organizationId: asset.organizationId, ownerId: asset.ownerId, name: asset.filename, type: asset.contentType, contentType: asset.contentType, bytes: asset.size, size: asset.size }
}

export async function downloadAcademyAsset(actor: PlatformActor, id: string, category: 'training-resource' | 'community-attachment', repository?: Repository) {
  const repo = await repoOf(repository), scoped = ctx(actor)
  let allowed = false
  if (category === 'community-attachment') {
    if ((await repo.getDomainRecord<DurableAsset>(scoped, 'community_attachments', id))?.data.ownerId === actor.id) allowed = true
    if (!allowed) allowed = (await listCommunityDurable(actor, repo)).some(post => post.attachments.some(item => item.id === id))
  } else {
    const own = await repo.getDomainRecord<DurableAsset>(scoped, RESOURCE, id)
    allowed = Boolean(own && (own.data.ownerId === actor.id || manager(actor)))
    if (!allowed) {
      const catalog = await academyCatalog(actor, repo)
      allowed = catalog.courses.some(course => 'resources' in course && Array.isArray(course.resources) && course.resources.some((item: { id: string }) => item.id === id))
        || catalog.lessons.some(lesson => lesson.resources.some(item => item.id === id))
    }
  }
  if (!allowed) throw new AccessError('File is unavailable', 404)
  const storage = createStorageService({ authorize: (who, _action, asset) => who.id === actor.id && who.organizationId === actor.organizationId && asset.category === category && allowed })
  return storage.download({ id: actor.id, organizationId: actor.organizationId, role: actor.role }, id)
}

export async function listCommunityDurable(actor: PlatformActor, repository?: Repository): Promise<DurableCommunityPost[]> {
  const repo = await repoOf(repository), scoped = ctx(actor)
  const [posts, comments, reactions, moderation] = await Promise.all([
    repo.listDomainRecords<DurablePost>(scoped, POST, { limit: 200 }),
    repo.listDomainRecords<DurableComment>(scoped, COMMENT, { limit: 200 }),
    repo.listDomainRecords<DurableReaction>(scoped, REACTION, { limit: 200 }),
    repo.listDomainRecords<DurableModeration>(scoped, MODERATION, { limit: 200 }),
  ])
  return posts.map(row => {
    const post = row.data
    const latest = moderation.map(item => item.data).filter(item => item.postId === post.id).sort((a, b) => b.at.localeCompare(a.at))
    const removed = latest.find(item => item.kind === 'remove')?.value === true
    if (removed) return null
    return { ...post, comments: comments.map(item => item.data).filter(comment => comment.postId === post.id), likes: reactions.map(item => item.data).filter(reaction => reaction.postId === post.id).map(reaction => reaction.ownerId), pinned: latest.find(item => item.kind === 'pin')?.value === true }
  }).filter((post): post is DurableCommunityPost => Boolean(post && !('deleted' in post && post.deleted === true) && (!post.draft || post.ownerId === actor.id || communityManager(actor))))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
}

export async function communityActionDurable(actor: PlatformActor, raw: Record<string, unknown>, repository?: Repository) {
  const repo = await repoOf(repository), scoped = ctx(actor), action = clean(raw.action, 20)
  if (action === 'create') {
    const title = clean(raw.title, 180), body = clean(raw.body, 10000), category = clean(raw.category, 80) || 'General Discussion'
    if (!title || !body) throw new AccessError('Add a title and message', 400)
    const attachmentIds = Array.isArray(raw.attachments) ? raw.attachments.map(value => clean(value, 160)).filter(Boolean).slice(0, 8) : []
    const attachments = [] as { id: string; name: string }[]
    for (const attachmentId of attachmentIds) {
      const row = await repo.getDomainRecord<DurableAsset>(scoped, 'community_attachments', attachmentId)
      if (!row || row.data.ownerId !== actor.id || row.data.organizationId !== actor.organizationId) throw new AccessError('Attachment unavailable', 403)
      attachments.push({ id: attachmentId, name: row.data.filename })
    }
    const id = randomUUID(), data: DurablePost = { id, organizationId: actor.organizationId, ownerId: actor.id, author: actor.name, category, title, body, lessonId: clean(raw.lessonId, 160), draft: raw.draft === true, createdAt: isoNow(), attachments }
    await repo.putDomainRecord(scoped, { collection: POST, recordId: id, ownerUserId: actor.id, data: data as unknown as Record<string, unknown>, createOnly: true })
    return data
  }
  const id = clean(raw.id, 160), postRow = await repo.getDomainRecord<DurablePost>(scoped, POST, id)
  if (!postRow || postRow.data.organizationId !== actor.organizationId || postRow.data.draft && postRow.data.ownerId !== actor.id && !communityManager(actor)) throw new AccessError('Post unavailable', 404)
  if (action === 'comment') {
    const body = clean(raw.body, 5000)
    if (!body) throw new AccessError('Write a comment', 400)
    const comment: DurableComment = { id: randomUUID(), organizationId: actor.organizationId, postId: id, ownerId: actor.id, author: actor.name, body, at: isoNow() }
    await repo.putDomainRecord(scoped, { collection: COMMENT, recordId: comment.id, ownerUserId: actor.id, data: comment as unknown as Record<string, unknown>, createOnly: true })
    return comment
  }
  if (action === 'like') {
    const reactionId = `${id}:${actor.id}`, old = await repo.getDomainRecord<DurableReaction>(scoped, REACTION, reactionId)
    if (old) await repo.deleteDomainRecord(scoped, REACTION, reactionId)
    else await repo.putDomainRecord(scoped, { collection: REACTION, recordId: reactionId, ownerUserId: actor.id, data: { id: reactionId, organizationId: actor.organizationId, postId: id, ownerId: actor.id, kind: 'like', createdAt: isoNow() }, createOnly: true })
    return { id, liked: !old }
  }
  if (action === 'edit' && postRow.data.ownerId === actor.id) {
    const title = clean(raw.title, 180), body = clean(raw.body, 10000)
    if (!title || !body) throw new AccessError('Write a title and message', 400)
    const updated = { ...postRow.data, title, body, draft: raw.draft === true }
    await repo.putDomainRecord(scoped, { collection: POST, recordId: id, ownerUserId: actor.id, data: updated as unknown as Record<string, unknown>, expectedVersion: postRow.version })
    return updated
  }
  if (action === 'pin' || action === 'delete') {
    if (!communityManager(actor) && postRow.data.ownerId !== actor.id) throw new AccessError('Moderator permission required', 403)
    if (action === 'delete' && postRow.data.ownerId === actor.id) {
      await repo.putDomainRecord(scoped, { collection: POST, recordId: id, ownerUserId: actor.id, data: { ...postRow.data, draft: true, deleted: true, updatedAt: isoNow() } as unknown as Record<string, unknown>, expectedVersion: postRow.version })
      return { id }
    }
    const priorEvents = (await repo.listDomainRecords<DurableModeration>(scoped, MODERATION, { limit: 200 })).map(row => row.data).filter(row => row.postId === id && row.kind === (action === 'pin' ? 'pin' : 'remove')).sort((a, b) => b.at.localeCompare(a.at))
    const event: DurableModeration = { id: randomUUID(), organizationId: actor.organizationId, postId: id, ownerId: actor.id, kind: action === 'pin' ? 'pin' : 'remove', value: action === 'pin' ? !(priorEvents[0]?.value ?? false) : true, at: isoNow() }
    await repo.putDomainRecord(scoped, { collection: MODERATION, recordId: event.id, ownerUserId: actor.id, data: event as unknown as Record<string, unknown>, createOnly: true })
    return { id, [action === 'pin' ? 'pinned' : 'removed']: event.value }
  }
  throw new AccessError('Unsupported Community action', 400)
}

export function youtubeVideoId(value: string) {
  let url: URL
  try { url = new URL(value) } catch { throw new AccessError('Enter a valid YouTube URL', 400) }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname)) throw new AccessError('Use a secure YouTube URL', 400)
  const parts = url.pathname.split('/').filter(Boolean)
  const id = url.hostname === 'youtu.be' ? parts[0] : url.pathname === '/watch' ? url.searchParams.get('v') : null
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new AccessError('Enter a standard YouTube watch link', 400)
  return { id, url: `https://www.youtube.com/watch?v=${id}` }
}

export async function communityYoutubeRead(actor: PlatformActor, repository?: Repository) {
  if (!communityManager(actor)) throw new AccessError('Community management permission required', 403)
  const repo = await repoOf(repository), scoped = ctx(actor)
  const [config, runs] = await Promise.all([
    repo.getDomainRecord<Record<string, unknown>>(scoped, YOUTUBE_CONFIG, actor.organizationId),
    repo.listDomainRecords<Record<string, unknown>>(scoped, YOUTUBE_RUN, { limit: 100 }),
  ])
  return { config: config?.data ?? { id: actor.organizationId, organizationId: actor.organizationId, sourceType: 'channel', sourceUrl: '', category: 'RCRE Updates', defaultDraft: true, status: 'not_connected', version: 0 }, runs: runs.map(row => row.data).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) }
}

export async function saveCommunityYoutubeConfigDurable(actor: PlatformActor, raw: Record<string, unknown>, repository?: Repository) {
  if (!communityManager(actor)) throw new AccessError('Community management permission required', 403)
  const sourceType = raw.sourceType === 'playlist' ? 'playlist' : 'channel', sourceUrl = clean(raw.sourceUrl, 500), category = clean(raw.category, 80)
  if (sourceUrl) {
    const url = new URL(sourceUrl)
    if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com'].includes(url.hostname) || url.username || url.password || url.port) throw new AccessError('Enter a YouTube channel or playlist URL', 400)
    if (sourceType === 'playlist' && (url.pathname !== '/playlist' || !url.searchParams.get('list'))) throw new AccessError('Enter a valid playlist URL', 400)
    if (sourceType === 'channel' && !/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/?$/.test(url.pathname)) throw new AccessError('Enter a channel URL', 400)
  }
  const repo = await repoOf(repository), scoped = ctx(actor), prior = await repo.getDomainRecord<Record<string, unknown>>(scoped, YOUTUBE_CONFIG, actor.organizationId)
  if (Number(raw.version ?? 0) !== (prior?.version ?? 0)) throw new AccessError('YouTube settings changed; reload before saving', 409)
  const data = { id: actor.organizationId, organizationId: actor.organizationId, ownerId: prior?.data.ownerId ?? actor.id, sourceType, sourceUrl, category: category || 'RCRE Updates', defaultDraft: true, status: 'not_connected', updatedAt: isoNow() }
  const saved = await repo.putDomainRecord(scoped, { collection: YOUTUBE_CONFIG, recordId: actor.organizationId, ownerUserId: prior?.ownerUserId ?? actor.id, data, ...(prior ? { expectedVersion: prior.version } : {}) })
  return { ...saved.data, version: saved.version }
}

export async function runCommunityYoutubeDemoDurable(actor: PlatformActor, raw: Record<string, unknown>, repository?: Repository) {
  if (!communityManager(actor)) throw new AccessError('Community management permission required', 403)
  if (process.env.RCRE_DEMO_ENABLED !== '1' && process.env.NODE_ENV === 'production') throw new AccessError('Manual video import is not enabled', 403)
  const { id: videoId, url: watchUrl } = youtubeVideoId(clean(raw.watchUrl, 500)), title = clean(raw.title, 180), summary = clean(raw.summary, 5000), discussionPrompt = clean(raw.discussionPrompt, 500)
  if (!title || !summary || !discussionPrompt) throw new AccessError('Provide a title, summary, and discussion prompt', 400)
  const repo = await repoOf(repository), scoped = ctx(actor), runId = videoId
  const existing = await repo.getDomainRecord<Record<string, unknown>>(scoped, YOUTUBE_RUN, runId)
  if (existing) return { duplicate: true, postId: existing.data.postId, run: existing.data }
  const now = isoNow(), postId = randomUUID(), category = clean(raw.category, 80) || 'RCRE Updates'
  const post: DurablePost = { id: postId, organizationId: actor.organizationId, ownerId: actor.id, author: actor.name, category, title, body: `${summary}\n\n${discussionPrompt}`, lessonId: '', draft: true, createdAt: now, attachments: [], video: { provider: 'youtube', videoId, title, summary, watchUrl, discussionPrompt, source: 'manual_approved_metadata' } }
  const run = { id: runId, organizationId: actor.organizationId, videoId, postId, title, sourceUrl: watchUrl, createdAt: now, status: 'draft_created', externalSideEffects: false }
  try {
    await repo.putDomainRecordsAtomic(scoped, [
      { collection: POST, recordId: postId, ownerUserId: actor.id, data: post as unknown as Record<string, unknown>, createOnly: true },
      { collection: YOUTUBE_RUN, recordId: runId, ownerUserId: actor.id, data: run, createOnly: true },
    ])
  } catch (error) {
    const duplicate = await repo.getDomainRecord<Record<string, unknown>>(scoped, YOUTUBE_RUN, runId)
    if (duplicate) return { duplicate: true, postId: duplicate.data.postId, run: duplicate.data }
    throw error
  }
  return { duplicate: false, postId, run, post }
}

export async function publishYoutubeDraft(actor: PlatformActor, postId: string, repository?: Repository) {
  if (!communityManager(actor)) throw new AccessError('Community management permission required', 403)
  const repo = await repoOf(repository), scoped = ctx(actor), row = await repo.getDomainRecord<DurablePost>(scoped, POST, postId)
  if (!row || !row.data.video) throw new AccessError('Video draft unavailable', 404)
  const updated = { ...row.data, draft: false, publishedAt: isoNow(), publishedBy: actor.id }
  await repo.putDomainRecord(scoped, { collection: POST, recordId: postId, ownerUserId: row.ownerUserId ?? actor.id, data: updated as unknown as Record<string, unknown>, expectedVersion: row.version })
  return updated
}
