import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  googleConfig: vi.fn(),
  makeGoogleAuthorization: vi.fn(),
  exchangeGoogleCode: vi.fn(),
  getAuthPersistence: vi.fn(),
  hashSecret: vi.fn((value: string) => `hash:${value}`),
  issueDurableSession: vi.fn(),
  enqueueMemberNotice: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/auth/google-oidc', () => ({
  googleConfig: mocks.googleConfig,
  makeGoogleAuthorization: mocks.makeGoogleAuthorization,
  exchangeGoogleCode: mocks.exchangeGoogleCode,
  OidcError: class OidcError extends Error {},
}))
vi.mock('@/lib/auth/persistence', () => ({ getAuthPersistence: mocks.getAuthPersistence, hashSecret: mocks.hashSecret }))
vi.mock('@/lib/services/notification-producers', () => ({
  enqueueMemberNotice: mocks.enqueueMemberNotice,
  memberNotificationIdentity: (member: unknown) => member,
}))
vi.mock('@/lib/platform/auth', () => ({
  issueDurableSession: mocks.issueDurableSession,
  SESSION_COOKIE: 'rcre_local_session',
  sessionCookieOptions: () => ({ httpOnly: true, sameSite: 'lax', path: '/', secure: false }),
}))

import { GET as startGoogle } from '@/app/api/auth/google/route'
import { GET as finishGoogle } from '@/app/api/auth/google/callback/route'

const config = { clientId: 'rcre-test-client', clientSecret: 'test-only-secret', redirectUri: 'https://rcre.example/api/auth/google/callback' }
const start = { state: 'state-value', nonce: 'nonce-value', verifier: 'pkce-verifier', authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?scope=openid' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.googleConfig.mockReturnValue(config)
  mocks.makeGoogleAuthorization.mockReturnValue(start)
  mocks.exchangeGoogleCode.mockResolvedValue({ subject: 'google-subject-1234', email: 'agent@example.com', name: 'Example Agent' })
  mocks.getAuthPersistence.mockResolvedValue({ linkGoogle: vi.fn().mockResolvedValue({
    id: 'user-1', userId: 'user-1', organizationId: 'org-1', role: 'agent', name: 'Example Agent', market: 'Florida', officeId: 'fl', teamId: 'fl',
  }) })
  mocks.issueDurableSession.mockResolvedValue({ token: 'opaque-session-cookie', sessionId: 'session-1', expiresAt: new Date(Date.now() + 60_000) })
  mocks.enqueueMemberNotice.mockResolvedValue(undefined)
})

describe('Google sign-in HTTP boundary', () => {
  it('sets short-lived HttpOnly state, nonce and PKCE cookies without caching the authorization redirect', async () => {
    const response = await startGoogle(new NextRequest('https://rcre.example/api/auth/google'))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(start.authorizationUrl)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    for (const [name, value] of [['rcre_oidc_state', start.state], ['rcre_oidc_nonce', start.nonce], ['rcre_oidc_verifier', start.verifier]]) {
      const cookie = response.cookies.get(name)
      expect(cookie?.value).toBe(value)
      expect(cookie?.httpOnly).toBe(true)
      expect(cookie?.path).toBe('/api/auth/google')
      expect(cookie?.maxAge).toBe(600)
    }
  })

  it('does not start OAuth on a host different from the configured callback origin', async () => {
    const response = await startGoogle(new NextRequest('https://preview-rcre.example/api/auth/google'))
    expect(response.headers.get('location')).toBe('https://rcre.example/login?error=identity-unavailable')
    expect(response.cookies.get('rcre_oidc_state')).toBeUndefined()
    expect(mocks.makeGoogleAuthorization).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('rejects a state mismatch without exchanging a code or clearing an existing signed-in session', async () => {
    const request = new NextRequest('https://rcre.example/api/auth/google/callback?code=synthetic&state=attacker', {
      headers: { cookie: 'rcre_oidc_state=expected; rcre_oidc_nonce=nonce; rcre_oidc_verifier=verifier; rcre_local_session=existing-session' },
    })
    const response = await finishGoogle(request)
    expect(response.headers.get('location')).toBe('https://rcre.example/login?error=sign-in-failed')
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled()
    expect(response.cookies.get('rcre_local_session')).toBeUndefined()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('links only the verified identity and issues the durable session after callback state succeeds', async () => {
    const linkGoogle = vi.fn().mockResolvedValue({
      id: 'user-1', userId: 'user-1', organizationId: 'org-1', role: 'agent', name: 'Example Agent', market: 'Florida', officeId: 'fl', teamId: 'fl',
    })
    mocks.getAuthPersistence.mockResolvedValue({ linkGoogle, invitationStatus: vi.fn().mockResolvedValue({ valid: true, email: 'agent@example.com', expiresAt: new Date(Date.now() + 60000).toISOString(), name: 'Example Agent' }) })
    const request = new NextRequest('https://rcre.example/api/auth/google/callback?code=synthetic-code&state=state-value', {
      headers: { cookie: 'rcre_oidc_state=state-value; rcre_oidc_nonce=nonce-value; rcre_oidc_verifier=verifier-value; rcre_invitation_token=invite-bearer; rcre_local_session=prior-session' },
    })
    const response = await finishGoogle(request)
    expect(mocks.exchangeGoogleCode).toHaveBeenCalledWith({ config, code: 'synthetic-code', verifier: 'verifier-value', expectedNonce: 'nonce-value' })
    expect(linkGoogle).toHaveBeenCalledWith({ email: 'agent@example.com', subject: 'google-subject-1234', name: 'Example Agent', invitationTokenHash: 'hash:invite-bearer' })
    expect(mocks.issueDurableSession).toHaveBeenCalledWith('user-1', expect.objectContaining({ userAgent: null }))
    expect(response.headers.get('location')).toBe('https://rcre.example/today')
    expect(response.cookies.get('rcre_local_session')?.value).toBe('opaque-session-cookie')
    expect(response.cookies.get('rcre_local_session')?.httpOnly).toBe(true)
    expect(response.cookies.get('rcre_invitation_token')?.maxAge).toBe(0)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('keeps a valid sign-in successful when the optional welcome notice cannot be queued', async () => {
    mocks.getAuthPersistence.mockResolvedValue({
      linkGoogle: vi.fn().mockResolvedValue({ id: 'user-1', userId: 'user-1', organizationId: 'org-1', role: 'agent', officeId: 'fl' }),
      invitationStatus: vi.fn().mockResolvedValue({ valid: true, email: 'agent@example.com', expiresAt: new Date(Date.now() + 60_000).toISOString(), name: 'Example Agent' }),
    })
    mocks.enqueueMemberNotice.mockRejectedValue(new Error('outbox unavailable'))
    const request = new NextRequest('https://rcre.example/api/auth/google/callback?code=synthetic-code&state=state-value', {
      headers: { cookie: 'rcre_oidc_state=state-value; rcre_oidc_nonce=nonce-value; rcre_oidc_verifier=verifier-value; rcre_invitation_token=invite-bearer' },
    })
    const response = await finishGoogle(request)
    expect(response.headers.get('location')).toBe('https://rcre.example/today')
    expect(response.cookies.get('rcre_local_session')?.value).toBe('opaque-session-cookie')
  })

  it('does not issue a session when the verified account has no active membership or matching invitation', async () => {
    mocks.getAuthPersistence.mockResolvedValue({ linkGoogle: vi.fn().mockResolvedValue(null) })
    const request = new NextRequest('https://rcre.example/api/auth/google/callback?code=synthetic-code&state=state-value', {
      headers: { cookie: 'rcre_oidc_state=state-value; rcre_oidc_nonce=nonce-value; rcre_oidc_verifier=verifier-value' },
    })
    const response = await finishGoogle(request)
    expect(response.headers.get('location')).toBe('https://rcre.example/login?error=not-invited')
    expect(mocks.issueDurableSession).not.toHaveBeenCalled()
    expect(response.cookies.get('rcre_local_session')).toBeUndefined()
  })
})
