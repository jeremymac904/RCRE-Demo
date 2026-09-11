import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { listTransactions } from '@/lib/services/transactions'
import { calculateDeadline } from '@/lib/services/deadlines'
import { randomUUID } from 'node:crypto'

export type ExceptionType = 'overdue_approval' | 'compliance_flag' | 'deadline_breach' | 'disputed_item' | 'stalled_negotiation' | 'missing_document'

export interface TransactionException {
  id: string
  transactionId: string
  type: ExceptionType
  description: string
  severity: 'critical' | 'high' | 'medium'
  createdAt: string
  ageDays: number
  transaction: { id: string; address: string; client: string; status: string; updatedAt: string }
  assignedTc: string
  assignedAgent: string
  resolved: boolean
}

// In-memory exception store (production: durable store)
const exceptions = new Map<string, TransactionException>()

function buildExceptions(actor: Awaited<ReturnType<typeof requireActor>>) {
  if (!['broker_owner', 'managing_broker'].includes(actor.role)) return []
  const transactions = listTransactions(actor)
  const now = new Date()
  const result: TransactionException[] = []

  for (const t of transactions) {
    if (t.status === 'closed') continue

    // Deadline breaches
    for (const d of t.deadlines) {
      const calc = calculateDeadline(d)
      if (calc.date && new Date(calc.date) < now) {
        result.push({
          id: `exc-${t.id}-${d.id}`,
          transactionId: t.id,
          type: 'deadline_breach',
          description: `Deadline "${d.label}" is ${Math.floor((now.getTime() - new Date(calc.date!).getTime()) / 86400000)} days overdue`,
          severity: 'critical',
          createdAt: calc.date!,
          ageDays: Math.floor((now.getTime() - new Date(calc.date!).getTime()) / 86400000),
          transaction: { id: t.id, address: t.address, client: t.client, status: t.status, updatedAt: t.updatedAt },
          assignedTc: t.tcId || 'Unassigned',
          assignedAgent: t.ownerId,
          resolved: false,
        })
      }
    }

    // Missing TC assignment
    if (!t.tcId && t.status === 'active') {
      result.push({
        id: `exc-${t.id}-no-tc`,
        transactionId: t.id,
        type: 'missing_document',
        description: 'No transaction coordinator assigned',
        severity: 'high',
        createdAt: t.updatedAt,
        ageDays: Math.floor((now.getTime() - new Date(t.updatedAt).getTime()) / 86400000),
        transaction: { id: t.id, address: t.address, client: t.client, status: t.status, updatedAt: t.updatedAt },
        assignedTc: 'Unassigned',
        assignedAgent: t.ownerId,
        resolved: false,
      })
    }

    // Check for >5 day old active transactions with no checklist progress
    const daysOld = Math.floor((now.getTime() - new Date(t.updatedAt).getTime()) / 86400000)
    const completedItems = t.checklist.filter((c) => c.done).length
    if (daysOld > 5 && completedItems === 0 && t.status === 'active') {
      result.push({
        id: `exc-${t.id}-stalled`,
        transactionId: t.id,
        type: 'stalled_negotiation',
        description: `No checklist activity for ${daysOld} days`,
        severity: 'medium',
        createdAt: t.updatedAt,
        ageDays: daysOld,
        transaction: { id: t.id, address: t.address, client: t.client, status: t.status, updatedAt: t.updatedAt },
        assignedTc: t.tcId || 'Unassigned',
        assignedAgent: t.ownerId,
        resolved: false,
      })
    }
  }

  return result
}

export async function GET() {
  try {
    const actor = await requireActor()
    const all = buildExceptions(actor)
    const open = all.filter((e) => !e.resolved)
    const resolved = all.filter((e) => e.resolved)
    return NextResponse.json({ exceptions: open, resolved })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}
