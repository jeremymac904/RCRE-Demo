import { NextResponse, type NextRequest } from 'next/server'
import { AccessError, assertCapability, requireActor } from '@/lib/platform/auth'
import { cancelInvitation } from '@/lib/auth/invitations'
export const dynamic = 'force-dynamic'
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).origin !== request.nextUrl.origin) throw new AccessError('Cross-origin request denied.', 403)
    const actor = await requireActor(); assertCapability(actor, 'settings.people')
    return NextResponse.json(await cancelInvitation(actor, (await params).id), { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503
    return NextResponse.json({ error: status === 503 ? 'Invitation service is temporarily unavailable.' : error instanceof Error ? error.message : 'Request failed.' }, { status })
  }
}
