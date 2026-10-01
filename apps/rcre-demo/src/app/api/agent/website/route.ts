import { AccessError, requireActor } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { loadAgentWebsite, saveAgentWebsite, setAgentWebsitePublication } from '@/lib/agent-website/lifecycle'

export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control': 'private, no-store' }
function fail(error: unknown) {
  const status = error instanceof AccessError ? error.status : (error as { status?: number })?.status === 503 ? 503 : (error as { code?: string })?.code === '23505' ? 409 : (error as { issues?: unknown })?.issues ? 400 : 500
  return Response.json({ error: status === 500 ? 'Website request could not be completed.' : error instanceof Error ? error.message : 'Request failed' }, { status, headers: noStore })
}
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) throw new AccessError('Origin mismatch')
}
export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try { actor = await requireActor(); return Response.json(await loadAgentWebsite(actor), { headers: noStore }) }
  catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/agent/website', actor, response.status, error); return response }
}
export async function PUT(request: Request) {
  let actor: PlatformActor | null = null
  try {
    sameOrigin(request)
    if (Number(request.headers.get('content-length') ?? 0) > 30000) throw new AccessError('Payload too large', 413)
    actor = await requireActor()
    return Response.json(await saveAgentWebsite(actor, await request.json()), { headers: noStore })
  } catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/agent/website', actor, response.status, error); return response }
}
export async function POST(request: Request) {
  let actor: PlatformActor | null = null
  try {
    sameOrigin(request)
    const body = await request.json() as { publish?: unknown; version?: unknown; userId?: unknown }
    if (typeof body.publish !== 'boolean' || !Number.isSafeInteger(body.version) || typeof body.userId !== 'undefined' && typeof body.userId !== 'string') throw new AccessError('Invalid publication request', 400)
    actor = await requireActor()
    const result = await setAgentWebsitePublication(actor, body.userId as string | undefined || actor.id, body.publish, body.version as number)
    return Response.json(result, { headers: noStore })
  } catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/agent/website', actor, response.status, error); return response }
}
