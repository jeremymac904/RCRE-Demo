import { NextResponse } from 'next/server'
import { requireActor, AccessError, type PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { listTransactions } from '@/lib/services/transactions'
import { dataMode } from '@/lib/config/env'
import { durableTransactionActor, durableTransactions } from '@/lib/services/transactions-durable'

export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try {
    const authenticatedActor = await requireActor()
    actor = authenticatedActor
    if (dataMode() === 'live') {
      const rows = await durableTransactions().list(durableTransactionActor(authenticatedActor))
      return NextResponse.json({ transactions: rows.filter(t => t.ownerId === authenticatedActor.userId || t.tcId === authenticatedActor.userId) })
    }
    const transactions = listTransactions(authenticatedActor).filter(
      (t) => t.ownerId === authenticatedActor.userId || t.tcId === authenticatedActor.userId
    )
    return NextResponse.json({ transactions })
  } catch (e) {
    const status = e instanceof AccessError ? e.status : 503
    const response = NextResponse.json({ error: status >= 500 ? 'Transactions are temporarily unavailable.' : (e as Error).message }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    await recordCaughtRouteFailure(request, '/api/transactions/my', actor, status, e)
    return response
  }
}
