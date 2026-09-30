import { actorOrNull } from '@/lib/platform/auth'
import { academyManageData, manageAcademyDurable } from '@/lib/academy-durable'
import { academyManager } from '@/lib/academy-service'
import { AccessError } from '@/lib/platform/auth'

export async function GET() {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try { return Response.json(await academyManageData(actor)) }
  catch { return Response.json({ error: 'Training data is temporarily unavailable. No changes were saved.' }, { status: 503 }) }
}

export async function POST(request: Request) {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try { return Response.json(await manageAcademyDurable(actor, await request.json())) }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Training change failed'
    const status = error instanceof AccessError ? error.status : 503
    return Response.json({ error: error instanceof AccessError ? message : 'Training changes are temporarily unavailable.' }, { status })
  }
}
