import 'server-only'
import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { getPgPool } from '@/lib/db/pg'

export type PublicRateLimitScope = 'property_search' | 'public_form' | 'public_chat'
export interface RateLimitDecision { allowed: boolean; remaining: number; retryAfterSeconds: number }

export class SharedRateLimitUnavailableError extends Error {
  readonly status = 503
  constructor() {
    super('Shared request protection is unavailable')
    this.name = 'SharedRateLimitUnavailableError'
  }
}

const localBuckets = new Map<string, { count: number; windowStart: number }>()

/**
 * Uses an atomic PostgreSQL function in production and process memory in local
 * development/tests only. The key is HMACed before it crosses the process
 * boundary, so raw client IPs are never persisted.
 */
export async function consumeRateLimit(
  scope: PublicRateLimitScope,
  clientKey: string,
  limit: number,
  windowSeconds: number,
  now = Date.now(),
): Promise<RateLimitDecision> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 3600) {
    throw new Error('Invalid rate limit policy')
  }
  if (typeof clientKey !== 'string' || clientKey.length < 1 || clientKey.length > 256) throw new Error('Invalid rate limit key')

  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.RCRE_SESSION_SECRET
    if (!secret || secret.length < 32 || !process.env.RCRE_TRUSTED_CLIENT_IP_HEADER) throw new SharedRateLimitUnavailableError()
    const clientHash = createHmac('sha256', secret).update(`${scope}\0${clientKey}`).digest('hex')
    try {
      const result = await getPgPool().query(
        'select allowed, remaining, retry_after_seconds from rcre_consume_public_rate_limit($1, $2, $3, $4)',
        [scope, clientHash, limit, windowSeconds],
      )
      const row = result.rows[0] as { allowed?: unknown; remaining?: unknown; retry_after_seconds?: unknown } | undefined
      if (!row || typeof row.allowed !== 'boolean') throw new SharedRateLimitUnavailableError()
      return {
        allowed: row.allowed,
        remaining: Math.max(0, Number(row.remaining) || 0),
        retryAfterSeconds: Math.max(1, Number(row.retry_after_seconds) || windowSeconds),
      }
    } catch {
      throw new SharedRateLimitUnavailableError()
    }
  }

  const windowMs = windowSeconds * 1000
  const start = Math.floor(now / windowMs) * windowMs
  const id = `${scope}:${clientKey}`
  const prior = localBuckets.get(id)
  const count = !prior || prior.windowStart !== start ? 1 : prior.count + 1
  localBuckets.set(id, { count, windowStart: start })
  if (localBuckets.size > 5000) {
    for (const [key, bucket] of localBuckets) if (bucket.windowStart + windowMs < now) localBuckets.delete(key)
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds: Math.max(1, Math.ceil((start + windowMs - now) / 1000)) }
}

/** Only a configured reverse-proxy header may identify production clients. */
export function trustedClientKey(headers: Headers, production = process.env.NODE_ENV === 'production'): string | null {
  if (production) {
    const configured = process.env.RCRE_TRUSTED_CLIENT_IP_HEADER?.toLowerCase()
    if (!configured || !/^[a-z0-9-]{1,80}$/.test(configured)) return null
    const value = headers.get(configured)?.trim()
    if (!value || value.includes(',') || !isIP(value)) return null
    return value
  }
  const value = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return value && value.length <= 256 ? value : 'local-development'
}

export async function rateLimitRequest(
  scope: PublicRateLimitScope,
  headers: Headers,
  limit: number,
  windowSeconds = 60,
): Promise<RateLimitDecision> {
  const key = trustedClientKey(headers)
  if (!key) throw new SharedRateLimitUnavailableError()
  return consumeRateLimit(scope, key, limit, windowSeconds)
}
