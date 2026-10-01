import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationDir = join(process.cwd(), 'supabase', 'migrations')
const read = (name: string) => readFileSync(join(migrationDir, name), 'utf8')

describe('production readiness repair migrations', () => {
  it('keeps migration versions unique and strictly ordered through the current repair set', () => {
    const migrations = readdirSync(migrationDir).filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort()
    const versions = migrations.map(name => Number(name.slice(0, 4)))
    expect(new Set(versions).size).toBe(versions.length)
    expect(versions).toEqual(Array.from({ length: versions.length }, (_, index) => index + 1))
    expect(migrations.slice(13)).toEqual([
      '0014_marketing_admin_read_scope.sql',
      '0015_community_published_interactions.sql',
      '0016_public_property_search_state.sql',
      '0017_managing_broker_role.sql',
      '0018_managing_broker_office_scope.sql',
      '0019_public_published_agent_headshots.sql',
      '0020_unique_member_canonical_person.sql',
      '0021_managing_broker_academy_assignment_guard.sql',
      '0022_public_content_projection.sql',
      '0023_public_agent_roster_projection.sql',
      '0024_canonical_agent_website_projection.sql',
      '0025_canonical_agent_identity_records.sql',
      '0026_canonical_public_agent_directory.sql',
    ])
  })


  it('limits anonymous roster reads to active public canonical profiles and returns only profile-safe fields', () => {
    const sql = read('0023_public_agent_roster_projection.sql')
    expect(sql).toMatch(/security\s+definer/i)
    expect(sql).toMatch(/set\s+search_path\s*=\s*public,\s*pg_temp/i)
    expect(sql).toMatch(/u\.id::text\s*=\s*mp\.record_id/i)
    expect(sql).not.toMatch(/u\.id\s*=\s*u\.id/i)
    expect(sql).toMatch(/u\.is_active\s*=\s*true/i)
    expect(sql).toMatch(/u\.onboarding_status\s*=\s*'active'/i)
    expect(sql).toMatch(/mp\.data->>'publicVisible'\s*=\s*'true'/i)
    expect(sql).toMatch(/u\.platform_role\s+in\s*\('agent',\s*'team_leader',\s*'managing_broker',\s*'broker_owner'\)/i)
    expect(sql).toMatch(/revoke\s+all\s+on\s+function/i)
    expect(sql).not.toMatch(/email|phone\s*,\s*email/i)
    const website = read('0010_agent_website_lifecycle.sql')
    expect(website).toMatch(/u\.id::text\s*=\s*mp\.record_id/i)
    expect(website).not.toMatch(/mp\.record_id::uuid/i)
  })

  it('constrains canonical agent identities to one org-scoped owner and stable slug', () => {
    const sql = read('0025_canonical_agent_identity_records.sql')
    expect(sql).toMatch(/create unique index if not exists rcre_canonical_people_org_slug_unique/i)
    expect(sql).toMatch(/create unique index if not exists rcre_canonical_people_org_user_unique/i)
    expect(sql).toMatch(/record_id\s*=\s*data->>'slug'/i)
    expect(sql).toMatch(/data->>'userId'\s*=\s*owner_user_id::text/i)
    expect(sql).toMatch(/data->>'organizationId'\s*=\s*organization_id::text/i)
    expect(sql).toMatch(/'pending_review',\s*'active',\s*'inactive'/i)
    expect(sql).toMatch(/validate constraint rcre_canonical_people_identity_shape/i)
    expect(sql).toMatch(/rcre_domain_records/i)
    expect(sql).not.toMatch(/create table/i)
  })

  it('projects durable public profile edits while retaining member and canonical identity gates', () => {
    const sql = read('0026_canonical_public_agent_directory.sql')
    expect(sql).toMatch(/collection = 'agent_profile_overlays'/)
    expect(sql).toMatch(/coalesce\(ov\.data->'publicVisible', mp\.data->'publicVisible'\)/)
    expect(sql).toMatch(/coalesce\(ov\.data->>'publicTitle'/)
    expect(sql).toMatch(/coalesce\(ov\.data->>'bio'/)
    expect(sql).toMatch(/coalesce\(ov\.data->>'email'/)
    expect(sql).toMatch(/mp\.owner_user_id = u\.id/)
    expect(sql).toMatch(/cp\.owner_user_id = u\.id/)
  })

  it('uses canonical approval and publication gates for dynamic public identities and headshots', () => {
    const sql = read('0026_canonical_public_agent_directory.sql')
    expect(sql).toMatch(/rcre_public_agent_profiles_v2/)
    expect(sql).toMatch(/cp\.data->>'status'\s*=\s*'active'/i)
    expect(sql).toMatch(/cp\.data->'publicVisible'\s*=\s*'true'::jsonb/i)
    expect(sql).toMatch(/site\.data->>'published'\s*=\s*'true'/i)
    expect(sql).toMatch(/rcre_public_agent_headshot/)
    expect(sql).toMatch(/cp\.owner_user_id\s*=\s*u\.id/i)
    expect(sql).toMatch(/cp\.data->>'organizationId'\s*=\s*u\.organization_id::text/i)
    expect(sql).not.toMatch(/lekeshia-jones/i)
    expect(sql).toMatch(/revoke all on function rcre_public_agent_profiles_v2/i)
    expect(sql).toMatch(/revoke all on function rcre_public_agent_headshot/i)
  })

  it('guards Managing Broker Academy assignment targets in PostgreSQL as well as the service', () => {
    const sql = read('0021_managing_broker_academy_assignment_guard.sql')
    expect(sql).toMatch(/security\s+definer/i)
    expect(sql).toMatch(/set\s+row_security\s*=\s*off/i)
    expect(sql).toMatch(/collection\s*<>\s*'academy_assignments'/i)
    expect(sql).toMatch(/target_type='office'\s+then\s+target_value=actor_office/i)
    expect(sql).toMatch(/target_type='team'\s+then\s+actor_team\s+is\s+not\s+null/i)
    expect(sql).toMatch(/target_type='agent'[\s\S]*?learner\.office_id=actor_office/i)
    expect(sql).toMatch(/learner\.is_active[\s\S]*?learner\.onboarding_status='active'/i)
    expect(sql).toMatch(/before\s+insert\s+or\s+update/i)
    expect(sql).toMatch(/function\s+rcre_guard_academy_publication/i)
    expect(sql).toMatch(/old\.data->>'state'\s+is\s+distinct\s+from\s+'review'/i)
    expect(sql).toMatch(/old\.data->>'status'\s+is\s+distinct\s+from\s+'review'/i)
    expect(sql).toMatch(/submitter=reviewer/i)
    expect(sql).toMatch(/reviewedBy/i)
    expect(sql).toMatch(/different\s+brokerage\s+leader\s+must\s+review/i)
    expect(sql).toMatch(/state'='review'[\s\S]*?submittedBy'[\s\S]*?current_user_id\(\)/i)
    expect(sql).toMatch(/ownerId'[\s\S]*?is\s+distinct\s+from\s+old\.data->>'ownerId'/i)
  })

  it('enforces one existing canonical-person link per organization without creating another people table', () => {
    const sql = read('0020_unique_member_canonical_person.sql')
    expect(sql).toMatch(/create unique index if not exists rcre_member_profile_verified_person_unique/i)
    expect(sql).toMatch(/on rcre_domain_records \(organization_id, \(data->>'verifiedPersonId'\)\)/)
    expect(sql).toMatch(/collection = 'member_profiles'/)
    expect(sql).toMatch(/nullif\(data->>'verifiedPersonId', ''\) is not null/)
    expect(sql).not.toMatch(/create table/i)
  })

  it('limits marketing administrator read scope to tenant campaign data and SELECT', () => {
    const sql = read('0014_marketing_admin_read_scope.sql')
    expect(sql).toMatch(/for\s+select/i)
    expect(sql).toMatch(/organization_id\s*=\s*rcre_current_org\(\)/)
    expect(sql).toMatch(/collection\s+in\s*\(\s*'marketing_campaigns',\s*'marketing_batches',\s*'marketing_schedule'\s*\)/)
    expect(sql).toMatch(/rcre_current_role\(\)\s*=\s*'marketing_admin'/)
    expect(sql).not.toMatch(/for\s+(insert|update|delete|all)/i)
  })

  it('shares only interactions under published community posts', () => {
    const sql = read('0015_community_published_interactions.sql')
    expect(sql).toMatch(/security\s+definer/i)
    expect(sql).toMatch(/set\s+search_path\s*=\s*pg_catalog,\s*public,\s*pg_temp/i)
    expect(sql).toMatch(/set\s+row_security\s*=\s*off/i)
    expect(sql).toMatch(/organization_id\s*=\s*rcre_current_org\(\)/)
    expect(sql).toMatch(/collection\s*=\s*'community_posts'/)
    expect(sql).toMatch(/owner_user_id\s+is\s+null/)
    expect(sql).toMatch(/collection\s+in\s*\(\s*'community_comments',\s*'community_reactions'\s*\)/)
    expect(sql).toMatch(/rcre_community_post_is_published\(data->>'postId'\)/)
    expect(sql).not.toMatch(/for\s+(insert|update|delete|all)/i)
  })

  it('keeps visitor search state anonymous, bounded, private, and alert-disabled', () => {
    const sql = read('0016_public_property_search_state.sql')
    expect(sql.match(/security\s+definer/gi)).toHaveLength(2)
    expect(sql).toMatch(/search_path\s*=\s*pg_catalog,\s*public/)
    expect(sql).toMatch(/p_subject_hash\s+!~\s*'\^\[a-f0-9\]\{64\}\$'/)
    expect(sql).toMatch(/jsonb_array_length\(p_favorites\)\s*>\s*100/)
    expect(sql).toMatch(/jsonb_array_length\(p_searches\)\s*>\s*50/)
    expect(sql).toMatch(/where organization_id\s*=\s*p_organization_id/)
    expect(sql).toMatch(/alerts_enabled,\s*notification_preference/)
    expect(sql).toMatch(/false,\s*'disabled'/)
    expect(sql).toMatch(/revoke all on function rcre_public_search_state_read[\s\S]*?from public/i)
    expect(sql).toMatch(/revoke all on function rcre_public_search_state_replace[\s\S]*?from public/i)
  })

  it('limits CMS editing to Marketing Admin and exposes only published content or archived path metadata', () => {
    const sql = read('0022_public_content_projection.sql')
    expect(sql).toMatch(/collection\s*=\s*'public_content'/i)
    expect(sql.match(/rcre_current_role\(\)\s*=\s*'marketing_admin'/gi)).toHaveLength(4)
    expect(sql).toMatch(/security\s+definer/i)
    expect(sql).toMatch(/set\s+search_path\s*=\s*pg_catalog,\s*public,\s*pg_temp/i)
    expect(sql).toMatch(/status'\s+in\s*\('published',\s*'archived'\)/i)
    expect(sql).toMatch(/case\s+when\s+d\.data->>'status'\s*=\s*'published'[\s\S]*?then\s+d\.data->'published'[\s\S]*?else\s+null/i)
    expect(sql).toMatch(/revoke\s+all\s+on\s+function\s+rcre_public_content_projection[\s\S]*?from\s+public/i)
    expect(sql).not.toMatch(/grant\s+execute\s+on\s+function\s+rcre_public_content_projection[^;]*\s+to\s+anon/i)
  })

})
