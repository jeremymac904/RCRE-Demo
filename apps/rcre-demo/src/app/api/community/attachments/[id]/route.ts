import { actorOrNull } from '@/lib/platform/auth'
import { downloadAcademyAsset } from '@/lib/academy-durable'
import { StorageError } from '@/lib/storage'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorOrNull()
  if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
  try {
    const { asset, bytes } = await downloadAcademyAsset(actor, (await params).id, 'community-attachment')
    return new Response(Uint8Array.from(bytes), { headers: { 'Content-Type': asset.contentType, 'Content-Disposition': `attachment; filename="${encodeURIComponent(asset.filename)}"`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Length': String(bytes.length) } })
  } catch (error) {
    const status = error instanceof StorageError ? error.status : 404
    return Response.json({ error: error instanceof Error ? error.message : 'Attachment unavailable' }, { status })
  }
}
