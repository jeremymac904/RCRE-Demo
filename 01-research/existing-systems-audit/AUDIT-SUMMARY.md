# Existing Systems Audit — Jeremy's 2026 Master Build Folder

**Inspection date:** 2026-08-19
**Method:** Read-only progressive discovery. Directory structures, READMEs, architecture docs,
manifests, package files, SQL migrations, and skill definitions. No file outside `RCRE/` was
created, modified, moved, or deleted.
**Scope:** ~110 top-level entries in `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder`.

---

## Verdict at a glance

| System | Relevance to RCRE | Verdict |
|---|---|---|
| **LegendsOS v2** | Very high | **Reuse architecture** — the reference implementation |
| **AI Realtor Pro** | Very high | **Reuse product design + selected code** |
| **Florida Home Buying Network (FHBN)** | High | **Reuse patterns**, not code |
| **Apex Advisor / Elite Sales & Marketing Training** | High | **Reuse curriculum structure** for AI Academy |
| **Loan Factory Career Portal prototype** | High | **Reuse as recruiting-page reference only** |
| **Marketing Content OS** | High | **Reuse method**, replace mortgage content |
| **Skool Communities — "AI Advantage (Realtors)"** | High | **Reuse directly** as external funnel |
| **master-kb** | Medium-high | **Reuse the pattern**, not the content |
| **Control plane (`00-` … `06-`)** | Medium-high | **Reuse governance discipline**, trim the volume |
| **legends-customGPTs / skills library** | Medium | Mine selectively |
| **Social Media Automation Engine** | Medium | Reuse the calendar/prompt method only |
| **n8n Automation Registry** | Medium | Reuse the registry discipline; re-evaluate n8n itself |
| **GOAT Architect API** | Low-medium | Reference for internal tooling only |
| **Agent OS** | Low | Ignore for RCRE |
| **TERA+ Build** | Low | Ignore (mortgage LOS-specific) |
| **Desktop Orchestrator / Paperclip / Electron shell** | Low | Ignore |
| **Video walkthrough / YouTube / media pipelines** | Low (later) | Defer |
| **GroveAI / USLLM / BlackFrame / AionUI** | None | Ignore |

---

## Tier 1 — Directly reusable

### 1. LegendsOS v2 — the reference implementation

**Path:** `legends-team-builds/legendsos/legendsos-v2/` (read-only)
**Repo:** `jeremymac904/LegendsOSv2.0` · **Live:** `legendsos.app`
**Stack:** Next.js 14 App Router · React 18 · TypeScript · Tailwind · Supabase (Auth/Postgres/RLS/Storage)
· Netlify · n8n · Playwright · optional Electron shell
**Scale:** ~89,000 lines across `app/` `components/` `lib/`; 156 route files; 34 SQL migrations; ~78 tables

**What it does.** A multi-tenant internal operating system for a mortgage team: AI assistant
("Atlas"), multi-agent runtime, knowledge base, lead intake, email/social studios, training
academy, calendar, admin console, integrations layer.

**Why it matters to RCRE.** This is *structurally* the same product RCRE needs. Strip the mortgage
domain and what remains — org/role/RLS, agent runtime, lead intake, integrations, academy,
studios, admin — maps almost one-to-one onto the RCRE ecosystem.

**Specifically reusable:**

- **Multi-tenant + RBAC + RLS foundation.** `organizations` / `profiles` / `organization_members`
  with a `user_role` enum, `SECURITY DEFINER` helper functions (`current_role()`, `is_owner()`,
  `current_org_id()`), and RLS policies on every table. Notably, the self-update policy explicitly
  prevents a user from escalating their own role. This is a genuinely good, hard-won pattern and
  is the piece I would carry over most directly.
- **Lead intake model** (`20260601102000_lead_intake_foundation.sql`). Append-only
  `lead_intake_events` → `marketing_contacts` → `lead_assignments` → `lead_followup_tasks` →
  `marketing_attribution_events`. Crucially, `lead_type` **already includes `recruiting`,
  `realtor_partner`, `buyer`, `seller`, `investor`, and `past_client`**, and follow-up tasks carry
  `requires_approval` + `approved_by` by default. The design already anticipates a recruiting
  pipeline living alongside a consumer pipeline.
- **Agent runtime** (`20260601100000_agent_runtime.sql`). `agent_sessions`, `agent_messages`,
  per-user-per-agent private `agent_memories` with an append-only `agent_memory_events` audit,
  versioned `agent_skills`, permissioned `agent_tool_calls`, and `agent_traces`. Explicitly stores
  **summaries only** — no secrets, tokens, or raw PII in trace rows. This is the blueprint for the
  RCRE AI Assistant and for later agentic workflows.
- **Secrets/OAuth discipline.** `oauth_token_grants` has RLS enabled with *no client policies and
  revoked grants* — service-role only, tokens never reach a browser. `provider_credentials` exposes
  only a status view to clients. `user_integration_connections` stores connection **status** only.
- **Live-action safety gates.** `integration_settings` carries `safe_mode` plus `live_*` booleans
  defaulting to false; `social_account_connections.is_publish_enabled` defaults false;
  `publish_attempts` is an honest append-only log. Env-level `ALLOW_LIVE_SOCIAL_PUBLISH` /
  `ALLOW_LIVE_EMAIL_SEND`. For a brokerage sending on behalf of licensed agents, this posture is
  exactly right.
- **Academy schema** — feed posts/comments/likes, daily entries, scorecard, weekly progress with
  graduation. A ready-made shape for the RCRE AI Academy.
- **Owner impersonation** (`lib/impersonation.ts`, `getEffectiveProfile()`) — essential for a
  broker supporting agents.
- **Additive-only migration convention**, with each migration carrying a header stating safety
  constraints. Excellent practice; keep it.

**What to leave behind:**

- **Navigation sprawl.** ~19 sidebar entries across 5 sections, plus 11-item and 4-item sub-navs.
  Route names show drift and duplication (`loan-brain` / `loan-memory` / `my-loans`,
  `email` / `email-intake`, `automation` / `builder` / `vibe-coding` / `flo-processing`).
  This is the clearest symptom of feature accretion without pruning.
- **Stub integrations shipped into the UI.** The project's own CLAUDE.md lists nine integrations
  that are "UI-present but not backend-wired" and show "Coming Soon" — Zapier, Meta, Google OAuth,
  Drive, Calendar, Telegram, HeyGen, YouTube, GBP. For a recruiting-facing product this is
  actively harmful: an agent evaluating RCRE who clicks three dead buttons concludes the platform
  is vaporware. **RCRE should ship no stub surfaces.**
- **The Electron desktop shell.** Real maintenance cost, no clear RCRE benefit.
- **GOAT API embedded in the app.** External Custom-GPT command surface bolted onto the product;
  the repo notes it is "not used by the UI." Do not replicate.
- **Mortgage domain tables** — `loans`, `borrowers`, `loan_conditions`, `loan_approvals`,
  `loan_memory`, etc. RCRE needs transactions, not loans. Same shape, different nouns; rebuild
  rather than rename.

---

### 2. AI Realtor Pro — the closest existing product to RCRE's agent-facing offering

**Path:** `jeremy-axon-master-build-folder/AI-Realtor-Pro-Final/` (read-only)
**Repo:** `jeremymac904/AI-Realtor-Pro-Final`
**Stack:** Next.js 15 · React 19 · Tailwind 4 · **Firebase / Firestore** · OpenRouter · Hugging Face
· Fal.ai · Follow Up Boss · Google/Gmail · Meta · TikTok · YouTube · Google Business · HeyGen · n8n/Zapier dispatch

**What it does.** Explicitly *"Jeremy McDonald's AI-powered Realtor Growth Engine… not a CRM,
social media tool, mortgage app, or generic SaaS dashboard."* Its stated target users are
**real estate agents, real estate teams, and brokerages.** Surfaces: AI Twin, Realtor Coach,
Marketing Studio, Social Studio, Projects & Leads, automation engine.

**Why it matters.** This is the product concept RCRE wants to hand its agents, already specified
and partially built. The stated architecture — *"AI Realtor Pro = Growth Engine, LegendsOS =
Execution Engine, integration-api = Connector Layer"* — is a coherent separation that RCRE can
adopt directly (agent-facing growth tools vs. brokerage-facing system of record).

**Specifically reusable:**

- **The product definition itself.** `00-operations/aionui-bootstrap/project-handoffs/ai-realtor-pro-build-handoff.md`
  is a genuinely good agent-facing product spec. It is the strongest starting point for the RCRE
  Agent Portal / Agent Tools scope.
- **`lib/integrations/fub.ts`** — a clean, server-only Follow Up Boss client (Basic auth, typed
  contacts/tasks, retry wrapper). Follow Up Boss is one of the dominant real estate CRMs; if RCRE
  already uses it, this is immediately valuable, and if RCRE is migrating *off* it, this is the
  migration reader.
- **`lib/ai/router.ts`** — a genuinely well-built provider router: discriminated-union inputs,
  `withRetry`, 30s `AbortController` timeout, deterministic mocks when keys are absent, failures
  throw rather than silently degrade. The "falls back to mocks, never fakes success" property is
  the right default and should be carried into RCRE.
- **`legends_realtor_coach_knowledge/`** and `packages/prompts/` — real estate coaching and
  marketing prompt libraries.
- **`deep-research-report-ai-twin-for-seo-aeo-geo.md`** — research on AI-twin positioning for
  search/answer-engine optimization, directly applicable to agent personal branding.

**What to leave behind:**

- **Firebase/Firestore.** This is the one genuine architectural conflict in the workspace:
  AI Realtor Pro is on Firebase, LegendsOS is on Supabase/Postgres. RCRE must pick one, and the
  relational model that a CRM, recruiting pipeline, and transaction workflow require argues
  strongly for Postgres. See ADR-0002.
- **`localStorage` as the lead/project store.** Prototype-grade; not viable for a brokerage.
- **Integration breadth over depth.** Six-plus social/media integrations stubbed at varying
  completeness. Pick two and finish them.

---

### 3. Florida Home Buying Network — consumer real estate site patterns

**Path:** `jeremy-axon-master-build-folder/florida-home-buying-network-main/` (read-only)
**Stack:** Vite · React · TypeScript · HashRouter · Supabase · Gemini concierge · Google Maps

**What it does.** A Florida buyer/investor/agent-matching site: `Home`, `MetroHub`, `Directory`,
`ProProfile`, `IDX`, `Blog`, `Forms`, plus a chat widget.

**Why it matters.** RCRE operates in Florida. This is the closest existing thing to a consumer
real estate front end, and its **lead payload design is directly reusable**: `leadType`, `name`,
`email`, `phone`, `metroSlug`, `message`, `buyerType`, `intent`, `sourcePage`, `sourceComponent`,
`relatedProSlug`, `relatedListingId`, `utmSource/Medium/Campaign`, `status`, `metadata`. That
schema — particularly `relatedProSlug` (which agent the lead came through) and the source
attribution triple — is exactly what RCRE needs so leads are attributable to the agent whose page
produced them. Agent-attributable lead capture is a recruiting argument, not just a marketing one.

Also reusable: the **metro-hub content pattern** (county/metro landing pages feeding local SEO),
which maps onto RCRE's existing 10 county neighborhood pages.

**What to leave behind:** HashRouter (`/#/...` URLs are an SEO liability for a brokerage that
depends on local organic search), the Vite SPA shape (RCRE needs server rendering for SEO), and
the "MVP success flow with local-only capture when Supabase is missing" fallback — a lead that
appears to submit but is never stored is worse than a visible error.

---

### 4. Apex Advisor / Elite Sales & Marketing Training — the AI Academy blueprint

**Path:** `loan-factory-product-starter-kit/apps/loan-factory-elite-sales-marketing-training/` (read-only)
**Stack:** Next.js App Router · Tailwind · Supabase · Netlify

**What it does.** A tiered training and development platform: a 101→601 curriculum ladder,
learner paths (Beginner/Intermediate/Advanced), script/prompt/roleplay libraries with skill-level
tags, weekly trackers, coach and team-leader guides, certifications, leaderboards, mastermind
community, audio training library, compliance notes, and role-gated content.

**Why it matters.** This is a proven, complete shape for the **RCRE AI Academy** — including the
commercial framing (Tier 1 $249/mo, Tier 2 $449/mo), which is directly relevant to the "AI
education for agents outside RCRE as a recruiting funnel" objective.

**Specifically reusable:** the 101→601 ladder structure; learner-path routing; skill-level tagging
across scripts/prompts/roleplays; the weekly tracker + scorecard loop; the coach guide / team
leader guide split; role-gated content; the compliance-notes page pattern (theirs covers Reg Z,
SAFE Act, RESPA, FFIEC — RCRE's equivalent is fair housing, state license law, MLS rules, TCPA).

**What to leave behind:** duplicate route drift (`401-content-and-marketing` **and**
`401-content-marketing`; `501-pipeline-and-sales-systems` **and** `501-pipeline-sales-systems`);
the `localStorage`-based "role preview login" with no real authentication; and the sheer number of
parallel branded surfaces (`apex-advisor`, `apex-advisor-pro`, `apex-advisor-track`,
`apex-member-area`, `apex-certifications`, `apex-calendar`, `apex-leaderboards`, `apex-mastermind`,
`apex-launch-call`, `facegram`, `creator-network`, `ai-twins`, `ai-assistants`,
`ai-coaching-assistant`, `assessments`, `audience-quality-panel` …). The curriculum is good; the
surface count is not.

---

### 5. Loan Factory Career Portal prototype — recruiting page reference

**Path:** `external-career-portal-loanfactory-style/` (read-only)
**Stack:** Vite · React 19 · Tailwind 4 · TypeScript (standalone prototype, ~7 components)

**What it does.** A public-facing recruiting page for loan officers with `LicensingRoadmap`,
`CompCalculator`, `PracticeExam`, `StateGuide`, `WebinarRegister`, `FAQAccordion`.

**Why it matters.** RCRE's live site has **no recruiting presence at all**. This prototype already
demonstrates the two components that matter most for brokerage recruiting: a **compensation
calculator** (an agent's first question is always "what do I net?") and a **licensing/state guide**
(RCRE is multi-state: AL + FL). The webinar registration and FAQ accordion translate directly.

Its README also records a design lesson worth keeping: it was deliberately restyled away from
"AI-template styling" — fewer gradients, white header, wide spacing, simple cards. A brokerage
recruiting page that looks AI-generated undermines the pitch.

**What to leave behind:** the code itself (standalone Vite prototype, not wired to anything, no
lead persistence). Rebuild the components inside the RCRE stack.

---

### 6. Marketing Content OS — the compliance-gated content method

**Path:** `loan-factory-marketing-content-os/` (read-only)
**Shape:** Markdown-first knowledge/prompt pack. No server, no build step.

**Structure:** `docs/` (vision, brand rules, compliance rules) · `prompts/content` ·
`templates/` (briefs) · `compliance/` (`do_not_say.md`, `required_disclosures.md`,
`pre_publish_checklist.md`) · `examples/` · `gpts/` · `sop/`

**Why it matters.** This is the best *method* artifact in the workspace. The pipeline —
**brief → prompt → draft → compliance checklist → human review → publish** — is precisely what
RCRE needs for agent marketing, because real estate content carries fair-housing exposure that a
brokerage owns. It already contains `templates/realtor_co_branded_brief.md` and
`examples/realtor_campaigns/`.

**Reuse the structure and the gate. Replace every piece of mortgage content.** RCRE's
`do_not_say.md` is a fair-housing/steering list, not a Reg Z list.

---

### 7. Skool Communities — "AI Advantage (Realtors)"

**Path:** `SKOOL COMMUNITIES/AI Advantage (Realtors)/` (read-only)

A complete community launch kit aimed at **real estate agents**: Skool cover/icon, Facebook group
cover, YouTube banner, onboarding video script, community setup copy, and asset-regeneration
prompts. Branded with existing `airealtorpro` light/dark logos.

**Why it matters.** The external-facing AI education funnel Jeremy described *already exists in
draft*. Whether RCRE runs it under the RCRE brand or the AI Realtor Pro brand is a positioning
decision (see open questions), but the asset work is done.

---

## Tier 2 — Reuse the pattern, not the artifact

### master-kb — knowledge system pattern

`master-kb/` uses a numbered, agent-readable structure: `00_START_HERE` (with
`START_HERE_FOR_ANY_AI_AGENT.md`, `MASTER_MANIFEST.md`, `AGENT_MEMORY_AND_LOGGING_PROTOCOL.md`),
then `01_IDENTITY_AND_BRAND`, `02_OPERATING_RULES`, `03_PIPELINE`, `04_LENDERS_AND_PRODUCTS`,
`05_COMMUNICATION_TEMPLATES`, `06_PLAYBOOKS`, `07_TEAM_PERSONAS`, `08_AI_TWIN_FRAMEWORK`,
`09_LIVE_SOURCES`.

**The pattern is the value:** a knowledge base organized so an AI agent can bootstrap itself from
a single entry point, with an explicit manifest and a memory/logging protocol. RCRE's Brokerage
Knowledge System should adopt this shape — identity/brand, operating rules, transaction playbooks,
communication templates, team personas, live sources.

**Caution:** `master-kb/03_PIPELINE_AND_BORROWERS/` contains **real named borrower files**. That is
a live example of PII accumulating inside a knowledge base. RCRE's knowledge system must separate
*doctrine* (durable, shareable) from *records* (PII, access-controlled) from day one. Do not repeat
this.

### Control plane (`00-operations` … `06-desktop-orchestrator`)

The governance discipline here is genuinely strong and worth inheriting in spirit:
`PROJECT-REGISTRY.md`, `DECISION-LOG.md`, `RISK-REGISTER.md`, `APPROVAL-QUEUE.md`,
`ACTIVE-LOCKS.md`, `AGENT-RUN-LOG.md`, `MCP-RISK-LEVELS.md`, `MODEL-ROUTING-POLICY.md`,
`COST-CONTROLS.md`, plus a clear local-first / sandbox-first / preview-first / production-only-
with-approval ladder.

**But the volume is a warning.** There are ~37 files in `00-operations` alone, seven near-duplicate
`PROJECT-INVENTORY *.md` files, and multiple overlapping "CEO mode" documents
(`CEO-EXECUTION-MODE`, `CEO-WATCHTOWER-MODE`, `CEO-BUILD-BOARD`, `CEO-DIGESTS`, `CEO-BOARDROOM`,
plus per-agent `*-CEO-EXECUTION-MODE.md` files). Several docs candidly describe themselves as
planning-only for systems never wired up.

**RCRE takes the ladder and the decision log. RCRE does not take 40 governance documents.**
This project has three: `GOVERNANCE.md`, `CLAUDE.md`, `ADR-LOG.md`.

### legends-customGPTs / LegendsOS Skills & CustomGPT Assist Builder

Contains `legends-realtor-ai-twin-builder`, `legends-realtor-co-marketing-studio`,
`ai-advantage-realtor-co-marketing-studio`, a `13-realtor-newsletter-agent` companion (with
source maps, examples, and a verification report), and `Cynthia_AI_Twin_Knowledge_Base` including
`08_AI_BASICS_FOR_REALTORS.md` and `06_MORTGAGE_101_FOR_REALTORS.md`.

**Mine selectively** for agent-facing prompt content and the AI-twin build standard. Do not adopt
the Custom GPT delivery model — RCRE's assistant should be in-product, where the brokerage
controls access, audit, and compliance.

### Social Media Automation Engine

`Jeremy's Social Media Automation Engine/` — a 90-day content calendar (CSV + MD), image prompt
libraries, caption maps, Canva template rules, platform field maps, Zapier posting metadata.

**Reuse the method** (90-day calendar → captions → image prompts → platform field map → scheduled
posting). Note the folder is littered with `.bak-YYYYMMDD-*` files — a manual versioning habit that
RCRE should replace with git.

### n8n Automation Registry

`05-n8n-automation-registry/` documents three unverified instances and ~19 workflow groups, most
marked "not imported," "inactive," or "planning only." There is also a
`docs/architecture/ZAPIER_VS_N8N_AUDIT.md` in LegendsOS.

**Reuse the registry discipline** — every automation named, owned, risk-rated, and approval-gated.
**Re-evaluate n8n itself for RCRE.** The registry is largely aspirational, which is evidence that
a self-hosted workflow tool added operational overhead without delivering proportional value. See
ADR-0004.

---

## Tier 3 — Reference only / do not reuse

| System | Why not |
|---|---|
| **GOAT Architect API** | Custom-GPT command backend for Jeremy's own build tooling. Useful as a reference for a clean typed API + OpenAPI surface; no RCRE product role. |
| **Agent OS** (`agent-os/`) | A packaged third-party "agentic OS" install kit (27 install guides: Jarvis voice, thumbnail studio, game studio, music studio…). Consumer-grade breadth, wrong shape for a brokerage. |
| **TERA+ Build** | Product analysis of Loan Factory's mortgage LOS/POS/CRM. Mortgage-specific; the transferable idea (audit the incumbent before replacing it) is a *method* RCRE should apply to whatever CRM RCRE runs today. |
| **Desktop Orchestrator / Paperclip / Electron** | Desktop shells and screenshot/automation specs. No RCRE need; real maintenance cost. |
| **GroveAI / USLLM / BlackFrame / AionUI / OpenSwarm / UI-TARS / herdr / multica** | Personal AI infrastructure and vendored third-party repos. Out of scope. |
| **Video/YouTube pipelines, Audio Podcast, Loans On Demand, video_walkthrough_system** | Media production tooling. Potentially relevant much later for Academy content production; ignore for now. |
| **Building My Perfect Monster Knowledge System** | Fitness coaching app. Only notable because it demonstrates the same Next.js + Supabase + RLS + Playwright stack applied cleanly to a *different* domain — evidence the stack generalizes. |
| **barndoplans** | Barndominium plan → marketing asset generator. Adjacent to real estate marketing, but a different business. Revisit only if RCRE wants new-construction marketing tooling. |
| **Flo-os, MotivationFactory, VIP Coaching Ecosystem, Skool build packet, user-testing-personas** | Peripheral; no RCRE dependency. |

---

## Cross-cutting lessons carried forward

**Worth keeping:**

1. **Safety-by-default at the data layer.** `live_*` flags default false, `is_publish_enabled`
   defaults false, follow-up tasks require approval, publish attempts are honestly logged. For a
   brokerage acting on behalf of licensed agents, this is not optional.
2. **Server-only secrets, enforced by RLS.** Tokens in a table with no client policies and revoked
   grants. Status-only client views. Carry this verbatim.
3. **Summaries-only agent traces.** Observability without becoming a PII honeypot.
4. **Additive-only migrations with safety headers.**
5. **"Mock, don't fake."** Deterministic mocks when providers are unconfigured; failures throw.
6. **Compliance as a pipeline stage**, not a disclaimer at the bottom.
7. **Explicit approval ladders** — local → sandbox → preview → production.

**Worth avoiding:**

1. **Shipping stub UI.** The single most damaging pattern for a recruiting-facing product.
2. **Surface proliferation.** Multiple projects show 15–30 top-level routes where 6–8 would serve.
   Every route is a maintenance and QA obligation.
3. **Route/name drift** — near-duplicate routes and folders (`… 2`, `… 3`, `… 4` copies;
   `realtor_cobranded_marketing_gpt_knowledge` exists four times).
4. **`.bak-*` files instead of version control.**
5. **Documentation volume as a substitute for working software.** Several registries describe
   systems that were never wired up.
6. **PII drifting into knowledge bases.**
7. **Planning for three environments/instances before one is proven.**

---

## Two architectural conflicts RCRE must resolve up front

1. **Firebase vs. Supabase.** AI Realtor Pro (the closest product) is on Firestore; LegendsOS (the
   closest architecture) is on Postgres. RCRE cannot inherit both. → **ADR-0002.**
2. **Growth Engine vs. Execution Engine.** The AI Realtor Pro handoff proposes splitting
   agent-facing growth tools from the brokerage system of record. That separation is sound as a
   *conceptual* boundary but was never proven as a *deployment* boundary — and two codebases with
   two auth systems is how the current fragmentation happened. → **ADR-0003.**
