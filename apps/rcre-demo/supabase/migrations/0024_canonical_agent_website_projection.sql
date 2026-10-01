-- Public agent websites use canonical_people as the identity source for newly
-- onboarded agents. The twelve existing verified roster identities remain a
-- compatibility branch until their canonical domain records are provisioned.
create or replace function rcre_public_agent_website(p_organization_id uuid, p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select jsonb_build_object(
    'personSlug', mp.data->>'verifiedPersonId',
    'person', case when cp.record_id is null then jsonb_build_object('slug', mp.data->>'verifiedPersonId') else jsonb_build_object(
      'id', cp.data->>'id', 'slug', cp.data->>'slug', 'userId', cp.data->>'userId',
      'organizationId', cp.data->>'organizationId', 'name', cp.data->>'name', 'email', coalesce(mp.data->>'publicEmail', cp.data->>'email'),
      'phone', coalesce(cp.data->>'phone', ''),
      'professionalTitle', coalesce(cp.data->>'professionalTitle', 'REALTOR®'),
      'biography', coalesce(cp.data->>'biography', ''),
      'markets', coalesce(cp.data->'markets', '[]'::jsonb),
      'specialties', coalesce(cp.data->'specialties', '[]'::jsonb),
      'licenses', coalesce(cp.data->'licenses', '[]'::jsonb),
      'socialLinks', coalesce(cp.data->'socialLinks', '{}'::jsonb),
      'status', cp.data->>'status', 'publicVisible', true
    ) end,
    'headshotAssetId', mp.data->>'headshotAssetId',
    'profile', jsonb_build_object(
      'headshotAssetId', mp.data->>'headshotAssetId', 'publicVisible', true,
      'email', coalesce(mp.data->>'publicEmail', cp.data->>'email'),
      'professionalTitle', coalesce(mp.data->>'professionalTitle', ''),
      'licenses', coalesce(mp.data->'licenses', '[]'::jsonb),
      'markets', coalesce(mp.data->'markets', '[]'::jsonb),
      'specialties', coalesce(mp.data->'specialties', '[]'::jsonb),
      'biography', coalesce(mp.data->>'biography', ''),
      'socialLinks', coalesce(mp.data->'socialLinks', '{}'::jsonb)
    ),
    'website', jsonb_build_object(
      'slug', site.data->>'slug', 'theme', site.data->>'theme',
      'markets', coalesce(site.data->'markets', '[]'::jsonb),
      'specialties', coalesce(site.data->'specialties', '[]'::jsonb),
      'headline', coalesce(site.data->>'headline', ''), 'tagline', coalesce(site.data->>'tagline', ''),
      'heroImage', coalesce(site.data->>'heroImage', ''),
      'seoTitle', coalesce(site.data->>'seoTitle', ''),
      'seoDescription', coalesce(site.data->>'seoDescription', ''),
      'published', true, 'lastUpdated', site.updated_at, 'createdAt', site.created_at, 'completenessScore', 100
    )
  )
  from rcre_domain_records mp
  join users u on u.organization_id = mp.organization_id and u.id::text = mp.record_id and mp.owner_user_id = u.id
  left join rcre_domain_records cp on cp.organization_id = u.organization_id
       and cp.collection = 'canonical_people' and cp.record_id = mp.data->>'verifiedPersonId'
       and cp.owner_user_id = u.id and cp.data->>'id' = cp.record_id and cp.data->>'slug' = cp.record_id
       and cp.data->>'userId' = u.id::text and cp.data->>'organizationId' = u.organization_id::text
  join rcre_domain_records site on site.organization_id = u.organization_id
       and site.collection = 'agent_websites' and site.record_id = u.id::text and site.owner_user_id = u.id
  where mp.organization_id = p_organization_id and mp.collection = 'member_profiles'
    and mp.data->>'websiteSlug' = p_slug and nullif(mp.data->>'verifiedPersonId', '') is not null
    and mp.data->'publicVisible' = 'true'::jsonb
    and site.data->>'published' = 'true' and site.data->>'slug' = p_slug
    and u.is_active = true and u.onboarding_status = 'active'
    and u.platform_role in ('agent', 'team_leader', 'managing_broker', 'broker_owner')
    and (
      (cp.record_id is not null and cp.data->>'status' = 'active' and cp.data->'publicVisible' = 'true'::jsonb
        and nullif(cp.data->>'name', '') is not null and nullif(cp.data->>'email', '') is not null
        and jsonb_array_length(coalesce(cp.data->'licenses', '[]'::jsonb)) > 0
        and nullif(cp.data->>'biography', '') is not null and nullif(mp.data->>'headshotAssetId', '') is not null)
      or (cp.record_id is null and mp.data->>'verifiedPersonId' = any(array[
        'alex-verastegui','delonda-allen','johann-velez','julio-arango','margie-olsen-alvarez','molly-plude',
        'regiena-brown','rodrigo-tello-sanchez','sarah-brockner','taquilla-allen','urban-garrett','vito-lombardo'
      ]::text[]))
    )
  limit 1;
$$;

revoke all on function rcre_public_agent_website(uuid, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then grant execute on function rcre_public_agent_website(uuid, text) to anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function rcre_public_agent_website(uuid, text) to authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then grant execute on function rcre_public_agent_website(uuid, text) to rcre_app; end if;
end $$;
