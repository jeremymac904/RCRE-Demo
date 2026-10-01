import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActor } from '@/lib/platform/auth'
import { resolveTransactionException, durableTransactionExceptions } from '@/lib/services/transaction-exceptions'
import { dataMode } from '@/lib/config/env'

const bodySchema = z.object({ note: z.string().trim().min(1).max(2000) }).strict()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
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
    const status = typeof error.status === 'number' ? error.status : /denied/i.test(error.message) ? 403 : /not found/i.test(error.message) ? 404 : 400
    return NextResponse.json({ error: error.message || 'Request failed' }, { status })
  }
}
