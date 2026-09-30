import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { GoogleOAuthHttp, makeState, pkcePair, workspaceOAuthConfig } from '@/lib/google-workspace/oauth'
import type { WorkspaceService } from '@/lib/google-workspace/types'
import { WORKSPACE_SERVICES } from '@/lib/google-workspace/types'

export const dynamic = 'force-dynamic'
const STATE = 'rcre_google_workspace_state', VERIFIER = 'rcre_google_workspace_verifier', SERVICE = 'rcre_google_workspace_service'
export async function GET(request: Request) {
  try {
    await requireActor()
    const url = new URL(request.url), service = url.searchParams.get('service') as WorkspaceService | null
    if (!service || !WORKSPACE_SERVICES.includes(service)) return NextResponse.json({ error: 'Choose Gmail, Calendar, or Drive.' }, { status: 400 })
    const config = workspaceOAuthConfig()
    if (!config) return NextResponse.json({ error: 'Google Workspace connection is not configured.' }, { status: 503 })
    const state = makeState(), { verifier } = pkcePair()
    const provider = new GoogleOAuthHttp(config)
    const jar = await cookies(), secure = process.env.NODE_ENV === 'production'
    const cookieBase = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/api/integrations/google/callback', maxAge: 600 }
    jar.set(STATE, state, cookieBase); jar.set(VERIFIER, verifier, cookieBase); jar.set(SERVICE, service, cookieBase)
    return NextResponse.redirect(provider.authorizationUrl(service, state, verifier), 303)
  } catch { return NextResponse.json({ error: 'Sign in to RCRE before connecting Google Workspace.' }, { status: 401 }) }
}
