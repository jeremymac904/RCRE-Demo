-- Public delivery is limited to the headshot of an active, visible, published agent site.
-- The underlying object remains private in storage; this projection only yields its IDs.
create or replace function rcre_public_agent_headshot(p_organization_id uuid, p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select jsonb_build_object('memberId', u.id::text, 'assetId', mp.data->>'headshotAssetId')
    from rcre_domain_records mp
    join users u on u.organization_id=mp.organization_id and u.id=mp.record_id::uuid
    join rcre_domain_records site on site.organization_id=u.organization_id
      and site.collection='agent_websites' and site.record_id=u.id::text and site.owner_user_id=u.id
   where mp.organization_id=p_organization_id
     and mp.collection='member_profiles'
     and mp.data->>'websiteSlug'=p_slug
     and nullif(mp.data->>'headshotAssetId','') is not null
     and mp.data->'publicVisible'='true'::jsonb
     and site.data->>'published'='true'
     and site.data->>'slug'=p_slug
     and u.is_active=true
     and u.onboarding_status='active'
     and u.platform_role in ('agent','team_leader','managing_broker','broker_owner')
   limit 1;
$$;
revoke all on function rcre_public_agent_headshot(uuid,text) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then grant execute on function rcre_public_agent_headshot(uuid,text) to anon; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then grant execute on function rcre_public_agent_headshot(uuid,text) to authenticated; end if;
  if exists(select 1 from pg_roles where rolname='rcre_app') then grant execute on function rcre_public_agent_headshot(uuid,text) to rcre_app; end if;
end $$;
