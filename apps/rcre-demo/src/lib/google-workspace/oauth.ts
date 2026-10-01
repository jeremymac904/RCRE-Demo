import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { Fetcher, GoogleOAuthProvider, GoogleTokenSet, WorkspaceService } from './types'

export const SCOPES: Record<WorkspaceService, string[]> = {
  gmail: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.send'],
  calendar: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.events'],
  drive: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.file'],
}
export const SERVICE_SCOPES: Record<WorkspaceService, string[]> = {
  gmail: SCOPES.gmail.slice(3), calendar: SCOPES.calendar.slice(3), drive: SCOPES.drive.slice(3),
}

export interface WorkspaceOAuthConfig { clientId: string; clientSecret: string; redirectUri: string }
export function workspaceOAuthConfig(env: NodeJS.ProcessEnv = process.env): WorkspaceOAuthConfig | null {
  const clientId = env.GOOGLE_WORKSPACE_CLIENT_ID, clientSecret = env.GOOGLE_WORKSPACE_CLIENT_SECRET, redirectUri = env.GOOGLE_WORKSPACE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return null
  try {
    const url = new URL(redirectUri)
    if (url.protocol !== 'https:' && env.NODE_ENV === 'production') return null
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/api/integrations/google/callback') return null
    return { clientId, clientSecret, redirectUri: url.toString() }
  } catch { return null }
}

export function pkcePair() {
  const verifier = randomBytes(48).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}

export class GoogleOAuthHttp implements GoogleOAuthProvider {
  constructor(private readonly config: WorkspaceOAuthConfig, private readonly fetcher: Fetcher = fetch) {}

  authorizationUrl(service: WorkspaceService, state: string, verifier: string): string {
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.search = new URLSearchParams({ client_id: this.config.clientId, redirect_uri: this.config.redirectUri, response_type: 'code', scope: SCOPES[service].join(' '), state, code_challenge: challenge, code_challenge_method: 'S256', access_type: 'offline', include_granted_scopes: 'true', prompt: 'consent select_account' }).toString()
    return url.toString()
  }

  async exchange(code: string, verifier: string): Promise<GoogleTokenSet> {
    const response = await this.fetcher('https://oauth2.googleapis.com/token', { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: this.config.clientId, client_secret: this.config.clientSecret, redirect_uri: this.config.redirectUri, grant_type: 'authorization_code', code_verifier: verifier }) })
    if (!response.ok) throw new Error('Google authorization could not be completed')
    const token = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }
    if (!token.access_token || !token.expires_in) throw new Error('Google authorization did not return an access token')
    const user = await this.userInfo(token.access_token)
    return { accessToken: token.access_token, ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}), expiresIn: token.expires_in, scopes: (token.scope ?? '').split(' ').filter(Boolean), email: user.email }
  }

  async refresh(refreshToken: string) {
    const response = await this.fetcher('https://oauth2.googleapis.com/token', { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: refreshToken, client_id: this.config.clientId, client_secret: this.config.clientSecret, grant_type: 'refresh_token' }) })
    if (!response.ok) throw new Error('Google access expired; reconnect this service')
    const token = await response.json() as { access_token?: string; expires_in?: number; refresh_token?: string; scope?: string }
    if (!token.access_token || !token.expires_in) throw new Error('Google access refresh failed')
    return { accessToken: token.access_token, expiresIn: token.expires_in, ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}), scopes: token.scope?.split(' ').filter(Boolean) }
  }

  async revoke(refreshToken: string): Promise<boolean> {
    const response = await this.fetcher('https://oauth2.googleapis.com/revoke', { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refreshToken }) })
    return response.ok
  }

  private async userInfo(accessToken: string): Promise<{ email: string }> {
    const response = await this.fetcher('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
    if (!response.ok) throw new Error('Google account identity could not be verified')
    const user = await response.json() as { email?: string; email_verified?: boolean }
    const email = String(user.email ?? '').trim().toLowerCase()
    if (user.email_verified !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Google account email is not verified')
    return { email }
  }
}

export function makeState(): string { return randomBytes(32).toString('base64url') }
