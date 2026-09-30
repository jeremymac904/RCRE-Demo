import { NextResponse, type NextRequest } from 'next/server'
import { googleConfig, makeGoogleAuthorization } from '@/lib/auth/google-oidc'

export const dynamic = 'force-dynamic'
const TRANSIENT_PATH = '/api/auth/google'
const secureCookie = process.env.NODE_ENV === 'production'

export async function GET(request: NextRequest) {
  const config = googleConfig()
  if (!config) return NextResponse.redirect(new URL('/login?error=identity-unavailable', request.url), 303)
  const start = makeGoogleAuthorization(config)
  const response = NextResponse.redirect(start.authorizationUrl, 302)
  response.headers.set('cache-control', 'no-store, max-age=0')
  response.headers.set('referrer-policy', 'no-referrer')
  const common = { httpOnly: true, secure: secureCookie, sameSite: 'lax' as const, path: TRANSIENT_PATH, maxAge: 600 }
  response.cookies.set('rcre_oidc_state', start.state, common)
  response.cookies.set('rcre_oidc_nonce', start.nonce, common)
  response.cookies.set('rcre_oidc_verifier', start.verifier, common)
  return response
}
