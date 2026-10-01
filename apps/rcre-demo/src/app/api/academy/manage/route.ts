import { actorOrNull } from '@/lib/platform/auth'
import { academyManageData, manageAcademyDurable } from '@/lib/academy-durable'
import { academyManager } from '@/lib/academy-service'
import { AccessError, type PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    return Response.json(await academyManageData(actor))
  } catch (error) {
    const response = Response.json({ error: 'Training data is temporarily unavailable. No changes were saved.' }, { status: 503 })
    await recordCaughtRouteFailure(request, '/api/academy/manage', actor, response.status, error)
    return response
  }
}

export async function POST(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    return Response.json(await manageAcademyDurable(actor, await request.json()))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Training change failed'
    const status = error instanceof AccessError ? error.status : 503
    const response = Response.json({ error: error instanceof AccessError ? message : 'Training changes are temporarily unavailable.' }, { status })
    await recordCaughtRouteFailure(request, '/api/academy/manage', actor, response.status, error)
    return response
  }
}
