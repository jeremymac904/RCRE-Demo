import { getPgPool } from '@/lib/db/pg'
import { createStorageService } from '@/lib/storage'
import { StorageError } from '@/lib/storage/types'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const organizationId = process.env.RCRE_ORGANIZATION_ID
    if (!organizationId || !/^[0-9a-f-]{36}$/i.test(organizationId)) return new Response(null, { status: 404 })
    const { slug } = await params
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) return new Response(null, { status: 404 })
    const result = await getPgPool().query<{ photo: { memberId: string; assetId: string } | null }>(
      'select rcre_public_agent_headshot($1::uuid,$2::text) as photo', [organizationId, slug],
    )
    const photo = result.rows[0]?.photo
    if (!photo || !/^[a-f0-9-]{36}$/i.test(photo.assetId) || !/^[a-f0-9-]{36}$/i.test(photo.memberId)) return new Response(null, { status: 404 })
    const storage = createStorageService({ authorize: (actor, action, asset) =>
      action === 'download' && actor.id === photo.memberId && actor.organizationId === organizationId
      && asset.id === photo.assetId && asset.ownerId === photo.memberId && asset.organizationId === organizationId
      && asset.category === 'agent-headshot' })
    const { asset, bytes } = await storage.download({ id: photo.memberId, organizationId, role: 'agent' }, photo.assetId)
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': String(bytes.length),
    } })
  } catch (error) {
    const status = error instanceof StorageError ? error.status : 503
    await recordCaughtRouteFailure(request, '/api/public/agent-photo/[slug]', null, status, error)
    return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
