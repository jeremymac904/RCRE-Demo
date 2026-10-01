import { actorOrNull } from '@/lib/platform/auth'
import { academyProgress, saveAcademyProgress } from '@/lib/academy-durable'
import { AccessError, type PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    return Response.json(await academyProgress(actor))
  } catch (error) {
    const response = Response.json({ error: 'Training progress is temporarily unavailable.' }, { status: 503 })
    await recordCaughtRouteFailure(request, '/api/academy/progress', actor, response.status, error)
    return response
  }
}

export async function POST(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    return Response.json(await saveAcademyProgress(actor, await request.json()))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Progress could not be saved'
    const response = Response.json({ error: error instanceof AccessError ? message : 'Training progress is temporarily unavailable.' }, { status: error instanceof AccessError ? error.status : 503 })
    await recordCaughtRouteFailure(request, '/api/academy/progress', actor, response.status, error)
    return response
  }
}
