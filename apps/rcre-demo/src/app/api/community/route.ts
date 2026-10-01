import { actorOrNull } from '@/lib/platform/auth'
import { AccessError } from '@/lib/platform/auth'
import { academyManager } from '@/lib/academy-service'
import { communityActionDurable, listCommunityDurable } from '@/lib/academy-durable'

export async function GET() {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try { return Response.json({ posts: await listCommunityDurable(actor), userId: actor.id, moderator: academyManager(actor), publisher: actor.role === 'broker_owner' || actor.role === 'managing_broker' }) }
  catch { return Response.json({ error: 'Community is temporarily unavailable.' }, { status: 503 }) }
}

export async function POST(request: Request) {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try { return Response.json(await communityActionDurable(actor, await request.json())) }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Community action failed'
    return Response.json({ error: error instanceof AccessError ? message : 'Community changes are temporarily unavailable.' }, { status: error instanceof AccessError ? error.status : 503 })
  }
}
