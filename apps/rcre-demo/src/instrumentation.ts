import { logStructured, requestIdFrom, safeErrorCode } from '@/lib/operations/structured-log'

/** Next.js server hook; records route failures without logging request data or error messages. */
export async function onRequestError(
  error: unknown,
  request: { method: string; headers: Headers },
  context: { routePath: string; routerKind: string; routeType: string },
): Promise<void> {
  logStructured('error', 'http.request_failed', {
    requestId: requestIdFrom(request.headers.get('x-rcre-request-id')),
    method: request.method,
    route: context.routePath,
    router: context.routerKind,
    routeType: context.routeType,
    errorCode: safeErrorCode(error),
  })
}
