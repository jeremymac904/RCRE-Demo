import { afterEach, describe, expect, it, vi } from 'vitest'
import { consumeRateLimit, rateLimitRequest, SharedRateLimitUnavailableError, trustedClientKey } from '@/lib/services/rate-limit'

afterEach(() => vi.unstubAllEnvs())

describe('shared public rate limit boundary', () => {
  it('enforces a bounded local fixed window for development and tests', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const scope = 'public_chat'
    const first = await consumeRateLimit(scope, 'client-a', 2, 60, 1_000_000)
    const second = await consumeRateLimit(scope, 'client-a', 2, 60, 1_000_001)
    const denied = await consumeRateLimit(scope, 'client-a', 2, 60, 1_000_002)
    const reset = await consumeRateLimit(scope, 'client-a', 2, 60, 1_060_000)
    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(denied.allowed).toBe(false)
    expect(reset.allowed).toBe(true)
  })

  it('does not trust forwarded client IP headers in production by default', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_TRUSTED_CLIENT_IP_HEADER', '')
    expect(trustedClientKey(new Headers({ 'x-forwarded-for': '203.0.113.12' }))).toBeNull()
  })

  it('accepts only an explicitly configured, single literal proxy IP', () => {
    vi.stubEnv('RCRE_TRUSTED_CLIENT_IP_HEADER', 'x-nf-client-connection-ip')
    const good = new Headers({ 'x-nf-client-connection-ip': '203.0.113.12' })
    const forged = new Headers({ 'x-nf-client-connection-ip': '203.0.113.12, 10.0.0.1' })
    expect(trustedClientKey(good, true)).toBe('203.0.113.12')
    expect(trustedClientKey(forged, true)).toBeNull()
  })

  it('fails closed in production when durable shared limiting is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_SESSION_SECRET', '')
    vi.stubEnv('RCRE_TRUSTED_CLIENT_IP_HEADER', 'x-nf-client-connection-ip')
    await expect(rateLimitRequest('property_search', new Headers({ 'x-nf-client-connection-ip': '203.0.113.12' }), 90))
      .rejects.toBeInstanceOf(SharedRateLimitUnavailableError)
  })
})
