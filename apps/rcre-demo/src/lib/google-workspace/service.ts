import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { getRepository } from '@/lib/db'
import type { Repository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { repositoryRoleForPlatform } from '@/lib/auth/role-mapping'
import { decryptRefreshToken, encryptRefreshToken } from './crypto'
import { GoogleWorkspaceHttpApi, encodeMimeAddress, extractPlainBody, parseHeaders } from './http-api'
import { GoogleOAuthHttp, SERVICE_SCOPES, workspaceOAuthConfig } from './oauth'
import { RepositoryGoogleGrantStore } from './repository-store'
import type { GoogleOAuthProvider, GoogleTokenSet, StoredGoogleGrant, WorkspaceGrantStore, WorkspaceService } from './types'

export interface TrackedDraft { [key: string]: unknown; id: string; googleDraftId: string; ownerUserId: string; to: string; subject: string; state: 'draft' | 'sending' | 'sent' | 'send_unknown'; createdAt: string }
export interface WorkspaceServiceStore extends WorkspaceGrantStore {
  getDraft(actor: PlatformActor, id: string): Promise<{ draft: TrackedDraft; version: number } | null>
  putDraft(actor: PlatformActor, draft: TrackedDraft, expectedVersion?: number): Promise<number>
}
export class RepositoryWorkspaceStore extends RepositoryGoogleGrantStore implements WorkspaceServiceStore {
  async getDraft(actor: PlatformActor, id: string) {
    const row = await (await getRepository()).getDomainRecord<TrackedDraft>(repositoryActor(actor), 'google_workspace_drafts', id)
    if (!row || row.ownerUserId !== actor.userId) return null
    return { draft: row.data, version: row.version }
  }
  async putDraft(actor: PlatformActor, draft: TrackedDraft, expectedVersion?: number) {
    const row = await (await getRepository()).putDomainRecord(repositoryActor(actor), { collection: 'google_workspace_drafts', recordId: draft.id, ownerUserId: actor.userId, data: draft as unknown as Record<string, unknown>, ...(expectedVersion === undefined ? {} : { expectedVersion }) })
    return row.version
  }
}

function repositoryActor(actor: PlatformActor) {
  return { userId: actor.userId, organizationId: actor.organizationId, role: repositoryRoleForPlatform(actor.role), officeId: actor.officeId }
}

function validateEmail(email: string) { const value = email.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 320) throw new Error('Enter a valid email address'); return value }
function htmlEscape(value: string) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!) }
function base64Url(value: string) { return Buffer.from(value, 'utf8').toString('base64url') }
function apiError(response: Response): never { throw new Error(response.status === 401 || response.status === 403 ? 'Google access is unavailable; reconnect this service or review its permissions' : `Google Workspace request failed (${response.status})`) }

export interface GoogleWorkspaceDeps { store: WorkspaceServiceStore; oauth: GoogleOAuthProvider; api: GoogleWorkspaceHttpApi; repository?: Repository }
export class GoogleWorkspaceService {
  constructor(private readonly deps: GoogleWorkspaceDeps) {}

  async connect(actor: PlatformActor, service: WorkspaceService, tokens: GoogleTokenSet) {
    const existing = await this.deps.store.get(actor, service)
    if (!tokens.refreshToken && existing?.connectedEmail !== tokens.email) throw new Error('Google did not issue a new offline grant for this account; reconnect and approve access')
    const refreshToken = tokens.refreshToken ?? (existing ? decryptRefreshToken(existing.refreshToken) : '')
    if (!refreshToken) throw new Error('Google did not issue offline access. Reconnect and approve access.')
    const required = SERVICE_SCOPES[service]
    if (required.some(scope => !tokens.scopes.includes(scope))) throw new Error('Google did not grant all requested permissions. Review consent and reconnect.')
    const now = new Date().toISOString()
    const grant: StoredGoogleGrant = { service, connectedEmail: tokens.email, scopes: tokens.scopes, refreshToken: encryptRefreshToken(refreshToken), connectedAt: existing?.connectedAt ?? now, updatedAt: now, state: 'connected' }
    await this.deps.store.put(actor, grant)
    await this.audit(actor, 'google_workspace.connected', service)
  }

  async status(actor: PlatformActor) {
    const rows = await Promise.all((['gmail', 'calendar', 'drive'] as WorkspaceService[]).map(async service => {
      const grant = await this.deps.store.get(actor, service)
      return { service, status: grant?.state ?? 'disconnected', account: grant?.connectedEmail ?? null, scopes: grant?.scopes.filter(scope => !['openid','email','profile'].includes(scope)) ?? [], connectedAt: grant?.connectedAt ?? null, lastError: grant?.lastError ?? null }
    }))
    return { services: rows }
  }

  async disconnect(actor: PlatformActor, service: WorkspaceService) {
    const grant = await this.deps.store.get(actor, service)
    let providerRevoked: boolean | null = null
    if (grant) {
      try { providerRevoked = await this.deps.oauth.revoke(decryptRefreshToken(grant.refreshToken)) } catch { providerRevoked = false }
      await this.deps.store.remove(actor, service)
    }
    await this.audit(actor, 'google_workspace.disconnected', service)
    return { service, disconnected: true, providerRevoked }
  }

  async gmailSearch(actor: PlatformActor, query: string) {
    const q = query.trim()
    if (q.length < 1 || q.length > 250) throw new Error('Search must be between 1 and 250 characters')
    const result = await this.request(actor, 'gmail', `/messages?${new URLSearchParams({ q, maxResults: '25' })}`)
    const list = await result.json() as { messages?: Array<{ id: string; threadId: string }>; resultSizeEstimate?: number }
    const messages = await Promise.all((list.messages ?? []).slice(0, 25).map(async message => {
      const metadataParams = new URLSearchParams({ format: 'metadata' })
      for (const header of ['From','To','Subject','Date']) metadataParams.append('metadataHeaders', header)
      const response = await this.request(actor, 'gmail', `/messages/${encodeURIComponent(message.id)}?${metadataParams}`)
      const item = await response.json() as Record<string, any>
      return { id: String(item.id), threadId: String(item.threadId), snippet: String(item.snippet ?? '').slice(0, 500), ...parseHeaders(item.payload) }
    }))
    return { messages, resultSizeEstimate: Number(list.resultSizeEstimate ?? messages.length) }
  }

  async gmailRead(actor: PlatformActor, id: string) {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) throw new Error('Invalid Gmail message id')
    const response = await this.request(actor, 'gmail', `/messages/${encodeURIComponent(id)}?format=full`)
    const item = await response.json() as Record<string, any>
    return { id: String(item.id), threadId: String(item.threadId), snippet: String(item.snippet ?? '').slice(0, 500), ...parseHeaders(item.payload), body: extractPlainBody(item.payload) }
  }

  async gmailDraft(actor: PlatformActor, input: { to: string; subject: string; body: string }) {
    const to = validateEmail(input.to), subject = input.subject.trim(), body = input.body.trim()
    if (!subject || subject.length > 500 || !body || body.length > 20_000) throw new Error('Draft subject or body is invalid')
    const mime = [`To: ${encodeMimeAddress(to)}`, `Subject: ${encodeMimeAddress(subject)}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', body].join('\r\n')
    const response = await this.request(actor, 'gmail', '/drafts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: { raw: base64Url(mime) } }) })
    const result = await response.json() as { id?: string; message?: { id?: string } }
    if (!result.id) throw new Error('Google did not confirm the draft')
    const id = randomUUID()
    const draft: TrackedDraft = { id, googleDraftId: result.id, ownerUserId: actor.userId, to, subject, state: 'draft', createdAt: new Date().toISOString() }
    await this.deps.store.putDraft(actor, draft)
    await this.audit(actor, 'google_workspace.gmail_draft_created', id)
    return { id, to, subject, state: 'draft' as const }
  }

  async gmailSendApprovedDraft(actor: PlatformActor, id: string, approved: boolean) {
    if (approved !== true) throw new Error('Explicit send approval is required')
    const entry = await this.deps.store.getDraft(actor, id)
    if (!entry || entry.draft.ownerUserId !== actor.userId) throw new Error('Draft not found')
    if (entry.draft.state !== 'draft') throw new Error('Draft is not available to send')
    const claimed = { ...entry.draft, state: 'sending' as const }
    await this.deps.store.putDraft(actor, claimed, entry.version)
    let sent: { id?: string }
    try {
      const response = await this.request(actor, 'gmail', '/drafts/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: entry.draft.googleDraftId }) })
      sent = await response.json() as { id?: string }
      if (!sent.id) throw new Error('Google did not confirm message acceptance')
    } catch (error) {
      // The provider may have accepted a request even if its response was lost.
      // Never offer an automatic retry that could send a duplicate message.
      try { await this.deps.store.putDraft(actor, { ...claimed, state: 'send_unknown' }, entry.version + 1) } catch { /* fail closed; UI must check Gmail */ }
      throw error
    }
    await this.deps.store.putDraft(actor, { ...claimed, state: 'sent' }, entry.version + 1)
    await this.audit(actor, 'google_workspace.gmail_draft_sent', id)
    return { id, state: 'sent' as const, providerMessageId: sent.id }
  }

  async calendarList(actor: PlatformActor, input: { from: string; to: string; calendarId?: string }) {
    const from = Date.parse(input.from), to = Date.parse(input.to)
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 93 * 86400000) throw new Error('Calendar range must be valid and no longer than 93 days')
    const calendarId = encodeURIComponent(input.calendarId || 'primary')
    const params = new URLSearchParams({ timeMin: new Date(from).toISOString(), timeMax: new Date(to).toISOString(), maxResults: '100', singleEvents: 'true', orderBy: 'startTime' })
    const response = await this.request(actor, 'calendar', `/calendars/${calendarId}/events?${params}`)
    const body = await response.json() as { items?: Array<Record<string, any>> }
    return (body.items ?? []).slice(0, 100).map(event => ({ id: String(event.id), summary: String(event.summary ?? '').slice(0, 500), start: event.start?.dateTime ?? event.start?.date ?? null, end: event.end?.dateTime ?? event.end?.date ?? null, status: String(event.status ?? 'unknown'), location: String(event.location ?? '').slice(0, 500), htmlLink: event.htmlLink ?? null, source: 'Google Calendar' }))
  }

  async calendarCreate(actor: PlatformActor, input: { approved: boolean; summary: string; start: string; end: string; timeZone: string; description?: string; location?: string; calendarId?: string; idempotencyKey: string }) {
    if (input.approved !== true) throw new Error('Explicit calendar change approval is required')
    const summary = input.summary.trim(), start = Date.parse(input.start), end = Date.parse(input.end)
    if (!summary || summary.length > 250 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 24 * 3600000 || !validTimezone(input.timeZone)) throw new Error('Calendar event details are invalid')
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(input.idempotencyKey)) throw new Error('A valid idempotency key is required')
    const googleId = createHash('sha256').update(input.idempotencyKey).digest('hex')
    const startValue = /^\d{4}-\d{2}-\d{2}$/.test(input.start) ? { date: input.start } : { dateTime: new Date(start).toISOString(), timeZone: input.timeZone }
    const endValue = /^\d{4}-\d{2}-\d{2}$/.test(input.end) ? { date: input.end } : { dateTime: new Date(end).toISOString(), timeZone: input.timeZone }
    const body = { id: googleId, summary, start: startValue, end: endValue, description: (input.description ?? '').slice(0, 4000), location: (input.location ?? '').slice(0, 500) }
    const path = `/calendars/${encodeURIComponent(input.calendarId || 'primary')}/events`
    let response = await this.request(actor, 'calendar', path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (response.status === 409) response = await this.request(actor, 'calendar', `${path}/${googleId}`)
    const event = await response.json() as { id?: string; htmlLink?: string }
    if (!event.id) throw new Error('Google did not confirm the calendar event')
    await this.audit(actor, 'google_workspace.calendar_event_created', event.id)
    return { id: event.id, htmlLink: event.htmlLink ?? null, state: 'created' as const }
  }

  async calendarUpdate(actor: PlatformActor, input: { approved: boolean; eventId: string; summary?: string; start?: string; end?: string; timeZone?: string; description?: string; location?: string; calendarId?: string }) {
    if (input.approved !== true) throw new Error('Explicit calendar change approval is required')
    if (!/^[A-Za-z0-9_-]{5,1024}$/.test(input.eventId)) throw new Error('Calendar event id is invalid')
    const path = `/calendars/${encodeURIComponent(input.calendarId || 'primary')}/events/${encodeURIComponent(input.eventId)}`
    const before = await this.request(actor, 'calendar', path)
    const current = await before.json() as Record<string, any>
    const startInput = input.start, endInput = input.end
    const start = startInput ? Date.parse(startInput) : Date.parse(current.start?.dateTime ?? current.start?.date)
    const end = endInput ? Date.parse(endInput) : Date.parse(current.end?.dateTime ?? current.end?.date)
    const timeZone = input.timeZone ?? current.start?.timeZone ?? 'UTC'
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || ((startInput && !/^\d{4}-\d{2}-\d{2}$/.test(startInput)) || (endInput && !/^\d{4}-\d{2}-\d{2}$/.test(endInput))) && !validTimezone(timeZone)) throw new Error('Updated event timing is invalid')
    const startValue = startInput ? (/^\d{4}-\d{2}-\d{2}$/.test(startInput) ? { date: startInput } : { dateTime: new Date(start).toISOString(), timeZone }) : current.start
    const endValue = endInput ? (/^\d{4}-\d{2}-\d{2}$/.test(endInput) ? { date: endInput } : { dateTime: new Date(end).toISOString(), timeZone }) : current.end
    const body = { ...current, summary: input.summary?.trim().slice(0, 250) ?? current.summary, start: startValue, end: endValue, ...(input.description !== undefined ? { description: input.description.slice(0, 4000) } : {}), ...(input.location !== undefined ? { location: input.location.slice(0, 500) } : {}) }
    const response = await this.request(actor, 'calendar', path, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const event = await response.json() as { id?: string; htmlLink?: string }
    if (!event.id) throw new Error('Google did not confirm the calendar update')
    await this.audit(actor, 'google_workspace.calendar_event_updated', event.id)
    return { id: event.id, htmlLink: event.htmlLink ?? null, state: 'updated' as const }
  }

  async driveList(actor: PlatformActor, query = '') {
    if (query.length > 120) throw new Error('Drive search is too long')
    const q = query.trim() ? `name contains '${query.trim().replace(/[\\']/g, '')}' and trashed = false` : 'trashed = false'
    const params = new URLSearchParams({ q, pageSize: '50', orderBy: 'modifiedTime desc', fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,capabilities(canDownload,canEdit)),nextPageToken', spaces: 'drive' })
    const response = await this.request(actor, 'drive', `/files?${params}`)
    const body = await response.json() as { files?: Array<Record<string, any>> }
    return (body.files ?? []).map(file => ({ id: String(file.id), name: String(file.name).slice(0, 500), mimeType: String(file.mimeType), modifiedTime: file.modifiedTime ?? null, size: file.size ?? null, webViewLink: file.webViewLink ?? null, canDownload: file.capabilities?.canDownload === true }))
  }

  async driveRead(actor: PlatformActor, id: string) {
    if (!/^[A-Za-z0-9_-]{5,200}$/.test(id)) throw new Error('Drive file id is invalid')
    const metadata = await this.request(actor, 'drive', `/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,capabilities(canDownload)`)
    const file = await metadata.json() as { id: string; name: string; mimeType: string; size?: string; capabilities?: { canDownload?: boolean } }
    if (file.capabilities?.canDownload !== true || Number(file.size ?? 0) > 10 * 1024 * 1024) throw new Error('This file cannot be read here or exceeds the 10 MB limit')
    const exportMime = file.mimeType === 'application/vnd.google-apps.document' ? 'text/plain'
      : file.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'text/csv'
      : file.mimeType === 'application/vnd.google-apps.presentation' ? 'application/pdf' : null
    if (file.mimeType.startsWith('application/vnd.google-apps.') && !exportMime) throw new Error('This Google file type is not available for preview')
    const path = exportMime ? `/files/${encodeURIComponent(id)}/export?mimeType=${encodeURIComponent(exportMime)}` : `/files/${encodeURIComponent(id)}?alt=media`
    const response = await this.request(actor, 'drive', path, { headers: { accept: '*/*' } })
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > 10 * 1024 * 1024) throw new Error('This file exceeds the 10 MB read limit')
    return { id: file.id, name: file.name, mimeType: file.mimeType, contentBase64: bytes.toString('base64') }
  }

  async driveCreate(actor: PlatformActor, input: { name: string; mimeType: string; contentBase64: string }) {
    const name = input.name.trim()
    if (!name || name.length > 255 || !/^[\w.+-]+\/[\w.+-]+$/.test(input.mimeType) || !/^[A-Za-z0-9+/=_-]+$/.test(input.contentBase64) || input.contentBase64.length > 10 * 1024 * 1024 * 1.4) throw new Error('Drive file details are invalid or too large')
    const content = Buffer.from(input.contentBase64, 'base64')
    if (content.length > 10 * 1024 * 1024) throw new Error('Drive file exceeds the 10 MB limit')
    const boundary = `rcre_${randomUUID().replace(/-/g, '')}`
    const metadata = JSON.stringify({ name, mimeType: input.mimeType })
    const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`), content, Buffer.from(`\r\n--${boundary}--`)])
    const response = await this.request(actor, 'drive', '/files?fields=id,name,mimeType,webViewLink', { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${boundary}` }, body: new Uint8Array(body) })
    const file = await response.json() as { id?: string; name?: string; mimeType?: string; webViewLink?: string }
    if (!file.id) throw new Error('Google did not confirm the Drive file')
    await this.audit(actor, 'google_workspace.drive_file_created', file.id)
    return { id: file.id, name: file.name ?? name, mimeType: file.mimeType ?? input.mimeType, webViewLink: file.webViewLink ?? null, sharing: 'private' as const }
  }

  private async request(actor: PlatformActor, service: WorkspaceService, path: string, init: RequestInit = {}) {
    const grant = await this.requireGrant(actor, service)
    const token = await this.accessToken(actor, service)
    const response = await this.deps.api.request(service, token, path, init)
    if (response.status === 401 || response.status === 403) {
      await this.deps.store.put(actor, { ...grant, state: 'reauth_required', lastError: 'permission_or_token_revoked', updatedAt: new Date().toISOString() })
      apiError(response)
    }
    if (!response.ok) apiError(response)
    return response
  }

  private async requireGrant(actor: PlatformActor, service: WorkspaceService) {
    const grant = await this.deps.store.get(actor, service)
    if (!grant || grant.state !== 'connected') throw new Error(`${service} is not connected for this account`)
    if (SERVICE_SCOPES[service].some(scope => !grant.scopes.includes(scope))) throw new Error(`${service} permissions are incomplete; reconnect this service`)
    return grant
  }

  private async accessToken(actor: PlatformActor, service: WorkspaceService) {
    const grant = await this.requireGrant(actor, service)
    try {
      const refreshed = await this.deps.oauth.refresh(decryptRefreshToken(grant.refreshToken))
      if (refreshed.refreshToken) await this.deps.store.put(actor, { ...grant, refreshToken: encryptRefreshToken(refreshed.refreshToken), scopes: refreshed.scopes?.length ? [...new Set([...grant.scopes, ...refreshed.scopes])] : grant.scopes, updatedAt: new Date().toISOString() })
      return refreshed.accessToken
    } catch {
      await this.deps.store.put(actor, { ...grant, state: 'reauth_required', lastError: 'refresh_revoked_or_expired', updatedAt: new Date().toISOString() })
      throw new Error('Google access expired or was revoked; reconnect this service')
    }
  }

  private async audit(actor: PlatformActor, action: string, id: string) {
    const repo = this.deps.repository ?? await getRepository()
    await repo.recordAudit(repositoryActor(actor), { organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'user', action, targetType: 'google_workspace', targetId: id, effect: 'write', allowed: true, detail: {} })
  }
}

function validTimezone(value: string) { try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return value.length <= 100 } catch { return false } }

let defaultService: GoogleWorkspaceService | null = null
export function getGoogleWorkspaceService(): GoogleWorkspaceService {
  if (defaultService) return defaultService
  const config = workspaceOAuthConfig()
  const unavailable: GoogleOAuthProvider = {
    authorizationUrl: () => { throw new Error('Google Workspace OAuth is not configured') },
    exchange: async () => { throw new Error('Google Workspace OAuth is not configured') },
    refresh: async () => { throw new Error('Google Workspace OAuth is not configured') },
    revoke: async () => false,
  }
  defaultService = new GoogleWorkspaceService({ store: new RepositoryWorkspaceStore(), oauth: config ? new GoogleOAuthHttp(config) : unavailable, api: new GoogleWorkspaceHttpApi() })
  return defaultService
}
export function setGoogleWorkspaceServiceForTests(value: GoogleWorkspaceService | null) { defaultService = value }
