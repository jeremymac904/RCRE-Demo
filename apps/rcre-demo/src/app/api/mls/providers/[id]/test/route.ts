import { NextRequest, NextResponse } from 'next/server'
import { requireActor, assertCapability, AccessError } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import { adapterFor, providerCatalog, providerCatalogDurable, saveProviderConnection, saveProviderConnectionDurable } from '@/lib/property/providers'
import { audit } from '@/lib/platform/service'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: PlatformActor | null = null
  try {
    actor = await requireActor()
    assertCapability(actor, 'settings.leads')
    const origin = request.headers.get('origin')
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Cross-origin request denied.' }, { status: 403 })
    const { id } = await params
    const providers = process.env.NODE_ENV === 'production' ? await providerCatalogDurable(actor) : providerCatalog(actor.organizationId)
    const provider = providers.find(item => item.id === id), adapter = adapterFor(id)
    if (!provider || !adapter) return NextResponse.json({ error: 'Provider is not in the configured catalog.' }, { status: 404 })
    if (!provider.credentialConfigured || !provider.agreementApproved) return NextResponse.json({ error: 'Add the approved agreement terms and server-side credentials before testing.' }, { status: 409 })
    const result = await adapter.testConnection()
    if (process.env.NODE_ENV === 'production') await saveProviderConnectionDurable(actor, id, result.ok, result.message)
    else saveProviderConnection(actor.organizationId, id, result.ok, result.message)
    if (process.env.NODE_ENV !== 'production') audit(actor, 'mls.connection_tested', id)
    const response = NextResponse.json({ ...result, credentialConfigured: true, agreementApproved: true }, { status: result.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
    if (!result.ok) await recordCaughtRouteFailure(request, '/api/mls/providers/[id]/test', actor, 503, new Error('ProviderConnectionFailed'))
    return response
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500
    const response = NextResponse.json({ error: error instanceof AccessError ? error.message : 'Provider readiness check failed.' }, { status })
    await recordCaughtRouteFailure(request, '/api/mls/providers/[id]/test', actor, status, error)
    return response
  }
}
