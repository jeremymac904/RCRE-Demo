import { NextRequest, NextResponse } from 'next/server'
import { localAssetForSignedId, LocalObjectDriver, verifyLocalSignature } from '@/lib/storage'
import { StorageUnavailableError } from '@/lib/storage/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production' || (process.env.RCRE_OBJECT_STORAGE_PROVIDER && process.env.RCRE_OBJECT_STORAGE_PROVIDER !== 'local')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const { id } = await context.params
  const expires = Number(request.nextUrl.searchParams.get('expires'))
  const signature = request.nextUrl.searchParams.get('signature') ?? ''
  if (!Number.isSafeInteger(expires) || expires > Date.now() + 15 * 60_000 || !verifyLocalSignature(id, expires, signature)) {
    return NextResponse.json({ error: 'Signed link is invalid or expired' }, { status: 403 })
  }
  const asset = await localAssetForSignedId(id)
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const bytes = await new LocalObjectDriver().get(asset)
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'content-type': asset.contentType,
        'content-length': String(asset.size),
        'content-disposition': `inline; filename="${asset.filename.replace(/["\\\r\n]/g, '_')}"`,
        'x-content-type-options': 'nosniff',
        'cache-control': asset.visibility === 'public' ? 'private, max-age=60' : 'private, no-store',
      },
    })
  } catch (error) {
    if (error instanceof StorageUnavailableError) return NextResponse.json({ error: 'File unavailable' }, { status: 503 })
    return NextResponse.json({ error: 'File unavailable' }, { status: 404 })
  }
}
