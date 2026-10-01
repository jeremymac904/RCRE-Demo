import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(fileURLToPath(new URL('../../supabase/migrations/0016_public_property_search_state.sql', import.meta.url)), 'utf8')

describe('anonymous property search state migration', () => {
  it('adds stable display ordering and tenant-scoped private state RPCs', () => {
    expect(migration).toContain('add column if not exists display_position')
    expect(migration).toContain('on saved_searches(organization_id, consumer_id, display_position, updated_at desc)')
    expect(migration).toContain('rcre_public_search_state_read')
    expect(migration).toContain('rcre_public_search_state_replace')
    expect(migration).toContain('where property.organization_id = p_organization_id and property.id = item.value::uuid')
    expect(migration).toContain('set last_seen_at = excluded.last_seen_at')
  })

  it('keeps SQL RPCs server-only and fixes alerts disabled in persisted rows', () => {
    expect(migration).toContain('revoke all on function rcre_public_search_state_read(uuid, text) from public')
    expect(migration).toContain('revoke all on function rcre_public_search_state_replace(uuid, text, jsonb, jsonb) from public')
    expect(migration).toContain('grant execute on function rcre_public_search_state_replace(uuid, text, jsonb, jsonb) to rcre_app')
    expect(migration).toContain('grant execute on function rcre_public_search_state_replace(uuid, text, jsonb, jsonb) to service_role')
    expect(migration).not.toMatch(/grant execute on function rcre_public_search_state_(?:read|replace)[^;]+ to (?:anon|authenticated)/i)
    expect(migration).toContain("false, 'disabled'")
  })

  it('bounds arrays and validates the opaque subject and property ownership', () => {
    expect(migration).toContain("p_subject_hash !~ '^[a-f0-9]{64}$'")
    expect(migration).toContain('jsonb_object_length(value->\'filters\') > 36')
    expect(migration).toContain('jsonb_array_length(p_favorites) > 100')
    expect(migration).toContain('jsonb_array_length(p_searches) > 50')
    expect(migration).toContain("raise exception 'one or more saved properties are unavailable'")
  })
})
