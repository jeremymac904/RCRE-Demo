import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import type { PlatformActor } from './auth'
import { AccessError, assertCapability, can, scopedOwner } from './auth'
import type { Actor, Repository } from '@/lib/db/repository'
import type { AuditEvent } from '@/lib/domain-types'

const schema = z.object({
  id: z.string().optional(), version: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(300), body: z.string().trim().min(1).max(20_000),
  channel: z.string().trim().min(1).max(100), workflow: z.string().trim().min(1).max(100),
  status: z.enum(['draft', 'review', 'approved', 'scheduled', 'paused', 'canceled', 'archived']),
  scheduleAt: z.string().datetime().optional(), tags: z.string().max(1000).optional(),
  audience: z.string().max(500).optional(), market: z.string().max(150).optional(),
  source: z.string().max(1000).optional(), license: z.string().max(500).optional(),
  listingId: z.string().max(100).optional(), assetIds: z.array(z.string().max(200)).max(30).optional(),
}).strict()

type Campaign = z.infer<typeof schema> & { organizationId: string; ownerId: string; officeId: string; approvedBy: string | null; approvedVersion: number | null; updatedAt: string }
const repoActor = (actor: PlatformActor): Actor => ({ userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role) })
const logEvent = (actor: Actor, action: string, target: string): AuditEvent => ({ organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action, targetType: 'marketing_campaign', targetId: target, effect: 'write', allowed: true })

function visible(actor: PlatformActor, row: Campaign): boolean {
  if (row.organizationId !== actor.organizationId) return false
  if (['broker_owner', 'managing_broker', 'marketing_admin'].includes(actor.role)) return true
  if (actor.role === 'team_leader') return row.officeId === actor.officeId
  return row.ownerId === actor.id
}

export async function listMarketingDurable(actor: PlatformActor, repository?: Repository): Promise<Campaign[]> {
  assertCapability(actor, 'marketing')
  const rows = await (repository ?? await getRepository()).listDomainRecords<Campaign>(repoActor(actor), 'marketing_campaigns', { limit: 200 })
  return rows.map(row => ({ ...row.data, version: row.version })).filter(row => visible(actor, row))
}

export async function saveMarketingDurable(actor: PlatformActor, raw: unknown, repository?: Repository): Promise<Campaign> {
  assertCapability(actor, 'marketing')
  const input = schema.parse(raw)
  const repo = repository ?? await getRepository()
  const scoped = repoActor(actor)
  const id = input.id ?? randomUUID()
  const oldRecord = await repo.getDomainRecord<Campaign>(scoped, 'marketing_campaigns', id)
  const old = oldRecord?.data
  if (old && !visible(actor, old)) throw new AccessError('Content is outside your scope', 404)
  if (oldRecord && oldRecord.version !== input.version) throw new AccessError('Content changed; reload before saving', 409)
  if (!old && input.id) throw new AccessError('Content not found', 404)
  if (['approved', 'scheduled'].includes(input.status) && !['broker_owner', 'managing_broker', 'marketing_admin'].includes(actor.role)) throw new AccessError('A reviewer must approve this content version', 403)
  if (input.status === 'scheduled' && (!old || old.status !== 'approved' || old.approvedVersion !== oldRecord.version || old.title !== input.title || old.body !== input.body)) throw new AccessError('Approve this exact content version before scheduling', 409)
  if (input.status === 'scheduled' && (!input.scheduleAt || Date.parse(input.scheduleAt) <= Date.now())) throw new AccessError('Choose a future schedule time', 400)
  if (input.listingId) {
    if (!can(actor, 'crm')) throw new AccessError('You cannot associate a listing', 403)
    const listing = await repo.getDomainRecord<Record<string, unknown>>(scoped, 'crm_listings', input.listingId)
    if (!listing || !scopedOwner(actor, String(listing.data.agentId ?? ''), String(listing.data.officeId ?? ''))) throw new AccessError('Related listing is outside your scope', 404)
  }
  const contentChanged = old && ['title', 'body', 'channel', 'workflow', 'tags', 'audience', 'market', 'source', 'license', 'listingId', 'assetIds'].some(key => JSON.stringify(old[key as keyof Campaign] ?? '') !== JSON.stringify(input[key as keyof typeof input] ?? ''))
  const invalidatesApproval = Boolean(contentChanged && old?.approvedVersion)
  const version = (oldRecord?.version ?? 0) + 1
  const updated: Campaign = {
    ...input, id, version, organizationId: actor.organizationId, ownerId: old?.ownerId ?? actor.id, officeId: old?.officeId ?? actor.officeId,
    status: invalidatesApproval ? 'draft' : input.status, approvedBy: invalidatesApproval ? null : input.status === 'approved' ? actor.id : old?.approvedBy ?? null,
    approvedVersion: invalidatesApproval ? null : input.status === 'approved' ? version : old?.approvedVersion ?? null,
    updatedAt: new Date().toISOString(),
  }
  const inputs = [{ collection: 'marketing_campaigns', recordId: id, ownerUserId: oldRecord?.ownerUserId ?? actor.id, data: updated as unknown as Record<string, unknown>, ...(oldRecord ? { expectedVersion: oldRecord.version } : { createOnly: true }) }]
  if (updated.status === 'scheduled') {
    const payloadHash = createHash('sha256').update(JSON.stringify({ title: updated.title, body: updated.body, channel: updated.channel, workflow: updated.workflow, tags: updated.tags, audience: updated.audience, market: updated.market, source: updated.source, listingId: updated.listingId, assetIds: updated.assetIds })).digest('hex')
    inputs.push({ collection: 'marketing_schedule', recordId: `${id}:${updated.approvedVersion}`, ownerUserId: actor.id, data: { id: `${id}:${updated.approvedVersion}`, campaignId: id, version: updated.approvedVersion, payloadHash, scheduledAt: updated.scheduleAt, state: 'awaiting provider configuration' } as unknown as Record<string, unknown>, createOnly: true })
  }
  await repo.putDomainRecordsAtomic(scoped, inputs, [logEvent(scoped, `marketing.${updated.status}`, id)])
  return { ...updated, version }
}
