import { requireActor, AccessError, type PlatformActor } from '@/lib/platform/auth'
import { inspectAgents } from '@/lib/agent-inspector'
import { inspectAgentsDurable } from '@/lib/services/agent-inspector-durable'
import { getRepository } from '@/lib/db'
import { dataMode } from '@/lib/config/env'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    const url = new URL(request.url)
    const id = url.searchParams.get('agentId') || undefined
    const data = dataMode() === 'live'
      ? await inspectAgentsDurable(actor, id, await getRepository())
      : inspectAgents(actor, id)
    if (url.searchParams.get('download') === '1') {
      if (!id) throw new AccessError('Select an agent to export', 400)
      return new Response(JSON.stringify(data.agent, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="rcre-scoped-agent-inspection.json"', 'Cache-Control': 'private, no-store' } })
    }
    return Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503
    const response = Response.json({ error: status >= 500 ? 'Agent activity details are temporarily unavailable.' : (error as Error).message }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    await recordCaughtRouteFailure(request, '/api/agent-inspector', actor, status, error)
    return response
  }
}
