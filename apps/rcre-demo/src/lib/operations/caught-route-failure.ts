import 'server-only'
import type { PlatformActor } from '@/lib/platform/auth'
import { getRepository } from '@/lib/db'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { recordOperationalFailure } from './operational-errors'
import { logStructured, requestIdFrom, safeErrorCode } from './structured-log'

/** Best-effort capture for route-local catches. Caller supplies a static route template, never a URL containing record IDs or query data. */
export async function recordCaughtRouteFailure(
  request: Request,
  route: string,
  actor: PlatformActor | null,
  status: number,
  error: unknown,
): Promise<void> {
  if (status < 500) return
  const requestId = requestIdFrom(request.headers.get('x-rcre-request-id'))
  logStructured('error', 'route.failure', {
    requestId,
    method: request.method,
    route,
    status,
    errorCode: safeErrorCode(error),
  })
  if (process.env.NODE_ENV !== 'production' || !actor?.userId || !actor.organizationId) return

  try {
    const repository = await getRepository()
    await recordOperationalFailure(repository, {
      userId: actor.userId,
      organizationId: actor.organizationId,
      role: repositoryRoleForPlatform(actor.role),
      officeId: actor.officeId,
    }, { category: 'route_failure', route, method: request.method, status, requestId }, error)
  } catch {
    // Telemetry must never change the original route response, including when
    // PostgreSQL itself is the failing dependency.
  }
}
