# V2 Planning — Recruiting OS expansion + role and permission model

**Status:** PLANNING PASS. No code, no migrations, no connections. Research/design only.
**Author:** subagent (recruiting + roles lane), 2026-08-26
**Scope authority:** RCRE_GOAL_FULL_BUILD.md, RCRE-PRODUCT-REQUIREMENTS.md, ADR-0008/0011/0012/0013/0014,
GOVERNANCE.md §5 (compliance), 2026-08-24 Taquilla Allen leadership answers, 2026-08-26 meeting notes.

Labels preserved from RCRE-PRODUCT-REQUIREMENTS.md:
**[VLR]** verified leadership requirement · **[DP]** design proposal (ours, not approved) ·
**[TA]** technical assumption (believed, unverified).

---

## 0. Source facts this design rests on (with provenance)

From the 2026-08-26 meeting transcript (`RCRE & Jeremy AI + - 2026_08_26 09_58 EDT - Notes by Gemini.md`):

| Fact | Where | Label |
|---|---|---|
| Alabama has **two agents**; Julio and Taquilla also work that market. "we're trying to recruit more agents" | 00:34:56 | **[VLR]** |
| A recruiting vendor quoted "**$15,000 or something crazy**"; declined. RCRE is looking for "a company or **a system** to help recruit" | 00:34:56 | **[VLR]** |
| Taquilla: "some of the stuff that you're saying to me **will draw agents**… not only when you come here this is what you're going to have access to" | ~00:26:12 | **[VLR]** — the platform is the recruiting pitch |
| Taquilla: "we're trying to be able to **pass these tasks down to other people** so we're not having to do these things" | 00:26:48 | **[VLR]** — delegation is the driver behind the role model |
| Taquilla, on team leads: "how you say you set up for your team leads… as we grow… that's definitely going to be valuable" | 00:26:48 | Softens A-17 but does **not** close it |
| **Margie is the transaction coordinator for Florida** (Julio answers "Florida" to "is Margie your TC for everybody?") | 00:29:48 | **[VLR]** |
| dotloop is the e-sign platform, ~$500/mo, a Zillow product, "not really" more than e-signing; **API access unverified** | 00:30:47–00:31:57 | **[VLR]** + open item |
| Taquilla: agents must work out of **one CRM** to avoid confusion | 00:31:57 | **[VLR]** — reinforces ADR-0012 |
| Jeremy recommends **OpenRouter** (free/cheap models, ~10k prompts/day on a $10 balance), **DeepSeek**, **MiniMax**; users' **own ChatGPT subscription for image generation** | 00:14:02–00:16:06 | Confirms ADR-0011 |
| Jeremy recommends RCRE stand up a **Skool community** ("school community" in the transcript): free classroom + paid upsell + coaching revenue from out-of-market agents, used to "attract real estate agents to join your brokerage" | 00:16:06–00:17:16, 00:41:40 | **[DP]** — Jeremy's recommendation, not yet an RCRE decision |
| Jeremy already runs a Skool for loan officers (**128 LOs, ~2–3 weeks old**) and just launched one for real estate agents | 00:17:16 | Context |
| **Instagram and YouTube business accounts do not exist yet.** Facebook is the only channel. Taquilla to coordinate with their social media person | 00:44:47, Next steps | **[VLR]** |
| Julio holds MLS access for **Miami, Orlando/Stellar, Gainesville** plus NE Florida; agents in those markets are "a couple… could do referrals" | 00:39:08 | **[VLR]** |
| Leadership agreed to **replace the Luxury Presence website** with a custom portal/site | Decisions section | **[VLR]** — this reopens ADR-0005 and RCRE_GOAL_FULL_BUILD's "do not rebuild the live site". **Not this lane's call — flag to coordinator.** |
| Taquilla wants **Zillow-specific training** but "not every agent in the future is going to be on Zillow" | 00:27:45 | **[VLR]** — training entitlement must be per-cohort, not per-role |

From the 2026-08-24 Taquilla answers: the ISA making recruiting calls exists and is **underperforming**;
the six recruiting pillars are systems/structure · coaching/mentorship · multi-market · business
development · accountability coaching · training and education, and **AI is not the headline**.

---

# PART A — THE RECRUITING OS

## A1. What the current Recruiting surfaces already do (verified by reading the code)

Files read: `apps/rcre-demo/src/app/recruiting/page.tsx`, `recruiting/[id]/page.tsx`,
`components/RecruitPipeline.tsx`, `components/RecruitSignals.tsx`, `data/demo.ts`,
`app/command/page.tsx`, `app/join/page.tsx`, `components/TrainingAccess.tsx`.

**Already built and genuinely good — reuse, do not rebuild:**

1. **Channel mix panel** — groups the 5 prospects by `channel` across 7 values
   (`AI Academy · Join page · Facebook · Instagram · YouTube · Referral · ISA call`), counts
   "highly engaged" per channel, and renders `ISA call` with a muted dot so the inbound/outbound
   contrast is the layout rather than a claim. The code comment is explicit that this shows the
   shape rather than asserting the vendor conclusion. This is the right instinct and it satisfies
   the goal doc's "do not fabricate that as a public claim".
2. **Recruit pipeline board** — 7 stages, `New Prospect → Contacted → Conversation → Meeting →
   Considering → Onboarding → Joined`, horizontally scrollable, empty stages preserved.
3. **Deterministic attention ordering** — `priority` (high/med/low) × `nextAction.urgency`
   (now/today/this week). Same discipline as lead priority. No model scoring.
4. **Four evidence signals per prospect** — `training` (courses completed / 14, last activity),
   `websiteEngagement` (join-page views, minutes on site, last visit), `lastTouchAt`,
   `onboardingStep` (5-step ladder: Not started → Paperwork sent → License transfer → Systems setup
   → Complete).
5. **Nia Okonkwo journey** — 9 timestamped events from organic search → free Academy course →
   completion → second course → community question → return visit → recruiter note → two Join-page
   reads. This is the single best asset in the recruiting story: it is the education-to-recruiting
   funnel drawn end to end, and it explains *why* she is priority-high without a score.
6. **Drafted outreach, never sent** — `outreach.{channel, body}`, revealed on request. Julio's draft
   cites her actual Academy behaviour. Correct approval posture.
7. **Confidentiality framing** — the page header states prospects are licensed elsewhere, nothing is
   visible to agents, nothing syncs to the brokerage CRM. Backed by real RLS (see Part B).
8. **Command integration** — `/command` surfaces "Recruits who need attention" (high priority with a
   due action) and an engaged-recruit count, linking through. Exceptions-first is preserved.
9. **Provenance line** — "Academy progress and Join-page activity are RCRE's own systems reporting
   on a prospect who chose to use them. Nothing here is scraped, purchased, or inferred." This is a
   compliance statement as much as a design one (GOVERNANCE.md §5, recruiting communications).
10. **`TrainingAccess.tsx`** — `isOpenCourse()` reads `course.publicPreview` from data and there is
    deliberately **no override, no id list, no heuristic**. `/join` and `/training` cannot advertise
    different open courses. Only **3 of 14** courses carry `publicPreview: true`:
    *ChatGPT Setup and Personalization*, *Prompting for Real Estate*, *AI Advantage Elite Preview*.
    `RESTRICTED_COURSE_COUNT` (11) is countable in public copy but never displayed.

**Schema that exists:** `recruiting_prospects` (0001) with
`full_name, email, phone, current_brokerage, market, stage(text, default 'new'), is_confidential,
owner_user_id, attribution_id, notes, first_received_at, first_touch_at, last_touch_at`.

## A2. What is missing — the honest gap list

**Data model gaps (the demo has richer fields in TypeScript than the database has in SQL):**

| Missing from `recruiting_prospects` | Why it is needed |
|---|---|
| `channel` / source | The channel-mix panel is the whole argument; today it lives only in demo TS |
| stage as a **constrained enum** matching the 7 board stages | `stage text default 'new'` cannot back a pipeline board |
| `priority`, `engagement`, `score`, `score_computed_at`, `score_reasons jsonb` | Deterministic scoring must be persisted with its reasons, not recomputed opaquely |
| `next_action_label`, `next_action_urgency`, `next_action_due_at` | Command's "recruits who need attention" needs a real due date, not a word |
| `onboarding_step` + `onboarding_started_at` | Onboarding is the only stage with a checklist |
| `license_state`, `license_number`, `markets[]` | Two states, five MLSs; a Birmingham recruit and a Miami referral are different pipelines |
| `do_not_contact`, `dnc_reason`, `consent_sms`, `consent_email`, `consent_captured_at`, `consent_source` | GOVERNANCE.md §5: TCPA consent must be first-class; recruiting outreach to agents at other brokerages carries do-not-contact and MLS-roster-usage risk |
| `owner_user_id` already exists — add `assigned_at`, and an **assignment history** for recruiting | Same accountability logic as leads: who owned it, when, and did they touch it |
| `referred_by_user_id` | Referral is a named channel and RCRE agents are the referrers; unattributed referrals cannot be rewarded |

**Missing tables (all RCRE-owned; none of this belongs in FUB — ADR-0012):**

- `recruiting_events` — the append-only journey ledger (what powers the Nia timeline). Kinds:
  `academy_enrolled, lesson_completed, course_completed, community_post, community_reply,
  join_page_view, site_page_view, form_submit, webinar_registered, webinar_attended, email_open,
  email_click, ad_click, call_attempt, call_connected, meeting_held, referral_created,
  offer_extended, paperwork_sent, license_transfer_started, joined`. Append-only, no UPDATE/DELETE
  policy (same posture as `activity`/`stage_transitions`).
- `academy_learners` — external (non-RCRE) Academy/Skool learners, with their own consent record.
  **Must be separate from `people` and separate from `recruiting_prospects`**: a learner is not
  automatically a recruiting prospect, and promoting one is a deliberate act.
- `learner_identity_links` — the resolution table (email hash → learner → prospect), with
  `confidence` and `linked_by`. Identity resolution is the mechanism that makes education feed
  recruiting, and it is exactly where a privacy mistake would happen, so it is explicit and audited.
- `recruiting_sequences` / `recruiting_sequence_steps` / `recruiting_sequence_enrollments` —
  follow-up cadence. Mirrors `follow_up_policies` for leads: **empty until RCRE defines it**, same
  reason (never silently invent brokerage policy).
- `recruiting_appointments` — separate from FUB `appointments` (those are client appointments and
  come from FUB; a recruiting coffee meeting is confidential and must not reach the client CRM).
- `onboarding_checklists` / `onboarding_tasks` — the 5-step ladder made real, per state
  (AL vs FL license transfer differ; do not model one path).
- `recruiting_campaigns` — links `attribution` rows to a recruiting spend source, so
  cost-per-joined-agent is computable when ad spend is authorized.

**Surface gaps:**

- No **recruiter workspace**. `/recruiting` is a broker screen. The ISA/recruiter needs a call-queue
  view: who to call now, the script, the last three signals, log outcome, set next action.
- No **ISA activity accountability**. Leadership's #1 lead complaint — "we have no good way of
  knowing whether the proper follow-up actually happened" — applies verbatim to the ISA and today
  nothing measures it. Dials, connects, conversations, meetings set, meeting-held rate, per week.
  This is the evidence base that turns "the ISA is underperforming" from an impression into a
  number, and it is the honest way to make the vendor-versus-system case.
- No **channel ROI panel**: prospects → engaged → meetings → joined, and cost per joined agent by
  channel. Command shows counts, not conversion.
- No **referral surface for agents**. Referral is a channel with no agent-facing entry point. An
  agent must be able to submit a referral **without** gaining any view of the recruiting pipeline
  (see Part B — this is a write-only affordance).
- No **nurture / long-term** stage. The board ends at `Joined`; a prospect who says "not this year"
  currently has nowhere to go except being deleted or aging in `Considering` forever.
- No **onboarding surface** past a progress bar.
- No **appointment set/held** distinction anywhere in recruiting.

## A3. How external AI education feeds recruiting (the core of the expansion)

**The thesis, in leadership's own words:** the platform is the pitch (00:26:12). The Academy is how a
stranger experiences the platform before they ever talk to a broker. Nia's journey already
demonstrates it; the job of V2 is to make that journey a system rather than a story.

### A3.1 The funnel, stated as stages with owners

```
PUBLIC                            RCRE-OWNED                       CONFIDENTIAL
Skool community (external)  ->  Academy account (learner)  ->  recruiting_prospects
YouTube / IG / FB               3 open courses only            broker + recruiter only
Website / Join page             community participation
Referral from an RCRE agent     Join-page behaviour
```

**Four gates, each deliberate:**

1. **Anonymous → Learner.** Someone enrols in an open Academy course or joins the Skool community.
   They become an `academy_learners` row. Consent for education email is captured at signup. This is
   NOT a recruiting record and no recruiter sees it as one.
2. **Learner → Signal.** Their behaviour accrues in `recruiting_events`: lessons completed, community
   posts, session attendance, Join-page reads. Still not a prospect.
3. **Signal → Prospect (the promotion gate).** A learner becomes a `recruiting_prospects` row when
   **either** (a) they take an explicit recruiting action — Join-page form, "talk to a broker",
   referral submitted, meeting request; **or** (b) a human recruiter/broker promotes them after
   reviewing their signals. **[DP] Never auto-promote on behaviour alone.** A licensed agent who
   took a free course did not consent to being worked by a recruiter, and RCRE's own copy on the
   recruit page ("nothing here is scraped, purchased, or inferred") has to stay true. Promotion is
   an `audit_events` entry with `actor_user_id`.
4. **Prospect → Agent.** Onboarding checklist, per state, ending with a `users` row and an FUB seat.
   Their `academy_learners` record is **linked, not merged** — training history should survive the
   transition, which is also the retention story.

### A3.2 Skool specifically

Jeremy's recommendation (00:16:06–00:17:16) is a free Skool community with a basic classroom, an
explicit "we have a paid version" upsell, plus paid coaching for out-of-market agents. Two revenue
purposes and one recruiting purpose.

**[DP] Design decision: Skool is the front porch, RCRE is the house.**

- **Skool holds:** the free community feed, curated YouTube posts (Jeremy's own pattern: post
  someone else's video, then relate it back to the vertical), the free classroom = **only the 3
  `publicPreview` courses**, live session announcements, discoverability.
- **RCRE holds:** all 11 restricted courses, all lesson video/handouts/prompt packs for those, every
  identity record, every recruiting record, all consent, all audit.
- **The bridge is one-way and thin:** Skool → RCRE via a tracked join link
  (`?utm_source=skool&rc=<opaque token>`) landing on RCRE Academy signup. **[TA] Skool's API surface
  and webhook capability are UNVERIFIED — I did not check them and had no network access.** Do not
  design a dependency on Skool webhooks until someone verifies them. The fallback that always works
  is link attribution plus email match at RCRE signup.
- **Never send RCRE prospect data, agent data, or client data into Skool.** Skool is a third-party
  SaaS on RCRE's public side; treat it exactly like the public website.

**Duplication risk to name now:** the demo already has an *internal* community
(`/training/community`, 9 categories, real lesson links). Skool is an *external* community. Running
both is a real cost and leadership has not agreed to either. **[DP]** Recommended split — Skool is
public/recruiting/lead-gen and stays deliberately basic; the in-platform community is
members-only, references real lessons, and is part of what a recruit is shown they will get. If
leadership only wants one, the in-platform one is the one that supports the pitch "when you come
here this is what you're going to have access to".

### A3.3 The paid-content leak rule — technical enforcement, not policy prose

The existing `TrainingAccess.tsx` rule is correct and must be **hardened, not loosened**, when the
Academy becomes publicly reachable:

- `publicPreview` stays the single source of truth. No override constant, no level heuristic, no
  per-surface allow-list. **[DP]** Add: changing `publicPreview` requires **broker approval**, not
  trainer-only — it is the switch that decides whether paid content becomes free, and a Trainer
  should propose it while a Broker approves it. Log both in `audit_events`.
- **Enforce at the data layer**, not the component layer. Public/anonymous requests must resolve
  lessons through a query that filters on the course's `publicPreview` before any lesson row is
  returned; a component-level `if` is one refactor away from a leak.
- Assets (video, handouts, prompt packs) for restricted courses must be served through signed,
  expiring, authenticated URLs. A static `/academy/...` path that guesses correctly is a leak
  regardless of what the UI renders.
- The public surface may state counts ("14 courses, 181 lessons, 3 open") — the existing `/join`
  copy already does this correctly — but must never render a restricted course's title-plus-lessons
  as a browsable object.
- Tests: extend the existing static-analysis discipline (`tests/unit/rls-policy.test.ts` already
  fails the build if `'agent'` appears in a recruiting policy) with an equivalent that fails the
  build if any public route can reach a lesson whose course is not `publicPreview`.

### A3.4 Channel-by-channel plan

| Channel | Status today | V2 design | Label |
|---|---|---|---|
| **AI Academy** | 3 open courses; Nia's path proven in the demo | Primary inbound engine. Course completion + community participation are the highest-quality signals RCRE can obtain legally | **[DP]** |
| **Skool community** | Does not exist for RCRE | Free front porch; discovery + upsell + coaching revenue | **[DP]** Jeremy's recommendation |
| **In-platform community** | Built, members-only | Retention + a live proof point to show recruits | Built |
| **Website / Join page** | Built; join-page view tracking modelled | Keep. Add "talk to a broker" and "take a free course" as two distinct, separately attributed CTAs | **[DP]** |
| **Facebook** | The only real channel RCRE has | Organic + paid recruiting creative, broker-approved | **[VLR]** |
| **Instagram** | **Does not exist yet** | Blocked on account creation (Taquilla's action item) | **[VLR]** |
| **YouTube** | **Does not exist yet** | Long-form is the best-fit recruiting content (agent coaching, podcast playlists per 00:44:47) but is a content-production commitment, not a switch | **[VLR]** |
| **Referral** | Named channel, no surface | Agent-facing write-only referral form + attribution to the referring agent | **[DP]** |
| **ISA calls** | Real, underperforming | Do not delete it — **instrument it**. Give the ISA a queue ordered by warm signals so the same person calls better prospects | **[DP]** |

> **Demo-data correction for the coordinator:** the Recruiting screen currently shows Instagram and
> YouTube as live acquisition channels. Those accounts do not exist yet. This is fine in a clearly
> synthetic demo, but it must never be described to RCRE as current performance. Consider adding a
> "channel not yet live" state so the demo is honest and the roadmap is visible in the same view.

### A3.5 Recruiting lead scoring — deterministic, explainable, and capped

Same discipline as lead priority: **no model decides.** [TA] every input is an RCRE-owned event.

**[DP] Proposed inputs (weights are illustrative and require leadership sign-off):**

- *Education depth*: lessons completed (2), courses completed (8), second course started (6),
  live session attended (8)
- *Community*: posted a question (5), replied to others (3), returned within 7 days (4)
- *Recruiting intent*: Join-page view (4, cap 12), >3 min on the tools section (5), form submit (20),
  requested a meeting (30)
- *Relationship*: referred by an RCRE agent (15), replied to outreach (10), meeting held (25)
- *Fit*: licensed in an RCRE market (5), team lead / brings agents (10)
- *Decay*: −1/day of silence after 14 days; **hard reset to nurture at 60 days of no signal**
- *Hard blocks*: `do_not_contact` → excluded entirely; no consent → no automated outreach, manual
  only

**Rules the score must obey:**
- Every point is stored with its reason in `score_reasons` and shown in the UI as a sentence with a
  date. The existing recruit page already does this ("What RCRE AI sees") — keep that pattern and
  make it the *only* pattern.
- The score orders a queue; it **never** auto-sends, auto-promotes, or auto-disqualifies.
- **No fair-housing-adjacent or protected-class input, ever.** No inference from name, photo,
  neighbourhood, school, language, or "culture fit". Production, market, licensure and behaviour
  only. This is a GOVERNANCE.md §5 hard line, and it applies to recruiting because recruiting
  selection on protected characteristics is an employment-law problem on top of a fair-housing one.
- Never scrape or repurpose an MLS agent roster to build the pipeline (GOVERNANCE.md §5). If a list
  is ever purchased or supplied, it needs its own provenance field and its own consent posture.

### A3.6 Follow-up, appointments, onboarding

- **Follow-up cadence** is `recruiting_sequences`, empty until RCRE defines it — identical posture to
  `follow_up_policies`. P0.2.2 is blocked for leads for exactly this reason; do not accidentally set
  a recruiting precedent that invents brokerage policy.
- **Every outbound message is drafted, never auto-sent.** Jeremy stated the preferred shape himself
  at 00:30:47 — the system drafts, a human reviews, approves, sends. Keep `outreach` as
  draft-only in the MVP; there is **no send tool** (goal doc, MCP section).
- **Appointments**: model `set` and `held` separately. Meetings set is a vanity number; meetings held
  is the recruiting funnel's real conversion point, and it is the number that will settle the
  ISA-versus-system question.
- **Onboarding** must fork by state (AL vs FL license transfer), and should hand off cleanly:
  create the `users` row, assign role, request the FUB seat, enrol in the internal community, assign
  the required training cohort (including the Zillow track only if that agent is on Zillow —
  00:27:45).

## A4. Suggested build order (recruiting)

1. Persist what the demo already proves: extend `recruiting_prospects`, add `recruiting_events`.
   Nothing new is visible; everything downstream depends on it.
2. Recruiter workspace + ISA activity instrumentation. This is the cheapest thing that changes a
   real business outcome and it produces the evidence for every later argument.
3. Academy learner records + identity linking + the promotion gate (with audit).
4. Channel ROI panel on Command; nurture stage; referral write-only surface for agents.
5. Sequences and appointments (set/held), still draft-only.
6. Onboarding checklists per state.
7. Skool bridge — last, because it depends on an unverified third party and on leadership actually
   deciding to run one.

---

# PART B — ROLES AND PERMISSIONS

## B1. Where the model is today (verified)

- Enum (0001): `('owner','broker','team_lead','agent','staff','recruiter','viewer')`.
- 0003 RLS is genuinely strong: every policy opens with `organization_id = rcre_current_org()`;
  FORCE RLS everywhere; deny-by-default per command; append-only ledgers have no UPDATE/DELETE
  policy for any role including owner; `people/deals/appointments` have no user-facing write
  policies at all (FUB is system of record); `NO CONTEXT → NO ROWS`.
- Helper predicates: `rcre_is_broker()` = owner|broker · `rcre_is_org_wide_reader()` =
  owner|broker|staff · `rcre_scoped_user_ids()` = self, plus led-team members for `team_lead` ·
  `rcre_can_see_person()` centralises person visibility · unrouted leads
  (`assigned_user_id IS NULL`) are visible only to org-wide readers.
- `recruiting_prospects` SELECT/INSERT/UPDATE is inlined to `('owner','broker','recruiter')` with a
  build-failing test if `'agent'` ever appears. DELETE is broker-only.
- The **demo app has only two roles** (`'agent' | 'broker'`), with `BROKER_NAV` / `AGENT_NAV` and
  hard redirects (`if (user.role !== 'broker') redirect('/today')`). The demo is where the new roles
  become visible; the database already anticipates most of them.

**Two mismatches worth naming:**

1. **The ISA is mapped wrong.** 0003's comments describe `staff` as "the ISA and the admin desk
   work leads across the whole brokerage". RCRE's actual ISA makes **recruiting** calls, not lead
   calls. Mapping RCRE's ISA to `staff` would hand them the entire client book and give them no
   access to the pipeline they actually work. **RCRE's ISA must be `recruiter`.** Keep `staff` for a
   future lead/admin desk.
2. **Demo-data collision.** The demo has an agent named "Margie Olsen-Alvarez, REALTOR®"
   (`u-margie`). The real Margie is Florida's transaction coordinator. Rename the demo agent or
   recast that persona as the TC — otherwise the TC demo will contradict itself on screen.

## B2. The updated role model

**Proposed enum additions:** `transaction_coordinator`, `marketing_admin`, `trainer`.
Additive only — Postgres `ALTER TYPE ... ADD VALUE` is non-destructive, and every existing policy
that enumerates roles denies unknown values by construction, so a new role starts with **zero**
access until policies are written for it. That is the correct default and it should be stated in
the migration header.

**Proposed predicate additions:**
`rcre_is_owner()` (owner only) · `rcre_is_transaction_coordinator()` ·
`rcre_coordinated_deal_ids()` (SECURITY DEFINER, org-filtered, like `rcre_led_team_ids()`) ·
`rcre_can_see_deal(deal_id)` (the deal-side analogue of `rcre_can_see_person()`).

---

### 1. Broker Owner — Julio Arango, Qualifying Broker → `owner`

- **Lands on:** `/command`.
- **Sees:** everything inside the organization. Full client book, all deals and values, all agent
  performance, full recruiting pipeline, full funnel reporting, audit log, sync state, integration
  state, all policies, all training and marketing.
- **May do:** everything a Managing Broker may do, **plus** the owner-only set: assign and change
  roles, manage integration credentials and the FUB kill switch, write `hermes_tool_permissions`,
  delete `follow_up_policies` / `stage_aging_policies`, delete recruiting prospects, approve
  `publicPreview` changes, approve any legally consequential document.
- **Never sees:** another organization's data — no exception, no support account, no reporting job
  (0003's non-negotiable rule). May not edit or delete an audit event, ever.

### 2. Managing Broker — Taquilla Allen → `broker`

- **Lands on:** `/command`.
- **Sees:** the same operational surface as the owner — full book, deals, agent performance,
  recruiting, reporting, audit log (read).
- **May do:** all lead routing and reassignment; approve public marketing (compliance gate);
  approve outbound recruiting outreach; set follow-up and stage-aging policy; manage teams and team
  membership; run and export reporting.
- **Never sees / may not do:** role assignment, integration credentials, MCP tool-permission writes,
  policy deletion. **[DP]** — this split does not exist today (`rcre_is_broker()` covers both) and
  is a proposal, not something RCRE asked for. It exists because a Qualifying Broker holds the
  licence and the platform's authority surfaces should follow the licence. **If leadership says
  Taquilla and Julio are peers, drop the split — do not implement it silently.**

### 3. Team Lead — Alabama layer → `team_lead`

- **Lands on:** `/team` **[DP]** — a scoped Command: their team's unanswered leads, overdue
  follow-ups, stage aging, and stale statuses. Not brokerage-wide.
- **Sees:** members of teams they lead (already implemented via `rcre_led_team_ids()`); those
  members' people, activity, tasks, appointments, stage history, engagement, and deals.
- **May do:** distribute a lead handed down by leadership (path 3 in P0.6); set team-level next
  actions; see and coach their team's numbers.
- **Never sees:** other teams, brokerage-wide performance, recruiting (any), audit log, integration
  state, policy writes, commissions outside their team.
- **Open dependency:** lead distribution is a write, and `people` has **no user-facing write
  policy** by design. **[DP]** Route it through an RCRE-owned `assignment_intents` table the team
  lead may INSERT into, which the authorized FUB write path later executes. Do not add an UPDATE
  policy to `people` to solve this — that would break ADR-0012's "never blind-overwrite FUB".
- **Still unconfirmed (A-17).** Taquilla spoke about team leads positively at 00:26:48 but no one
  has defined their authority. Build the scope; get the answer before enabling writes.

### 4. Agent → `agent`

- **Lands on:** `/today`.
- **Sees:** their own book only — their people, activity, tasks, appointments, deals, stage history,
  engagement; their own training progress; the members-only community; the brokerage policies they
  are measured against (0003 is right that an invisible rule is surveillance, not accountability);
  their own `users` row.
- **May do:** work their book; log activity; create and complete their own tasks; build marketing
  drafts and submit for broker approval; take training; post in the community; **submit a recruiting
  referral (write-only)**.
- **Never sees:** any recruiting prospect (hard rule, build-enforced), another agent's book, deals,
  or performance; another agent's `users` row; the audit log; webhook payloads; sync/integration
  state; commission data other than their own.
- **Open product question:** should agents see a brokerage leaderboard? Leadership has not asked for
  one. Default is no.

### 5. Transaction Coordinator — Margie (Florida) → `transaction_coordinator`

This is the role the meeting added and the one most likely to be got wrong, because the intuitive
implementations are "give her broker access" (leaks recruiting and performance) or "give her agent
access" (useless — she works across agents). Neither is right.

**Scoping mechanism (the load-bearing decision).** A TC's authority is **per transaction**, not
per agent and not brokerage-wide. **[DP]** Introduce an RCRE-owned join table
`deal_coordinators (organization_id, deal_id, coordinator_user_id, assigned_at, assigned_by)`, plus
an optional default-routing rule (`coordinator_scopes`: state/market → coordinator) so new Florida
transactions land with Margie automatically without a manual step. Both tables are RCRE-owned, so
nothing is written back into the FUB-mirrored `deals` row.

Why not reuse `teams`? Because 0002 treats teams as FUB-sourced structure and a TC scope is an RCRE
operational assignment. Overloading teams would make "who leads a team" and "who coordinates a
transaction" the same question, and they are not.

- **Lands on:** `/transactions` **[DP]** — a closing-calendar dashboard: transactions by closing
  date, deadlines and contingencies expiring this week, missing documents, files awaiting signature,
  and what needs an agent's action today. This is the TC's version of exceptions-first.
- **Sees (scoped to transactions assigned to her):**
  - the `deals` row: stage, price, projected close date, milestones, status
  - the linked `people` row for parties **to that transaction only** — name, contact details,
    property. Reached through the deal, not through the client book.
  - transaction documents, checklist items, deadlines, and transaction-linked appointments
    (inspection, appraisal, walkthrough, closing)
  - the assigned agent's name and contact — she has to chase them
  - `stage_transitions` and `activity` for that person, **from contract forward** — she needs the
    transaction history, not the courtship that preceded it
- **May do:** create/update transaction tasks, deadlines and document status; upload and request
  documents; draft emails to agents and clients (**draft only** — 00:30:47: draft → review →
  approve → send); log transaction activity; request a stage update through the approval path.
- **Never sees — state this explicitly in the policy comments:**
  - **any `recruiting_prospects` row.** She is not owner/broker/recruiter. The existing inline role
    list already excludes her; keep it inline and add `transaction_coordinator` to the
    build-failing forbidden-role test alongside `'agent'`.
  - **agent performance data** — no response times, contact attempts, conversion rates, scorecards,
    no Command, no reporting-by-agent. She coordinates transactions; she does not evaluate people.
  - **the pre-contract lead book.** No new leads, no unanswered leads, no nurture, no unrouted
    leads. Deals-forward only.
  - **deals she is not assigned to**, and no brokerage-wide production or commission totals. If
    commission fields are ever added, put them in a separate broker-only table rather than widening
    `deals`.
  - the audit log, webhook payloads, sync/integration state, `hermes_tool_permissions` writes,
    policy writes.
- **State scoping is real, not cosmetic.** Margie is Florida's TC (00:29:48). Alabama's TC
  arrangement is **unknown** — do not assume Margie covers it and do not assume nobody does.
  `coordinator_scopes` makes the answer configurable rather than assumed.
- **dotloop:** the e-sign integration is the natural TC surface, but its API access is unverified
  and Jeremy owns that action item. Design the document/checklist model so it works with **no**
  e-sign integration (manual status), and treat dotloop as an adapter added later.

### 6. Marketing / Admin → `marketing_admin`

- **Lands on:** `/marketing`.
- **Sees:** all listings and their marketing state; campaigns and the content calendar; brand assets;
  the approval queue; channel/attribution **aggregates** (which source produced leads); the agent
  roster's public-facing fields — name, headshot, title, market, licence number — because
  state licence-display rules apply to every asset they produce (GOVERNANCE.md §5).
- **May do:** create and edit campaigns and creative; schedule content; run the fair-housing /
  compliance pre-check; submit for broker approval; manage brand assets and templates.
- **May NOT do:** **publish anything publicly without broker approval.** This is a compliance
  control, not a workflow nicety (P1.2). Enforce it in data — a `campaign_assets.status` that only a
  broker's approval transition can move to `approved`, plus an audit entry — not in the UI.
- **Never sees:** recruiting prospect **identities**; client PII beyond what a listing or campaign
  requires; deals, commissions or production; agent performance scorecards; the audit log.
- **The recruiting-creative edge case:** marketing will inevitably need to build recruiting ads.
  **[DP]** Split it: `marketing_admin` may see recruiting **campaign and channel aggregates**
  (spend, clicks, cost per prospect) but **no prospect names, emails, phones or notes**. Aggregates
  are a marketing artefact; identities are confidential. If a specific person must be involved in
  recruiting outreach, give that individual the `recruiter` role deliberately rather than widening
  what `marketing_admin` means.

### 7. Trainer / Coach → `trainer`

- **Lands on:** `/training` in an authoring view.
- **Sees:** the full curriculum, published and draft; per-agent training progress and completion for
  RCRE agents; community activity for moderation; cohort/entitlement assignments; **aggregate**
  external-learner engagement (course completion rates, drop-off) — counts and cohorts, not a
  browsable list of named strangers.
- **May do:** author and edit lessons; upload resources; publish/unpublish internal content; assign
  cohorts (e.g. the Zillow track for agents who are actually on Zillow — 00:27:45); moderate the
  community; run live sessions; **propose** a `publicPreview` change.
- **May NOT do:** flip `publicPreview` unilaterally (broker approves — it is the paid-content gate);
  export learner PII.
- **Never sees:** the client book, deals or commissions, recruiting prospect identities, agent
  performance beyond training completion, the audit log.
- **Note:** in RCRE's real life today this is Jeremy and Taquilla wearing a second hat. That is fine
  — a person can hold `broker` and still act as trainer — but the role must exist separately so a
  contract coach can be added later without being handed the brokerage.

### 8. Recruiter (ISA) → `recruiter` — already in the enum, now given a real job

- **Lands on:** `/recruiting/queue` **[DP]** — a call queue ordered by the deterministic score, with
  the three most recent signals, the script, and a one-tap outcome log.
- **Sees:** the recruiting pipeline; prospect records and notes; recruiting attribution (already
  policy-granted through `recruiting_prospects.attribution_id`); their own activity numbers.
- **May do:** create and update prospects; log calls and outcomes; set next actions; draft outreach
  for approval; book recruiting meetings.
- **Never sees:** the client book (no `people`, no leads, no deals — already the case: `recruiter` is
  not in `rcre_is_org_wide_reader()` and gets no client rows from any policy); agent performance;
  the audit log. **May not delete** a prospect (already broker-only — "a recruiter who is leaving
  should not be able to empty the pipeline on the way out").
- **Is itself measured:** dials, connects, conversations, meetings set, meetings **held**, prospects
  advanced. Visible to broker and owner on Command.

### 9. Staff / Viewer — keep, unchanged

`staff` = a future lead/admin desk (org-wide client read, no deals/recruiting/audit). `viewer` =
read-only observer, self-scoped. Neither maps to a real RCRE person today. Leave them alone; do not
retrofit RCRE's ISA into `staff`.

## B3. RLS change map (described, not written — no SQL in this pass)

**Type changes**
1. `ALTER TYPE rcre_user_role ADD VALUE` for `transaction_coordinator`, `marketing_admin`,
   `trainer`. Additive; unknown roles already deny by construction.

**New helper functions (all `stable`, all org-filtered internally, SECURITY DEFINER only where
recursion or partial-visibility correctness requires it — same justification 0003 already gives)**
2. `rcre_is_owner()` — owner only. Used for role assignment, integration credentials,
   `hermes_tool_permissions` writes, policy DELETE, `publicPreview` approval.
3. `rcre_coordinated_deal_ids()` — SECURITY DEFINER, reads `deal_coordinators` + `coordinator_scopes`
   filtered by `rcre_current_org()`, returns the deal ids this TC coordinates.
4. `rcre_can_see_deal(uuid)` — the deal-side analogue of `rcre_can_see_person()`; one place where
   deal visibility is expressed, so the tables hanging off deals cannot each get it slightly wrong.
5. `rcre_can_see_transaction_person(uuid)` — TRUE when the person is a party to a deal in
   `rcre_coordinated_deal_ids()`. Deliberately *not* folded into `rcre_can_see_person()`, because a
   TC's person access is narrower in kind (contract-forward, transaction-linked) and merging them
   would quietly widen the client book.

**Policy edits**
6. `deals_select` — add `or rcre_can_see_deal(id)`. Do **not** add TCs to `rcre_is_broker()`; that
   would hand them brokerage-wide deals, `webhook_events`, `audit_events`, `sync_state` and
   `integration_state` in one move.
7. `people_select` — add `or (rcre_is_transaction_coordinator() and
   rcre_can_see_transaction_person(id))`.
8. `activity_select`, `stage_transitions_select`, `appointments_select`, `tasks_select` — add the TC
   branch via `rcre_can_see_transaction_person()`. **[DP]** additionally clamp the TC's `activity`
   and `stage_transitions` window to `>= deal.created_at` (or contract date) so the pre-contract
   courtship stays out.
9. `person_engagement_select`, `lead_snapshots_select`, `attribution_select` — **no TC branch.**
   Marketing engagement, the raw inbound lead payload, and lead attribution are not transaction
   coordination. Leaving them alone is the decision, and it should be written as a comment so a
   future reader does not "fix" it.
10. `recruiting_prospects_*` — leave the inline `('owner','broker','recruiter')` list exactly as it
    is. Extend `tests/unit/rls-policy.test.ts` so the build fails if `transaction_coordinator`,
    `marketing_admin`, `trainer`, `staff` or `viewer` appears in any policy on that table, matching
    the existing `'agent'` guard.
11. `users_select` — add a narrow TC branch: the TC may read the `users` row of an agent who owns a
    deal she coordinates (she has to contact them). Nothing more.
12. `audit_events_select`, `webhook_events_select`, `sync_state_select`, `integration_state_*` —
    unchanged (broker/owner only). **[DP]** narrow `integration_state_update` and
    `hermes_tool_permissions_*` writes to `rcre_is_owner()` **only if** leadership confirms the
    owner/managing-broker split in §B2.2.
13. `follow_up_policies` / `stage_aging_policies` — SELECT stays every org member (correct).
    **[DP]** DELETE to `rcre_is_owner()` under the same condition.

**New tables, each needing policies written the same way (org test first, deny by default,
per-command)**
14. `deal_coordinators`, `coordinator_scopes` — SELECT broker/owner + the coordinator themselves;
    INSERT/UPDATE/DELETE broker/owner only. A TC must not be able to assign herself a transaction.
15. `recruiting_events` — SELECT owner/broker/recruiter; INSERT owner/broker/recruiter;
    **no UPDATE, no DELETE for anyone** (append-only ledger, same posture as `activity`).
16. `academy_learners`, `learner_identity_links` — SELECT owner/broker/recruiter/trainer, but
    **trainer sees aggregates only**; the cleanest enforcement is a separate aggregate view rather
    than a row-level carve-out, because "aggregate-only" is not a thing RLS expresses well.
    INSERT by ingestion; promotion to prospect writes an `audit_events` row.
17. `recruiting_sequences*`, `recruiting_appointments`, `onboarding_*`, `recruiting_campaigns` —
    owner/broker/recruiter. Not agents, not TCs, not marketing.
18. `campaign_assets` / approval state — marketing_admin may INSERT/UPDATE while `status='draft'`;
    only a broker may transition to `approved`. Enforce the transition in a policy `WITH CHECK`, not
    in application code.
19. `assignment_intents` — INSERT by broker/owner/team_lead (team lead only for people in their
    team); read by the same. Executed later by the authorized FUB write path.

**Application-layer changes that must move in lockstep**
20. `canSeeWholeBrokerage()` in `src/lib/db/repository.ts` mirrors `rcre_is_broker()` and 0003 says
    "if one changes, the other must". Any predicate change here needs the repository change in the
    same commit.
21. The MCP tool registry (`mcp/rcre-mcp-server/`) needs per-role tool grants for the three new
    roles in `hermes_tool_permissions`. A TC gets `get_transaction`, `get_transaction_tasks`,
    `draft_follow_up`, `request_task_creation`, `request_stage_update` — and **not**
    `get_broker_exceptions`, `get_agent_performance`, or anything recruiting. Model-supplied roles
    are never authoritative (goal doc, MCP section); identity resolves server-side.
22. The demo's two-role model (`'agent' | 'broker'`) needs to become the full role set, with per-role
    `NAV` and landing routes. Add at minimum a **Transaction Coordinator (Margie)** persona — it is
    the newest, most concrete role and it demonstrates the permission model better than any diagram.

## B4. Test obligations

- Extend the existing static RLS test: every new policy begins with the org equality test; no new
  `FOR ALL` policy; the recruiting forbidden-role list grows to five roles.
- Role-isolation tests per new role: a TC session must return **zero rows** from
  `recruiting_prospects`, from any `deals` row she does not coordinate, and from any pre-contract
  `people` row.
- `NO CONTEXT → NO ROWS` must still hold for every new table.
- A public-surface test that fails the build if any anonymous route can reach a lesson whose course
  is not `publicPreview`.

---

## C. Open questions — must be answered by RCRE, not inferred

1. Is there a transaction coordinator for **Alabama**, or does Margie cover both? (Julio answered
   "Florida" and was not asked further.)
2. Does Margie work for RCRE or as a contractor? It changes the audit and offboarding posture.
3. Do Julio and Taquilla want the **owner vs managing broker** authority split, or are they peers?
4. Is the ISA an RCRE employee or a vendor? If a vendor, they are an external party holding
   confidential prospect data and need their own agreement.
5. What is RCRE's **recruiting follow-up cadence**? (Same shape as the unanswered P0.2.2 question.)
6. Who is the **marketing/admin** person — is it the existing "social media person" Taquilla
   mentioned, and are they internal?
7. Will RCRE actually run a **Skool** community, and who owns it — RCRE, or Jeremy personally?
   Ownership determines who holds the member data.
8. May an RCRE agent see that recruiting exists at all (to submit referrals), or must the function be
   invisible to them?
9. Should agents see any brokerage leaderboard?
10. Stage-aging thresholds for the **recruiting** pipeline (how long is too long in "Considering"?).

## D. Things I could not verify — do not present these as facts

- **Skool's API / webhook capability.** Not checked; no network access used in this pass. The design
  above deliberately survives Skool having no API at all.
- **dotloop's API.** Jeremy's own open action item as of 2026-08-26.
- Whether RCRE has any **applicant-tracking or recruiting tool** today beyond the ISA and a phone.
- Whether the ISA's activity is logged anywhere at all today (if it is not, the "underperforming"
  assessment is leadership's impression, which is legitimate but is not a measurement).
- Which recruiting vendor quoted $15,000, and what it included.
- Any **AL/FL-specific licence-transfer** requirements. The onboarding fork is designed as a
  configurable checklist precisely because I could not verify the steps.
- Whether `apps/rcre` currently renders any recruiting surface (I reviewed `apps/rcre-demo`; the
  0001–0003 migrations under `apps/rcre` have not been executed against any database, per the
  0003 header).
