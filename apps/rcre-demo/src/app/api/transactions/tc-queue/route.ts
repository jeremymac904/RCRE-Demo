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
    if (authenticatedActor.role !== 'transaction_coordinator' && !['broker_owner', 'managing_broker'].includes(authenticatedActor.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (dataMode() === 'live') {
      const rows = await durableTransactions().list(durableTransactionActor(authenticatedActor))
      const transactions = authenticatedActor.role === 'transaction_coordinator' ? rows.filter(t => t.tcId === authenticatedActor.userId) : rows
      return NextResponse.json({ transactions, actor: { id: authenticatedActor.id, name: authenticatedActor.name, role: authenticatedActor.role } })
    }
    const transactions = listTransactions(authenticatedActor).filter(
      (t) => authenticatedActor.role === 'transaction_coordinator' ? t.tcId === authenticatedActor.userId : true
    )
    return NextResponse.json({ transactions, actor: { id: authenticatedActor.id, name: authenticatedActor.name, role: authenticatedActor.role } })
  } catch (e) {
    const status = e instanceof AccessError ? e.status : 503
    const response = NextResponse.json({ error: status >= 500 ? 'Transactions are temporarily unavailable.' : (e as Error).message }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    await recordCaughtRouteFailure(request, '/api/transactions/tc-queue', actor, status, e)
    return response
  }
}
