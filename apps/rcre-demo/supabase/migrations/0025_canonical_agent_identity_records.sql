-- 0025 — enforce one canonical identity record per invited agent membership.
-- The canonical person lives in the existing durable domain-record boundary;
-- this does not create a second people table or touch CRM contacts.

create unique index if not exists rcre_canonical_people_org_slug_unique
  on rcre_domain_records (organization_id, (data->>'slug'))
  where collection = 'canonical_people' and nullif(data->>'slug', '') is not null;

create unique index if not exists rcre_canonical_people_org_user_unique
  on rcre_domain_records (organization_id, (data->>'userId'))
  where collection = 'canonical_people' and nullif(data->>'userId', '') is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'rcre_domain_records'::regclass
      and conname = 'rcre_canonical_people_identity_shape'
  ) then
    alter table rcre_domain_records
      add constraint rcre_canonical_people_identity_shape
      check (
        collection <> 'canonical_people'
        or (
          owner_user_id is not null
          and jsonb_typeof(data) = 'object'
          and nullif(data->>'slug', '') is not null
          and nullif(data->>'id', '') is not null
          and nullif(data->>'userId', '') is not null
          and nullif(data->>'organizationId', '') is not null
          and nullif(data->>'name', '') is not null
          and nullif(data->>'email', '') is not null
          and data->>'status' is not null
          and jsonb_typeof(data->'publicVisible') = 'boolean'
          and jsonb_typeof(data->'licenses') = 'array'
          and jsonb_typeof(data->'markets') = 'array'
          and jsonb_typeof(data->'specialties') = 'array'
          and jsonb_typeof(data->'socialLinks') = 'object'
          and record_id = data->>'slug'
          and data->>'id' = record_id
          and data->>'userId' = owner_user_id::text
          and data->>'organizationId' = organization_id::text
          and data->>'status' in ('pending_review', 'active', 'inactive')
        )
      ) not valid;
  end if;
end
$$;

alter table rcre_domain_records
  validate constraint rcre_canonical_people_identity_shape;

comment on index rcre_canonical_people_org_slug_unique is
  'Prevents duplicate canonical person slugs within an RCRE organization.';
comment on index rcre_canonical_people_org_user_unique is
  'Ensures an authenticated RCRE member maps to exactly one canonical person.';
