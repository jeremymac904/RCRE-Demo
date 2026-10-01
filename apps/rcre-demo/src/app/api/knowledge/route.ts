import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActor, AccessError, type PlatformActor } from '@/lib/platform/auth'
import { getRepository } from '@/lib/db'
import { DomainRecordConflictError } from '@/lib/db/repository'
import { domainKnowledgeRepository, createKnowledgeDocument, updateKnowledgeDocument, archiveKnowledgeDocument, listKnowledgeDocuments, searchKnowledge, getKnowledgeDocument } from '@/lib/services/ai-knowledge'
import { trustedKnowledgeActor } from '@/lib/platform/knowledge-access'
import { assertSameOriginMutation } from '@/lib/auth/request-origin'

export const dynamic = 'force-dynamic'
const audienceRoles = z.array(z.enum(['owner', 'broker', 'team_lead', 'agent', 'staff', 'recruiter', 'viewer'])).min(1).max(7)
const documentSchema = z.object({
  id: z.string().min(1).max(180), title: z.string().trim().min(1).max(180), category: z.string().trim().min(1).max(60),
  source: z.string().trim().min(1).max(500), state: z.string().regex(/^[A-Z]{2}$/).nullable(),
  audience: z.discriminatedUnion('kind', [z.object({ kind: z.literal('all') }), z.object({ kind: z.literal('roles'), roles: audienceRoles }), z.object({ kind: z.literal('users'), userIds: z.array(z.string().min(1).max(160)).min(1).max(300) })]),
  visibility: z.enum(['organization', 'state', 'restricted']), classification: z.enum(['public', 'internal', 'sensitive']), externalUseAllowed: z.boolean(),
  allowedUserIds: z.array(z.string().min(1).max(160)).max(300).optional(), tags: z.array(z.string().trim().min(1).max(60)).max(40), content: z.string().trim().min(1).max(180000),
})
function canManage(actor: PlatformActor) { return ['broker_owner', 'managing_broker'].includes(actor.role) }
function fail(error: unknown) {
  const status = error instanceof AccessError ? error.status : error instanceof DomainRecordConflictError ? 409 : error instanceof z.ZodError ? 400 : error instanceof Error && /not found/.test(error.message) ? 404 : 400
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Knowledge request failed' }, { status, headers: { 'Cache-Control': 'private, no-store' } })
}
async function repo() { return domainKnowledgeRepository(await getRepository()) }

export async function GET(request: Request) {
  try {
    const platformActor = await requireActor()
    const actor = trustedKnowledgeActor(platformActor)
    const url = new URL(request.url)
    const query = url.searchParams.get('q')?.trim()
    const documentId = url.searchParams.get('id')?.trim()
    if (documentId) {
      const document = await getKnowledgeDocument(await repo(), actor, documentId)
      if (!document) throw new AccessError('Knowledge document not found', 404)
      return NextResponse.json({ document }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    if (query) {
      return NextResponse.json({ results: await searchKnowledge(await repo(), actor, query, { limit: 8 }), management: canManage(platformActor) }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    if (!canManage(platformActor)) throw new AccessError('Brokerage administrator access required')
    return NextResponse.json({ documents: await listKnowledgeDocuments(await repo(), actor) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return fail(error) }
}

export async function POST(request: Request) {
  try {
    const platformActor = await requireActor()
    if (!canManage(platformActor)) throw new AccessError('Brokerage administrator access required')
    assertSameOriginMutation(request)
    const body = documentSchema.parse(await request.json())
    const saved = await createKnowledgeDocument(await repo(), trustedKnowledgeActor(platformActor), { ...body, id: body.id.trim() })
    return NextResponse.json({ document: saved }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return fail(error) }
}

export async function PATCH(request: Request) {
  try {
    const platformActor = await requireActor()
    if (!canManage(platformActor)) throw new AccessError('Brokerage administrator access required')
    assertSameOriginMutation(request)
    const body = z.object({ id: z.string().min(1).max(180), expectedVersion: z.number().int().positive(), patch: documentSchema.partial() }).parse(await request.json())
    const { id, expectedVersion, patch } = body
    const saved = await updateKnowledgeDocument(await repo(), trustedKnowledgeActor(platformActor), id, patch, expectedVersion)
    return NextResponse.json({ document: saved }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return fail(error) }
}

export async function DELETE(request: Request) {
  try {
    const platformActor = await requireActor()
    if (!canManage(platformActor)) throw new AccessError('Brokerage administrator access required')
    assertSameOriginMutation(request)
    const body = z.object({ id: z.string().min(1).max(180), expectedVersion: z.number().int().positive() }).parse(await request.json())
    const document = await archiveKnowledgeDocument(await repo(), trustedKnowledgeActor(platformActor), body.id, body.expectedVersion)
    return NextResponse.json({ document }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return fail(error) }
}
