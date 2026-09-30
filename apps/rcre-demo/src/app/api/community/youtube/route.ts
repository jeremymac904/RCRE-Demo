import { actorOrNull } from '@/lib/platform/auth'
import { academyPersistenceAvailable } from '@/lib/academy-service'
import { communityYoutubeConfig, communityYoutubeRuns, saveCommunityYoutubeConfig, runCommunityYoutubeDemo } from '@/lib/community-youtube'

const unavailable = () => Response.json({
  code: 'DURABLE_STORE_UNAVAILABLE',
  error: 'Community video drafts are unavailable until durable production storage is connected. No video metadata was read or saved.',
}, { status: 503 })

export async function GET() {
  if (!academyPersistenceAvailable()) return unavailable()
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try {
    return Response.json({ config: communityYoutubeConfig(actor), runs: communityYoutubeRuns(actor) })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 403 })
  }
}

export async function POST(request: Request) {
  if (!academyPersistenceAvailable()) return unavailable()
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try {
    const body = await request.json() as Record<string, unknown>
    if (body.action === 'config') {
      return Response.json({ config: saveCommunityYoutubeConfig(actor, {
        sourceType: body.sourceType as 'channel' | 'playlist',
        sourceUrl: String(body.sourceUrl ?? ''),
        category: String(body.category ?? ''),
        version: Number(body.version),
      }) })
    }
    if (body.action === 'run-demo') {
      return Response.json(runCommunityYoutubeDemo(actor, {
        title: String(body.title ?? ''), summary: String(body.summary ?? ''),
        watchUrl: String(body.watchUrl ?? ''), discussionPrompt: String(body.discussionPrompt ?? ''),
        category: String(body.category ?? ''),
      }))
    }
    return Response.json({ error: 'Choose a supported community video action' }, { status: 400 })
  } catch (error) {
    const message = (error as Error).message
    return Response.json({ error: message }, { status: /permission|required/.test(message) ? 403 : /changed|already/.test(message) ? 409 : 400 })
  }
}
