import { actorOrNull } from '@/lib/platform/auth'
import { downloadAcademyAsset } from '@/lib/academy-durable'
import { StorageError } from '@/lib/storage'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: import('@/lib/platform/auth').PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    const { asset, bytes } = await downloadAcademyAsset(actor, (await params).id, 'community-attachment')
    return new Response(Uint8Array.from(bytes), { headers: { 'Content-Type': asset.contentType, 'Content-Disposition': `attachment; filename="${encodeURIComponent(asset.filename)}"`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Length': String(bytes.length) } })
  } catch (error) {
    const status = error instanceof StorageError ? error.status : 500
    const response = Response.json({ error: status >= 500 ? 'File service is temporarily unavailable.' : error instanceof Error ? error.message : 'Attachment unavailable' }, { status })
    await recordCaughtRouteFailure(request, '/api/community/attachments/[id]', actor, status, error)
    return response
  }
}
