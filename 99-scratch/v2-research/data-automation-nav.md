# RCRE Platform V2 — Data model · Automation map · Navigation and screen map

**Status:** PLANNING PASS ONLY. No code, no migrations, no connections, no schema executed.
**Date:** 2026-08-26
**Author:** V2 planning agent (data / automation / navigation lane)
**Inputs read in full or in substantial part:** `CLAUDE.md` · `GOVERNANCE.md` ·
`06-decisions/ADR-LOG.md` + `adr/0004-automation-layer.md` ·
`apps/rcre/supabase/migrations/0001_rcre_mvp_core.sql`, `0002_reporting_and_routing.sql`,
`0003_row_level_security.sql` · `04-requirements/RCRE-REPORTING-DATA-MODEL.md` (structure) ·
`04-requirements/RCRE-PRODUCT-REQUIREMENTS.md` (structure) ·
`apps/rcre-demo/src/components/AppShell.tsx` + route inventory ·
all seven module designs in `99-scratch/v2-research/`.

Labels preserved per CLAUDE.md: **[VLR]** verified leadership requirement · **[DP]** design
proposal (ours, not approved, never to be described to RCRE as something they asked for) ·
**[TA]** technical assumption, believed but not verified.

---

# PART A — DATA MODEL

## A0. What exists today, stated exactly

**Migration 0001 — 13 tables.** `organizations` · `users` · `people` · `attribution` · `activity` ·
`tasks` · `appointments` · `deals` · `lead_snapshots` · `recruiting_prospects` · `webhook_events` ·
`audit_events` · `hermes_tool_permissions`.

**Migration 0002 — 9 tables** plus two columns on `activity`. `teams` · `team_members` ·
`assignment_history` · `stage_transitions` · `person_engagement` · `follow_up_policies` ·
`stage_aging_policies` · `sync_state` · `integration_state`.

**Migration 0003 — RLS across all 22.** FORCE RLS everywhere; per-command policies with no `FOR
ALL` anywhere; deny-by-default; append-only ledgers (`activity`, `audit_events`,
`stage_transitions`, `assignment_history`, `lead_snapshots`, `webhook_events`) carry no UPDATE and
no DELETE policy for any role including owner; `people`/`deals`/`appointments` carry no user-facing
write policy at all. Session context via three GUCs; **NO CONTEXT → NO ROWS**. Helper predicates:
`rcre_current_org()`, `rcre_current_user_id()`, `rcre_current_role()`, `rcre_is_broker()`
(owner|broker), `rcre_is_org_wide_reader()` (owner|broker|**staff**), `rcre_is_org_member()`,
`rcre_my_team_ids()`, `rcre_led_team_ids()`, `rcre_scoped_user_ids()`, `rcre_can_see_person()`.

**Note the 0003 header states the file has never been executed.** No Postgres instance is
provisioned. Everything below is therefore a design against source, not against a live database.

## A1. The honest headline: this is a large expansion and it must be sequenced, not shipped

0001's header contains a deliberate size defence: *"13 tables. This is deliberately not a 70-table
enterprise schema."* The seven module designs, taken literally and un-deduplicated, propose roughly
**60+ new tables**. That is a 3.7× expansion of the schema and it would silently repeal the size
discipline that 0001 wrote down on purpose.

Three responses, all of which I recommend:

1. **Deduplicate across modules first.** Four genuine collisions exist (A2). Resolving them removes
   ~8 tables and, more importantly, removes four places where two modules would have expressed the
   same fact differently.
2. **One migration per module, each with its own size-discipline defence in the header**, in the
   same voice as 0001 and 0002. `0004_markets_and_connections` · `0005_transactions` ·
   `0006_approvals_and_release` · `0007_content_library` · `0008_training_and_community` ·
   `0009_coaching` · `0010_recruiting_expansion` · `0011_attribution_and_spend` ·
   `0012_fub_integrity` · `0013_automation_and_alerts`, plus an RLS migration paired with each.
3. **Phase 1 is ~14 tables, not 60.** See A16.

## A2. Four cross-module collisions I am resolving here

These are the decisions the coordinator most needs from this lane, because two module designs each
invented a different answer and neither knew about the other.

### Collision 1 — `transactions` vs `deals` as the TC's scoping object

`transaction-coordinator.md` proposes a first-class RCRE-owned `transactions` table with
`tc_assignments`. `recruiting-roles.md` §B2.5 proposes scoping the TC off the FUB-mirrored `deals`
table via `deal_coordinators` + `coordinator_scopes`.

**Resolution [DP]: build `transactions` as a first-class RCRE-owned object. Do not hang TC scope off
`deals`.** Three reasons:

- `deals` is FUB-mirrored and has **no user-facing write policy by design** (0003). Every field a TC
  needs — critical dates, checklist state, document completeness, TC assignment — is RCRE-owned and
  cannot live there without breaking ADR-0012.
- **Whether RCRE uses FUB Deals at all is unverified** and is already an open question in the
  reporting data model. A module whose entire scoping mechanism depends on an unverified FUB feature
  is a module that may not exist on day one.
- A transaction can legitimately exist with no FUB deal (a referral, a listing that went under
  contract outside FUB, an agent who forgot to stage). The manual escape hatch is required.

`transactions.deal_id` is a **nullable** FK to `deals`; `transactions.person_id` is the client link.
`deal_coordinators` and `coordinator_scopes` are dropped in favour of `transactions.tc_user_id`
(the resolved assignment) + `tc_assignments` (the state/market routing rule). Two tables become one
column and one table.

### Collision 2 — three parallel approval ledgers

`transaction-coordinator.md` proposes `approvals` + `dispatches` + `outbound_artifacts`.
`content-training-coach.md` proposes `marketing_approvals` + `marketing_publications`, and
separately `curriculum_versions` + `curriculum_approvals`. `workspace-broker.md` §A7 describes a
third approval concept for FUB writes.

**Resolution [DP]: ONE approval ledger, N release tables.**

- `approvals` — polymorphic and immutable. `subject_type` (`marketing_asset_version` ·
  `transaction_artifact` · `curriculum_version` · `fub_write_intent` · `recruiting_outreach` ·
  `publicpreview_change` · `checklist_template_version`), `subject_id`, `subject_sha256`,
  `recipients jsonb` (nullable — only meaningful for dispatch subjects), `requested_by`,
  `approver_user_id`, `approver_role_at_approval`, `decision`
  (`pending|approved|changes_requested|rejected|revoked`), `decided_at`, `expires_at`, `reason`,
  `checklist jsonb` (the compliance-lint result, stored so the reviewer's evidence survives), `tier`
  (`self|tc|team_lead|broker|qualifying_broker`), `four_eyes_required boolean`.
  **No UPDATE and no DELETE policy for anyone.** Revocation is a new row. An approval, once granted,
  is a permanent fact. `CHECK (four_eyes_required = false OR approver_user_id <> requested_by)`.
- Release tables stay domain-specific, each with `approval_id NOT NULL` FK and a `CHECK` on the
  approval's `subject_type`: `dispatches` (transaction outbound) · `marketing_publications` (public
  content) · `outbound_writes` (FUB writes — see A12).
- Each release table has **no INSERT policy for any role**. The only writer is a `SECURITY DEFINER`
  function that re-validates: approval exists · matches the artefact hash *now* · approver held the
  required role at approval time · not expired · not revoked · outbound kill switch enabled.

Why one ledger rather than three: the mechanism is byte-identical in all three modules (immutable
version → approval bound to that exact version's hash → guarded release), the failure mode is
identical (approve A, send B), and three ledgers means three places for that bug plus three audit
surfaces a broker has to check. **Honest counter-argument to record:** a polymorphic `subject_id`
cannot carry a real foreign key, so referential integrity moves into the release-table CHECK and
into tests. I judge one auditable gate worth one lost FK. If the coordinator disagrees, the fallback
is per-domain approval tables that all share the same column vocabulary and the same
no-UPDATE/no-DELETE posture — but then a test must assert the vocabularies stay identical.

### Collision 3 — `market` as free text in three places

`teams.market text` (0002) · `recruiting_prospects.market text` (0001) · `transactions.market`
(proposed) · `marketing_asset_markets` (proposed) · `tc_assignments.market` (proposed).

**Resolution [DP]: promote `markets` to a first-class dimension and make everything FK to it.**
`markets` carries `name`, `state` (`AL|FL`), **`timezone` (IANA)**, `mls_names[]`,
`mls_attribution_required`, `brokerage_identification_block`, `licence_display_rule`, `is_active`.

The timezone column is not cosmetic. Florida is Eastern and Alabama is predominantly Central, so a
"5pm inspection deadline" is a different instant in Jacksonville and Birmingham. The deadline engine
cannot be correct without a per-transaction IANA zone, and the honest place to derive it is the
market. **[TA] RCRE's Alabama market timezone is assumed Central and is not verified.**

Seed markets named in the brief: Birmingham AL · Jacksonville / NE FL · Miami · Orlando (Stellar) ·
Gainesville. **[TA] I did not verify RCRE's actual MLS memberships per market** — treat the list as
a seed, not a fact.

### Collision 4 — recruiting assignment history

`recruiting-roles.md` asks for "assignment history for recruiting, same accountability logic as
leads." The tempting implementation is to make `assignment_history.person_id` nullable and add a
`recruiting_prospect_id`.

**Resolution [DP]: do not overload `assignment_history`. Add a separate
`recruiting_assignment_history`.** The reason is RLS, not tidiness. `assignment_history` is visible
to agents (scoped through `rcre_can_see_person()`); `recruiting_prospects` is inlined to
`('owner','broker','recruiter')` with a **build-failing test if `'agent'` ever appears in a policy
on it**. Putting both row classes in one table means one policy expression separates a confidential
recruiting record from an agent's own lead history — exactly the kind of single-predicate mistake
0003's header was written to prevent. Two tables, two policies, one build-failing test each.

---

## A3. New: transactions

| Table | Purpose | Key columns | Ownership | Backfill | RLS |
|---|---|---|---|---|---|
| `transactions` | The deal executing. Distinct from Pipeline (a person moving). | `organization_id`, `person_id` (nullable), `deal_id` (nullable FK to `deals`), `listing_ref` (nullable), `market_id` FK, `state`, `timezone` (denorm from market at creation — a market's zone must not silently rewrite a live file's deadlines), `side` (`buyer|seller|dual|referral`), `property_address`, `price`, `financing_type`, `status` (`intake|active|unassigned_tc|closing|closed|terminated`), `agent_user_id`, `tc_user_id` (nullable), `checklist_template_version_id` (bound at execution, never auto-migrated), `contract_executed_on`, `closing_date_cached`, `created_via` (`stage_webhook|deal_webhook|manual`) | **RCRE-owned.** Derives its existence from a FUB signal but holds no FUB-owned field except denormalised cache columns clearly named as such. | **Backfillable** for currently-live files (a human runs intake against the executed contract). Its *history* — who confirmed what, when — is forward-only. | New helper `rcre_can_see_transaction(uuid)` SECURITY DEFINER, org-filtered. owner/broker → all; team_lead → their led teams' agents' transactions; agent → own; TC → transactions whose `(state, market_id)` matches an active `tc_assignments` row **or** where `tc_user_id = self`; recruiter/viewer/marketing_admin/trainer → **none**. |
| `transaction_parties` | Who is on the file: co-op agent, lender, title, inspector, HOA, client. | `transaction_id`, `role`, `name`, `company`, `email`, `phone`, `is_client_party boolean` | RCRE-owned | Backfillable | Via `rcre_can_see_transaction()`. |
| `critical_dates` | The deadline engine's rows. | `transaction_id`, `date_code` (the ~21-slot vocabulary + `custom`), `due_at timestamptz`, `timezone`, `source` (`extracted|computed|manual`), `status` (`proposed→confirmed→satisfied\|waived\|missed\|superseded`), `confidence`, `citation jsonb` (page + text span), `rule_id`, `revision_of` (self FK), `confirmed_by`, `confirmed_at`, `satisfied_by_document_id` | RCRE-owned | **Forward-only for confirmations.** A date can be entered retroactively; who confirmed it and when cannot be. | Via `rcre_can_see_transaction()`. **No UPDATE policy that can change `status` from `confirmed` back** — a revision is a new row and the prior row moves to `superseded` through the same definer function. Silent date mutation is how disputes become unwinnable. |
| `date_rules` | How a computed date is derived. **Ships EMPTY.** | `checklist_template_version_id`, `date_code`, `anchor_code`, `offset int`, `direction`, `basis` (`calendar_days\|business_days`), `end_of_day_time`, `weekend_holiday` (`roll_forward\|roll_backward\|no_roll`) | RCRE-owned; **content is brokerage/legal input** | N/A (config) | SELECT: every org member (an invisible rule you are measured against is surveillance, not accountability — 0003's own reasoning). INSERT/UPDATE/DELETE: broker/owner. |

**Ships-inert pattern, reused deliberately.** `date_rules` empty = no dates computed = the TC types
them by hand — **and the deadline board, the queue, the escalation ladder and the broker exception
view all still work.** This is the same posture `follow_up_policies` and `stage_aging_policies`
already take, and 0002's header already defends it in as many words. It is the single most important
sequencing property in the transactions module: **useful on day one with zero legal input.**

## A4. New: transaction deadlines — see `critical_dates` above, plus escalation

| Table | Purpose | Notes |
|---|---|---|
| `escalation_policies` | T-7 / T-3 / T-1 / today / overdue → audience, per `date_code`. **Ships EMPTY; no rows, no alerts.** | RCRE-owned config. Same shape and same posture as `stage_aging_policies`. Requires a policy sheet from RCRE. RLS: read by org members, written by broker/owner. |

**Enforcement rule that must be technical, not textual:** an unconfirmed date may generate internal
reminders; it may **never** generate an outbound communication, an e-sign envelope, or a document
that states a deadline to any party. Implemented as a token resolver that returns only
`confirmed`/`satisfied` dates and **raises** otherwise (a template referencing an unconfirmed date
fails to render rather than rendering a guess), plus `CHECK (unconfirmed_date_refs = 0)` on the
artefact row.

## A5. New: transaction tasks

`transaction_tasks` — `transaction_id`, `checklist_item_id` (nullable), `critical_date_id`
(nullable), `owner_user_id`, `owner_role` (`agent|tc|broker|client|outside_party`), `title`,
`due_at`, `status`, `escalation_state`, `created_by`, `source` (`template|date_rule|manual|escalation`).

**RCRE-owned, and they must NOT be written into Follow Up Boss.** This is not stylistic. `tasks`
(0001, FUB-mirrored) feed reporting metric 12, *overdue follow-ups*, which is a **lead-accountability**
measure. Pushing "upload the signed disclosure" into FUB as a task would make TC paperwork
indistinguishable from client follow-up failure and would corrupt the metric leadership most wants
to trust. **Assert the exclusion with a test**, not a comment.

Forward-only. RLS via `rcre_can_see_transaction()`, plus an agent may always see and complete a task
whose `owner_user_id` is themselves.

## A6. New: documents · document templates

| Table | Purpose | Notes |
|---|---|---|
| `documents` | Every file on a transaction. | `transaction_id`, `document_type_proposed`, `document_type_confirmed` (null until a human confirms), `classification_confirmed_by/at`, `provenance` (`rcre_generated\|agent_upload\|client_upload\|email_ingest\|counterparty\|mls`), **`ai_processing_allowed` derived server-side from provenance, never user-settable**, `status` (`received\|draft\|out_for_signature\|partially_executed\|executed\|void`), `sha256`, `storage_ref`, `page_count`, `version`, `supersedes_document_id`, `contains_sensitive_flags jsonb`, `extraction jsonb` (see merge note). RCRE-owned. Forward-only in practice. |
| `checklist_templates` | State × side × property type × financing, versioned. | `state`, `side`, `property_type`, `financing_type`, `version`, `effective_from/to`, `approved_by_user_id` **NOT NULL to publish**, `approved_at`, `authority_note`, `is_published`, `items jsonb` (see merge note). **Ships with zero published templates.** |
| `transaction_checklist_items` | The instantiated per-transaction list. | `transaction_id`, `template_item_code`, `label`, `is_required`, `document_type`, `owner_role`, `due_rule_id`, `status` (`open\|satisfied\|waived`), `satisfied_by_document_id`, `waived_by`, `waiver_reason`, `is_ad_hoc boolean` |
| `outbound_artifacts` | A rendered, versioned, hash-bound thing that could leave the building. | `transaction_id`, `kind`, `version`, `body_ref`, `sha256`, `unconfirmed_date_refs int` with `CHECK = 0`, `created_by`, `state` (`draft\|submitted\|approved\|dispatched\|rejected\|superseded\|revoked\|expired`) |
| `dispatches` | The send record. | `outbound_artifact_id`, `approval_id NOT NULL`, `recipients jsonb`, `provider_message_id`, `result`, `dispatched_at`. **No INSERT policy for any role.** |

**Merge decisions [DP]:** `checklist_items` → a `jsonb` array on `checklist_templates` (templates
are versioned and immutable once published, so relational normalisation buys nothing and costs a
join on every intake). `document_extractions` and `inspection_findings` → an `extraction jsonb`
column on `documents` for v1; split into their own table only when re-extraction *history* becomes a
requirement. That removes 3 tables from the TC module's original 15.

**Completeness rule, deterministic and deliberately dumb:** a required item is satisfied **only**
when a document exists whose `document_type_confirmed` matches, whose `status` is terminal, and
whose classification was confirmed by a human. `document_type_proposed` never satisfies anything —
enforced by the join in the satisfaction query, so an unconfirmed document is invisible to
completeness *by construction*. Display "14 of 17 required · 3 missing: [named]". Never a
percentage, never a green tick. A count with the missing items named is a fact; a percentage is an
opinion.

**🚩 RLS does not protect the bytes.** `documents.storage_ref` points at object storage. Postgres
RLS governs the row, not the file. Document access must go through a server-side authorised endpoint
issuing short-lived signed URLs; a guessable static path is a leak regardless of what any policy
says. This is the same failure class as the `publicPreview` lesson-asset leak in the recruiting
design, and it deserves the same build-failing test.

## A7. Existing: `assignment_history` — what changes

**Nothing structural changes for leads.** The table is correct as written, including
`is_initial_receipt` / `is_final_agent`, which is what makes the three clocks separable (routing time
is a leadership problem, first-touch time is an agent problem; conflating them blames the wrong
person). Four additions:

1. **Do not extend it to recruiting.** Add `recruiting_assignment_history` instead (Collision 4).
2. **New `assignment_intents`** — a team lead distributing a lead is a *write*, and `people` has no
   user-facing write policy by design. Route it through an RCRE-owned intent row the team lead may
   INSERT, which the authorised FUB write path later executes. **Do not add an UPDATE policy to
   `people` to solve this** — that would break ADR-0012's "never blind-overwrite FUB".
   Columns: `person_id`, `to_user_id`, `requested_by`, `reason`, `state`
   (`pending|executed|failed|abandoned`), `executed_at`, `outbound_write_id`.
3. **Index for the routing clock.** The three-clocks report joins `attribution.captured_at` →
   `assignment_history.assigned_at where is_final_agent`. Add a partial index on
   `(organization_id, assigned_at) where is_final_agent = true`.
4. **RLS unchanged.** `assignment_intents` gets INSERT for broker/owner, and for `team_lead` only
   where the target user is in `rcre_scoped_user_ids()`. SELECT to the same set.

**Still forward-only, still not backfillable.** A lead assigned before webhook activation has no
recorded chain, only its current owner. Every report over it must clamp to
`integration_state.webhook_activated_at` and say so.

## A8. Existing: teams / team leads — what changes

`teams` + `team_members` (0002) already model exactly what leadership described, sourced from FUB
(`leaderIds` → `team_members.is_leader`, `teamLeaderOf` on a user). **Keep the FUB sourcing** — it is
what stops "who is a team lead" from drifting between two systems.

Changes:
1. `teams.market text` → `teams.market_id uuid references markets(id)` (Collision 3). Keep the text
   column during migration, then drop it.
2. **Add `teams.state`? No** — it comes from `markets`. But a team spanning two markets is possible
   and unmodelled; if that is real, `team_markets` is a join table. **[TA] unverified whether any
   RCRE team spans markets.**
3. **Escalation routing must respect the Alabama chain.** An Alabama alert goes to the team lead
   first and escalates to Julio/Taquilla after N hours. Otherwise the team-lead layer is bypassed and
   leadership receives everything — the exact problem they came to solve. That routing lives in
   `escalation_policies` + `alerts`, not in `teams`.
4. **[TA] Unverified that RCRE's Alabama team lead is modelled as a FUB team leader at all.** If not,
   `team_members.is_leader` must be settable in RCRE with an explicit provenance flag
   (`leader_source: fub|rcre`), or the whole team-lead layer is invisible.

## A9. New: TC assignment

`tc_assignments` — `organization_id`, `user_id`, `state`, `market_id` (nullable = whole state),
`is_primary`, `effective_from`, `effective_to`. RCRE-owned config. Backfillable.

Routing on transaction creation: match `state` + `market_id` → primary TC → set
`transactions.tc_user_id`. Multiple TCs, backup TCs and a TC covering two markets all fall out of
the data with no code change.

**Florida → Margie [VLR]** (Julio answered "Florida"). **🚩 Alabama has no named TC anywhere in the
record.** Design so the gap is visible: no matching row → `tc_user_id = NULL`, status
`unassigned_tc`, surfaced on the broker exception board with the reason stated in words, and the
agent's view says *"No coordinator assigned — you are covering coordination on this file"* with the
TC-owned checklist items reassigned to them and explicitly marked as such. **Never auto-assign to
Margie. Never silently drop TC-owned items.**

**Role decision, and it needs Jeremy [DP].** `recruiting-roles.md` recommends a new
`transaction_coordinator` enum value; `transaction-coordinator.md` recommends reusing `staff` plus a
`rcre_can_see_transaction()` helper to avoid revisiting every policy in 0003. **I recommend the new
enum value.** `ALTER TYPE ... ADD VALUE` is additive and non-destructive, and every existing policy
that enumerates roles denies unknown values by construction — so a new role starts with **zero**
access, which is the correct default. Reusing `staff` is worse than it looks, because
`rcre_is_org_wide_reader()` grants `staff` a brokerage-wide read of the client book, and a Florida TC
does not need Alabama's book. Getting to least privilege via `staff` means *narrowing* an existing
role, which is a riskier edit than adding a role with nothing.

Also add `marketing_admin` and `trainer` in the same `ALTER TYPE`, and add all three to the
build-failing forbidden-role test on `recruiting_prospects` alongside `'agent'`.

## A10. Communication metadata — mostly reuse, one new table

**Reuse `activity`.** It already carries kind · direction · occurred_at · summary-only ·
`delivery_status` (an enum that **cannot express `read`** — ADR-0014 in table form) ·
`delivery_updated_at`, with a unique index on `(org, fub_resource_type, fub_resource_id)`. Nothing
about the broker's requested "who has been contacted and who hasn't" needs a new table: it needs
`first_touch_at`, `last_outbound_at`, per-channel attempt counts, and `calls.outcome` — all already
derivable.

**One genuinely new table, and it exists because it has the opposite requirement:**

`transaction_messages` — `transaction_id`, `direction`, `channel`, `recipients jsonb`,
`subject`, `body_ref` (**full rendered artefact**), `attachments_manifest jsonb`, `provider_message_id`,
`delivery_result`, `dispatch_id`, `occurred_at`, `retention_until` (nullable = retain).

Why two stores: `activity` carries an explicit schema commitment — *"Summary only. Never store full
message bodies — this table feeds AI context."* Transaction correspondence has the opposite
requirement: an executed-document email trail is a **business record**. So `transaction_messages` is
**never joined into AI context by default**; only a specific, audited tool may read one. Retention is
legal input (AL and FL brokerage record-retention periods differ and I do not state either);
ships `null` = retain, with a documented place to set it.

**ADR-0014 consequences that must hold in every surface built on this data:** no "read" column, no
read icon, no "seen" state, ever. The vocabulary is `sent / delivered / undelivered / unknown`, and
`unknown` is the honest state for A2P long-code traffic. An inbound reply is the strongest available
signal and should be the visually strongest element in a row. An undelivered text is a bad phone
number — an agent *action item*, not an agent *failure*, and the wording must say so.

**Decline surfacing message contents.** RCRE never stores them; a broker investigating quality,
a complaint, or a legal hold opens the record in FUB, where they already have permission and where
the disclosure is FUB's. If leadership later insists otherwise it needs (a) a written decision by the
Qualifying Broker, (b) **notice to agents**, (c) a new ADR superseding the "no message bodies"
commitment, (d) exclusion from AI context by construction, (e) per-access audit. Recommendation:
decline.

## A11. New: content assets · content campaigns

**Content (7):** `marketing_assets` (canonical: `kind`, `title`, `slug`, `owner_user_id`, `origin`
(`rcre_library|agent_created|ai_drafted|imported`), `derived_from_asset_id` for fork lineage,
`is_public_facing`, `archived_at`) · `marketing_asset_versions` (**immutable**: `content jsonb`,
`media_ref[]`, `created_by`, `generation_id`, `parent_version_id`, `checksum`) ·
`marketing_asset_markets` (join to `markets`) · `brand_assets` (logos, headshots, per-state
brokerage identification and licence blocks, disclaimers, usage rules) · `marketing_generations`
(**provider-agnostic**: `route_label` free text — `openrouter:<model>`, `deepseek`, `minimax`,
`local`, `user_byo` — `prompt_ref`, `inputs jsonb`, `cost_note`; **no vendor name hard-coded
anywhere in schema, code, or UI copy**) · `marketing_performance` (`metric`, `value`,
`source_system`, `observed_at`, `confidence` ∈ `reported|derived|unavailable`) ·
`marketing_publications` (the **only** table that can represent "this is public"; trigger-guarded,
`approval_id NOT NULL`, `recalled_at`).

**Campaigns (4):** `marketing_campaign_templates` (`campaign_type`, `horizon_days`,
`audience_segment`, ordered `template_slots`) · `marketing_campaign_instances` (`template_id`,
`market_id`, `start_date`, `owner_user_id`, `state` ∈
`draft|awaiting_approval|approved|armed|running|paused|complete`) · `marketing_calendar_items`
(`instance_id`, `scheduled_for`, `channel_id`, `asset_version_id`, `state`, `skip_reason`) ·
`marketing_channels` (org config).

**Approval is not a column.** A `status` field can be flipped by any code path, any migration, any
hurried endpoint, any future AI action. The gate is structural: approval binds to one immutable
`asset_version_id`, and `marketing_publications` INSERT is guarded so it fails unless a live
non-revoked approved row exists for that exact version. Consequence, intentional: **editing an
approved asset silently de-approves it**, because the new version has no approval row. **Do not add
a "publish anyway" path for brokers.** If a broker wants it out, they approve it — same two clicks,
and it leaves a record.

Ownership: all RCRE-owned; nothing goes to FUB. Backfillable (the library can be seeded). The
approval *ledger* is forward-only.

RLS: `marketing_admin` may INSERT/UPDATE while `status='draft'`; **only a broker may transition to
approved**, enforced in a policy `WITH CHECK`, not in application code. Agents may fork and submit,
never edit a library original. `marketing_admin` sees recruiting **campaign aggregates** (spend,
clicks, cost per prospect) and **no prospect names, emails, phones or notes**.

## A12. New: FUB integrity tables (not in the brief's list, but required)

Three tables the module designs surfaced that nothing in 0001–0003 covers. I am flagging them
because omitting them produces silent data corruption rather than a visible gap.

| Table | Why it must exist |
|---|---|
| `person_id_aliases` (`fub_person_id`, `canonical_person_id`, `merged_at`) | `POST /v1/events` dedupes, and a FUB merge collapses two person ids into one. Without an alias table, history attached to the losing id detaches. `peopleDeleted` also cascades and deletes associated notes/calls/texts with no individual delete events. |
| `outbound_writes` (`person_id`, `field`, `new_value`, `requested_at`, `approval_id`, `status` ∈ `shadow\|pending\|confirmed\|unconfirmed\|failed`, `fub_status_code`) | **The documented FUB webhook payload carries no originating-system identifier.** RCRE therefore cannot tell its own writes from an agent's by looking at the webhook. Unhandled, RCRE counts its own stage write as *the agent updated the status* — corrupting status hygiene, one of the metrics leadership asked for. This ledger is also what makes the W1 "shadow writes" stage possible: *"here are the 214 writes we would have made, and the 3 that were wrong"* is the artefact that earns write authorisation at zero risk. |
| `sync_gaps` (`resource`, `fub_id`, `detected_at`, `resolved_at`) | Webhooks retry ~8 hours then the event is gone forever. The nightly gap detector compares FUB's `updated` against `last_synced_at`; a person updated in FUB but never resolved is a missed event. This is the only defence against the retry cliff. |

**[TA] every one of these rests on unverified FUB behaviour:** whether `GET /v1/people` supports an
updated-since filter (decides whether the reconcile sweep is cheap or a rolling re-read), whether
`PUT /v1/people` supports partial update or any concurrency control, and — most dangerously —
**whether `POST /v1/textMessages` sends a message or only logs one.** A "log the text I already
sent" path and a "send this text" path must never be the same code path, must never share a
permission, and must never share a UI control.

## A13. New: training assignments · community engagement

**🚩 Finding worth stating loudly: the Academy has no database representation at all today.** The
curriculum (14 courses / 181 lessons / 220 prompts / 29 handouts / 16 downloads / 2 playable videos /
3 `publicPreview` courses) lives entirely in TypeScript in the demo, and progress is client-local.
Everything the brief asks for — assignment, overdue detection, coaching signals, recruiting evidence
— needs a server-side curriculum first.

**Training (7):** `courses` (+ `curriculum_source` ∈ `ai_advantage|rcre_proprietary`,
`applies_to_states[]`, `public_preview`) · `lessons` (+ `lesson_kind` ∈
`video|recorded_call|document_walkthrough|tool_setup|workflow|reading|prompt_lab`) ·
`lesson_media` (**`consent_status`, `pii_review_status`, `redaction_applied`,
`uses_real_client_data`; playback gated until consent + PII review clear — a technical gate, not a
checkbox in a document**) · `training_assignment_rules` (`predicate jsonb`, `requirement`,
`due_rule`, `priority`, `active`) · `training_assignments` (`user_id`, `rule_id`, `assigned_at`,
`due_at`, `state`, `completed_at`, `waived_by`, `waived_reason`) · `training_progress` (per lesson) ·
`agent_lead_source_entitlements` (`user_id`, `source`, `granted_at`, `granted_by`).

Assignment must be **rule-based, not list-based** — a list goes stale the day someone joins.
Predicate dimensions: role · market · **state_licence (gates the AL/FL document walkthroughs — a
correctness requirement, not a nicety)** · team (reuse `teams`/`team_members`; do not invent a second
grouping) · `lead_source_entitlement` · `tenure_days` · `production_band` · manual include/exclude.

**The Zillow case, and it is the design's sharpest point.** Assigning Zillow training to anyone who
*has received* a Zillow lead is backwards — it trains the agent after they have fumbled their first
call. Fire on **entitlement**, before routing ever sends them one. Keep the `people.source`
derivation as a *safety net* that raises a Command exception when an agent receives a lead from a
source they were never entitled or trained for. That is a genuine management finding and costs
nothing extra.

**Never retroactively un-complete** a finished assignment when a rule changes.

**Community (2, minimal):** `community_posts` (`author_user_id`, `category`, `body`,
`lesson_id` nullable resolved server-side, `prompt_ref` nullable, `linked_assignment_id` nullable,
`is_pinned`) · `community_comments`. The demo's community is well-built and resolves lesson
references server-side so a post can never link to a lesson that is not real — preserve that.
**Do not add a second feed. Do not gamify with points or badges** — nothing in discovery asked for
it and it is exactly the feature creep the scope defence exists to stop.

**The two communities are different products.** In-product Community = RCRE agents only,
authenticated, org-scoped, behind RLS, carries brokerage procedure and real pipeline context. A
Skool community (proposed) = public, third-party, outside RCRE's control, **treat as public
forever**. The bridge is **one direction only**: a Skool member converts into a
`recruiting_prospects` row with `source='skool_community'`. Never sync internal → external. Public
Skool posts are public marketing and route through the same approval gate. **Building payments,
entitlement or subscription surfaces inside RCRE for a paid Skool tier is the SaaS layer ADR-0013
forbids** and would need its own ADR.

## A14. New: agent coaching signals

**7 tables:** `coach_knowledge_documents` (`doc_key`, `title`, `version`, `checksum`, `imported_at`)
· `coach_knowledge_sections` (`doc_key`, `section_path`, `heading`, `body`, `topic_tags[]`,
**`volatile boolean`**, **`applies_to`**, FTS index) · `coach_policy` (prohibited outputs, generated
at import) · `coach_diagnoses` (`user_id`, `period`, `stage` ∈ `new|producing|team_lead`,
`primary_bottleneck`, `secondary_bottleneck`, **`evidence jsonb` carrying the actual numbers and the
row references they came from**, `ninety_day_objective`, `priorities[3]`, `computed_at`) ·
`agent_goals` · `agent_scorecard` · `time_block_templates` + `time_blocks` (8 total with the split).

**Diagnosis is computed in SQL, not narrated by a model.** Every bottleneck in the corpus maps onto
data RCRE already derives: `people.first_touch_at` vs `assignment_history` (speed to lead) ·
outbound `activity` vs `appointments` (discovery) · `appointments` → `deals` (consultation) ·
`deals` + `stage_transitions` (execution) · `people.last_touch_at` at 30/60/90-day cohorts (database
follow-up) · `time_blocks` vs activity timestamps · overdue `training_assignments` (training gap) ·
`marketing_performance` → `attribution` (content not converting).

Hard cap: **one primary bottleneck, three priorities.** Not a dashboard of nine. Every coaching
statement carries its evidence reference. The model's job is voice and specificity over a diagnosis
it did not compute — **which is precisely what makes ADR-0011 safe here: a cheap or free model
degrades tone, never truth.**

**Enforcement, not instruction, on the two corpus hazards:**
- **Volatile sections stripped at import.** Law, MLS policy, buyer-agreement requirements,
  compensation rules, advertising rules, TCPA/consent rules, rates, fair housing guidance are marked
  `volatile: true` and the retrieval tool **excludes their factual claims**, returning the principle
  plus an explicit "verify current rule" marker. A model that never receives a stale rule cannot
  repeat one.
- **The NMLS trap.** The corpus is Jeremy's and instructs that mortgage marketing copy carry his
  NMLS number and CA licensure. RCRE agents are not Jeremy, are not loan originators, and are not
  licensed in CA. Mark those sections `applies_to: 'jeremy_only'` at import and **never surface them
  to an RCRE agent.** An RCRE agent's listing flyer carrying a mortgage NMLS number is a real
  advertising problem in two states.

Backfillable (the corpus imports; diagnoses recompute). RLS: an agent sees their own diagnosis.
**[Needs RCRE policy] whether a broker sees an individual agent's coaching diagnosis.** A coaching
conversation an agent knows is being read by their broker becomes a performance review, and the
corpus's candour depends on it not being one. **[DP]** broker sees the same computed signals in
Command (they already do — that is accountability) but not the agent's private coaching dialogue.

## A15. New: website attribution · ad attribution · integration connections · automation runs · approval queue

### Website attribution — mostly reuse

**Reuse `attribution`.** It already carries `landing_page`, `referrer`, `utm jsonb` (raw, verbatim),
`campaign/campaign_id/ad_group/creative/keyword/audience`, `platform_lead_id` (unique-indexed,
replay-safe), and `raw jsonb` — `gclid` belongs in `raw`. Nothing about a website lead needs a new
attribution table.

**Two new tables for the pre-conversion half [DP]:** `web_sessions` (first-party session id,
`first_landing_page`, `referrer`, `utm jsonb`, `gclid`, `market_hint`, `consent_state`,
`started_at`) and `web_events` (`session_id`, `kind`, `path`, `occurred_at`). At conversion the
session's attribution is copied into an `attribution` row.

**These are forward-only in the strictest sense.** `gclid` and the UTM set exist only in the inbound
request and **cannot be reconstructed from FUB afterwards** — the same lesson as `first_touch_at`.
Capture at the page or lose it forever.

**Privacy constraints that bind the design:** no personal or sensitive data in URL parameters;
consent state is a first-class field (GOVERNANCE §5, TCPA); and the session tables hold behavioural
data about people who have not identified themselves — they need a retention policy, and I do not
state one.

### Ad attribution — one concrete gap

**There is no `ad_spend` table anywhere in 0001, 0002 or 0003.** `attribution` records where a lead
came from; nothing records what it cost. Without cost, none of these can be computed: cost per lead ·
**cost per appointment set (the primary 90-day success metric)** · cost per closing · the Zillow
comparison that is the entire economic justification for the test.

`ad_spend_daily` — `organization_id`, `source`, `campaign_id`, `campaign`, `date`, `spend`,
`impressions`, `clicks`, `leads`, `entry_method` (`api|manual`). Fed from Meta/Google reporting APIs
or entered by hand. **Manual entry for 90 days is acceptable and far better than not measuring
cost.** Backfillable from platform reporting. RLS: broker/owner + `marketing_admin` (aggregates).

### Integration connections

**Keep `integration_state` exactly as it is.** It is FUB-specific, load-bearing, and referenced by
every report (`webhook_activated_at` is "the day history began"; `writes_enabled` is a data-level
kill switch independent of the env guard, so neither alone is sufficient). Do not generalise it.

**Add `integration_connections`** — `organization_id`, `provider` (`meta_ads|google_ads|gmail|
gcal|gdrive|esign|mail_transport|social_channel|gbp|…`), `display_name`,
**`credential_ref` (a NAME, never a secret — CLAUDE.md §4)**, `scopes[]`, `connected_by`,
`connected_at`, `last_verified_at`, `status` (`connected|degraded|revoked|never_connected`),
`health_note`. RCRE-owned config, backfillable. RLS: **owner only** for INSERT/UPDATE/DELETE;
broker read.

**🚩 Explicit prohibition to encode in the migration header: there is no Dotloop row.** The Dotloop
research is unambiguous — clause 2(k) of the Dotloop API Terms of Use (effective 2025-05-13)
prohibits AI/ML use and reaches inference via *"any other purpose"*; Dotloop has **no customer-own-data
carve-out** where Follow Up Boss does; and the API cannot download document content, has no
e-signature endpoint, and emits no document, task, or signature webhooks. **The prohibition attaches
to the acquisition pipe. RCRE never becomes a Dotloop API licensee, so clause 2(k) never binds RCRE
at all.** Dotloop stays a terminal, human-operated place executed paper goes to live.

### Automation runs

`automation_runs` — `organization_id`, `automation_key` (matching a code-side registry — carry
forward the registry discipline ADR-0004 explicitly preserves: every automation named, owned,
risk-rated, approval-gated), `lane` (`rcre_job|hermes_cron`), `trigger` (`schedule|event|manual`),
`started_at`, `finished_at`, `status`, `items_considered`, `items_acted`, `items_skipped`,
`error`, `correlation_id`. **Append-only: no UPDATE, no DELETE policy for anyone.** Forward-only.
RLS: broker/owner read.

`alerts` — and this one is not bookkeeping. Taquilla's Command surface is currently a **view**, not
a **workflow**: there is no acknowledge, no snooze, no escalate. An alert system that cries wolf gets
muted in week two and then the product has failed silently. Columns: `organization_id`, `rule_key`,
`subject_type`, `subject_id`, `audience_role`, `assigned_user_id`, `severity`, `reason_text`,
`evidence jsonb`, `state` (`open|acknowledged|snoozed|escalated|resolved|expired`),
`snoozed_until`, `escalated_to`, `first_raised_at`, `last_raised_at`, `dedupe_key`.
Anti-noise is enforced in the data: unique on `(organization_id, dedupe_key)` with a cool-off, and
suppression while the agent is still inside the policy window.

### Approval queue

Covered in A2 Collision 2. The "queue" is a **view over `approvals` where `decision='pending'`**,
filtered by the approver's role and tier — not a separate table.

## A16. Existing: `audit_events` — what changes

The table is correct and is the audit of record. Five additions, none breaking:

1. **`correlation_id uuid`** — so a lead's ingest → resolve → alert → escalation chain, or an
   artefact's draft → approve → dispatch chain, is one query rather than a reconstruction.
2. **An index on `(organization_id, target_type, target_id, occurred_at desc)`** — the transaction
   History tab is a human-readable projection of `audit_events` + `critical_dates` revisions +
   document versions in one timeline, and today there is no index that serves it.
3. **Paired rows on every FUB write:** `fub.write.requested` and `fub.write.confirmed|failed`,
   recording the FUB status code — **especially `204` on `POST /v1/events`, which means the lead
   flow was archived and the lead was IGNORED.** 204 looks like success to naive code and is a
   silent lead-loss mode; it must be logged as a failure and alerted.
4. **Manager reads are audited.** The agent inspector is a surveillance surface. Logging who looked
   at whose book protects both sides, costs almost nothing, and is the right posture for a licensed
   brokerage. Add a `read` effect convention for it — the `rcre_tool_effect` enum already has
   `read`.
5. **Promotion of a learner to a recruiting prospect writes an audit row with `actor_user_id`** — it
   is the moment a person who took a free course becomes someone a recruiter works, and RCRE's own
   public copy ("nothing here is scraped, purchased, or inferred") depends on that act being human
   and recorded.

**Unchanged and must stay unchanged:** append-only (no UPDATE, no DELETE policy for anyone including
owner), `detail jsonb` documented as **SUMMARY ONLY, no PII** — reference documents by id and hash,
never by content.

## A17. Phasing — the 14 tables that come first

**Phase 1 (buildable now, no legal input, no external verification):**
`markets` · `transactions` · `transaction_parties` · `critical_dates` · `date_rules` (empty) ·
`checklist_templates` (empty) · `transaction_checklist_items` · `documents` · `transaction_tasks` ·
`tc_assignments` · `approvals` · `outbound_artifacts` · `dispatches` (outbound kill switch OFF) ·
`alerts`. Plus the `ALTER TYPE` for three roles and `rcre_can_see_transaction()`.

**Phase 2 (unblocks measurement):** `ad_spend_daily` · `web_sessions` · `web_events` ·
`assignment_intents` · `outbound_writes` · `person_id_aliases` · `sync_gaps` · `automation_runs` ·
`escalation_policies` (empty) · `integration_connections`.

**Phase 3 (content + training + coaching):** the marketing 11, the training 7, community 2,
coaching 7-8.

**Phase 4 (recruiting expansion):** `recruiting_events` · `academy_learners` ·
`learner_identity_links` · `recruiting_assignment_history` · `recruiting_sequences*` ·
`recruiting_appointments` · `onboarding_*` · `recruiting_campaigns` + ~9 new columns on
`recruiting_prospects` (channel, constrained stage enum, score + reasons, next_action_*,
onboarding_step, license_state/number, markets[], consent and DNC fields, referred_by_user_id).

## A18. RLS rules that apply to every new table without exception

1. Every policy **begins** with `organization_id = rcre_current_org()`. No role — not owner, not a
   support account, not a reporting job — may return a row belonging to another organization. Role
   only ever *subtracts* visibility inside the tenant.
2. **Per-command policies only. No `FOR ALL` anywhere.** A command with no policy is denied.
3. **RLS enabled AND FORCED.** Without FORCE, connecting as the table owner disables every policy
   with no visible symptom.
4. **Append-only ledgers get no UPDATE and no DELETE policy for anyone**: `approvals`,
   `dispatches`, `marketing_publications`, `automation_runs`, `recruiting_events`,
   `transaction_messages`, `outbound_writes`.
5. **Release tables get no INSERT policy for any role** — a `SECURITY DEFINER` function is the only
   writer.
6. **Visibility for anything hanging off a transaction is expressed exactly once**, in
   `rcre_can_see_transaction()`, for the same reason 0003 gives for `rcre_can_see_person()`.
7. **New role values start with zero access** and must be added to the build-failing
   forbidden-role test on `recruiting_prospects`.
8. `canSeeWholeBrokerage()` in `src/lib/db/repository.ts` mirrors `rcre_is_broker()`; 0003 says if
   one changes the other must. Any predicate change ships in the same commit.
9. **RLS does not protect object storage.** Documents, lesson media and marketing media need
   server-side authorised, short-lived signed URLs plus a build-failing test that no public route can
   reach a restricted asset.

---

# PART B — AUTOMATION MAP

## B0. The rule that governs every row below

**Deterministic** means: computed in code from data, identical for every user on every provider,
identical in the UI and in the audit log, and never passed through a model that could "helpfully"
adjust it. ADR-0011 makes model quality *unguaranteed by design* — an agent may be on a free 7B
model — so a metric whose value depends on which provider someone configured is not an
accountability metric, it is an opinion.

Three standing rules:

- **Anything touching accountability, deadlines, compliance or money is deterministic.**
- **Anything client-facing requires a recorded human approval before it can leave the building.**
- **No deterministic decision may take model output as an input.** If a compliance gate ever starts
  consuming a model's classification, the entire identity and approval model becomes advisory. The
  model may *flag*; it may never *clear*.

Lanes, per ADR-0004 as revised: **RCRE in-app jobs** for deterministic business logic (SLA timers,
scoring, digests, hygiene, the event bus) — these must run server-side regardless of whether any
agent's machine or any Hermes session is alive. **Hermes cron** for agent-facing narrative delivery.
**Not n8n.**

## B1. The seventeen events

### 1 · New FUB lead
- **Trigger** FUB webhook (`peopleCreated` / event-class webhooks), or `POST /api/leads` for an
  RCRE-generated lead.
- **System of record** FUB (ADR-0012).
- **AI** None in the path. AI may draft a first-touch message **only on agent request**
  (`draft_follow_up`, effect `draft`, sends nothing).
- **Deterministic** Verify HMAC → persist to `webhook_events` → **200 within FUB's 10-second
  window** → resolve out of band by re-fetching the authoritative record (the payload carries IDs
  only, which is what makes out-of-order safe) → upsert `people` → write `lead_snapshots` +
  `attribution` → `assignment_history` row with `is_initial_receipt` → start the three clocks
  (routing / agent response / lead experience) → alert eligible agents. For two Alabama agents,
  **simultaneous push, first-to-touch owns** — round-robin manufactures a queue where none is needed.
- **Approval** None to ingest. RCRE-originated leads go to FUB via `POST /v1/events` **never**
  `POST /v1/people`, with `campaign.source` always set; that write is itself approval-gated (stage
  W4).
- **Result** Person + snapshot + attribution + assignment row + in-app/push alert + a Today item with
  a stated reason. **A `204` on the lead event means the lead flow was archived and the lead was
  dropped — treat as failure, alert immediately.**

### 2 · Lead not contacted
- **Trigger** RCRE in-app job, every N minutes.
- **SoR** RCRE, derived from the FUB mirror.
- **AI** None for detection. The morning briefing may narrate it; the model may not produce the
  number.
- **Deterministic** Two distinct classes, worded differently in the UI:
  (a) **Never contacted** — `first_touch_at IS NULL`. No policy, no threshold, no accumulated
  history needed. Day one. The most valuable signal in the product and the one to ship first.
  (b) **Overdue against standard** — `now() - assigned_at(final agent) > follow_up_policies.first_attempt_minutes`.
  **`follow_up_policies` ships empty; with no rows this alert does not fire, and that is correct
  behaviour, not a bug.** The clock starts at the **final** agent's assignment, not at brokerage
  receipt — routing delay is a leadership problem, not an agent problem.
- **Approval** None to alert. Any message to the lead requires approval.
- **Result** `alerts` row with acknowledge/snooze/escalate state · Command exception · agent Today
  item · escalation ladder team lead → broker. **RCRE alerts; RCRE does not reassign** — writes are
  unauthorised and escalation means a human is told, not that ownership moves.

### 3 · Stage aging
- **Trigger** Nightly job.
- **SoR** RCRE `stage_transitions` (forward-only; FUB keeps no stage history and no endpoint can
  recover it later).
- **AI** None.
- **Deterministic** Days in current stage from the last webhook-detected transition; compare to
  `stage_aging_policies`, **keyed on the FUB stage id, never a display string** — a rename would
  otherwise silently disable every aging alert. Exclude `detected_via='backfill'` rows from
  time-in-stage averages. Clamp the window to `integration_state.webhook_activated_at` and state the
  earliest valid date on the surface. Empty policy = no alert.
- **Approval** None.
- **Result** `alerts` + Command row. **`Under Contract` is excluded** — time there is the length of
  an escrow, not a performance signal. What matters there is a contingency date passing, which is
  event 7's job.

### 4 · Under contract
- **Trigger** `peopleStageUpdated` into a contract-class stage, **or** `dealsCreated`/`dealsUpdated`
  into one, **or** a human creates it manually. Build path 1 and 3 first — path 1 works regardless of
  whether RCRE uses FUB Deals, which is unverified.
- **SoR** FUB for the stage; **RCRE for the transaction**.
- **AI** None. Transaction creation is deterministic, never model-decided.
- **Deterministic** Create `transactions` in status `intake` with **no dates and no checklist — it
  does not guess.** Resolve `tc_user_id` from `tc_assignments` on `(state, market_id)`. No match →
  `unassigned_tc`, surfaced on the broker exception board with the reason in words. **Never
  auto-assign to Margie.**
- **Approval** None.
- **Result** Transaction created · TC queue "New — needs intake" · agent notified · Pipeline
  `Under Contract` card gains a transaction chip showing the next critical date · contact record
  gains a Transaction card.

### 5 · New transaction (intake)
- **Trigger** Human opens intake in the TC queue.
- **SoR** RCRE.
- **AI** Extraction **proposal only** — parties, price, effective date, closing date, financing type,
  EMD amount, each with a page and text-span citation and a confidence value. Runs **server-side
  only** with **no tools available**, guarded first by `ai_processing_allowed` (derived from
  provenance), a bank/routing sensitive-pattern scan, and a file-type/page cap. A refusal is logged
  and explained in words.
- **Deterministic** **Nothing is applied until a human confirms it, field by field.** `date_rules`
  then *propose* computed dates carrying their rule id; the TC confirms each; any date the rules
  cannot produce is entered by hand as `manual`. The checklist instantiates from the **published
  template version in force at contract execution** and **binds** to that version — it never
  auto-migrates, because a file audited in 2028 must show the checklist that applied in 2026.
  Tasks fan out to agent and TC.
- **Approval** Confirmation is the act (TC, or agent where there is no TC). Broker approval not
  required for intake.
- **Result** Confirmed dates · instantiated checklist · tasks · an agent notification listing exactly
  what they owe and when. With **zero published templates**, intake offers a blank checklist the TC
  builds by hand and can save as a draft template — the honest path from Margie's practice to RCRE's
  template.

### 6 · Inspection received
- **Trigger** Document uploaded, dragged in, phone-camera capture, or a per-transaction ingest
  address.
- **SoR** RCRE.
- **AI** Extraction of findings (system-by-system, severity as **the report's own
  characterisation**, each with page + span) and drafting of the email body.
- **Deterministic** **Every dollar amount is typed by a human.** The item list may be pre-populated
  from extracted findings; the numbers are not. Deadline tokens resolve only `confirmed` dates and
  the render **raises** otherwise. Compliance lint **blocks** on protected-class language, legal-advice
  phrasing, promissory language and any bank/routing pattern. The draft shows, side by side, which
  sentences came from extraction (clickable to the page in the PDF), which from the agent's typed
  input, and which from the template — this is the step ChatGPT structurally cannot offer.
  **Explicitly not produced:** cost estimates, safety or code characterisations, contract
  interpretation, or a recommendation about what to request.
- **Approval** Internal email to the TC = **agent self-approval, one click**, hash-bound, logged —
  this tier must stay fast or it loses to the ChatGPT flow it is replacing. The repair addendum or
  inspection response that goes to the other side and contains amounts = **broker tier, four-eyes**.
- **Result** The TC receives **structured work, not prose**: transaction · deadline · requested items
  · amounts · source PDF. *ChatGPT gives Taquilla a better email; RCRE gives Margie a better inbox.*
  **V1 with zero send risk:** open a fully prefilled draft in the agent's own mail client.

### 7 · Deadline approaching
- **Trigger** RCRE in-app timer job. **Must run server-side regardless of any Hermes session,
  machine or provider being alive** — a missed inspection deadline is an E&O event.
- **SoR** RCRE `critical_dates`.
- **AI** **None.** Not narration, not selection, not ordering.
- **Deterministic** T-7 / T-3 / T-1 / due today / overdue per `date_code`, audience per
  `escalation_policies` (ships empty; no rows, no alerts). **Timezone-aware from the transaction's
  own IANA zone** — a 5pm deadline is a different instant in Jacksonville and Birmingham. Only
  `confirmed`/`satisfied` dates drive obligations; a `proposed` date may raise an internal reminder
  and nothing else.
- **Approval** None to alert. Any outbound derived from the date is gated per event 6.
- **Result** Alerts to agent / TC / broker per the ladder · TC queue rail counts ("Deadlines today /
  overdue", "this week") · overdue rolls onto the broker exception board.

### 8 · Missing document
- **Trigger** Nightly, plus on every checklist or document change.
- **SoR** RCRE.
- **AI** None.
- **Deterministic** A required item is satisfied **only** when a document exists whose
  `document_type_confirmed` matches, whose status is terminal, and whose classification was confirmed
  by a human. `document_type_proposed` never satisfies. Waivers show as **waived**, never as
  satisfied, everywhere in the UI and in every export.
- **Approval** A waiver requires a reason, an approver of the role the item specifies, and a
  timestamp.
- **Result** "14 of 17 required · 3 missing: [named]" — never a percentage alone, never a green tick,
  never "looks complete." TC rails "Ready to close" and **"File incomplete — closed"** (the
  compliance tail nobody has time for, which is exactly why it should be a standing queue rather than
  a report someone remembers to run). Agent "You owe" panel.

### 9 · Training assigned
- **Trigger** Rule re-evaluation on any change to role, team, market, state licence, tenure, or
  **lead-source entitlement**. Not a list.
- **SoR** RCRE.
- **AI** None.
- **Deterministic** Predicate match → `training_assignments` with `due_at` from the rule.
  `state_licence` gates the AL/FL document walkthroughs. **Entitlement fires the Zillow track before
  routing ever sends that agent a Zillow lead**, with the `people.source` derivation kept as a safety
  net that raises a Command exception if an agent receives a lead from a source they were never
  entitled for. **Never retroactively un-complete** a finished assignment.
- **Approval** None for internal assignment. Publishing new curriculum is a supervisory act →
  broker approval. **Flipping `publicPreview` requires broker approval; a trainer may only propose
  it** — it is the switch that turns paid content free.
- **Result** Assignment · one Today item · Training-of-the-Day eligibility.

### 10 · Training overdue
- **Trigger** Nightly.
- **SoR** RCRE.
- **AI** None for the fact. The coach may use it as the *explanation* for a conversion bottleneck.
- **Deterministic** `due_at < now()` and required lessons incomplete.
- **Approval** None. Waivers are logged with a reason — a broker who cannot waive will stop trusting
  the list.
- **Result** Agent Today: **one item, not a nag list.** Command: an exception row **in a section
  separate from lead accountability.** Burying "3 unanswered leads" among "9 overdue trainings"
  damages the product's actual value, and leadership's P0 is leads.

### 11 · New recruit
- **Trigger** An explicit recruiting action (Join-page form, "talk to a broker", referral submitted,
  meeting request) **or** a human recruiter/broker promoting a learner after reviewing their signals.
- **SoR** RCRE, confidential. **Never written to FUB** — recruiting is not the client CRM.
- **AI** **None in promotion. Never auto-promote on behaviour alone.** A licensed agent who took a
  free course did not consent to being worked by a recruiter, and RCRE's own copy — *"nothing here is
  scraped, purchased, or inferred"* — has to stay true.
- **Deterministic** Score recomputed from stored, dated reasons. `do_not_contact` excludes entirely;
  no consent = manual outreach only. Assignment to a recruiter with a next action and a real due
  date. **No fair-housing-adjacent or protected-class input, ever** — no inference from name, photo,
  neighbourhood, school, language or "culture fit". **Never scrape or repurpose an MLS agent roster.**
- **Approval** Promotion writes an `audit_events` row with `actor_user_id`. Any outbound contact is
  **draft-only** and broker-approved.
- **Result** `recruiting_prospects` row · recruiter queue position · Command "recruits who need
  attention".

### 12 · Academy engagement
- **Trigger** A learner event: lesson or course completion, community post or reply, join-page view,
  live-session attendance, return visit.
- **SoR** RCRE.
- **AI** None.
- **Deterministic** Append to `recruiting_events` (**append-only, no UPDATE, no DELETE**). Identity
  link with a stored `confidence` and `linked_by`. Score deltas each with a reason and a date;
  **decay −1/day after 14 days of silence; hard reset to nurture at 60 days.** The score orders a
  queue; it **never** auto-sends, auto-promotes or auto-disqualifies.
- **Approval** Promotion to prospect is a human act (event 11).
- **Result** The journey timeline (the Nia pattern, which is the education-to-recruiting funnel drawn
  end to end) · queue ordering · channel ROI. **Paid-content enforcement is at the data layer:**
  public and anonymous requests resolve lessons through a query filtering on the course's
  `publicPreview` **before any lesson row is returned** — a component-level check is one refactor
  away from a leak — and restricted assets are served via signed, expiring, authenticated URLs.

### 13 · Content approval
- **Trigger** An agent or marketing_admin submits an asset version.
- **SoR** RCRE.
- **AI** May draft the asset. **May run no gate.**
- **Deterministic** Compliance lint runs **before submission is permitted** and its checklist is
  stored on the approval row so the reviewer's evidence survives. Checks: protected-class terminology
  and proxies · steering patterns · unsupported claims · fabricated proof · missing brokerage
  identification for the **target market** · missing agent licence number · missing MLS attribution
  on listing-derived content · mortgage language in a Realtor asset (the NMLS trap) · unverified
  rate or market statistic. **The lint never passes anything — it raises flags; a human decides.**
  Approval binds to one immutable `asset_version_id` + checksum. **Editing an approved asset silently
  de-approves it.** A fork does not inherit approval; the reviewer sees a **diff against the approved
  parent** (which is the only reason a broker will tolerate the gate at volume), with personalisation
  tokens excluded from the diff — changing your own phone number should not trigger a compliance
  review.
- **Approval** **Broker.** Default: everything public-facing routes to a broker. **No "publish
  anyway" path.** Over-gating is recoverable; under-gating publishes unreviewed real-estate
  advertising in two regulated states.
- **Result** A `marketing_publications` row (trigger-guarded) or `changes_requested`, always audited.

### 14 · Scheduled community / calendar post
- **Trigger** A morning RCRE in-app job walking due `marketing_calendar_items`.
- **SoR** RCRE.
- **AI** None at dispatch time.
- **Deterministic** An instance may be **`armed` only when every calendar item references a live
  approved version** — enforced as a check, not a hope. **Any item edited or regenerated after arming
  drops to `awaiting_approval` and is SKIPPED on its date with a visible `skip_reason`.** It is never
  silently published and never silently dropped. Pause/resume at instance level; a paused instance
  skips with a reason.
- **Approval** The 30/90-day plan is approved **up front as one packet** with a diff view — reviewing
  30 items one at a time will not happen — writing an approval row for each version plus a plan
  approval. Re-approval on any edit.
- **Result** Item → `ready`. **Nothing sends in the MVP.** "Published" means handed to a human who
  presses the button in the channel, until channel publishing is separately authorised — and **the UI
  must say so**, because an autopilot that implies it posted when it did not is exactly the fake
  functionality the goal document forbids.

### 15 · New website lead
- **Trigger** `POST /api/leads` from an RCRE-controlled landing page.
- **SoR** RCRE captures; FUB becomes system of record on delivery.
- **AI** None.
- **Deterministic** Capture the **full** attribution set at the page — UTM set verbatim, `gclid`,
  campaign / ad group / creative / keyword / audience, landing page, referrer — because **these exist
  only in the inbound request and cannot be reconstructed from FUB afterwards.** Consent state is a
  first-class captured field. Forward to FUB `POST /v1/events` with `campaign.source` always set;
  **treat `204` as delivery failure and alert.** Then event 1's routing applies.
- **Approval** None to ingest. No auto-reply send.
- **Result** Person + attribution + snapshot + simultaneous-push alert. **A real advantage worth
  naming:** for RCRE-generated leads the response clock starts at RCRE's own capture point, so paid-lead
  response time is measurable more reliably than organic, and from day one of spend rather than from
  webhook activation.

### 16 · Ad lead (Meta / Google)
- **Trigger** Meta: FUB's **native** Facebook Lead Ads integration delivers the lead; RCRE's optional
  **additive** Meta webhook enriches `attribution` matched on `platform_lead_id` (unique-indexed,
  replay-safe) or email+phone. Google/YouTube: **no native path exists** — capture at an
  RCRE-controlled landing page per event 15.
- **SoR** FUB for the person; RCRE for attribution and spend.
- **AI** None.
- **Deterministic** Enrichment is **additive — if it breaks, the lead is still delivered**, and that
  asymmetry is the whole point. A dedicated FUB `source` string per campaign family plus a redundant
  tag, so leadership can see paid vs organic without anyone running SQL. **No new pipeline, no
  parallel CRM** — agents work out of a single CRM. `ad_spend_daily` joins to produce cost per lead
  and cost per appointment set.
- **Approval** Spend is a GOVERNANCE §4 gate. Targeting must satisfy housing-category rules, which
  are applied to a housing advertiser whether or not they declare the category.
- **Result** Enriched attribution + real cost metrics.
  **🚩 Two spend-blocking items outside this lane:** Meta Lead Ads deliver against a Facebook *Page*
  and FUB's integration is configured per-Page — if the campaigns run from a different ad account,
  Page Partner access must be settled first **or leads can be generated that never reach RCRE's FUB
  at all** [TA, unverified in the actual ad account]. And the RESPA question — a mortgage originator
  paying for advertising that generates real-estate leads for a brokerage — is a **counsel gate that
  blocks spend and lands on both parties**. Neither is a technical decision.

### 17 · Google Business Profile content
- **Trigger** A scheduled `marketing_calendar_items` row, per market (Jeremy's stated direction in
  the 2026-08-26 meeting: automate the brokerage GBP in both locations alongside daily/weekly
  SEO/AEO/GEO blog posts specialised for NE Florida, Miami and Birmingham). **Label this [DP] — it is
  Jeremy's proposal, not something RCRE leadership requested.**
- **SoR** RCRE holds the asset; Google holds the publication.
- **AI** May draft.
- **Deterministic** It is **public marketing**, so: compliance lint · brokerage identification and
  licence display correct **for the target market** · MLS attribution if listing-derived · no
  fabricated market statistics · no neighbourhood-quality or school-rating language.
- **Approval** **Broker, no exception.** Publishing to a connected channel needs its own explicit
  authorisation; until then the approved asset is handed to a human.
- **Result** Approved, market-correct asset ready for publication, with the publication recorded only
  if it actually happened.
  **🚩 Could not verify:** whether RCRE controls its Google Business Profiles, how many there are, or
  whether GBP posting is in scope for V2 at all. Also unverified: whether the MLS licences permit
  listing data or derived statistics to be used in AI-generated public content — that sits underneath
  both the blog engine and the site assistant, both of which leadership has already been shown.

## B2. What is explicitly NOT automated

- **No send tool exists anywhere in the AI path.** `send_email`, `send_sms`, `send_for_signature`,
  `execute_document`, `sign_document`, `set_critical_date`, `confirm_document_type`,
  `waive_checklist_item`, `approve_artifact`, `release_earnest_money`, `disburse_funds`,
  `send_wire_instructions`, `update_wire_instructions` all belong on the forbidden-tool list, asserted
  by test. A tool that does not exist cannot be invoked, jailbroken, or argued into running.
  **Approval is never an MCP tool** — a human approves in the RCRE UI, authenticated, or not at all.
- **No auto-reassignment of leads.** Escalation tells a human.
- **No auto-promotion of a learner to a recruiting prospect.**
- **🚨 No wire instructions, bank details, or payment routing, in any direction, ever.** No tool. No
  approval unlocks it. Inbound email containing them is never auto-forwarded, and a document detected
  to contain bank-routing patterns is excluded from AI processing and from any auto-forward path.
  Real-estate wire fraud is the highest-severity loss event in this industry and the attack vector is
  a plausible email in a live transaction thread — precisely the artefact the transactions module
  produces.
- **Credential separation:** the drafting and extraction service holds **no** credentials for the
  e-sign provider or the mail transport. Only the dispatcher, a separate service identity, does. A
  prompt injection inside a counterparty PDF cannot reach a credential that is not in the process.
- **Kill switches default off:** `RCRE_ALLOW_OUTBOUND` and `RCRE_ALLOW_FUB_WRITES` (env) plus
  `integration_state.writes_enabled` (data). Two independent mechanisms, neither alone sufficient,
  and tests assert every path refuses while gated.
- **Unattended system work runs as a system actor**, not under a human's credential.
  `audit_events.actor_kind` already accepts `'system'`. Attributing a 07:00 sweep to Taquilla
  corrupts the audit log and makes "who did this" unanswerable.
- **🚩 One open conflict with ADR-0011 that needs a decision and probably an ADR:** ADR-0011 says
  agents bring their own provider and RCRE prefers free/local. **A purchase contract cannot be sent to
  an agent's personal consumer AI account.** Transaction document processing therefore needs an
  **RCRE-controlled, server-side inference path** with a real data-processing posture — configured per
  organisation, still provider-agnostic, and **never** the agent's BYO subscription. That carries a
  cost implication ADR-0011 was written to avoid. A related question: ADR-0011's routing options may
  execute inference **outside the United States**, which is a standing design question for any
  regulated RCRE data regardless of vendor.

---

# PART C — NAVIGATION AND SCREEN MAP

## C0. Where navigation is today

`apps/rcre-demo/src/components/AppShell.tsx` carries exactly two navigation sets and a hard redirect
(`if (user.role !== 'broker') redirect('/today')`):

- **`AGENT_NAV` (7):** Today · RCRE AI · Contacts · Pipeline · Listings · Marketing · Training
- **`BROKER_NAV` (6):** Command · RCRE AI · Recruiting · Agents · Contacts · Pipeline

Routes that exist: `/today` `/assistant` `/crm` `/crm/[id]` `/pipeline` `/listings` `/listings/[id]`
`/marketing` `/training` `/training/classroom/*` `/training/community` `/command`
`/command/reporting` `/agents` `/agents/[id]` `/recruiting` `/recruiting/[id]` `/join` `/login`.

The demo's two-role model must become the full role set with per-role nav and landing routes. **A
Transaction Coordinator persona is the single most valuable demo addition** — it is the newest,
most concrete role and it demonstrates the permission model better than any diagram.

**🚩 Demo-data collision to fix before that:** the demo has an agent named "Margie Olsen-Alvarez,
REALTOR®" (`u-margie`). The real Margie is Florida's transaction coordinator. Rename the demo agent
or recast the persona as the TC, or the TC demo contradicts itself on screen.

## C1. The test I applied to every top-level candidate

A capability earns top-level navigation only if it satisfies **all three**:

1. **Cadence** — someone in that role opens it daily or near-daily.
2. **Queue semantics** — it holds work with its own arrival, ordering and completion, so it can be
   *empty* and that means something.
3. **Not an attribute of an object that already has a home** — if it is best reached *through* a
   contact, a listing, or an agent, it is a tab, not a section.

Anything failing the test nests, and I say where. Ceiling: **7 items for any role.** Taquilla's
complaint was literally *"I don't want to have to go through so many funnels"* — every extra item is
the thing she is asking to remove.

## C2. Agent — 7 items (same count as today, one swap)

**Today · RCRE AI · Contacts · Pipeline · Transactions · Marketing · Training**

**Added: Transactions.** Justified against all three tests. Cadence: daily while a file is live.
Queue: "You owe" is a real, emptiable list with contractual deadlines. Not an attribute: a
transaction has a **different clock** (contractual dates, not stage aging), a **different failure
mode** (a missed date, not silence), and a **different owner** (the TC, not the agent). It cannot be
a Pipeline tab because Pipeline answers *is this person progressing* while a transaction answers
*will this close on time and is the file complete* — and it must be reachable when the person record
is not the thing at hand. It is also the module's E&O surface, which is not a place to add a click.

**Removed from top level: Listings → `/marketing/listings` [DP].** A listing's job in an agent's day
is that it gets marketed; its transaction facet is reachable from Transactions and its client facet
from Contacts. The agent app is also **not an MLS search tool** — consumer IDX search belongs to the
public website (project B-2, licence-gated and months away), not the agent sidebar. **Counter-argument
recorded honestly:** a listing agent may reasonably treat inventory as a first-class daily object, and
I could not verify how much listing inventory RCRE agents actually carry. If leadership says
inventory is daily, promote Listings back and demote Marketing to a nested item under Content —
brokerage-wide, agents fork rather than author, and their approval-bound work reaches them through
Today anyway.

**Not promoted, and where each lives instead:**

| Capability | Home | Why not top level |
|---|---|---|
| **Coach / weekly accountability review** | Inside **Today** (`/today/review`) and **RCRE AI** | The coach's own rule is *diagnose before prescribing*, and the diagnosis belongs where the day starts. A separate "Coach" tab is a place agents visit once and abandon. The value is the *why* attached to the priorities they already have, not a second dashboard. |
| **Content Library** | `/marketing/library` | It is the substrate under Marketing, not a peer of it. |
| **Community · Classroom** | `/training/community`, `/training/classroom/*` — already nested, correctly | One feed, not two. |
| **Time blocking** | `/today` (the plan) + Calendar connector | It is the shape of the day, which is what Today is. |
| **My approvals-in-flight** | A status strip on the asset and a Today item | An agent's approval is something they are *waiting on*, not a queue they work. |
| **Referral submission** | A write-only form reachable from Training/Community and the profile menu | An agent must be able to submit a referral **without** gaining any view of the recruiting pipeline. Write-only affordance, never a section. |

## C3. Broker / Owner — 7 items

**Command · RCRE AI · Agents · Contacts · Pipeline · Transactions · Recruiting**

Ordered so **Command is first and is the landing route** — exceptions-first is the whole thesis.

**Reporting stays nested at `/command/reporting`.** It fails test 3: reporting is the drill-down from
an exception, not a destination. Promoting it invites report-first navigation, which is exactly the
"so many funnels" complaint. What Reporting *must* gain: drill-through from a funnel step to the
underlying people (a funnel you cannot open is a picture) · a visible distinction between
backfilled and webhook-measured rows · an "earliest valid date" banner from
`integration_state.webhook_activated_at` · unavailable-metric rendering · export.

**Approvals is NOT a nav item [DP].** It is a **persistent header badge with a count** that opens
`/approvals`, plus a Command card. Justification: it is an inbox, and inboxes belong in the chrome
next to notifications, not in the section list — and a broker whose queue is empty should not stare
at a dead tab. **Recorded risk:** a compliance gate needs discoverability, and a badge is weaker than
a tab. If approval volume becomes daily-heavy, promote it and drop Pipeline (which brokers reach
through Agents and Command anyway).

**Marketing is not top-level for a broker.** A broker's marketing job is *approval*, and that arrives
through the badge. Authoring lives with `marketing_admin`.

**Training is not top-level for a broker.** Roster progress is a column on the agent inspector and an
exception row on Command; curriculum approval arrives through the approval badge.

**Admin is not in the main nav.** `/admin`, **owner-only**, reached from the user menu, containing:
roles and users · **integration connections and the FUB kill switch** · policies (follow-up, stage
aging, escalation, approval matrix) · markets · checklist template and date-rule publishing ·
automation runs · the audit log · MCP tool permissions. Justification: these are configured rarely and
are destructive when wrong; putting them one deliberate step away is the right friction. **Note the
`owner` vs `broker` split is [DP] and unconfirmed** — if Julio and Taquilla are peers, drop the
split rather than implementing it silently.

**The agent inspector (`/agents/[id]`) is the screen that has to change most.** Taquilla asked for
one thing and the current screen does not lead with it: **a contacted / uncontacted binary, front and
centre**. Target shape: header with a **data-freshness stamp** ("Follow Up Boss data as of 9:41am") ·
a five-count answer strip (**Assigned · Contacted · Uncontacted · Overdue · Stale stage**), each a
*filter on the list below*, never a link away · the book, one row per lead, default sorted worst-first
· a right rail of context · row-expand into a **communication metadata timeline with no message
bodies** — and that timeline should reuse `/crm/[id]`'s existing pattern rather than inventing a
second one. Every unavailable metric renders **as unavailable with its reason** — never as zero,
never silently omitted. A blank where a number belongs is how a broker concludes an agent did nothing.

## C4. Team lead — 6 items

**Team · RCRE AI · Contacts · Pipeline · Transactions · Agents**

Landing `/team` **[DP]** — a scoped Command: their team's unanswered leads, overdue follow-ups, stage
aging, stale statuses. Not brokerage-wide. `/agents` is filtered to their led teams. No Recruiting, no
Command, no Reporting, no Admin. **Blocked on an unresolved question:** no one has defined a team
lead's authority, and lead distribution is a *write*. Build the scope; get the answer before enabling
writes, and route the write through `assignment_intents` rather than an UPDATE policy on `people`.

## C5. Transaction Coordinator (Margie) — 4 items

**Transactions · RCRE AI · Contacts · Training**

Landing `/transactions` → the **queue**. Contacts is **transaction-scoped only** — she reaches a
person through a file, never through the client book.

She does not get: Recruiting (she is not owner/broker/recruiter — and `transaction_coordinator` joins
the build-failing forbidden-role test) · Marketing · Listings · Command · Agents · Reporting.
**Stated positively so it is not read as a slight: she coordinates transactions; she does not evaluate
people.** No response times, no contact attempts, no conversion rates, no scorecards. And no
pre-contract lead book — deals-forward only, with her `activity` and `stage_transitions` window
clamped to the contract date so the courtship stays out.

**🚩 Unverified about the real Margie:** last name · employee vs contractor vs third-party TC service ·
whether she is an RCRE system user at all · whether she is a licensee (which decides whether she may
approve anything) · what she uses today · her capacity · **and the TC send timelines Jeremy asked for
in the meeting and did not receive.** A TC workspace designed without watching the TC work is a guess.
**Recommend a 30-minute shadowing session before build**, and treat its output as the seed for the
Florida checklist template.

## C6. Recruiter (ISA) — 4 items

**Queue · Recruiting · RCRE AI · Training**

Landing `/recruiting/queue` **[DP]** — a call queue ordered by the deterministic score, showing the
three most recent signals, the script, and a one-tap outcome log. `/recruiting` is the pipeline board.
**No client book at all** (already true: `recruiter` is not in `rcre_is_org_wide_reader()` and no
policy grants it client rows). The recruiter is itself measured — dials, connects, conversations,
meetings set, meetings **held** — visible to broker and owner on Command. That instrumentation is the
cheapest thing in the whole recruiting plan that changes a real business outcome, because it turns
"the ISA is underperforming" from an impression into a number.

## C7. Marketing / Admin — 4 items

**Content · Listings · RCRE AI · Training**

Landing `/marketing` (the Content Library index). Sees recruiting **campaign and channel aggregates**
— spend, clicks, cost per prospect — and **no prospect names, emails, phones or notes**. May not
publish anything publicly without broker approval, enforced in a policy `WITH CHECK`, not in the UI.

## C8. Trainer — 4 items

**Training · Community · RCRE AI · Roster**

Landing `/training` in an authoring view. `Roster` is a nested progress view, not the agent
inspector — training completion only, never performance. May **propose** a `publicPreview` change;
only a broker may approve it.

## C9. The two new experiences, route by route

### Transactions

```
/transactions              role-aware index: agent list | TC queue | broker exceptions
/transactions/[id]         the workspace — tabs: Overview · Dates · Checklist · Documents ·
                           Parties · Messages · Tasks · History
/transactions/queue        explicit TC queue (TC + broker)
/transactions/exceptions   explicit broker exception board (broker + owner)
/approvals                 the cross-domain approval queue (badge-reached, see C3)
```

**Agent index is a short list, not a board:** address · client · side · closing date · **the single
next thing this agent owes** · a red chip if a critical date is inside 48h and unsatisfied.
**Agent Overview leads with two panels** — "You owe" (own open items, each with its deadline and the
*reason it exists*, capped the way Today caps priorities) and **"Waiting on"** (what the TC, the other
side, the lender or title owes, with who and since when). That second panel is the one that stops the
"Margie, where are we?" phone call, which is the real time cost.

**TC queue is three panes** — queue rail (counts, each a saved query not a folder: New–needs intake ·
Deadlines today/overdue · This week · Needs my action · Awaiting agent · Awaiting outside party · Out
for signature · Ready to close · **File incomplete — closed** · My approvals) · queue list (one row
per transaction: address, agent with headshot, side, closing date, **the one next action**, age of
that action; sorted by hard deadline then age) · action panel with the action inline, so most items
complete without leaving the queue. **A dashboard is not a work surface** — Margie does not want to
know how many transactions are healthy.

**Cross-links, both directions, no dead ends:** contact record gains a Transaction card · Pipeline
`Under Contract` cards show a transaction chip with the next critical date · a listing links to its
transaction · Overview links back to contact, listing and agent.

**The constraint that keeps this from becoming a second CRM [VLR]:** the transaction workspace must
**not duplicate the contact workspace.** Communication *with the client* stays on the contact record
and in FUB. The transaction holds communication with **transaction parties** (TC, title, lender, co-op
agent) and **documents**. Do not build a second inbox for the same client.

### Content Library

```
/marketing                     index: the workflow tiles that already exist + library entry
/marketing/library             search + filter (FTS over title/body/tags — the corpus is small
                               and FTS is honest, cheap and debuggable; not a vector store)
/marketing/library/[assetId]   versions, approval state, diff vs approved parent, publications
/marketing/calendar            the 30/90-day plan
/marketing/campaigns/[id]      one instance: state, arming check, per-item approval state
/marketing/brand               brand assets, per-market identification and licence blocks
                               (marketing_admin + broker only)
/marketing/listings            RCRE inventory, marketing-first
```

**Two saved-view defaults do most of the work:** *"Approved and ready for my market"* (the agent's
default) and *"Waiting on me"* (the broker's default). **Market is a hard facet, not a tag** — an
agent in Birmingham should not be browsing Florida-form content by default, because an asset approved
for Jacksonville is not automatically compliant in Birmingham.

**Reuse, don't rebuild:** `/marketing` already enumerates 11 workflows with exactly one (the listing
campaign) built end-to-end and the rest honestly disclosed as previews. The upgrade is that the
listing campaign **stops producing a one-off and starts producing library assets** — each output
becomes an asset + version + approval request. The other ten become campaign templates that light up
one at a time as their content is authored. The UI shape stays; the backing changes. **Keep exactly
one end-to-end generation flow.** Part A of the content design is the weakest fit against the
three-function scope defence and the easiest place in this plan to over-build.

## C10. Navigation summary

| Role | Top-level count | Landing | Notable exclusions |
|---|---|---|---|
| Agent | 7 | `/today` | Recruiting, Command, Reporting, Admin, Approvals-as-a-section |
| Team lead | 6 | `/team` | Recruiting, Command, Reporting, Admin |
| Broker | 7 | `/command` | Marketing authoring, Training, Admin |
| Owner | 7 + `/admin` | `/command` | — |
| Transaction coordinator | 4 | `/transactions` | Recruiting, Marketing, Listings, Command, Agents, Reporting |
| Recruiter | 4 | `/recruiting/queue` | The entire client book |
| Marketing admin | 4 | `/marketing` | Recruiting identities, deals, commissions, performance, audit |
| Trainer | 4 | `/training` | Client book, deals, recruiting identities, performance beyond training |

Admin-only (`/admin`, owner): roles and users · integration connections · FUB kill switch · policies ·
markets · checklist templates and date rules · automation runs · audit log · MCP tool permissions.

---

# §D. Things I could not verify — do not let these become assumptions

1. **No database exists.** Migrations 0001–0003 have never been executed against any Postgres
   instance (0003's own header says so). Everything in Part A is a design against source.
2. **Whether RCRE uses FUB Deals.** Decides the transaction creation trigger and reporting metrics
   6/7. Already open in the reporting data model.
3. **Whether RCRE's Alabama team lead is modelled as a FUB team leader** with `teamLeaderOf` set. If
   not, the whole team-lead layer is invisible to the mirror.
4. **Alabama's market timezone** (assumed Central) and RCRE's actual MLS memberships per market.
5. **Whether there is an Alabama transaction coordinator at all**, and everything about Margie listed
   in C5.
6. **Which broker is broker of record in which state**, and therefore who approves what. The approval
   matrix cannot be built on a guess.
7. **Whether Julio and Taquilla want the owner / managing-broker authority split**, or are peers.
8. **FUB API behaviours** that the write and reconcile design rests on: whether `GET /v1/people`
   supports updated-since; whether `PUT /v1/people` supports partial update or any concurrency
   control; **whether `POST /v1/textMessages` sends or only logs**; the deep-link URL format for a
   person record and whether the FUB *mobile* app supports a URL scheme (agents text from mobile, so a
   desktop-only deep link may not reach where the work happens).
9. **Whether RCRE controls its Google Business Profiles**, how many, and whether GBP posting is in V2
   scope. Also whether the MLS licences permit listing data or derived statistics in AI-generated
   public content.
10. **Meta Page / Business Manager Partner access** and whether the FUB↔Facebook connection fires for
    leads from a partner ad account. Spend-blocking.
11. **The RESPA structure** between Jeremy (mortgage originator) and RCRE (brokerage). Counsel gate,
    blocks spend, lands on both parties.
12. **Every AL/FL legal detail** the transactions module leaves empty: required documents, date
    conventions, escrow holder, closing practice, retention periods, dual-agency permissibility,
    whether association forms may be programmatically filled. Mechanism designed; content is RCRE's
    and counsel's.
13. **Skool's API and webhook surface.** Designed around deliberately; nothing depends on it.
14. **Total agent count.** Only "two in Alabama, plus me and Julio" is on record. Backfill sizing and
    rate-limit planning both depend on it.
15. **Transaction volume per month.** Decides whether Margie's queue is a list or needs real triage.
16. **Whether RCRE's agents record appointment outcomes** — decides whether "appointments held" exists
    as a metric at all. No engineering changes that.

**Discrepancy worth flagging to the coordinator:** the two module designs disagreed on how a TC is
scoped (`transactions` + `tc_assignments` vs `deals` + `deal_coordinators` + `coordinator_scopes`) and
on whether the TC gets a new role or reuses `staff`. Both are resolved above in A2 and A9, but the
resolution is **mine, not RCRE's**, and both deserve a line in the final document rather than being
merged silently.
