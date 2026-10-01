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
const batchInput = z.object({ title: z.string().trim().min(1).max(200), ids: z.array(z.string().min(1).max(200)).min(1).max(30) }).strict()

type Campaign = z.infer<typeof schema> & { organizationId: string; ownerId: string; officeId: string; approvedBy: string | null; approvedVersion: number | null; updatedAt: string }
const repoActor = (actor: PlatformActor): Actor => ({ userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role), officeId: actor.officeId })
const logEvent = (actor: Actor, action: string, target: string): AuditEvent => ({ organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action, targetType: 'marketing_campaign', targetId: target, effect: 'write', allowed: true })
const batchEvent = (actor: Actor, action: string, target: string): AuditEvent => ({ organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action, targetType: 'marketing_batch', targetId: target, effect: 'write', allowed: true })

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
  if (input.status === 'approved') {
    const organizationPolicy = await repo.getDomainRecord<Record<string, unknown>>(scoped, 'platform_settings', 'brokerage:organization')
    const officePolicy = actor.officeId ? await repo.getDomainRecord<Record<string, unknown>>(scoped, 'platform_settings', `brokerage:${actor.officeId}`) : null
    const owners = String((organizationPolicy?.data ?? officePolicy?.data ?? {}).contentOwners ?? '').split(',').map(value => value.trim()).filter(Boolean)
    if (owners.length && !owners.includes(actor.id)) throw new AccessError('Brokerage policy assigns content review to designated owners', 403)
  }
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


type CampaignBatch = { id: string; organizationId: string; ownerId: string; officeId: string; title: string; contentIds: string[]; createdAt: string; version: number; status?: string; updatedAt?: string }

function canEditBatch(actor: PlatformActor, batch: CampaignBatch) {
  return batch.organizationId === actor.organizationId && (
    ['broker_owner', 'managing_broker', 'marketing_admin'].includes(actor.role)
    || actor.role === 'team_leader' && batch.officeId === actor.officeId
    || batch.ownerId === actor.id
  )
}

/** List persisted batch work and only include campaign summaries the caller may read. */
export async function listMarketingBatchesDurable(actor: PlatformActor, repository?: Repository) {
  assertCapability(actor, 'marketing')
  const repo = repository ?? await getRepository()
  const scoped = repoActor(actor)
  const [batches, campaigns] = await Promise.all([
    repo.listDomainRecords<CampaignBatch>(scoped, 'marketing_batches', { limit: 100 }),
    listMarketingDurable(actor, repo),
  ])
  const byId = new Map(campaigns.map(campaign => [campaign.id, campaign]))
  return batches.map(row => row.data).filter(batch => canEditBatch(actor, batch)).map(batch => ({
    ...batch,
    contents: batch.contentIds.flatMap(id => {
      const campaign = byId.get(id)
      return campaign ? [{ id: campaign.id, title: campaign.title, status: campaign.status, version: campaign.version }] : []
    }),
  }))
}

/** Create a durable batch of draft copies; this never schedules or sends content. */
export async function createMarketingBatchDurable(actor: PlatformActor, raw: unknown, repository?: Repository) {
  assertCapability(actor, 'marketing')
  const input = batchInput.parse(raw)
  const ids = [...new Set(input.ids)]
  const repo = repository ?? await getRepository()
  const scoped = repoActor(actor)
  const readable = new Map((await listMarketingDurable(actor, repo)).map(campaign => [campaign.id, campaign]))
  const sources = ids.map(id => readable.get(id))
  if (sources.some(source => !source)) throw new AccessError('A selected content item is not available', 404)
  const batchId = randomUUID()
  const now = new Date().toISOString()
  const copies = sources.map(source => ({
    ...source!, id: randomUUID(), ownerId: actor.id, officeId: actor.officeId,
    title: source!.title + ' — batch draft', status: 'draft' as const, version: 1,
    approvedBy: null, approvedVersion: null, scheduleAt: undefined,
    sourceContentId: source!.id, updatedAt: now,
  }))
  const batch: CampaignBatch = { id: batchId, organizationId: actor.organizationId, ownerId: actor.id, officeId: actor.officeId, title: input.title, contentIds: copies.map(copy => copy.id), createdAt: now, version: 1, status: 'draft' }
  await repo.putDomainRecordsAtomic(scoped, [
    ...copies.map(copy => ({ collection: 'marketing_campaigns', recordId: copy.id, ownerUserId: actor.id, data: copy as unknown as Record<string, unknown>, createOnly: true })),
    { collection: 'marketing_batches', recordId: batchId, ownerUserId: actor.id, data: batch as unknown as Record<string, unknown>, createOnly: true },
  ], [batchEvent(scoped, 'marketing.batch_created', batchId)])
  return { ...batch, contents: copies.map(({ id, title, status, version }) => ({ id, title, status, version })) }
}

/** Pause/cancel a batch locally. Scheduled intents are marked canceled; no provider is called. */
export async function updateMarketingBatchDurable(actor: PlatformActor, raw: unknown, repository?: Repository) {
  assertCapability(actor, 'marketing')
  const input = z.object({ action: z.enum(['pause', 'cancel']), id: z.string().uuid(), version: z.number().int().positive() }).strict().parse(raw)
  const repo = repository ?? await getRepository()
  const scoped = repoActor(actor)
  const record = await repo.getDomainRecord<CampaignBatch>(scoped, 'marketing_batches', input.id)
  if (!record || !canEditBatch(actor, record.data)) throw new AccessError('Batch not found', 404)
  if (record.version !== input.version) throw new AccessError('Batch changed; reload before updating', 409)
  const campaigns = await Promise.all(record.data.contentIds.map(id => repo.getDomainRecord<Campaign>(scoped, 'marketing_campaigns', id)))
  if (campaigns.some(row => !row || !visible(actor, row.data))) throw new AccessError('A batch item is no longer available', 409)
  const targetStatus = input.action === 'pause' ? 'paused' : 'canceled'
  const now = new Date().toISOString()
  const updates: Array<{ collection: string; recordId: string; ownerUserId: string; data: Record<string, unknown>; expectedVersion: number }> = campaigns.map(row => {
    const old = row!
    const next = { ...old.data, status: targetStatus, version: old.version + 1, updatedAt: now }
    return { collection: 'marketing_campaigns', recordId: old.recordId, ownerUserId: old.ownerUserId ?? actor.id, data: next as unknown as Record<string, unknown>, expectedVersion: old.version }
  })
  const scheduleUpdates = await Promise.all(campaigns.map(row => row!.data.approvedVersion ? repo.getDomainRecord<Record<string, unknown>>(scoped, 'marketing_schedule', `${row!.recordId}:${row!.data.approvedVersion}`) : null))
  scheduleUpdates.forEach(schedule => {
    if (!schedule || !['awaiting provider configuration', 'ready for authorized external delivery'].includes(String(schedule.data.state))) return
    updates.push({ collection: 'marketing_schedule', recordId: schedule.recordId, ownerUserId: schedule.ownerUserId ?? actor.id, data: { ...schedule.data, state: 'canceled locally', canceledAt: now, canceledBy: actor.id }, expectedVersion: schedule.version })
  })
  const batch = { ...record.data, version: record.version + 1, updatedAt: now, status: targetStatus }
  updates.push({ collection: 'marketing_batches', recordId: record.recordId, ownerUserId: record.ownerUserId ?? actor.id, data: batch as unknown as Record<string, unknown>, expectedVersion: record.version })
  await repo.putDomainRecordsAtomic(scoped, updates, [batchEvent(scoped, `marketing.batch_${input.action}`, input.id)])
  return { ...batch, updated: campaigns.length, externalMessagesSent: 0 }
}
