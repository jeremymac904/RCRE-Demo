-- Atomic shared rate limiting for stateless route handlers. Only HMAC client
-- fingerprints are stored. The table itself is not directly exposed to clients.
create table if not exists rcre_public_rate_limit_buckets (
  scope text not null check (scope in ('property_search', 'public_form', 'public_chat')),
  client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (scope, client_hash)
);
revoke all on rcre_public_rate_limit_buckets from public;

create or replace function rcre_consume_public_rate_limit(
  p_scope text,
  p_client_hash text,
  p_limit integer,
  p_window_seconds integer
) returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_window timestamptz;
  v_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_scope not in ('property_search', 'public_form', 'public_chat')
     or p_client_hash !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  v_window := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  insert into public.rcre_public_rate_limit_buckets(scope, client_hash, window_start, request_count, updated_at)
  values (p_scope, p_client_hash, v_window, 1, v_now)
  on conflict (scope, client_hash) do update
    set window_start = excluded.window_start,
        request_count = case
          when rcre_public_rate_limit_buckets.window_start = excluded.window_start
            then rcre_public_rate_limit_buckets.request_count + 1
          else 1
        end,
        updated_at = excluded.updated_at
  returning request_count into v_count;

  return query select
    v_count <= p_limit,
    greatest(0, p_limit - v_count),
    greatest(1, ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - v_now)))::integer);
end;
$$;
revoke all on function rcre_consume_public_rate_limit(text, text, integer, integer) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then
    grant execute on function rcre_consume_public_rate_limit(text, text, integer, integer) to rcre_app;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function rcre_consume_public_rate_limit(text, text, integer, integer) to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function rcre_consume_public_rate_limit(text, text, integer, integer) to authenticated;
  end if;
end $$;
