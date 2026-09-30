import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { listTransactionExceptions } from '@/lib/services/transaction-exceptions'

export type { ExceptionType as ExceptionType, TransactionException as TransactionException } from '@/lib/services/transaction-exceptions'

export async function GET() {
  try {
    const actor = await requireActor()
    const items = listTransactionExceptions(actor)
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
