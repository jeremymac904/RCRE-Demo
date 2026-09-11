/**
 * Cloud AI Provider Registry
 * 
 * Provider-agnostic gateway supporting local and cloud LLM providers.
 * No inference cost by default — cloud providers require explicit user configuration.
 */

import type { PlatformRole } from '@/lib/platform/auth'

// ---------------------------------------------------------------------------
// Provider types
// ---------------------------------------------------------------------------

export type CloudProvider =
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'azure-openai'
  | 'groq'
  | 'deepseek'
  | 'ollama-remote'

// ---------------------------------------------------------------------------
// Provider capability declarations
// ---------------------------------------------------------------------------

export interface AIProviderCapabilities {
  streaming: boolean
  functionCalling: boolean
  vision: boolean
  maxContextTokens: number
  costRank: 'free' | 'low' | 'medium' | 'high'
  recommendedFor: PlatformRole[]
  notes?: string
}

export interface CloudProviderConfig {
  provider: CloudProvider
  baseUrl?: string // for self-hosted / proxy endpoints
  apiKey?: string  // encrypted/stored; never logged
  model: string
  maxTokens?: number
  temperature?: number
}

export interface RCREProviderMeta {
  id: string          // internal id for routing ('deterministic'|'ollama'|'hermes'|'cloud')
  label: string
  description: string
  capabilities: AIProviderCapabilities
  requiresCredentials: boolean
  requiresLocalRuntime: boolean
  cloudConfig?: CloudProviderConfig
}

// ---------------------------------------------------------------------------
// Provider catalog
// ---------------------------------------------------------------------------

const PROVIDER_CATALOG: Record<CloudProvider, Omit<RCREProviderMeta, 'id' | 'cloudConfig'>> = {
  openai: {
    label: 'OpenAI',
    description: 'GPT-4o and o-series models via OpenAI API',
    requiresCredentials: true,
    requiresLocalRuntime: false,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxContextTokens: 128000,
      costRank: 'high',
      recommendedFor: ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer'],
    },
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    description: 'Claude 3.5 Sonnet and Haiku via Anthropic API or OpenRouter',
    requiresCredentials: true,
    requiresLocalRuntime: false,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxContextTokens: 200000,
      costRank: 'high',
      recommendedFor: ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer'],
    },
  },
  openrouter: {
    label: 'OpenRouter',
    description: 'Unified access to 100+ models with unified OpenAI-compatible API',
    requiresCredentials: true,
    requiresLocalRuntime: false,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxContextTokens: 200000,
      costRank: 'medium', // varies by model
      recommendedFor: ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer'],
    },
  },
  'azure-openai': {
    label: 'Azure OpenAI',
    description: 'OpenAI models deployed on Azure with enterprise compliance',
    requiresCredentials: true,
    requiresLocalRuntime: false,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxContextTokens: 128000,
      costRank: 'high',
      recommendedFor: ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer'],
      notes: 'Requires Azure OpenAI resource and deployment name',
    },
  },
  groq: {
    label: 'Groq',
    description: 'Fast inference for Llama, Mistral, and Gemma models',
    requiresCredentials: true,
    requiresLocalRuntime: false,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      maxContextTokens: 32768,
      costRank: 'low',
      recommendedFor: ['agent', 'team_leader'],
    },
  },
  deepseek: {
    label: 'DeepSeek',
    description: 'DeepSeek V3 and Coder models via DeepSeek API or OpenRouter',
    requiresCredentials: true,
    requiresLocalRuntime: false,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      maxContextTokens: 64000,
      costRank: 'low',
      recommendedFor: ['agent', 'team_leader'],
      notes: 'Strong coding and reasoning; verify data residency',
    },
  },
  'ollama-remote': {
    label: 'Remote Ollama',
    description: 'Self-hosted Ollama accessible over HTTP (e.g. GPU server)',
    requiresCredentials: false,
    requiresLocalRuntime: false,
    capabilities: {
      streaming: true,
      functionCalling: false,
      vision: false,
      maxContextTokens: 0, // unknown; depends on model and hardware
      costRank: 'free',
      recommendedFor: ['agent', 'team_leader'],
      notes: 'Configure baseUrl to your remote Ollama endpoint',
    },
  },
}

// ---------------------------------------------------------------------------
// Built-in RCRE providers
// ---------------------------------------------------------------------------

export const BUILTIN_PROVIDERS: RCREProviderMeta[] = [
  {
    id: 'deterministic',
    label: 'Deterministic (No AI)',
    description: 'Rule-based analysis over your authorized records. No model inference. Zero cost.',
    requiresCredentials: false,
    requiresLocalRuntime: false,
    capabilities: {
      streaming: false,
      functionCalling: false,
      vision: false,
      maxContextTokens: 0,
      costRank: 'free',
      recommendedFor: ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer'],
    },
  },
  {
    id: 'ollama',
    label: 'Local Ollama',
    description: 'Ollama running on this machine. Fully offline. Free inference.',
    requiresCredentials: false,
    requiresLocalRuntime: true,
    capabilities: {
      streaming: true,
      functionCalling: false,
      vision: false,
      maxContextTokens: 0, // depends on model
      costRank: 'free',
      recommendedFor: ['agent', 'team_leader'],
      notes: 'Requires Ollama installed with models pulled',
    },
  },
  {
    id: 'hermes',
    label: 'RCRE Hermes Runtime',
    description: 'OS-isolated Hermes agent worker. Reasoning, drafting, coaching, approved tool use.',
    requiresCredentials: false,
    requiresLocalRuntime: true,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      maxContextTokens: 128000,
      costRank: 'free',
      recommendedFor: ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer'],
      notes: 'Start and verify the worker in the Assistant panel first',
    },
  },
]

// ---------------------------------------------------------------------------
// Catalog access
// ---------------------------------------------------------------------------

/**
 * Returns all available cloud providers in the catalog.
 */
export function listCloudProviders(): RCREProviderMeta[] {
  return Object.entries(PROVIDER_CATALOG).map(([provider, meta]) => ({
    id: provider,
    ...meta,
  }))
}

/**
 * Returns all providers (built-in + cloud), optionally with a resolved cloudConfig.
 */
export function listAllProviders(cloudConfig?: CloudProviderConfig): RCREProviderMeta[] {
  const cloud = listCloudProviders().map(p => ({
    ...p,
    cloudConfig: p.id === cloudConfig?.provider ? cloudConfig : undefined,
  }))
  return [...BUILTIN_PROVIDERS, ...cloud]
}

/**
 * Resolves a provider id to its meta entry.
 */
export function resolveProvider(id: string, cloudConfig?: CloudProviderConfig): RCREProviderMeta | null {
  const builtin = BUILTIN_PROVIDERS.find(p => p.id === id)
  if (builtin) return builtin

  const cloud = PROVIDER_CATALOG[id as CloudProvider]
  if (cloud) {
    return {
      id,
      ...cloud,
      cloudConfig: id === cloudConfig?.provider ? cloudConfig : undefined,
    }
  }

  return null
}

/**
 * Returns the OpenAI-compatible endpoint for a given cloud config.
 * Handles provider-specific URL conventions.
 */
export function resolveEndpoint(config: CloudProviderConfig): string {
  if (config.baseUrl) {
    // Strip trailing slash
    return config.baseUrl.replace(/\/$/, '')
  }

  switch (config.provider) {
    case 'openai':
      return 'https://api.openai.com/v1'
    case 'anthropic':
      // Anthropic uses a different API shape but is OpenAI-compatible via OpenRouter
      return 'https://api.anthropic.com/v1'
    case 'openrouter':
      return 'https://openrouter.ai/api/v1'
    case 'azure-openai':
      throw new Error(
        'Azure OpenAI requires a baseUrl in the format: https://{resource}.openai.azure.com/openai/deployments/{deployment}'
      )
    case 'groq':
      return 'https://api.groq.com/openai/v1'
    case 'deepseek':
      return 'https://api.deepseek.com/v1'
    case 'ollama-remote':
      return 'http://localhost:11434'
    default:
      throw new Error(`Unknown cloud provider: ${config.provider}`)
  }
}

/**
 * Returns the default model for a given cloud provider.
 * These are sensible defaults — the user should choose based on their needs.
 */
export function defaultModelFor(provider: CloudProvider): string {
  const defaults: Record<CloudProvider, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    openrouter: 'anthropic/claude-3.5-sonnet',
    'azure-openai': '', // deployment name must be provided
    groq: 'llama-3.3-70b-versatile',
    deepseek: 'deepseek-chat',
    'ollama-remote': '', // model must be pulled on the remote server
  }
  return defaults[provider]
}

/**
 * Returns a human-readable cost label for display.
 */
export function costRankLabel(rank: AIProviderCapabilities['costRank']): string {
  return { free: 'Free (self-hosted)', low: 'Low cost', medium: 'Moderate', high: 'Expensive' }[rank]
}

/**
 * Returns the provider's auth header key.
 * Most OpenAI-compatible providers use Bearer; Azure uses api-key.
 */
export function authHeaderKey(provider: CloudProvider): string {
  if (provider === 'azure-openai') return 'api-key'
  return 'Authorization'
}

/**
 * Returns the auth header value prefix for a provider.
 */
export function authHeaderPrefix(provider: CloudProvider): string {
  if (provider === 'azure-openai') return ''
  return 'Bearer '
}
