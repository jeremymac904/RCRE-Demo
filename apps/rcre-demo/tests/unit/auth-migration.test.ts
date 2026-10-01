import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync('supabase/migrations/0005_identity_sessions_invitations.sql', 'utf8')
describe('durable authentication and invitation schema', () => {
  it('uses canonical users rather than introducing another person identity table', () => {
    expect(sql).toMatch(/alter table users add column if not exists platform_role/)
    expect(sql).not.toMatch(/create table if not exists (people|agents|persons)\s*\(/i)
    expect(sql).toMatch(/rcre_auth_identities[\s\S]*?user_id uuid not null references users\(id\)/)
  })
  it('stores only hashes for invitation and session bearer tokens', () => {
    expect(sql).toMatch(/token_hash char\(64\) not null unique/)
    expect(sql).not.toMatch(/(session_token|invite_token)\s+text/i)
    expect(sql).toMatch(/token_hash char\(64\) not null unique/)
  })
  it('forces RLS and explicit tenant predicates for every new auth table', () => {
    for (const table of ['rcre_auth_identities','rcre_auth_sessions','rcre_auth_invitations','rcre_auth_mail_outbox']) {
      expect(sql).toMatch(new RegExp(`alter table ${table} enable row level security`))
      expect(sql).toMatch(new RegExp(`alter table ${table} force row level security`))
      expect(sql).toMatch(new RegExp(`create policy \\w+ on ${table} for select[\\s\\S]*?rcre_current_org\\(\\)`))
    }
  })
  it('keeps mail payload ciphertext-only and supports bounded retry claims', () => {
    expect(sql).toMatch(/payload_ciphertext bytea not null/)
    expect(sql).toMatch(/payload_nonce bytea not null/)
    expect(sql).toMatch(/payload_tag bytea not null/)
    expect(sql).toMatch(/for update skip locked/)
    expect(sql).toMatch(/attempt_count<5/)
  })
  it('binds invitations to the verified email and single-use status during OIDC linking', () => {
    expect(sql).toMatch(/x\.token_hash\s*=\s*p_invite_hash[\s\S]*?x\.email\s*=\s*p_email[\s\S]*?x\.status='pending'[\s\S]*?x\.expires_at>now\(\)/)
    expect(sql).toMatch(/status='accepted',accepted_at=now\(\)/)
    expect(sql).toMatch(/rcre_auth_link_google/)
  })
})
