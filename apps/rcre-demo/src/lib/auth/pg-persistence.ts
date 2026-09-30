import 'server-only'
import type { Pool, PoolClient, QueryResultRow } from 'pg'
import { withRlsSession } from '@/lib/db/rls'
import type { Actor } from '@/lib/db/repository'
import type { AuthActorRow, AuthPersistence, AuthSessionSummary, EncryptedMailPayload, MemberSummary } from './persistence'
import type { PlatformActor, PlatformRole } from '@/lib/platform/auth'
import { repositoryRoleForPlatform } from './role-mapping'

type PgLike = Pick<Pool, 'query' | 'connect'>
type AuthRow = QueryResultRow & {
  id?: string; user_id?: string; organization_id?: string; platform_role?: PlatformRole; full_name?: string | null
  office_id?: string | null; team_id?: string | null; market?: string | null; session_id?: string; expires_at?: Date | string
}

function dbRole(role: PlatformRole): Actor['role'] { return repositoryRoleForPlatform(role) }

function actorFrom(row?: AuthRow): AuthActorRow | null {
  if (!row) return null
  const userId = String(row.user_id ?? row.id ?? '')
  const role = row.platform_role
  if (!userId || !row.organization_id || !role) return null
  return {
    id: userId,
    userId,
    organizationId: String(row.organization_id),
    role,
    name: row.full_name ?? 'RCRE member',
    market: row.market ?? 'Unknown',
    teamId: row.team_id ?? '',
    officeId: row.office_id ?? '',
    sessionId: row.session_id,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
  }
}

export class PgAuthPersistence implements AuthPersistence {
  constructor(private readonly pool: PgLike) {}

  async linkGoogle(input: { email: string; subject: string; name: string; invitationTokenHash: string | null }) {
    const result = await this.pool.query<AuthRow>(
      'select * from rcre_auth_link_google($1::citext,$2,$3,$4::char(64))',
      [input.email.trim().toLowerCase(), input.subject, input.name.slice(0, 200), input.invitationTokenHash],
    )
    return actorFrom(result.rows[0])
  }

  async issueSession(input: { userId: string; tokenHash: string; expiresAt: Date; deviceLabel: string; userAgentHash: string; ipHash: string }) {
    const result = await this.pool.query<AuthRow>(
      'select * from rcre_auth_issue_session($1::uuid,$2::char(64),$3::timestamptz,$4,$5::char(64),$6::char(64))',
      [input.userId, input.tokenHash, input.expiresAt, input.deviceLabel, input.userAgentHash, input.ipHash],
    )
    const row = result.rows[0]
    return row?.session_id ? { sessionId: row.session_id } : null
  }

  async validateSession(tokenHash: string) {
    const result = await this.pool.query<AuthRow>(
      'select * from rcre_auth_validate_session($1::char(64))', [tokenHash],
    )
    return actorFrom(result.rows[0])
  }

  async revokeSession(tokenHash: string) {
    const result = await this.pool.query<{ rcre_auth_revoke_session: boolean }>(
      'select rcre_auth_revoke_session($1::char(64))', [tokenHash],
    )
    return Boolean(result.rows[0]?.rcre_auth_revoke_session)
  }

  async listSessions(actor: PlatformActor): Promise<AuthSessionSummary[]> {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query(
        'select * from rcre_auth_list_my_sessions()', [],
      ) as { rows: Array<Record<string, unknown>> })
      return result.rows.map(row => ({ id: String(row.id), createdAt: new Date(String(row.issued_at)).toISOString(),
        expiresAt: new Date(String(row.expires_at)).getTime(), revoked: Boolean(row.revoked_at),
        lastUsedAt: row.last_used_at ? new Date(String(row.last_used_at)).toISOString() : null,
        deviceLabel: row.device_label ? String(row.device_label) : null }))
    } finally { client.release() }
  }

  async revokeSessionById(actor: PlatformActor, sessionId: string): Promise<boolean> {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query(
        'select rcre_auth_revoke_session_by_id($1::uuid) as revoked', [sessionId],
      ) as { rows: Array<{ revoked: boolean }> })
      return Boolean(result.rows[0]?.revoked)
    } finally { client.release() }
  }

  async rotateSession(input: { oldTokenHash: string; newTokenHash: string; expiresAt: Date; deviceLabel: string; userAgentHash: string; ipHash: string }) {
    const result = await this.pool.query<AuthRow>(
      'select * from rcre_auth_rotate_session($1::char(64),$2::char(64),$3::timestamptz,$4,$5::char(64),$6::char(64))',
      [input.oldTokenHash, input.newTokenHash, input.expiresAt, input.deviceLabel, input.userAgentHash, input.ipHash],
    )
    const row = result.rows[0]
    return row?.session_id ? { sessionId: row.session_id } : null
  }

  async invitationStatus(tokenHash: string) {
    const result = await this.pool.query<AuthRow & { valid: boolean; email: string; full_name: string }>(
      'select * from rcre_auth_invitation_status($1::char(64))', [tokenHash],
    )
    const row = result.rows[0]
    return row ? { valid: row.valid, email: row.email, expiresAt: new Date(row.expires_at!).toISOString(), name: row.full_name } : null
  }

  async createInvitation(actor: PlatformActor, input: { email: string; name: string; role: PlatformRole; officeId: string; teamId: string; market: string; tokenHash: string; expiresAt: Date; payload: EncryptedMailPayload; idempotencyKey: string }) {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query(
        'select * from rcre_auth_create_invitation($1::citext,$2,$3,$4,$5,$6,$7::char(64),$8::timestamptz,$9::bytea,$10::bytea,$11::bytea,$12)',
        [input.email.trim().toLowerCase(),input.name,input.role,input.officeId,input.teamId,input.market,input.tokenHash,input.expiresAt,input.payload.ciphertext,input.payload.nonce,input.payload.tag,input.idempotencyKey],
      ) as { rows: AuthRow[] })
      const row = result.rows[0]
      if (!row?.invitation_id || !row?.user_id) throw new Error('Invitation could not be created')
      return { invitationId: row.invitation_id, userId: row.user_id }
    } finally { client.release() }
  }


  async listInvitations(actor: PlatformActor) {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query('select * from rcre_auth_list_invitations()', []) as { rows: Array<Record<string, unknown>> })
      return result.rows.map(row => ({ id: String(row.id), email: String(row.email), name: String(row.full_name), role: String(row.platform_role) as PlatformRole,
        status: String(row.status), createdAt: new Date(String(row.created_at)).toISOString(), expiresAt: new Date(String(row.expires_at)).toISOString(),
        acceptedAt: row.accepted_at ? new Date(String(row.accepted_at)).toISOString() : null, mailStatus: row.mail_status ? String(row.mail_status) : null }))
    } finally { client.release() }
  }

  async resendInvitation(actor: PlatformActor, invitationId: string, input: { tokenHash: string; expiresAt: Date; payload: EncryptedMailPayload; idempotencyKey: string }) {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query(
        'select rcre_auth_resend_invitation($1::uuid,$2::char(64),$3::timestamptz,$4::bytea,$5::bytea,$6::bytea,$7) as resent',
        [invitationId,input.tokenHash,input.expiresAt,input.payload.ciphertext,input.payload.nonce,input.payload.tag,input.idempotencyKey],
      ) as { rows: Array<{ resent: boolean }> })
      return Boolean(result.rows[0]?.resent)
    } finally { client.release() }
  }



  async listMembers(actor: PlatformActor): Promise<MemberSummary[]> {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query('select * from rcre_auth_list_members()', []) as { rows: Array<Record<string, unknown>> })
      return result.rows.map(row => ({ userId: String(row.user_id), organizationId: String(row.organization_id), canonicalPersonId: null,
        email: String(row.email), name: String(row.full_name ?? ''), platformRole: String(row.platform_role) as PlatformRole,
        active: Boolean(row.is_active), accountStatus: String(row.onboarding_status), officeId: String(row.office_id ?? ''), teamId: String(row.team_id ?? ''),
        market: String(row.market ?? ''), lastLoginAt: row.last_login_at ? new Date(String(row.last_login_at)).toISOString() : null }))
    } finally { client.release() }
  }

  async updateMember(actor: PlatformActor, userId: string, change: { role: PlatformRole; officeId: string; teamId: string; market: string; active: boolean }): Promise<boolean> {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query(
        'select rcre_auth_update_member($1::uuid,$2,$3,$4,$5,$6) as updated',
        [userId,change.role,change.officeId,change.teamId,change.market,change.active],
      ) as { rows: Array<{ updated: boolean }> })
      return Boolean(result.rows[0]?.updated)
    } finally { client.release() }
  }

  async revokeUserSessions(actor: PlatformActor, userId: string): Promise<number> {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query(
        'select rcre_auth_revoke_user_sessions($1::uuid) as revoked', [userId],
      ) as { rows: Array<{ revoked: number | string }> })
      return Number(result.rows[0]?.revoked ?? 0)
    } finally { client.release() }
  }

  async claimMail(limit: number) {
    const result = await this.pool.query('select * from rcre_auth_claim_mail($1)', [Math.max(1, Math.min(50, Math.trunc(limit)))])
    return (result.rows as Array<Record<string, unknown>>).map(row => ({ id: String(row.id), recipient: String(row.recipient),
      ciphertext: Buffer.from(row.payload_ciphertext as Buffer), nonce: Buffer.from(row.payload_nonce as Buffer), tag: Buffer.from(row.payload_tag as Buffer), attemptCount: Number(row.attempt_count) }))
  }

  async finishMail(id: string, result: { success: boolean; errorCode?: string; retryAt?: Date; providerMessageId?: string }) {
    await this.pool.query('select rcre_auth_finish_mail($1::uuid,$2,$3,$4::timestamptz,$5)',
      [id,result.success,result.errorCode ?? null,result.retryAt ?? null,result.providerMessageId ?? null])
  }

  async cancelInvitation(actor: PlatformActor, invitationId: string) {
    const dbActor: Actor = { userId: actor.id, organizationId: actor.organizationId, role: dbRole(actor.role) }
    const client: PoolClient = await this.pool.connect()
    try {
      const result = await withRlsSession(client, dbActor, async scoped => await scoped.query(
        'select rcre_auth_cancel_invitation($1::uuid) as cancelled', [invitationId],
      ) as { rows: Array<{ cancelled: boolean }> })
      return Boolean(result.rows[0]?.cancelled)
    } finally { client.release() }
  }
}
