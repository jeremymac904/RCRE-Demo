import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dataMode, isProduction } from '@/lib/config/env'
import { getRecord, putRecord } from '@/lib/platform/store'
import { assertSameOriginMutation } from '@/lib/auth/request-origin'
import { rateLimitRequest, SharedRateLimitUnavailableError } from '@/lib/services/rate-limit'
import { hashPublicVisitorToken, publicSearchStateSchema, readPublicSearchState, replacePublicSearchState, type PublicSearchState } from '@/lib/property/public-search-state'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export const runtime = 'nodejs'
const FIXTURE_STATE = z.object({
  favorites: z.array(z.string().regex(/^[a-zA-Z0-9:_-]{1,160}$/)).max(100),
  searches: z.array(z.object({
    id: z.string().uuid(), name: z.string().trim().min(1).max(80),
    filters: z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,31}$/), z.string().max(160)).refine(value => Object.keys(value).length <= 36),
  }).strict()).max(50),
}).strict()
const COOKIE = 'rcre-public-visitor'
const COOKIE_AGE = 60 * 60 * 24 * 365
const MAX_BODY_BYTES = 64 * 1024
const isDurableMode = () => isProduction || dataMode() === 'live'

type FixtureRow = PublicSearchState & { id: string }
function newToken() { return randomBytes(32).toString('base64url') }
function visitorToken(req: NextRequest) {
  const candidate = req.cookies.get(COOKIE)?.value
  return candidate && /^[A-Za-z0-9_-]{43}$/.test(candidate) && Buffer.from(candidate, 'base64url').length === 32 ? candidate : newToken()
}
function response(token: string, state: PublicSearchState) {
  const res = NextResponse.json(state)
  res.cookies.set(COOKIE, token, {
    httpOnly: true, sameSite: 'strict', path: '/api', maxAge: COOKIE_AGE,
    secure: isProduction,
  })
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('Vary', 'Cookie')
  return res
}
function organizationId() {
  const value = process.env.RCRE_ORGANIZATION_ID ?? ''
  if (!z.string().uuid().safeParse(value).success) throw new Error('Property search persistence is unavailable')
  return value
}
function visitorHash(token: string) {
  const secret = process.env.RCRE_SESSION_SECRET ?? ''
  return hashPublicVisitorToken(token, secret)
}
async function limit(req: NextRequest, writes: boolean) {
  const decision = await rateLimitRequest('property_search', req.headers, writes ? 30 : 90)
  if (!decision.allowed) return NextResponse.json({ error: 'Please wait a moment before trying again.' }, { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds), 'Cache-Control': 'no-store' } })
  return null
}

export async function GET(req: NextRequest) {
  try {
    const blocked = await limit(req, false)
    if (blocked) return blocked
    const token = visitorToken(req)
    if (isDurableMode()) {
      const state = await readPublicSearchState(organizationId(), visitorHash(token))
      return response(token, state)
    }
    const stored = await getRecord<FixtureRow>('public_search', token)
    const state = stored ? FIXTURE_STATE.parse(stored) : { favorites: [], searches: [] }
    return response(token, state)
  } catch (error) {
    const response = NextResponse.json({ error: 'Saved homes are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    await recordCaughtRouteFailure(req, '/api/public/search-state', null, response.status, error)
    return response
  }
}

export async function PUT(req: NextRequest) {
  try {
    assertSameOriginMutation(req)
    const blocked = await limit(req, true)
    if (blocked) return blocked
    const declaredSize = Number(req.headers.get('content-length') ?? 0)
    if (declaredSize > MAX_BODY_BYTES) return NextResponse.json({ error: 'Saved search request is too large.' }, { status: 413 })
    const body = await req.text()
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return NextResponse.json({ error: 'Saved search request is too large.' }, { status: 413 })
    let raw: unknown
    try { raw = JSON.parse(body) } catch { return NextResponse.json({ error: 'Invalid saved search request.' }, { status: 400 }) }
    const token = visitorToken(req)
    if (isDurableMode()) {
      const state = publicSearchStateSchema.parse(raw)
      const saved = await replacePublicSearchState(organizationId(), visitorHash(token), state)
      return response(token, saved)
    }
    const state = FIXTURE_STATE.parse(raw)
    const row: FixtureRow = { id: token, ...state }
    await putRecord('public_search', row)
    return response(token, state)
  } catch (error) {
    if (error instanceof SharedRateLimitUnavailableError) {
      const response = NextResponse.json({ error: 'Saved homes are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
      await recordCaughtRouteFailure(req, '/api/public/search-state', null, response.status, error)
      return response
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid saved search. Use a name, supported filters, and fewer than 50 saved searches.' }, { status: 400 })
    const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 503
    const response = NextResponse.json({ error: status === 403 ? 'Cross-origin write denied.' : 'Saved homes are temporarily unavailable.' }, { status, headers: { 'Cache-Control': 'no-store' } })
    await recordCaughtRouteFailure(req, '/api/public/search-state', null, response.status, error)
    return response
  }
}
