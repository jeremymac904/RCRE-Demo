import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { hashSecret, getAuthPersistence } from '@/lib/auth/persistence'
import { AccessError } from '@/lib/platform/auth'

export const dynamic = 'force-dynamic'
const inputSchema = z.object({ token: z.string().min(32).max(200) })

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).origin !== request.nextUrl.origin) throw new AccessError('Cross-origin request denied', 403)
    const body = inputSchema.parse(Object.fromEntries((await request.formData()).entries()))
    const invitation = await (await getAuthPersistence()).invitationStatus(hashSecret(body.token))
    if (!invitation?.valid) throw new AccessError('This invitation is invalid or has expired.', 410)
    const response = NextResponse.redirect(new URL('/api/auth/google', request.url), 303)
    response.cookies.set('rcre_invitation_token', body.token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/api/auth/google/callback', maxAge: 600,
    })
    return response
  } catch (error) {
    const status = error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 503
    const message = status === 503 ? 'Sign-in is temporarily unavailable.' : error instanceof Error ? error.message : 'Invitation could not be verified.'
    if (request.headers.get('accept')?.includes('text/html') || request.headers.get('content-type')?.includes('form')) return NextResponse.redirect(new URL(`/login?error=${status === 503 ? 'sign-in-unavailable' : 'invitation-invalid'}`, request.url), 303)
    return NextResponse.json({ error: message }, { status })
  }
}
