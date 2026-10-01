import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActor, AccessError } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { getRepository } from '@/lib/db'
import { createCrmTaskDurable } from '@/lib/platform/crm-durable'
import { assertSameOriginMutation } from '@/lib/auth/request-origin'
import {
  cancelAIJobDurable, clearAIHistoryDurable, createAITextAttachmentDurable,
  getAIConfigDurable, getAIJobDurable, listAIConversationsDurable, listAIJobsDurable,
  queueAIJobDurable, runAIJobDurable, saveAIConfigDurable, testAIConnectionDurable,
} from '@/lib/services/ai-durable'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const config = z.object({
  provider: z.enum(['deterministic', 'cloud']), endpoint: z.string().max(500), model: z.string().max(200),
  sharing: z.boolean(), paused: z.boolean(), requestCap: z.number().int().min(1).max(500),
  crmContext: z.boolean().optional(), transactionContext: z.boolean().optional(), calendarContext: z.boolean().optional(), trainingContext: z.boolean().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.provider === 'cloud' && (value.model !== 'openrouter/free' || value.endpoint !== 'https://openrouter.ai/api/v1')) {
    ctx.addIssue({ code: 'custom', message: 'Remote AI is fixed to OpenRouter openrouter/free at its official endpoint', path: ['model'] })
  }
})

function errorResponse(error: unknown) {
  const status = error instanceof AccessError ? error.status : error instanceof z.ZodError ? 400 : 503
  const message = error instanceof Error ? error.message : 'The assistant request could not be completed.'
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    const [conversations, jobs, saved] = await Promise.all([
      listAIConversationsDurable(actor), listAIJobsDurable(actor), getAIConfigDurable(actor),
    ])
    return NextResponse.json({ conversations, jobs, config: saved }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { const response=errorResponse(error);await recordCaughtRouteFailure(request,'/api/assistant',actor,response.status,error);return response }
}

export async function POST(req: NextRequest) {
  let actor: PlatformActor | null = null
  try {
    assertSameOriginMutation(req)
    actor = await requireActor()
    const body = await req.json() as Record<string, unknown>
    switch (body.action) {
      case 'config': {
        const saved = await saveAIConfigDurable(actor, config.parse(body.config))
        return NextResponse.json(saved)
      }
      case 'test': {
        const saved = await testAIConnectionDurable(actor)
        return NextResponse.json({ health: saved.health, verifiedAt: saved.verifiedAt ?? null, model: saved.model || null })
      }
      case 'queue': {
        const parsed = z.object({ prompt: z.string().trim().min(1).max(5000), conversationId: z.string().uuid().optional(), attachmentId: z.string().uuid().optional(), idempotencyKey: z.string().min(8).max(200).optional() }).strict().parse(body)
        return NextResponse.json(await queueAIJobDurable(actor, parsed))
      }
      case 'cancel': {
        const id = z.string().uuid().parse(body.id)
        const job = await getAIJobDurable(actor, id)
        return NextResponse.json(await cancelAIJobDurable(actor, id, job.version))
      }
      case 'clear': return NextResponse.json(await clearAIHistoryDurable(actor))
      case 'attach': {
        const parsed = z.object({ name: z.string().trim().min(1).max(100), text: z.string().trim().min(1).max(40000) }).strict().parse(body)
        return NextResponse.json(await createAITextAttachmentDurable(actor, parsed))
      }
      case 'task': {
        const input = z.object({ title: z.string().trim().min(1).max(200), contactId: z.string().uuid().optional(), dueAt: z.string().datetime() }).strict().parse(body.input)
        return NextResponse.json(await createCrmTaskDurable(actor, input, await getRepository()), { status: 201 })
      }
      case 'run': {
        const id = z.string().uuid().parse(body.id)
        const stream = new ReadableStream<Uint8Array>({ async start(controller) {
          const encoder = new TextEncoder()
          const send = (event: unknown) => { try { controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)) } catch { /* consumer disconnected */ } }
          try {
            const result = await runAIJobDurable(actor!, id, delta => send({ delta }))
            send({ job: result })
            if (result.state === 'failed') send({ error: result.error || 'The assistant request could not be completed.' })
          } catch (error) {
            await recordCaughtRouteFailure(req, '/api/assistant', actor, error instanceof AccessError ? error.status : 503, error)
            send({ error: error instanceof AccessError ? error.message : 'The assistant request could not be completed.' })
          } finally { controller.close() }
        } })
        return new NextResponse(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } })
      }
      default: throw new AccessError('Unknown assistant action', 400)
    }
  } catch (error) { const response=errorResponse(error);await recordCaughtRouteFailure(req,'/api/assistant',actor,response.status,error);return response }
}
