import { timingSafeEqual } from 'node:crypto'
import { PERSONAS } from '@/lib/platform/auth'
import { processCalendarReminders } from '@/lib/platform/service'
import { localDispatch } from '@/lib/platform/library'
import { putRecord } from '@/lib/platform/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const expected = process.env.RCRE_LOCAL_WORKER_KEY
  const provided = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (process.env.RCRE_APP_MODE !== 'local' || !expected || !provided || Buffer.byteLength(expected) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    return Response.json({ error: 'Local worker authentication required' }, { status: 401 })
  }

  const workerActor = {
    ...PERSONAS.find(actor => actor.role === 'broker_owner')!,
    id: 'local-worker', userId: 'local-worker', name: 'Local schedule worker',
  }
  try {
    const result = { ...localDispatch(workerActor), reminders: processCalendarReminders(workerActor) }
    putRecord('local_worker', {
      id: workerActor.organizationId,
      lastRun: new Date().toISOString(),
      status: 'healthy',
      processed: result.processed,
      reminders: result.reminders,
      externalMessagesSent: 0,
    })
    return Response.json(result)
  } catch {
    try {
      putRecord('local_worker', {
        id: workerActor.organizationId,
        lastRun: new Date().toISOString(),
        status: 'failed',
        errorCode: 'LOCAL_WORKER_FAILED',
      })
    } catch {
      // Health storage can fail independently; never hide the original worker failure.
    }
    return Response.json({ error: 'Local worker failed. No external messages were sent.' }, { status: 500 })
  }
}
