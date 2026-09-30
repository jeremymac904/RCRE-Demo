import 'server-only'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { getRepository } from '@/lib/db'
import { DomainRecordConflictError, type Actor, type DomainRecord, type Repository } from '@/lib/db/repository'
import type { AuditEvent } from '@/lib/domain-types'

const eventTypes = [
  'new_lead', 'lead_assignment', 'overdue_task', 'appointment', 'transaction_deadline',
  'training_assignment', 'invitation', 'website_lead', 'approval', 'system',
] as const
const channelSchema = z.enum(['in_app', 'email'])
const createSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(200),
  eventType: z.enum(eventTypes),
  channel: channelSchema.default('in_app'),
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().max(2000).optional(),
  href: z.string().trim().max(500).optional(),
  source: z.string().trim().min(1).max(80).default('RCRE'),
})
const preferenceSchema = z.object({
  inAppEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(false),
  eventTypes: z.record(z.string(), z.boolean()).default({}),
}).strict()

type EventType = typeof eventTypes[number]
export type NotificationPreferences = z.infer<typeof preferenceSchema>
export type DurableNotification = {
  id: string; organizationId: string; ownerUserId: string; eventType: EventType; channel: 'in_app' | 'email'
  title: string; body?: string; href?: string; source: string; createdAt: string; readAt: string | null
  deliveryState: 'queued' | 'suppressed'; idempotencyKeyHash: string
}
export type NotificationOutbox = {
  id: string; organizationId: string; ownerUserId: string; notificationId: string; eventType: EventType
  channel: 'in_app' | 'email'; state: 'queued' | 'retry_wait' | 'failed' | 'accepted_by_provider' | 'suppressed'
  attempts: number; maxAttempts: number; nextAttemptAt: string; lastFailureCode: string | null
  providerReceipt: string | null; createdAt: string; updatedAt: string
}

export class NotificationAccessError extends Error {
  constructor(message = 'Notification is unavailable') { super(message); this.name = 'NotificationAccessError' }
}

const INBOX = 'notification_inbox'
const PREFERENCES = 'notification_preferences'
const OUTBOX = 'notification_outbox'
const wholeOrgRoles = new Set<Actor['role']>(['owner', 'broker'])
function canManageOtherOwner(actor: Actor): boolean { return wholeOrgRoles.has(actor.role) }
function audit(actor: Actor, action: string, targetId: string, detail?: Record<string, unknown>): AuditEvent {
  return { organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action,
    targetType: 'notification', targetId, effect: 'write', allowed: true, ...(detail ? { detail } : {}) }
}
function stableId(kind: string, actor: Actor, key: string): string {
  return createHash('sha256').update(`${kind}\0${actor.organizationId}\0${actor.userId}\0${key}`).digest('hex')
}
function rows<T extends Record<string, unknown>>(records: DomainRecord<T>[]): T[] {
  return records.map(record => record.data)
}
function defaultPreferences(): NotificationPreferences {
  return { inAppEnabled: true, emailEnabled: false, eventTypes: {} }
}

/**
 * PostgreSQL-backed notification inbox and outbox domain service. It records
 * work durably; it does not send email or claim provider delivery. Domain
 * records are tenant/owner scoped by Repository and RLS.
 */
export class DurableNotificationService {
  constructor(private readonly repository?: Repository, private readonly now: () => Date = () => new Date()) {}
  private async db() { return this.repository ?? await getRepository() }

  async list(actor: Actor, options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}): Promise<DurableNotification[]> {
    const limit = Math.max(1, Math.min(options.limit ?? 50, 100))
    const offset = Math.max(0, options.offset ?? 0)
    const records = await (await this.db()).listDomainRecords<DurableNotification>(actor, INBOX, { limit: 200, offset: 0 })
    return rows(records).filter(row => row.organizationId === actor.organizationId
      && (row.ownerUserId === actor.userId || canManageOtherOwner(actor))
      && (!options.unreadOnly || row.readAt === null))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
      .slice(offset, offset + limit)
  }

  async preferences(actor: Actor): Promise<NotificationPreferences> {
    const repo = await this.db()
    const record = await repo.getDomainRecord<NotificationPreferences>(actor, PREFERENCES, actor.userId)
    if (record) return preferenceSchema.parse(record.data)
    // Keep the existing account Settings control authoritative when a separate
    // notification-preferences record has not been created yet.
    const settings = await repo.getDomainRecord<Record<string, unknown>>(actor, 'platform_settings', `personal:${actor.userId}`)
    if (!settings) return defaultPreferences()
    return preferenceSchema.parse({
      inAppEnabled: settings.data.inAppNotifications !== false,
      emailEnabled: false,
      eventTypes: {},
    })
  }

  async updatePreferences(actor: Actor, raw: unknown, expectedVersion?: number): Promise<NotificationPreferences> {
    const input = preferenceSchema.parse(raw)
    const repo = await this.db()
    const old = await repo.getDomainRecord<NotificationPreferences>(actor, PREFERENCES, actor.userId)
    if (expectedVersion !== undefined && (old?.version ?? 0) !== expectedVersion) throw new Error('Preferences changed; reload before saving')
    const result = await repo.putDomainRecordsAtomic(actor, [{ collection: PREFERENCES, recordId: actor.userId,
      ownerUserId: actor.userId, data: input as unknown as Record<string, unknown>,
      ...(old ? { expectedVersion: old.version } : { createOnly: true }) }], [audit(actor, 'notification.preferences_updated', actor.userId)])
    return preferenceSchema.parse(result[0].data)
  }

  async enqueue(actor: Actor, raw: unknown, options: { recipientUserId?: string; maxAttempts?: number } = {}): Promise<{ notification: DurableNotification; outbox: NotificationOutbox; duplicate: boolean }> {
    const input = createSchema.parse(raw)
    const recipientUserId = options.recipientUserId ?? actor.userId
    if (recipientUserId !== actor.userId && !canManageOtherOwner(actor)) throw new NotificationAccessError('Only brokerage administrators may enqueue for another user')
    const idempotencyKeyHash = stableId('idempotency', { ...actor, userId: recipientUserId }, input.idempotencyKey)
    const notificationId = stableId('inbox', { ...actor, userId: recipientUserId }, input.idempotencyKey)
    const outboxId = stableId('outbox', { ...actor, userId: recipientUserId }, input.idempotencyKey)
    const repo = await this.db()
    const recipientActor = recipientUserId === actor.userId ? actor : actor
    const priorNotification = await repo.getDomainRecord<DurableNotification>(recipientActor, INBOX, notificationId)
    const priorOutbox = await repo.getDomainRecord<NotificationOutbox>(recipientActor, OUTBOX, outboxId)
    if (priorNotification && priorOutbox) return { notification: priorNotification.data, outbox: priorOutbox.data, duplicate: true }

    const preferences = await this.preferences({ ...actor, userId: recipientUserId })
    const enabled = preferences.eventTypes[input.eventType] !== false
      && (input.channel === 'in_app' ? preferences.inAppEnabled : preferences.emailEnabled)
    const now = this.now().toISOString()
    const notification: DurableNotification = {
      id: notificationId, organizationId: actor.organizationId, ownerUserId: recipientUserId,
      eventType: input.eventType, channel: input.channel, title: input.title,
      ...(input.body ? { body: input.body } : {}), ...(input.href ? { href: input.href } : {}),
      source: input.source, createdAt: now, readAt: null, deliveryState: enabled ? 'queued' : 'suppressed', idempotencyKeyHash,
    }
    const outbox: NotificationOutbox = {
      id: outboxId, organizationId: actor.organizationId, ownerUserId: recipientUserId,
      notificationId, eventType: input.eventType, channel: input.channel, state: enabled ? 'queued' : 'suppressed',
      attempts: 0, maxAttempts: Math.max(1, Math.min(options.maxAttempts ?? 5, 12)),
      nextAttemptAt: now, lastFailureCode: null, providerReceipt: null, createdAt: now, updatedAt: now,
    }
    try {
      await repo.putDomainRecordsAtomic(actor, [
        { collection: INBOX, recordId: notificationId, ownerUserId: recipientUserId, data: notification as unknown as Record<string, unknown>, createOnly: true },
        { collection: OUTBOX, recordId: outboxId, ownerUserId: recipientUserId, data: outbox as unknown as Record<string, unknown>, createOnly: true },
      ], [audit(actor, enabled ? 'notification.queued' : 'notification.suppressed', notificationId, { channel: input.channel, eventType: input.eventType })])
    } catch (error) {
      if (!(error instanceof DomainRecordConflictError)) throw error
      const existingNotification = await repo.getDomainRecord<DurableNotification>(recipientActor, INBOX, notificationId)
      const existingOutbox = await repo.getDomainRecord<NotificationOutbox>(recipientActor, OUTBOX, outboxId)
      if (existingNotification && existingOutbox) return { notification: existingNotification.data, outbox: existingOutbox.data, duplicate: true }
      throw error
    }
    return { notification, outbox, duplicate: false }
  }

  async listOutbox(actor: Actor, options: { limit?: number; offset?: number } = {}): Promise<NotificationOutbox[]> {
    const limit = Math.max(1, Math.min(options.limit ?? 50, 100))
    const offset = Math.max(0, options.offset ?? 0)
    const records = await (await this.db()).listDomainRecords<NotificationOutbox>(actor, OUTBOX, { limit: 200, offset: 0 })
    return rows(records).filter(row => row.organizationId === actor.organizationId
      && (row.ownerUserId === actor.userId || canManageOtherOwner(actor)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
      .slice(offset, offset + limit)
  }

  async markRead(actor: Actor, id: string, expectedVersion?: number): Promise<DurableNotification> {
    const repo = await this.db(), existing = await repo.getDomainRecord<DurableNotification>(actor, INBOX, id)
    if (!existing || (existing.data.ownerUserId !== actor.userId && !canManageOtherOwner(actor))) throw new NotificationAccessError()
    if (expectedVersion !== undefined && existing.version !== expectedVersion) throw new Error('Notification changed; reload before saving')
    if (existing.data.readAt) return existing.data
    const updated = { ...existing.data, readAt: this.now().toISOString() }
    const result = await repo.putDomainRecordsAtomic(actor, [{ collection: INBOX, recordId: id,
      ownerUserId: existing.ownerUserId, data: updated as unknown as Record<string, unknown>, expectedVersion: existing.version }],
    [audit(actor, 'notification.read', id)])
    return result[0].data as unknown as DurableNotification
  }

  /** Record a failed attempt without leaking provider text or claiming delivery. */
  async recordFailure(actor: Actor, id: string, failureCode: string, retryAt?: string): Promise<NotificationOutbox> {
    if (!/^[a-z0-9_.-]{1,80}$/i.test(failureCode)) throw new TypeError('Failure code must be a safe identifier')
    const repo = await this.db(), existing = await repo.getDomainRecord<NotificationOutbox>(actor, OUTBOX, id)
    if (!existing || (existing.data.ownerUserId !== actor.userId && !canManageOtherOwner(actor))) throw new NotificationAccessError()
    const row = existing.data
    if (['accepted_by_provider', 'suppressed'].includes(row.state)) throw new Error('This notification is not retryable')
    const attempts = row.attempts + 1
    const mayRetry = attempts < row.maxAttempts
    if (retryAt && (!Number.isFinite(Date.parse(retryAt)) || Date.parse(retryAt) <= this.now().getTime())) throw new TypeError('Retry time must be in the future')
    const nextAttemptAt = retryAt ? new Date(retryAt).toISOString() : new Date(this.now().getTime() + Math.min(60 * 60_000, 30_000 * 2 ** Math.min(attempts, 7))).toISOString()
    const updated: NotificationOutbox = { ...row, attempts, lastFailureCode: failureCode,
      state: mayRetry ? 'retry_wait' : 'failed', nextAttemptAt: mayRetry ? nextAttemptAt : '', updatedAt: this.now().toISOString() }
    const saved = await repo.putDomainRecordsAtomic(actor, [{ collection: OUTBOX, recordId: id,
      ownerUserId: existing.ownerUserId, data: updated as unknown as Record<string, unknown>, expectedVersion: existing.version }],
    [audit(actor, mayRetry ? 'notification.retry_scheduled' : 'notification.failed', id, { attempt: attempts, failureCode })])
    return saved[0].data as unknown as NotificationOutbox
  }

  /** Store a provider receipt as accepted; acceptance is not proof of delivery. */
  async recordProviderAccepted(actor: Actor, id: string, receipt: string): Promise<NotificationOutbox> {
    if (!receipt.trim() || receipt.length > 240) throw new TypeError('Provider receipt is invalid')
    const repo = await this.db(), existing = await repo.getDomainRecord<NotificationOutbox>(actor, OUTBOX, id)
    if (!existing || (existing.data.ownerUserId !== actor.userId && !canManageOtherOwner(actor))) throw new NotificationAccessError()
    const updated: NotificationOutbox = { ...existing.data, state: 'accepted_by_provider', providerReceipt: receipt.trim(), lastFailureCode: null, updatedAt: this.now().toISOString() }
    const saved = await repo.putDomainRecordsAtomic(actor, [{ collection: OUTBOX, recordId: id,
      ownerUserId: existing.ownerUserId, data: updated as unknown as Record<string, unknown>, expectedVersion: existing.version }],
    [audit(actor, 'notification.provider_accepted', id)])
    return saved[0].data as unknown as NotificationOutbox
  }
}

export function durableNotifications(repository?: Repository) { return new DurableNotificationService(repository) }
