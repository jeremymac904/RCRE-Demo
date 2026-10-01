import 'server-only'
import type { Fetcher, WorkspaceService } from './types'

export class GoogleWorkspaceHttpApi {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async request(service: WorkspaceService, accessToken: string, path: string, init: RequestInit = {}): Promise<Response> {
    const base = service === 'gmail' ? 'https://gmail.googleapis.com/gmail/v1/users/me' : service === 'calendar' ? 'https://www.googleapis.com/calendar/v3' : 'https://www.googleapis.com/drive/v3'
    const response = await this.fetcher(`${base}${path}`, { ...init, cache: 'no-store', headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json', ...init.headers } })
    return response
  }
}

export function decodeGmailBody(data?: string): string {
  if (!data) return ''
  const output = Buffer.from(data, 'base64url').toString('utf8')
  return output.slice(0, 64_000)
}

export function encodeMimeAddress(value: string): string { return value.replace(/[\r\n]/g, '').trim() }

export function parseHeaders(payload: any) {
  const headers = Array.isArray(payload?.headers) ? payload.headers : []
  const find = (key: string) => headers.find((h: any) => String(h?.name).toLowerCase() === key.toLowerCase())?.value ?? ''
  return { from: String(find('From')).slice(0, 500), to: String(find('To')).slice(0, 500), subject: String(find('Subject')).slice(0, 500), date: String(find('Date')).slice(0, 200) }
}

export function extractPlainBody(payload: any): string {
  const found: string[] = []
  const walk = (part: any) => {
    if (part?.mimeType === 'text/plain' && part?.body?.data) found.push(decodeGmailBody(part.body.data))
    for (const child of Array.isArray(part?.parts) ? part.parts : []) walk(child)
  }
  walk(payload)
  if (found.length) return found.join('\n').slice(0, 64_000)
  const html: string[] = []
  const walkHtml = (part: any) => { if (part?.mimeType === 'text/html' && part?.body?.data) html.push(decodeGmailBody(part.body.data)); for (const child of Array.isArray(part?.parts) ? part.parts : []) walkHtml(child) }
  walkHtml(payload)
  return html.join('\n').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').slice(0, 64_000)
}
