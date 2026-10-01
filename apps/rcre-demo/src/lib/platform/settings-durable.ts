import 'server-only'
import { randomUUID } from 'node:crypto'
import { getRepository } from '@/lib/db'
import type { Repository, Actor } from '@/lib/db/repository'
import type { AuditEvent } from '@/lib/domain-types'
import { settingsSchema } from './settings'
import { AccessError, assertCapability, type PlatformActor } from './auth'

export type DurableSetting = { id: string; value: Record<string, unknown>; version: number }
const personalGroups = new Set(['personal', 'account', 'ai'])

function durableActor(actor: PlatformActor): Actor {
  const role: Actor['role'] = actor.role === 'broker_owner' ? 'owner'
    : actor.role === 'managing_broker' ? 'broker'
      : actor.role === 'team_leader' ? 'team_lead'
        : actor.role === 'transaction_coordinator' ? 'transaction_coordinator'
          : actor.role === 'marketing_admin' ? 'marketing_admin'
            : actor.role === 'trainer' ? 'trainer' : 'agent'
  return { userId: actor.id, organizationId: actor.organizationId, role }
}

function settingId(actor: PlatformActor, group: string) {
  const scope = personalGroups.has(group) ? actor.id : group === 'leads'
    ? actor.role === 'broker_owner' ? 'organization' : actor.officeId
    : actor.role === 'broker_owner' ? 'organization' : actor.officeId || actor.id
  return `${group}:${scope}`
}

function validateGroup(group: string) {
  if (!['personal','account','brokerage','people','leads','transactions','ai','integrations','marketing','academy','website','audit'].includes(group)) {
    throw new AccessError('Unknown settings group', 400)
  }
}

export async function getSettingDurable(actor: PlatformActor, group: string, repository?: Repository): Promise<DurableSetting> {
  validateGroup(group)
  assertCapability(actor, `settings.${group}`)
  const context = durableActor(actor), repo = repository ?? await getRepository()
  const id = settingId(actor, group)
  const record = await repo.getDomainRecord<Record<string, unknown>>(context, 'platform_settings', id)
  return record
    ? { id, value: record.data, version: record.version }
    : { id, value: {}, version: 0 }
}

export async function saveSettingDurable(actor: PlatformActor, group: string, raw: Record<string, unknown>, version: number, repository?: Repository): Promise<DurableSetting> {
  validateGroup(group)
  assertCapability(actor, `settings.${group}`)
  if (!Number.isInteger(version) || version < 0) throw new AccessError('Invalid settings version', 400)
  const value = settingsSchema[group] ? settingsSchema[group].parse(raw) as Record<string, unknown> : raw
  if (group === 'brokerage' && value.workStart && value.workEnd && value.workEnd <= value.workStart) {
    throw new AccessError('Working hours must end after they start', 400)
  }
  const context = durableActor(actor), repo = repository ?? await getRepository()
  const id = settingId(actor, group)
  const current = await repo.getDomainRecord<Record<string, unknown>>(context, 'platform_settings', id)
  if ((current?.version ?? 0) !== version) throw new AccessError('Settings changed; reload and retry.', 409)
  const audit: AuditEvent = {
    organizationId: actor.organizationId, actorUserId: actor.id, actorKind: 'user',
    action: 'platform-setting.updated', targetType: 'platform-setting', targetId: id,
    effect: 'write', allowed: true, detail: { group, version: version + 1 },
  }
  const saved = await repo.putDomainRecordsAtomic(context, [{
    collection: 'platform_settings', recordId: id,
    ownerUserId: personalGroups.has(group) ? actor.id : actor.id,
    data: value, ...(current ? { expectedVersion: version } : { createOnly: true }),
  }], [audit])
  return { id, value: saved[0].data, version: saved[0].version }
}
