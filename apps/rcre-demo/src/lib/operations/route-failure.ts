import { z } from 'zod'
import { AccessError } from '@/lib/platform/auth'
import { logStructured, requestIdFrom, safeErrorCode } from './structured-log'

/** Convert an API failure to a safe response; server errors are correlated and logged without request data. */
export function platformApiFailure(error: unknown, request?: Request): Response {
  const status = error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 500
  if (status >= 500) {
    logStructured('error', 'route.failure', {
      requestId: requestIdFrom(request?.headers.get('x-request-id')),
      method: request?.method ?? 'GET', route: '/api/platform/[...path]', status, errorCode: safeErrorCode(error),
    })
  }
  const message = status >= 500
    ? 'The request could not be completed. Please try again later.'
    : error instanceof z.ZodError ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      : error instanceof Error ? error.message : 'Request failed'
  return Response.json({ error: message }, { status })
}
