import { describe, expect, it } from 'vitest'
import { assertSafeDesktopConnection, desktopProviderCatalog } from '@/lib/desktop/provider-contract'

describe('optional desktop provider contract', () => {
  it('reports unavailable connectors without implying an installed desktop or connected account', () => {
    const catalog = desktopProviderCatalog()
    expect(catalog.map(p => p.id)).toEqual(['openai-codex', 'claude-code', 'google-gemini'])
    expect(catalog.every(p => p.state === 'unavailable')).toBe(true)
    expect(catalog.every(p => p.canSendCredentialsToRcreServer === false && p.canUseApiKeyFallback === false)).toBe(true)
    expect(catalog.every(p => !('accessToken' in p) && !('refreshToken' in p) && !('clientSecret' in p) && !('apiKey' in p))).toBe(true)
  })

  it('accepts only a scoped, token-free provider status shape', () => {
    expect(() => assertSafeDesktopConnection({ providerId: 'openai-codex', state: 'connected', accountLabel: 'user@example.test' })).not.toThrow()
    expect(() => assertSafeDesktopConnection({ providerId: 'openai-codex', state: 'connected', accessToken: 'nope' })).toThrow('credentials must remain')
    expect(() => assertSafeDesktopConnection({ providerId: 'other', state: 'connected' })).toThrow('Unsupported desktop provider')
  })
})
