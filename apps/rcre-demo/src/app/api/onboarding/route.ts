import { requireActor, AccessError } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { loadOnboarding, saveOnboarding } from '@/lib/platform/onboarding'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
export const dynamic = 'force-dynamic'
function respondError(error: unknown) { return Response.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: error instanceof AccessError ? error.status : (error as { issues?: unknown })?.issues ? 400 : (error as { status?: number })?.status === 503 ? 503 : 500, headers: { 'Cache-Control': 'private, no-store' } }) }
export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try { actor = await requireActor(); return Response.json(await loadOnboarding(actor), { headers: { 'Cache-Control': 'private, no-store' } }) }
  catch (error) { const response = respondError(error); await recordCaughtRouteFailure(request, '/api/onboarding', actor, response.status, error); return response }
}
export async function PUT(request: Request) {
  let actor: PlatformActor | null = null
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 30000) throw new AccessError('Payload too large', 413)
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) throw new AccessError('Origin mismatch')
    actor = await requireActor()
    const profile = await saveOnboarding(actor, await request.json())
    return Response.json({ profile, persistence: 'durable repository' }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { const response = respondError(error); await recordCaughtRouteFailure(request, '/api/onboarding', actor, response.status, error); return response }
}
