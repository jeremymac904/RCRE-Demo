## Current execution authority — 2026-09-08

Read `CODEX_RCRE_COMPLETE_BUILD_MANDATE.md` in full. Jeremy authorized its complete local build. It supersedes earlier scope freezes. `apps/rcre-demo` is the canonical application; `apps/rcre` is historical backend reference. All controlled runtime, cache, media and verification storage stays under RCRE. No production activation is authorized. See `08-mvp/IMPLEMENTATION-REGISTER.md` for evidence, not completion assumptions.

# RCRE — Instructions for Claude Code / agent sessions

Read this file and [GOVERNANCE.md](GOVERNANCE.md) before doing anything in this project.

## What this project is

A connected digital operating system for **RCRE Group / River City Real Estate Group**, a real
estate brokerage operating in Alabama and Florida. Jeremy McDonald is partnering with them.

This is not a website redesign. The long-term target is one ecosystem covering: public website,
recruiting platform, AI Academy for agents, custom CRM, AI assistant, recruiting and lead-followup
automation, agent marketing systems, transaction workflows, onboarding, brokerage knowledge, and
management dashboards.

**Primary business objective: agent recruiting and retention.** The positioning is not "we provide
AI training" — it is *"RCRE gives its agents an AI-powered real estate business operating system."*

## Hard constraints (non-negotiable)

1. **Everything we create lives in `RCRE/`.** Nothing outside it. Not `/tmp`, not the scratchpad,
   not Desktop, not another project folder. See GOVERNANCE.md §1.
2. **Everything outside `RCRE/` is read-only.** Inspect in place. Copy in, never move in. Never
   modify.
3. **Do not modify RCRE's live website** (`https://rcregroup.com`).
4. **No secrets in this folder.** Env vars by name only.
5. No deploys, pushes, account creation, outbound messages, webhook triggers, or spend without
   Jeremy's explicit approval.

Use `RCRE/99-scratch/` for temporary files, not the session scratchpad.

## Current phase

**RCRE PLATFORM V2 — APPROVED, IN IMPLEMENTATION.** Approved by Jeremy 2026-08-26 with amendments.
Governing document: [RCRE_PLATFORM_V2_MASTER_PLAN.md](RCRE_PLATFORM_V2_MASTER_PLAN.md) §0.

**The highest-priority workstream is APPLICATION CONVERGENCE** ([ADR-0018](06-decisions/adr/0018-application-convergence.md)).
`apps/rcre-demo` (approved UI, no backend) and `apps/rcre` (real backend, 5 routes) become **one
canonical application**. Preserve the approved UI/UX; progressively replace synthetic behaviour with
the real backend, permissions, data model, MCP, FUB connector and domain logic.
**No blind rewrite.** Inventory both, migrate deliberately.

Binding decisions from this round:

- **[ADR-0016]** — the product may say a review is **required**; it may never say a check **passed**
  unless code evaluated the content and could have failed it. Enforced by a build-failing guard.
- **[ADR-0017]** — ADR-0015's scope freeze is **superseded**. Exceptions-first Command, the ~7
  destinations-per-role ceiling, and the three-part top-level test all survive it.
- **[ADR-0019]** — **Dotloop is out.** Its terms bar AI use of Dotloop Data *for any purpose*.
  Transaction OS = RCRE + **Stirling PDF** (document processing) + **Documenso** (signing, self-hosted
  Community Edition via API, never forked) + RCRE AI/Hermes. **Stirling is never the signing engine.**
- **RCRE is the primary agent workspace; Follow Up Boss remains system of record.** Read now, permitted
  writes later, preserving FUB IDs, attribution, audit, conflict ownership and failure recovery.
- **AI may** extract · summarise · draft · prepare · explain · recommend.
  **AI may not** make legal decisions, execute contracts, invent contract language, or send legally
  consequential material without the required human approval.
- **Deterministic, never model-decided:** identity · permissions · records · deadlines · compliance ·
  approvals · audit · money · high-risk actions.
- **Policy gaps do not block local development.** Synthetic organisation configuration may represent
  the behaviour. **Never activate a real alert on invented brokerage policy.**
- **Margie is RCRE's Florida Transaction Coordinator.** She must never be represented as a Realtor in
  demo data. The synthetic agent formerly sharing her name is now "Rita Olsen-Alvarez" (`u-rita`).

**Still requires Jeremy's explicit authorisation:** production FUB access of any kind · registering
the webhook · any write to FUB · deploying anything · sending email or SMS · touching the live
website · real client PII · connecting any production system. Local development against fixtures and
synthetic configuration needs no authorisation.

## Where things are

| Path | Contents |
|---|---|
| `GOVERNANCE.md` | Storage boundary, read-only rules, safety gates, compliance context |
| `01-research/existing-systems-audit/` | What already exists in Jeremy's workspace and what to reuse |
| `01-research/website-audit/` | RCRE's current public site: architecture, tech, gaps |
| `01-research/hermes/` | Hermes Agent capability audit, use-case map, and architecture V2 proposal |
| `02-discovery/` | **Leadership interview guide** (the conversation), technology inventory, document request, exhaustive checklist, assumptions |
| `03-architecture/` | Proposed ecosystem architecture and technology recommendation |
| `04-requirements/` | **RCRE Today data requirements** — the smallest useful data platform. Rest after discovery |
| `05-planning/` | Roadmap, **Hermes pilot plan**, AI cost model (superseded in its economics by ADR-0011) |
| `08-mvp/` | **MVP status**, FUB capability verification, ad attribution flows, website backlog |
| `apps/rcre/` | The application. Next.js 15 + TypeScript. `npm test` = 124 tests |
| `mcp/rcre-mcp-server/` | MCP tool registry + authorization |
| `hermes/` | Profile and skill templates — not installed anywhere |
| `06-decisions/` | Architecture Decision Record log |
| `07-references/` | Read-only pointers to source material elsewhere on the drive |

Future application code goes in a new top-level directory here (e.g. `apps/`) once building is
authorized — not before.

## Reuse posture

Jeremy has a large body of prior work. The rule is: **reuse what is excellent, improve what can be
improved, discard what does not belong.** Do not copy a pattern just because it exists. Every reuse
decision is recorded in `01-research/existing-systems-audit/` and, if consequential, as an ADR.

**Hermes Agent** (Nous Research, MIT, v0.19.0) is proposed as RCRE's agent runtime — see ADR-0007
and `01-research/hermes/`. The rule that follows from it: **Hermes holds no RCRE truth and no RCRE
authority.** Data, identity, entitlements, consent, compliance, and audit live in the RCRE backend
behind the RCRE MCP server (ADR-0008). Jeremy's `legends-team-builds/LegendsAgentOS(Hermes)/` is the
read-only precedent for the extension pattern.

**ADR-0010 records twelve standing directions** — check it before any design decision. It names what
would legitimately reopen each one.

The single most relevant prior systems are **LegendsOS v2** (multi-tenant Supabase platform),
**AI Realtor Pro** (Realtor growth engine — already targets agents/teams/brokerages), and
**Florida Home Buying Network** (consumer real estate site with IDX and agent directory). Their
paths are in `07-references/SOURCE-INDEX.md`. They are read-only.

## Working style

- Report findings in conversation. The files are the record, not the delivery mechanism.
- Prefer simple over clever. RCRE should not inherit accumulated complexity from prior builds.
- When a question would give a better answer than an assumption, ask the question — and log the
  assumption in the meantime so work is not blocked.
