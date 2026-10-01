import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireActor } from '@/lib/platform/auth'
import { GoogleOAuthHttp, workspaceOAuthConfig } from '@/lib/google-workspace/oauth'
import { getGoogleWorkspaceService } from '@/lib/google-workspace/service'
import type { WorkspaceService } from '@/lib/google-workspace/types'

export const dynamic = 'force-dynamic'
const STATE = 'rcre_google_workspace_state', VERIFIER = 'rcre_google_workspace_verifier', SERVICE = 'rcre_google_workspace_service', ACTOR = 'rcre_google_workspace_actor'
const settings = (url: URL, result: string) => NextResponse.redirect(new URL(`/google-workspace?google=${result}`, url.origin), 303)
function safeEqual(a: string, b: string) { return a.length === b.length && Buffer.from(a).length === Buffer.from(b).length && require('node:crypto').timingSafeEqual(Buffer.from(a), Buffer.from(b)) }
export async function GET(request: Request) {
  const url = new URL(request.url), jar = await cookies()
  const clear = () => { for (const key of [STATE, VERIFIER, SERVICE, ACTOR]) jar.delete({ name: key, path: '/api/integrations/google/callback' }) }
  try {
    const actor = await requireActor(), state = url.searchParams.get('state') ?? '', cookieState = jar.get(STATE)?.value ?? ''
    const verifier = jar.get(VERIFIER)?.value ?? '', service = jar.get(SERVICE)?.value as WorkspaceService | undefined, initiatingActor = jar.get(ACTOR)?.value ?? ''
    if (!state || state.length > 128 || !cookieState || !safeEqual(state, cookieState) || !verifier || !initiatingActor || !safeEqual(actor.userId, initiatingActor) || !['gmail','calendar','drive'].includes(service ?? '')) { clear(); return settings(url, 'failed') }
    if (url.searchParams.has('error')) { clear(); return settings(url, 'denied') }
    const code = url.searchParams.get('code')
    if (!code || code.length > 4096) { clear(); return settings(url, 'failed') }
    const config = workspaceOAuthConfig()
    if (!config) { clear(); return settings(url, 'unavailable') }
    const tokens = await new GoogleOAuthHttp(config).exchange(code, verifier)
    await getGoogleWorkspaceService().connect(actor, service!, tokens)
    clear()
    return settings(url, 'connected')
  } catch {
    clear()
    return settings(url, 'failed')
  }
}
