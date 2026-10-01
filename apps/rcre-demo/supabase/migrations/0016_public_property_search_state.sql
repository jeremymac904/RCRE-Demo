-- 0016 — durable public consumer favorites and saved searches.
-- The application holds an opaque visitor bearer in an HttpOnly cookie and
-- passes only its server-HMAC subject hash to these restricted functions.
-- Anonymous database roles do not receive EXECUTE; calls stay server-side.

alter table saved_properties
  add column if not exists display_position smallint not null default 0;
alter table saved_searches
  add column if not exists display_position smallint not null default 0;

create index if not exists saved_properties_consumer_order_idx
  on saved_properties(organization_id, consumer_id, display_position, saved_at);
create index if not exists saved_searches_consumer_order_idx
  on saved_searches(organization_id, consumer_id, display_position, updated_at desc);

create or replace function rcre_public_search_state_read(p_organization_id uuid, p_subject_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_consumer_id uuid;
  v_favorites jsonb;
  v_searches jsonb;
begin
  if p_organization_id is null or p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid public search subject' using errcode = '22023';
  end if;

  select c.id into v_consumer_id
    from public.property_consumers c
   where c.organization_id = p_organization_id and c.subject_hash = p_subject_hash;
  if v_consumer_id is null then
    return jsonb_build_object('favorites', '[]'::jsonb, 'searches', '[]'::jsonb);
  end if;

  update public.property_consumers
     set last_seen_at = clock_timestamp()
   where organization_id = p_organization_id and id = v_consumer_id;

  select coalesce(jsonb_agg(sp.property_id::text order by sp.display_position, sp.saved_at), '[]'::jsonb)
    into v_favorites
    from public.saved_properties sp
   where sp.organization_id = p_organization_id and sp.consumer_id = v_consumer_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', ss.id::text,
           'name', ss.name,
           'filters', ss.query || jsonb_build_object('sort', ss.sort)
         ) order by ss.display_position, ss.created_at, ss.id), '[]'::jsonb)
    into v_searches
    from public.saved_searches ss
   where ss.organization_id = p_organization_id and ss.consumer_id = v_consumer_id;

  return jsonb_build_object('favorites', v_favorites, 'searches', v_searches);
end;
$function$;

create or replace function rcre_public_search_state_replace(
  p_organization_id uuid,
  p_subject_hash text,
  p_favorites jsonb,
  p_searches jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_consumer_id uuid;
  v_favorite_count integer;
  v_unique_favorite_count integer;
  v_search_count integer;
  v_unique_search_count integer;
  v_inserted_favorites integer;
begin
  if p_organization_id is null or p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$'
     or p_favorites is null or p_searches is null
     or jsonb_typeof(p_favorites) <> 'array' or jsonb_typeof(p_searches) <> 'array' then
    raise exception 'invalid public search state' using errcode = '22023';
  end if;
  if jsonb_array_length(p_favorites) > 100 or jsonb_array_length(p_searches) > 50 then
    raise exception 'public search state exceeds limits' using errcode = '22023';
  end if;

  select count(*) into v_favorite_count from jsonb_array_elements(p_favorites);
  select count(distinct value) into v_unique_favorite_count from jsonb_array_elements_text(p_favorites) as fav_items(value);
  if v_favorite_count <> v_unique_favorite_count then
    raise exception 'duplicate saved property' using errcode = '22023';
  end if;
  select count(*) into v_search_count from jsonb_array_elements(p_searches);
  select count(distinct value->>'id') into v_unique_search_count from jsonb_array_elements(p_searches) as searches(value);
  if v_search_count <> v_unique_search_count then
    raise exception 'duplicate saved search' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_searches) as searches(value)
     where coalesce(jsonb_typeof(value), '') <> 'object'
        or coalesce(jsonb_typeof(value->'id'), '') <> 'string'
        or coalesce(value->>'name', '') = ''
        or length(value->>'name') > 80
        or case when jsonb_typeof(value->'filters') = 'object' then
             jsonb_object_length(value->'filters') > 36
             or exists (
               select 1 from jsonb_each(value->'filters') filter_entry
                where filter_entry.key !~ '^[A-Za-z][A-Za-z0-9_]{0,31}$'
                   or jsonb_typeof(filter_entry.value) <> 'string'
                   or length(filter_entry.value #>> '{}') > 160
             )
           else true end
  ) then
    raise exception 'invalid saved search filter' using errcode = '22023';
  end if;

  -- Upsert locks this visitor row, serializing concurrent replacement requests.
  insert into public.property_consumers(organization_id, subject_hash, last_seen_at)
  values (p_organization_id, p_subject_hash, clock_timestamp())
  on conflict (organization_id, subject_hash) do update
    set last_seen_at = excluded.last_seen_at
  returning id into v_consumer_id;

  delete from public.saved_properties
   where organization_id = p_organization_id and consumer_id = v_consumer_id;
  delete from public.saved_searches
   where organization_id = p_organization_id and consumer_id = v_consumer_id;

  insert into public.saved_properties(organization_id, consumer_id, property_id, display_position, saved_at)
  select p_organization_id, v_consumer_id, item.value::uuid, (item.ordinality - 1)::smallint,
         clock_timestamp() + (item.ordinality * interval '1 microsecond')
    from jsonb_array_elements_text(p_favorites) with ordinality as item(value, ordinality)
   where exists (
     select 1 from public.properties property
      where property.organization_id = p_organization_id and property.id = item.value::uuid
   );
  get diagnostics v_inserted_favorites = row_count;
  if v_inserted_favorites <> v_favorite_count then
    raise exception 'one or more saved properties are unavailable' using errcode = '23503';
  end if;

  insert into public.saved_searches(organization_id, consumer_id, id, name, query, sort, display_position, alerts_enabled, notification_preference)
  select p_organization_id, v_consumer_id, (item.value->>'id')::uuid, item.value->>'name',
         item.value->'filters' - 'sort', item.value->'filters'->>'sort', (item.ordinality - 1)::smallint,
         false, 'disabled'
    from jsonb_array_elements(p_searches) with ordinality as item(value, ordinality);

  return rcre_public_search_state_read(p_organization_id, p_subject_hash);
end;
$function$;

revoke all on function rcre_public_search_state_read(uuid, text) from public;
revoke all on function rcre_public_search_state_replace(uuid, text, jsonb, jsonb) from public;
do $grant$
begin
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then
    grant execute on function rcre_public_search_state_read(uuid, text) to rcre_app;
    grant execute on function rcre_public_search_state_replace(uuid, text, jsonb, jsonb) to rcre_app;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function rcre_public_search_state_read(uuid, text) to service_role;
    grant execute on function rcre_public_search_state_replace(uuid, text, jsonb, jsonb) to service_role;
  end if;
end
$grant$;

comment on function rcre_public_search_state_read(uuid, text) is
  'Server-only access to opaque anonymous visitor favorites and saved searches; no raw token or consumer identity is returned.';
comment on function rcre_public_search_state_replace(uuid, text, jsonb, jsonb) is
  'Server-only atomic replacement of anonymous visitor search state. Property IDs must exist in the configured RCRE organization; alerts are forced disabled.';
