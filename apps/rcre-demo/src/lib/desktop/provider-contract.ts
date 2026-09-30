/**
 * Shared contract for the optional Hermes Desktop surface (ADR-0009).
 *
 * The RCRE portal is primary. Provider authentication belongs to the official
 * desktop/provider login flow; RCRE must never read another application's
 * token files, accept copied CLI credentials, or treat an API key as a paid
 * subscription entitlement. This module is a contract only: it does not
 * connect to providers or claim that a desktop runtime is installed.
 */
export const DESKTOP_PROVIDER_IDS = ['openai-codex', 'claude-code', 'google-gemini'] as const
export type DesktopProviderId = typeof DESKTOP_PROVIDER_IDS[number]
export type DesktopProviderState = 'unavailable' | 'needs_login' | 'connected'
export type DesktopProviderLoginMode = 'official_account_authentication'

export interface DesktopProviderDescriptor {
  id: DesktopProviderId
  name: string
  state: DesktopProviderState
  loginMode: DesktopProviderLoginMode
  credentialOwner: 'provider-desktop-runtime'
  credentialStorage: 'operating-system-secure-storage'
  contextBoundary: 'rcre-mcp-scoped-tools'
  canSendCredentialsToRcreServer: false
  canUseApiKeyFallback: false
  availabilityReason?: string
}

export interface DesktopProviderConnection {
  providerId: DesktopProviderId
  state: Exclude<DesktopProviderState, 'unavailable'>
  accountLabel?: string
  connectedAt?: string
  /** Opaque handle resolved only by the provider desktop runtime. Never a token. */
  secureCredentialHandle?: string
}

/**
 * Implemented by a future supported Hermes Desktop plugin adapter.
 * The adapter exposes account status and an opaque OS-store handle only.
 */
export interface DesktopProviderAdapter {
  readonly providerId: DesktopProviderId
  getConnection(): Promise<DesktopProviderConnection | null>
  beginOfficialLogin(): Promise<{ authorizationUrl: string; state: string }>
  completeOfficialLogin(callbackUrl: string, state: string): Promise<DesktopProviderConnection>
  disconnect(): Promise<void>
}

const PROVIDER_NAMES: Record<DesktopProviderId, string> = {
  'openai-codex': 'OpenAI Codex',
  'claude-code': 'Claude Code',
  'google-gemini': 'Google Gemini',
}

/** Portal-safe default until the authorized desktop plugin source is integrated. */
export function desktopProviderCatalog(): DesktopProviderDescriptor[] {
  return DESKTOP_PROVIDER_IDS.map(id => ({
    id,
    name: PROVIDER_NAMES[id],
    state: 'unavailable',
    loginMode: 'official_account_authentication',
    credentialOwner: 'provider-desktop-runtime',
    credentialStorage: 'operating-system-secure-storage',
    contextBoundary: 'rcre-mcp-scoped-tools',
    canSendCredentialsToRcreServer: false,
    canUseApiKeyFallback: false,
    availabilityReason: 'The supported desktop connector source is not present in this repository.',
  }))
}

/** Runtime response validation prevents a plugin from smuggling secrets to RCRE. */
export function assertSafeDesktopConnection(value: unknown): asserts value is DesktopProviderConnection {
  if (!value || typeof value !== 'object') throw new Error('Invalid desktop provider status')
  const c = value as Record<string, unknown>
  if (!DESKTOP_PROVIDER_IDS.includes(c.providerId as DesktopProviderId)) throw new Error('Unsupported desktop provider')
  if (c.state !== 'connected' && c.state !== 'needs_login') throw new Error('Invalid desktop provider state')
  if ('accessToken' in c || 'refreshToken' in c || 'apiKey' in c || 'clientSecret' in c) {
    throw new Error('Provider credentials must remain in the desktop runtime secure store')
  }
  if (c.secureCredentialHandle !== undefined && (typeof c.secureCredentialHandle !== 'string' || c.secureCredentialHandle.length > 200)) {
    throw new Error('Invalid opaque credential handle')
  }
}
