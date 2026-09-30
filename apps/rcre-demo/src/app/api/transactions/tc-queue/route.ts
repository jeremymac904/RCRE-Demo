import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { listTransactions } from '@/lib/services/transactions'
import { dataMode } from '@/lib/config/env'
import { durableTransactionActor, durableTransactions } from '@/lib/services/transactions-durable'

export async function GET() {
  try {
    const actor = await requireActor()
    if (actor.role !== 'transaction_coordinator' && !['broker_owner', 'managing_broker'].includes(actor.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (dataMode() === 'live') {
      const rows = await durableTransactions().list(durableTransactionActor(actor))
      const transactions = actor.role === 'transaction_coordinator' ? rows.filter(t => t.tcId === actor.userId) : rows
      return NextResponse.json({ transactions, actor: { id: actor.id, name: actor.name, role: actor.role } })
    }
    const transactions = listTransactions(actor).filter(
      (t) => actor.role === 'transaction_coordinator' ? t.tcId === actor.userId : true
    )
    return NextResponse.json({ transactions, actor: { id: actor.id, name: actor.name, role: actor.role } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}
