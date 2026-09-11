/**
 * Cloud AI Shared Types and Utilities
 * 
 * Types and functions that can be used by both client and server code.
 * No server-only imports (next/headers, server-only, etc.) here.
 */

import type { CloudProviderConfig, CloudProvider } from './providers'
import { defaultModelFor } from './providers'

// ---------------------------------------------------------------------------
// Stored config types
// ---------------------------------------------------------------------------

export interface StoredAIConfig {
  provider: 'deterministic' | 'ollama' | 'hermes' | 'cloud'
  cloud?: CloudProviderConfig
  model?: string
  temperature?: number
  maxTokens?: number
  sharing?: boolean
  paused?: boolean
  requestCap?: number
  updatedAt: string
}

export interface ClientAIConfig {
  provider: 'deterministic' | 'ollama' | 'hermes' | 'cloud'
  cloud?: Omit<CloudProviderConfig, 'apiKey'> & { apiKey?: string } // masked in storage
  temperature?: number
  maxTokens?: number
  requestCap?: number
  theme?: 'light' | 'dark'
}

export interface CloudConfigInput {
  provider: CloudProvider
  baseUrl?: string
  apiKey?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface ValidationResult {
  valid: boolean
  error?: string
  models?: string[]
}

export interface FullAIConfig {
  provider: 'deterministic' | 'ollama' | 'hermes' | 'cloud'
  cloud?: CloudProviderConfig
  model?: string
  temperature?: number
  maxTokens?: number
  sharing: boolean
  paused: boolean
  requestCap: number
  updatedAt?: string
}

// ---------------------------------------------------------------------------
// Client-side localStorage
// ---------------------------------------------------------------------------

const LS_KEY = 'rcre_ai_prefs'

/**
 * Reads preferences from localStorage (non-sensitive only).
 * API keys are never stored in localStorage — use cookies for that.
 */
export function readClientPrefs(): ClientAIConfig | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ClientAIConfig
  } catch {
    return null
  }
}

/**
 * Saves non-sensitive preferences to localStorage.
 * API keys are intentionally excluded.
 */
export function saveClientPrefs(prefs: Partial<ClientAIConfig>): void {
  if (typeof window === 'undefined') return

  const existing = readClientPrefs() ?? { provider: 'deterministic' as const }

  const toSave: ClientAIConfig = {
    ...existing,
    ...prefs,
    // Never store raw API key in localStorage
    cloud: prefs.cloud ? { ...prefs.cloud, apiKey: undefined } : existing.cloud,
  }

  localStorage.setItem(LS_KEY, JSON.stringify(toSave))
}

// ---------------------------------------------------------------------------
// Cloud config management
// ---------------------------------------------------------------------------

/**
 * Merges a cloud config input with defaults.
 * Validates the model is specified.
 */
export function buildCloudConfig(input: CloudConfigInput): CloudProviderConfig {
  return {
    provider: input.provider,
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    model: input.model || defaultModelFor(input.provider),
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  }
}

/**
 * Merges cookie config with existing AI config (from ai.ts store).
 * Cookie wins for cloud config; store wins for everything else.
 */
export async function mergeAIConfigs(
  storeConfig: {
    provider: 'deterministic' | 'ollama' | 'hermes'
    endpoint: string
    model: string
    sharing: boolean
    paused: boolean
    requestCap: number
  },
  cookieConfig?: StoredAIConfig | null
): Promise<FullAIConfig> {
  // Cookie takes precedence for cloud provider
  if (cookieConfig?.provider === 'cloud' && cookieConfig.cloud) {
    return {
      provider: 'cloud',
      cloud: cookieConfig.cloud,
      model: cookieConfig.cloud.model,
      temperature: cookieConfig.temperature,
      maxTokens: cookieConfig.maxTokens,
      sharing: cookieConfig.sharing ?? storeConfig.sharing,
      paused: cookieConfig.paused ?? storeConfig.paused,
      requestCap: cookieConfig.requestCap ?? storeConfig.requestCap,
      updatedAt: cookieConfig.updatedAt,
    }
  }

  return {
    provider: storeConfig.provider,
    model: storeConfig.model,
    sharing: storeConfig.sharing,
    paused: storeConfig.paused,
    requestCap: storeConfig.requestCap,
  }
}
