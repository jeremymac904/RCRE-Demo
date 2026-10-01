-- 0023 — expose only lifecycle-approved canonical agent profiles to public routes.
-- Public profile content remains composed with the verified canonical roster in app code.

create or replace function rcre_public_agent_profiles(p_organization_id uuid)
returns table(verified_person_id text, profile jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select mp.data->>'verifiedPersonId', jsonb_build_object(
    'publicVisible', true,
    'phone', coalesce(mp.data->>'phone', ''),
    'professionalTitle', coalesce(mp.data->>'professionalTitle', ''),
    'licenses', coalesce(mp.data->'licenses', '[]'::jsonb),
    'markets', coalesce(mp.data->'markets', '[]'::jsonb),
    'biography', coalesce(mp.data->>'biography', ''),
    'specialties', coalesce(mp.data->'specialties', '[]'::jsonb),
    'socialLinks', coalesce(mp.data->'socialLinks', '{}'::jsonb)
  )
  from rcre_domain_records mp
  join users u on u.organization_id = mp.organization_id
       and u.id::text = mp.record_id
  where mp.organization_id = p_organization_id
    and mp.collection = 'member_profiles'
    and mp.data->>'publicVisible' = 'true'
    and nullif(mp.data->>'verifiedPersonId', '') is not null
    and u.is_active = true
    and u.onboarding_status = 'active'
    and u.platform_role in ('agent', 'team_leader', 'managing_broker', 'broker_owner');
$$;

revoke all on function rcre_public_agent_profiles(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function rcre_public_agent_profiles(uuid) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function rcre_public_agent_profiles(uuid) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then
    grant execute on function rcre_public_agent_profiles(uuid) to rcre_app;
  end if;
end $$;
