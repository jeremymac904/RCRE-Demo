/**
 * Cloud AI Settings Persistence (Server-only)
 * 
 * Server-side cookie operations for AI configuration.
 * This file uses next/headers (cookies()) which is server-only.
 * Import from shared-types.ts for client-compatible types and utilities.
 */

import 'server-only'
import { cookies } from 'next/headers'
import type { StoredAIConfig, ValidationResult } from './shared-types'
import { assertFreeOnlyConfig, type CloudProviderConfig } from './providers'

// ---------------------------------------------------------------------------
// Cookie configuration
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'rcre_ai_config'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// ---------------------------------------------------------------------------
// Server-side cookie storage
// ---------------------------------------------------------------------------

/**
 * Saves AI config to an httpOnly cookie.
 * API keys are encrypted before storage.
 */
export async function saveAIConfigToCookie(config: StoredAIConfig): Promise<void> {
  const cookieStore = await cookies()

  const toStore: StoredAIConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  }

  // Encrypt any API key in cloud config
  if (config.cloud) assertFreeOnlyConfig(config.cloud)
  if (toStore.cloud) toStore.cloud = { ...toStore.cloud, apiKey: undefined }

  cookieStore.set(COOKIE_NAME, JSON.stringify(toStore), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * Reads AI config from the httpOnly cookie.
 * API keys are decrypted on read.
 */
export async function readAIConfigFromCookie(): Promise<StoredAIConfig | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value

  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredAIConfig

    if (parsed.cloud) {
      const legacy = parsed.cloud as CloudProviderConfig & { apiKey?: string }
      parsed.cloud = { ...legacy, apiKey: undefined }
      assertFreeOnlyConfig(parsed.cloud)
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Clears the AI config cookie.
 */
export async function clearAIConfigCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates a cloud config by attempting a credentials check.
 * This is called from a server action after form submission.
 */
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
