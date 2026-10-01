import { NextResponse } from 'next/server'
import { requireActor, AccessError } from '@/lib/platform/auth'
import { listTransactionExceptions, durableTransactionExceptions } from '@/lib/services/transaction-exceptions'
import { dataMode } from '@/lib/config/env'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'

export type { ExceptionType as ExceptionType, TransactionException as TransactionException } from '@/lib/services/transaction-exceptions'

export async function GET(request: Request) {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null
  try {
    actor = await requireActor()
    const items = dataMode() === 'live'
      ? await durableTransactionExceptions().list(actor)
      : listTransactionExceptions(actor)
    return NextResponse.json({
      exceptions: items.filter((item) => !item.resolved),
      resolved: items.filter((item) => item.resolved),
    })
  } catch (e) {
    const error = e as Error & { status?: number }
    const status = typeof error.status === 'number' ? error.status : e instanceof AccessError ? error.status || 403 : /denied/i.test(error.message) ? 403 : /not found/i.test(error.message) ? 404 : /conflict|changed|refresh/i.test(error.message) ? 409 : 503
    const response = NextResponse.json({ error: status >= 500 ? 'Transaction review is temporarily unavailable.' : error.message || 'Request failed' }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    await recordCaughtRouteFailure(request, '/api/transactions/broker-exceptions', actor, status, e)
    return response
  }
}
