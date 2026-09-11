-- ===========================================================================
-- 0002 — Reporting history, routing history, and brokerage policy
--
-- Additive only. Nothing in 0001 is altered or dropped.
--
-- WHY THIS EXISTS
--
-- Leadership (Taquilla Allen, 2026-08-24) asked for nine measures of agent
-- accountability. Four of them — first response time, contact attempts, time in
-- stage, and pipeline fallout — cannot be reconstructed from Follow Up Boss.
-- FUB reports a person's CURRENT stage and CURRENT owner; it keeps no history
-- of either. That history has to be recorded as it happens, from webhooks.
--
-- So these tables are the difference between "we can report on this in ninety
-- days" and "we can never report on this". They must exist and be receiving
-- writes on the first day the production connection is authorised.
--
-- Two of these tables (follow_up_policies, stage_aging_policies) are
-- deliberately EMPTY until RCRE leadership answers the policy sheets in
-- 02-discovery/leadership-answers/. The system must not invent a follow-up
-- standard and then measure RCRE's agents against it.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Message delivery, for outbound messages.
--
-- NOTE THE ABSENCE OF 'read'. That is deliberate and load-bearing (ADR-0014).
-- SMS carries no read event at the protocol level, so a 'read' value could only
-- ever be populated by inference from something else — an email open, a site
-- visit — and management would then evaluate agents on a label that is not
-- true. Leaving it out of the type means no code path can introduce it by
-- accident. If RCRE later adopts RCS or WhatsApp, where a real read receipt
-- exists, this enum gains a value in its own migration alongside the ADR that
-- authorises it.
do $$ begin create type rcre_delivery_status as enum
  ('sent','delivered','undelivered','failed','unknown');
exception when duplicate_object then null; end $$;

do $$ begin create type rcre_assignment_reason as enum
  ('initial','round_robin','leadership_routed','team_lead_distributed',
   'manual_reassignment','pond_claim','agent_offboarded','unknown');
exception when duplicate_object then null; end $$;

do $$ begin create type rcre_alert_audience as enum
  ('agent','team_lead','managing_broker','owner');
exception when duplicate_object then null; end $$;

do $$ begin create type rcre_backfill_status as enum
  ('pending','running','complete','failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- TEAMS — mirrors FUB /v1/teams, which already models exactly what leadership
-- described in Alabama: a team with named leaders.
--
-- This was going to be invented. It does not need to be: FUB returns
-- `leaderIds` on a team and `teamLeaderOf` on a user. Sourcing the role from
-- FUB rather than from an RCRE-only table means the two systems cannot drift,
-- and there is no second place for someone to be made a team lead.
-- ---------------------------------------------------------------------------
create table if not exists teams (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  fub_team_id       bigint,
  name              text not null,
  market            text,                 -- RCRE-owned. FUB has no market concept.
  last_synced_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, fub_team_id)
);
create index if not exists teams_org_idx on teams(organization_id);

create table if not exists team_members (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  team_id           uuid not null references teams(id) on delete cascade,
  user_id           uuid not null references users(id) on delete cascade,
  is_leader         boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (team_id, user_id)
);
create index if not exists team_members_user_idx on team_members(organization_id, user_id);
create index if not exists team_members_leader_idx on team_members(organization_id, team_id)
  where is_leader = true;

comment on table teams is
  'Mirror of FUB /v1/teams. leaderIds -> team_members.is_leader. A team lead is
   NOT a managing broker: they see their own team, not the brokerage.';

-- ---------------------------------------------------------------------------
-- ASSIGNMENT HISTORY — who held this lead, when, and how it got to them.
--
-- Leadership described three routing paths, and the third has a hop nothing in
-- the data model represented:
--
--   source -> agent
--   source -> Julio/Taquilla -> agent
--   source -> leadership -> ALABAMA TEAM LEAD -> agent
--
-- Response time is measured from the moment the FINAL agent received the lead,
-- not from when it arrived at the brokerage — otherwise every routed Alabama
-- lead looks like a slow agent when the delay was in routing. Both numbers
-- matter, and separating them is the point of this table: time-to-route is a
-- leadership problem, time-to-first-touch is an agent problem, and conflating
-- them blames the wrong person.
--
-- FUB has no assignment history. Every row here is RCRE-OWNED and must be
-- captured from peopleUpdated webhooks as ownership changes. Not backfillable.
-- ---------------------------------------------------------------------------
create table if not exists assignment_history (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  person_id            uuid not null references people(id) on delete cascade,

  from_user_id         uuid references users(id) on delete set null,
  to_user_id           uuid references users(id) on delete set null,
  from_fub_user_id     bigint,
  to_fub_user_id       bigint,

  -- The routing hop this row represents. 'leadership_routed' and
  -- 'team_lead_distributed' are what make the Alabama path legible.
  reason               rcre_assignment_reason not null default 'unknown',
  team_id              uuid references teams(id) on delete set null,
  assigned_pond_id     bigint,

  assigned_at          timestamptz not null,
  -- Null while current. Set when the next assignment lands, so "how long did
  -- this person hold it" is a subtraction rather than a window function.
  released_at          timestamptz,
  is_current           boolean not null default true,

  -- True for the first row of a person's assignment chain. Response time is
  -- measured against the assignment where is_final_agent = true.
  is_initial_receipt   boolean not null default false,
  is_final_agent       boolean not null default false,

  detected_via         text not null default 'webhook',  -- 'webhook' | 'backfill' | 'manual'
  created_at           timestamptz not null default now()
);
create index if not exists assignment_person_idx  on assignment_history(person_id, assigned_at desc);
create index if not exists assignment_current_idx on assignment_history(organization_id, to_user_id)
  where is_current = true;
create index if not exists assignment_org_time_idx on assignment_history(organization_id, assigned_at desc);

comment on table assignment_history is
  'RCRE-OWNED. FUB keeps no assignment history. Captured from peopleUpdated
   webhooks. NOT BACKFILLABLE — a lead assigned before activation has no
   recorded chain, only its current owner.';

-- ---------------------------------------------------------------------------
-- STAGE TRANSITIONS — the single most valuable table in this migration.
--
-- Every metric leadership asked for that involves the funnel depends on this:
-- time in stage, stage transition rate, pipeline fallout, lead-to-appointment,
-- lead-to-contract, lead-to-closing.
--
-- FUB emits peopleStageUpdated and exposes a person's current stage. It does
-- not expose when the stage changed, or what it changed from. Those facts exist
-- only in the moment the webhook fires. Miss the webhook, and the interval is
-- gone permanently — there is no endpoint that can recover it later.
-- ---------------------------------------------------------------------------
create table if not exists stage_transitions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  person_id         uuid not null references people(id) on delete cascade,

  from_stage        text,                 -- null on the first observed stage
  to_stage          text not null,
  from_stage_id     bigint,
  to_stage_id       bigint,

  -- Who owned the person at the moment of the change. Denormalised on purpose:
  -- reassignment later must not silently rewrite who was responsible then.
  owner_user_id     uuid references users(id) on delete set null,
  team_id           uuid references teams(id) on delete set null,

  occurred_at       timestamptz not null,
  -- Time spent in from_stage. Null on the first transition, since we did not
  -- observe the entry.
  seconds_in_from   bigint,

  -- 'webhook' rows are trustworthy intervals. 'backfill' rows record a stage we
  -- found on connection day with no history behind it, and MUST be excluded
  -- from time-in-stage averages. Keeping them distinguishable is what stops a
  -- report from quietly mixing measured and assumed data.
  detected_via      text not null default 'webhook',
  created_at        timestamptz not null default now()
);
create index if not exists stage_tx_person_idx on stage_transitions(person_id, occurred_at desc);
create index if not exists stage_tx_org_idx    on stage_transitions(organization_id, occurred_at desc);
create index if not exists stage_tx_to_idx     on stage_transitions(organization_id, to_stage, occurred_at desc);
create index if not exists stage_tx_measured_idx
  on stage_transitions(organization_id, from_stage, occurred_at desc)
  where detected_via = 'webhook';

comment on column stage_transitions.detected_via is
  'webhook = a measured interval. backfill = the stage as found on activation
   day, with no entry time. Never average backfill rows into time-in-stage.';

-- ---------------------------------------------------------------------------
-- Message delivery and engagement — ADR-0014 in table form.
--
-- Phase 7 requirement: keep genuine engagement signals so the assistant can say
-- "opened your last email", "viewed three listings", "came back to the site",
-- "replied to your text" — while never claiming a text was read.
--
-- Delivery status attaches to the activity row for an outbound message. The
-- enum cannot express 'read'.
-- ---------------------------------------------------------------------------
alter table activity
  add column if not exists delivery_status rcre_delivery_status,
  add column if not exists delivery_updated_at timestamptz;

comment on column activity.delivery_status is
  'Outbound messages only. There is no read state and there will not be one for
   SMS (ADR-0014). A reply is the only unambiguous evidence a text landed.';

-- A rollup the assistant and Today can read without scanning activity.
-- Maintained by the ingestion pipeline, not by a trigger, so the write path
-- stays explicit and testable.
create table if not exists person_engagement (
  person_id             uuid primary key references people(id) on delete cascade,
  organization_id       uuid not null references organizations(id) on delete cascade,

  last_email_open_at    timestamptz,
  last_email_click_at   timestamptz,
  last_property_view_at timestamptz,
  last_site_visit_at    timestamptz,
  last_inbound_text_at  timestamptz,
  last_inbound_call_at  timestamptz,

  property_views_7d     integer not null default 0,
  property_views_30d    integer not null default 0,
  email_opens_30d       integer not null default 0,
  site_visits_30d       integer not null default 0,

  -- Engagement that happened AFTER the most recent outbound touch. This is the
  -- honest answer to "did my message land" — not a read receipt, and better
  -- evidence than one.
  engaged_since_last_outbound boolean not null default false,
  computed_at           timestamptz not null default now()
);
create index if not exists engagement_org_idx on person_engagement(organization_id);
create index if not exists engagement_recent_idx
  on person_engagement(organization_id, engaged_since_last_outbound)
  where engaged_since_last_outbound = true;

-- ---------------------------------------------------------------------------
-- BROKERAGE POLICY — per organization, and DELIBERATELY EMPTY.
--
-- Taquilla asked for an alert when "required follow-up has not occurred". The
-- system cannot answer that until RCRE says what is required. Shipping a
-- default would mean silently enforcing our standard against their agents and
-- calling it theirs.
--
-- So these tables exist, the detection code reads them, and with no rows the
-- corresponding alerts simply do not fire. The day leadership fills in the
-- policy sheet, the alerts turn on. No deploy required.
-- ---------------------------------------------------------------------------
create table if not exists follow_up_policies (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations(id) on delete cascade,

  -- Which leads this applies to. Null source matches anything not otherwise
  -- covered, so there is one fallback rule rather than a rule per source.
  lead_category          text not null,        -- 'new_internet_lead' | 'zillow' | 'past_client' | 'recruiting_prospect' | 'sphere'
  source_match           text[],               -- FUB source values this category covers

  first_attempt_minutes  integer,              -- minutes from assignment
  min_attempts_24h       integer,
  min_attempts_7d        integer,
  required_channels      text[],               -- 'call' | 'text' | 'email'
  require_distinct_channels boolean not null default false,
  nurture_after_days     integer,              -- when unworked leads move to nurture

  is_active              boolean not null default true,
  effective_from         timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organization_id, lead_category, effective_from)
);
create index if not exists follow_up_policy_active_idx
  on follow_up_policies(organization_id, lead_category) where is_active = true;

comment on table follow_up_policies is
  'BLOCKED BY BROKERAGE POLICY until RCRE completes the required-follow-up
   sheet. Empty table = the required-follow-up alert does not fire. That is the
   correct behaviour, not a bug.';

create table if not exists stage_aging_policies (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  stage             text not null,
  max_days          integer not null,
  alert_audience    rcre_alert_audience[] not null default '{}',
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, stage)
);

comment on table stage_aging_policies is
  'BLOCKED BY BROKERAGE POLICY. Empty = no stage-aging alerts. Thresholds are a
   brokerage decision; the demo shows placeholders and labels them as ours.';

-- ---------------------------------------------------------------------------
-- SYNC STATE — the record of what has been read, and of the moment history
-- began.
--
-- webhook_activated_at is the most consequential timestamp in the system. It is
-- the boundary before which four of leadership's metrics do not exist. Every
-- report that uses a forward-only metric must read this value and state its own
-- earliest valid date rather than implying it covers all time.
-- ---------------------------------------------------------------------------
create table if not exists sync_state (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations(id) on delete cascade,
  resource               text not null,     -- 'people' | 'calls' | 'textMessages' | 'events' | ...

  last_cursor            text,              -- FUB keyset `next` token
  last_offset            integer,
  last_synced_at         timestamptz,
  last_seen_fub_updated  timestamptz,
  records_seen           bigint not null default 0,

  backfill_status        rcre_backfill_status not null default 'pending',
  backfill_started_at    timestamptz,
  backfill_completed_at  timestamptz,
  last_error             text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organization_id, resource)
);

create table if not exists integration_state (
  organization_id        uuid primary key references organizations(id) on delete cascade,

  -- Set once, on the day webhooks are first registered. Never reset.
  webhook_activated_at   timestamptz,
  -- Set when Jeremy disables the connection. Non-null means ingestion halts.
  connection_disabled_at timestamptz,
  disabled_reason        text,

  fub_account_domain     text,
  fub_owner_email        text,
  -- Confirms the key belongs to an Owner. Read from /v1/users isOwner.
  fub_key_is_owner       boolean,
  registered_system_name text,              -- the X-System value in use

  -- Read-only means read-only. Every write path checks this, in addition to
  -- the RCRE_ALLOW_FUB_WRITES env guard, so disabling writes does not depend on
  -- a deploy.
  writes_enabled         boolean not null default false,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on column integration_state.webhook_activated_at is
  'The day history began. Reports over forward-only metrics MUST clamp their
   window to this date and say so.';
comment on column integration_state.writes_enabled is
  'Second, data-level kill switch for FUB writes. Independent of the
   RCRE_ALLOW_FUB_WRITES environment guard, so one can be flipped without a
   deploy and neither alone is sufficient.';
