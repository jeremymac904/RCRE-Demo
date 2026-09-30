import { assertSameOriginMutation } from '@/lib/auth/request-origin'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { AccessError, assertCapability, requireActor, type PlatformRole } from '@/lib/platform/auth'
import { createInvitation, listInvitations } from '@/lib/auth/invitations'
export const dynamic = 'force-dynamic'
const schema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  name: z.string().trim().min(2).max(200),
  role: z.enum(['agent','team_leader','managing_broker','transaction_coordinator','marketing_admin','trainer']),
  officeId: z.string().trim().min(1).max(80),
  teamId: z.string().trim().max(80).optional(), market: z.string().trim().max(120).optional(),
})
function failed(error: unknown) {
  const status = error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 503
  return NextResponse.json({ error: status === 503 ? 'Invitation service is temporarily unavailable.' : error instanceof Error ? error.message : 'Request failed.' }, { status })
}
export async function GET() {
  try { const actor = await requireActor(); assertCapability(actor, 'settings.people'); return NextResponse.json(await listInvitations(actor), { headers: { 'cache-control': 'no-store' } }) }
  catch (error) { return failed(error) }
}
export async function POST(request: NextRequest) {
  try {
    assertSameOriginMutation(request)
    if (Number(request.headers.get('content-length') ?? 0) > 12_000) throw new AccessError('Request is too large.', 413)
    const actor = await requireActor(); assertCapability(actor, 'settings.people')
    const input = schema.parse(await request.json())
    const result = await createInvitation(actor, input as { email: string; name: string; role: PlatformRole; officeId: string; teamId?: string; market?: string })
    return NextResponse.json(result, { status: 201, headers: { 'cache-control': 'no-store' } })
  } catch (error) { return failed(error) }
}
