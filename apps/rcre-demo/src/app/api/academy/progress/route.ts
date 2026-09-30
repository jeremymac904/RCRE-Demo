import { actorOrNull } from '@/lib/platform/auth'
import { academyProgress, saveAcademyProgress } from '@/lib/academy-durable'
import { AccessError } from '@/lib/platform/auth'

export async function GET() {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try { return Response.json(await academyProgress(actor)) }
  catch { return Response.json({ error: 'Training progress is temporarily unavailable.' }, { status: 503 }) }
}

export async function POST(request: Request) {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try { return Response.json(await saveAcademyProgress(actor, await request.json())) }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Progress could not be saved'
    return Response.json({ error: error instanceof AccessError ? message : 'Training progress is temporarily unavailable.' }, { status: error instanceof AccessError ? error.status : 503 })
  }
}
