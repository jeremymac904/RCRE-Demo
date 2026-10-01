import { assertSameOriginMutation } from '@/lib/auth/request-origin'
import { NextResponse, type NextRequest } from 'next/server'
import { AccessError, assertCapability, requireActor } from '@/lib/platform/auth'
import { invitationById, resendInvitation } from '@/lib/auth/invitations'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null
  try {
    assertSameOriginMutation(request)
    actor = await requireActor(); assertCapability(actor, 'settings.people')
    const item = await invitationById(actor, (await params).id)
    if (!item || item.status !== 'pending') throw new AccessError('Invitation is no longer pending or is outside your office.', 404)
    return NextResponse.json(await resendInvitation(actor, { id: item.id, email: item.email, name: item.name, role: item.role, officeId: actor.role === 'managing_broker' ? actor.officeId : '' }), { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503
    const response = NextResponse.json({ error: status >= 500 ? 'Invitation service is temporarily unavailable.' : error instanceof Error ? error.message : 'Request failed.' }, { status })
    await recordCaughtRouteFailure(request, '/api/admin/invitations/[id]/resend', actor, response.status, error)
    return response
  }
}
