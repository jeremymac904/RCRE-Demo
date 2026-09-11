# RCRE Platform V2 — master plan

**Date:** 2026-08-26 · **Status:** **APPROVED WITH AMENDMENTS** — 2026-08-26 by Jeremy McDonald.
Planning-only hold is lifted; local development inside RCRE is authorised. All storage, security,
production-access, PII and external-action restrictions remain in force.
**Basis:** the 26 August leadership meeting (Julio Arango, Taquilla Allen, Jeremy McDonald).

Companions: `MEETING_REQUIREMENTS_TRACEABILITY.md` (71 requirements, timestamped, with the eight
places the Gemini notes contradict the recording) · `INTEGRATION_AND_RISK_MATRIX.md` (Dotloop,
risks, blockers). Full research in `99-scratch/v2-research/`.

---

## 0. Approved amendments — 2026-08-26

These override the corresponding sections below.

1. **False compliance assertion removed.** "Fair housing check passed" → **"Compliance review
   required"**. Enforced by a build-failing guard, proven non-vacuous. [ADR-0016](06-decisions/adr/0016-no-unearned-compliance-claims.md).
2. **ADR-0015 superseded**, historical reasoning preserved. [ADR-0017](06-decisions/adr/0017-v2-supersedes-scope-freeze.md).
3. **Application convergence is the highest-priority workstream.** One canonical RCRE application.
   Preserve the approved UI/UX; progressively replace synthetic behaviour with the real backend,
   permissions, data model, MCP, FUB connector and domain logic. **No blind rewrite** — inventory
   both apps and migrate deliberately. [ADR-0018](06-decisions/adr/0018-application-convergence.md).
4. **RCRE is the primary agent workspace; FUB remains system of record.** Read now, permitted writes
   later, preserving FUB IDs, attribution, audit, conflict ownership and failure recovery. Production
   access still requires Jeremy's authorisation.
5. **Dotloop removed from the target architecture** on the AI-restriction ground alone. Endpoint-level
   claims are being reconciled against primary docs before being recorded as fact. Research retained
   for historical context. [ADR-0019](06-decisions/adr/0019-transaction-os-stack.md).
6. **Transaction OS = RCRE + Stirling PDF + Documenso + RCRE AI/Hermes.** Documenso self-hosted
   Community Edition, independent service via API, Envelope architecture, not forked. Stirling is the
   document-processing engine and **never** the signing engine. AGPL obligations recorded for legal
   review before any commercial resale.
7. **TC architecture built on RCRE-owned transaction data**, with a deterministic deadline engine.
   AI may extract, summarise, draft, prepare, explain, recommend. AI may **not** make legal
   decisions, execute contracts, invent contract language, or send legally consequential material
   without human approval. **Margie is Florida's Transaction Coordinator and is no longer represented
   as a Realtor in demo data** — the synthetic agent has been renamed.
8. **W3 policy answers must not block local development.** Synthetic organisation configuration may
   represent the behaviour. **Real alerts are never activated on invented brokerage policy.**
9. **Cloud Hermes:** one profile per human + role capabilities + shared version-controlled RCRE
   skills + bounded specialist subagents where parallel work genuinely benefits. No seven-bot swarm.
   RCRE backend authoritative for identity, permissions, records, deadlines, compliance, approvals,
   audit, money and high-risk actions.
10. **Navigation philosophy retained** — ~7 destinations per role, Reporting nested under Command,
    Approvals a global badge, Transactions first-class, Content Library under Marketing unless user
    testing earns it top level.

---

## 1. The finding that reframes everything

**There are two applications, and they do not share a line of code.**

| | `apps/rcre-demo` | `apps/rcre` |
|---|---|---|
| Routes | 20+ — every screen leadership saw | **5** — `/`, `/today`, `/command`, `/join`, plus APIs |
| Data | 100% synthetic, hard-coded | Real domain layer: FUB client, 16 metrics, insight engine, backfill, RLS |
| AI | **None.** The assistant replays a scripted transcript; the campaign builder is a `setTimeout` with four hard-coded outputs | None |
| Auth | A cookie naming a persona | `getActor()` fails closed; RLS in SQL |

I verified from the recording that **the meeting was a live demo of `rcre-demo`** — Command as
Taquilla at 00:04:49, the campaign builder at 00:07:24, Community at 00:08:38.

So every "enhance this" request from the meeting is a request to enhance **a screen with no
backend**, and the real backend has excellent bones and two rendered screens.

**Consequence for planning:** the largest line item in V2 is not a feature. It is *re-implementing
the demo's screens on the real data layer*. Any plan that treats "improve the agent inspector" as UI
work is wrong by roughly an order of magnitude. That work appears in none of the module designs and
belongs at the front of the programme.

A second consequence: `openrouter`, `deepseek`, `minimax`, `anthropic`, `openai` return **zero
matches** across the entire repository. **ADR-0011 is a decision, not an implementation** — there is
no model router and no inference call anywhere.

---

## 2. What the meeting changed

1. **Website replacement is now decided.** Leadership aligned on leaving Luxury Presence. This
   **reverses ADR-0005** and requires a superseding ADR, not an edit.
2. **RCRE becomes the agent's workspace; FUB stays the system of record underneath.** Taquilla's
   requirement is that agents not work two CRMs. *(The Gemini notes state this backwards — see §19.)*
3. **Transaction coordination becomes a first-class module.** It was the strongest reaction in the
   room: *"See, that to me that's next level."*
4. **RCRE authors its own training**, alongside Jeremy's imported curriculum, with conditional
   assignment (*"not every agent in the future is going to be on Zillow"*).
5. **Provider strategy is confirmed and must now be built** — OpenRouter free tier, DeepSeek,
   MiniMax, users' own ChatGPT for image generation.
6. **Dotloop is closed, not opened** — see §14.
7. **ADR-0015's scope freeze is broken.** Most of V2 fails its own "materially improves one of the
   three functions" test. Someone must decide: is ADR-0015 superseded, or is V2 a second programme
   sequenced behind it? **This is the first decision on the list.**

---

## 3. Already satisfied — do not rebuild

Verified in code, not assumed:

| Capability | Where |
|---|---|
| Agent inspector — book, never-answered, stale-in-stage, overdue | `app/agents/[id]/page.tsx` |
| Exception-first roster ordering | `exceptionsFor()` in `app/agents/page.tsx` |
| Command answering the five attention questions | `app/command/page.tsx`, ADR-0015 |
| Threshold engine, correctly empty pending policy | `follow_up_policies`, `stage_aging_policies` |
| 16 reporting metrics with honesty rails | `lib/reporting/metrics.ts` + 723 lines of tests |
| Insight engine — 8 generators, dedupe, priority | `lib/insights/engine.ts` |
| **6-stage MCP authorization with bound single-use approvals** | `mcp/.../authorize.ts` — **this is the reusable approval primitive for every V2 gate.** Build on it; do not invent a second approval concept |
| PII guard with tested hook parity | `pii-guard.ts` + `hermes/hooks/` |
| UTM/campaign capture at moment of capture | `api/leads/route.ts` |
| `publicPreview` — stops paid curriculum leaking publicly | `TrainingAccess.tsx` |
| Real curriculum with provenance | `data/academy.ts` — 14 courses, 181 lessons |
| Marketing approval routing | Campaign builder (demoed at 00:07:24) |

---

## 4. Needs enhancement

- **Contacted-but-cold flag** — the smallest real gap in Taquilla's top ask. "Never answered" and
  "stale in stage" exist; *contacted once, then silence* does not. `last_outbound_at` is stored and
  displayed but nothing turns it into a flag.
- **Direct Command → named agent** link, without passing through the roster.
- **Push, not pull.** Every exception path today requires the broker to ask. R7 asks for arrival.
- **Reporting drill-through** — a funnel step you cannot open is a picture.
- **Community attachments** — YouTube links and PDFs (R51).
- **Model router** — the provider strategy has no implementation.

## 5. New modules

Transactions · Content Library · Cloud Hermes gateway · Training authoring and assignment ·
Coach retrieval layer · Public website · Ad programme · External Skool community.

---

## 6. Proposed navigation

Ceiling of **7 per role**. A capability earns top level only if: someone opens it near-daily; it has
queue semantics (it can be *empty*, and that means something); and it is not an attribute of an
object that already has a home.

| Role | Navigation |
|---|---|
| **Agent** | Today · RCRE AI · Contacts · Pipeline · **Transactions** · Marketing · Training |
| **Broker / Owner** | **Command** · RCRE AI · Agents · Contacts · Pipeline · **Transactions** · Recruiting |
| **Team lead** | Today · RCRE AI · My Team · Contacts · Pipeline · Transactions |
| **Transaction Coordinator** | **TC Queue** · Transactions · Contacts · RCRE AI |
| **Recruiter (ISA)** | Recruiting · RCRE AI · Contacts · Training |
| **Marketing / Admin** | Content · Marketing · RCRE AI · Listings |
| **Trainer** | Training · Community · RCRE AI · Agents *(progress only)* |

**Swap on the agent nav:** Listings moves to `/marketing/listings`. A listing's daily job is that it
gets marketed; its transaction facet is reachable from Transactions. *Counter-argument recorded: if
leadership says inventory is a daily object, promote Listings back and nest Marketing under Content.*

**Nested deliberately:** Reporting stays at `/command/reporting` — it is the drill-down from an
exception, not a destination; promoting it invites report-first navigation, which is exactly the
"so many funnels" complaint. Content Library at `/marketing/library`. Coach inside Today and RCRE AI
— a separate Coach tab is a place agents visit once and abandon.

**Approvals is a header badge with a count, not a nav item** — it is an inbox, and an empty tab is a
dead tab. *Risk recorded: a compliance gate needs discoverability, and a badge is weaker than a tab.*

---

## 7. Transaction Coordinator

**Objects:** transactions (distinct from `deals` — a different clock, a different failure mode, a
different owner) · parties · critical dates · checklist items · documents · tasks · TC assignment ·
messages.

**Three views:** the agent's "you owe" list · **Margie's queue**, ordered by nearest contractual
deadline across every file she covers · the broker's exception view.

**Deadline engine is deterministic.** Contractual dates are computed from rules, never inferred by a
model. State-specific checklists are *mechanism now, content later* — the content requires brokerage
and legal input and must not be invented.

**The approval gate is the module.** Anything legally consequential is bound to an immutable content
hash and a named recipient, and cannot be dispatched without an approval record. Built on the
existing MCP approval primitive.

**The inspection-report workflow** Taquilla already does by hand — drop the PDF, give the repair
numbers, draft the email to Margie — is the flagship. It is entirely RCRE-originated, so it sits
cleanly inside the Dotloop boundary.

**Blocked on:** contract-preparation authority (§14, and risk 3.2), Alabama TC coverage, and
Margie's licensure.

---

## 8. Cloud Hermes

**One personal profile per human.** Not a bot swarm. Capabilities differ by role — Broker/Admin,
Agent, TC — through **skills and bounded subagents**, not through many bots. *(Leadership liked the
team-leader-plus-specialists demo, so this is decision P7, not a settled matter.)*

**The split, stated so it can be enforced:**

| Must be deterministic (RCRE backend, never model-decided) | May run through Hermes |
|---|---|
| Accountability metrics · permissions · approvals · deadlines · compliance decisions · money | Drafting · summarising · coaching conversation · research · content generation |

**Always-on gateway** solves the real problem Jeremy demonstrated: his current setup requires his
computer to stay awake. Surfaces: RCRE portal, voice, approved mobile messaging, scheduled jobs,
event-driven workflows — each gated by policy P9 (records retention and supervision).

**Identity:** a Hermes user maps to an RCRE actor server-side. The model never asserts its own role —
the existing 6-stage authorization already enforces this and rejects identity arguments outright.

**Providers:** OpenRouter free tier for routine internal work, DeepSeek/MiniMax as cheap paid,
users' own ChatGPT subscription for image generation, local models where practical.
**Open risk (3.5):** routing client PII to offshore providers has had no jurisdiction or
training-posture analysis.

---

## 9. Broker and admin operating model

Open one agent, see: assigned · contacted · **uncontacted** · last outreach · calls · texts · emails ·
attempts · response time · stage age · overdue · status hygiene · appointments · pipeline ·
transactions · training progress · marketing activity.

Most of this screen **already exists**. What is missing is the data behind it, the contacted-but-cold
state, and **push**.

**Default to communication metadata, not contents.** Contents require a named authorisation.
ADR-0014 still binds: no read receipts, anywhere.

**Daily broker briefing** — arrival, not a dashboard visit. Taquilla's stated goal is to stop
checking.

---

## 10. Marketing Content Library

Central store of approved content — listing, open house, social, email, video scripts, prompts,
graphics, templates, buyer/seller/past-client/database/recruiting, brand assets. Search and filter by
market, channel, campaign, version, approval status. Agents fork and customise rather than author.

**Approval binds to an immutable version.** A blanket 30/90-day pre-approval is what Jeremy proposed
and what leadership liked; policy P12 sets the maximum scope a broker will pre-approve sight-unseen.

---

## 11. Training and community

Preserve Jeremy's imported curriculum entirely. Add RCRE-authored courses: Zillow 101 with real call
recordings, buyer/seller document walkthroughs, ChatGPT setup, prompting, inspection-report-to-email.

**Assignment is the new capability** — by agent, role, market, **lead source** and team, with
completion and overdue tracking. Lead-source conditionality is a direct requirement.

**The external Skool community is a separate thing** from the in-product Community already built —
a public recruiting funnel and a coaching revenue line. Do not conflate them.

**Coach:** the Legends knowledge base becomes a retrieval layer behind controlled tools. **It does not
go into Hermes personal memory.** Its own compliance guardrails file governs coaching output.

---

## 12. Recruiting

The platform is the pitch — Taquilla said so at 00:26:12. Expand around the existing recruiting CRM:
Academy funnel, community engagement, website engagement, Facebook/Instagram/YouTube, referrals, ISA
activity, scoring, follow-up, appointments, onboarding.

**Referral submission is write-only** — an agent may submit without gaining any view of the pipeline.

---

## 13. Website replacement

**Not to be built yet.** Decisions required first:

- **IDX Participant status per MLS** — Julio has MLS *access* to NE Florida, Miami, Orlando/Stellar,
  Gainesville; access is not the same as participant status, and IDX display rights follow the latter.
  This is B5 and it gates everything.
- Which markets ship first — Birmingham, NE Florida, South Florida
- Advertiser of record and EHO/brokerage-ID treatment on every page

Scope when unblocked: buyer and seller acquisition · recruiting · agent profiles · persistent public
AI assistant that knows every page · SEO/AEO/GEO blogging · Google Business Profile · lead capture
into FUB with attribution.

**Near-term deliverable Jeremy promised:** a double-clickable local HTML prototype for markup and
feedback (00:47:02).

---

## 14. Dotloop — closed

**Do not integrate.** Clause 2(k) bans AI use of Dotloop Data *"or for any other purpose"* — reaching
inference — with **no own-data carve-out**, and approval explicitly cannot cure it. Separately, the
API **cannot download documents, has no e-signature endpoint, has read-only tasks, and emits no
document or signature webhooks** — so the demoed flow is not buildable there at any price.

Follow Up Boss, same corporate parent, **does** have an own-data carve-out and bans only model
development and training. That asymmetry validates ADR-0012 and closes Dotloop.

Treat Dotloop as a terminal, human-operated record. Full detail in the risk matrix.

---

## 15. Roles

Add **`transaction_coordinator`**, **`marketing_admin`**, **`trainer`** to the enum. Every new role
starts at zero access and must be added to the build-failing forbidden-role test on
`recruiting_prospects`.

**TC scope is the delicate one:** deep transaction access across agents, and **no** brokerage-wide
recruiting or performance visibility.

---

## 16. Data model

Roughly 45 new tables across four phases. **Phase 1 is buildable now** with no legal input and no
external verification: `markets` · `transactions` · `transaction_parties` · `critical_dates` ·
`date_rules` (empty) · `checklist_templates` (empty) · `transaction_checklist_items` · `documents` ·
`transaction_tasks` · `tc_assignments` · `approvals` · `outbound_artifacts` · `dispatches` (kill
switch off) · `alerts`, plus the role `ALTER TYPE` and `rcre_can_see_transaction()`.

Phase 2 unblocks measurement · Phase 3 content, training, coaching · Phase 4 recruiting.

**Rules that hold without exception:** every policy begins with `organization_id = rcre_current_org()`
· per-command policies only, no `FOR ALL` · RLS enabled **and forced** · append-only ledgers get no
UPDATE or DELETE policy for anyone · transaction visibility expressed exactly once in
`rcre_can_see_transaction()` · **RLS does not protect object storage** — documents and media need
server-side signed URLs plus a build-failing test.

---

## 17. Automation

Seventeen events mapped, each with trigger · system of record · AI involvement · deterministic logic ·
approval requirement · result.

**The governing rule:** anything touching accountability, deadlines, compliance or money is
deterministic. Anything client-facing requires approval. AI drafts and explains; it does not decide
and does not send.

---

## 18. Recommended workstreams — after approval

Ordered by dependency, not by appetite.

| # | Workstream | Depends on |
|---|---|---|
| **W0** | **Delete the false fair-housing string** | Nothing. Do this first |
| **W1** | **Converge the two apps** — demo screens onto the real data layer | The ADR-0015 decision |
| **W2** | **FUB production read + webhook registration** | Jeremy's authorisation. **Time-sensitive** |
| **W3** | Policy answers — cadences, thresholds, TC timelines | Taquilla |
| **W4** | Model router + provider policy | ADR |
| **W5** | Transactions Phase 1 schema + TC queue | W1, and B4 for anything document-preparing |
| **W6** | Content Library + approval ledger | W1 |
| **W7** | Training authoring and assignment | W1 |
| **W8** | Cloud Hermes gateway | W4, P7, P9 |
| **W9** | Alabama ad test | B6, B9, B10, and the SLA policy |
| **W10** | Website prototype (local HTML) | Nothing — deliverable already promised |
| **W11** | Website build | B5 (IDX participant status) |

**W0, W2, W3 and W10 can start immediately.** W1 is the long pole and everything product-shaped
waits behind it.
