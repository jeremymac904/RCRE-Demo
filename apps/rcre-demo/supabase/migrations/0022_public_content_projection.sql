-- 0022 — tenant-scoped CMS editor access and a draft-free public projection.
-- Marketing Admin can collaborate on public content, but cannot mutate any
-- unrelated domain collection. Each editor write is still actor-scoped and
-- audited by the repository transaction.

drop policy if exists rcre_marketing_admin_public_content_select on rcre_domain_records;
create policy rcre_marketing_admin_public_content_select on rcre_domain_records
  for select using (
    organization_id = rcre_current_org()
    and collection = 'public_content'
    and rcre_current_role() = 'marketing_admin'
  );

drop policy if exists rcre_marketing_admin_public_content_insert on rcre_domain_records;
create policy rcre_marketing_admin_public_content_insert on rcre_domain_records
  for insert with check (
    organization_id = rcre_current_org()
    and collection = 'public_content'
    and rcre_current_role() = 'marketing_admin'
  );

drop policy if exists rcre_marketing_admin_public_content_update on rcre_domain_records;
create policy rcre_marketing_admin_public_content_update on rcre_domain_records
  for update using (
    organization_id = rcre_current_org()
    and collection = 'public_content'
    and rcre_current_role() = 'marketing_admin'
  ) with check (
    organization_id = rcre_current_org()
    and collection = 'public_content'
    and rcre_current_role() = 'marketing_admin'
  );

-- Public SSR must not impersonate an anonymous broker/owner. This fixed SQL
-- projection is callable only by the trusted server application role and emits
-- either published content (without editor history) or archived path metadata.
create or replace function rcre_public_content_projection(p_organization_id uuid, p_path text default null)
returns table(id text, status text, revision integer, published jsonb)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select d.record_id,
         d.data->>'status',
         case when coalesce(d.data->>'revision','') ~ '^[0-9]{1,9}$' then (d.data->>'revision')::integer else 0 end,
         case when d.data->>'status' = 'published'
                   and jsonb_typeof(d.data->'published') = 'object'
              then d.data->'published' else null end
    from public.rcre_domain_records d
   where p_organization_id is not null
     and (p_path is null or (left(p_path, 1) = '/' and length(p_path) <= 240 and d.record_id = p_path))
     and d.organization_id = p_organization_id
     and d.collection = 'public_content'
     and d.data->>'status' in ('published', 'archived')
     and (d.data->>'status' = 'archived' or jsonb_typeof(d.data->'published') = 'object');
$$;
revoke all on function rcre_public_content_projection(uuid, text) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='rcre_app') then grant execute on function rcre_public_content_projection(uuid, text) to rcre_app; end if;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function rcre_public_content_projection(uuid, text) to service_role; end if;
end $$;
