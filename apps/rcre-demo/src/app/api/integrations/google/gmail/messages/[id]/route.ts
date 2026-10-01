import { NextResponse } from 'next/server'
import { AccessError, requireActor } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { getGoogleWorkspaceService } from '@/lib/google-workspace/service'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    const { id } = await params
    return NextResponse.json(await getGoogleWorkspaceService().gmailRead(actor, id), { headers: { 'cache-control': 'private, no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503
    const response = NextResponse.json({ error: error instanceof Error ? error.message : 'Gmail is unavailable' }, { status })
    await recordCaughtRouteFailure(request, '/api/integrations/google/gmail/messages/[id]', actor, status, error)
    return response
  }
}
