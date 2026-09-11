import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { listTransactions } from '@/lib/services/transactions'

export async function GET() {
  try {
    const actor = await requireActor()
    const transactions = listTransactions(actor).filter(
      (t) => t.ownerId === actor.userId || t.tcId === actor.userId
    )
    return NextResponse.json({ transactions })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}
