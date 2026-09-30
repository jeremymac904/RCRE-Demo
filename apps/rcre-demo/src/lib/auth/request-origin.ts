import 'server-only'
import { AccessError } from '@/lib/platform/auth'

type OriginRequest = { nextUrl: URL; headers: Headers }

/** Require an explicit same-origin signal for cookie-authenticated mutations. */
export function assertSameOriginMutation(request: OriginRequest): void {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  let submittedOrigin: string | null = null
  try {
    if (origin) submittedOrigin = new URL(origin).origin
    else if (referer) submittedOrigin = new URL(referer).origin
  } catch {
    submittedOrigin = null
  }
  if (!submittedOrigin || submittedOrigin !== request.nextUrl.origin) {
    throw new AccessError('Cross-origin request denied.', 403)
  }
}
