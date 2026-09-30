import { actorOrNull } from '@/lib/platform/auth'
import { AccessError } from '@/lib/platform/auth'
import { communityYoutubeRead, runCommunityYoutubeDemoDurable, saveCommunityYoutubeConfigDurable } from '@/lib/academy-durable'

export async function GET() {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try { return Response.json(await communityYoutubeRead(actor)) }
  catch (error) { return Response.json({ error: error instanceof AccessError ? error.message : 'Community video workflow is temporarily unavailable.' }, { status: error instanceof AccessError ? error.status : 503 }) }
}

export async function POST(request: Request) {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try {
    const body = await request.json() as Record<string, unknown>
    if (body.action === 'config') return Response.json({ config: await saveCommunityYoutubeConfigDurable(actor, body) })
    if (body.action === 'run-demo') return Response.json(await runCommunityYoutubeDemoDurable(actor, body))
    if (body.action === 'publish') return Response.json(await import('@/lib/academy-durable').then(({ publishYoutubeDraft }) => publishYoutubeDraft(actor, String(body.postId ?? ''))))
    return Response.json({ error: 'Choose a supported Community video action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video workflow failed'
    return Response.json({ error: error instanceof AccessError ? message : 'Community video workflow is temporarily unavailable.' }, { status: error instanceof AccessError ? error.status : 503 })
  }
}
