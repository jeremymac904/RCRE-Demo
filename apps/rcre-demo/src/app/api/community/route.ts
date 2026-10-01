import { actorOrNull } from '@/lib/platform/auth'
import { AccessError, type PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { academyManager } from '@/lib/academy-service'
import { communityActionDurable, listCommunityDurable } from '@/lib/academy-durable'

export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    return Response.json({ posts: await listCommunityDurable(actor), userId: actor.id, moderator: academyManager(actor), publisher: actor.role === 'broker_owner' || actor.role === 'managing_broker' })
  } catch (error) {
    const response = Response.json({ error: 'Community is temporarily unavailable.' }, { status: 503 })
    await recordCaughtRouteFailure(request, '/api/community', actor, response.status, error)
    return response
  }
}

export async function POST(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    return Response.json(await communityActionDurable(actor, await request.json()))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Community action failed'
    const response = Response.json({ error: error instanceof AccessError ? message : 'Community changes are temporarily unavailable.' }, { status: error instanceof AccessError ? error.status : 503 })
    await recordCaughtRouteFailure(request, '/api/community', actor, response.status, error)
    return response
  }
}
