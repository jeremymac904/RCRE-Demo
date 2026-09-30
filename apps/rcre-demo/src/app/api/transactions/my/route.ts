import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { listTransactions } from '@/lib/services/transactions'
import { dataMode } from '@/lib/config/env'
import { durableTransactionActor, durableTransactions } from '@/lib/services/transactions-durable'

export async function GET() {
  try {
    const actor = await requireActor()
    if (dataMode() === 'live') {
      const rows = await durableTransactions().list(durableTransactionActor(actor))
      return NextResponse.json({ transactions: rows.filter(t => t.ownerId === actor.userId || t.tcId === actor.userId) })
    }
    const transactions = listTransactions(actor).filter(
      (t) => t.ownerId === actor.userId || t.tcId === actor.userId
    )
    return NextResponse.json({ transactions })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}
