/**
 * Cloud AI Settings — Server-only operations
 * 
 * These functions use Next.js server-only APIs (cookies) and must
 * remain server-only. Import only from API routes or Server Components.
 */

'use server'

import { cookies } from 'next/headers'
import type { StoredAIConfig, ValidationResult } from './shared-types'
import { assertFreeOnlyConfig, type CloudProviderConfig } from './providers'

const COOKIE_NAME = 'rcre_ai_config'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// ---------------------------------------------------------------------------
// Cookie operations
// ---------------------------------------------------------------------------

export async function saveAIConfigToCookie(config: StoredAIConfig): Promise<void> {
  const cookieStore = await cookies()
  if (config.cloud) assertFreeOnlyConfig(config.cloud)
  const toStore: StoredAIConfig = { ...config, cloud: config.cloud ? { ...config.cloud, apiKey: undefined } : undefined, updatedAt: new Date().toISOString() }
  cookieStore.set(COOKIE_NAME, JSON.stringify(toStore), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function readAIConfigFromCookie(): Promise<StoredAIConfig | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredAIConfig
    if (parsed.cloud) {
      parsed.cloud = { ...parsed.cloud, apiKey: undefined }
      assertFreeOnlyConfig(parsed.cloud)
    }
    return parsed
  } catch {
    return null
  }
}

export async function clearAIConfigCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export async function validateCloudConfig(config: CloudProviderConfig): Promise<ValidationResult> {
  try {
    assertFreeOnlyConfig(config)
    if (!process.env.OPENROUTER_API_KEY) return { valid: false, error: 'OpenRouter is not configured on the server' }
    const { CloudTransport } = await import('./cloud-transport')
    return await new CloudTransport(config, 20_000).validateCredentials()
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'OpenRouter configuration rejected' }
  }
}
