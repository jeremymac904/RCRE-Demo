import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrations = join(process.cwd(), 'supabase', 'migrations')
const fix = readFileSync(join(migrations, '0011_fix_session_rotation.sql'), 'utf8')

describe('forward-only session rotation repair', () => {
  it('ships after the existing auth migration without rewriting applied history', () => {
    const names = readdirSync(migrations).filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort()
    expect(names).toContain('0011_fix_session_rotation.sql')
    expect(names.at(-1)).toBe('0012_auth_session_management.sql')
    expect(fix).toMatch(/create or replace function rcre_auth_rotate_session\(p_old_hash char\(64\)/)
    expect(fix).toMatch(/language plpgsql security definer set search_path=public,pg_temp/)
  })

  it('validates the joined user alias, current account status, expiry and one-use rotation atomically', () => {
    const body = fix.match(/create or replace function rcre_auth_rotate_session[\s\S]*?end \$\$;/)?.[0] ?? ''
    expect(body).toMatch(/join users u on u\.id=old\.user_id and u\.organization_id=old\.organization_id/)
    expect(body).toMatch(/and u\.is_active and u\.onboarding_status='active'/)
    expect(body).toMatch(/for update of old,u/)
    expect(body).toMatch(/old\.revoked_at is null and old\.expires_at>now\(\)/)
    expect(body).toMatch(/p_expires_at<=now\(\).*p_expires_at>now\(\)\+interval '13 hours'/s)
    expect(body).toMatch(/update rcre_auth_sessions set revoked_at=now\(\)[\s\S]*?where id=old_session\.id and revoked_at is null/)
    expect(body).toMatch(/insert into rcre_auth_sessions\(token_hash,organization_id,user_id,expires_at,device_label,user_agent_hash,ip_hash\)/)
    expect(body).not.toMatch(/\bu\.is_active\b.*--/)
  })

  it('can be re-applied safely and keeps the existing callable signature', () => {
    expect(fix).toMatch(/CREATE OR REPLACE FUNCTION/i)
    expect(fix).not.toMatch(/drop function|drop table|alter table/i)
    expect(fix).toMatch(/rcre_auth_rotate_session\(p_old_hash char\(64\),p_new_hash char\(64\),p_expires_at timestamptz,p_device_label text,p_user_agent_hash char\(64\),p_ip_hash char\(64\)\)/)
  })
})
