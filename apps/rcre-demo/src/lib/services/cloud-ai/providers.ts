/** RCRE cloud AI policy: the only permitted remote model is OpenRouter's free router. */
import type { PlatformRole } from '@/lib/platform/auth'

export type CloudProvider = 'openrouter'
export const OPENROUTER_FREE_MODEL = 'openrouter/free' as const
export const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1' as const

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
  /** Legacy inputs are retained only so strict runtime validation can reject them. */
  baseUrl?: string
  apiKey?: string
  model: string
  maxTokens?: number
  temperature?: number
}

export interface RCREProviderMeta {
  id: string
  label: string
  description: string
  capabilities: AIProviderCapabilities
  requiresCredentials: boolean
  requiresLocalRuntime: boolean
  cloudConfig?: CloudProviderConfig
}

const allRoles: PlatformRole[] = ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer']

const OPENROUTER_FREE: Omit<RCREProviderMeta, 'id' | 'cloudConfig'> = {
  label: 'OpenRouter Free',
  description: 'Free-model router only. Fixed model; no paid fallback.',
  requiresCredentials: true,
  requiresLocalRuntime: false,
  capabilities: { streaming: true, functionCalling: false, vision: false, maxContextTokens: 128000, costRank: 'free', recommendedFor: allRoles },
}

export const BUILTIN_PROVIDERS: RCREProviderMeta[] = [
  {
    id: 'deterministic', label: 'Deterministic (No AI)',
    description: 'Rule-based analysis over authorized records. No model inference.',
    requiresCredentials: false, requiresLocalRuntime: false,
    capabilities: { streaming: false, functionCalling: false, vision: false, maxContextTokens: 0, costRank: 'free', recommendedFor: allRoles },
  },
  {
    id: 'ollama', label: 'Local Ollama', description: 'Local inference on this machine.',
    requiresCredentials: false, requiresLocalRuntime: true,
    capabilities: { streaming: true, functionCalling: false, vision: false, maxContextTokens: 0, costRank: 'free', recommendedFor: ['agent', 'team_leader'] },
  },
  {
    id: 'hermes', label: 'RCRE Hermes Runtime', description: 'Isolated RCRE runtime.',
    requiresCredentials: false, requiresLocalRuntime: true,
    capabilities: { streaming: true, functionCalling: true, vision: false, maxContextTokens: 128000, costRank: 'free', recommendedFor: allRoles },
  },
]

export function listCloudProviders(): RCREProviderMeta[] {
  return [{ id: 'openrouter', ...OPENROUTER_FREE }]
}

export function listAllProviders(cloudConfig?: CloudProviderConfig): RCREProviderMeta[] {
  const cloud = listCloudProviders().map(p => ({ ...p, cloudConfig: p.id === cloudConfig?.provider ? cloudConfig : undefined }))
  return [...BUILTIN_PROVIDERS, ...cloud]
}

export function resolveProvider(id: string, cloudConfig?: CloudProviderConfig): RCREProviderMeta | null {
  const builtin = BUILTIN_PROVIDERS.find(p => p.id === id)
  if (builtin) return builtin
  if (id !== 'openrouter') return null
  return { id, ...OPENROUTER_FREE, cloudConfig: cloudConfig?.provider === id ? cloudConfig : undefined }
}

export function assertFreeOnlyConfig(config: CloudProviderConfig): void {
  if (config.provider !== 'openrouter') throw new Error('Only OpenRouter free-model routing is allowed')
  if (config.model !== OPENROUTER_FREE_MODEL) throw new Error('Only openrouter/free is allowed')
  if (config.baseUrl && config.baseUrl.replace(/\/$/, '') !== OPENROUTER_API_BASE) throw new Error('Custom AI endpoints are not allowed')
  if (config.apiKey) throw new Error('API keys must be configured server-side')
}

export function resolveEndpoint(config: CloudProviderConfig): string {
  assertFreeOnlyConfig(config)
  return OPENROUTER_API_BASE
}

export function defaultModelFor(provider: CloudProvider): string {
  if (provider !== 'openrouter') throw new Error('Only the free OpenRouter model is permitted')
  return OPENROUTER_FREE_MODEL
}

export function costRankLabel(rank: AIProviderCapabilities['costRank']): string {
  return { free: 'Free', low: 'Low cost', medium: 'Moderate', high: 'Expensive' }[rank]
}

export function authHeaderKey(provider: CloudProvider): string {
  if (provider !== 'openrouter') throw new Error('Cloud provider is not permitted')
  return 'Authorization'
}

export function authHeaderPrefix(provider: CloudProvider): string {
  if (provider !== 'openrouter') throw new Error('Cloud provider is not permitted')
  return 'Bearer '
}
