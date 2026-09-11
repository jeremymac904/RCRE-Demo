# RCRE

**Client:** RCRE Group / River City Real Estate Group — a licensed real estate brokerage operating
in Alabama and Florida.
**Partner:** Jeremy McDonald
**Site:** https://rcregroup.com/
**Workspace:** this folder, and only this folder. See [GOVERNANCE.md](GOVERNANCE.md).
**Phase:** MVP — controlled local build in progress. Architecture approved in principle
(ADRs 0007–0012). **Nothing is connected to any production system.**

---

## What this project is

A connected digital operating system for RCRE — not a website redesign.

The long-term scope: public website, recruiting platform, AI Academy for agents, custom CRM, AI
assistant, recruiting and lead-followup automation, agent marketing systems, buyer/seller lead
management, transaction workflows, onboarding, brokerage knowledge system, reporting dashboards,
and eventually agentic workflows that perform approved work rather than only answering questions.

**Primary business objective: agent recruiting and retention.**

The positioning is not *"we provide AI training."* It is:

> **RCRE provides its agents with an AI-powered real estate business operating system.**

A secondary objective is offering genuinely useful AI education to real estate agents outside RCRE
as a recruiting funnel.

---

## Read this first

| If you are… | Read |
|---|---|
| A new session or agent | [CLAUDE.md](CLAUDE.md), then [GOVERNANCE.md](GOVERNANCE.md) |
| Looking for what already exists | [01-research/existing-systems-audit/AUDIT-SUMMARY.md](01-research/existing-systems-audit/AUDIT-SUMMARY.md) |
| Looking at RCRE's current site | [01-research/website-audit/RCRE-WEBSITE-AUDIT.md](01-research/website-audit/RCRE-WEBSITE-AUDIT.md) |
| **Running the leadership meeting** | **[02-discovery/RCRE-LEADERSHIP-DISCOVERY-INTERVIEW.md](02-discovery/RCRE-LEADERSHIP-DISCOVERY-INTERVIEW.md)** — the conversation guide |
| Checking what the meeting missed | [02-discovery/DISCOVERY-QUESTIONS.md](02-discovery/DISCOVERY-QUESTIONS.md) — exhaustive internal checklist |
| Asking what to build first | [04-requirements/RCRE-TODAY-DATA-REQUIREMENTS.md](04-requirements/RCRE-TODAY-DATA-REQUIREMENTS.md) — the smallest useful data platform |
| Looking for the plan | [03-architecture/RCRE-ECOSYSTEM-ARCHITECTURE.md](03-architecture/RCRE-ECOSYSTEM-ARCHITECTURE.md) · [05-planning/ROADMAP-DRAFT.md](05-planning/ROADMAP-DRAFT.md) |
| Asking "why Hermes?" | [01-research/hermes/README.md](01-research/hermes/README.md) → [RCRE-ARCHITECTURE-V2-PROPOSAL.md](01-research/hermes/RCRE-ARCHITECTURE-V2-PROPOSAL.md) |
| **Working on the MVP** | **[08-mvp/README.md](08-mvp/README.md)** |
| Wondering why something was decided | [06-decisions/ADR-LOG.md](06-decisions/ADR-LOG.md) |

---

## Structure

```
RCRE/
├── README.md                    this file
├── GOVERNANCE.md                storage boundary, read-only rules, safety gates, compliance
├── CLAUDE.md                    instructions inherited by every future session
├── 01-research/
│   ├── existing-systems-audit/  what exists in Jeremy's workspace, and what to reuse
│   ├── website-audit/           rcregroup.com: architecture, tech, gaps
│   └── hermes/                  Hermes Agent investigation + architecture V2 proposal
├── 02-discovery/                leadership interview, tech inventory, document request, checklist
├── 03-architecture/             proposed ecosystem architecture and technology recommendation
├── 04-requirements/             RCRE Today data requirements; rest after discovery
├── 05-planning/                 roadmap, Hermes pilot plan, AI cost model
├── 06-decisions/                architecture decision record log + individual ADRs
├── 07-references/               read-only pointers to source material elsewhere on the drive
├── 08-mvp/                      MVP docs: FUB verification, ad flows, website backlog
├── apps/rcre/                   the application (Next.js 15 + TypeScript)
├── mcp/rcre-mcp-server/         MCP tool registry and authorization
├── hermes/                      Hermes profile and skill templates
└── 99-scratch/                  temporary files (use this, never /tmp)
```

Application code lives in `apps/`, `mcp/` and `hermes/`. See
[08-mvp/README.md](08-mvp/README.md) for MVP status and how to run it.

---

## The four findings that shape everything

**1. RCRE has no recruiting presence at all.** `/careers`, `/join`, `/join-us`, `/work-with-us` all
return 404. There is no agent value proposition anywhere on the site. For a brokerage whose primary
objective is recruiting, this is the defining gap — and the highest-leverage build.

**2. RCRE owns none of its own data.** Every lead — buyer, seller, valuation, portal registration,
newsletter, agent-direct — lands inside Luxury Presence. RCRE cannot route on its own rules,
measure agent responsiveness, or build anything on top. This is the argument for the CRM, and it is
independent of every open question, which is why owned lead capture is Phase 1.

**3. Most of the platform already exists in Jeremy's workspace — in mortgage clothing.**
LegendsOS v2 is a working multi-tenant Supabase platform (~89k LOC, ~78 tables) with the exact
foundations RCRE needs: org/role/RLS, agent runtime, lead intake that **already has a `recruiting`
lead type**, and an academy schema. AI Realtor Pro is an agent-facing product explicitly targeting
*"real estate agents, teams, and brokerages."* The work is adaptation and pruning, not invention.

**4. The agent runtime should not be built — it should be adopted.** The Hermes investigation
found a mature, MIT-licensed runtime that already supplies sessions, per-agent memory, versioned
skills, MCP, blocking hooks, cron with multi-channel delivery, voice, and an extensible desktop app.
It supplies **no system of record** — which is why finding 2 stands unchanged. See
[01-research/hermes/](01-research/hermes/README.md).

---

## Standing constraints

- Everything created lives in `RCRE/`. Everything outside is **read-only**.
- Do not modify RCRE's live website.
- No secrets in this folder. Environment variables by name only.
- No deploys, pushes, account creation, outbound messages, webhook triggers, or spend without
  Jeremy's explicit approval.
- **Ship no stub UI** — the Agent Portal is the recruiting pitch (ADR-0006).
- Fair housing, MLS display rules, state license law, and TCPA consent are design constraints, not
  disclaimers.

---

## Next step

**Run the leadership discovery session** using
[RCRE-LEADERSHIP-DISCOVERY-INTERVIEW.md](02-discovery/RCRE-LEADERSHIP-DISCOVERY-INTERVIEW.md).

Take with you: the [technology inventory](02-discovery/RCRE-CURRENT-TECHNOLOGY-INVENTORY.md) to leave
behind, and the [document request](02-discovery/RCRE-DISCOVERY-DOCUMENT-REQUEST.md) to walk through at
the end.

The answer that changes the most is whether RCRE has a CRM agents actually use — it decides whether
Phase 1 is *build*, *integrate*, or *build only the data layer*. Do not assume.
