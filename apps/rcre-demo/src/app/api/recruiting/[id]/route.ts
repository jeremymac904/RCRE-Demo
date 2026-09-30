import { requireActor, AccessError } from '@/lib/platform/auth'
import { prospect, recruitAction, recruitingFailure } from '@/lib/platform/recruiting'
import { appendRecruitingEventDurable, recruitingProspectDurable } from '@/lib/platform/recruiting-durable'
import { isProduction } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor()
    const { id } = await params
    return Response.json(isProduction ? await recruitingProspectDurable(actor, id) : prospect(actor, id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return fail(error) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).host !== new URL(request.url).host) throw new AccessError('Origin mismatch')
    const actor = await requireActor()
    const { id } = await params
    const body = await request.json()
    if (!isProduction) return Response.json(recruitAction(actor, id, body))
    await appendRecruitingEventDurable(actor, id, body)
    return Response.json(await recruitingProspectDurable(actor, id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return fail(error) }
}

function fail(error: unknown) {
  const result = recruitingFailure(error)
  return Response.json({ error: result.message }, { status: result.status, headers: { 'Cache-Control': 'private, no-store' } })
}
