import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActor, AccessError } from '@/lib/platform/auth'
import { resolveTransactionException, durableTransactionExceptions } from '@/lib/services/transaction-exceptions'
import { dataMode } from '@/lib/config/env'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

const bodySchema = z.object({ note: z.string().trim().min(1).max(2000) }).strict()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null
  try {
    actor = await requireActor()
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (origin && (!host || new URL(origin).host !== host)) {
      return NextResponse.json({ error: 'Origin access denied' }, { status: 403 })
    }
    if (!origin && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Origin verification required' }, { status: 403 })
    }
    const size = Number(request.headers.get('content-length') || 0)
    if (!size || size > 8192) return NextResponse.json({ error: 'Resolution request must be between 1 byte and 8 KB' }, { status: 400 })
    const body = bodySchema.parse(await request.json())
    const { id } = await params
    const result = dataMode() === 'live'
      ? await durableTransactionExceptions().resolve(actor, id, body.note)
      : resolveTransactionException(actor, id, body.note)
    return NextResponse.json(result)
  } catch (e) {
    const error = e as Error & { status?: number }
    const status = e instanceof AccessError ? e.status : e instanceof z.ZodError ? 400 : Number.isInteger(error.status) && Number(error.status) >= 400 && Number(error.status) <= 599 ? Number(error.status) : /resolution note/i.test(error.message ?? '') ? 400 : /already resolved/i.test(error.message ?? '') ? 409 : /not found/i.test(error.message ?? '') ? 404 : 503
    const response = NextResponse.json({ error: status >= 500 ? 'Transaction review is temporarily unavailable.' : error.message || 'Request failed' }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    await recordCaughtRouteFailure(request, '/api/transactions/broker-exceptions/[id]/resolve', actor, status, e)
    return response
  }
}
