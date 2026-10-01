import { z } from 'zod'
import { AccessError, type PlatformActor } from '@/lib/platform/auth'
import { getRepository } from '@/lib/db'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { recordOperationalFailure } from './operational-errors'
import { logStructured, requestIdFrom, safeErrorCode } from './structured-log'

/** Convert an API failure to a safe response and best-effort durable metadata for authenticated production failures. */
export async function platformApiFailure(error: unknown, request?: Request, actor?: PlatformActor | null): Promise<Response> {
  const status = error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 500
  if (status >= 500) {
    const requestId = requestIdFrom(request?.headers.get('x-rcre-request-id'))
    const route = '/api/platform/[...path]'
    logStructured('error', 'route.failure', {
      requestId, method: request?.method ?? 'GET', route, status, errorCode: safeErrorCode(error),
    })
    // Persistence is intentionally best-effort. If the failing dependency is
    // PostgreSQL, capture must not recurse or alter the generic response.
    if (actor && process.env.NODE_ENV === 'production') {
      try {
        const repository = await getRepository()
        await recordOperationalFailure(repository, {
          userId: actor.id,
          organizationId: actor.organizationId,
          role: repositoryRoleForPlatform(actor.role),
          officeId: actor.officeId,
        }, { category: 'route_failure', route, method: request?.method ?? 'GET', status, requestId }, error)
      } catch {
        // The structured server log remains the fallback when the DB is down.
      }
    }
  }
  const message = status >= 500
    ? 'The request could not be completed. Please try again later.'
    : error instanceof z.ZodError ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      : error instanceof Error ? error.message : 'Request failed'
  return Response.json({ error: message }, { status })
}
