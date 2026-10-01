import { describe, expect, it } from 'vitest'
import { PgAuthPersistence } from '@/lib/auth/pg-persistence'

describe('Postgres member canonical identity projection', () => {
  it('projects the leadership-verified member profile link under the caller RLS session', async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = []
    const fake = {
      async query(text: string, values?: unknown[]) {
        calls.push({ text, values })
        if (text.includes('rcre_auth_list_members')) return { rows: [{ user_id: '22222222-2222-4222-8222-222222222222', organization_id: '11111111-1111-4111-8111-111111111111', email: 'agent@example.test', full_name: 'Invited Realtor', platform_role: 'agent', is_active: true, onboarding_status: 'active', office_id: 'fl', team_id: 'fl', market: 'Florida', last_login_at: null }] }
        if (text.includes('from rcre_domain_records')) return { rows: [{ record_id: '22222222-2222-4222-8222-222222222222', canonical_person_id: 'sarah-brockner' }] }
        return { rows: [] }
      },
      release() {},
    }
    const pool = { connect: async () => fake } as never
    const persistence = new PgAuthPersistence(pool)
    const result = await persistence.listMembers({ id: '33333333-3333-4333-8333-333333333333', userId: '33333333-3333-4333-8333-333333333333', organizationId: '11111111-1111-4111-8111-111111111111', role: 'broker_owner' } as never)
    expect(result[0].canonicalPersonId).toBe('sarah-brockner')
    const profileQuery = calls.find(call => call.text.includes('from rcre_domain_records'))
    expect(profileQuery?.text).toContain("data->>'verifiedPersonId'")
    expect(profileQuery?.values).toEqual(['11111111-1111-4111-8111-111111111111', ['22222222-2222-4222-8222-222222222222']])
    expect(calls[0].text).toBe('begin')
    expect(calls.at(-1)?.text).toBe('commit')
  })
})
