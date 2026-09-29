-- ===========================================================================
-- 0004 — MLS provider readiness and normalized RCRE property search
--
-- Additive only. This migration creates storage and tenant boundaries; it does
-- not connect or activate an MLS provider, import listings, or supply MLS
-- compliance terms. Compliance strings intentionally default to NULL and
-- providers remain unconfigured until agreements, credentials, mappings, and
-- exact provider requirements have been verified.
-- ===========================================================================

set check_function_bodies = off;
create extension if not exists pg_trgm;
create unique index if not exists users_org_id_uidx on users(organization_id, id);

-- The catalog is global descriptive metadata. Per-brokerage connection state,
-- capabilities, compliance and sync state are isolated in the tenant tables.
create table if not exists mls_provider_catalog (
  code                  text primary key,
  display_name          text not null,
  state_code            text not null,
  expected_access_paths text[] not null default '{}',
  created_at            timestamptz not null default now(),
  check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  check (state_code ~ '^[A-Z]{2}$')
);

insert into mls_provider_catalog (code, display_name, state_code, expected_access_paths)
values
  ('realmls_flexmls', 'realMLS / Flexmls', 'FL', array['Spark API', 'RESO Web API']),
  ('stellar_mls', 'Stellar MLS', 'FL', array['Bridge API', 'MLS Grid']),
  ('miami_realtors', 'MIAMI REALTORS', 'FL', array['TRESTLE', 'Bridge']),
  ('greater_alabama_mls', 'Greater Alabama MLS', 'AL', array['Paragon', 'OpenMLS', 'Approved RESO API'])
on conflict (code) do nothing;

-- One row per provider per organization. `status` is readiness state, never a
-- claim of a live feed. Secret values are not stored in this table.
create table if not exists mls_providers (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  provider_code         text not null references mls_provider_catalog(code),
  status                text not null default 'not_configured'
                        check (status in ('not_configured','waiting_for_agreement',
                          'waiting_for_credentials','ready_for_connection','connected',
                          'degraded','disabled')),
  connection_mode       text not null default 'live_query'
                        check (connection_mode in ('live_query','incremental_mirror','hybrid')),
  secret_configured     boolean not null default false,
  selected_access_path  text,
  credential_ref        text, -- secure-secret identifier only; never the secret
  last_connection_test_at timestamptz,
  last_connection_error text,
  activated_at          timestamptz,
  activated_by          uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id, provider_code),
  unique (organization_id, id),
  foreign key (organization_id, activated_by) references users(organization_id, id)
);
create index if not exists mls_providers_org_status_idx
  on mls_providers(organization_id, status, provider_code);

create table if not exists mls_provider_capabilities (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  provider_id           uuid not null,
  capability            text not null,
  supported             boolean, -- NULL means not discovered / unknown
  restrictions          jsonb not null default '{}'::jsonb,
  discovered_at         timestamptz,
  source_metadata       jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (organization_id, provider_id)
    references mls_providers(organization_id, id) on delete cascade,
  unique (organization_id, provider_id, capability),
  check (jsonb_typeof(restrictions) = 'object'),
  check (jsonb_typeof(source_metadata) = 'object')
);
create index if not exists mls_capabilities_lookup_idx
  on mls_provider_capabilities(organization_id, provider_id, supported);

-- Provider field mappings are versioned and tenant-scoped. The raw provider
-- field remains in property_sources.extensions even after mapping.
create table if not exists mls_provider_field_mappings (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  provider_id           uuid not null,
  source_field          text not null,
  normalized_field      text not null,
  transform_name        text,
  is_active             boolean not null default true,
  mapping_version       text not null,
  source_metadata       jsonb not null default '{}'::jsonb,
  verified_at           timestamptz,
  verified_by           uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  foreign key (organization_id, provider_id)
    references mls_providers(organization_id, id) on delete cascade,
  foreign key (organization_id, verified_by) references users(organization_id, id),
  unique (organization_id, provider_id, source_field, mapping_version),
  check (length(source_field) between 1 and 200),
  check (length(normalized_field) between 1 and 100),
  check (jsonb_typeof(source_metadata) = 'object')
);
create index if not exists mls_field_mappings_lookup_idx
  on mls_provider_field_mappings(organization_id, provider_id, is_active, mapping_version);

-- Exact licensed display terms are stored only once supplied and approved by
-- the relevant MLS. A provider cannot be made display-ready with blank terms.
create table if not exists mls_provider_compliance (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  provider_id           uuid not null,
  approval_state        text not null default 'pending_approval'
                        check (approval_state in ('pending_approval','approved','rejected')),
  provider_logo_asset   text,
  required_attribution  text,
  required_disclaimer   text,
  copyright_text        text,
  listing_brokerage_rules jsonb not null default '{}'::jsonb,
  refresh_requirements  jsonb not null default '{}'::jsonb,
  photo_rules           jsonb not null default '{}'::jsonb,
  permitted_statuses    text[] not null default '{}',
  sold_display_allowed  boolean,
  open_house_rules      jsonb not null default '{}'::jsonb,
  agent_site_display_allowed boolean,
  consumer_registration_required boolean,
  search_indexing_allowed boolean,
  approved_source       text,
  approved_at           timestamptz,
  approved_by           uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (organization_id, provider_id)
    references mls_providers(organization_id, id) on delete cascade,
  unique (organization_id, provider_id),
  foreign key (organization_id, approved_by) references users(organization_id, id),
  check (jsonb_typeof(listing_brokerage_rules) = 'object'),
  check (jsonb_typeof(refresh_requirements) = 'object'),
  check (jsonb_typeof(photo_rules) = 'object'),
  check (jsonb_typeof(open_house_rules) = 'object'),
  check (approval_state <> 'approved' or (
    nullif(btrim(required_attribution), '') is not null
    and nullif(btrim(required_disclaimer), '') is not null
    and nullif(btrim(copyright_text), '') is not null
    and approved_source is not null and approved_at is not null and approved_by is not null
  ))
);

create table if not exists mls_sync_state (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  provider_id           uuid not null,
  resource              text not null,
  checkpoint            jsonb not null default '{}'::jsonb,
  cursor_value          text,
  last_attempted_at     timestamptz,
  last_succeeded_at     timestamptz,
  last_source_modified_at timestamptz,
  records_seen          bigint not null default 0 check (records_seen >= 0),
  records_upserted      bigint not null default 0 check (records_upserted >= 0),
  records_deleted       bigint not null default 0 check (records_deleted >= 0),
  status                text not null default 'idle'
                        check (status in ('idle','running','complete','failed','paused')),
  last_error_code       text,
  last_error_summary    text,
  updated_at            timestamptz not null default now(),
  foreign key (organization_id, provider_id)
    references mls_providers(organization_id, id) on delete cascade,
  unique (organization_id, provider_id, resource),
  check (jsonb_typeof(checkpoint) = 'object')
);
create index if not exists mls_sync_state_due_idx
  on mls_sync_state(organization_id, status, last_succeeded_at);

-- One normalized listing per provider identity. Provider-specific payloads are
-- retained in property_sources.extensions, rather than leaking into the
-- common normalized column set. Physical-address dedupe is deliberately not
-- automatic: duplicate listings remain distinct until safely reviewed.
create table if not exists properties (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  provider_id           uuid not null,
  provider_listing_id   text not null,
  listing_key           text,
  listing_key_numeric   bigint,
  mls_number            text,
  property_type         text,
  property_subtype      text,
  standard_status       text,
  local_status          text,
  list_price            numeric(14,2),
  original_list_price   numeric(14,2),
  close_price           numeric(14,2),
  bedrooms              numeric(5,2),
  bathrooms_full        smallint,
  bathrooms_half        smallint,
  bathrooms_total       numeric(5,2),
  living_area           numeric(12,2),
  lot_size              numeric(14,2),
  lot_size_unit         text,
  lot_acres             numeric(12,4),
  living_area_unit      text,
  year_built            smallint,
  stories               numeric(5,2),
  garage_spaces         numeric(5,2),
  parking                jsonb not null default '{}'::jsonb,
  street_number         text,
  street_name           text,
  unit                  text,
  city                  text,
  county                text,
  state_code            text,
  postal_code           text,
  subdivision           text,
  latitude              double precision,
  longitude             double precision,
  public_remarks        text,
  directions            text,
  school_district       text,
  elementary_school     text,
  middle_school         text,
  high_school           text,
  waterfront            boolean,
  pool                  boolean,
  new_construction      boolean,
  association_name      text,
  association_fee       numeric(12,2),
  tax_amount            numeric(14,2),
  parcel_id             text,
  listing_at            timestamptz,
  modified_at           timestamptz,
  pending_at            timestamptz,
  closed_at             timestamptz,
  days_on_market        integer,
  cumulative_days_on_market integer,
  virtual_tour_url      text,
  listing_office_name   text,
  listing_office_id     text,
  listing_agent_name    text,
  listing_agent_id      text,
  buyer_office_name     text,
  buyer_office_id       text,
  buyer_agent_name      text,
  buyer_agent_id        text,
  primary_photo_url     text,
  photo_count           integer,
  data_freshness_at     timestamptz,
  source_updated_at     timestamptz,
  source_attribution    text,
  required_disclaimer   text,
  is_fixture            boolean not null default false,
  withdrawn_at          timestamptz,
  raw_field_map_version text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (organization_id, provider_id)
    references mls_providers(organization_id, id) on delete restrict,
  unique (organization_id, id),
  unique (organization_id, provider_id, provider_listing_id),
  check (state_code is null or state_code ~ '^[A-Z]{2}$'),
  check (bedrooms is null or bedrooms >= 0),
  check (bathrooms_full is null or bathrooms_full >= 0),
  check (bathrooms_half is null or bathrooms_half >= 0),
  check (living_area is null or living_area >= 0),
  check (lot_size is null or lot_size >= 0),
  check (lot_acres is null or lot_acres >= 0),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180),
  check (photo_count is null or photo_count >= 0),
  check (days_on_market is null or days_on_market >= 0),
  check (cumulative_days_on_market is null or cumulative_days_on_market >= 0),
  check (jsonb_typeof(parking) = 'object')
);
create index if not exists properties_org_state_city_idx
  on properties(organization_id, state_code, city);
create index if not exists properties_org_postal_idx
  on properties(organization_id, postal_code);
create index if not exists properties_org_county_idx
  on properties(organization_id, county);
create index if not exists properties_org_subdivision_idx
  on properties(organization_id, subdivision);
create index if not exists properties_org_status_price_idx
  on properties(organization_id, standard_status, list_price);
create index if not exists properties_org_beds_baths_idx
  on properties(organization_id, bedrooms, bathrooms_total);
create index if not exists properties_org_type_idx
  on properties(organization_id, property_type, property_subtype);
create index if not exists properties_org_modified_idx
  on properties(organization_id, modified_at desc);
create index if not exists properties_org_provider_listing_idx
  on properties(organization_id, provider_id, provider_listing_id);
create index if not exists properties_org_map_latlon_idx
  on properties(organization_id, latitude, longitude)
  where latitude is not null and longitude is not null;
create index if not exists properties_search_location_trgm_idx
  on properties using gin ((coalesce(street_number, '') || ' ' || coalesce(street_name, '') || ' ' ||
    coalesce(city, '') || ' ' || coalesce(county, '') || ' ' || coalesce(postal_code, '') || ' ' ||
    coalesce(subdivision, '') || ' ' || coalesce(mls_number, '')) gin_trgm_ops);

create table if not exists property_sources (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  property_id           uuid not null,
  provider_id           uuid not null,
  provider_listing_id   text not null,
  listing_key           text,
  mls_number            text,
  source_updated_at     timestamptz,
  observed_at           timestamptz not null default now(),
  extensions            jsonb not null default '{}'::jsonb,
  mapping_version       text,
  created_at            timestamptz not null default now(),
  foreign key (organization_id, property_id)
    references properties(organization_id, id) on delete cascade,
  foreign key (organization_id, provider_id)
    references mls_providers(organization_id, id) on delete restrict,
  unique (organization_id, provider_id, provider_listing_id),
  check (jsonb_typeof(extensions) = 'object')
);
create index if not exists property_sources_property_idx
  on property_sources(organization_id, property_id);
create index if not exists property_sources_provider_modified_idx
  on property_sources(organization_id, provider_id, source_updated_at desc);

create table if not exists property_media (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  property_id           uuid not null,
  source_id             uuid,
  provider_media_id     text,
  media_type            text not null default 'photo'
                        check (media_type in ('photo','virtual_tour','document','other')),
  source_url            text,
  permitted_local_url   text,
  handling_mode         text not null default 'remote_provider'
                        check (handling_mode in ('remote_provider','permitted_cached','permitted_local_derivative')),
  sort_order            integer not null default 0,
  is_primary            boolean not null default false,
  caption               text,
  width                 integer,
  height                integer,
  source_updated_at     timestamptz,
  created_at            timestamptz not null default now(),
  foreign key (organization_id, property_id)
    references properties(organization_id, id) on delete cascade,
  foreign key (organization_id, source_id)
    references property_sources(organization_id, id) on delete cascade,
  check (sort_order >= 0),
  check (width is null or width > 0),
  check (height is null or height > 0),
  check ((handling_mode = 'remote_provider' and source_url is not null)
      or (handling_mode <> 'remote_provider' and permitted_local_url is not null))
);
create index if not exists property_media_order_idx
  on property_media(organization_id, property_id, sort_order);
create unique index if not exists property_media_primary_uidx
  on property_media(organization_id, property_id) where is_primary = true;

create table if not exists property_open_houses (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  property_id           uuid not null,
  provider_event_id     text,
  starts_at             timestamptz not null,
  ends_at               timestamptz,
  timezone_name         text,
  description           text,
  source_updated_at     timestamptz,
  created_at            timestamptz not null default now(),
  foreign key (organization_id, property_id)
    references properties(organization_id, id) on delete cascade,
  check (ends_at is null or ends_at >= starts_at),
  unique (organization_id, property_id, provider_event_id)
);
create index if not exists property_open_houses_upcoming_idx
  on property_open_houses(organization_id, starts_at, property_id);

-- Anonymous browser state is represented by an opaque hashed subject, separate
-- from RCRE users/people. Hash generation and rotation stay in the server.
create table if not exists property_consumers (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  subject_hash          text not null,
  created_at            timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  unique (organization_id, subject_hash),
  unique (organization_id, id)
);
create index if not exists property_consumers_last_seen_idx
  on property_consumers(organization_id, last_seen_at desc);

create table if not exists saved_properties (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  consumer_id           uuid not null,
  property_id           uuid not null,
  agent_user_id         uuid,
  saved_at              timestamptz not null default now(),
  foreign key (organization_id, consumer_id)
    references property_consumers(organization_id, id) on delete cascade,
  foreign key (organization_id, property_id)
    references properties(organization_id, id) on delete cascade,
  unique (organization_id, consumer_id, property_id),
  foreign key (organization_id, agent_user_id) references users(organization_id, id)
);
create index if not exists saved_properties_consumer_idx
  on saved_properties(organization_id, consumer_id, saved_at desc);
create index if not exists saved_properties_property_idx
  on saved_properties(organization_id, property_id);

create table if not exists saved_searches (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  consumer_id           uuid not null,
  name                  text,
  query                 jsonb not null default '{}'::jsonb,
  sort                  text,
  map_bounds            jsonb,
  agent_user_id         uuid,
  notification_preference text not null default 'disabled'
                        check (notification_preference in ('disabled','new_listings','price_changes',
                          'status_changes','open_houses')),
  alerts_enabled        boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (organization_id, consumer_id)
    references property_consumers(organization_id, id) on delete cascade,
  check (jsonb_typeof(query) = 'object'),
  check (map_bounds is null or jsonb_typeof(map_bounds) = 'object'),
  check (alerts_enabled = false), -- external alerts remain disabled pending approval
  unique (organization_id, id),
  foreign key (organization_id, agent_user_id) references users(organization_id, id)
);
create index if not exists saved_searches_consumer_idx
  on saved_searches(organization_id, consumer_id, updated_at desc);

create table if not exists property_inquiries (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  property_id           uuid,
  consumer_id           uuid,
  agent_user_id         uuid,
  inquiry_type          text not null
                        check (inquiry_type in ('question','showing_request','information_request','contact_agent')),
  name                  text,
  email                 citext,
  phone                 text,
  message               text,
  idempotency_key       text,
  provider_code         text,
  provider_listing_id   text,
  mls_number            text,
  property_address      text,
  landing_page          text,
  lead_source           text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  referrer              text,
  captured_at           timestamptz not null default now(),
  processing_status     text not null default 'received'
                        check (processing_status in ('received','routed','failed','duplicate')),
  created_at            timestamptz not null default now(),
  foreign key (organization_id, property_id)
    references properties(organization_id, id),
  foreign key (organization_id, consumer_id)
    references property_consumers(organization_id, id),
  foreign key (organization_id, agent_user_id) references users(organization_id, id),
  foreign key (provider_code) references mls_provider_catalog(code),
  check (message is null or length(message) <= 4000),
  check (property_address is null or length(property_address) <= 500)
);
create index if not exists property_inquiries_org_captured_idx
  on property_inquiries(organization_id, captured_at desc);
create index if not exists property_inquiries_agent_idx
  on property_inquiries(organization_id, agent_user_id, captured_at desc);
create index if not exists property_inquiries_property_idx
  on property_inquiries(organization_id, property_id, captured_at desc);
create unique index if not exists property_inquiries_idempotency_uidx
  on property_inquiries(organization_id, idempotency_key)
  where idempotency_key is not null;

-- Shared updated_at trigger function was introduced in 0001.
do $$
declare t text;
begin
  foreach t in array array['mls_provider_catalog','mls_providers','mls_provider_capabilities',
                           'mls_provider_compliance','mls_provider_field_mappings','mls_sync_state','properties',
                           'saved_searches']
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on %I;
       create trigger %I_set_updated_at before update on %I
       for each row execute function set_updated_at();', t, t, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security: no user context means no property data. Consumer state
-- is deliberately only accessible via a trusted server path and is never
-- visible to ordinary authenticated brokerage users.
-- ---------------------------------------------------------------------------
alter table mls_provider_catalog enable row level security;
alter table mls_provider_catalog force row level security;
alter table mls_providers enable row level security;
alter table mls_providers force row level security;
alter table mls_provider_capabilities enable row level security;
alter table mls_provider_capabilities force row level security;
alter table mls_provider_compliance enable row level security;
alter table mls_provider_compliance force row level security;
alter table mls_provider_field_mappings enable row level security;
alter table mls_provider_field_mappings force row level security;
alter table mls_sync_state enable row level security;
alter table mls_sync_state force row level security;
alter table properties enable row level security;
alter table properties force row level security;
alter table property_sources enable row level security;
alter table property_sources force row level security;
alter table property_media enable row level security;
alter table property_media force row level security;
alter table property_open_houses enable row level security;
alter table property_open_houses force row level security;
alter table property_consumers enable row level security;
alter table property_consumers force row level security;
alter table saved_properties enable row level security;
alter table saved_properties force row level security;
alter table saved_searches enable row level security;
alter table saved_searches force row level security;
alter table property_inquiries enable row level security;
alter table property_inquiries force row level security;

-- The global provider catalog is read-only metadata; readers still need a valid RCRE organization context.
create policy mls_provider_catalog_select on mls_provider_catalog for select
  using (exists (select 1 from organizations o where o.id = rcre_current_org()));

-- Tenant members can see provider readiness; configuration remains broker-only.
create policy mls_providers_select on mls_providers for select
  using (organization_id = rcre_current_org() and rcre_is_org_member());
create policy mls_providers_insert on mls_providers for insert
  with check (organization_id = rcre_current_org() and rcre_is_broker());
create policy mls_providers_update on mls_providers for update
  using (organization_id = rcre_current_org() and rcre_is_broker())
  with check (organization_id = rcre_current_org() and rcre_is_broker());

create policy mls_capabilities_select on mls_provider_capabilities for select
  using (organization_id = rcre_current_org() and rcre_is_org_member());
create policy mls_capabilities_insert on mls_provider_capabilities for insert
  with check (organization_id = rcre_current_org() and rcre_is_broker());
create policy mls_capabilities_update on mls_provider_capabilities for update
  using (organization_id = rcre_current_org() and rcre_is_broker())
  with check (organization_id = rcre_current_org() and rcre_is_broker());

create policy mls_compliance_select on mls_provider_compliance for select
  using (organization_id = rcre_current_org() and rcre_is_org_member());
create policy mls_compliance_insert on mls_provider_compliance for insert
  with check (organization_id = rcre_current_org() and rcre_is_broker());
create policy mls_compliance_update on mls_provider_compliance for update
  using (organization_id = rcre_current_org() and rcre_is_broker())
  with check (organization_id = rcre_current_org() and rcre_is_broker());

create policy mls_field_mappings_select on mls_provider_field_mappings for select
  using (organization_id = rcre_current_org() and rcre_is_broker());
create policy mls_field_mappings_insert on mls_provider_field_mappings for insert
  with check (organization_id = rcre_current_org() and rcre_is_broker());
create policy mls_field_mappings_update on mls_provider_field_mappings for update
  using (organization_id = rcre_current_org() and rcre_is_broker())
  with check (organization_id = rcre_current_org() and rcre_is_broker());

create policy mls_sync_state_select on mls_sync_state for select
  using (organization_id = rcre_current_org() and rcre_is_broker());
create policy mls_sync_state_insert on mls_sync_state for insert
  with check (organization_id = rcre_current_org() and rcre_is_broker());
create policy mls_sync_state_update on mls_sync_state for update
  using (organization_id = rcre_current_org() and rcre_is_broker())
  with check (organization_id = rcre_current_org() and rcre_is_broker());

-- Listing visibility requires an authenticated member and the provider's
-- approved compliance record. The public API can use a restricted server-side
-- service connection only after it enforces the same activation/compliance gate.
create policy properties_select on properties for select
  using (
    organization_id = rcre_current_org()
    and rcre_is_org_member()
    and exists (
      select 1 from mls_provider_compliance c
       where c.organization_id = properties.organization_id
         and c.provider_id = properties.provider_id
         and c.approval_state = 'approved'
    )
    and exists (
      select 1 from mls_providers p
       where p.organization_id = properties.organization_id
         and p.id = properties.provider_id and p.status = 'connected'
    )
  );
create policy properties_ingest_insert on properties for insert
  with check (organization_id = rcre_current_org() and rcre_is_broker());
create policy properties_ingest_update on properties for update
  using (organization_id = rcre_current_org() and rcre_is_broker())
  with check (organization_id = rcre_current_org() and rcre_is_broker());

create policy property_sources_select on property_sources for select
  using (
    organization_id = rcre_current_org() and rcre_is_org_member()
    and exists (
      select 1 from properties x
      join mls_provider_compliance c
        on c.organization_id = x.organization_id and c.provider_id = x.provider_id
      join mls_providers p
        on p.organization_id = x.organization_id and p.id = x.provider_id
      where x.organization_id = property_sources.organization_id
        and x.id = property_sources.property_id
        and c.approval_state = 'approved' and p.status = 'connected'
    )
  );
create policy property_media_select on property_media for select
  using (
    organization_id = rcre_current_org() and rcre_is_org_member()
    and exists (
      select 1 from properties x
      join mls_provider_compliance c
        on c.organization_id = x.organization_id and c.provider_id = x.provider_id
      join mls_providers p
        on p.organization_id = x.organization_id and p.id = x.provider_id
      where x.organization_id = property_media.organization_id
        and x.id = property_media.property_id
        and c.approval_state = 'approved' and p.status = 'connected'
    )
  );
create policy property_open_houses_select on property_open_houses for select
  using (
    organization_id = rcre_current_org() and rcre_is_org_member()
    and exists (
      select 1 from properties x
      join mls_provider_compliance c
        on c.organization_id = x.organization_id and c.provider_id = x.provider_id
      join mls_providers p
        on p.organization_id = x.organization_id and p.id = x.provider_id
      where x.organization_id = property_open_houses.organization_id
        and x.id = property_open_houses.property_id
        and c.approval_state = 'approved' and p.status = 'connected'
    )
  );

-- Consumer entities contain opaque, server-issued identities and PII-bearing
-- inquiries. No interactive RCRE role has direct table access through RLS;
-- trusted service code must verify the opaque subject and broker/agent scope.
create policy property_consumers_broker_select on property_consumers for select
  using (organization_id = rcre_current_org() and rcre_is_broker());
create policy saved_properties_broker_select on saved_properties for select
  using (organization_id = rcre_current_org() and rcre_is_broker());
create policy saved_searches_broker_select on saved_searches for select
  using (organization_id = rcre_current_org() and rcre_is_broker());
create policy property_inquiries_select on property_inquiries for select
  using (
    organization_id = rcre_current_org()
    and (rcre_is_org_wide_reader() or agent_user_id in (select rcre_scoped_user_ids()))
  );

comment on table mls_provider_field_mappings is
  'Versioned source-to-normalized field mappings. Provider extensions remain preserved alongside normalized fields.';
comment on table properties is
  'Normalized provider listing row. Kept one-to-one with a provider listing identity; address similarity alone never merges rows.';
comment on table property_sources is
  'Provider provenance and raw extension fields for normalized property data; preserve source identity through normalization.';
comment on table mls_provider_compliance is
  'Exact MLS-approved terms only. Approval requires attribution, disclaimer, copyright, source, actor and timestamp; this migration supplies none.';
comment on table property_inquiries is
  'Public property lead capture and attribution. Writes are server-only under RLS; message length is bounded and external communication is not implied.';
