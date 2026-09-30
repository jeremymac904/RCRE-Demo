-- 0006 — tenant-scoped JSONB bridge for incremental domain-service migration.
-- This is a durable repository primitive, not a claim that legacy SQLite
-- service callers have already migrated. Typed schemas remain authoritative
-- where present; new collections must still validate their own payload shape.

create table if not exists rcre_domain_records (
  organization_id uuid not null references organizations(id) on delete cascade,
  collection text not null check (collection ~ '^[A-Za-z][A-Za-z0-9_.-]{0,79}$'),
  record_id text not null check (length(record_id) between 1 and 200),
  owner_user_id uuid,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, collection, record_id),
  foreign key (organization_id, owner_user_id)
    references users(organization_id, id) on delete cascade
);

create index if not exists rcre_domain_records_owner_idx
  on rcre_domain_records(organization_id, owner_user_id, collection, updated_at desc);
create index if not exists rcre_domain_records_collection_idx
  on rcre_domain_records(organization_id, collection, updated_at desc, record_id);

alter table rcre_domain_records enable row level security;
alter table rcre_domain_records force row level security;

drop policy if exists rcre_domain_records_select on rcre_domain_records;
create policy rcre_domain_records_select on rcre_domain_records for select
  using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or owner_user_id in (select rcre_scoped_user_ids())
      or (owner_user_id is null and rcre_is_org_member())
    )
  );

drop policy if exists rcre_domain_records_insert on rcre_domain_records;
create policy rcre_domain_records_insert on rcre_domain_records for insert
  with check (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or owner_user_id in (select rcre_scoped_user_ids())
      or (owner_user_id is null and rcre_current_role() in ('owner', 'broker'))
    )
  );

drop policy if exists rcre_domain_records_update on rcre_domain_records;
create policy rcre_domain_records_update on rcre_domain_records for update
  using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or owner_user_id in (select rcre_scoped_user_ids())
    )
  )
  with check (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or owner_user_id in (select rcre_scoped_user_ids())
      or (owner_user_id is null and rcre_current_role() in ('owner', 'broker'))
    )
  );

drop policy if exists rcre_domain_records_delete on rcre_domain_records;
create policy rcre_domain_records_delete on rcre_domain_records for delete
  using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or owner_user_id in (select rcre_scoped_user_ids())
    )
  );

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then
    grant select, insert, update, delete on rcre_domain_records to rcre_app;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on rcre_domain_records to authenticated;
  end if;
end $$;
