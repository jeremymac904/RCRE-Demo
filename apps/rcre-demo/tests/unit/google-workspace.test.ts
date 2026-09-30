import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlatformActor } from '@/lib/platform/auth'
import { encryptRefreshToken, decryptRefreshToken } from '@/lib/google-workspace/crypto'
import { GoogleOAuthHttp, SCOPES, SERVICE_SCOPES, workspaceOAuthConfig } from '@/lib/google-workspace/oauth'
import { GoogleWorkspaceHttpApi } from '@/lib/google-workspace/http-api'
import { GoogleWorkspaceService, type TrackedDraft, type WorkspaceServiceStore } from '@/lib/google-workspace/service'
import type { GoogleOAuthProvider, GoogleTokenSet, StoredGoogleGrant, WorkspaceService } from '@/lib/google-workspace/types'
import type { Repository } from '@/lib/db/repository'

const actor: PlatformActor = { id: 'u-1', userId: 'u-1', organizationId: 'org-1', role: 'agent', name: 'Test Agent', market: 'Florida', teamId: 'fl', officeId: 'fl' }
const scopes = SERVICE_SCOPES.gmail
const tokens: GoogleTokenSet = { accessToken: 'access', refreshToken: 'refresh-token-value', expiresIn: 3600, scopes, email: 'agent@example.com' }
class Store implements WorkspaceServiceStore {
  grants = new Map<string, StoredGoogleGrant>()
  drafts = new Map<string, { draft: TrackedDraft; version: number }>()
  async get(_actor: PlatformActor, service: WorkspaceService) { return this.grants.get(service) ?? null }
  async put(_actor: PlatformActor, grant: StoredGoogleGrant) { this.grants.set(grant.service, grant) }
  async remove(_actor: PlatformActor, service: WorkspaceService) { this.grants.delete(service) }
  async getDraft(_actor: PlatformActor, id: string) { return this.drafts.get(id) ?? null }
  async putDraft(_actor: PlatformActor, draft: TrackedDraft, expectedVersion?: number) {
    const prior = this.drafts.get(draft.id)
    if (expectedVersion !== undefined && (!prior || prior.version !== expectedVersion)) throw new Error('conflict')
    const version = (prior?.version ?? 0) + 1
    this.drafts.set(draft.id, { draft, version }); return version
  }
}
class OAuth implements GoogleOAuthProvider {
  revoked: string[] = []
  failRefresh = false
  authorizationUrl(service: WorkspaceService, state: string, verifier: string) { return `https://google.test/?scope=${encodeURIComponent(service)}&state=${state}&code_challenge=${verifier}` }
  async exchange() { return tokens }
  async refresh(refreshToken: string) { if (this.failRefresh) throw new Error('revoked'); expect(refreshToken).toBe('refresh-token-value'); return { accessToken: 'access-fresh', expiresIn: 3600 } }
  async revoke(token: string) { this.revoked.push(token); return true }
}
function fakeRepository(): Repository { return { recordAudit: vi.fn(async () => undefined) } as unknown as Repository }
function fixture(fetcher: typeof fetch) {
  const store = new Store(), oauth = new OAuth(), api = new GoogleWorkspaceHttpApi(fetcher)
  const service = new GoogleWorkspaceService({ store, oauth, api, repository: fakeRepository() })
  return { store, oauth, service }
}
function ready(store: Store) { store.grants.set('gmail', { service: 'gmail', connectedEmail: tokens.email, scopes, refreshToken: encryptRefreshToken(tokens.refreshToken!), connectedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), state: 'connected' }) }

beforeEach(() => { vi.stubEnv('RCRE_GOOGLE_TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64url')) })

describe('per-user Google Workspace adapters', () => {
  it('uses separate OAuth configuration and incremental, service-specific least scopes', () => {
    expect(workspaceOAuthConfig({ NODE_ENV: 'production', GOOGLE_WORKSPACE_CLIENT_ID: 'id', GOOGLE_WORKSPACE_CLIENT_SECRET: 'secret', GOOGLE_WORKSPACE_REDIRECT_URI: 'https://rcre.example/api/integrations/google/callback' })?.clientId).toBe('id')
    expect(workspaceOAuthConfig({ NODE_ENV: 'production', GOOGLE_WORKSPACE_CLIENT_ID: 'id', GOOGLE_WORKSPACE_CLIENT_SECRET: 'secret', GOOGLE_WORKSPACE_REDIRECT_URI: 'http://rcre.example/api/integrations/google/callback' })).toBeNull()
    expect(SCOPES.gmail).toContain('https://www.googleapis.com/auth/gmail.readonly')
    expect(SCOPES.gmail).toContain('https://www.googleapis.com/auth/gmail.compose')
    expect(SCOPES.gmail).toContain('https://www.googleapis.com/auth/gmail.send')
    expect(SCOPES.calendar).toEqual(['openid','email','profile','https://www.googleapis.com/auth/calendar.events'])
    expect(SCOPES.drive).toEqual(['openid','email','profile','https://www.googleapis.com/auth/drive.file'])
    expect(SCOPES.calendar).not.toContain('https://www.googleapis.com/auth/calendar')
  })

  it('keeps refresh tokens encrypted at rest and rejects missing encryption configuration', () => {
    const encrypted = encryptRefreshToken('refresh-token-value')
    expect(JSON.stringify(encrypted)).not.toContain('refresh-token-value')
    expect(decryptRefreshToken(encrypted)).toBe('refresh-token-value')
    vi.stubEnv('RCRE_GOOGLE_TOKEN_ENCRYPTION_KEY', '')
    expect(() => encryptRefreshToken('secret')).toThrow(/not configured/)
  })

  it('OAuth exchange uses PKCE, offline access, state, and verifies the granted Google account', async () => {
    const config = { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://rcre.example/api/integrations/google/callback' }
    const seen: string[] = []
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input); seen.push(url)
      if (url.includes('/token')) return new Response(JSON.stringify({ access_token: 'access', refresh_token: 'refresh-token-value', expires_in: 3600, scope: scopes.join(' ') }), { status: 200 })
      return new Response(JSON.stringify({ email: 'agent@example.com', email_verified: true }), { status: 200 })
    }
    const oauth = new GoogleOAuthHttp(config, fetcher), authorization = oauth.authorizationUrl('gmail', 'state-value', 'pkce-verifier')
    const url = new URL(authorization)
    expect(url.searchParams.get('state')).toBe('state-value')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('include_granted_scopes')).toBe('true')
    expect(url.searchParams.get('scope')?.split(' ')).toEqual(SCOPES.gmail)
    const result = await oauth.exchange('code', 'pkce-verifier')
    expect(result.email).toBe('agent@example.com')
    expect(result.refreshToken).toBe('refresh-token-value')
    expect(seen).toContain('https://openidconnect.googleapis.com/v1/userinfo')
  })

  it('connects per user, reports only sanitized status, and disconnects/revokes', async () => {
    const { store, oauth, service } = fixture(async () => new Response('{}'))
    await service.connect(actor, 'gmail', tokens)
    const status = await service.status(actor)
    expect(status.services.find(s => s.service === 'gmail')).toMatchObject({ status: 'connected', account: 'agent@example.com' })
    expect(JSON.stringify(status)).not.toContain('refresh-token-value')
    expect(await service.disconnect(actor, 'gmail')).toMatchObject({ disconnected: true, providerRevoked: true })
    expect(oauth.revoked).toEqual(['refresh-token-value'])
    expect(store.grants.has('gmail')).toBe(false)
  })

  it('searches Gmail metadata and reads body only for selected message', async () => {
    const urls: URL[] = []
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input)); urls.push(url)
      if (url.pathname.endsWith('/messages')) return new Response(JSON.stringify({ resultSizeEstimate: 1, messages: [{ id: 'msg-1', threadId: 'thread-1' }] }))
      if (url.searchParams.get('format') === 'metadata') return new Response(JSON.stringify({ id: 'msg-1', threadId: 'thread-1', snippet: 'preview', payload: { headers: [{name:'From',value:'sender@example.com'},{name:'Subject',value:'Hello'}] } }))
      return new Response(JSON.stringify({ id: 'msg-1', threadId: 'thread-1', snippet: 'preview', payload: { mimeType: 'text/plain', headers: [{name:'Subject',value:'Hello'}], body: { data: Buffer.from('Selected body').toString('base64url') } } }))
    }
    const { store, service } = fixture(fetcher); ready(store)
    expect((await service.gmailSearch(actor, 'from:example.com')).messages[0]).toMatchObject({ id:'msg-1',from:'sender@example.com',subject:'Hello' })
    expect(urls.find(url => url.searchParams.get('format')==='metadata')?.searchParams.getAll('metadataHeaders')).toEqual(['From','To','Subject','Date'])
    expect((await service.gmailRead(actor,'msg-1')).body).toBe('Selected body')
    await expect(service.gmailSearch(actor,'')).rejects.toThrow(/Search must/)
  })

  it('creates a Gmail draft but sends only a tracked draft after explicit approval', async () => {
    const sent: string[] = []
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/drafts') && init?.method === 'POST') return new Response(JSON.stringify({ id:'gdraft-1' }))
      if (url.pathname.endsWith('/drafts/send')) { sent.push(String(init?.body)); return new Response(JSON.stringify({ id:'message-sent-1' })) }
      return new Response('{}')
    }
    const { store, service } = fixture(fetcher); ready(store)
    const draft = await service.gmailDraft(actor,{to:'recipient@example.com',subject:'Review',body:'Draft body'})
    expect(draft.state).toBe('draft'); expect(sent).toHaveLength(0)
    await expect(service.gmailSendApprovedDraft(actor,draft.id,false)).rejects.toThrow(/Explicit send approval/)
    expect(sent).toHaveLength(0)
    expect(await service.gmailSendApprovedDraft(actor,draft.id,true)).toMatchObject({state:'sent',providerMessageId:'message-sent-1'})
    expect(sent).toHaveLength(1)
    await expect(service.gmailSendApprovedDraft(actor,draft.id,true)).rejects.toThrow(/not available/)
  })

  it('requires explicit calendar approval and keeps updates separate from reads', async () => {
    const calls: Array<{ method: string; path: string }> = []
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input)); calls.push({ method:String(init?.method??'GET'),path:url.pathname })
      if (url.pathname.endsWith('/events') && (init?.method??'GET')==='GET') return new Response(JSON.stringify({ items:[{ id:'event-12345',summary:'Existing',start:{date:'2026-10-01'},end:{date:'2026-10-02'},status:'confirmed' }] }))
      if (init?.method==='PUT') { const body=JSON.parse(String(init.body));expect(body.start).toEqual({date:'2026-10-02'});expect(body.end).toEqual({date:'2026-10-03'});return new Response(JSON.stringify({ id:'event-12345',htmlLink:'https://calendar.google.com/event' })) }
      return new Response(JSON.stringify({ id:'event-12345', htmlLink:'https://calendar.google.com/event' }), { status: 200 })
    }
    const { store, service } = fixture(fetcher); ready(store); store.grants.set('calendar',{...store.grants.get('gmail')!,service:'calendar',scopes:SERVICE_SCOPES.calendar})
    await expect(service.calendarCreate(actor,{approved:false,summary:'Test',start:'2026-10-01T10:00:00Z',end:'2026-10-01T11:00:00Z',timeZone:'America/New_York',idempotencyKey:'1234567890ab'})).rejects.toThrow(/Explicit calendar/)
    expect(calls).toHaveLength(0)
    expect((await service.calendarList(actor,{from:'2026-10-01T00:00:00Z',to:'2026-10-03T00:00:00Z'}))[0]).toMatchObject({id:'event-12345',source:'Google Calendar'})
    await service.calendarCreate(actor,{approved:true,summary:'Test',start:'2026-10-01T10:00:00Z',end:'2026-10-01T11:00:00Z',timeZone:'America/New_York',idempotencyKey:'1234567890ab'})
    expect(calls[1].method).toBe('POST')
    const firstId = calls[1].path
    await service.calendarCreate(actor,{approved:true,summary:'Test',start:'2026-10-01T10:00:00Z',end:'2026-10-01T11:00:00Z',timeZone:'America/New_York',idempotencyKey:'1234567890ab'})
    expect(calls[2].path).toBe(firstId)
    await expect(service.calendarUpdate(actor,{approved:false,eventId:'event-12345',start:'2026-10-02',end:'2026-10-03'})).rejects.toThrow(/Explicit calendar/)
    await service.calendarUpdate(actor,{approved:true,eventId:'event-12345',start:'2026-10-02',end:'2026-10-03'})
    expect(calls.at(-1)?.method).toBe('PUT')
  })

  it('uses drive.file for private files and marks revoked refresh grants as reconnect-required', async () => {
    const calls: Array<{ method: string; path: string; body: string }> = []
    const fetcher: typeof fetch = async (input, init) => { const url=new URL(String(input));calls.push({method:String(init?.method??'GET'),path:url.pathname,body:String(init?.body??'')});if(url.searchParams.get('alt')==='media')return new Response(new TextEncoder().encode('hello'));if(url.pathname.endsWith('/files/file-12345'))return new Response(JSON.stringify({id:'file-12345',name:'Private file',mimeType:'text/plain',size:'5',capabilities:{canDownload:true}}));if(url.pathname.endsWith('/files')&&(init?.method??'GET')==='GET')return new Response(JSON.stringify({files:[{id:'file-12345',name:'Private file',mimeType:'text/plain',capabilities:{canDownload:true}}]}));return new Response(JSON.stringify({id:'created-12345',name:'Private file',mimeType:'text/plain',webViewLink:'https://drive.google.com/file'})) }
    const { store, oauth, service } = fixture(fetcher); ready(store); store.grants.set('drive',{...store.grants.get('gmail')!,service:'drive',scopes:SERVICE_SCOPES.drive})
    const file=await service.driveCreate(actor,{name:'Private file',mimeType:'text/plain',contentBase64:Buffer.from('hello').toString('base64')})
    expect(file.sharing).toBe('private')
    expect(calls[0].body).not.toContain('permissions')
    expect((await service.driveList(actor))[0]).toMatchObject({id:'file-12345',name:'Private file'})
    expect((await service.driveRead(actor,'file-12345')).contentBase64).toBe(Buffer.from('hello').toString('base64'))
    oauth.failRefresh=true
    await expect(service.driveList(actor)).rejects.toThrow(/revoked/)
    expect(store.grants.get('drive')?.state).toBe('reauth_required')
  })
})
