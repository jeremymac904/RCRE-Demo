import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { getRepository } from '@/lib/db'
import type { Actor, Repository } from '@/lib/db/repository'
import { configuredMailTransport, type MailTransport } from '@/lib/auth/mail'
import { durableNotifications } from './notifications-durable'
import { enqueueScheduledOperationalNotices } from './notification-producers'
import { recordOperationalFailure } from '@/lib/operations/operational-errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BATCH = 50

type JobConfig = { secret?: string; organizationId?: string; workerUserId?: string }
type Dependencies = {
  config?: JobConfig
  getRepository?: () => Promise<Repository>
  getTransport?: () => MailTransport | null
  processBatch?: (actor: Actor, transport: MailTransport, limit: number) => Promise<{ processed: number; accepted: number; retried: number; failed: number; receiptPending: number }>
  produceScheduledNotices?: (actor: Actor, repository: Repository) => Promise<{ tasks: number; appointments: number; transactionDeadlines: number; approvals: number }>
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function validBearer(request: Request, secret: string | undefined): boolean {
  const supplied = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? ''
  if (!secret || secret.length < 32 || !supplied) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(secret), digest(supplied))
}

function requestedLimit(request: Request): number | null {
  const raw = new URL(request.url).searchParams.get('limit')
  if (raw === null || raw === '') return 20
  if (!/^\d{1,3}$/.test(raw)) return null
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_BATCH ? parsed : null
}

/**
 * Server-only, bounded notification worker entry point. It requires a dedicated
 * strong job secret and active brokerage owner/broker service identity. It may
 * enqueue in-app reminders even while mail is unconfigured; actual email delivery
 * remains delegated to the configured idempotent provider adapter.
 */
export async function handleDurableNotificationJob(request: Request, deps: Dependencies = {}) {
  if (request.method !== 'POST' || !validBearer(request, deps.config?.secret ?? process.env.RCRE_NOTIFICATION_JOB_SECRET)) {
    return json({ error: 'Not found.' }, 404)
  }
  if (Number(request.headers.get('content-length') ?? 0) > 1024) return json({ error: 'Request is too large.' }, 413)
  const limit = requestedLimit(request)
  if (limit === null) return json({ error: 'Batch limit must be from 1 to 50.' }, 400)

  const organizationId = deps.config?.organizationId ?? process.env.RCRE_ORGANIZATION_ID
  const workerUserId = deps.config?.workerUserId ?? process.env.RCRE_NOTIFICATION_WORKER_ID
  if (!organizationId || !UUID.test(organizationId) || !workerUserId || !UUID.test(workerUserId)) {
    return json({ state: 'waiting_for_worker_configuration' }, 503)
  }
  let reportingRepository: Repository | null = null
  let reportingActor: Actor | null = null
  try {
    const repository = await (deps.getRepository ?? getRepository)()
    reportingRepository = repository
    // Broker scope is required to consume brokerage outbox rows. The ID comes
    // only from server configuration; validate its persisted, active identity
    // before using that scope, then retain the actual persisted admin role.
    const provisional: Actor = { userId: workerUserId, organizationId, role: 'broker' }
    const user = await repository.getUser(provisional, workerUserId)
    if (!user || !user.isActive || user.organizationId !== organizationId || !['owner', 'broker'].includes(user.role)) {
      return json({ state: 'waiting_for_worker_configuration' }, 503)
    }
    const actor: Actor = { ...provisional, role: user.role }
    reportingActor = actor
    const scheduled = await (deps.produceScheduledNotices ?? enqueueScheduledOperationalNotices)(actor, repository)
    const transport = (deps.getTransport ?? configuredMailTransport)()
    if (!transport) return json({ state: 'waiting_for_mail_configuration', scheduled }, 503)
    const processBatch = deps.processBatch ?? ((scope, mail, batchLimit) =>
      durableNotifications(repository).processEmailBatch(scope, mail, { limit: batchLimit }))
    const result = await processBatch(actor, transport, limit)
    return json({ state: 'processed', scheduled, ...result })
  } catch (error) {
    if (reportingRepository && reportingActor) {
      await recordOperationalFailure(reportingRepository, reportingActor, {
        category: 'notification_failure', route: '/api/internal/jobs/notifications', method: 'JOB', status: 503,
      }, error)
    }
    return json({ error: 'Notification queue processing failed.' }, 503)
  }
}
