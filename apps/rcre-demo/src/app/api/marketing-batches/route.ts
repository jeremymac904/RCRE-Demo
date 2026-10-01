import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireActor, assertCapability, AccessError } from '@/lib/platform/auth'
import { assertSameOriginMutation } from '@/lib/auth/request-origin'
import { canReadMarketing, canEditMarketing, audit } from '@/lib/platform/service'
import { readRecords, getRecord, putRecord, deleteRecord, transaction } from '@/lib/platform/store'
import { createMarketingBatchDurable, listMarketingBatchesDurable, updateMarketingBatchDurable } from '@/lib/platform/marketing-durable'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const actor = await requireActor()
    assertCapability(actor, 'marketing')
    if (process.env.NODE_ENV === 'production') return Response.json(await listMarketingBatchesDurable(actor))
    return Response.json(readRecords<any>('marketing_batches').filter(batch => canEditMarketing(actor, batch)).map(batch => ({ ...batch, contents: batch.contentIds.map((id: string) => getRecord<any>('marketing', id)).filter((row: any) => row && canReadMarketing(actor, row)).map((row: any) => ({ id: row.id, title: row.title, status: row.status, version: row.version })) })))
  } catch (error) { return fail(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    assertCapability(actor, 'marketing')
    assertSameOriginMutation(request)
    const body = await request.json()
    if (process.env.NODE_ENV === 'production') {
      if (body.action === 'pause' || body.action === 'cancel') return Response.json(await updateMarketingBatchDurable(actor, body))
      return Response.json(await createMarketingBatchDurable(actor, body), { status: 201 })
    }
    return Response.json(transaction(() => {
      if (body.action === 'pause' || body.action === 'cancel') {
        const batch = getRecord<any>('marketing_batches', String(body.id))
        if (!batch || !canEditMarketing(actor, batch)) throw new AccessError('Batch not found', 404)
        for (const id of batch.contentIds) {
          const old = getRecord<any>('marketing', id)
          if (!old || !canEditMarketing(actor, old)) throw new AccessError()
          putRecord('marketing_history', { ...old, id: randomUUID(), contentId: id, recordedAt: new Date().toISOString() })
          putRecord('marketing', { ...old, status: body.action === 'pause' ? 'paused' : 'canceled', version: old.version + 1 })
          deleteRecord('marketing_outbox', id)
        }
        putRecord('marketing_batches', { ...batch, status: body.action === 'pause' ? 'paused' : 'canceled', version: (batch.version ?? 1) + 1, updatedAt: new Date().toISOString() })
        audit(actor, 'marketing.batch-' + body.action, batch.id)
        return { updated: batch.contentIds.length, externalMessagesSent: 0 }
      }
      const input = z.object({ title: z.string().trim().min(1).max(200), ids: z.array(z.string()).min(1).max(30) }).parse(body)
      const copies = [...new Set(input.ids)].map(id => {
        const old = getRecord<any>('marketing', id)
        if (!old || !canReadMarketing(actor, old)) throw new AccessError('Content not available', 404)
        const copy = { ...old, id: randomUUID(), ownerId: actor.id, officeId: actor.officeId, title: old.title + ' — batch draft', version: 1, status: 'draft', approvedBy: null, approvedVersion: null, scheduleAt: undefined, listingId: undefined, sourceContentId: old.id }
        putRecord('marketing', copy)
        return copy.id
      })
      const batch = { id: randomUUID(), organizationId: actor.organizationId, ownerId: actor.id, officeId: actor.officeId, title: input.title, contentIds: copies, createdAt: new Date().toISOString(), version: 1, status: 'draft' }
      putRecord('marketing_batches', batch)
      audit(actor, 'marketing.batch-created', batch.id)
      return batch
    }))
  } catch (error) { return fail(error) }
}

function fail(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : 'Batch request failed' }, { status: error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 500 })
}
