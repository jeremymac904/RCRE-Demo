import { NextResponse } from 'next/server'
import { createSession, revokeSession, SESSION_COOKIE, PERSONAS, sessionCookieOptions, AccessError, demoEnabled } from '@/lib/platform/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const form = await request.formData()
  const id = String(form.get('userId') ?? '')
  try {
    if (!demoEnabled()) throw new AccessError('Google sign-in is not configured for this deployment.', 503)
    const actor = PERSONAS.find(persona => persona.id === id)
    if (!actor) throw new AccessError('Unknown local persona', 400)
    const token = createSession(id)
    const destination = actor.role === 'transaction_coordinator' ? '/transactions'
      : actor.role === 'trainer' ? '/training'
      : actor.role === 'marketing_admin' ? '/marketing'
      : ['broker_owner', 'managing_broker', 'team_leader'].includes(actor.role) ? '/command' : '/today'
    const response = NextResponse.redirect(new URL(destination, request.url), 303)
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return response
  } catch (error) {
    const reason = error instanceof AccessError && error.status === 503 ? 'google-required' : 'unavailable'
    return NextResponse.redirect(new URL(`/login?error=${reason}`, request.url), 303)
  }
}

export async function GET(request: Request) {
  await revokeSession()
  const response = NextResponse.redirect(new URL('/login', request.url), 303)
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) })
  return response
}
