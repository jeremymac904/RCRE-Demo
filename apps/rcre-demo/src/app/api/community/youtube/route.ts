import { actorOrNull } from '@/lib/platform/auth'
import { AccessError, type PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { communityYoutubeRead, runCommunityYoutubeDemoDurable, saveCommunityYoutubeConfigDurable } from '@/lib/academy-durable'

export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    return Response.json(await communityYoutubeRead(actor))
  } catch (error) {
    const response = Response.json({ error: error instanceof AccessError ? error.message : 'Community video workflow is temporarily unavailable.' }, { status: error instanceof AccessError ? error.status : 503 })
    await recordCaughtRouteFailure(request, '/api/community/youtube', actor, response.status, error)
    return response
  }
}

export async function POST(request: Request) {
  let actor: PlatformActor | null = null
  try {
    const current = await actorOrNull()
    actor = current
    if (!current) return Response.json({ error: 'Sign in required' }, { status: 401 })
    const body = await request.json() as Record<string, unknown>
    if (body.action === 'config') return Response.json({ config: await saveCommunityYoutubeConfigDurable(current, body) })
    if (body.action === 'run-demo') return Response.json(await runCommunityYoutubeDemoDurable(current, body))
    if (body.action === 'publish') return Response.json(await import('@/lib/academy-durable').then(({ publishYoutubeDraft }) => publishYoutubeDraft(current, String(body.postId ?? ''))))
    return Response.json({ error: 'Choose a supported Community video action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video workflow failed'
    const response = Response.json({ error: error instanceof AccessError ? message : 'Community video workflow is temporarily unavailable.' }, { status: error instanceof AccessError ? error.status : 503 })
    await recordCaughtRouteFailure(request, '/api/community/youtube', actor, response.status, error)
    return response
  }
}
