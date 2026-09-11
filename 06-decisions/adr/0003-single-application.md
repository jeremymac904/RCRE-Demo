# ADR-0003 — One application and one database, not a Growth/Execution engine split

**Status:** Proposed
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald

## Context

The AI Realtor Pro build handoff proposes a three-part architecture:

> AI Realtor Pro = Growth Engine · LegendsOS = Execution Engine · integration-api = Connector Layer

As a *conceptual* separation — agent-facing growth tools versus brokerage system of record — this
is genuinely useful and RCRE should keep the distinction in its product thinking.

As a *deployment* separation it was never proven, and the current estate shows the cost: two
codebases, two frameworks, two databases, two auth systems, and a connector layer that mostly does
not exist. Leads live in `localStorage` in one and in Postgres in the other.

## Decision

Build RCRE as **one application against one database with one auth system**, exposing multiple
surfaces:

- Public recruiting site
- Agent Portal
- Broker/Admin Console
- Academy

"Growth engine" and "execution engine" become **modules and permission scopes inside one system**,
not separate deployments.

The consumer marketing site remains external (Luxury Presence) — that is a vendor boundary, not an
architectural split. See ADR-0005.

## Alternatives considered

- **Two applications with a shared database.** Rejected for v1: doubles deployment, auth session,
  and design-system surface for no benefit at RCRE's scale (roughly 13 agents today).
- **Full microservices.** Rejected: enormously disproportionate to the problem.
- **Separate agent-facing product intended for resale to other brokerages.** Deferred — this
  depends entirely on the commercial relationship between Jeremy and RCRE (discovery H3/H7).
  A white-labelable multi-brokerage product is a materially different build. **This is the single
  open question most likely to invalidate this ADR**, which is why it is Proposed and not Accepted.

## Consequences

- Easy: one login, one permission model, one contact record, one deploy, one design system.
- Easy: an agent's growth tools operate on the same data the brokerage manages — no sync.
- Hard: module boundaries must be maintained by discipline rather than enforced by process
  boundaries. Directory structure and permission scoping have to carry that weight.
- Hard: if RCRE later wants to sell the agent-facing product separately, extraction is work.
  Mitigated by keeping module boundaries clean and avoiding RCRE-specific assumptions in the
  agent-facing modules.

## Revisit when

- Discovery answers H3/H7 indicate this is a productized, multi-brokerage platform.
- Agent count grows enough that agent-facing load meaningfully affects brokerage operations.

---

## REVISION — 2026-08-19 (Hermes investigation)

**Status remains Proposed. The decision is unchanged; its scope is clarified.**

The Hermes investigation (ADR-0007) introduces an adopted third-party runtime alongside the RCRE
application. That is **not** the Growth-Engine / Execution-Engine split this ADR rejected, and the
distinction is worth stating precisely so the ADR is not misread as forbidding Hermes.

What this ADR rejects: **two RCRE-built applications with two databases and two auth systems.** That
is what fragmented the prior Loan Factory / LegendsOS / AI Realtor Pro estate.

What the revised architecture actually has:

- **One RCRE database** — Postgres/Supabase
- **One auth system** — Supabase Auth, used by both the portal and the MCP server
- **One permission model** — enforced server-side in the RCRE MCP server (ADR-0008)
- **One RCRE application** — the portal, plus the MCP server as its machine-facing interface
- **Plus an adopted runtime** — Hermes, which holds no RCRE truth and no RCRE authority

Hermes profiles carry personal memory, voice, and preferences. They carry no client records, no
entitlements, and no compliance rules. Every one of those resolves server-side.

**Revised statement:**

> Build RCRE as one application against one database with one auth system and one permission model.
> RCRE may adopt a third-party agent runtime (Hermes) as an additional interface layer, provided it
> holds no system-of-record data and no authority, and provided all access passes through the RCRE
> MCP boundary (ADR-0008).

The multi-brokerage/white-label caveat in "Alternatives considered" still stands and remains the
open question most likely to reopen this ADR (discovery H3/H7).
