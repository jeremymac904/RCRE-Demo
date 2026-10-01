import { NextResponse, type NextRequest } from 'next/server'
import { exchangeGoogleCode, googleConfig, OidcError } from '@/lib/auth/google-oidc'
import { getAuthPersistence, hashSecret } from '@/lib/auth/persistence'
import { issueDurableSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/platform/auth'
import { enqueueMemberNotice, memberNotificationIdentity } from '@/lib/services/notification-producers'

export const dynamic = 'force-dynamic'
const cookiePath = '/api/auth/google'
const clearTransient = (response: NextResponse) => {
  for (const name of ['rcre_oidc_state', 'rcre_oidc_nonce', 'rcre_oidc_verifier']) response.cookies.set(name, '', { path: cookiePath, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0 })
  response.cookies.set('rcre_invitation_token', '', { path: '/api/auth/google/callback', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0 })
}

function failure(request: NextRequest, reason: string, trustedOrigin?: string) {
  const fallback = process.env.NODE_ENV === 'production' ? trustedOrigin ?? request.nextUrl.origin : request.nextUrl.origin
  const response = NextResponse.redirect(new URL(`/login?error=${reason}`, fallback), 303)
  clearTransient(response)
  // A failed or cross-site callback must not be able to sign an already-authenticated
  // user out. Only explicit logout revokes and clears an existing RCRE session.
  response.headers.set('cache-control', 'no-store, max-age=0')
  response.headers.set('referrer-policy', 'no-referrer')
  return response
}

export async function GET(request: NextRequest) {
  const config = googleConfig()
  if (!config) return failure(request, 'identity-unavailable')
  const trustedOrigin = new URL(config.redirectUri).origin
  if (request.nextUrl.origin !== trustedOrigin || request.nextUrl.pathname !== new URL(config.redirectUri).pathname) return failure(request, 'sign-in-failed', trustedOrigin)
  const params = request.nextUrl.searchParams
  const code = params.get('code')
  const returnedState = params.get('state')
  const state = request.cookies.get('rcre_oidc_state')?.value
  const nonce = request.cookies.get('rcre_oidc_nonce')?.value
  const verifier = request.cookies.get('rcre_oidc_verifier')?.value
  if (params.has('error') || !code || !returnedState || !state || !nonce || !verifier || returnedState !== state) return failure(request, 'sign-in-failed', trustedOrigin)
  try {
    const identity = await exchangeGoogleCode({ config, code, verifier, expectedNonce: nonce })
    const inviteToken = request.cookies.get('rcre_invitation_token')?.value
    const auth = await getAuthPersistence()
    const invitation = inviteToken ? await auth.invitationStatus(hashSecret(inviteToken)) : null
    const actor = await auth.linkGoogle({
      email: identity.email,
      subject: identity.subject,
      name: identity.name,
      invitationTokenHash: inviteToken ? hashSecret(inviteToken) : null,
    })
    if (!actor) return failure(request, 'not-invited', trustedOrigin)
    const metadata = {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    }
    const session = await issueDurableSession(actor.userId, metadata)
    if (invitation?.valid && invitation.email === identity.email) {
      // The durable identity link and session are authoritative. A notification
      // outbox outage must not strand a valid invitee after session issuance.
      try {
        await enqueueMemberNotice(memberNotificationIdentity({ id: actor.userId, organizationId: actor.organizationId, role: actor.role, officeId: actor.officeId }), {
          idempotencyKey: `invitation-accepted:${actor.userId}`,
          eventType: 'invitation', title: 'Welcome to RCRE',
          body: 'Your RCRE account is active. Continue setting up your profile and workspace.',
          href: '/onboarding', source: 'Invitations',
        })
      } catch { console.warn(JSON.stringify({ level: 'warn', event: 'rcre.auth.welcome_notice_enqueue_failed' })) }
    }
    const destination = actor.role === 'transaction_coordinator' ? '/transactions'
      : actor.role === 'trainer' ? '/training'
      : actor.role === 'marketing_admin' ? '/marketing'
      : ['broker_owner', 'managing_broker', 'team_leader'].includes(actor.role) ? '/command' : '/today'
    const response = NextResponse.redirect(new URL(destination, trustedOrigin), 303)
    clearTransient(response)
    response.cookies.set(SESSION_COOKIE, session.token, { ...sessionCookieOptions(), maxAge: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000) })
    response.headers.set('cache-control', 'no-store, max-age=0')
    response.headers.set('referrer-policy', 'no-referrer')
    return response
  } catch (error) {
    const reason = error instanceof OidcError ? 'sign-in-failed' : 'sign-in-unavailable'
    return failure(request, reason, trustedOrigin)
  }
}
