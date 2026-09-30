-- 0010 — durable agent website lifecycle and safe published-site projection.
-- Website settings are stored with the existing tenant-scoped domain-record contract.
-- A public projection is exposed only for active, verified, visible, published members.

create unique index if not exists rcre_member_profile_website_slug_unique
  on rcre_domain_records (organization_id, (data->>'websiteSlug'))
  where collection = 'member_profiles' and nullif(data->>'websiteSlug', '') is not null;

create or replace function rcre_public_agent_website(p_organization_id uuid, p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'personSlug', mp.data->>'verifiedPersonId',
    'name', u.full_name,
    'email', u.email,
    'phone', coalesce(mp.data->>'phone', ''),
    'profile', jsonb_build_object(
      'professionalTitle', coalesce(mp.data->>'professionalTitle', ''),
      'licenses', coalesce(mp.data->'licenses', '[]'::jsonb),
      'markets', coalesce(mp.data->'markets', '[]'::jsonb),
      'specialties', coalesce(mp.data->'specialties', '[]'::jsonb),
      'biography', coalesce(mp.data->>'biography', ''),
      'socialLinks', coalesce(mp.data->'socialLinks', '{}'::jsonb)
    ),
    'website', jsonb_build_object(
      'slug', site.data->>'slug',
      'theme', site.data->>'theme',
      'markets', coalesce(site.data->'markets', '[]'::jsonb),
      'specialties', coalesce(site.data->'specialties', '[]'::jsonb),
      'headline', coalesce(site.data->>'headline', ''),
      'tagline', coalesce(site.data->>'tagline', ''),
      'heroImage', coalesce(site.data->>'heroImage', ''),
      'seoTitle', coalesce(site.data->>'seoTitle', ''),
      'seoDescription', coalesce(site.data->>'seoDescription', ''),
      'published', true,
      'lastUpdated', site.updated_at,
      'createdAt', site.created_at,
      'completenessScore', 100
    )
  )
  from rcre_domain_records mp
  join users u on u.organization_id = mp.organization_id and u.id = mp.record_id::uuid
  join rcre_domain_records site on site.organization_id = u.organization_id
       and site.collection = 'agent_websites' and site.record_id = u.id::text and site.owner_user_id = u.id
  where mp.organization_id = p_organization_id
    and mp.collection = 'member_profiles'
    and mp.data->>'websiteSlug' = p_slug
    and nullif(mp.data->>'verifiedPersonId', '') is not null
    and mp.data->'publicVisible' = 'true'::jsonb
    and site.data->>'published' = 'true'
    and site.data->>'slug' = p_slug
    and u.is_active = true
    and u.onboarding_status = 'active'
    and u.platform_role in ('agent', 'team_leader', 'managing_broker', 'broker_owner')
  limit 1;
$$;

revoke all on function rcre_public_agent_website(uuid, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function rcre_public_agent_website(uuid, text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function rcre_public_agent_website(uuid, text) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then
    grant execute on function rcre_public_agent_website(uuid, text) to rcre_app;
  end if;
end $$;
