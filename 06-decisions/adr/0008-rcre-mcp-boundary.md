# ADR-0008 — The RCRE MCP server is the single integration boundary

**Status:** **APPROVED IN PRINCIPLE** — 2026-08-19 by Jeremy McDonald
**Date:** 2026-08-19 · **Approved in principle:** 2026-08-19
**Decision owner:** Jeremy McDonald

> **Approval scope.** Direction approved. Design and specification may proceed. Building the MCP
> server is **not** yet authorized — it waits on the Phase 1 decision (new CRM vs. integrate
> incumbent vs. data/intelligence layer only), which discovery resolves.

## Context

Adopting Hermes (ADR-0007) puts a capable agent runtime on each agent's machine, with tool access,
browser automation, file access, and messaging. A brokerage cannot allow that runtime to reach
client data, transactions, or outbound communication on its own terms.

The investigation established that the enforcement mechanisms Hermes provides locally are useful but
not sufficient on their own:

- **Managed Scope** is explicitly *"advisory rather than absolute"*, its `.env` is world-readable,
  and there is *"no remote MDM delivery"*.
- **Desktop plugins** are *"trusted renderer code rather than a sandbox."*
- **Backend plugin capabilities** are *"a consent and audit layer, not isolation."*
- **Audit** lives in per-profile local SQLite — a brokerage needs supervisable central audit.
- **Locally-edited skills are skipped by `hermes skills update`**, so a compliance rule encoded only
  in a skill may never reach an agent who edited it.

Everything on the agent's machine is therefore advisory. Only a server RCRE controls is authoritative.

## Decision

**All RCRE data and all RCRE actions pass through one RCRE-hosted MCP server (HTTP, OAuth 2.1).**

**The RCRE backend remains authoritative for:** identity · permissions · roles · data access · CRM
records · client records · recruiting records · transactions · consent · compliance · approval ·
audit · and all high-risk actions.

**Hermes must never determine its own authority from model-generated arguments. Authority is
resolved server-side.** *(Jeremy, 2026-08-19 — stated as a standing constraint.)*

Non-negotiable properties:

1. **Identity and entitlement are resolved server-side from the authenticated token — never from an
   argument the model supplies.** Adopted verbatim from Jeremy's Legends permission model:
   *"Identity in P1 comes from trusted authentication, never model-provided claims."*
2. **Narrow, purposeful tools.** No `rcre_query(sql)`, no generic update tool. Prohibited capability
   has **no tool at all** — the strongest available control.
3. **Consent state is returned with every contact** so drafting cannot ignore it.
4. **Write tools refuse without recorded approval**, with approver identity and timestamp.
5. **Every call is logged server-side** — identity, tool, arguments, result summary. This is RCRE's
   audit of record.
6. **All outbound action executes in the RCRE backend**, not in Hermes. Hermes drafts; RCRE sends.

Defence in depth on the client: per-server MCP `exclude` filters, `pre_tool_call` hooks with
`fail_closed: true`, disabled toolsets, and `approvals.mode: smart`. These supplement the server —
they never substitute for it.

## Alternatives considered

- **Direct database access from Hermes.** Rejected outright: no entitlement enforcement, no consent
  checking, no audit, and an agent's laptop holding database credentials.
- **stdio MCP server on each agent's machine.** Rejected: puts policy logic on the endpoint where
  the agent can modify it, and defeats central governance and audit.
- **Rely on Hermes tool filtering and Managed Scope.** Rejected: both are documented as advisory,
  and both live where the user has control.
- **Multiple MCP servers by domain** (leads, transactions, marketing). Deferred — reasonable later
  for code organisation, but one auth and audit boundary must remain.

## Consequences

- Easy: one place to enforce identity, entitlement, consent, approval, and audit.
- Easy: the portal and the agent runtime share one permission model, so they cannot diverge.
- Easy: replacing the runtime later touches nothing in the data layer (ADR-0007 exit strategy).
- Hard: the MCP server becomes critical infrastructure — its availability gates the assistant.
- Hard: every new capability requires deliberate tool design rather than ad-hoc queries. **This is
  intentional friction**; it is what makes the surface auditable.
- Accepted cost: more upfront design than exposing a generic query tool.

## Revisit when

- Tool count grows enough that domain-split servers improve maintainability
- A capability genuinely cannot be expressed as a narrow tool — which should prompt asking whether it
  should be automated at all
