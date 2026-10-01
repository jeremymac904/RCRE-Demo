import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('public agent headshot delivery', () => {
  it('returns storage IDs only for an active published, publicly visible agent site', () => {
    const sql = readFileSync('supabase/migrations/0019_public_published_agent_headshots.sql', 'utf8')
    expect(sql).toMatch(/mp\.data->'publicVisible'='true'::jsonb/)
    expect(sql).toMatch(/site\.data->>'published'='true'/)
    expect(sql).toMatch(/u\.is_active=true/)
    expect(sql).toMatch(/u\.onboarding_status='active'/)
    expect(sql).toMatch(/'memberId', u\.id::text, 'assetId', mp\.data->>'headshotAssetId'/)
    expect(sql).toMatch(/grant execute on function rcre_public_agent_headshot\(uuid,text\) to anon/)
  })

  it('serves only the exact private headshot bound to the published site projection', () => {
    const route = readFileSync('src/app/api/public/agent-photo/[slug]/route.ts', 'utf8')
    expect(route).toMatch(/rcre_public_agent_headshot\(\$1::uuid,\$2::text\)/)
    expect(route).toMatch(/asset\.id === photo\.assetId && asset\.ownerId === photo\.memberId/)
    expect(route).toMatch(/asset\.category === 'agent-headshot'/)
    expect(route).not.toMatch(/request\.json|searchParams\.get\(['"]asset/i)
  })
})
