import { beforeAll, describe, expect, it } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import { exchangeGoogleCode, googleConfig, makeGoogleAuthorization, type Fetcher, type GoogleOidcConfig } from '@/lib/auth/google-oidc'

const now = Date.now()
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...(publicKey.export({ format: 'jwk' }) as JsonWebKey), kid: 'rcre-test-kid', alg: 'RS256', use: 'sig' }
const config: GoogleOidcConfig = { clientId: 'rcre-test-client.apps.googleusercontent.com', clientSecret: 'test-secret-only', redirectUri: 'https://rcre.example/api/auth/google/callback' }

function token(overrides: Record<string, unknown> = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })).toString('base64url')
  const claims = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: config.clientId, azp: config.clientId,
    exp: Math.floor(now / 1000) + 300, iat: Math.floor(now / 1000), nonce: 'expected-nonce', sub: 'google-subject-1234',
    email: 'agent@example.com', email_verified: true, name: 'Example Agent', ...overrides })).toString('base64url')
  const signed = `${header}.${claims}`
  return `${signed}.${sign('RSA-SHA256', Buffer.from(signed), privateKey).toString('base64url')}`
}
function fetcher(idToken: string, observe?: (url: string, init?: RequestInit) => void): Fetcher {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); observe?.(url, init)
    if (url === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({ id_token: idToken }), { status: 200 })
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
    return new Response('', { status: 404 })
  }) as Fetcher
}

beforeAll(() => { /* keys are process-local test fixtures; no real provider call occurs */ })

describe('Google OIDC contract', () => {
  it('requires all server credentials and a fixed HTTPS callback in production', () => {
    expect(googleConfig({ NODE_ENV: 'production', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REDIRECT_URI: 'https://rcre.example/api/auth/google/callback' })?.clientId).toBe('id')
    expect(googleConfig({ NODE_ENV: 'production', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REDIRECT_URI: 'http://rcre.example/api/auth/google/callback' })).toBeNull()
    expect(googleConfig({ NODE_ENV: 'production', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REDIRECT_URI: 'https://evil.example/redirect' })).toBeNull()
    expect(googleConfig({ NODE_ENV: 'production', GOOGLE_CLIENT_ID: 'id', GOOGLE_REDIRECT_URI: 'https://rcre.example/api/auth/google/callback' })).toBeNull()
  })

  it('uses state, nonce, PKCE S256, and identity-only scopes', () => {
    const start = makeGoogleAuthorization(config)
    const url = new URL(start.authorizationUrl)
    expect(url.origin).toBe('https://accounts.google.com')
    expect(url.searchParams.get('state')).toBe(start.state)
    expect(url.searchParams.get('nonce')).toBe(start.nonce)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBeTruthy()
    expect(url.searchParams.get('scope')).toBe('openid email profile')
    expect(url.searchParams.has('access_type')).toBe(false)
  })

  it('exchanges code using verifier and verifies Google signature, audience, nonce and verified email', async () => {
    let tokenBody = ''
    const identity = await exchangeGoogleCode({ config, code: 'synthetic-code', verifier: 'synthetic-verifier', expectedNonce: 'expected-nonce', now,
      fetcher: fetcher(token(), (url, init) => { if (url === 'https://oauth2.googleapis.com/token') tokenBody = String(init?.body ?? '') }) })
    expect(identity).toEqual({ subject: 'google-subject-1234', email: 'agent@example.com', name: 'Example Agent' })
    expect(tokenBody).toContain('code_verifier=synthetic-verifier')
  })

  it.each([
    ['nonce mismatch', { nonce: 'wrong' }],
    ['unverified email', { email_verified: false }],
    ['audience mismatch', { aud: 'another-client' }],
    ['expired token', { exp: Math.floor(now / 1000) - 2 }],
  ])('rejects %s', async (_label, claims) => {
    await expect(exchangeGoogleCode({ config, code: 'code', verifier: 'verifier', expectedNonce: 'expected-nonce', now,
      fetcher: fetcher(token(claims)) })).rejects.toThrow()
  })

  it('rejects invalid token signature', async () => {
    const parts = token().split('.')
    parts[2] = Buffer.alloc(256, 0).toString('base64url')
    await expect(exchangeGoogleCode({ config, code: 'code', verifier: 'verifier', expectedNonce: 'expected-nonce', now,
      fetcher: fetcher(parts.join('.')) })).rejects.toThrow()
  })
})
