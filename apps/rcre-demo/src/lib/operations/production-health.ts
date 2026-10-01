import 'server-only'
import type { Repository, Actor } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { getSettingDurable } from '@/lib/platform/settings-durable'

export function repositoryActor(actor: PlatformActor): Actor {
  return { userId: actor.id, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role), officeId: actor.officeId }
}

/** Reports only values backed by the configured repository. No backups or worker health are inferred. */
export async function productionHealthSnapshot(actor: PlatformActor, repository: Repository, checkedAt = new Date()) {
  const scope = repositoryActor(actor)
  const [inbox, outbox, errors, auditSetting] = await Promise.all([
    repository.listDomainRecords<Record<string, unknown>>(scope, 'notification_inbox', { limit: 200 }),
    repository.listDomainRecords<Record<string, unknown>>(scope, 'notification_outbox', { limit: 200 }),
    repository.listDomainRecords<Record<string, unknown>>(scope, 'operational_errors', { limit: 25 }),
    getSettingDurable(actor, 'audit', repository),
  ])
  const states = outbox.map(record => record.data.state).filter((state): state is string => typeof state === 'string')
  const delivered = states.filter(state => state === 'accepted_by_provider').length
  const failed = states.filter(state => state === 'failed').length
  const queued = states.filter(state => ['queued', 'retry_wait', 'sending'].includes(state)).length
  const auditValue = auditSetting.value
  const reviewDays = typeof auditValue.reviewDays === 'number' && Number.isFinite(auditValue.reviewDays)
    ? Math.max(1, Math.min(3650, Math.trunc(auditValue.reviewDays))) : null
  const safeErrors = errors.map(record => {
    const data = record.data
    return {
      occurredAt: typeof data.occurredAt === 'string' ? data.occurredAt : null,
      category: typeof data.category === 'string' ? data.category : 'unknown',
      errorCode: typeof data.errorCode === 'string' ? data.errorCode : 'UNKNOWN_ERROR',
      route: typeof data.route === 'string' ? data.route : null,
      status: typeof data.status === 'number' ? data.status : null,
    }
  })
  return {
    checkedAt: checkedAt.toISOString(),
    worker: { status: 'not_configured', lastRun: null, fresh: false, note: 'No durable scheduled-worker heartbeat is registered.' },
    notifications: {
      inApp: { status: 'database_backed', visibleRecords: inbox.length, scope: 'actor-visible, latest 200' },
      email: { status: 'outbox_only', queued, failed, acceptedByProvider: delivered, scope: 'actor-visible, latest 200', deliveryVerified: false },
    },
    auditPolicy: {
      status: auditSetting.version > 0 ? 'configured' : 'not_configured',
      reviewDays,
      version: auditSetting.version,
      retentionExecution: 'not_verified',
    },
    backups: { status: 'not_verified', source: 'database-provider operations', note: 'Backup and restore health are not exposed by the application database.' },
    operationalErrors: { visibleRecords: safeErrors.length, scope: 'actor-visible, latest 25', records: safeErrors },
  }
}
