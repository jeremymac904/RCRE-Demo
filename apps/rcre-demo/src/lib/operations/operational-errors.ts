import 'server-only'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { Actor, Repository } from '@/lib/db/repository'
import { safeErrorCode } from './structured-log'

const errorInput = z.object({
  category: z.enum(['route_failure', 'job_failure', 'database_failure', 'storage_failure', 'notification_failure']),
  route: z.string().regex(/^\/[A-Za-z0-9_./\[\]-]{1,150}$/).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'JOB']).optional(),
  status: z.number().int().min(400).max(599).optional(),
  requestId: z.string().regex(/^[A-Fa-f0-9-]{16,64}$/).optional(),
  occurredAt: z.string().datetime().optional(),
}).strict()

/** Best-effort durable operational record. Payloads and exception messages are deliberately excluded. */
export async function recordOperationalFailure(
  repository: Repository,
  actor: Actor,
  raw: unknown,
  error: unknown,
  now = new Date(),
): Promise<{ recorded: boolean; id?: string }> {
  if (!actor?.userId || !actor.organizationId) return { recorded: false }
  const parsed = errorInput.safeParse(raw)
  if (!parsed.success) return { recorded: false }
  const id = randomUUID()
  const record = {
    id,
    category: parsed.data.category,
    route: parsed.data.route ?? null,
    method: parsed.data.method ?? 'JOB',
    status: parsed.data.status ?? null,
    requestId: parsed.data.requestId ?? null,
    errorCode: safeErrorCode(error),
    occurredAt: parsed.data.occurredAt ?? now.toISOString(),
  }
  try {
    await repository.putDomainRecord(
      actor,
      { collection: 'operational_errors', recordId: id, ownerUserId: actor.userId, data: record, createOnly: true },
    )
    return { recorded: true, id }
  } catch {
    return { recorded: false }
  }
}
