import 'server-only'
import { AccessError } from '@/lib/platform/auth'

type OriginRequest = { url: string; headers: Headers }

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
  let requestOrigin: string | null = null
  try {
    requestOrigin = new URL(request.url).origin
  } catch {
    requestOrigin = null
  }
  if (!submittedOrigin || !requestOrigin || submittedOrigin !== requestOrigin) {
    throw new AccessError('Cross-origin request denied.', 403)
  }
}
