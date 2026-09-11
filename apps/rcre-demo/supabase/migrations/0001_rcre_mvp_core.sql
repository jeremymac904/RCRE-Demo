-- ===========================================================================
-- RCRE MVP — core schema
-- ---------------------------------------------------------------------------
-- DESIGN POSTURE
--   Follow Up Boss is the SYSTEM OF RECORD for CRM contact data during the MVP.
--   This schema is an INTELLIGENCE LAYER, not a replacement CRM.
--
--   Field ownership is explicit (see field_ownership comments per table):
--     FUB-OWNED   — mirrored from FUB. RCRE never writes these back except via
--                   an explicit, audited, approved action.
--     RCRE-OWNED  — computed or captured by RCRE. FUB knows nothing about them.
--     SHARED      — originated in FUB, enriched by RCRE in a separate column.
--
--   RCRE NEVER blind-overwrites FUB. Writes to FUB happen only through
--   POST /v1/events (leads) or an explicitly approved, audited action.
--
-- SIZE DISCIPLINE
--   13 tables. This is deliberately not a 70-table enterprise schema.
-- ===========================================================================

set check_function_bodies = off;
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin create type rcre_user_role as enum
  ('owner','broker','team_lead','agent','staff','recruiter','viewer');
exception when duplicate_object then null; end $$;

do $$ begin create type rcre_activity_direction as enum ('inbound','outbound','system');
exception when duplicate_object then null; end $$;

do $$ begin create type rcre_activity_kind as enum (
  'call','text','email','note','appointment','task','stage_change',
  'property_view','property_saved','inquiry','registration','em_open',
  'em_click','assignment','other');
exception when duplicate_object then null; end $$;

do $$ begin create type rcre_webhook_status as enum
  ('received','processing','processed','failed','skipped');
exception when duplicate_object then null; end $$;

do $$ begin create type rcre_tool_effect as enum ('read','draft','write');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- ORGANIZATIONS
-- ---------------------------------------------------------------------------
create table if not exists organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  fub_account_id    text,                -- FUB-OWNED (identifier only)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- USERS — RCRE identity. Maps to a FUB user.
-- Authority ALWAYS resolves from this table server-side, never from a model.
-- ---------------------------------------------------------------------------
create table if not exists users (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  email             citext not null,
  full_name         text,
  role              rcre_user_role not null default 'agent',
  fub_user_id       bigint,              -- FUB-OWNED: links to FUB /v1/users
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, email)
);
create index if not exists users_org_idx      on users(organization_id);
create index if not exists users_fub_user_idx on users(organization_id, fub_user_id);

-- ---------------------------------------------------------------------------
-- PEOPLE — mirror of a FUB person.
--
-- FUB-OWNED : fub_person_id, first_name, last_name, emails, phones, stage,
--             source, assigned_fub_user_id, tags, price
-- RCRE-OWNED: every *_at timestamp below, attribution_id, intelligence fields
--
-- first_touch_at is NON-NEGOTIABLE and cannot be backfilled. It is the first
-- OUTBOUND activity against this person. Everything downstream — unanswered
-- leads, median first response, agent accountability, the recruiting claim —
-- derives from it.
-- ---------------------------------------------------------------------------
create table if not exists people (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations(id) on delete cascade,

  -- FUB-OWNED ---------------------------------------------------------------
  fub_person_id          bigint not null,
  first_name             text,
  last_name              text,
  emails                 jsonb not null default '[]'::jsonb,
  phones                 jsonb not null default '[]'::jsonb,
  stage                  text,
  stage_id               bigint,
  source                 text,
  source_url             text,
  assigned_fub_user_id   bigint,
  assigned_user_id       uuid references users(id) on delete set null,
  tags                   jsonb not null default '[]'::jsonb,
  price                  numeric,
  fub_created_at         timestamptz,
  fub_updated_at         timestamptz,

  -- RCRE-OWNED: the timestamps that make the intelligence layer possible -----
  first_received_at      timestamptz,   -- lead first landed anywhere
  first_assigned_at      timestamptz,   -- first assignment to an agent
  first_touch_at         timestamptz,   -- FIRST OUTBOUND. Non-negotiable.
  last_touch_at          timestamptz,   -- most recent activity, either direction
  last_inbound_at        timestamptz,
  last_outbound_at       timestamptz,

  -- RCRE-OWNED: intelligence ------------------------------------------------
  is_buyer               boolean,
  is_seller              boolean,
  budget_min             numeric,
  budget_max             numeric,
  financing_status       text,          -- free text; never used to filter service
  birthday               date,

  deleted_in_fub         boolean not null default false,
  last_synced_at         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  unique (organization_id, fub_person_id)
);
create index if not exists people_org_assigned_idx on people(organization_id, assigned_user_id);
create index if not exists people_first_touch_idx  on people(organization_id, first_touch_at);
create index if not exists people_last_touch_idx   on people(organization_id, last_touch_at);
create index if not exists people_stage_idx        on people(organization_id, stage);
create index if not exists people_received_idx     on people(organization_id, first_received_at desc);

comment on column people.first_touch_at is
  'First OUTBOUND activity. RCRE-owned, derived from activity. Cannot be backfilled — capture from day one.';

-- ---------------------------------------------------------------------------
-- ATTRIBUTION — where a person actually came from.
-- RCRE-OWNED entirely. FUB carries `source` but not full campaign detail.
-- ---------------------------------------------------------------------------
create table if not exists attribution (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  person_id         uuid references people(id) on delete cascade,

  source            text,           -- 'meta' | 'google_ads' | 'zillow' | 'website' | ...
  medium            text,           -- 'cpc' | 'paid_social' | 'organic' | 'referral'
  campaign          text,
  campaign_id       text,
  ad_group          text,
  ad_group_id       text,
  creative          text,
  creative_id       text,
  keyword           text,
  audience          text,
  landing_page      text,
  referrer          text,
  utm               jsonb not null default '{}'::jsonb,   -- raw UTM set, verbatim
  related_agent_id  uuid references users(id) on delete set null,
  platform_lead_id  text,           -- e.g. Meta leadgen_id, for dedupe
  captured_at       timestamptz not null default now(),
  raw               jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists attribution_person_idx   on attribution(person_id);
create index if not exists attribution_campaign_idx on attribution(organization_id, source, campaign);
create unique index if not exists attribution_platform_lead_uidx
  on attribution(organization_id, source, platform_lead_id)
  where platform_lead_id is not null;

-- ---------------------------------------------------------------------------
-- ACTIVITY — normalized, append-only. The engine behind every insight.
-- Sourced from FUB (calls/texts/emails/notes/events) plus RCRE-native actions.
-- ---------------------------------------------------------------------------
create table if not exists activity (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  person_id         uuid references people(id) on delete cascade,
  user_id           uuid references users(id) on delete set null,

  kind              rcre_activity_kind not null,
  direction         rcre_activity_direction not null,
  occurred_at       timestamptz not null,
  summary           text,                 -- SUMMARY ONLY — never message bodies
  source_system     text not null default 'fub',
  fub_resource_type text,                 -- 'calls' | 'textMessages' | 'emails' | ...
  fub_resource_id   bigint,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists activity_person_time_idx on activity(person_id, occurred_at desc);
create index if not exists activity_org_time_idx    on activity(organization_id, occurred_at desc);
create index if not exists activity_dir_idx         on activity(organization_id, direction, occurred_at desc);
create unique index if not exists activity_fub_uidx
  on activity(organization_id, fub_resource_type, fub_resource_id)
  where fub_resource_id is not null;

comment on column activity.summary is
  'Summary only. Never store full message bodies — this table feeds AI context.';

-- ---------------------------------------------------------------------------
-- TASKS — mirrored from FUB. FUB-OWNED.
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  person_id         uuid references people(id) on delete cascade,
  assigned_user_id  uuid references users(id) on delete set null,
  fub_task_id       bigint,
  title             text not null,
  due_at            timestamptz,
  is_completed      boolean not null default false,
  completed_at      timestamptz,
  created_by_rcre   boolean not null default false,
  last_synced_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, fub_task_id)
);
create index if not exists tasks_due_idx on tasks(organization_id, assigned_user_id, due_at)
  where is_completed = false;

-- ---------------------------------------------------------------------------
-- APPOINTMENTS — mirrored from FUB. FUB-OWNED.
-- ---------------------------------------------------------------------------
create table if not exists appointments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  person_id         uuid references people(id) on delete cascade,
  assigned_user_id  uuid references users(id) on delete set null,
  fub_appointment_id bigint,
  title             text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  location          text,
  outcome           text,
  last_synced_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, fub_appointment_id)
);
create index if not exists appointments_start_idx
  on appointments(organization_id, assigned_user_id, starts_at);

-- ---------------------------------------------------------------------------
-- DEALS — mirrored from FUB pipelines/deals. FUB-OWNED.
-- ---------------------------------------------------------------------------
create table if not exists deals (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  person_id         uuid references people(id) on delete set null,
  owner_user_id     uuid references users(id) on delete set null,
  fub_deal_id       bigint,
  fub_pipeline_id   bigint,
  name              text,
  stage             text,
  price             numeric,
  projected_close_on date,
  closed_at         timestamptz,
  status            text,
  last_stage_change_at timestamptz,
  last_synced_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, fub_deal_id)
);
create index if not exists deals_owner_idx on deals(organization_id, owner_user_id, stage);

-- ---------------------------------------------------------------------------
-- LEAD SNAPSHOTS — point-in-time record of a lead as first received.
-- Immutable. Preserves what arrived even if FUB later mutates the person.
-- ---------------------------------------------------------------------------
create table if not exists lead_snapshots (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  person_id         uuid references people(id) on delete set null,
  fub_person_id     bigint,
  received_at       timestamptz not null default now(),
  source            text,
  payload           jsonb not null default '{}'::jsonb,
  attribution_id    uuid references attribution(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists lead_snapshots_org_time_idx
  on lead_snapshots(organization_id, received_at desc);

-- ---------------------------------------------------------------------------
-- RECRUITING PROSPECTS — RCRE-OWNED. Never sent to FUB in the MVP.
-- Deliberately separate from `people`: different permissions, different rules.
-- ---------------------------------------------------------------------------
create table if not exists recruiting_prospects (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  full_name         text,
  email             citext,
  phone             text,
  current_brokerage text,
  market            text,
  stage             text not null default 'new',
  is_confidential   boolean not null default true,
  owner_user_id     uuid references users(id) on delete set null,
  attribution_id    uuid references attribution(id) on delete set null,
  notes             text,
  first_received_at timestamptz not null default now(),
  first_touch_at    timestamptz,
  last_touch_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists recruiting_stage_idx on recruiting_prospects(organization_id, stage);

-- ---------------------------------------------------------------------------
-- WEBHOOK EVENTS — the async ingestion ledger.
-- FUB requires a 2XX within 10s. We persist, ack, and process out of band.
-- fub_event_id is UNIQUE — this is the idempotency guarantee.
-- ---------------------------------------------------------------------------
create table if not exists webhook_events (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references organizations(id) on delete cascade,
  provider          text not null default 'fub',
  fub_event_id      text,
  event_type        text not null,
  resource_ids      jsonb not null default '[]'::jsonb,
  uri               text,
  payload           jsonb not null default '{}'::jsonb,
  signature_valid   boolean,
  status            rcre_webhook_status not null default 'received',
  attempts          integer not null default 0,
  last_error        text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz
);
create unique index if not exists webhook_events_provider_event_uidx
  on webhook_events(provider, fub_event_id) where fub_event_id is not null;
create index if not exists webhook_events_status_idx on webhook_events(status, received_at);

comment on table webhook_events is
  'Append-only ingestion ledger. Unique fub_event_id gives idempotency; out-of-order events are resolved by re-fetching the authoritative FUB record.';

-- ---------------------------------------------------------------------------
-- AUDIT EVENTS — every MCP call and every state change. Append-only.
-- This is RCRE''s audit of record; Hermes'' own audit is per-profile and local.
-- ---------------------------------------------------------------------------
create table if not exists audit_events (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references organizations(id) on delete set null,
  actor_user_id     uuid references users(id) on delete set null,
  actor_kind        text not null default 'user',   -- 'user' | 'mcp' | 'system'
  action            text not null,
  target_type       text,
  target_id         text,
  effect            rcre_tool_effect not null default 'read',
  allowed           boolean not null default true,
  denied_reason     text,
  detail            jsonb not null default '{}'::jsonb,  -- SUMMARY ONLY, no PII
  occurred_at       timestamptz not null default now()
);
create index if not exists audit_org_time_idx  on audit_events(organization_id, occurred_at desc);
create index if not exists audit_actor_idx     on audit_events(actor_user_id, occurred_at desc);
create index if not exists audit_denied_idx    on audit_events(allowed, occurred_at desc) where allowed = false;

-- ---------------------------------------------------------------------------
-- HERMES TOOL PERMISSIONS — which MCP tools a role may call.
-- The MCP server consults this table. A tool absent here is not callable.
-- ---------------------------------------------------------------------------
create table if not exists hermes_tool_permissions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  role              rcre_user_role not null,
  tool_name         text not null,
  effect            rcre_tool_effect not null default 'read',
  requires_approval boolean not null default false,
  is_enabled        boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (organization_id, role, tool_name)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['organizations','users','people','tasks','appointments',
                           'deals','recruiting_prospects']
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on %I;
       create trigger %I_set_updated_at before update on %I
       for each row execute function set_updated_at();', t, t, t, t);
  end loop;
end $$;
