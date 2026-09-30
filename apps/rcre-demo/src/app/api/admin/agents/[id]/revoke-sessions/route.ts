import { requireActor, AccessError } from '@/lib/platform/auth'
import { revokeAdminAgentSessions } from '@/lib/platform/agent-admin'
export const dynamic = 'force-dynamic'
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) throw new AccessError('Origin mismatch', 403)
    const actor = await requireActor(), { id } = await context.params
    return Response.json(await revokeAdminAgentSessions(actor, id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: error instanceof AccessError ? error.status : (error as { status?: number })?.status ?? 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
