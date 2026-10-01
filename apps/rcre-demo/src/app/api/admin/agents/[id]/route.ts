import { requireActor, AccessError } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { updateAdminAgent } from '@/lib/platform/agent-admin'
export const dynamic = 'force-dynamic'
const fail = (error: unknown) => Response.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: error instanceof AccessError ? error.status : (error as { status?: number })?.status ?? ((error as { issues?: unknown })?.issues ? 400 : 500), headers: { 'Cache-Control': 'private, no-store' } })
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let actor: PlatformActor | null = null
  try {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) throw new AccessError('Origin mismatch', 403)
    if (Number(request.headers.get('content-length') ?? 0) > 20000) throw new AccessError('Payload too large', 413)
    actor = await requireActor()
    const { id } = await context.params
    return Response.json(await updateAdminAgent(actor, id, await request.json()), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/admin/agents/[id]', actor, response.status, error); return response }
}
