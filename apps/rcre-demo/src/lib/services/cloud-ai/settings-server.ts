/**
 * Cloud AI Settings — Server-only operations
 * 
 * These functions use Next.js server-only APIs (cookies) and must
 * remain server-only. Import only from API routes or Server Components.
 */

'use server'

import { cookies } from 'next/headers'
import type { StoredAIConfig, ValidationResult } from './shared-types'
import type { CloudProviderConfig } from './providers'

const COOKIE_NAME = 'rcre_ai_config'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// ---------------------------------------------------------------------------
// Encryption utilities
// ---------------------------------------------------------------------------

async function getDerivedKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode('rcre-ai-config-v1' + (process.env.RCRE_ENCRYPTION_SALT ?? 'local-dev-salt')),
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

async function encrypt(plaintext: string): Promise<string> {
  const key = await getDerivedKey()
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext))
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decrypt(encrypted: string): Promise<string> {
  const key = await getDerivedKey()
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

// ---------------------------------------------------------------------------
// Cookie operations
// ---------------------------------------------------------------------------

export async function saveAIConfigToCookie(config: StoredAIConfig): Promise<void> {
  const cookieStore = await cookies()
  const toStore: StoredAIConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  }
  if (toStore.cloud?.apiKey) {
    toStore.cloud = { ...toStore.cloud, apiKey: await encrypt(toStore.cloud.apiKey) }
  }
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
    if (parsed.cloud?.apiKey && !parsed.cloud.apiKey.startsWith('sk-')) {
      try {
        parsed.cloud = { ...parsed.cloud, apiKey: await decrypt(parsed.cloud.apiKey) }
      } catch {
        parsed.cloud = { ...parsed.cloud, apiKey: '' }
      }
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
  if (!config.apiKey && config.provider !== 'ollama-remote') {
    return { valid: false, error: 'API key is required for this provider' }
  }
  if (!config.model) {
    return { valid: false, error: 'Model is required' }
  }
  const { CloudTransport } = await import('./cloud-transport')
  const transport = new CloudTransport(config, 20_000)
  const result = await transport.validateCredentials()
  if (result.valid) {
    return { valid: true, models: result.models }
  } else {
    return { valid: false, error: result.error }
  }
}
