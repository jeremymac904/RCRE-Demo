import { requireActor, AccessError, type PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { prospect, recruitAction, recruitingFailure } from '@/lib/platform/recruiting'
import { appendRecruitingEventDurable, recruitingProspectDurable } from '@/lib/platform/recruiting-durable'
import { isProduction } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    const { id } = await params
    return Response.json(isProduction ? await recruitingProspectDurable(actor, id) : prospect(actor, id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/recruiting/[id]', actor, response.status, error); return response }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: PlatformActor | null = null
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).host !== new URL(request.url).host) throw new AccessError('Origin mismatch')
    actor = await requireActor()
    const { id } = await params
    const body = await request.json()
    if (!isProduction) return Response.json(recruitAction(actor, id, body))
    await appendRecruitingEventDurable(actor, id, body)
    return Response.json(await recruitingProspectDurable(actor, id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/recruiting/[id]', actor, response.status, error); return response }
}

function fail(error: unknown) {
  const result = recruitingFailure(error)
  return Response.json({ error: result.message }, { status: result.status, headers: { 'Cache-Control': 'private, no-store' } })
}
