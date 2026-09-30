import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { PlatformActor, PlatformRole } from '@/lib/platform/auth'

export interface AuthActorRow {
  id: string
  userId: string
  organizationId: string
  role: PlatformRole
  name: string
  market: string
  teamId: string
  officeId: string
  sessionId?: string
  expiresAt?: string
}

export interface MemberSummary { userId: string; organizationId: string; canonicalPersonId: string | null; email: string; name: string; platformRole: PlatformRole; active: boolean; accountStatus: string; officeId: string; teamId: string; market: string; lastLoginAt: string | null }

export interface AuthPersistence {
  linkGoogle(input: { email: string; subject: string; name: string; invitationTokenHash: string | null }): Promise<AuthActorRow | null>
  issueSession(input: { userId: string; tokenHash: string; expiresAt: Date; deviceLabel: string; userAgentHash: string; ipHash: string }): Promise<{ sessionId: string } | null>
  validateSession(tokenHash: string): Promise<AuthActorRow | null>
  revokeSession(tokenHash: string): Promise<boolean>
  rotateSession(input: { oldTokenHash: string; newTokenHash: string; expiresAt: Date; deviceLabel: string; userAgentHash: string; ipHash: string }): Promise<{ sessionId: string } | null>
  invitationStatus(tokenHash: string): Promise<{ valid: boolean; email: string; expiresAt: string; name: string } | null>
  listInvitations(actor: PlatformActor): Promise<Array<{ id: string; email: string; name: string; role: PlatformRole; status: string; createdAt: string; expiresAt: string; acceptedAt: string | null; mailStatus: string | null }>>
  createInvitation(actor: PlatformActor, input: { email: string; name: string; role: PlatformRole; officeId: string; teamId: string; market: string; tokenHash: string; expiresAt: Date; payload: EncryptedMailPayload; idempotencyKey: string }): Promise<{ invitationId: string; userId: string }>
  resendInvitation(actor: PlatformActor, invitationId: string, input: { tokenHash: string; expiresAt: Date; payload: EncryptedMailPayload; idempotencyKey: string }): Promise<boolean>
  cancelInvitation(actor: PlatformActor, invitationId: string): Promise<boolean>
  listMembers(actor: PlatformActor): Promise<MemberSummary[]>
  updateMember(actor: PlatformActor, userId: string, change: { role: PlatformRole; officeId: string; teamId: string; market: string; active: boolean }): Promise<boolean>
  revokeUserSessions(actor: PlatformActor, userId: string): Promise<number>
  claimMail(limit: number): Promise<Array<{ id: string; recipient: string; ciphertext: Buffer; nonce: Buffer; tag: Buffer; attemptCount: number }>>
  finishMail(id: string, result: { success: boolean; errorCode?: string; retryAt?: Date; providerMessageId?: string }): Promise<void>
}

export interface EncryptedMailPayload { ciphertext: Buffer; nonce: Buffer; tag: Buffer }

export function hashSecret(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function opaqueSecret(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

let configured: AuthPersistence | null = null
export function configureAuthPersistenceForTests(value: AuthPersistence | null): void { configured = value }

export async function getAuthPersistence(): Promise<AuthPersistence> {
  if (configured) return configured
  if (process.env.NODE_ENV !== 'production' && !(process.env.DATABASE_URL && process.env.RCRE_DATA_MODE === 'live')) throw new Error('Auth persistence is not configured; use the local auth adapter explicitly.')
  const { PgAuthPersistence } = await import('./pg-persistence')
  const { getPgPool } = await import('@/lib/db/pg')
  return new PgAuthPersistence(getPgPool())
}

export function platformActor(row: AuthActorRow): PlatformActor {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    role: row.role,
    name: row.name || 'RCRE member',
    market: row.market || 'Unknown',
    teamId: row.teamId || '',
    officeId: row.officeId || '',
  }
}
