import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
const cookieState = vi.hoisted(() => ({ value: '' }))
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => cookieState.value ? { value: cookieState.value } : undefined }) }))
import { PgAuthPersistence } from '@/lib/auth/pg-persistence'
import { configureAuthPersistenceForTests } from '@/lib/auth/persistence'
import { actorOrNull } from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'

const org = '10000000-0000-4000-8000-000000000001'
const user = '20000000-0000-4000-8000-000000000001'
const other = '20000000-0000-4000-8000-000000000002'
const sessionId = '30000000-0000-4000-8000-000000000001'
const actor: PlatformActor = { id: user, userId: user, organizationId: org, role: 'agent', name: 'Agent', market: 'Florida', teamId: 'fl', officeId: 'fl' }

function authPool() {
  const queries: Array<{ sql: string; values: unknown[] }> = []
  const rows = [
    { id: sessionId, issued_at: '2026-09-29T10:00:00.000Z', expires_at: '2026-09-29T22:00:00.000Z', revoked_at: null, last_used_at: '2026-09-29T11:00:00.000Z', device_label: 'Current browser', user_id: user },
    { id: other, issued_at: '2026-09-28T10:00:00.000Z', expires_at: '2026-09-28T22:00:00.000Z', revoked_at: '2026-09-28T12:00:00.000Z', last_used_at: null, device_label: 'Old device', user_id: user },
    { id: '30000000-0000-4000-8000-000000000003', issued_at: '2026-09-29T10:00:00.000Z', expires_at: '2026-09-29T22:00:00.000Z', revoked_at: null, last_used_at: null, device_label: 'Other user device', user_id: other },
  ]
  const revoked = new Set<string>()
  let scopedUser = ''
  const client = {
    async query(sql: string, values: unknown[] = []) {
      queries.push({ sql, values })
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] }
      if (sql.includes('set_config')) { scopedUser = String(values[3] ?? ''); return { rows: [] } }
      if (sql.includes('rcre_auth_list_my_sessions')) return { rows: rows.filter(row => row.user_id === scopedUser) }
      if (sql.includes('rcre_auth_revoke_session_by_id')) {
        const id = String(values[0])
        const match = rows.find(row => row.id === id && row.user_id === scopedUser)
        if (!match || revoked.has(id)) return { rows: [{ revoked: false }] }
        revoked.add(id)
        return { rows: [{ revoked: true }] }
      }
      return { rows: [] }
    },
    release() {},
  }
  const pool = {
    async connect() { return client },
    async query(sql: string, values: unknown[] = []) {
      queries.push({ sql, values })
      if (sql.includes('rcre_auth_validate_session')) {
        return { rows: revoked.size ? [] : [{ session_id: sessionId, user_id: user, organization_id: org, platform_role: 'agent', full_name: 'Agent', office_id: 'fl', team_id: 'fl', market: 'Florida', expires_at: new Date('2026-09-29T22:00:00Z') }] }
      }
      return { rows: [] }
    },
  }
  return { pool, queries, revoked }
}

afterEach(() => { configureAuthPersistenceForTests(null); vi.unstubAllEnvs(); cookieState.value = '' })

describe('durable per-user session administration', () => {
  it('lists only the authenticated member’s PostgreSQL sessions with display-safe metadata', async () => {
    const fixture = authPool()
    const auth = new PgAuthPersistence(fixture.pool as never)
    const sessions = await auth.listSessions(actor)
    expect(sessions).toEqual([
      { id: sessionId, createdAt: '2026-09-29T10:00:00.000Z', expiresAt: Date.parse('2026-09-29T22:00:00.000Z'), revoked: false, lastUsedAt: '2026-09-29T11:00:00.000Z', deviceLabel: 'Current browser' },
      { id: other, createdAt: '2026-09-28T10:00:00.000Z', expiresAt: Date.parse('2026-09-28T22:00:00.000Z'), revoked: true, lastUsedAt: null, deviceLabel: 'Old device' },
    ])
    expect(fixture.queries.some(query => query.sql.includes('rcre_auth_list_my_sessions'))).toBe(true)
    expect(fixture.queries.find(query => query.sql.includes('set_config'))?.values).toContain(user)
  })

  it('revokes only the signed-in member’s selected session, invalidating a copied cookie on validation', async () => {
    const fixture = authPool()
    const auth = new PgAuthPersistence(fixture.pool as never)
    vi.stubEnv('NODE_ENV', 'production')
    configureAuthPersistenceForTests(auth)
    cookieState.value = 'copied-cookie-token'
    expect(await actorOrNull()).toMatchObject({ id: user })
    expect(await auth.revokeSessionById(actor, sessionId)).toBe(true)
    expect(await auth.revokeSessionById(actor, '30000000-0000-4000-8000-000000000003')).toBe(false)
    expect(fixture.revoked.has(sessionId)).toBe(true)
    // The copied bearer cookie remains present, but the durable validator rejects it.
    expect(cookieState.value).toBe('copied-cookie-token')
    expect(await actorOrNull()).toBeNull()
    expect(fixture.queries.some(query => query.sql.includes('rcre_auth_revoke_session_by_id'))).toBe(true)
  })

  it('defines narrowly scoped database functions and grants the app no direct session-table access', () => {
    const sql = readFileSync('supabase/migrations/0012_auth_session_management.sql', 'utf8')
    expect(sql).toMatch(/s\.organization_id=org and s\.user_id=actor/)
    expect(sql).toMatch(/s\.id=p_session_id and s\.organization_id=org and s\.user_id=actor/)
    expect(sql).toMatch(/revoke all on function rcre_auth_list_my_sessions\(\) from public/i)
    expect(sql).toMatch(/grant execute on function rcre_auth_revoke_session_by_id\(uuid\) to rcre_app/i)
    expect(sql).toMatch(/auth\.session_revoked/)
  })
})
