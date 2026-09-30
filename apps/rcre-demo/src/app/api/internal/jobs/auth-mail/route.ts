import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { processAuthMailBatch } from '@/lib/auth/mail-worker'
export const dynamic = 'force-dynamic'
function authorized(request: NextRequest) {
  const secret = process.env.RCRE_JOB_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!secret || secret.length < 32 || !supplied) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(secret), digest(supplied))
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const size = Number(request.headers.get('content-length') ?? 0)
  if (size > 1024) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
  try {
    const limit = Math.max(1, Math.min(50, Number(request.nextUrl.searchParams.get('limit') ?? 20) || 20))
    const result = await processAuthMailBatch(limit)
    if (result.state === 'waiting_for_mail_configuration') return NextResponse.json({ state: result.state }, { status: 503, headers: { 'cache-control': 'no-store' } })
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Mail queue processing failed.' }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}
