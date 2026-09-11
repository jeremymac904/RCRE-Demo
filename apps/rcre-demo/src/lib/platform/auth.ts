import 'server-only'
import { cookies } from 'next/headers'
import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { getRecord, putRecord, readRecords } from './store'

export type PlatformRole = 'agent' | 'team_leader' | 'managing_broker' | 'broker_owner' | 'transaction_coordinator' | 'marketing_admin' | 'trainer'

export interface PlatformActor {
  id: string
  userId: string
  organizationId: string
  role: PlatformRole
  name: string
  market: string
  teamId: string
  officeId: string
}

// Persona registry — local synthetic personas for the demo build. Taquilla
// Allen (managing_broker, AL) is the canonical demo leader persona (u-taquilla).
// Real public personas and personas from the demo data layer override these
// when present.
export const PERSONAS: PlatformActor[] = [
  { id: 'u-sarah', name: 'Alex Morgan', role: 'agent', market: 'Florida', teamId: 'fl', officeId: 'fl' },
  { id: 'u-vito', name: 'Jordan Ellis', role: 'agent', market: 'Alabama', teamId: 'al', officeId: 'al' },
  { id: 'u-leader', name: 'Casey Brooks', role: 'team_leader', market: 'Alabama', teamId: 'al', officeId: 'al' },
  { id: 'u-taquilla', name: 'Taquilla Allen', role: 'managing_broker', market: 'Alabama', teamId: 'al', officeId: 'al' },
  { id: 'u-julio', name: 'Julio Arango', role: 'broker_owner', market: 'Both markets', teamId: 'all', officeId: 'all' },
  { id: 'u-tc', name: 'Margie Olsen-Alvarez', role: 'transaction_coordinator', market: 'Florida', teamId: 'fl', officeId: 'fl' },
  { id: 'u-marketing', name: 'Avery Lane', role: 'marketing_admin', market: 'Both markets', teamId: 'all', officeId: 'all' },
  { id: 'u-trainer', name: 'Quinn Davis', role: 'trainer', market: 'Both markets', teamId: 'all', officeId: 'all' },
].map((p) => ({ ...p, role: p.role as PlatformRole, userId: p.id, organizationId: 'rcre-local' }))

export function directory(organizationId: string) {
  const members = readRecords<any>('members')
  const known = [...PERSONAS, ...members.filter((m: any) => m.actor && !PERSONAS.some((p) => p.id === m.id)).map((m: any) => m.actor as PlatformActor)]
  return known
    .filter((p) => p.organizationId === organizationId)
    .map((p) => {
      const m = members.find((m: any) => m.id === p.id)
      return {
        ...p,
        role: m?.role ?? p.role,
        officeId: m?.officeId ?? p.officeId,
        teamId: m?.teamId ?? p.teamId,
        market: m?.officeId === 'al' ? 'Alabama' : m?.officeId === 'fl' ? 'Florida' : p.market,
        disabled: !!m?.disabled,
      }
    })
}

export const SESSION_COOKIE = 'rcre_local_session'
export class AccessError extends Error {
  constructor(message = 'Access denied', public status = 403) {
    super(message)
  }
}

// ---------------------------------------------------------------------------
// Signed session tokens (serverless-safe)
// ---------------------------------------------------------------------------
// Sessions live in a signed cookie so they survive Netlify function cold
// starts (where /tmp is wiped). The SQLite `sessions` table is still
// maintained for the in-app session list and revocation. The cookie itself
// is the source of truth for "is this actor signed in" — server-side
// validation only requires reading the cookie.

const SESSION_TTL_MS = 12 * 3600000
const SESSION_VERSION = 'v1'

function sessionSecret(): string {
  return (
    process.env.RCRE_SESSION_SECRET ||
    // Stable per-deploy fallback. Not for production. Anyone with the source
    // can forge a token — that is acceptable for the local review environment
    // and is gated by demoEnabled() below.
    'rcre-local-demo-secret-do-not-use-in-production-2026'
  )
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64')
}

function sign(payload: string): string {
  return b64url(createHmac('sha256', sessionSecret()).update(payload).digest())
}

function verify(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload), 'utf8')
  const got = Buffer.from(signature, 'utf8')
  if (expected.length !== got.length) return false
  return timingSafeEqual(expected, got)
}

interface SessionPayload {
  v: string
  actorId: string
  exp: number
  iat: number
}

function encodeSession(actorId: string, ttlMs = SESSION_TTL_MS): string {
  const now = Date.now()
  const payload: SessionPayload = { v: SESSION_VERSION, actorId, iat: now, exp: now + ttlMs }
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const sig = sign(body)
  return `${body}.${sig}`
}

function decodeSession(token: string): SessionPayload | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  if (!verify(body, sig)) return null
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8')) as SessionPayload
    if (payload.v !== SESSION_VERSION) return null
    if (typeof payload.actorId !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function demoEnabled() {
  return process.env.RCRE_APP_MODE === 'local' || process.env.NODE_ENV !== 'production' || process.env.RCRE_DEMO_ENABLED === '1'
}

export function createSession(id: string) {
  if (!demoEnabled()) throw new AccessError('Local personas unavailable', 403)
  const actor = PERSONAS.find((p) => p.id === id) ?? getRecord<{ actor: PlatformActor }>('members', id)?.actor
  if (!actor) throw new AccessError('Unknown persona', 400)
  if (getRecord<any>('members', id)?.disabled) throw new AccessError('Membership inactive')
  const token = encodeSession(id)
  // Mirror in SQLite for the in-app session list and revocation.
  putRecord('sessions', {
    id: token.slice(0, 64),
    actorId: id,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    revoked: false,
  })
  return token
}

export async function actorOrNull(): Promise<PlatformActor | null> {
  if (!demoEnabled()) return null
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  // Primary path: signed cookie payload.
  const payload = decodeSession(token)
  if (payload) {
    return resolveActiveActor(payload.actorId)
  }
  // Fallback: legacy SHA-256 token still in SQLite from before this update.
  const legacyId = legacyHashToken(token)
  if (legacyId) {
    const s = getRecord<{ actorId: string; expiresAt: number; revoked: boolean }>('sessions', legacyId)
    if (s && !s.revoked && s.expiresAt > Date.now()) {
      return resolveActiveActor(s.actorId)
    }
  }
  return null
}

async function resolveActiveActor(actorId: string): Promise<PlatformActor | null> {
  const persona = PERSONAS.find((p) => p.id === actorId)
  const member = getRecord<{ actor: PlatformActor }>('members', actorId)
  const actor = persona ?? member?.actor
  if (!actor) return null
  if (getRecord<{ id: string; disabled?: boolean }>('members', actorId)?.disabled) return null
  return directory(actor.organizationId).find((p) => p.id === actor.id) ?? null
}

function legacyHashToken(token: string): string | null {
  // Match the previous createHash('sha256').update(token).digest('hex') path
  // so tokens minted by an older build still resolve during the transition.
  try {
    return createHash('sha256').update(token).digest('hex')
  } catch {
    return null
  }
}

export async function requireActor() {
  const a = await actorOrNull()
  if (!a) throw new AccessError('Session expired. Sign in again.', 401)
  return a
}

export async function revokeSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return
  cookieStore.delete(SESSION_COOKIE)
  // Best-effort SQLite mirror cleanup.
  try {
    const s = getRecord<{ id: string; revoked: boolean }>('sessions', token.slice(0, 64))
    if (s) putRecord('sessions', { ...s, revoked: true })
  } catch {
    // SQLite may be unavailable on cold start — that is fine, the cookie
    // deletion is what actually ends the session.
  }
}

export function can(a: PlatformActor, c: string): boolean {
  if (c === 'ai' || c.startsWith('ai.') || c === 'personal' || c === 'community.read' || c === 'academy.read') return true
  if (a.role === 'broker_owner') return true
  const leadership = ['team_leader', 'managing_broker'].includes(a.role)
  if (c.startsWith('transactions.')) return ['agent', 'team_leader', 'managing_broker', 'transaction_coordinator'].includes(a.role)
  if (c === 'calendar' && a.role === 'marketing_admin') return true
  if (c === 'approvals' && a.role === 'marketing_admin') return true
  if (c.startsWith('crm') || c === 'calendar' || c === 'pipeline') return a.role === 'agent' || leadership
  if (c === 'command' || c === 'reporting' || c === 'recruiting' || c === 'approvals') return leadership
  if (c.startsWith('marketing')) return ['agent', 'marketing_admin', 'team_leader', 'managing_broker'].includes(a.role)
  if (c.startsWith('academy.') || c.startsWith('community.')) return a.role === 'trainer' || leadership
  if (c === 'cms') return a.role === 'marketing_admin'
  if (c.startsWith('settings.'))
    return (
      c === 'settings.personal' ||
      c === 'settings.account' ||
      c === 'settings.ai' ||
      (c === 'settings.marketing' && a.role === 'marketing_admin') ||
      (c === 'settings.academy' && a.role === 'trainer') ||
      (c === 'settings.leads' && leadership)
    )
  return false
}
export function assertCapability(a: PlatformActor, c: string) {
  if (!can(a, c)) throw new AccessError()
}
export function scopedOwner(a: PlatformActor, ownerId: string, officeId?: string) {
  if (a.role === 'broker_owner') return true
  if (a.role === 'agent') return ownerId === a.id
  if (['team_leader', 'managing_broker'].includes(a.role)) return officeId === a.officeId
  return false
}
export function sessionList(a: PlatformActor) {
  return readRecords<{ id: string; actorId: string; createdAt: string; expiresAt: number; revoked: boolean }>('sessions')
    .filter((s) => s.actorId === a.id)
    .map(({ id, createdAt, expiresAt, revoked }) => ({ id, createdAt, expiresAt, revoked }))
}
