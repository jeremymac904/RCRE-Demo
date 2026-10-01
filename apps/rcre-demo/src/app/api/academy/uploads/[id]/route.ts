import { actorOrNull } from '@/lib/platform/auth'
import { downloadAcademyAsset } from '@/lib/academy-durable'
import { byteRange } from '@/lib/academy-media'
import { StorageError } from '@/lib/storage'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: import('@/lib/platform/auth').PlatformActor | null = null
  try {
    actor = await actorOrNull()
    if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
    const { asset, bytes } = await downloadAcademyAsset(actor, (await params).id, 'training-resource')
    let range: ReturnType<typeof byteRange>
    try { range = byteRange(request.headers.get('range'), bytes.length) }
    catch { return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } }) }
    const inline = asset.contentType === 'video/mp4' || asset.contentType === 'text/vtt'
    const headers: Record<string, string> = { 'Content-Type': asset.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(asset.filename)}"` }
    if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${bytes.length}`
    return new Response(range ? Uint8Array.from(bytes.subarray(range.start, range.end + 1)) : Uint8Array.from(bytes), { status: range ? 206 : 200, headers })
  } catch (error) {
    const status = error instanceof StorageError ? error.status : 500
    const response = Response.json({ error: status >= 500 ? 'File service is temporarily unavailable.' : error instanceof Error ? error.message : 'Resource unavailable' }, { status })
    await recordCaughtRouteFailure(request, '/api/academy/uploads/[id]', actor, status, error)
    return response
  }
}
