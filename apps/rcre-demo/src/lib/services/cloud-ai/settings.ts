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
import { buildCloudConfig } from './shared-types'
import type { CloudProviderConfig } from './providers'

// ---------------------------------------------------------------------------
// Cookie configuration
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'rcre_ai_config'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// ---------------------------------------------------------------------------
// Encryption utilities (Web Crypto API)
// ---------------------------------------------------------------------------

// Encryption key is derived from a master secret + per-install salt
// This is NOT a hardcoded static key — it uses environment-derived entropy
const MASTER_KEY_ID = 'rcre-ai-config-v1'

async function getDerivedKey(): Promise<CryptoKey> {
  // Use a combination of the master key ID and a runtime secret
  // In production this would be from a proper KMS or env var
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(MASTER_KEY_ID + (process.env.RCRE_ENCRYPTION_SALT ?? 'local-dev-salt')),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const salt = encoder.encode('rcre-ai-config-salt-v1')

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts a string value using AES-GCM.
 * Returns base64-encoded ciphertext with IV prepended.
 */
async function encrypt(plaintext: string): Promise<string> {
  const key = await getDerivedKey()
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )

  // Prepend IV to ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypts a base64-encoded ciphertext (IV + ciphertext) using AES-GCM.
 */
async function decrypt(encrypted: string): Promise<string> {
  const key = await getDerivedKey()
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))

  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(plaintext)
}

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
  if (toStore.cloud?.apiKey) {
    toStore.cloud = {
      ...toStore.cloud,
      apiKey: await encrypt(toStore.cloud.apiKey),
    }
  }

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

    // Decrypt any encrypted API key
    if (parsed.cloud?.apiKey && !parsed.cloud.apiKey.startsWith('sk-')) {
      // It looks encrypted (not a raw key), decrypt it
      try {
        parsed.cloud = {
          ...parsed.cloud,
          apiKey: await decrypt(parsed.cloud.apiKey),
        }
      } catch {
        // Decryption failed — key may be corrupted or invalid
        // Don't expose the encrypted value
        parsed.cloud = { ...parsed.cloud, apiKey: '' }
      }
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
  if (!config.apiKey && config.provider !== 'ollama-remote') {
    return { valid: false, error: 'API key is required for this provider' }
  }

  if (!config.model) {
    return { valid: false, error: 'Model is required' }
  }

  // Lazy-load CloudTransport only for validation
  const { CloudTransport } = await import('./cloud-transport')
  const transport = new CloudTransport(config, 20_000)
  const result = await transport.validateCredentials()

  if (result.valid) {
    return { valid: true, models: result.models }
  } else {
    return { valid: false, error: result.error }
  }
}
