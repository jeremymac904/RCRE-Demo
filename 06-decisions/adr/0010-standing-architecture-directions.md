# ADR-0010 — Standing architecture directions

**Status:** **APPROVED IN PRINCIPLE** — 2026-08-19 by Jeremy McDonald
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald

## Context

Approving ADRs 0007–0009 settled the Hermes direction. Jeremy also affirmed a set of standing
constraints that cut across several ADRs and would otherwise be scattered across documents where
future sessions could miss them.

These are **directions to hold unless discovery produces evidence requiring change** — not permanent
laws. Each names the ADR or document that carries its full reasoning, and the discovery finding that
would reopen it.

## Decision

Hold the following unless discovery produces contrary evidence:

| # | Direction | Source | Reopened by |
|---|---|---|---|
| 1 | **PostgreSQL and Supabase remain the leading database and identity recommendation** | ADR-0002 | An incumbent enterprise data platform we must integrate with rather than replace |
| 2 | **Luxury Presence stays in place** for the consumer website and IDX during early phases | ADR-0005 | Contract renewal, or a capability the vendor cannot support |
| 3 | **No stub or "Coming Soon" functionality** | ADR-0006 | Nothing. This one does not bend |
| 4 | **No unnecessary microservices** | ADR-0003 | Confirmation this becomes a multi-brokerage product (H3/H7) |
| 5 | **No premature n8n deployment** | ADR-0004 | Non-technical staff needing to author workflows themselves |
| 6 | **No autonomous high-risk brokerage actions** | HERMES-SECURITY-GUARDRAILS | Nothing at this stage. Revisit only after audit and trust are proven |
| 7 | **No client PII in Hermes long-term memory** | ADR-0008, guardrails §3 | Nothing. Enforced by `pre_tool_call` hook |
| 8 | **No brokerage doctrine stored solely in Hermes profile memory** | HERMES-PROFILES-AND-SKILLS | Nothing — Hermes memory is ~1,300 tokens with no team sharing |
| 9 | **No seven-bot architecture** | HERMES-BOTS-AND-GATEWAYS | A dedicated recruiter or external Academy tier needing hard data isolation |
| 10 | **One Hermes profile per human** remains the preferred direction | HERMES-PROFILES-AND-SKILLS | Pilot evidence that role-splitting is genuinely needed |
| 11 | **Shared RCRE knowledge lives in the RCRE-controlled data and retrieval layer** | ADR-0008 | Nothing |
| 12 | **Shared RCRE skills are version controlled** | HERMES-PROFILES-AND-SKILLS | Nothing — private GitHub tap is the mechanism |

## Alternatives considered

- **Leave these implicit across the ADRs and research documents.** Rejected: they are exactly the
  constraints a future session under delivery pressure would quietly drop. A single enumerated list
  is harder to lose.
- **Fold each into its parent ADR only.** Rejected: several (7, 8, 11) span multiple ADRs, and the
  cross-cutting ones are the ones most worth protecting.

## Consequences

- Easy: one place to check before a design decision.
- Easy: each direction names what would legitimately change it, so holding the line is a judgement
  rather than dogma.
- Hard: this list must be revisited when discovery lands, or it becomes stale received wisdom.

## Revisit when

Discovery answers arrive. Review every row against what RCRE actually reports, and revise the ones
whose reopening conditions were met.
