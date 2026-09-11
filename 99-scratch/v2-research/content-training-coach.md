# V2 Design — Marketing Content Library · Training & Community · Personalised Realtor Coach

**Status:** PLANNING ONLY. No code, no migrations, no demo changes were made.
**Author:** subagent, 2026-08-26. **Scratch only** — coordinator synthesises the final documents.
**Label discipline (per CLAUDE.md):** `[VLR]` verified leadership requirement · `[DP]` design
proposal · `[TA]` technical assumption. Anything unlabelled in this file is a `[DP]`.

---

## 0. What I read, and what I verified

Read: `CLAUDE.md`, `GOVERNANCE.md`, `RCRE_GOAL_FULL_BUILD.md`,
`RCRE_AI_ADVANTAGE_INTEGRATION_ADDENDUM.md`, `06-decisions/ADR-LOG.md`,
`02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md`,
`04-requirements/RCRE-PRODUCT-REQUIREMENTS.md` (grep), the three migrations under
`apps/rcre/supabase/migrations/`, `mcp/rcre-mcp-server/src/tools.ts` (tool names),
`apps/rcre-demo/src/data/academy-types.ts`, `apps/rcre-demo/src/data/community.ts`,
`apps/rcre-demo/src/components/CommunityModel.ts`, `apps/rcre-demo/src/components/TrainingAccess.tsx`,
`apps/rcre-demo/src/app/marketing/page.tsx`, all 20 files of
`Legends_Realtor_Coach_2026_Knowledge_Base/`, and the 2026-08-26 meeting notes + transcript
(`RCRE & Jeremy AI + - 2026_08_26 09_58 EDT - Notes by Gemini.md`).

**Verified by direct inspection:**
- Academy totals in `apps/rcre-demo/src/data/academy.ts`: **14 courses, 181 lessons, 220 prompts,
  29 handouts, 16 downloads, 2 lessons with video.** Matches the brief exactly.
- **3 courses** carry `publicPreview: true`. `TrainingAccess.tsx` reads that flag and explicitly
  forbids inferring public exposure any other way.
- **No marketing or training tables exist in the schema.** Migrations 0001/0002/0003 contain
  `organizations, users, people, attribution, activity, tasks, appointments, deals,
  lead_snapshots, recruiting_prospects, webhook_events, audit_events, hermes_tool_permissions,
  teams, team_members, assignment_history, stage_transitions, person_engagement,
  follow_up_policies, stage_aging_policies, sync_state, integration_state`. The only campaign
  concept is `attribution.campaign` (text) — inbound attribution, not content.
- MCP registry has 17 tools today, all narrowly scoped, including `get_academy_progress` and
  `get_next_lesson`. Effects are typed `read|draft|write` (`rcre_tool_effect`).
- RLS pattern (0003): three GUCs `rcre.organization_id / rcre.user_id / rcre.role`, transaction-local,
  **no context → no rows**, every policy opens with an organization equality test. Any new table
  must follow this or it is a leak.

**Could NOT verify — flagged, not assumed:**
1. The brief says the coach corpus is "~96K". On disk it is **20 `.md` files totalling 71,124
   bytes** (plus a separate 36,450-byte `.zip`). File count matches; size does not. Harmless, but
   do not quote 96K.
2. `academy-types.ts` still carries a doc comment saying "nothing has been recorded or rendered
   yet". The data now has 2 videos. The comment is stale relative to its own data.
3. No RCRE policy exists yet for: what counts as "public marketing", who approves what, whether
   established agents may be exempt, retention/consent for recorded calls, or whether a broker may
   see an agent's coaching diagnosis. All are **RCRE business/legal decisions**, listed in §4.
4. Taquilla's proprietary content **does not exist in the workspace**. `training-assets/` contains
   only `PROVENANCE.md`. Everything in Part B is a design for content that has not been delivered.
5. Skool has an API surface; I did **not** verify what it exposes. Part B7 deliberately requires no
   Skool API.

---

# PART A — RCRE MARKETING CONTENT LIBRARY

## A1. The one structural decision everything else hangs on

`goal.md`: *"Prefer technical enforcement over prompt-based safety."* `RCRE-PRODUCT-REQUIREMENTS`
P1.2: *"the approval gate is a compliance control, not a UX preference."*

Therefore: **approval is not a column.** A `status` field can be flipped by any code path, any
migration, any hurried endpoint, any future AI action. Instead:

- `marketing_asset_versions` — immutable content.
- `marketing_approvals` — an approval ledger row pointing at **one exact version id**.
- `marketing_publications` — the **only** table that can represent "this is public". Its insert is
  guarded by a trigger that fails unless a live (non-revoked) `approved` row exists in
  `marketing_approvals` for that same `asset_version_id`.

Consequences, all of them intentional:
- **Editing an approved asset silently de-approves it.** A new version has no approval row, so it
  cannot be published. This is the property that makes the gate real.
- Revoking approval (`decision='revoked'`) makes future publication impossible without touching
  existing publications — recall is a separate, logged action.
- The audit trail is structural, not a log line. `audit_events` already exists (0001) and should
  carry every approval decision as well.

**Do NOT** add a convenience "publish anyway" path for brokers. If a broker wants it out, they
approve it. That takes the same two clicks and leaves a record.

## A2. Schema sketch (proposed migration 0004 — NOT written)

Every table: `id uuid pk`, `organization_id uuid not null references organizations(id)`,
`created_at/updated_at`, RLS enabled + FORCE, policies opening with `rcre_current_org()`.

**Content**
- `marketing_assets` — canonical record. `kind` (enum below), `title`, `slug`, `owner_user_id`,
  `origin` (`rcre_library|agent_created|ai_drafted|imported`), `derived_from_asset_id`
  (fork lineage), `market_agnostic bool`, `is_public_facing bool` (see A4), `archived_at`.
- `marketing_asset_versions` — `asset_id`, `version_no`, `content jsonb` (blocks: body, caption,
  subject, script, shot list, on-screen text, alt text), `media_ref[]`, `created_by`,
  `generation_id` (nullable), `parent_version_id`, `checksum`.
- `marketing_asset_markets` — join to `markets`. An asset is market-agnostic or scoped to ≥1 market.
- `marketing_asset_tags`, `marketing_asset_listings` (link to a listing when listing-derived).

**Approval / publication**
- `marketing_approvals` — `asset_version_id`, `requested_by`, `requested_at`, `reviewer_user_id`,
  `decision` enum `pending|approved|changes_requested|rejected|revoked`, `decided_at`, `reason`,
  `checklist jsonb` (A6), `route` (`team_lead|managing_broker|qualifying_broker`).
- `marketing_publications` — `asset_version_id`, `channel_id`, `market_id`, `published_by`,
  `published_at`, `external_ref`, `recalled_at`. **Trigger-guarded.**
- `marketing_approval_policies` — org-configurable: which `kind` × `is_public_facing` × agent
  cohort routes to whom, and whether any cohort is exempt. **Default: everything public-facing
  routes to a broker.** Do not invent an exemption.

**Campaigns / calendar**
- `marketing_campaign_templates` — the library artefact: `campaign_type`, `horizon_days` (30|90|
  custom), `audience_segment`, ordered `template_slots`.
- `marketing_campaign_instances` — an agent's run: `template_id`, `market_id`, `start_date`,
  `owner_user_id`, `state` (`draft|awaiting_approval|approved|armed|running|paused|complete`),
  `approved_plan_version_id`.
- `marketing_calendar_items` — `instance_id`, `scheduled_for`, `channel_id`, `asset_version_id`,
  `state` (`planned|awaiting_approval|approved|ready|published|skipped|failed`), `skip_reason`.
- `marketing_channels` — org config. Nothing is a live send in MVP (§A8).

**Supporting**
- `markets` — first-class (A5). `brand_assets` — logos, headshots, per-state brokerage
  identification and licence blocks, disclaimers, usage rules.
- `marketing_generations` — provider-agnostic generation record (A7).
- `marketing_performance` — metrics with provenance (A9).

**Asset kinds** (`kind` enum): `listing_post`, `listing_email`, `listing_flyer`, `open_house_invite`,
`open_house_signage`, `social_post`, `social_reel_script`, `email_campaign`, `video_script`,
`prompt`, `graphic`, `template`, `buyer_sequence`, `seller_sequence`, `past_client_sequence`,
`database_sequence`, `recruiting_asset`, `brand_asset`, `landing_copy`.

## A3. Reuse what already exists

`apps/rcre-demo/src/app/marketing/page.tsx` already enumerates **11 workflows** with exactly one
(listing campaign) built end-to-end, and the others honestly disclosed as previews. Do not throw
that away and do not build ten half-generators (`goal.md` says so explicitly).

The upgrade is: **the listing campaign stops producing a one-off and starts producing library
assets.** Each of its outputs becomes a `marketing_asset` + version + approval request. The other
ten workflows then become `marketing_campaign_templates` that light up one at a time as their
content is authored — the UI shape stays, the backing changes.

## A4. What counts as "public marketing"

This needs an RCRE answer, but the model should not be blocked on it. `[DP]`:

| Clearly public → gate | Clearly internal → no gate | **Needs RCRE policy** |
|---|---|---|
| Social post, listing flyer, open-house signage, landing copy, paid ad copy, anything with the brokerage name shown to consumers | Prompts, scripts, checklists, internal templates, an agent's private draft | Email to the agent's own past-client database · 1:1 text drafted from a template · a video script the agent will read on camera |

Implement as `is_public_facing` **defaulted per kind in `marketing_approval_policies`**, org-editable.
Until RCRE decides the middle column, default those to **gated**. Over-gating is recoverable;
under-gating publishes unreviewed real-estate advertising in two regulated states.

## A5. Multi-market — Birmingham vs Jacksonville vs South Florida

Market is a **dimension, not a tag.** `markets` rows carry:
`name`, `state` (`AL|FL`), `mls_names[]`, `mls_attribution_required bool`,
`brokerage_identification_block` (differs AL vs FL — GOVERNANCE §5), `licence_display_rule`,
`compliance_profile_id`, `active`.

Known markets from the brief: Birmingham AL · Jacksonville / NE FL · Miami · Orlando (Stellar) ·
Gainesville. `[TA]` — I did not verify RCRE's exact MLS memberships; treat the list as a starting
seed, not fact.

Why it must be structural, not a tag:
1. **State differs → required identification differs.** An asset approved for Jacksonville is not
   automatically legal in Birmingham.
2. **MLS data is licensed, not owned** (GOVERNANCE §5). Listing-derived assets must carry
   `mls_source` and the attribution the MLS requires, and must never be redistributed to third
   parties. Put `mls_source` on `marketing_asset_listings` and make the attribution block a
   render-time requirement, not an author's memory.
3. A campaign template instantiates **per market**, pulling market-specific inserts (market stats,
   the correct disclaimer, the correct brokerage block). One template, N compliant instances.

Filters therefore include market as a hard facet — an agent in Birmingham should not be browsing
Florida-form content by default.

## A6. Compliance lint — a flag for a human, never a verdict

Deterministic checks run **before** an approval request can be submitted. They produce a checklist
stored on the approval row, so the reviewer sees what was checked and the record survives.

Checks: protected-class terminology and proxies · steering patterns ("great neighbourhood for…",
"family-friendly", "safe area", school-quality claims) · unsupported claims ("guaranteed",
"will appreciate", "best", "#1") · fabricated proof (testimonials, awards, sales numbers, market
stats without a cited source) · missing brokerage identification for the target market · missing
agent licence number · missing MLS attribution on listing-derived content · mortgage language
appearing in a Realtor asset (see C6 — the Jeremy/NMLS trap) · unverified rate or market statistic.

**The lint never passes anything.** It raises flags; a human decides. Coach KB file 19 is explicit
that the assistant must not act as a fair housing expert — RCRE's software must not either. This
also matches `goal.md`'s prohibited-actions list ("fair housing judgments").

## A7. AI generation stays provider-agnostic (ADR-0011)

`marketing_generations`: `asset_version_id`, `requested_by`, `route_label` (free text — e.g.
`openrouter:<model>`, `deepseek`, `minimax`, `local`, `user_byo`), `prompt_ref`, `inputs jsonb`,
`cost_note`, `created_at`. **No vendor name is hard-coded anywhere in schema, code, or UI copy.**

The meeting (00:15–00:16) confirmed the routing intent: OpenRouter for cheap/free text models,
DeepSeek and MiniMax as affordable step-ups, and **users' own ChatGPT subscriptions specifically
for image generation.** So:

- Text drafting → RCRE-configured cheap/free route.
- **Images → RCRE does not pay per-agent image inference.** The product must accept an
  agent-supplied image as a first-class path: upload, with provenance (`source: byo_tool`,
  `tool_label`, `created_by`), and treat it exactly like a generated asset for approval purposes.
  A "generate image" button that silently spends RCRE money contradicts ADR-0011.
- Every generated or uploaded asset lands **unapproved by construction** — origin `ai_drafted`
  never carries an approval row.

## A8. The 30/90-day calendar, approved up front, then autopilot

This is Jeremy at 00:08:38, and it collides head-on with A1. Resolution `[DP]`:

1. Agent (or AI) builds a 30- or 90-day plan for one market → `campaign_instance` in `draft`.
2. Submit → **the plan and every asset version in it** go to the reviewer as one review packet.
   Reviewing 30 items one at a time will not happen; reviewing one packet with a diff view will.
3. Approval writes approval rows for **each version** plus a plan approval. Instance → `approved`.
4. Instance may be **`armed`** only when *every* calendar item references a live approved version.
   Enforce as a check, not a hope.
5. A morning job (RCRE job lane, ADR-0004 — not n8n) walks due items and moves them to `ready`.
6. **Any item edited or regenerated after arming drops to `awaiting_approval` and is SKIPPED on its
   date, with a visible `skip_reason`.** It is never silently published and never silently dropped.
7. Pause/resume at the instance level; a paused instance skips with reason.

**Nothing sends in the MVP.** `goal.md`: no send tool, no email/SMS/social publishing without
Jeremy's authorisation. "Published" in the pilot means "handed to a human who presses the button in
the channel", or a connected channel **after** an explicit governance approval. Say this in the UI —
an autopilot that implies it posted when it did not is exactly the kind of fake functionality the
goal forbids.

## A9. Search, filters, analytics

**Search:** Postgres FTS (`tsvector` over title + body + tags), not a vector store. The corpus is
small; FTS is honest, cheap, and debuggable. Revisit only if the library exceeds a few thousand
assets or agents ask semantic questions FTS demonstrably fails.

**Filters:** market · channel · asset kind · campaign type · approval status · version (latest vs
approved vs all) · owner/team · audience segment · listing · language · created date · has-media.
Two saved-view defaults matter: **"Approved and ready for my market"** (the agent's default) and
**"Waiting on me"** (the broker's default).

**Analytics — honesty rules, per ADR-0014 and `goal.md`:**
- Allowed: publication counts, channel-reported impressions/reach/clicks, email opens/clicks,
  landing/property views, form fills, leads created (routed to FUB `POST /v1/events` per ADR-0012,
  never `POST /v1/people`), and downstream appointments/closings via the existing `attribution` +
  `person_engagement` tables.
- **Forbidden: SMS read receipts, in any form, in any label.** ADR-0014. Delivery ≠ read.
- Any metric the channel does not report renders as **unavailable**, not zero, not estimated.
- `marketing_performance` stores `metric`, `value`, `source_system`, `observed_at`,
  `confidence` (`reported|derived|unavailable`). Derived metrics must name their derivation.

## A10. Agent customisation and reuse

Fork model. Library asset → agent copy with `derived_from_asset_id` set. Rules:
- **Approval does not inherit through a fork.** The derived asset starts unapproved.
- The reviewer sees a **diff against the approved parent**. That is the entire reason a broker will
  tolerate the gate at volume — most reviews become "one sentence changed, approve".
- Personalisation tokens (agent name, licence #, headshot, contact, market block) resolve from
  `users` + `brand_assets` at render time and are **excluded from the diff**. Changing your own
  phone number should not trigger a compliance review.
- An agent may never edit a library original; they fork. Library originals are broker/marketing-owned.

---

# PART B — TRAINING, COMMUNITY, AND THE SKOOL QUESTION

## B1. Preserve the AI Advantage curriculum — extend, do not replace

The existing model in `academy-types.ts` is good and unusually honest (it refuses to render a video
player with nothing behind it, and it reads public exposure from data rather than inferring it).
Keep it. Verified content: **14 courses / 181 lessons / 220 prompts / 29 handouts / 16 downloads /
2 playable videos / 3 publicPreview courses.**

Extensions needed, all additive:
- `curriculum_source`: `ai_advantage | rcre_proprietary` on course and lesson.
- `lesson_kind`: `video | recorded_call | document_walkthrough | tool_setup | workflow | reading | prompt_lab`.
- `applies_to_states[]` (`AL|FL`) — a Florida buyer-document walkthrough must not be assigned to an
  Alabama-only agent, and vice versa. This is a correctness requirement, not a nicety.
- `required_for_rules` — see B4.
- Persist progress server-side (`training_progress`); the demo's client-local progress is fine for
  the demo, not for accountability reporting.

## B2. Taquilla's proprietary training — what she actually described

From the transcript, four distinct content types (00:10:05 – 00:12:00, 00:28:12):
1. **"Zillow 101 — initial phone call"**, built from **real recorded live calls.**
2. **Buyer/seller document walkthroughs** — she fills the forms on camera.
3. **ChatGPT setup and prompting** — account setup, what to turn on/off, then prompting modules.
   Note her clarification: she is not building a custom GPT; she is recording herself using it, on
   the assumption the agent has their **own** subscription. That matches ADR-0011 exactly.
4. **Inspection-report → email workflow** — drop the PDF in, give the requested numbers, have it
   draft the email to Margie (FL transaction coordinator), agent reviews and sends.

**The recorded live calls are the highest-risk asset in this entire plan.** Before a single one is
playable:
- `lesson_media.consent_status` (`required|obtained|not_applicable`) — call recording consent law
  differs by state and by who was on the call.
- `lesson_media.pii_review_status` and `redaction_applied` — a real Zillow call contains a real
  consumer's name, number, budget and motivation.
- Platform terms: whether Zillow's terms permit retaining and redistributing a Zillow-sourced call
  as internal training material. **Unverified. Do not assume.**
- **Playback is gated until consent + PII review clear.** Technical gate, not a checkbox in a doc.

Document walkthroughs carry a second, quieter risk: state association contract forms (FAR/BAR,
AAR) are **copyrighted**, and a walkthrough filmed on a live file shows client data. Same gate:
`uses_real_client_data` must be false or redacted before publish.

Both of these are **RCRE/counsel decisions**, listed in §4. Design the gate now; do not design an
"upload and publish" button.

## B3. Authoring

Taquilla is a Managing Broker, not a video editor. The authoring surface must be small:
create course → add lesson → upload local media → description → attach resources → set assignment
rules → submit. Draft/published states.

Reuse **one** approval mechanism across the product: the same version + approval ledger as Part A,
applied to `curriculum_versions` / `curriculum_approvals`. `[DP]` **Julio Arango (Qualifying Broker)
is the natural approver for proprietary training**, because instruction on documents and brokerage
procedure is a supervisory act, not marketing. Taquilla authors; Julio clears. Confirm with RCRE.

Media: local files, per `goal.md` ("do not depend on fragile third-party image URLs") and the
addendum (do not re-encode, preserve captions, no autoplay with sound, never fake a player).

## B4. Conditional assignment — Taquilla at 00:28:12

> *"not every agent in the future is going to be on Zillow, right? But those [who are] need to have
> access to those things."* — `[VLR]`

Assignment must be **rule-based, not list-based**. A list goes stale the day someone joins.

`training_assignment_rules`: `organization_id`, `course_id|lesson_id`, `predicate jsonb`,
`requirement` (`required|recommended|optional`), `due_rule` (e.g. `+7d from assignment`,
`before_first_zillow_lead`, `+30d from hire`), `priority`, `active`.

Predicate dimensions:
- `role` — agent / team lead / broker
- `market` — Birmingham / Jacksonville / Miami / Orlando / Gainesville
- `state_licence` — AL / FL (**gates the document walkthroughs**)
- `team` — reuse `teams` / `team_members` from migration 0002; do not invent a second grouping
- **`lead_source_entitlement`** — the Zillow case
- `tenure_days` — onboarding path
- `production_band` — new / producing / team lead (mirrors the coach's own branching, KB 01)
- explicit manual include/exclude

**On lead source specifically.** The tempting implementation is "assign Zillow training to anyone
who has received a Zillow lead" — derivable from `people.source` in the FUB mirror. That is
**backwards**: it trains the agent *after* they have already fumbled their first Zillow call. Add
`agent_lead_source_entitlements` (`user_id`, `source`, `granted_at`, `granted_by`) and fire
assignment **on entitlement**, before routing ever sends them one. Keep the `people.source`
derivation as a *safety net* that raises an exception in Command when an agent receives a lead from
a source they were never trained or entitled for — that is a genuine management finding and it
costs nothing extra.

Rules materialise into `training_assignments` (`user_id`, `rule_id`, `assigned_at`, `due_at`,
`state`, `completed_at`, `waived_by`, `waived_reason`). Re-evaluate on user/team/entitlement change.
**Never retroactively un-complete** a finished assignment when a rule changes.

## B5. Completion, overdue, and where they surface

`training_progress` per lesson (`started_at`, `completed_at`, `last_position_seconds`). Course
completion = all `required` lessons complete. Overdue = `due_at < now()` and not complete.

Overdue training surfaces in three places, and the routing matters:
- **Agent — RCRE Today**, as one item, not a nag list.
- **RCRE Command**, as an exception row — the same treatment as an unanswered lead, since
  Taquilla §6 defines Command's job as *being told what needs attention*. **But keep it in a
  separate section from lead accountability.** Leadership's P0 is leads; burying "3 unanswered
  leads" among "9 overdue trainings" damages the product's actual value.
- **Coach input** (Part C) — a training gap can be the *explanation* for a conversion bottleneck.

Waivers exist and are logged with a reason. A broker who cannot waive will stop trusting the list.

## B6. Training of the Day, and Community integration

`training_of_the_day` — one item per agent per morning, selected by a **stated, ordered rule**, not
a "recommendation engine":
1. An overdue required lesson, oldest first; else
2. the next lesson in an active assignment; else
3. the lesson mapped to the agent's current coaching bottleneck (Part C); else
4. the next lesson in curriculum order.

Say the rule out loud in the UI. Ordering that a user can predict is trusted; a black box is not.

**Community integration.** The in-product Community already exists and is well-built:
`CommunityFeedPost` carries a resolved `lesson` link and a `prompt` block, categories include
`Training`, and the server resolves lesson references so a post can never link to a lesson that is
not real. Extend minimally:
- optional `linked_assignment_id` on a post, so a cohort discussion attaches to an assignment;
- a completion can offer (never force) a post to `Wins` or `Training`;
- `Training of the Day` appears as a pinned system post, using the existing pinned mechanism.

Do not add a second feed. Do not gamify with points/badges — nothing in discovery asked for it, and
`goal.md` forbids feature creep against the three functions.

## B7. THE TWO COMMUNITIES — distinct products, one bridge

Jeremy at 00:16:06–00:17:16 recommended RCRE run its **own Skool community** as a recruiting funnel
and a paid coaching revenue line. That is **not** the in-product Community. Conflating them is the
single biggest risk in Part B, because it would put brokerage-internal procedure and real
lead/pipeline context on a public third-party site.

| | **In-product Community** (built, `/training/community`) | **RCRE Skool community** (proposed, external) |
|---|---|---|
| Audience | RCRE agents only, authenticated | Public — any agent, any brokerage, any market |
| Purpose | Operating rhythm: wins, questions, prompts, Training of the Day | Top of the recruiting funnel + paid coaching revenue |
| Content | RCRE-internal; brokerage procedure; real lead and pipeline context | Free tier: general AI-for-Realtors. Paid tier: coaching |
| Hosting | Inside the RCRE platform | skool.com — third party, RCRE does not control it |
| Data posture | Org-scoped, behind RLS, auditable | Outside RCRE's control. **Treat as public forever** |
| Owner | Taquilla / Julio | Jeremy's model, RCRE-branded |
| Compliance | Brokerage supervision applies | Public marketing — Part A's approval gate applies |

**How they relate — one direction only.**

- Skool is the **funnel**; RCRE is the **destination**. A Skool member who engages converts into a
  `recruiting_prospects` row with `source='skool_community'` plus engagement history. That is the
  entire integration, and it needs **no Skool API** — a manual or CSV path is sufficient for the
  pilot and avoids a vendor dependency nobody has verified.
- **The free tier's content is already decided.** The 3 courses carrying `publicPreview: true` are
  exactly what may go public — `TrainingAccess.tsx` is explicit that public exposure is read from
  data and never inferred. Use the same flag for Skool. One decision, two surfaces (`/join` and
  Skool). Never make a second, divergent judgement about what is free.
- **Never sync internal → external.** No RCRE Community posts, no brokerage procedure, no client or
  lead context, no agent performance data, no proprietary Taquilla training (recorded calls and
  document walkthroughs are internal, full stop). Cross-posting is the failure mode.
- **Public Skool posts are public marketing** and route through Part A's approval gate like any
  other public asset. Recruiting content is already a `kind` in A2.
- **Paid coaching revenue builds nothing inside RCRE.** Jeremy framed it as income from agents
  *outside* RCRE's markets. Skool handles its own membership and billing. Building a payments,
  entitlement or subscription surface inside the RCRE product would be exactly the SaaS layer
  **ADR-0013 forbids**. If it ever needs to come in-product, that is a new ADR.
- One real conflict to name: a public Skool coaching business and an RCRE recruiting funnel can
  compete for the same agent. `[DP]` Free tier = recruiting (in-market agents are invited to RCRE);
  paid tier = revenue (out-of-market agents). RCRE leadership should confirm that split.

---

# PART C — PERSONALISED REALTOR COACH

## C1. What the corpus is

`Legends_Realtor_Coach_2026_Knowledge_Base/` — **20 markdown files, 71,124 bytes** (brief says
~96K; see §0). It is a *coaching operating system*, not a document set: `01_PERSONA` defines six
coach jobs, an eight-step coaching sequence, an 18-item diagnostic, and hard boundaries;
`03_AGENT_DIAGNOSIS` defines a bottleneck test; `04` defines the business-math chain; `05` defines
calendar ordering and accountability; `19` defines the compliance guardrails.

Three properties make it unusually well-suited to becoming software rather than a prompt:
1. **"Diagnose before prescribing"** is a hard rule, and diagnosis is *arithmetic over data RCRE
   already has*.
2. `03`'s bottleneck test is a literal decision table.
3. `19` + `01`'s Required Boundaries are an explicit prohibited-output list — enforceable at a tool
   boundary rather than trusted to a prompt.

## C2. Where it lives — NOT in Hermes memory

`goal.md` and the addendum both forbid it, and ADR-0008 puts truth in the RCRE layer. Design:

- `coach_knowledge_documents` — `doc_key` (e.g. `03_AGENT_DIAGNOSIS`), `title`, `version`,
  `checksum`, `imported_at`. `coach_knowledge_sections` — `doc_key`, `section_path`, `heading`,
  `body`, `topic_tags[]`, `volatile bool`, `applies_to` (see C6), FTS index.
- An RCRE-side importer reads the corpus from the workspace, versions and checksums it. A change
  to the corpus is a visible, reviewable event — not a silent behaviour change.
- **Retrieval only through narrow MCP tools**, matching the existing 17-tool style in
  `mcp/rcre-mcp-server/src/tools.ts`:
  - `get_coaching_diagnosis()` → the **server-computed** diagnosis for the calling agent. Identity
    resolved server-side from the verified session/credential, never model-supplied. Effect: `read`.
  - `get_coaching_playbook(bottleneck_code | topic)` → the relevant *sections*, returned with
    `doc_key` + `section_path` so the coach can cite what it is drawing on. Effect: `read`.
  - `get_time_block_plan()` → committed vs actual blocks. Effect: `read`.
  - No coaching write tool. No send tool (`goal.md`: "No send tool in the MVP").
- **Enforcement that the corpus and agent data never reach Hermes long-term memory:**
  (a) the corpus is reachable *only* via tool responses — it is never in a profile, a skill file,
  or `MEMORY.md`; (b) `mcp/rcre-mcp-server/src/pii-guard.ts` is extended to mark every response
  carrying agent-identified performance as **non-persistable**; (c) a Hermes hook that **fails
  closed** on any attempt to write tool output into long-term memory. Technical enforcement, per
  `goal.md`. Prompt instructions alone do not satisfy this requirement.

## C3. Diagnosis is computed in SQL, not narrated by a model

This is the crux of the whole design. Map `03`'s bottleneck test onto data RCRE already derives:

| KB 03 bottleneck | Signal, from existing tables |
|---|---|
| Many leads, few conversations → speed-to-lead weak | `people.first_touch_at` (0001 marks it non-backfillable) vs `assignment_history` (0002) |
| Many conversations, few appointments → discovery/closing weak | outbound `activity` counts vs `appointments` |
| Many appointments, few signed → consultation weak | `appointments` → `deals` |
| Many signed, few closings → qualification/execution weak | `deals` + `stage_transitions` |
| Stale statuses | `stage_transitions` + `stage_aging_policies` (0002) |
| Weak database follow-up | `people.last_touch_at` at 30/60/90-day cohorts |
| No protected time blocks | `time_blocks` vs activity timestamps (C5) |
| Content/marketing not converting | `marketing_performance` → `attribution` (Part A9) |
| Training gap | overdue `training_assignments` + `training_progress` (Part B5) |

Output: `coach_diagnoses` — `user_id`, `period`, `stage` (`new|producing|team_lead`, matching
`01`'s three branches), `primary_bottleneck`, `secondary_bottleneck`, `evidence jsonb` (the actual
numbers **and the row references they came from**), `ninety_day_objective`, `priorities[3]`,
`computed_at`.

**Every coaching statement carries its evidence reference.** `goal.md`: *"Every surfaced insight
must explain WHY. The product value is the explanation, not the badge."* And `01`'s rule —
*"Do not fix ten things at once"* — becomes a hard cap: **one primary bottleneck, three priorities.**
Not a dashboard of nine.

The model's job is voice and specificity over a diagnosis it did not compute. That is precisely
what makes ADR-0011 safe here: **a cheap or free model degrades tone, never truth.**

## C4. Goals and business math

`04`'s chain — net income → GCI → closings → signed clients → appointments → conversations → daily
activity — becomes `agent_goals` (`period`, `net_income_target`, `gci_target`, `avg_commission`,
derived targets) and `agent_scorecard` (weekly actuals against them).

**Rule:** conversion rates come from the agent's own history where there is enough data, and from a
**clearly-labelled brokerage default** where there is not. Never present a brokerage default as the
agent's own rate — that is the numeric equivalent of fabricating a metric, and `goal.md` forbids
faking unavailable metrics.

## C5. Time blocking

Taquilla named it as one of three things agents need most (`[VLR]`, §5 of her discovery), and it
appears in no earlier requirement document. `05` gives the ordering directly: personal → contractual
obligations → lead generation → lead follow-up → appointment windows → script practice → content →
admin → everything else.

`time_block_templates` + `time_blocks` (instances), with adherence derived from `activity`
timestamps. The coach then does what `01`'s Accountability Rule requires: *"Ask what was committed
and what happened."* Committed block vs actual behaviour, weekly, with the gap named plainly and
without shaming (`01`: *"Do not shame the agent"*, *"Do not hide weak performance behind
encouragement"*).

## C6. Staying inside the guardrails the corpus already defines

Turn `19` + `01`'s Required Boundaries into **enforcement**, not instruction:

- `coach_policy` — prohibited outputs, generated at import from `19`: legal advice · tax advice ·
  invented MLS data · current mortgage rates without verification · guarantees of appreciation,
  savings, approval, price or outcome · protected-class targeting or exclusion · steering ·
  "commission is standard" / "the seller always pays the buyer agent" · stale compensation
  practice presented as current · fabricated testimonials, awards, sales numbers, client stories,
  listings or market statistics.
- **Volatile sections are stripped at import, not trusted to the model.** `19` says to verify
  anything that can change — law, MLS policy, buyer-agreement requirements, compensation rules,
  advertising rules, TCPA/text-consent rules, platform policy, rates, fair housing guidance. Mark
  those sections `volatile: true` and have `get_coaching_playbook` **exclude their factual claims**,
  returning the principle plus an explicit "verify current rule" marker. A model that never receives
  a stale rule cannot repeat one.
- **Tool-boundary enforcement:** the coach has no send tool and no unapproved write tool. Any
  client-facing text it drafts runs through Part A6's compliance lint before it can be published or
  sent, and lands as `DRAFTED / NOT SENT` — the demo's existing four-state vocabulary
  (`DONE / DRAFTED / NEEDS APPROVAL / PROHIBITED`) already covers this; reuse it.
- **The single most likely misfire — the NMLS trap.** `01` and `19` both instruct that mortgage
  marketing copy carry *"Jeremy McDonald, NMLS# 2121161, Licensed in CA"*, and `01` explicitly says
  **not** to add Jeremy's licensing to another person's Realtor marketing. The corpus is Jeremy's;
  RCRE agents are not Jeremy, are not loan originators, and are not licensed in CA. Mark those
  sections `applies_to: 'jeremy_only'` at import and **never surface them to an RCRE agent.** An
  RCRE agent's listing flyer carrying a mortgage NMLS number is a real advertising problem in two
  states. This is the clearest case in the corpus where a straight lift would be wrong.
- **Consent and outreach.** `19` requires DNC/TCPA/consent consideration before recommending
  outreach at scale. GOVERNANCE §5 already makes consent state a first-class field. The coach must
  read consent state before recommending a call or text cadence, and must not recommend scaled
  outreach to non-consented contacts. Server-side check, not a prompt reminder.
- **Fair housing:** the coach raises flags and defers to a human, exactly as Part A6. `goal.md`
  lists "fair housing judgments" among prohibited actions.

## C7. Where the coach appears

- **RCRE Today** — the morning briefing is already the surface; the coach supplies the *why*.
- **RCRE AI** — "why am I stuck?", "plan my day", "what should I learn next?" (the last already has
  `get_next_lesson`, and Part B6 gives it a better answer).
- **A weekly accountability review** — `01`'s coaching sequence, run as a real weekly artefact:
  what was committed, what happened, the gap, the next commitment.
- **RCRE Command** — team-level bottleneck patterns for the broker.

`[Needs RCRE policy]` Whether a broker sees an *individual agent's* coaching diagnosis. A coaching
conversation an agent knows is being read by their broker becomes a performance review, and the
corpus's candour (`01`: *"Do not hide weak performance behind encouragement"*) depends on it not
being one. `[DP]` Broker sees the same computed signals in Command (they already do — that is
accountability) but **not** the agent's private coaching dialogue. Confirm with RCRE.

---

# §4. Blockers, open questions, and things I could not verify

**Requires RCRE business or legal policy (do not infer these):**
1. What counts as "public marketing" for the middle column in A4 (past-client email, 1:1 templated
   text, agent video script).
2. Who approves what, and whether any agent cohort is ever exempt from the marketing gate.
3. Consent, retention and platform-terms status of Taquilla's **recorded live Zillow calls**.
4. Whether filming and distributing state association contract forms (FAR/BAR, AAR) as training is
   permitted, and whether any live client data appears in those recordings.
5. Whether a broker may see an individual agent's coaching diagnosis (C7).
6. Free-tier vs paid-tier split for the Skool community, and how it avoids competing with RCRE
   recruiting (B7).
7. Definition of "required follow-up" — still open from Taquilla's discovery, and the coach's
   follow-up bottleneck depends on it.

**Unverified technical assumptions `[TA]`:**
- RCRE's exact MLS memberships per market, and each MLS's attribution/display rules (A5).
- Skool's API surface — deliberately designed around, so nothing depends on it (B7).
- Which channels RCRE can actually publish to, and what each reports back (A9). Until verified,
  every metric defaults to `unavailable`.
- Dotloop API access (Jeremy's open action item from the meeting) — relevant to the document
  walkthrough training but not blocking it.

**Discrepancies found in existing artefacts:**
- Coach corpus is 71KB across 20 files, not ~96K (§0).
- `academy-types.ts`'s header comment ("nothing has been recorded or rendered yet") is stale against
  its own data, which now has 2 videos.

**Scope discipline note.** Against `goal.md`'s three-function scope defence: Part C is Function 3
directly. Part B is the retention/recruiting benefit and feeds Function 3 (training gap as a
coaching signal). **Part A is the weakest fit** — it is P1.2, not P0, and it is the easiest place in
this plan to over-build. The recommendation is to build the *library and the approval gate* (which
are structural and cheap) and to keep exactly **one** end-to-end generation flow — the listing
campaign that already exists — rather than lighting up all eleven workflows.
