import { assertSameOriginMutation } from '@/lib/auth/request-origin'
import { NextResponse, type NextRequest } from 'next/server'
import { AccessError, assertCapability, requireActor } from '@/lib/platform/auth'
import { cancelInvitation } from '@/lib/auth/invitations'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
export const dynamic = 'force-dynamic'
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null
  try {
    assertSameOriginMutation(request)
    actor = await requireActor(); assertCapability(actor, 'settings.people')
    return NextResponse.json(await cancelInvitation(actor, (await params).id), { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503
    const response = NextResponse.json({ error: status >= 500 ? 'Invitation service is temporarily unavailable.' : error instanceof Error ? error.message : 'Request failed.' }, { status })
    await recordCaughtRouteFailure(request, '/api/admin/invitations/[id]', actor, response.status, error)
    return response
  }
}
