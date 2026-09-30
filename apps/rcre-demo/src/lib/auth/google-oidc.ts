import 'server-only'
import { createHash, createPublicKey, randomBytes, verify as verifySignature } from 'node:crypto'

export interface GoogleOidcConfig { clientId: string; clientSecret: string; redirectUri: string }
export interface OidcStart { state: string; nonce: string; verifier: string; authorizationUrl: string }
export interface VerifiedGoogleIdentity { subject: string; email: string; name: string }
export type Fetcher = typeof fetch

export class OidcError extends Error { constructor(message: string) { super(message); this.name = 'OidcError' } }

export function googleConfig(env: NodeJS.ProcessEnv = process.env): GoogleOidcConfig | null {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_REDIRECT_URI: redirectUri } = env
  if (!clientId || !clientSecret || !redirectUri) return null
  let callback: URL
  try { callback = new URL(redirectUri) } catch { return null }
  if (env.NODE_ENV === 'production' && callback.protocol !== 'https:') return null
  if (callback.username || callback.password || callback.hash || callback.search || callback.pathname !== '/api/auth/google/callback') return null
  return { clientId, clientSecret, redirectUri: callback.toString() }
}

const b64url = (value: Buffer) => value.toString('base64url')
const opaque = () => b64url(randomBytes(32))
export function makeGoogleAuthorization(config: GoogleOidcConfig, callback = config.redirectUri): OidcStart {
  const state = opaque(), nonce = opaque(), verifier = opaque() + opaque()
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callback,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  return { state, nonce, verifier, authorizationUrl: url.toString() }
}

interface JwtHeader { alg?: string; kid?: string; typ?: string }
interface JwtClaims { iss?: string; aud?: string | string[]; azp?: string; exp?: number; iat?: number; nonce?: string; sub?: string; email?: string; email_verified?: boolean | string; name?: string }
interface GoogleJwk { kid: string; kty: string; use?: string; alg?: string; n: string; e: string }
let jwksCache: { expiresAt: number; keys: GoogleJwk[] } | null = null

function decodePart<T>(value: string): T {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T }
  catch { throw new OidcError('Google returned an invalid identity token') }
}

async function googleKeys(fetcher: Fetcher): Promise<GoogleJwk[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys
  const response = await fetcher('https://www.googleapis.com/oauth2/v3/certs', { cache: 'no-store' })
  if (!response.ok) throw new OidcError('Google identity verification is temporarily unavailable')
  const body = await response.json() as { keys?: GoogleJwk[] }
  if (!Array.isArray(body.keys)) throw new OidcError('Google identity keys are invalid')
  jwksCache = { keys: body.keys, expiresAt: Date.now() + 10 * 60_000 }
  return body.keys
}

export async function exchangeGoogleCode(input: {
  config: GoogleOidcConfig; code: string; verifier: string; expectedNonce: string; fetcher?: Fetcher; now?: number
}): Promise<VerifiedGoogleIdentity> {
  const fetcher = input.fetcher ?? fetch
  const tokenResponse = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, cache: 'no-store',
    body: new URLSearchParams({ code: input.code, client_id: input.config.clientId, client_secret: input.config.clientSecret,
      redirect_uri: input.config.redirectUri, grant_type: 'authorization_code', code_verifier: input.verifier }),
  })
  if (!tokenResponse.ok) throw new OidcError('Google sign-in could not be completed')
  const token = await tokenResponse.json() as { id_token?: string }
  if (!token.id_token) throw new OidcError('Google did not return an identity token')
  const parts = token.id_token.split('.')
  if (parts.length !== 3) throw new OidcError('Google returned an invalid identity token')
  const [head, body, signature] = parts
  const header = decodePart<JwtHeader>(head)
  const claims = decodePart<JwtClaims>(body)
  if (header.alg !== 'RS256' || !header.kid) throw new OidcError('Google identity token uses an unsupported signature')
  const jwk = (await googleKeys(fetcher)).find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.use || key.use === 'sig'))
  if (!jwk) { jwksCache = null; throw new OidcError('Google identity signature key was not recognized') }
  const publicKey = createPublicKey({ key: jwk as unknown as import('node:crypto').JsonWebKey, format: 'jwk' })
  const verified = verifySignature('RSA-SHA256', Buffer.from(`${head}.${body}`), publicKey, Buffer.from(signature, 'base64url'))
  if (!verified) throw new OidcError('Google identity signature could not be verified')

  const now = input.now ?? Date.now()
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  const email = String(claims.email ?? '').trim().toLowerCase()
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss ?? '')
    || !audience.includes(input.config.clientId)
    || (audience.length > 1 && claims.azp !== input.config.clientId)
    || !Number.isFinite(claims.exp) || Number(claims.exp) * 1000 <= now
    || !Number.isFinite(claims.iat) || Number(claims.iat) * 1000 > now + 60_000
    || claims.nonce !== input.expectedNonce
    || typeof claims.sub !== 'string' || claims.sub.length < 8
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !(claims.email_verified === true || claims.email_verified === 'true')) {
    throw new OidcError('Google identity could not be verified for this sign-in')
  }
  return { subject: claims.sub, email, name: String(claims.name ?? email.split('@')[0]).slice(0, 200) }
}

export function hashUserAgent(value: string | null): string { return createHash('sha256').update(value ?? '').digest('hex') }
