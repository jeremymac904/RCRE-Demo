import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, sessionCookieOptions, AccessError } from '@/lib/platform/auth'
import { getAuthPersistence, hashSecret, opaqueSecret } from '@/lib/auth/persistence'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
export const dynamic = 'force-dynamic'
const TTL = 12 * 60 * 60_000
const digest = (value: string | null) => createHash('sha256').update(value ?? '').digest('hex')
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).origin !== request.nextUrl.origin) throw new AccessError('Cross-origin request denied.', 403)
    const current = (await cookies()).get(SESSION_COOKIE)?.value
    if (!current) throw new AccessError('Session expired. Sign in again.', 401)
    const token = opaqueSecret(32)
    const expiresAt = new Date(Date.now() + TTL)
    const result = await (await getAuthPersistence()).rotateSession({
      oldTokenHash: hashSecret(current), newTokenHash: hashSecret(token), expiresAt,
      deviceLabel: 'Web browser', userAgentHash: digest(request.headers.get('user-agent')),
      ipHash: digest(request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null),
    })
    if (!result) throw new AccessError('Session expired. Sign in again.', 401)
    const response = NextResponse.json({ rotated: true, expiresAt: expiresAt.toISOString() }, { headers: { 'cache-control': 'no-store' } })
    response.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions(), maxAge: Math.floor(TTL / 1000) })
    return response
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503
    const response = NextResponse.json({ error: status === 503 ? 'Session service is temporarily unavailable.' : error instanceof Error ? error.message : 'Request failed.' }, { status })
    await recordCaughtRouteFailure(request, '/api/auth/session/rotate', null, status, error)
    return response
  }
}
