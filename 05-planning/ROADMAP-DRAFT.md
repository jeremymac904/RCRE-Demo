# RCRE Roadmap — Draft

> ## ⚠ SUPERSEDED IN PRIORITY — 2026-08-24
>
> Leadership answered discovery. The **phase order below still holds**, but the *priority within
> the build* is now set by
> [RCRE-PRODUCT-REQUIREMENTS.md](../04-requirements/RCRE-PRODUCT-REQUIREMENTS.md), derived from
> [Taquilla Allen's answers](../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md).
>
> Three changes this document does not yet reflect:
>
> 1. **Follow Up Boss webhook registration moves to the front of the queue.** Four of the metrics
>    leadership asked for — response time, contact attempts, time in stage, pipeline fallout —
>    can only be accumulated forward from the day webhooks are registered. They cannot be
>    backfilled. Every week of delay is a week of funnel history permanently lost. This is now the
>    highest-value, lowest-cost action available, and it is still unauthorised.
> 2. **"RCRE owns no data today" (sequencing constraint 2) was wrong.** RCRE owns Follow Up Boss
>    and has been accumulating lead data in it. The urgency is real but the reason changed: it is
>    not that capture does not exist, it is that *derived history* is not being kept.
> 3. **Marketing and recruiting both rise.** RCRE has no agent marketing platform at all, and the
>    existing ISA-led recruiting motion is underperforming by leadership's own assessment.
>
> The text below is preserved unedited as the 2026-08-19 record.

**Status:** Draft. Sequencing is defensible; timing is not, until discovery lands (budget H1,
timeline H2, team availability H4).
**Date:** 2026-08-19
**Revision pending:** the Hermes investigation proposes changes to Phases 0, 1, 3 and 4 — see
[RCRE-ARCHITECTURE-V2-PROPOSAL.md §6](../01-research/hermes/RCRE-ARCHITECTURE-V2-PROPOSAL.md).
Phase *order* is unchanged; Phase 4 is re-scoped and the recruiting demo moves into Phase 3.

---

## Sequencing principle

Each phase must (a) deliver something usable on its own, and (b) reduce the risk of the phase after
it. Nothing is built because it is interesting; everything is built because the next thing needs
it or the business does.

Two constraints shape the order:

1. **Recruiting is the primary objective**, and recruiting sells the Agent Portal. So the portal
   cannot lag far behind the recruiting site — but the portal needs the data foundation first.
2. **RCRE owns no data today.** Every day without owned lead capture is data permanently lost.
   That makes capture the first build regardless of how discovery answers.

---

## Phase 0 — Discovery *(current)*

> **Materials ready (2026-08-19):**
> [RCRE-LEADERSHIP-DISCOVERY-INTERVIEW.md](../02-discovery/RCRE-LEADERSHIP-DISCOVERY-INTERVIEW.md) ·
> [RCRE-CURRENT-TECHNOLOGY-INVENTORY.md](../02-discovery/RCRE-CURRENT-TECHNOLOGY-INVENTORY.md) ·
> [RCRE-DISCOVERY-DOCUMENT-REQUEST.md](../02-discovery/RCRE-DISCOVERY-DOCUMENT-REQUEST.md) ·
> [RCRE-HERMES-PILOT-PLAN.md](RCRE-HERMES-PILOT-PLAN.md) ·
> [RCRE-AI-COST-MODEL.md](RCRE-AI-COST-MODEL.md) ·
> [RCRE-TODAY-DATA-REQUIREMENTS.md](../04-requirements/RCRE-TODAY-DATA-REQUIREMENTS.md)

**Goal:** Know what RCRE actually runs before designing around guesses.

- Leadership interview against [DISCOVERY-QUESTIONS.md](../02-discovery/DISCOVERY-QUESTIONS.md)
- Confirm the true agent roster (site shows 13 vs 9)
- Confirm CRM, email, phone/SMS, transaction management, MLS memberships
- Obtain the Luxury Presence contract terms and renewal date
- Review existing policies, handbook, ICA, and compliance process
- Settle the commercial relationship question (H3) — it can invalidate ADR-0003

**Exit criteria:** all P1 questions answered; ADRs 0002–0006 moved from Proposed to Accepted or
revised; **the Phase 1 shape decided — build a CRM, integrate the incumbent, or build only the data
and intelligence layer around it.** Do not assume the answer.

**Deliverables:** `02-discovery/ANSWERS.md`, updated assumptions register, `04-requirements/`
populated.

---

## Phase 1 — Foundation + Owned Lead Capture

> **V2 addition:** also build the **RCRE MCP server (read-only tools) with server-side audit**.
> Everything the assistant will ever do routes through it, and it is the security keystone
> (ADR-0008).

**Goal:** RCRE starts owning its data. Nothing here depends on unresolved questions.

- Postgres schema: `people`, pipelines, stages, assignments, activity, tasks, audit log
- Supabase Auth, roles, and **RLS on every table from the first migration**
- **RLS policy tests** — non-negotiable; a wrong policy is a silent data leak
- Unified lead capture endpoint with full attribution (`related_agent_slug`, source, UTM) and
  channel-scoped consent capture
- Wire existing Luxury Presence forms to also post to RCRE capture
- Minimal internal console: see leads, assign, log activity
- Migrate/import whatever lead history is exportable

**Why first:** independent of every open question, and the value compounds from day one.

**Exit criteria:** every new lead from every source lands in RCRE's database, attributed and
consented, and a human can act on it.

---

## Phase 2 — Recruiting Platform

**Goal:** Close the largest strategic gap. RCRE currently gives a prospective agent no reason to
join and no way to raise their hand.

- Public recruiting site (RCRE-owned, not Luxury Presence)
- The value proposition, stated plainly
- **Compensation model, explained honestly** — the first question every agent asks
- **The AI platform as the differentiator, shown with real screenshots** — which is why Phase 3
  cannot lag
- Multi-state licensing guidance (AL / FL / GA if real)
- Current-agent testimonials
- Application flow → recruiting pipeline
- **Confidential inquiry path** — most recruits are employed elsewhere and will not use a public form
- Recruiting pipeline in the console: stages, notes, follow-up tasks, source attribution
- Recruiting data permissioned tighter than consumer data

**Exit criteria:** a recruit can find RCRE, understand the offer, apply confidentially, and be
tracked to signature.

---

## Phase 3 — Agent Portal v1

> **V2 addition:** Phase 3 now also delivers **RCRE Today and RCRE Command in the portal** plus a
> **Hermes pilot** with 2–3 design partners (profiles, skill tap, cron routines, SMS delivery, RCRE
> theme, thin desktop plugin). This is where the recruiting demo becomes real — pulled forward from
> Phase 6.

**Goal:** Make the recruiting promise true. **No stub UI** (ADR-0006).

Four things that genuinely work — chosen after discovery reveals what agents actually complain
about (E1). Likely candidates:

- **My leads** — assigned leads, status, follow-up, response-time visibility
- **My transactions** — pipeline from contract to close
- **My marketing** — generate and request marketing assets, compliance-gated
- **My performance** — production, pipeline, conversion

**Exit criteria:** a working agent uses it weekly without being told to, and it can be demoed to a
recruit without apology.

---

## Phase 4 — AI Assistant v1

> **V2 re-scope:** the runtime is Hermes, not an RCRE build. This phase becomes **write tools, the
> approval path, compliance gates, knowledge retrieval with citations**, and a time-boxed
> `ROUTES_AREA` spike. The "no autonomous action" constraint below is unchanged and remains correct.

**Goal:** Answer and draft. **No autonomous action.**

- Brokerage knowledge base, with a hard separation between **doctrine** (retrievable) and
  **records** (access-controlled, never generally indexed)
- Retrieval over policies, procedures, contracts, scripts, market data, training
- Per-user private memory with an append-only write audit
- Drafting: listing copy, follow-up, market updates — every draft compliance-gated and
  human-approved
- Traces store summaries only

**Exit criteria:** an agent gets a correct, sourced answer to a real brokerage-procedure question
faster than asking the managing broker.

---

## Phase 5 — AI Academy

**Goal:** Retention inside, funnel outside.

- Member curriculum (adapt the 101→601 ladder, learner paths, skill-tagged libraries, weekly
  tracker/scorecard)
- Onboarding track that doubles as new-agent ramp
- Certification and progress
- Public/free tier as the external recruiting funnel — assets already drafted in
  `SKOOL COMMUNITIES/AI Advantage (Realtors)/`
- Branding decision: RCRE-branded vs. AI Realtor Pro (open)

**Exit criteria:** a new agent completes onboarding through the Academy, and non-RCRE agents are
enrolling in the public tier.

---

## Phase 6 — Automation and agentic workflows

**Goal:** The system starts doing work, inside approved lanes.

- Lead follow-up sequences with consent enforcement
- Recruiting nurture
- Transaction milestone automation
- Onboarding checklists
- **Capability ladder: answer → draft → act with approval → act autonomously in a narrow lane.**
  Do not skip steps.
- Every autonomous action logged, reversible where possible, and revocable

**Exit criteria:** measurable reduction in the manual work identified in discovery E2/E3, with a
clean audit trail.

---

## Phase 7 — Website decision

**Goal:** Decide with data, at renewal.

Rebuild, replace, or renew Luxury Presence — informed by real lead data, real attribution, actual
contract cost, and whether the Agent Portal needs agent-page capability the vendor cannot provide.
See ADR-0005.

---

## Parallel tracks

Run alongside, not gated by, the phases:

| Track | Starts | Content |
|---|---|---|
| **Compliance framework** | Phase 1 | Fair housing review process, `do_not_say` list, required disclosures, pre-publish checklist. Adapt the Marketing Content OS structure; replace all mortgage content. |
| **Blog conversion** | Phase 1 | Topic-matched offers on the existing 27 posts. Cheapest, fastest win available — worth doing before anything else ships. |
| **Brand and design system** | Phase 2 | Must not look AI-generated. The career-portal prototype's README records this lesson explicitly. |
| **Agent design partners** | Phase 2 | 2–3 agents testing continuously (E10). Adoption is the top delivery risk. |
| **Data hygiene** | Phase 1 | Roster drift between site and sitemap needs an owner and a process. |

---

## Top risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Agents do not adopt the portal** | **Highest** | Design partners from Phase 2. Solve complaints (E1) before adding features. Ship four working things, not twelve. |
| Discovery reveals a loved incumbent CRM | High | Phase 1 becomes integration rather than construction. Phase 1's capture layer survives either way. |
| Commercial relationship implies a multi-brokerage product | High | Settle H3 in Phase 0 — it invalidates ADR-0003 and changes the architecture |
| Scope creep back toward the 15-item vision | High | ADR-0006 + explicit non-goals in the architecture doc |
| Fair-housing exposure in AI-generated content | High | Compliance gate before any generated content ships; human review mandatory |
| MLS rules block a planned capability | Medium | F4 answered in Phase 0; ADR-0005 keeps IDX out of early phases |
| Luxury Presence renewal forces a premature website decision | Medium | Get the renewal date in Phase 0 (C4) |
| Blog production stops mid-build | Medium | C12 — confirm who produces it and secure continuity |
| Jeremy is the only builder | Medium | Documentation discipline; ADR log; no undocumented cleverness |
