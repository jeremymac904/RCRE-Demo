import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { listTransactionExceptions, durableTransactionExceptions } from '@/lib/services/transaction-exceptions'
import { dataMode } from '@/lib/config/env'

export type { ExceptionType as ExceptionType, TransactionException as TransactionException } from '@/lib/services/transaction-exceptions'

export async function GET() {
  try {
    const actor = await requireActor()
    const items = dataMode() === 'live'
      ? await durableTransactionExceptions().list(actor)
      : listTransactionExceptions(actor)
    return NextResponse.json({
      exceptions: items.filter((item) => !item.resolved),
      resolved: items.filter((item) => item.resolved),
    })
  } catch (e) {
    const error = e as Error & { status?: number }
    const status = typeof error.status === 'number' ? error.status : /denied/i.test(error.message) ? 403 : 400
    return NextResponse.json({ error: error.message || 'Request failed' }, { status })
  }
}
