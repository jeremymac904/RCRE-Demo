import { randomUUID } from 'node:crypto'
import { can, type PlatformActor } from './platform/auth'
import { getRecord, putRecord, readRecords, transaction } from './platform/store'
import { academyConfig } from './academy-service'
import type { Post } from './academy-community'

export type YoutubeSourceType = 'channel' | 'playlist'
export interface CommunityYoutubeConfig {
  id: string
  organizationId: string
  sourceType: YoutubeSourceType
  sourceUrl: string
  category: string
  defaultDraft: true
  status: 'not_connected'
  version: number
  updatedAt?: string
}
export interface CommunityYoutubeRun {
  id: string
  organizationId: string
  videoId: string
  postId: string
  title: string
  sourceUrl: string
  createdAt: string
  status: 'draft_created'
}
export interface CommunityVideo {
  provider: 'youtube'
  videoId: string
  title: string
  summary: string
  watchUrl: string
  thumbnailUrl?: string
  discussionPrompt: string
  source: 'manual_approved_metadata'
}

export function communityYoutubeAdmin(actor: PlatformActor): boolean {
  return can(actor, 'community.manage')
}

function requireAdmin(actor: PlatformActor): void {
  if (!communityYoutubeAdmin(actor)) throw new Error('Community management permission required')
}

function safeYouTubeUrl(value: unknown): URL {
  let url: URL
  try { url = new URL(String(value ?? '')) } catch { throw new Error('Enter a valid YouTube URL') }
  if (url.protocol !== 'https:' || url.port || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname) || url.username || url.password) {
    throw new Error('Use a secure youtube.com or youtu.be URL')
  }
  return url
}

function parseVideoUrl(value: unknown): { url: string; id: string } {
  const url = safeYouTubeUrl(value)
  const shortPath = url.pathname.split('/').filter(Boolean)
  const id = url.hostname === 'youtu.be'
    ? (shortPath.length === 1 ? shortPath[0] : undefined)
    : url.pathname === '/watch' ? url.searchParams.get('v') ?? undefined : undefined
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Enter a standard YouTube watch link with an 11-character video ID')
  return { url: `https://www.youtube.com/watch?v=${id}`, id }
}

export function communityYoutubeConfig(actor: PlatformActor): CommunityYoutubeConfig {
  requireAdmin(actor)
  return getRecord<CommunityYoutubeConfig>('community_youtube_config', actor.organizationId) ?? {
    id: actor.organizationId, organizationId: actor.organizationId, sourceType: 'channel', sourceUrl: '',
    category: academyConfig(actor.organizationId).categories[0] ?? 'RCRE Updates', defaultDraft: true,
    status: 'not_connected', version: 0,
  }
}

export function saveCommunityYoutubeConfig(actor: PlatformActor, input: { sourceType: YoutubeSourceType; sourceUrl: string; category: string; version: number }): CommunityYoutubeConfig {
  requireAdmin(actor)
  if (!['channel', 'playlist'].includes(input.sourceType)) throw new Error('Choose a YouTube channel or playlist')
  const url = input.sourceUrl.trim() ? safeYouTubeUrl(input.sourceUrl) : undefined
  if (input.sourceUrl.trim() && !url) throw new Error('Enter a valid YouTube source URL')
  if (url?.hostname === 'youtu.be') throw new Error('Use a channel or playlist URL, not a video URL')
  if (input.sourceType === 'playlist' && (!url || url.pathname !== '/playlist' || !url.searchParams.get('list'))) throw new Error('Choose a YouTube playlist URL with a playlist ID')
  if (input.sourceType === 'channel' && url && !/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)$/.test(url.pathname.replace(/\/$/, ''))) throw new Error('Choose a YouTube channel URL')
  const categories = academyConfig(actor.organizationId).categories
  if (!categories.includes(input.category)) throw new Error('Choose an available Community category')
  return transaction(() => {
    const current = getRecord<CommunityYoutubeConfig>('community_youtube_config', actor.organizationId) ?? communityYoutubeConfig(actor)
    if (current.version !== input.version) throw new Error('YouTube source settings changed; reload before saving')
    return putRecord('community_youtube_config', {
      id: actor.organizationId, organizationId: actor.organizationId, sourceType: input.sourceType,
      sourceUrl: url?.toString() ?? '', category: input.category, defaultDraft: true, status: 'not_connected',
      version: current.version + 1, updatedAt: new Date().toISOString(),
    })
  })
}

export function communityYoutubeRuns(actor: PlatformActor): CommunityYoutubeRun[] {
  requireAdmin(actor)
  return readRecords<CommunityYoutubeRun>('community_youtube_run')
    .filter(run => run.organizationId === actor.organizationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)
}

/** Manual, fixture-safe run. It never fetches YouTube; all metadata is supplied by the reviewer. */
export function runCommunityYoutubeDemo(actor: PlatformActor, input: { title: string; summary: string; watchUrl: string; discussionPrompt: string; category?: string }) {
  requireAdmin(actor)
  if (process.env.RCRE_DEMO_ENABLED !== '1') throw new Error('Demo automation is disabled; no Community post was created')
  const videoLink = parseVideoUrl(input.watchUrl)
  const title = String(input.title ?? '').trim().slice(0, 180)
  const summary = String(input.summary ?? '').trim().slice(0, 5000)
  const discussionPrompt = String(input.discussionPrompt ?? '').trim().slice(0, 500)
  if (!title || !summary || !discussionPrompt) throw new Error('Provide a title, summary, and discussion prompt')
  const config = communityYoutubeConfig(actor)
  const category = input.category || config.category
  if (!academyConfig(actor.organizationId).categories.includes(category)) throw new Error('Choose an available Community category')
  const runId = `${actor.organizationId}:${videoLink.id}`
  return transaction(() => {
    const existing = getRecord<CommunityYoutubeRun>('community_youtube_run', runId)
    if (existing) return { duplicate: true, postId: existing.postId, run: existing }
    const createdAt = new Date().toISOString()
    const video: CommunityVideo = {
      provider: 'youtube', videoId: videoLink.id, title, summary,
      watchUrl: videoLink.url,
      discussionPrompt, source: 'manual_approved_metadata',
    }
    const post = putRecord<Post>('community_post', {
      id: randomUUID(), organizationId: actor.organizationId, ownerId: actor.id, author: actor.name,
      attachments: [], category, title, body: `${summary}\n\n${discussionPrompt}`, lessonId: '', draft: true,
      pinned: false, createdAt, likes: [], comments: [], video,
    })
    const run: CommunityYoutubeRun = {
      id: runId, organizationId: actor.organizationId, videoId: videoLink.id,
      postId: post.id, title, sourceUrl: videoLink.url, createdAt, status: 'draft_created',
    }
    putRecord('community_youtube_run', run)
    return { duplicate: false, postId: post.id, run }
  })
}
