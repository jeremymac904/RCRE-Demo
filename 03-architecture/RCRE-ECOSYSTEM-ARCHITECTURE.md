# RCRE Ecosystem Architecture — Preliminary

> **⚠ SUPERSEDING PROPOSAL PENDING (2026-08-19).** A deep Hermes Agent investigation has produced
> [RCRE-ARCHITECTURE-V2-PROPOSAL.md](../01-research/hermes/RCRE-ARCHITECTURE-V2-PROPOSAL.md), which
> proposes adopting Hermes as RCRE's agent runtime (ADR-0007), an RCRE MCP server as the single
> integration boundary (ADR-0008), and Hermes Desktop as an optional power surface (ADR-0009).
> **This document remains current until Jeremy approves V2.** Its core thesis — one database, one
> auth system, one permission model, RCRE owns its data — is unchanged and was strengthened by the
> investigation. The sections most affected are §3.4 (Intelligence layer), §4 (Technology) and §6
> (Non-goals); each carries an inline note below.

**Status:** Preliminary. Written before RCRE leadership discovery. Several decisions are explicitly
deferred and flagged as such.
**Date:** 2026-08-19

---

## 1. The organizing idea

RCRE does not need fifteen products. It needs **one system with one identity model and one contact
model**, surfaced through a small number of purpose-built front doors.

Everything in the brief — website, recruiting, academy, CRM, assistant, automation, marketing,
transactions, onboarding, knowledge, dashboards — reduces to four questions:

1. **Who is this person?** (agent, recruit, buyer, seller, past client, partner)
2. **What stage are they in?** (a pipeline)
3. **What should happen next?** (a task, a message, a workflow)
4. **Who is allowed to see and do what?** (roles and permissions)

Answer those four once, correctly, and every listed capability becomes a view over the same
foundation. Answer them separately per product — which is how the current Loan Factory / LegendsOS
/ AI Realtor Pro estate came to be fragmented — and RCRE inherits the same problem.

**Design rule: one database, one auth system, one permission model. Multiple front ends.**

---

## 2. Layer model

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PUBLIC SURFACES                                                          │
│                                                                           │
│  Consumer marketing site        Recruiting site         Academy (public)  │
│  (Luxury Presence — keep)       (NEW — RCRE-owned)      (NEW — funnel)    │
│  IDX · agents · blog ·          why RCRE · comp ·       free AI education │
│  neighborhoods · valuation      tools · apply           for any agent     │
└───────────────┬───────────────────────┬───────────────────────┬───────────┘
                │                       │                       │
                ▼                       ▼                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  CAPTURE & IDENTITY LAYER                                                 │
│  One normalized intake endpoint. Every lead, every source, one shape.     │
│  Consent captured at source. Attribution preserved (source, page, agent). │
└───────────────────────────────┬───────────────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  CORE — the system of record (one Postgres database)                      │
│                                                                           │
│  Identity & Access   People & Pipelines   Content    Activity             │
│  ─────────────────   ──────────────────   ───────    ────────             │
│  brokerage           people (unified)     knowledge  events               │
│  users/agents        pipelines            documents  tasks                │
│  roles               stages               templates  messages             │
│  permissions         assignments          media      audit_log            │
└───────────────────────────────┬───────────────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  INTELLIGENCE LAYER                                                       │
│  RCRE AI Assistant · retrieval over brokerage knowledge · agent memory ·  │
│  skills/tools registry · approval gate · full trace log                   │
└───────────────────────────────┬───────────────────────────────────────────┘
                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  AUTHENTICATED SURFACES                                                   │
│                                                                           │
│  Agent Portal        Broker/Admin Console      Academy (member)           │
│  my leads · my       recruiting pipeline ·     curriculum · progress ·    │
│  transactions ·      roster · dashboards ·     certification · community  │
│  marketing · AI      approvals · audit                                    │
└───────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  INTEGRATION LAYER  (server-only. tokens never reach a browser.)          │
│  Email · SMS · Calendar · MLS/IDX (read) · e-sign · social · existing CRM │
│  Every outbound action passes an approval gate and is logged.             │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer detail

### 3.1 Public surfaces

**Consumer marketing site — keep Luxury Presence for now.**

The audit found the consumer site is the *least* broken thing RCRE owns, and the hardest to
replace (four MLS feeds, working IDX, real SEO traction, consumer accounts). Rebuilding it is
high cost, high risk, and does not advance the primary objective.

What changes is not the site — it is **where the leads go**. Phase 1 adds an owned capture path
alongside the vendor's, so RCRE begins accumulating its own data immediately. Revisit the platform
decision at contract renewal, informed by real data. → **ADR-0005 (deferred).**

**Recruiting site — build this first. RCRE-owned.**

The single largest gap and the highest-leverage build. Minimum viable scope:

- The RCRE agent value proposition, stated plainly
- **Compensation model, explained honestly** — the first question every agent asks
- **The AI platform as the differentiator** — real screenshots of the actual Agent Portal, not
  promises. This is why the Agent Portal and the recruiting site must be built in the same phase.
- Multi-state licensing guidance (AL / FL — and GA if real)
- Agent testimonials from current RCRE agents
- A real application flow feeding the recruiting pipeline
- Confidential-inquiry path — most recruits are currently employed elsewhere and will not fill in
  a public form

**Academy (public tier) — the external funnel.**

Free/low-cost AI education for *any* real estate agent, not only RCRE's. This is a recruiting
funnel disguised as a genuine service, and it only works if the education is genuinely good. Assets
already exist in draft (`SKOOL COMMUNITIES/AI Advantage (Realtors)/`). Branding decision open:
RCRE-branded, or under the existing "AI Realtor Pro" brand with an RCRE relationship. → open question.

### 3.2 Capture & identity layer

One normalized intake path for every lead from every source. This is the highest-value, lowest-risk
thing to build first, and it is worth being precise about the payload because it determines what
RCRE can ever measure.

Adapted from the FHBN lead payload and the LegendsOS `lead_intake_events` model — both of which
already got this close to right:

| Field group | Fields |
|---|---|
| Identity | name, email, phone |
| Classification | `person_type` (buyer / seller / investor / renter / **recruit** / partner / past_client / unknown), `intent`, `priority` |
| Attribution | `source_system`, `source_page`, `source_component`, `related_agent_slug`, `related_listing_id`, full UTM set |
| Market | state, county, metro, price band |
| Consent | channel-scoped consent + timestamp + capture text (TCPA) |
| Routing | `assigned_to`, `assignment_reason`, `status` |
| Raw | original payload preserved verbatim |

Three properties that must not be compromised:

1. **`related_agent_slug` is captured from day one.** Leads generated through an agent's page are
   attributable to that agent. This is a retention argument, a recruiting argument, and a fairness
   argument, and it is nearly impossible to backfill.
2. **Consent is a first-class field with the capture text**, not a boolean. TCPA exposure is real.
3. **Recruits use the same table as consumers.** A recruit is a person in a pipeline. One contact
   model, one activity history, one automation engine — different stages and different permissions.

### 3.3 Core — system of record

One Postgres database. The central table is **`people`**, not `leads` and not `contacts` — because
the same human can be a buyer, then a past client, then a referral source, and occasionally a
recruit. Splitting them creates reconciliation work forever.

Pipelines are configuration, not schema. RCRE needs at least: **Buyer**, **Seller**, **Recruiting**,
**Onboarding**, **Transaction**. Adding a sixth should be a row, not a migration.

**Row-Level Security from the first migration, not retrofitted.** Adopt the LegendsOS pattern
directly: `SECURITY DEFINER` helper functions, RLS enabled on every table, and a self-update policy
that structurally prevents a user from changing their own role.

Baseline roles: `broker_owner`, `managing_broker`, `admin`, `team_lead`, `agent`, `staff`,
`recruiter`, `viewer`. The important distinction for a brokerage: **an agent sees their own book;
a managing broker sees the office; the broker-owner sees everything.** Recruiting data needs
tighter visibility than consumer data — an agent should not browse the recruiting pipeline.

### 3.4 Intelligence layer

> **V2 note (2026-08-19):** the reasoning below stands, but the *build assumption* does not. The V2
> proposal adopts **Hermes Agent** for the runtime, sessions, per-agent private memory, versioned
> skills, permissioned tool calls, and summaries-only traces described here — these all exist in
> Hermes today. RCRE builds the knowledge store, the retrieval tools, and the approval gate. The
> "one assistant with many skills" principle below is unchanged and is reinforced by the finding
> that a Hermes "bot" *is* a profile.

The RCRE AI Assistant is **one assistant with many skills**, not many assistants. The prior estate
shows what the alternative produces: Atlas, FLO, Coordinator, Builder, Marketing, Academy, Media,
Social, Docs, UX — ten agent types where role-scoped context over one runtime would have served.

Adopt from the LegendsOS agent runtime:

- Sessions + append-only message transcript
- **Per-user private memory** with an append-only audit of writes
- Versioned, promotable skills (an agent's working prompt can become a brokerage-wide skill)
- Permissioned tool calls with an approval gate
- **Traces that store summaries only** — never secrets, tokens, or raw client PII

Retrieval runs over the brokerage knowledge system: policies, procedures, contracts, scripts,
market data, training. Structured with a hard separation the prior work did **not** maintain:

- **Doctrine** — durable, shareable, safe to retrieve broadly
- **Records** — client and transaction data, access-controlled, never in a general index

Capability ladder, in order: **answer → draft → act with approval → act autonomously in a narrow
lane.** Do not start at the end. The `requires_approval` default in the existing lead-followup
model is the correct posture and should be preserved.

### 3.5 Authenticated surfaces

**Agent Portal.** My leads, my transactions, my marketing, my AI assistant, my training, my
performance. This is the product RCRE recruits on — which means it must be real before recruiting
scales. **No stub tiles. No "Coming Soon."** Ship four working things rather than twelve promises.

**Broker/Admin Console.** Recruiting pipeline, agent roster and onboarding, brokerage dashboards,
approval queue, audit log.

**Academy (member tier).** Curriculum, progress, certification, community. The Apex Advisor
101→601 ladder, learner paths, skill-tagged libraries, and weekly tracker/scorecard loop are a
proven shape to adapt.

### 3.6 Integration layer

Server-only. Tokens in a table with no client policies. Every outbound action passes an approval
gate and lands in the audit log.

Priority order — deliberately narrow:

1. **Email** (transactional + marketing)
2. **Calendar**
3. **SMS** (only with consent enforcement wired)
4. **Existing CRM** — read-first, to migrate and to reconcile
5. **MLS/IDX** — read-only, later, and only if a real need survives discovery
6. **E-signature / transaction management**
7. **Social publishing** — last

**Build integrations two at a time and finish them.** The dominant failure mode in the prior work
is nine integrations at 40% completion.

---

## 4. Technology recommendation

> **V2 note (2026-08-19):** database, auth, framework, styling, and hosting rows are unchanged and
> were strengthened by the Hermes findings (Hermes has no system of record). Two rows change:
> **AI providers** — provider routing is now supplied by Hermes natively rather than built; and
> **Automation** — see the ADR-0004 revision for the three-way split (Hermes cron for agent-facing
> scheduled work, RCRE jobs for deterministic business logic, still not n8n).

Recommended on requirements, not familiarity — though familiarity is a legitimate tiebreaker given
Jeremy is the one building it.

| Layer | Recommendation | Why |
|---|---|---|
| **Database** | **PostgreSQL (Supabase)** | A CRM, recruiting pipeline, transaction workflow, and commission structure are relational. Joins, constraints, and transactions are the job. RLS gives per-agent isolation at the data layer rather than in application code — for a brokerage where agents must not see each other's books, that is a security property, not a convenience. Proven at ~78 tables in LegendsOS. |
| **Auth** | **Supabase Auth** | Same system as the data layer; RLS policies read directly from the JWT. Avoids the LegendsOS-vs-AI-Realtor-Pro split. |
| **App framework** | **Next.js (App Router) + TypeScript** | Server rendering for the public/SEO surfaces, server components for authenticated surfaces, one language across the stack. Both flagship prior systems use it, so patterns transfer. |
| **Styling** | **Tailwind** | Consistent with prior work; fast iteration. |
| **Hosting** | **Vercel or Netlify** | Either is fine. Pick one and do not run both. |
| **AI providers** | **Provider-routed, not provider-locked** | Adopt the AI Realtor Pro router pattern: typed inputs, retry, timeout, deterministic mocks when unconfigured, failures throw. Default to the most capable Claude models for reasoning-heavy work; route cheap/bulk work elsewhere. |
| **Automation** | **In-app jobs first; n8n only if justified** | The n8n registry in the prior workspace is largely aspirational — three instances planned, most workflows never imported or inactive. That is evidence the operational overhead exceeded the value. Start with in-app scheduled jobs and a queue. → ADR-0004. |
| **Email/SMS** | **Deferred** | Depends entirely on what RCRE runs today. → discovery. |
| **IDX** | **Deferred — keep Luxury Presence** | ~4 MLS feeds. Do not take this on early. → ADR-0005. |

**Explicitly not recommended:** Firebase/Firestore (wrong shape for relational CRM data, and would
re-create the current split — ADR-0002); a microservices split (ADR-0003); an Electron desktop
shell; a self-hosted vector database before retrieval need is demonstrated; and any second
codebase before the first one is real.

---

## 5. Build sequence

Ordered so that each phase produces something usable and each phase de-risks the next. Phase 0 is
the only phase currently authorized.

| Phase | Deliverable | Why here |
|---|---|---|
| **0. Discovery** *(current)* | Answers from RCRE leadership; requirements; confirmed decisions | Every phase below changes shape depending on what RCRE already runs |
| **1. Foundation + Capture** | Postgres schema, auth, roles, RLS, unified lead capture wired to existing site forms | RCRE starts owning its data immediately. Independent of every open question. Lowest risk, highest compounding value. |
| **2. Recruiting Platform** | Public recruiting site + recruiting pipeline + application flow | The primary business objective, and currently a total gap |
| **3. Agent Portal v1** | My leads, my transactions, my marketing, my performance — four things that genuinely work | The thing recruiting sells. Must be real before recruiting scales. |
| **4. AI Assistant v1** | Answer + draft over brokerage knowledge. No autonomous action. | Needs the knowledge base and permission model from phases 1–3 |
| **5. AI Academy** | Member curriculum + public funnel tier | Retention and external recruiting funnel |
| **6. Automation & agentic workflows** | Follow-up sequences, recruiting nurture, approved autonomous actions | Requires proven data, permissions, audit, and trust |
| **7. Website decision** | Rebuild, replace, or renew Luxury Presence | Decide with real data at contract renewal, not on instinct |

---

## 6. Deliberate non-goals for v1

Named explicitly, because the prior estate's clearest lesson is that scope arrives quietly:

- No rebuild of the consumer marketing site
- No RCRE-owned IDX
- ~~No desktop application~~ → **revised by ADR-0009 (2026-08-19):** RCRE will not *build or maintain* its own desktop shell, but may distribute and configure **Hermes Desktop** as an optional power surface, extended only through the official plugin SDK. The browser portal remains primary and mandatory.
- No autonomous outbound communication
- No custom transaction management replacing an incumbent that works
- No multi-brokerage/white-label ambition
- **No stub UI, ever**
