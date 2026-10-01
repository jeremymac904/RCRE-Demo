import { requireActor, AccessError } from '@/lib/platform/auth'
import { revokeAdminAgentSessions } from '@/lib/platform/agent-admin'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
export const dynamic = 'force-dynamic'
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null
  try {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) throw new AccessError('Origin mismatch', 403)
    actor = await requireActor()
    const { id } = await context.params
    return Response.json(await revokeAdminAgentSessions(actor, id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status : (error as { status?: number })?.status ?? 500
    await recordCaughtRouteFailure(request, '/api/admin/agents/[id]/revoke-sessions', actor, status, error)
    return Response.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
