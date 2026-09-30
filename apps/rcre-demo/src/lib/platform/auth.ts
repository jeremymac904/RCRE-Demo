import 'server-only'
import { cookies } from 'next/headers'
import { createHmac, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
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
// Signed cookies carry identity, while a durable server-side session row is
// required for each request so revocation, expiry, and deactivation take effect immediately.

const SESSION_TTL_MS = 12 * 3600000
const SESSION_VERSION = 'v1'

let localSessionSecret: string | undefined

function sessionSecret(): string {
  const configured = process.env.RCRE_SESSION_SECRET
  if (configured && configured.length >= 32) return configured
  if (process.env.NODE_ENV === 'production') {
    throw new AccessError('Session signing is not configured', 503)
  }
  // Local development only. Generate a per-process key so no signing secret
  // is checked in. Production builds must receive a private host secret.
  return (localSessionSecret ??= randomBytes(32).toString('base64url'))
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
  sessionId: string
  exp: number
  iat: number
}

function encodeSession(actorId: string, sessionId: string, ttlMs = SESSION_TTL_MS): string {
  const now = Date.now()
  const payload: SessionPayload = { v: SESSION_VERSION, actorId, sessionId, iat: now, exp: now + ttlMs }
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const sig = sign(body)
  return `${body}.${sig}`
}

function decodeSession(token: string): SessionPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  if (!body || !sig) return null
  if (!verify(body, sig)) return null
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8')) as SessionPayload
    if (payload.v !== SESSION_VERSION) return null
    if (typeof payload.actorId !== 'string' || typeof payload.sessionId !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function demoEnabled() {
  // Deploy-time flags must never re-enable persona authentication in production.
  return process.env.NODE_ENV !== 'production'
}

export function sessionCookieOptions() {
  return { httpOnly: true as const, sameSite: 'strict' as const, path: '/', maxAge: SESSION_TTL_MS / 1000, secure: process.env.NODE_ENV === 'production' }
}

export function createSession(id: string) {
  if (!demoEnabled()) throw new AccessError('Local personas unavailable', 403)
  const actor = PERSONAS.find((p) => p.id === id) ?? getRecord<{ actor: PlatformActor }>('members', id)?.actor
  if (!actor) throw new AccessError('Unknown persona', 400)
  if (getRecord<any>('members', id)?.disabled) throw new AccessError('Membership inactive')
  const sessionId = randomUUID()
  const token = encodeSession(id, sessionId)
  // Signed cookies are accepted only while their server-side revocation row exists.
  putRecord('sessions', {
    id: sessionId,
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
    const session = getRecord<{ actorId: string; expiresAt: number; revoked: boolean }>('sessions', payload.sessionId)
    if (!session || session.actorId !== payload.actorId || session.revoked || session.expiresAt <= Date.now()) return null
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
  // Server-side revocation is checked by actorOrNull on every authenticated request.
  try {
    const payload = decodeSession(token)
    const s = payload ? getRecord<{ id: string; revoked: boolean }>('sessions', payload.sessionId) : getRecord<{ id: string; revoked: boolean }>('sessions', legacyHashToken(token) ?? '')
    if (s) putRecord('sessions', { ...s, revoked: true })
  } catch {
    // The cookie is deleted; server-side state remains the authority for acceptance.
  }
}

export function can(a: PlatformActor, c: string): boolean {
  if (c === 'ai' || c.startsWith('ai.') || c === 'personal' || c === 'community.read' || c === 'academy.read') return true
  if (a.role === 'broker_owner') return true
  if (c === 'settings.people') return a.role === 'managing_broker'
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
export function authorizeMemberChange(actor: PlatformActor, target: PlatformActor, change: { role: PlatformRole; officeId?: string; teamId?: string }) {
  assertCapability(actor, 'settings.people')
  if (target.organizationId !== actor.organizationId) throw new AccessError('Member not found', 404)
  if (target.id === actor.id) throw new AccessError('You cannot modify your own role')
  if (actor.role === 'broker_owner') return
  if (actor.role !== 'managing_broker' || target.officeId !== actor.officeId) throw new AccessError('Member is outside your office', 403)
  if (['broker_owner', 'managing_broker', 'marketing_admin'].includes(target.role)) throw new AccessError('This leadership or cross-brokerage role cannot be changed here', 403)
  if (!['agent', 'team_leader', 'transaction_coordinator'].includes(change.role)) throw new AccessError('This role requires brokerage owner approval', 403)
  if (change.officeId !== actor.officeId || change.teamId !== actor.officeId) throw new AccessError('Office and team must remain within your assigned office', 403)
}
export function sessionList(a: PlatformActor) {
  return readRecords<{ id: string; actorId: string; createdAt: string; expiresAt: number; revoked: boolean }>('sessions')
    .filter((s) => s.actorId === a.id)
    .map(({ id, createdAt, expiresAt, revoked }) => ({ id, createdAt, expiresAt, revoked }))
}
