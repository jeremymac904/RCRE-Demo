import 'server-only'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import type { Repository, Actor, DomainRecordInput } from '@/lib/db/repository'
import type { AuditEvent } from '@/lib/domain-types'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { createStorageService, StorageError, type StorageAsset } from '@/lib/storage'
import type { PlatformActor } from './auth'
import { AccessError, assertCapability } from './auth'
import { canEditMarketing } from './service'
import { listMarketingDurable } from './marketing-durable'
import type { LibraryAsset } from './library'

export type DurableLibraryAsset = LibraryAsset & Pick<StorageAsset, 'provider' | 'visibility' | 'category'> & { officeId?: string } & { officeId?: string }
const metadataSchema = z.object({
  source: z.string().max(1000).default('Not supplied — rights review required'),
  license: z.string().max(500).default('Not supplied'),
  tags: z.string().max(500).default(''),
  market: z.enum(['Both markets', 'Alabama', 'Florida']).default('Both markets'),
  audience: z.string().max(500).default('Not specified'),
  contentId: z.string().max(100).default(''),
})
const context = (actor: PlatformActor): Actor => ({ userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role), officeId: actor.officeId })
const canEditAsset = (actor: PlatformActor, asset: DurableLibraryAsset) => !asset.archived && canEditMarketing(actor, asset)
async function canReadAsset(actor: PlatformActor, asset: DurableLibraryAsset, repository: Repository) {
  if (asset.archived) return false
  if (canEditMarketing(actor, asset)) return true
  const campaigns = await listMarketingDurable(actor, repository)
  return campaigns.some(campaign => campaign.assetIds?.includes(asset.id))
}

function storage(actor: PlatformActor, repository: Repository) {
  const scoped = context(actor)
  return createStorageService({
    authorize: async (who, action, asset) => {
      if (who.organizationId !== actor.organizationId || asset.organizationId !== actor.organizationId || asset.category !== 'marketing-asset') return false
      if (action === 'upload') return who.id === actor.id && canEditMarketing(actor, { organizationId: actor.organizationId, ownerId: actor.id, officeId: actor.officeId })
      const prior = await repository.getDomainRecord<DurableLibraryAsset>(scoped, 'marketing_assets', asset.id)
      return Boolean(prior && await canReadAsset(actor, prior.data, repository))
    },
  })
}

export async function listLibraryAssetsDurable(actor: PlatformActor, repository?: Repository) {
  assertCapability(actor, 'marketing')
  const repo = repository ?? await getRepository()
  const scoped = context(actor)
  const [assets, campaigns] = await Promise.all([
    repo.listDomainRecords<DurableLibraryAsset>(scoped, 'marketing_assets', { limit: 500 }),
    listMarketingDurable(actor, repo),
  ])
  const linkedIds = new Set(campaigns.flatMap(campaign => campaign.assetIds ?? []))
  return assets.map(row => ({ ...row.data, version: row.version, editable: canEditMarketing(actor, row.data) })).filter(asset => !asset.archived && (canEditMarketing(actor, asset) || linkedIds.has(asset.id)))
}

export async function uploadLibraryAssetDurable(actor: PlatformActor, input: { filename: string; contentType: string; bytes: Buffer; previousId?: string; metadata?: unknown }, repository?: Repository) {
  assertCapability(actor, 'marketing')
  const repo = repository ?? await getRepository()
  const scoped = context(actor)
  const metadata = metadataSchema.parse(input.metadata ?? {})
  const assets = await listLibraryAssetsDurable(actor, repo)
  const prior = input.previousId ? assets.find(asset => asset.id === input.previousId && asset.editable) : undefined
  if (input.previousId && !prior) throw new AccessError('Asset not found or outside your edit scope', 404)
  const campaigns = await listMarketingDurable(actor, repo)
  const campaign = metadata.contentId ? campaigns.find(row => row.id === metadata.contentId) : undefined
  if (metadata.contentId && !campaign) throw new AccessError('Related content is outside your edit scope', 404)
  const service = storage(actor, repo)
  let saved: DurableLibraryAsset | undefined
  const stored = await service.upload({
    actor: { id: actor.id, organizationId: actor.organizationId, role: actor.role },
    category: 'marketing-asset', visibility: 'private', filename: input.filename, contentType: input.contentType, bytes: input.bytes,
    persistMetadata: async object => {
      const row: DurableLibraryAsset = {
        ...metadata, id: object.id, organizationId: actor.organizationId, ownerId: prior?.ownerId ?? actor.id,
        officeId: prior?.officeId ?? actor.officeId, name: object.filename, mime: object.contentType, size: object.size,
        sha256: object.sha256, version: (prior?.version ?? 0) + 1, previousId: prior?.id ?? null,
        createdAt: object.createdAt, archived: false, category: object.category, visibility: object.visibility, provider: object.provider,
      }
      const inputs: DomainRecordInput[] = [{ collection: 'marketing_assets', recordId: object.id, ownerUserId: actor.id, data: row as unknown as Record<string, unknown>, createOnly: true }]
      const audits: AuditEvent[] = [{ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'marketing.asset-uploaded', targetType: 'marketing_asset', targetId: object.id, effect: 'write', allowed: true, detail: { contentType: object.contentType, bytes: object.size, sha256: object.sha256 } }]
      if (campaign) {
        const current = await repo.getDomainRecord<Record<string, unknown>>(scoped, 'marketing_campaigns', campaign.id)
        if (!current || current.version !== campaign.version) throw new AccessError('Marketing content changed; reload before attaching this asset', 409)
        const existingIds = Array.isArray(current.data.assetIds) ? current.data.assetIds.filter((value): value is string => typeof value === 'string') : []
        inputs.push({ collection: 'marketing_campaigns', recordId: campaign.id, ownerUserId: current.ownerUserId ?? actor.id, data: { ...current.data, assetIds: [...new Set([...existingIds, object.id])], status: 'draft', approvedBy: null, approvedVersion: null, version: current.version + 1, updatedAt: new Date().toISOString() }, expectedVersion: current.version })
        audits.push({ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user' as const, action: 'marketing.asset-attached', targetType: 'marketing_campaign', targetId: campaign.id, effect: 'write' as const, allowed: true })
      }
      await repo.putDomainRecordsAtomic(scoped, inputs, audits)
      saved = row
    },
  })
  if (!saved || saved.id !== stored.id) throw new StorageError('Asset metadata was not committed')
  return { ...saved, version: saved.version }
}

export async function downloadLibraryAssetDurable(actor: PlatformActor, id: string, repository?: Repository) {
  assertCapability(actor, 'marketing')
  const repo = repository ?? await getRepository()
  const result = await storage(actor, repo).download({ id: actor.id, organizationId: actor.organizationId, role: actor.role }, id)
  const row = await repo.getDomainRecord<DurableLibraryAsset>(context(actor), 'marketing_assets', id)
  if (!row || !await canReadAsset(actor, row.data, repo)) throw new AccessError('Asset not found', 404)
  return { asset: row.data, bytes: result.bytes }
}

export async function archiveLibraryAssetDurable(actor: PlatformActor, id: string, repository?: Repository) {
  assertCapability(actor, 'marketing')
  const repo = repository ?? await getRepository()
  const scoped = context(actor)
  const prior = await repo.getDomainRecord<DurableLibraryAsset>(scoped, 'marketing_assets', id)
  if (!prior || !canEditAsset(actor, prior.data)) throw new AccessError('Asset not found', 404)
  if (prior.data.archived) return { archived: true }
  await repo.putDomainRecordsAtomic(scoped, [{ collection: 'marketing_assets', recordId: id, ownerUserId: prior.ownerUserId, data: { ...prior.data, archived: true }, expectedVersion: prior.version }], [{ organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'marketing.asset-archived', targetType: 'marketing_asset', targetId: id, effect: 'write', allowed: true }])
  return { archived: true }
}

export function productionLibraryDispatch() {
  return { processed: 0, externalMessagesSent: 0, message: 'Delivery is unavailable until an approved provider is configured.' }
}
