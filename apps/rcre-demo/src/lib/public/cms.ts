import 'server-only'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import { isProduction } from '@/lib/config/env'
import { getRecord } from '@/lib/platform/store'
import type { Repository } from '@/lib/db/repository'
import { assertCapability, AccessError, type PlatformActor } from '@/lib/platform/auth'
import { repositoryActor } from '@/lib/platform/onboarding'
import { validatePublicRedirect } from './redirects'
import { publicRoutes, type PublicContent, type PublishedContent } from './content'

const allowedPath = (path: string) => publicRoutes.includes(path) || /^\/(blog|resources|pages)\/[a-z0-9]+(?:[a-z0-9/-]*[a-z0-9])?$/.test(path)
export const publicContentMutationSchema = z.object({
  redirectTo: z.string().max(240).optional(),
  profile: z.object({ phone: z.string().min(1).max(80), email: z.string().email(), license: z.string().min(1).max(160), market: z.enum(['Alabama', 'Florida', 'Alabama & Florida']) }).optional(),
  schema: z.object({ authorName: z.string().trim().max(180), datePublished: z.string().refine(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Use a real calendar date.') }).optional(),
  noIndex: z.boolean().optional(), id: z.string().refine(allowedPath, 'Use an existing public route or /blog, /resources, or /pages with a lowercase slug.'),
  revision: z.number().int().min(0), title: z.string().trim().min(1).max(180), description: z.string().trim().max(500),
  body: z.string().trim().min(1).max(50000), status: z.enum(['draft', 'published', 'archived']), seoTitle: z.string().max(180).optional(),
  canonical: z.string().refine(value => !value || /^https:\/\/rcregroup\.com(?:\/[a-z0-9/_-]*)?$/.test(value), 'Canonical must be an RCRE public URL.').optional(),
  image: z.object({ src: z.enum(['', '/brand/people/julio-arango.jpg', '/brand/people/taquilla-allen.jpg', '/brand/rcre-logo-dark.png', '/brand/rcre-logo-light.png']), alt: z.string().max(250) }).refine(image => !image.src || !!image.alt.trim(), 'An image needs useful alternative text.').optional(),
  navigation: z.object({ visible: z.boolean(), label: z.string().max(40), order: z.number().int().min(0).max(99) }).refine(nav => !nav.visible || !!nav.label.trim(), 'Visible navigation needs a label.').optional(),
}).strict()
export type PublicContentMutation = z.infer<typeof publicContentMutationSchema>

async function allCmsRows(actor: PlatformActor, repository: Repository) {
  const context = repositoryActor(actor), rows: PublicContent[] = []
  for (let offset = 0; ; offset += 200) {
    const page = await repository.listDomainRecords<PublicContent & Record<string, unknown>>(context, 'public_content', { limit: 200, offset })
    rows.push(...page.map(row => row.data))
    if (page.length < 200) break
  }
  return rows
}

export async function listPublicContentForAdmin(actor: PlatformActor, repository?: Repository): Promise<PublicContent[]> {
  assertCapability(actor, 'cms')
  return allCmsRows(actor, repository ?? await getRepository())
}

/** Read a saved draft for the private preview surface without consulting ephemeral storage in production. */
export async function getPublicContentPreview(actor: PlatformActor, path: string, repository?: Repository): Promise<PublicContent | null> {
  assertCapability(actor, 'cms')
  if (!path.startsWith('/') || path.length > 240) return null
  if (isProduction) return (await listPublicContentForAdmin(actor, repository)).find(row => row.id === path) ?? null
  const row = getRecord<PublicContent>('public_content', path)
  return row && (!row.organizationId || row.organizationId === actor.organizationId) ? row : null
}

export async function savePublicContent(actor: PlatformActor, value: PublicContentMutation, repository?: Repository): Promise<PublicContent> {
  assertCapability(actor, 'cms')
  const repo = repository ?? await getRepository(), context = repositoryActor(actor)
  const existing = await repo.getDomainRecord<PublicContent & Record<string, unknown>>(context, 'public_content', value.id)
  const old = existing?.data
  if (old && old.organizationId !== actor.organizationId) throw new AccessError('Content unavailable', 404)
  if ((Number(old?.revision) || 0) !== value.revision) throw new AccessError('This content changed in another session. Reload before saving.', 409)
  const rows = await allCmsRows(actor, repo)
  if (value.redirectTo && value.status !== 'archived') validatePublicRedirect(value.id, value.redirectTo, rows)
  if (value.profile && !value.id.startsWith('/agent/')) throw new AccessError('Profile fields belong to an agent page.', 400)
  if (value.schema && !value.id.startsWith('/blog/')) throw new AccessError('Article schema fields belong to an article page.', 400)
  const snapshot: PublishedContent = {
    redirectTo: value.redirectTo, profile: value.profile, schema: value.schema, noIndex: value.noIndex,
    title: value.title, description: value.description, body: value.body, seoTitle: value.seoTitle,
    canonical: value.canonical, image: value.image, navigation: value.navigation,
  }
  const next: PublicContent = {
    ...snapshot, id: value.id, organizationId: actor.organizationId, status: value.status,
    revision: value.revision + 1,
    history: [...(old?.history ?? []), ...(old ? [{ redirectTo: old.redirectTo, profile: old.profile, schema: old.schema, noIndex: old.noIndex,
      title: old.title, description: old.description, body: old.body, seoTitle: old.seoTitle, canonical: old.canonical,
      image: old.image, navigation: old.navigation, revision: old.revision }] : [])].slice(-40),
    published: value.status === 'published' ? snapshot : value.status === 'archived' ? undefined : old?.published,
  }
  const auditEvent = { organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user' as const, action: 'website.' + value.status, targetType: 'public_content', targetId: value.id, effect: 'write' as const, allowed: true, detail: { revision: next.revision, status: next.status } }
  try {
    await repo.putDomainRecordsAtomic(context, [{
      collection: 'public_content', recordId: value.id, ownerUserId: null,
      data: next as unknown as Record<string, unknown>,
      ...(existing ? { expectedVersion: existing.version } : { createOnly: true }),
    }], [auditEvent])
  } catch (error) {
    if (error instanceof Error && (/version conflict|record owner is outside/i.test(error.message) || 'collection' in error)) {
      throw new AccessError('This content changed in another session. Reload before saving.', 409)
    }
    throw error
  }
  return next
}
