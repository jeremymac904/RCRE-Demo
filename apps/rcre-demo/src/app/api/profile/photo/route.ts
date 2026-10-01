import { requireActor, AccessError } from '@/lib/platform/auth'
import { downloadHeadshot, loadOnboarding, removeHeadshot, saveHeadshot } from '@/lib/platform/onboarding'
import { StorageError } from '@/lib/storage/types'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null
  try {
    actor = await requireActor(); const { profile } = await loadOnboarding(actor)
    if (!profile.headshotAssetId) throw new AccessError('No photo', 404)
    const { asset, bytes } = await downloadHeadshot(actor, profile.headshotAssetId)
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': asset.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/profile/photo', actor, response.status, error); return response }
}
export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null
  try {
    actor = await requireActor(); origin(request)
    if (Number(request.headers.get('content-length') ?? 0) > 9 * 1024 * 1024) throw new AccessError('Photo must be under 8 MB', 413)
    const photo = (await request.formData()).get('photo')
    if (!(photo instanceof File) || photo.size > 8 * 1024 * 1024) throw new AccessError('Choose a PNG, JPEG, or WebP under 8 MB', 400)
    await saveHeadshot(actor, { bytes: Buffer.from(await photo.arrayBuffer()), contentType: photo.type, filename: photo.name })
    return Response.json({ saved: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/profile/photo', actor, response.status, error); return response }
}
export async function DELETE(request: Request) {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null
  try { origin(request); actor = await requireActor(); return Response.json({ removed: await removeHeadshot(actor) }, { headers: { 'Cache-Control': 'private, no-store' } }) }
  catch (error) { const response = fail(error); await recordCaughtRouteFailure(request, '/api/profile/photo', actor, response.status, error); return response }
}
function origin(request: Request) { const value = request.headers.get('origin'); if (value && new URL(value).host !== new URL(request.url).host) throw new AccessError('Origin mismatch') }
function fail(error: unknown) { return Response.json({ error: error instanceof Error ? error.message : 'Photo request failed' }, { status: error instanceof AccessError ? error.status : error instanceof StorageError ? error.status : (error as { status?: number })?.status ?? 500, headers: { 'Cache-Control': 'private, no-store' } }) }
