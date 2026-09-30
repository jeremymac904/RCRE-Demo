import type { PlatformActor } from '@/lib/platform/auth'

export type Fetcher = typeof fetch

export type WorkspaceService = 'gmail' | 'calendar' | 'drive'
export const WORKSPACE_SERVICES: readonly WorkspaceService[] = ['gmail', 'calendar', 'drive']
export interface EncryptedSecret { ciphertext: string; nonce: string; tag: string }
export interface StoredGoogleGrant {
  [key: string]: unknown
  service: WorkspaceService
  connectedEmail: string
  scopes: string[]
  refreshToken: EncryptedSecret
  connectedAt: string
  updatedAt: string
  state: 'connected' | 'reauth_required'
  lastError?: string
}
export interface WorkspaceGrantStore {
  get(actor: PlatformActor, service: WorkspaceService): Promise<StoredGoogleGrant | null>
  put(actor: PlatformActor, value: StoredGoogleGrant): Promise<void>
  remove(actor: PlatformActor, service: WorkspaceService): Promise<void>
}
export interface GoogleTokenSet { accessToken: string; refreshToken?: string; expiresIn: number; scopes: string[]; email: string }
export interface GoogleOAuthProvider {
  authorizationUrl(service: WorkspaceService, state: string, verifier: string): string
  exchange(code: string, verifier: string): Promise<GoogleTokenSet>
  refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string; scopes?: string[] }>
  revoke(refreshToken: string): Promise<boolean>
}
