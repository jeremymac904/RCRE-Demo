import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { randomUUID } from 'node:crypto'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
    if (!['broker_owner', 'managing_broker'].includes(actor.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const { id } = await params
    // In production this would update a durable exception store.
    // For now, return a synthetic resolved exception.
    const resolved = {
      id,
      transactionId: id.replace(/^exc-/, '').split('-')[0],
      type: 'deadline_breach',
      description: 'Resolved via broker action',
      severity: 'medium' as const,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      ageDays: 1,
      transaction: { id: id.split('-')[0], address: '', client: '', status: 'active', updatedAt: new Date().toISOString() },
      assignedTc: '—',
      assignedAgent: '—',
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: actor.name,
      resolution: 'Broker reviewed and resolved',
    }
    return NextResponse.json(resolved)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}
