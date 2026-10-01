import { requireActor, AccessError } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { listAdminAgents, listCanonicalPersonChoices } from '@/lib/platform/agent-admin'
export const dynamic = 'force-dynamic'
const fail = (error: unknown) => Response.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: error instanceof AccessError ? error.status : (error as { status?: number })?.status ?? 500, headers: { 'Cache-Control': 'private, no-store' } })
export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    return Response.json({ agents: await listAdminAgents(actor), canonicalPeople: await listCanonicalPersonChoices(actor) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/admin/agents', actor, response.status, error); return response }
}
