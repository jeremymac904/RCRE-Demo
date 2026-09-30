import { NextResponse, type NextRequest } from 'next/server'
import { AccessError, assertCapability, requireActor } from '@/lib/platform/auth'
import { invitationById, resendInvitation } from '@/lib/auth/invitations'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).origin !== request.nextUrl.origin) throw new AccessError('Cross-origin request denied.', 403)
    const actor = await requireActor(); assertCapability(actor, 'settings.people')
    const item = await invitationById(actor, (await params).id)
    if (!item || item.status !== 'pending') throw new AccessError('Invitation is no longer pending or is outside your office.', 404)
    return NextResponse.json(await resendInvitation(actor, { id: item.id, email: item.email, name: item.name, role: item.role, officeId: actor.role === 'managing_broker' ? actor.officeId : '' }), { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503
    return NextResponse.json({ error: status === 503 ? 'Invitation service is temporarily unavailable.' : error instanceof Error ? error.message : 'Request failed.' }, { status })
  }
}
