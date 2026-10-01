import { beforeEach, describe, expect, it, vi } from 'vitest'

const { cookieJar, actorState, exchange, connect } = vi.hoisted(() => {
  const values = new Map<string, { value: string }>()
  return {
    cookieJar: {
      get: (key: string) => values.get(key),
      delete: (input: { name: string }) => values.delete(input.name),
      values,
    },
    actorState: { userId: 'agent-1', organizationId: 'org-1' },
    exchange: vi.fn(async () => ({ accessToken: 'test-access', refreshToken: 'test-refresh', expiresIn: 3600, scopes: [], email: 'agent@example.com' })),
    connect: vi.fn(async () => undefined),
  }
})

vi.mock('next/headers', () => ({ cookies: async () => cookieJar }))
vi.mock('@/lib/platform/auth', () => ({ requireActor: async () => ({ ...actorState }) }))
vi.mock('@/lib/google-workspace/oauth', () => ({
  GoogleOAuthHttp: class { exchange = exchange },
  workspaceOAuthConfig: () => ({ clientId: 'client', clientSecret: 'secret', redirectUri: 'https://rcre.example/api/integrations/google/callback' }),
}))
vi.mock('@/lib/google-workspace/service', () => ({ getGoogleWorkspaceService: () => ({ connect }) }))

import { GET } from '@/app/api/integrations/google/callback/route'

function cookiesFor(actorId = 'agent-1') {
  cookieJar.values.clear()
  cookieJar.values.set('rcre_google_workspace_state', { value: 'state-123' })
  cookieJar.values.set('rcre_google_workspace_verifier', { value: 'pkce-verifier' })
  cookieJar.values.set('rcre_google_workspace_service', { value: 'gmail' })
  cookieJar.values.set('rcre_google_workspace_actor', { value: actorId })
}

describe('Google Workspace OAuth account binding', () => {
  beforeEach(() => {
    actorState.userId = 'agent-1'
    exchange.mockClear()
    connect.mockClear()
    cookiesFor()
  })

  it('rejects a callback if the active RCRE account changed during Google consent', async () => {
    actorState.userId = 'agent-2'
    const response = await GET(new Request('https://rcre.example/api/integrations/google/callback?code=code&state=state-123'))
    expect(response.headers.get('location')).toContain('google=failed')
    expect(exchange).not.toHaveBeenCalled()
    expect(connect).not.toHaveBeenCalled()
    expect(cookieJar.values.size).toBe(0)
  })

  it('connects the selected optional service only to the initiating RCRE account', async () => {
    const response = await GET(new Request('https://rcre.example/api/integrations/google/callback?code=code&state=state-123'))
    expect(response.headers.get('location')).toContain('google=connected')
    expect(exchange).toHaveBeenCalledWith('code', 'pkce-verifier')
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ userId: 'agent-1' }), 'gmail', expect.objectContaining({ email: 'agent@example.com' }))
  })
})
