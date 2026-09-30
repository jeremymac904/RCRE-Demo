import 'server-only'
import { z } from 'zod'
import type { Actor, Repository } from '@/lib/db/repository'
import { getRepository } from '@/lib/db'
import { AccessError, type PlatformActor } from './auth'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'

const safeSocialUrl = z.string().url().max(300).refine(value => value.startsWith('https://'), 'Social links must use HTTPS').or(z.literal(''))
export const onboardingInput = z.object({
  phone: z.string().trim().max(80).default(''),
  professionalTitle: z.string().trim().max(100).default(''),
  officeId: z.string().trim().max(100).default(''),
  licenses: z.array(z.object({ state: z.enum(['Alabama', 'Florida']), number: z.string().trim().min(1).max(100) })).max(10).default([]),
  markets: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  specialties: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  biography: z.string().trim().max(5000).default(''),
  socialLinks: z.object({ instagram: safeSocialUrl.default(''), facebook: safeSocialUrl.default(''), linkedin: safeSocialUrl.default('') }).default({}),
  websiteTemplate: z.enum(['signature', 'luxury', 'rural-land', 'investor', 'urban-modern', 'suburban-family', 'new-construction', 'historic-heritage']).default('signature'),
  websiteSlug: z.string().regex(/^[a-z0-9-]{3,80}$/).optional().or(z.literal('')),
  steps: z.object({ identityConfirmed: z.boolean().default(false), profileReviewed: z.boolean().default(false), licenseReviewed: z.boolean().default(false), marketsReviewed: z.boolean().default(false), websiteSelected: z.boolean().default(false) }).default({}),
  version: z.number().int().min(0).optional(),
})
export type OnboardingProfile = z.infer<typeof onboardingInput> & { verifiedPersonId: string | null; headshotAssetId?: string; publicVisible?: boolean }
export type OnboardingRecord = OnboardingProfile & { id: string; organizationId: string; memberId: string; savedAt: string; headshotAssetId?: string; publicVisible?: boolean }

export function repositoryActor(actor: PlatformActor): Actor {
  return { userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role) }
}

function emptyProfile(): OnboardingProfile {
  return { phone: '', professionalTitle: '', officeId: '', licenses: [], markets: [], specialties: [], biography: '', socialLinks: { instagram: '', facebook: '', linkedin: '' }, websiteTemplate: 'signature', websiteSlug: '', steps: { identityConfirmed: false, profileReviewed: false, licenseReviewed: false, marketsReviewed: false, websiteSelected: false }, version: 0, verifiedPersonId: null }
}

export async function loadOnboarding(actor: PlatformActor, repository?: Repository) {
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const [stored, member] = await Promise.all([
    repo.getDomainRecord<OnboardingRecord>(context, 'member_profiles', actor.id),
    repo.getUser(context, actor.id),
  ])
  const profile = stored?.data ?? emptyProfile()
  return { profile, displayName: member?.fullName ?? actor.name, photoUploaded: Boolean(profile.headshotAssetId), persistence: 'durable-repository' as const }
}

export async function saveOnboarding(actor: PlatformActor, raw: unknown, repository?: Repository) {
  const value = onboardingInput.parse(raw)
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const prior = await repo.getDomainRecord<OnboardingRecord>(context, 'member_profiles', actor.id)
  const currentVersion = prior?.version ?? 0
  if (value.version !== undefined && value.version !== currentVersion) throw new AccessError('Onboarding changed in another session; reload before saving', 409)
  const oldData = prior?.data ?? emptyProfile()
  const record: OnboardingRecord = {
    ...oldData, ...value, officeId: actor.officeId, id: actor.id, organizationId: actor.organizationId, memberId: actor.id,
    // Only a trusted directory/auth mapping may establish the canonical person link.
    verifiedPersonId: oldData.verifiedPersonId ?? null,
    version: currentVersion + 1, savedAt: new Date().toISOString(),
  }
  await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: record as unknown as Record<string, unknown>, ...(prior ? { expectedVersion: prior.version } : {}) })
  await repo.recordAudit(context, { organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'onboarding.progress-saved', targetType: 'member_profile', targetId: actor.id, effect: 'write', allowed: true, detail: { completedSteps: Object.values(record.steps).filter(Boolean).length } })
  return record
}

export async function saveHeadshot(actor: PlatformActor, file: { bytes: Buffer; contentType: string; filename: string }, repository?: Repository) {
  const { createStorageService } = await import('@/lib/storage')
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const storage = createStorageService({ authorize: (who, action, asset) => who.organizationId === actor.organizationId && (asset.ownerId === actor.id || ((actor.role === 'broker_owner' || actor.role === 'managing_broker') && action === 'download')) })
  const asset = await storage.upload({ actor: { id: actor.id, organizationId: actor.organizationId, role: actor.role }, category: 'agent-headshot', visibility: 'private', filename: file.filename, contentType: file.contentType, bytes: file.bytes })
  try {
    const prior = await repo.getDomainRecord<OnboardingRecord>(context, 'member_profiles', actor.id)
    const profile = prior?.data ?? ({ ...emptyProfile(), id: actor.id, memberId: actor.id, organizationId: actor.organizationId, savedAt: new Date().toISOString() } as OnboardingRecord)
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: { ...profile, headshotAssetId: asset.id, version: (prior?.version ?? 0) + 1, savedAt: new Date().toISOString() }, ...(prior ? { expectedVersion: prior.version } : {}) })
    await repo.recordAudit(context, { organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'onboarding.headshot-uploaded', targetType: 'member_profile', targetId: actor.id, effect: 'write', allowed: true, detail: { assetId: asset.id, contentType: asset.contentType, size: asset.size } })
    if (prior?.data.headshotAssetId) await storage.delete({ id: actor.id, organizationId: actor.organizationId, role: actor.role }, prior.data.headshotAssetId)
  } catch (error) {
    await storage.delete({ id: actor.id, organizationId: actor.organizationId, role: actor.role }, asset.id).catch(() => undefined)
    throw error
  }
  return asset
}

export async function downloadHeadshot(actor: PlatformActor, assetId: string) {
  const { createStorageService } = await import('@/lib/storage')
  const context = repositoryActor(actor)
  const storage = createStorageService({ authorize: (who, action, asset) => who.organizationId === actor.organizationId && (asset.ownerId === actor.id || ((actor.role === 'broker_owner' || actor.role === 'managing_broker') && action === 'download')) })
  return storage.download({ id: actor.id, organizationId: actor.organizationId, role: actor.role }, assetId)
}

export async function removeHeadshot(actor: PlatformActor, repository?: Repository) {
  const repo = repository ?? await getRepository()
  const context = repositoryActor(actor)
  const prior = await repo.getDomainRecord<OnboardingRecord>(context, 'member_profiles', actor.id)
  if (!prior?.data.headshotAssetId) return false
  const { createStorageService } = await import('@/lib/storage')
  const storage = createStorageService({ authorize: (who, _action, asset) => who.organizationId === actor.organizationId && asset.ownerId === actor.id })
  const { headshotAssetId: _removed, ...data } = prior.data
  await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: { ...data, version: (prior.version ?? 0) + 1, savedAt: new Date().toISOString() } as unknown as Record<string, unknown>, expectedVersion: prior.version })
  await repo.recordAudit(context, { organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user', action: 'onboarding.headshot-removed', targetType: 'member_profile', targetId: actor.id, effect: 'write', allowed: true })
  await storage.delete({ id: actor.id, organizationId: actor.organizationId, role: actor.role }, prior.data.headshotAssetId)
  return true
}
