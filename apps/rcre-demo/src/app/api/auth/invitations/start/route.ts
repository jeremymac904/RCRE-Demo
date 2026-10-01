import { assertSameOriginMutation } from '@/lib/auth/request-origin'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { hashSecret, getAuthPersistence } from '@/lib/auth/persistence'
import { AccessError } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export const dynamic = 'force-dynamic'
const inputSchema = z.object({ token: z.string().min(32).max(200) })

export async function POST(request: NextRequest) {
  try {
    assertSameOriginMutation(request)
    const body = inputSchema.parse(Object.fromEntries((await request.formData()).entries()))
    const invitation = await (await getAuthPersistence()).invitationStatus(hashSecret(body.token))
    if (!invitation?.valid) throw new AccessError('This invitation is invalid or has expired.', 410)
    const response = NextResponse.redirect(new URL('/api/auth/google', request.url), 303)
    response.headers.set('cache-control', 'no-store, max-age=0')
    response.headers.set('referrer-policy', 'no-referrer')
    response.cookies.set('rcre_invitation_token', body.token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/api/auth/google/callback', maxAge: 600,
    })
    return response
  } catch (error) {
    const status = error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 503
    const message = status === 503 ? 'Sign-in is temporarily unavailable.' : error instanceof Error ? error.message : 'Invitation could not be verified.'
    const response = request.headers.get('accept')?.includes('text/html') || request.headers.get('content-type')?.includes('form')
      ? NextResponse.redirect(new URL(`/login?error=${status === 503 ? 'sign-in-unavailable' : 'invitation-invalid'}`, request.url), 303)
      : NextResponse.json({ error: message }, { status })
    await recordCaughtRouteFailure(request, '/api/auth/invitations/start', null, status, error)
    return response
  }
}
