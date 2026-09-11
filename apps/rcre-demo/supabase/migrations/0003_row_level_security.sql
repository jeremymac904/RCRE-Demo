-- ===========================================================================
-- 0003 — Row Level Security
--
-- Additive only. Nothing in 0001 or 0002 is altered or dropped. This migration
-- adds helper functions, enables RLS on every tenant-scoped table, and writes
-- per-command policies. No existing column, index, constraint or trigger is
-- touched.
--
-- ---------------------------------------------------------------------------
-- WHY THIS FILE EXISTS
-- ---------------------------------------------------------------------------
-- Until now the only thing standing between one brokerage's data and another's
-- was the application: src/lib/db/repository.ts resolves an Actor and every
-- query carries the scoping predicate by hand. That is good engineering and it
-- is not sufficient. A single missed WHERE clause — one new endpoint, one
-- reporting query written in a hurry, one psql session — leaks another agent's
-- book or, once ADR-0013's packaging option is taken, another brokerage's.
--
-- goal.md ("Security and Compliance") requires organization-scoped data, an RLS
-- architecture, and least privilege. This is that layer. It is a SECOND fence,
-- not a replacement: the repository keeps its predicates, because defence that
-- depends on one mechanism is not defence.
--
-- ---------------------------------------------------------------------------
-- HOW SESSION CONTEXT IS CARRIED
-- ---------------------------------------------------------------------------
-- Three custom GUCs, set by the application immediately after it checks out a
-- connection and before it runs anything else:
--
--   rcre.organization_id  uuid  — the tenant boundary
--   rcre.user_id          uuid  — the acting user
--   rcre.role             text  — that user's rcre_user_role
--
-- They are read with current_setting('rcre.organization_id', true). The second
-- argument (missing_ok) means an unset GUC returns NULL rather than raising.
-- NULL then propagates through every policy predicate as NULL, and Postgres
-- treats a non-TRUE row check as a failure. The consequence is the property
-- this design is built on:
--
--     NO CONTEXT  ->  NO ROWS.  Never "all rows".
--
-- The application never interpolates these values into SQL. They are set with
-- set_config($1, $2, true) as bound parameters — see src/lib/db/rls.ts — and
-- the `true` makes them TRANSACTION-LOCAL, so a pooled connection cannot carry
-- one user's identity into the next user's query. src/lib/db/rls.ts also
-- refuses to open a session with no organization id at all, so the "silently
-- unscoped query" case fails in the application before it can reach Postgres,
-- and fails again in Postgres if it somehow gets there.
--
-- Values are ONLY ever derived from a verified session or a verified MCP
-- credential (repository.ts, Actor). Never from a request parameter, never from
-- anything a language model produced.
--
-- ---------------------------------------------------------------------------
-- THE ONE RULE THAT IS NOT NEGOTIABLE
-- ---------------------------------------------------------------------------
-- Every single policy in this file begins with an organization equality test
-- against rcre_current_org(). There is no role — not owner, not a support
-- account, not a reporting job — whose policy can return a row belonging to
-- another organization. Role only ever SUBTRACTS visibility inside the tenant;
-- it can never cross the tenant boundary. That is what makes ADR-0013's
-- "package this for other brokerages later" a cheap option instead of a
-- rewrite, and it is asserted mechanically in tests/unit/rls-policy.test.ts.
--
-- ---------------------------------------------------------------------------
-- DENY BY DEFAULT
-- ---------------------------------------------------------------------------
-- Policies are written per command (SELECT / INSERT / UPDATE / DELETE). There
-- is no FOR ALL policy anywhere in this file. A command with no policy on a
-- table is DENIED — that is Postgres' default once RLS is enabled, and it is
-- used deliberately here:
--
--   * activity, audit_events, stage_transitions, assignment_history,
--     lead_snapshots and webhook_events have no UPDATE and no DELETE policy.
--     They are append-only ledgers. Nothing that authenticates as a user can
--     rewrite history, including an owner.
--   * people, deals and appointments have no INSERT/UPDATE/DELETE policy at
--     all. They mirror Follow Up Boss and are written by the ingestion path
--     (below), never by an interactive user. ADR-0012: RCRE never blind-
--     overwrites FUB.
--
-- ---------------------------------------------------------------------------
-- SERVICE ROLE / MIGRATION / INGESTION PATH
-- ---------------------------------------------------------------------------
-- The FUB ingestion pipeline is not a user. It has no organization to
-- impersonate while it is deciding which organization a webhook belongs to, and
-- pretending otherwise (a synthetic "system user" with a policy exemption)
-- would put a hole in the tenant boundary that a bug could walk through.
--
-- So the split is at the DATABASE ROLE level, not in the policies:
--
--   rcre_app     NOBYPASSRLS. What the Next.js app and the MCP server connect
--                as. Fully subject to every policy below. The login user in
--                DATABASE_URL must be a member of this role in any environment
--                that serves users.
--   rcre_ingest  BYPASSRLS. What the webhook receiver, the backfill job and
--                the reporting rollups connect as. Separate credential,
--                separate connection string, no HTTP surface of its own.
--
-- Both are created NOLOGIN, as group roles. The login users that carry the
-- actual passwords are provisioned outside this repository and granted
-- membership — CLAUDE.md §4: no secrets in this folder, env vars by name only.
--   owner/       Migrations. Bypasses RLS as superuser, or by owning the
--   superuser    tables — but see FORCE below.
--
-- Tables are set to FORCE ROW LEVEL SECURITY. Without FORCE, the table owner
-- silently bypasses every policy in this file, which means a DATABASE_URL
-- pointing at the owner role would look completely normal and enforce nothing.
-- FORCE removes that failure mode: only a role explicitly granted BYPASSRLS (or
-- a superuser) skips the policies, and granting BYPASSRLS is a visible,
-- deliberate act.
--
-- Role creation below is guarded: on a managed platform where the migration
-- role cannot create roles or grant BYPASSRLS, the DO block raises a NOTICE and
-- the migration still succeeds. Provisioning the two roles then becomes an
-- explicit operational step. On Supabase specifically, `service_role` already
-- carries BYPASSRLS and plays the rcre_ingest part, and `authenticated` plays
-- the rcre_app part.
--
-- NOTE: this file has not been executed. No Postgres instance is provisioned
-- for RCRE and provisioning one is outside current authorization. It is source,
-- reviewed statically by tests/unit/rls-policy.test.ts.
-- ===========================================================================

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- SESSION CONTEXT ACCESSORS
--
-- All STABLE: the values cannot change inside a statement, so Postgres may
-- evaluate them once per query rather than once per row.
-- ---------------------------------------------------------------------------

create or replace function rcre_current_org() returns uuid
language sql stable
as $fn$
  select nullif(current_setting('rcre.organization_id', true), '')::uuid
$fn$;

comment on function rcre_current_org() is
  'The tenant boundary. NULL when unset, which makes every policy predicate
   non-TRUE and therefore returns zero rows. Absence of context must never be
   read as permission.';

create or replace function rcre_current_user_id() returns uuid
language sql stable
as $fn$
  select nullif(current_setting('rcre.user_id', true), '')::uuid
$fn$;

create or replace function rcre_current_role() returns text
language sql stable
as $fn$
  select nullif(current_setting('rcre.role', true), '')
$fn$;

-- Roles that may see the whole brokerage book. Mirrors canSeeWholeBrokerage()
-- in src/lib/db/repository.ts. If one changes, the other must.
create or replace function rcre_is_broker() returns boolean
language sql stable
as $fn$
  select coalesce(rcre_current_role() in ('owner', 'broker'), false)
$fn$;

-- Brokerage-wide READ of the client book. Staff are included here — the ISA and
-- the admin desk work leads across the whole brokerage, which is the job — but
-- staff are deliberately NOT in rcre_is_broker(), so they never reach deals,
-- recruiting, the audit log, or the integration kill switch.
create or replace function rcre_is_org_wide_reader() returns boolean
language sql stable
as $fn$
  select coalesce(rcre_current_role() in ('owner', 'broker', 'staff'), false)
$fn$;

-- Any authenticated member of the current organization. Requires all three
-- context values, so a caller that sets an organization but forgets the user or
-- role gets nothing rather than a partial identity.
create or replace function rcre_is_org_member() returns boolean
language sql stable
as $fn$
  select rcre_current_org() is not null
     and rcre_current_user_id() is not null
     and rcre_current_role() is not null
$fn$;

-- ---------------------------------------------------------------------------
-- TEAM AND OWNERSHIP SCOPE
--
-- These three are SECURITY DEFINER. Two reasons, both structural:
--
--   1. Recursion. team_members' own SELECT policy needs to know which teams the
--      caller belongs to. Asking that question through a policy that itself
--      queries team_members is infinite recursion in Postgres. A SECURITY
--      DEFINER function reads the table without invoking its policy and breaks
--      the cycle.
--   2. Correctness under partial visibility. A team lead must be evaluated
--      against the FULL membership of the team they lead, not against the
--      subset a half-applied policy happened to expose.
--
-- Every one of them still filters on rcre_current_org() internally, so the
-- elevated privilege buys them no reach outside the tenant. search_path is
-- pinned so a caller cannot shadow `public` with their own team_members.
-- ---------------------------------------------------------------------------

create or replace function rcre_my_team_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $fn$
  select tm.team_id
    from team_members tm
   where tm.organization_id = rcre_current_org()
     and tm.user_id = rcre_current_user_id()
$fn$;

create or replace function rcre_led_team_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $fn$
  select tm.team_id
    from team_members tm
   where tm.organization_id = rcre_current_org()
     and tm.user_id = rcre_current_user_id()
     and tm.is_leader = true
$fn$;

-- The set of user ids whose assigned work the caller may see.
--
--   owner / broker / staff  their own id (their org-wide reach comes from
--                           rcre_is_org_wide_reader(), not from this set)
--   team_lead               themselves plus every member of a team they LEAD.
--                           A team lead is not a managing broker — 0002 says so
--                           in as many words — so this is their team, not the
--                           brokerage.
--   agent                   themselves, and nobody else
--   recruiter / viewer      themselves only; neither has a client book, and
--                           neither is granted client rows by any policy below
--
-- An unrecognised role yields the empty set, so a typo in the role GUC costs
-- visibility rather than granting it.
create or replace function rcre_scoped_user_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $fn$
  select rcre_current_user_id()
   where rcre_current_org() is not null
     and rcre_current_user_id() is not null
     and rcre_current_role() in
         ('owner', 'broker', 'team_lead', 'agent', 'staff', 'recruiter', 'viewer')
  union
  select tm.user_id
    from team_members tm
   where rcre_current_role() = 'team_lead'
     and tm.organization_id = rcre_current_org()
     and tm.team_id in (select rcre_led_team_ids())
$fn$;

-- Is this person row visible to the caller?
--
-- SECURITY DEFINER so that the dozen tables hanging off people (activity,
-- tasks, stage_transitions, engagement, ...) express visibility ONE way, here,
-- rather than each restating the ownership rule and one of them getting it
-- wrong. Org-scoped internally; it cannot answer TRUE for another tenant's
-- person under any role.
--
-- A person with assigned_user_id IS NULL — a lead that has arrived but not yet
-- been routed — is visible only to org-wide readers. NULL is not a match for
-- any agent, which is the correct outcome: an unrouted lead belongs to the
-- brokerage, not to whoever queries first.
create or replace function rcre_can_see_person(p_person_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
      from people p
     where p.id = p_person_id
       and p.organization_id = rcre_current_org()
       and (
         rcre_is_org_wide_reader()
         or p.assigned_user_id in (select rcre_scoped_user_ids())
       )
  )
$fn$;

-- ===========================================================================
-- ENABLE RLS
--
-- Every tenant-scoped table from 0001 and 0002. FORCE included, for the reason
-- given in the header: without it, connecting as the table owner disables this
-- entire file without any visible symptom.
-- ===========================================================================

-- 0001
alter table organizations           enable row level security;
alter table organizations           force  row level security;
alter table users                   enable row level security;
alter table users                   force  row level security;
alter table people                  enable row level security;
alter table people                  force  row level security;
alter table attribution             enable row level security;
alter table attribution             force  row level security;
alter table activity                enable row level security;
alter table activity                force  row level security;
alter table tasks                   enable row level security;
alter table tasks                   force  row level security;
alter table appointments            enable row level security;
alter table appointments            force  row level security;
alter table deals                   enable row level security;
alter table deals                   force  row level security;
alter table lead_snapshots          enable row level security;
alter table lead_snapshots          force  row level security;
alter table recruiting_prospects    enable row level security;
alter table recruiting_prospects    force  row level security;
alter table webhook_events          enable row level security;
alter table webhook_events          force  row level security;
alter table audit_events            enable row level security;
alter table audit_events            force  row level security;
alter table hermes_tool_permissions enable row level security;
alter table hermes_tool_permissions force  row level security;

-- 0002
alter table teams                   enable row level security;
alter table teams                   force  row level security;
alter table team_members            enable row level security;
alter table team_members            force  row level security;
alter table assignment_history      enable row level security;
alter table assignment_history      force  row level security;
alter table stage_transitions       enable row level security;
alter table stage_transitions       force  row level security;
alter table person_engagement       enable row level security;
alter table person_engagement       force  row level security;
alter table follow_up_policies      enable row level security;
alter table follow_up_policies      force  row level security;
alter table stage_aging_policies    enable row level security;
alter table stage_aging_policies    force  row level security;
alter table sync_state              enable row level security;
alter table sync_state              force  row level security;
alter table integration_state       enable row level security;
alter table integration_state       force  row level security;

-- ===========================================================================
-- POLICIES
--
-- Idempotent: each is dropped if present, then created. `create policy` has no
-- IF NOT EXISTS form.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- organizations — you can see your own organization row and nothing else.
-- No write policies: creating or renaming an organization is provisioning, and
-- provisioning runs as rcre_ingest.
-- ---------------------------------------------------------------------------
drop policy if exists organizations_select on organizations;
create policy organizations_select on organizations
  for select using (id = rcre_current_org());

-- ---------------------------------------------------------------------------
-- users — the roster.
--
-- Deliberately stricter than a typical company directory: an agent sees only
-- their own row. This matches listUsers() in repository.ts. An agent's UI never
-- needs another agent's record, because an agent's book contains only their own
-- assignments; the moment that stops being true, this policy is the thing to
-- revisit, on purpose, rather than the thing that already leaked.
--
-- No write policies. Identity comes from FUB via ingestion; a user cannot
-- promote themselves by writing to their own row, which is the attack this
-- prevents.
-- ---------------------------------------------------------------------------
drop policy if exists users_select on users;
create policy users_select on users
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or id in (select rcre_scoped_user_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- people — the client book. The core of the whole model.
--
-- No INSERT/UPDATE/DELETE policy. people mirrors Follow Up Boss; it is written
-- by the ingestion role and by nothing else. ADR-0012: FUB is the system of
-- record and RCRE never blind-overwrites it.
-- ---------------------------------------------------------------------------
drop policy if exists people_select on people;
create policy people_select on people
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or assigned_user_id in (select rcre_scoped_user_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- attribution — where a lead came from.
--
-- Three ways in, all inside the tenant: org-wide readers see everything; an
-- agent sees the attribution of a person in their own book; a recruiter sees
-- attribution attached to a recruiting prospect (and only that), because a
-- recruiter needs to know which campaign produced a prospective agent without
-- being handed the client marketing book.
-- ---------------------------------------------------------------------------
drop policy if exists attribution_select on attribution;
create policy attribution_select on attribution
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or (person_id is not null and rcre_can_see_person(person_id))
      or (
        rcre_current_role() = 'recruiter'
        and exists (
          select 1 from recruiting_prospects rp
           where rp.attribution_id = attribution.id
             and rp.organization_id = rcre_current_org()
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- activity — append-only, and the engine behind every insight.
--
-- SELECT follows the person. INSERT exists so an RCRE-native action (a logged
-- note, a call the agent records in the app) can be written by the acting user
-- for a person they can already see — and the WITH CHECK pins user_id to the
-- caller, so nobody can write history in another agent's name.
--
-- No UPDATE, no DELETE, for anyone. first_touch_at and every accountability
-- number derive from this table; if a row could be edited after the fact, the
-- measurement would be an opinion. An owner cannot erase a missed lead here.
-- ---------------------------------------------------------------------------
drop policy if exists activity_select on activity;
create policy activity_select on activity
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or (person_id is not null and rcre_can_see_person(person_id))
    )
  );

drop policy if exists activity_insert on activity;
create policy activity_insert on activity
  for insert with check (
    organization_id = rcre_current_org()
    and user_id = rcre_current_user_id()
    and (person_id is null or rcre_can_see_person(person_id))
  );

-- ---------------------------------------------------------------------------
-- tasks — the one place an ordinary user legitimately writes.
--
-- An agent may create a task on a person they can see and assign it to
-- themselves or to someone in their scope, and may update a task assigned to
-- them (completing it). The UPDATE policy carries BOTH a USING clause (which
-- rows may be updated) and a WITH CHECK clause (what they may become) — without
-- the WITH CHECK, an agent could update their own task to belong to someone
-- else, or to another organization.
--
-- No DELETE: completing a task is the state change; deleting one removes the
-- evidence that it was ever owed.
-- ---------------------------------------------------------------------------
drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or assigned_user_id in (select rcre_scoped_user_ids())
    )
  );

drop policy if exists tasks_insert on tasks;
create policy tasks_insert on tasks
  for insert with check (
    organization_id = rcre_current_org()
    and (person_id is null or rcre_can_see_person(person_id))
    and (
      rcre_is_broker()
      or assigned_user_id in (select rcre_scoped_user_ids())
    )
  );

drop policy if exists tasks_update on tasks;
create policy tasks_update on tasks
  for update using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or assigned_user_id in (select rcre_scoped_user_ids())
    )
  ) with check (
    organization_id = rcre_current_org()
    and (
      rcre_is_broker()
      or assigned_user_id in (select rcre_scoped_user_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- appointments — FUB-owned mirror. Read scoped to the assignee; no writes.
-- ---------------------------------------------------------------------------
drop policy if exists appointments_select on appointments;
create policy appointments_select on appointments
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or assigned_user_id in (select rcre_scoped_user_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- deals — commission-bearing. Narrower than the rest on purpose.
--
-- rcre_is_broker(), NOT rcre_is_org_wide_reader(): staff coordinate leads and
-- appointments, and have no business reading what every agent in the brokerage
-- earns. A team lead sees their own team's deals through rcre_scoped_user_ids()
-- and no further.
-- ---------------------------------------------------------------------------
drop policy if exists deals_select on deals;
create policy deals_select on deals
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_broker()
      or owner_user_id in (select rcre_scoped_user_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- lead_snapshots — the raw inbound payload, verbatim, PII included.
-- Read follows the person; unlinked snapshots are org-wide-reader only.
-- Immutable by design: no write policies at all.
-- ---------------------------------------------------------------------------
drop policy if exists lead_snapshots_select on lead_snapshots;
create policy lead_snapshots_select on lead_snapshots
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or (person_id is not null and rcre_can_see_person(person_id))
    )
  );

-- ---------------------------------------------------------------------------
-- recruiting_prospects — CONFIDENTIAL. Read this block before changing it.
--
-- A recruiting prospect is, almost always, an agent currently licensed at
-- another brokerage who has spoken to RCRE in confidence. If an RCRE agent can
-- see that list, the harm is not a data-classification finding — it is a real
-- person's job. It travels: agents know each other, and the industry is small.
--
-- So the role list here is written out inline rather than hidden behind a
-- helper function. Anyone auditing this file can see exactly who is allowed,
-- in one line, without following an indirection: owner, broker, recruiter.
-- The word 'agent' does not appear in any policy on this table, and
-- tests/unit/rls-policy.test.ts fails the build if it ever does.
--
-- 0001 already separates this table from `people` for exactly this reason.
-- ---------------------------------------------------------------------------
drop policy if exists recruiting_prospects_select on recruiting_prospects;
create policy recruiting_prospects_select on recruiting_prospects
  for select using (
    organization_id = rcre_current_org()
    and rcre_current_role() in ('owner', 'broker', 'recruiter')
  );

drop policy if exists recruiting_prospects_insert on recruiting_prospects;
create policy recruiting_prospects_insert on recruiting_prospects
  for insert with check (
    organization_id = rcre_current_org()
    and rcre_current_role() in ('owner', 'broker', 'recruiter')
  );

drop policy if exists recruiting_prospects_update on recruiting_prospects;
create policy recruiting_prospects_update on recruiting_prospects
  for update using (
    organization_id = rcre_current_org()
    and rcre_current_role() in ('owner', 'broker', 'recruiter')
  ) with check (
    organization_id = rcre_current_org()
    and rcre_current_role() in ('owner', 'broker', 'recruiter')
  );

-- Deletion is a broker decision. A recruiter who is leaving should not be able
-- to empty the pipeline on the way out.
drop policy if exists recruiting_prospects_delete on recruiting_prospects;
create policy recruiting_prospects_delete on recruiting_prospects
  for delete using (
    organization_id = rcre_current_org()
    and rcre_is_broker()
  );

-- ---------------------------------------------------------------------------
-- webhook_events — raw FUB payloads. Everything FUB sent, unredacted.
--
-- Brokers only, and read-only. The ingestion role writes and updates these; a
-- user-facing connection has no reason to touch the ledger.
--
-- KNOWN LIMITATION, and it works in our favour: webhook_events.organization_id
-- is NULLABLE in 0001, because a webhook arrives before it has been resolved to
-- a tenant. NULL = rcre_current_org() is NULL, never TRUE, so unresolved rows
-- are invisible to EVERY user under RLS and reachable only by rcre_ingest. That
-- is the right default. It does mean an unresolved-webhook admin view cannot be
-- built on a user connection.
-- ---------------------------------------------------------------------------
drop policy if exists webhook_events_select on webhook_events;
create policy webhook_events_select on webhook_events
  for select using (
    organization_id = rcre_current_org()
    and rcre_is_broker()
  );

-- ---------------------------------------------------------------------------
-- audit_events — the audit of record.
--
-- Readable by owners and brokers. Insertable by any org member, but ONLY as
-- themselves: actor_user_id is pinned to the caller so no one can forge an
-- entry attributed to someone else, and actor_kind 'mcp' still carries the
-- human's id because the MCP server acts on a resolved user's behalf.
--
-- No UPDATE and no DELETE policy, for any role including owner. An audit log
-- that its subject can edit is not an audit log. Retention/rotation, if it ever
-- exists, is an rcre_ingest job with its own written approval.
-- ---------------------------------------------------------------------------
drop policy if exists audit_events_select on audit_events;
create policy audit_events_select on audit_events
  for select using (
    organization_id = rcre_current_org()
    and rcre_is_broker()
  );

drop policy if exists audit_events_insert on audit_events;
create policy audit_events_insert on audit_events
  for insert with check (
    organization_id = rcre_current_org()
    and actor_user_id = rcre_current_user_id()
  );

-- ---------------------------------------------------------------------------
-- hermes_tool_permissions — which MCP tools a role may call.
--
-- Any org member may READ it: an agent being told "you are not allowed to do
-- that" should be able to see the rule. Only a broker may change it, because
-- this table is the authorization surface for the MCP server — write access
-- here is write access to everything downstream of it.
-- ---------------------------------------------------------------------------
drop policy if exists hermes_tool_permissions_select on hermes_tool_permissions;
create policy hermes_tool_permissions_select on hermes_tool_permissions
  for select using (
    organization_id = rcre_current_org()
    and rcre_is_org_member()
  );

drop policy if exists hermes_tool_permissions_insert on hermes_tool_permissions;
create policy hermes_tool_permissions_insert on hermes_tool_permissions
  for insert with check (
    organization_id = rcre_current_org() and rcre_is_broker()
  );

drop policy if exists hermes_tool_permissions_update on hermes_tool_permissions;
create policy hermes_tool_permissions_update on hermes_tool_permissions
  for update using (
    organization_id = rcre_current_org() and rcre_is_broker()
  ) with check (
    organization_id = rcre_current_org() and rcre_is_broker()
  );

drop policy if exists hermes_tool_permissions_delete on hermes_tool_permissions;
create policy hermes_tool_permissions_delete on hermes_tool_permissions
  for delete using (
    organization_id = rcre_current_org() and rcre_is_broker()
  );

-- ---------------------------------------------------------------------------
-- teams — structure, not data. Any org member may read the team list.
-- Membership is a broker decision (0002: FUB is the source, a team lead cannot
-- appoint themselves).
-- ---------------------------------------------------------------------------
drop policy if exists teams_select on teams;
create policy teams_select on teams
  for select using (
    organization_id = rcre_current_org()
    and rcre_is_org_member()
  );

drop policy if exists teams_insert on teams;
create policy teams_insert on teams
  for insert with check (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists teams_update on teams;
create policy teams_update on teams
  for update using (organization_id = rcre_current_org() and rcre_is_broker())
          with check (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists teams_delete on teams;
create policy teams_delete on teams
  for delete using (organization_id = rcre_current_org() and rcre_is_broker());

-- ---------------------------------------------------------------------------
-- team_members — who is on which team, and who leads it.
--
-- Read is limited to teams the caller belongs to (via the SECURITY DEFINER
-- helper, which is what stops this policy recursing into itself). Writes are
-- broker-only: is_leader on this table is what grants a team lead their wider
-- visibility everywhere else, so a self-service write here would be a
-- privilege escalation, not a roster edit.
-- ---------------------------------------------------------------------------
drop policy if exists team_members_select on team_members;
create policy team_members_select on team_members
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or team_id in (select rcre_my_team_ids())
    )
  );

drop policy if exists team_members_insert on team_members;
create policy team_members_insert on team_members
  for insert with check (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists team_members_update on team_members;
create policy team_members_update on team_members
  for update using (organization_id = rcre_current_org() and rcre_is_broker())
          with check (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists team_members_delete on team_members;
create policy team_members_delete on team_members
  for delete using (organization_id = rcre_current_org() and rcre_is_broker());

-- ---------------------------------------------------------------------------
-- assignment_history — who held this lead, when, and via which routing hop.
--
-- Read follows the person. No write policy: every row is captured from a
-- peopleUpdated webhook by the ingestion role. 0002 is explicit that this table
-- is not backfillable and separates a routing delay (leadership's problem) from
-- a slow first touch (the agent's). If a user could write it, that separation
-- would be editable by the person it judges.
-- ---------------------------------------------------------------------------
drop policy if exists assignment_history_select on assignment_history;
create policy assignment_history_select on assignment_history
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or rcre_can_see_person(person_id)
      or to_user_id in (select rcre_scoped_user_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- stage_transitions — the funnel history. Same posture: read follows the
-- person, nothing writes but ingestion. Time-in-stage is only trustworthy if
-- the intervals cannot be adjusted after the fact.
-- ---------------------------------------------------------------------------
drop policy if exists stage_transitions_select on stage_transitions;
create policy stage_transitions_select on stage_transitions
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or rcre_can_see_person(person_id)
    )
  );

-- ---------------------------------------------------------------------------
-- person_engagement — the rollup behind "opened your email", "viewed three
-- listings". Read follows the person. Written by the rollup job (0002 says it
-- is maintained by the pipeline, not a trigger), so no write policy here.
-- ---------------------------------------------------------------------------
drop policy if exists person_engagement_select on person_engagement;
create policy person_engagement_select on person_engagement
  for select using (
    organization_id = rcre_current_org()
    and (
      rcre_is_org_wide_reader()
      or rcre_can_see_person(person_id)
    )
  );

-- ---------------------------------------------------------------------------
-- follow_up_policies / stage_aging_policies — brokerage policy.
--
-- Every org member may read them. An agent measured against a follow-up
-- standard is entitled to see that standard; an alert whose rule is invisible
-- to its subject is not accountability, it is surveillance.
--
-- Only a broker may write. These tables are deliberately EMPTY until RCRE
-- leadership fills in the policy sheet (0002), and "empty" must stay a decision
-- RCRE makes rather than a default anyone can quietly supply.
-- ---------------------------------------------------------------------------
drop policy if exists follow_up_policies_select on follow_up_policies;
create policy follow_up_policies_select on follow_up_policies
  for select using (
    organization_id = rcre_current_org() and rcre_is_org_member()
  );

drop policy if exists follow_up_policies_insert on follow_up_policies;
create policy follow_up_policies_insert on follow_up_policies
  for insert with check (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists follow_up_policies_update on follow_up_policies;
create policy follow_up_policies_update on follow_up_policies
  for update using (organization_id = rcre_current_org() and rcre_is_broker())
          with check (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists follow_up_policies_delete on follow_up_policies;
create policy follow_up_policies_delete on follow_up_policies
  for delete using (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists stage_aging_policies_select on stage_aging_policies;
create policy stage_aging_policies_select on stage_aging_policies
  for select using (
    organization_id = rcre_current_org() and rcre_is_org_member()
  );

drop policy if exists stage_aging_policies_insert on stage_aging_policies;
create policy stage_aging_policies_insert on stage_aging_policies
  for insert with check (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists stage_aging_policies_update on stage_aging_policies;
create policy stage_aging_policies_update on stage_aging_policies
  for update using (organization_id = rcre_current_org() and rcre_is_broker())
          with check (organization_id = rcre_current_org() and rcre_is_broker());

drop policy if exists stage_aging_policies_delete on stage_aging_policies;
create policy stage_aging_policies_delete on stage_aging_policies
  for delete using (organization_id = rcre_current_org() and rcre_is_broker());

-- ---------------------------------------------------------------------------
-- sync_state — cursors and backfill status. Operational. Brokers read it
-- (it is what a "when did this last sync" panel shows); only ingestion writes.
-- ---------------------------------------------------------------------------
drop policy if exists sync_state_select on sync_state;
create policy sync_state_select on sync_state
  for select using (
    organization_id = rcre_current_org() and rcre_is_broker()
  );

-- ---------------------------------------------------------------------------
-- integration_state — the kill switch, and the day history began.
--
-- Brokers may read, and may UPDATE — that is deliberate: writes_enabled and
-- connection_disabled_at must be flippable by a human under time pressure
-- without a deploy, which is exactly what 0002 says they are for.
--
-- No INSERT policy (one row per organization, created at provisioning) and no
-- DELETE policy (deleting the row would erase webhook_activated_at, and every
-- forward-only report clamps its window to that timestamp; losing it would make
-- reports silently claim a history they do not have).
-- ---------------------------------------------------------------------------
drop policy if exists integration_state_select on integration_state;
create policy integration_state_select on integration_state
  for select using (
    organization_id = rcre_current_org() and rcre_is_broker()
  );

drop policy if exists integration_state_update on integration_state;
create policy integration_state_update on integration_state
  for update using (
    organization_id = rcre_current_org() and rcre_is_broker()
  ) with check (
    organization_id = rcre_current_org() and rcre_is_broker()
  );

-- ===========================================================================
-- ROLES AND GRANTS
--
-- RLS filters rows. Grants decide whether the command is reachable at all.
-- Both are needed: a policy on a table the role cannot SELECT is decoration,
-- and a grant without a policy is a leak. Least privilege is expressed here as
-- "rcre_app is granted SELECT broadly, and INSERT/UPDATE on exactly the four
-- places a user legitimately writes".
--
-- Guarded so the migration still succeeds where the migration role may not
-- create roles. If these blocks raise a NOTICE, provisioning the roles is an
-- operational step and the environment is NOT correctly locked down until it is
-- done. On Supabase, substitute `authenticated` for rcre_app and `service_role`
-- for rcre_ingest.
-- ===========================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'rcre_app') then
    create role rcre_app nologin noinherit;
  end if;
exception
  when insufficient_privilege then
    raise notice 'rcre_app not created (insufficient privilege) — create it manually before serving traffic';
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'rcre_ingest') then
    create role rcre_ingest nologin noinherit;
  end if;
  -- BYPASSRLS is what lets the webhook receiver resolve a payload to a tenant
  -- before it knows which tenant it belongs to. Requires superuser to grant.
  alter role rcre_ingest bypassrls;
exception
  when insufficient_privilege then
    raise notice 'rcre_ingest not fully provisioned (insufficient privilege) — create it and grant BYPASSRLS manually';
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'rcre_app') then
    execute 'grant usage on schema public to rcre_app';

    execute 'grant select on
      organizations, users, people, attribution, activity, tasks, appointments,
      deals, lead_snapshots, recruiting_prospects, webhook_events, audit_events,
      hermes_tool_permissions, teams, team_members, assignment_history,
      stage_transitions, person_engagement, follow_up_policies,
      stage_aging_policies, sync_state, integration_state
      to rcre_app';

    -- The complete set of writes a user-facing connection may attempt. Anything
    -- not listed here is unreachable even before RLS is consulted.
    execute 'grant insert on activity, tasks, audit_events, recruiting_prospects to rcre_app';
    execute 'grant update on tasks, recruiting_prospects, integration_state,
                             follow_up_policies, stage_aging_policies,
                             hermes_tool_permissions, teams, team_members to rcre_app';
    execute 'grant insert on follow_up_policies, stage_aging_policies,
                             hermes_tool_permissions, teams, team_members to rcre_app';
    execute 'grant delete on recruiting_prospects, follow_up_policies,
                             stage_aging_policies, hermes_tool_permissions,
                             teams, team_members to rcre_app';

    execute 'grant execute on function
      rcre_current_org(), rcre_current_user_id(), rcre_current_role(),
      rcre_is_broker(), rcre_is_org_wide_reader(), rcre_is_org_member(),
      rcre_my_team_ids(), rcre_led_team_ids(), rcre_scoped_user_ids(),
      rcre_can_see_person(uuid) to rcre_app';
  end if;

  if exists (select 1 from pg_roles where rolname = 'rcre_ingest') then
    execute 'grant usage on schema public to rcre_ingest';
    execute 'grant select, insert, update on all tables in schema public to rcre_ingest';
  end if;
exception
  when insufficient_privilege then
    raise notice 'grants skipped (insufficient privilege) — apply them manually';
end $$;

-- The SECURITY DEFINER helpers must not be callable by roles that were never
-- meant to have them. They are org-scoped internally and cannot cross a tenant
-- boundary, but narrowing the surface costs nothing.
revoke execute on function rcre_my_team_ids()          from public;
revoke execute on function rcre_led_team_ids()         from public;
revoke execute on function rcre_scoped_user_ids()      from public;
revoke execute on function rcre_can_see_person(uuid)   from public;
