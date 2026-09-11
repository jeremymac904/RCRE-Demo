import { NextResponse } from 'next/server'
import { env } from '@/lib/config/env'
import { verifyFubSignature } from '@/lib/fub/signature'
import { ingestWebhook, type WebhookLedger } from '@/lib/fub/webhook'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * FUB webhook receiver.
 *
 * FUB requires a 2XX within 10 SECONDS. This handler therefore does the
 * minimum: verify, persist to the ledger, acknowledge. Nothing is fetched from
 * FUB and no domain table is touched on this path — that happens out of band.
 *
 * NOT YET REGISTERED with FUB. Registering a production webhook requires
 * Jeremy's authorization and account-owner credentials.
 */

/** Placeholder ledger until the Postgres repository lands. */
const memoryLedger: WebhookLedger & { seen: Set<string> } = {
  seen: new Set<string>(),
  async insertIfNew(r) {
    if (this.seen.has(r.fubEventId)) return { inserted: false }
    this.seen.add(r.fubEventId)
    return { inserted: true }
  },
}

export async function POST(request: Request) {
  // Read the RAW body — signature verification depends on exact bytes.
  const raw = await request.text()
  const signature = request.headers.get('FUB-Signature')
  const valid = verifyFubSignature(raw, signature, env.fub.systemKey)

  const outcome = await ingestWebhook(raw, valid, memoryLedger)

  if (outcome.status === 'rejected') {
    // 400 is correct: retrying a malformed body will not help.
    return NextResponse.json({ status: 'rejected', reason: outcome.reason }, { status: 400 })
  }

  // Duplicates ack with 200 — telling FUB to retry would create a loop.
  return NextResponse.json({ status: outcome.status }, { status: 200 })
}
