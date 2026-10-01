import { NextRequest, NextResponse } from 'next/server'
import { requireActor, assertCapability, AccessError } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { audit } from '@/lib/platform/service'
import { providerCatalog, providerCatalogDurable, saveProviderCompliance, saveProviderComplianceDurable } from '@/lib/property/providers'
import { z } from 'zod'
export const dynamic = 'force-dynamic'
const schema = z.object({ providerId:z.string().min(1).max(80), approved:z.literal(true), agreementReference:z.string().trim().min(2).max(300), requiredAttribution:z.string().trim().min(1).max(2000), requiredDisclaimer:z.string().trim().min(1).max(6000), copyrightText:z.string().trim().min(1).max(2000), listingBrokerageRule:z.string().trim().min(1).max(2000), refreshIntervalHours:z.number().int().min(1).max(720), photoMode:z.enum(['remote','cached','local-derivative']), permittedStatuses:z.array(z.enum(['Active','Coming Soon','Pending','Closed','Withdrawn','Unknown'])).min(1).max(6), soldDisplayAllowed:z.boolean(), openHouseRules:z.string().trim().max(2000), indexing:z.enum(['allowed','noindex']) })
const failure = (error: unknown) => NextResponse.json({ error: error instanceof AccessError ? error.message : 'MLS settings could not be updated.' }, { status: error instanceof AccessError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } })
export async function GET(request: Request) {
  let actor: PlatformActor | null = null
  try { actor = await requireActor(); assertCapability(actor, 'settings.leads'); const providers = process.env.NODE_ENV === 'production' ? await providerCatalogDurable(actor) : providerCatalog(actor.organizationId); return NextResponse.json({ providers, secretsExposed: false }, { headers: { 'Cache-Control': 'no-store' } }) }
  catch (error) { const response = failure(error); await recordCaughtRouteFailure(request, '/api/mls/providers', actor, response.status, error); return response }
}
export async function PUT(request: NextRequest) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    assertCapability(actor, 'settings.leads')
    const origin = request.headers.get('origin')
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Cross-origin update denied.' }, { status: 403 })
    const body = schema.parse(await request.json())
    const { providerId, approved, agreementReference, ...compliance } = body
    const saved = process.env.NODE_ENV === 'production'
      ? await saveProviderComplianceDurable(actor, providerId, { ...compliance, agreementReference })
      : saveProviderCompliance(actor.organizationId, providerId, compliance, actor.id)
    if (process.env.NODE_ENV !== 'production') audit(actor, 'mls.compliance_terms_recorded', providerId)
    const providers = process.env.NODE_ENV === 'production' ? await providerCatalogDurable(actor) : providerCatalog(actor.organizationId)
    const status = providers.find(provider => provider.id === providerId)?.status
    return NextResponse.json({ agreementApproved: true, approvedAt: 'approvedAt' in saved ? saved.approvedAt : saved.compliance?.approvalState === 'approved' ? saved.compliance.approvedAt : undefined, status }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Add the exact approved agreement and display terms before saving.' }, { status: 400 })
    const response = failure(error)
    await recordCaughtRouteFailure(request, '/api/mls/providers', actor, response.status, error)
    return response
  }
}
