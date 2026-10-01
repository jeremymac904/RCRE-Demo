-- Public agent directory projection: preserve the existing verified static roster,
-- and admit newly onboarded identities only after approval and published-site gating.
create or replace function rcre_public_agent_profiles_v2(p_organization_id uuid)
returns table(verified_person_id text, profile jsonb, person jsonb, website_slug text)
language sql stable security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select mp.data->>'verifiedPersonId',
    jsonb_build_object(
      'publicVisible', true,
      'phone', coalesce(ov.data->>'phone', cp.data->>'phone', mp.data->>'phone', ''),
      'email', coalesce(ov.data->>'email', mp.data->>'publicEmail', cp.data->>'email', ''),
      'professionalTitle', coalesce(ov.data->>'publicTitle', cp.data->>'professionalTitle', mp.data->>'professionalTitle', ''),
      'licenses', coalesce(cp.data->'licenses', mp.data->'licenses', '[]'::jsonb),
      'markets', coalesce(cp.data->'markets', mp.data->'markets', '[]'::jsonb),
      'biography', coalesce(ov.data->>'bio', cp.data->>'biography', mp.data->>'biography', ''),
      'specialties', coalesce(ov.data->'specialties', cp.data->'specialties', mp.data->'specialties', '[]'::jsonb),
      'socialLinks', coalesce(ov.data->'socialLinks', cp.data->'socialLinks', mp.data->'socialLinks', '{}'::jsonb),
      'headshotAssetId', mp.data->>'headshotAssetId'
    ),
    case when cp.record_id is null then null else jsonb_build_object(
      'id', cp.data->>'id',
      'slug', cp.data->>'slug',
      'name', cp.data->>'name',
      'email', coalesce(ov.data->>'email', cp.data->>'email'),
      'phone', coalesce(ov.data->>'phone', cp.data->>'phone', ''),
      'professionalTitle', coalesce(ov.data->>'publicTitle', cp.data->>'professionalTitle', 'REALTOR®'),
      'biography', coalesce(ov.data->>'bio', cp.data->>'biography', ''),
      'markets', case when ov.data->>'market' = 'Alabama & Florida' then '["Alabama","Florida"]'::jsonb when ov.data ? 'market' then jsonb_build_array(ov.data->>'market') else coalesce(cp.data->'markets', '[]'::jsonb) end,
      'specialties', coalesce(ov.data->'specialties', cp.data->'specialties', '[]'::jsonb),
      'licenses', coalesce(cp.data->'licenses', '[]'::jsonb),
      'socialLinks', coalesce(cp.data->'socialLinks', '{}'::jsonb),
      'publicVisible', true
    ) end,
    case when cp.record_id is null then null else site.data->>'slug' end
  from rcre_domain_records mp
  join users u on u.organization_id = mp.organization_id
    and u.id::text = mp.record_id and mp.owner_user_id = u.id
  left join rcre_domain_records ov on ov.organization_id = mp.organization_id
    and ov.collection = 'agent_profile_overlays' and ov.record_id = mp.organization_id::text || ':' || (mp.data->>'verifiedPersonId')
  left join rcre_domain_records cp on cp.organization_id = u.organization_id
    and cp.collection = 'canonical_people'
    and cp.record_id = mp.data->>'verifiedPersonId'
    and cp.owner_user_id = u.id
    and cp.data->>'id' = cp.record_id
    and cp.data->>'slug' = cp.record_id
    and cp.data->>'userId' = u.id::text
    and cp.data->>'organizationId' = u.organization_id::text
  left join rcre_domain_records site on site.organization_id = u.organization_id
    and site.collection = 'agent_websites' and site.record_id = u.id::text and site.owner_user_id = u.id
  where mp.organization_id = p_organization_id
    and mp.collection = 'member_profiles'
    and nullif(mp.data->>'verifiedPersonId', '') is not null
    and coalesce(ov.data->'publicVisible', mp.data->'publicVisible') = 'true'::jsonb
    and u.is_active = true and u.onboarding_status = 'active'
    and u.platform_role in ('agent', 'team_leader', 'managing_broker', 'broker_owner')
    and (
      (
        cp.record_id is null
        and mp.data->>'verifiedPersonId' = any(array[
          'alex-verastegui','delonda-allen','johann-velez','julio-arango','margie-olsen-alvarez','molly-plude',
          'regiena-brown','rodrigo-tello-sanchez','sarah-brockner','taquilla-allen','urban-garrett','vito-lombardo'
        ]::text[])
      ) or (
        cp.record_id is not null
        and cp.data->>'status' = 'active'
        and cp.data->'publicVisible' = 'true'::jsonb
        and nullif(cp.data->>'name', '') is not null
        and nullif(cp.data->>'email', '') is not null
        and nullif(cp.data->>'biography', '') is not null
        and jsonb_array_length(coalesce(cp.data->'licenses', '[]'::jsonb)) > 0
        and (
          mp.data->>'verifiedPersonId' = any(array[
            'alex-verastegui','delonda-allen','johann-velez','julio-arango','margie-olsen-alvarez','molly-plude',
            'regiena-brown','rodrigo-tello-sanchez','sarah-brockner','taquilla-allen','urban-garrett','vito-lombardo'
          ]::text[])
          or (site.data->>'published' = 'true' and site.data->>'slug' = mp.data->>'websiteSlug' and nullif(mp.data->>'headshotAssetId', '') is not null)
        )
      )
    );
$$;
revoke all on function rcre_public_agent_profiles_v2(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then grant execute on function rcre_public_agent_profiles_v2(uuid) to anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function rcre_public_agent_profiles_v2(uuid) to authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then grant execute on function rcre_public_agent_profiles_v2(uuid) to rcre_app; end if;
end $$;

-- Keep public media delivery under the same approval and publication gates as
-- the directory projection. Dynamic sites must bind canonical identity to owner.
create or replace function rcre_public_agent_headshot(p_organization_id uuid, p_slug text)
returns jsonb language sql stable security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select jsonb_build_object('memberId', u.id::text, 'assetId', mp.data->>'headshotAssetId')
  from rcre_domain_records mp
  join users u on u.organization_id = mp.organization_id
    and u.id::text = mp.record_id and mp.owner_user_id = u.id
  left join rcre_domain_records cp on cp.organization_id = u.organization_id
    and cp.collection = 'canonical_people'
    and cp.record_id = mp.data->>'verifiedPersonId'
    and cp.owner_user_id = u.id
    and cp.data->>'id' = cp.record_id
    and cp.data->>'slug' = cp.record_id
    and cp.data->>'userId' = u.id::text
    and cp.data->>'organizationId' = u.organization_id::text
  join rcre_domain_records site on site.organization_id = u.organization_id
    and site.collection = 'agent_websites' and site.record_id = u.id::text and site.owner_user_id = u.id
  where mp.organization_id = p_organization_id
    and mp.collection = 'member_profiles'
    and mp.data->>'websiteSlug' = p_slug
    and site.data->>'slug' = p_slug
    and site.data->>'published' = 'true'
    and mp.data->'publicVisible' = 'true'::jsonb
    and nullif(mp.data->>'headshotAssetId', '') is not null
    and u.is_active = true and u.onboarding_status = 'active'
    and u.platform_role in ('agent', 'team_leader', 'managing_broker', 'broker_owner')
    and (
      (cp.record_id is null and mp.data->>'verifiedPersonId' = any(array[
        'alex-verastegui','delonda-allen','johann-velez','julio-arango','margie-olsen-alvarez','molly-plude',
        'regiena-brown','rodrigo-tello-sanchez','sarah-brockner','taquilla-allen','urban-garrett','vito-lombardo'
      ]::text[]))
      or (cp.record_id is not null and cp.data->>'status' = 'active' and cp.data->'publicVisible' = 'true'::jsonb)
    )
  limit 1;
$$;
revoke all on function rcre_public_agent_headshot(uuid, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then grant execute on function rcre_public_agent_headshot(uuid, text) to anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function rcre_public_agent_headshot(uuid, text) to authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then grant execute on function rcre_public_agent_headshot(uuid, text) to rcre_app; end if;
end $$;
