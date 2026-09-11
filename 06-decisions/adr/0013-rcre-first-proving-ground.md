# ADR-0013 — RCRE is the proving ground; multi-brokerage is deferred, not designed away

**Status:** **APPROVED** — 2026-08-24 by Jeremy McDonald, with the leadership discovery it derives from
**Date:** 2026-08-24
**Decision owner:** Jeremy McDonald
**Supersedes:** the open question in [ADR-0003](0003-single-application.md) and assumption A-09
**Basis:** [Taquilla Allen, Managing Broker, 2026-08-24](../../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md) §10

## Context

The largest unresolved architecture question in this project has been whether we are building
*for RCRE* or building *a product that RCRE is the first customer of*. The two produce materially
different systems, and choosing wrong in either direction is expensive:

- Build single-tenant, then need multi-tenancy → a data-model rewrite touching every table and
  every query.
- Build multi-tenant SaaS now → billing, brokerage signup, white-labelling, tenant
  administration, per-tenant configuration and support tooling, all before a single RCRE agent has
  used anything.

Assumption A-09 guessed single-brokerage. Leadership has now answered directly.

## Decision

**RCRE is the proving ground. Build for RCRE, prove it works in a real brokerage, then package.**

Two rules follow, and they pull in opposite directions on purpose:

**Rule 1 — Do not build the SaaS layer.** No white-labelling, no billing, no brokerage
self-signup, no marketplace, no tenant administration console, no per-tenant theming. None of it
is on the roadmap. Every hour spent there is an hour not spent proving the thing works.

**Rule 2 — Do not foreclose it either.** Specifically:

| Keep | Because |
|---|---|
| An `organization_id` on every tenant-scoped table, populated from day one | Retrofitting a tenant key across a live schema is the expensive part; carrying an unused column is nearly free |
| Every repository read taking a resolved `Actor` that carries the organisation | Scoping enforced in one place stays enforceable when there are two organisations |
| Per-organisation configuration in data, not in code or env vars | Thresholds, stage definitions and cadences are exactly what differs between brokerages |
| Integration credentials keyed per organisation | One FUB account today; the shape must not assume one |
| RCRE-specific copy, branding and policy isolated from logic | The parts that would need to vary are the parts we should not scatter |

The test for any decision: *would this be painful to undo if a second brokerage appeared?* If yes,
do the cheap version now. If no, defer it entirely.

## Alternatives considered

**Full multi-tenant SaaS now.** Rejected. Leadership explicitly sequenced this as prove-then-
package. Building the packaging first inverts their stated strategy and delays the proof.

**Pure single-tenant, migrate later if needed.** Rejected. "Migrate later" for a tenant boundary
means re-deriving ownership for every historical row, which for client and lead data is a
compliance exercise, not a schema change. The carrying cost of an organisation key is far below
the cost of introducing one retroactively.

**Extract a product from RCRE's build after the fact.** This is what Rule 1 + Rule 2 produce, and
it is the intent. The difference from the rejected option is that the boundary exists in the data
model from the start.

## Consequences

**Easy:** shipping fast for RCRE; deleting the multi-brokerage idea entirely if it never happens
(an unused column costs nothing); adding a second brokerage later without a data migration.

**Hard:** discipline. Every feature will present a moment where hard-coding "RCRE" is one line and
doing it properly is ten. Rule 2 is only worth anything if it is applied when nobody is watching.

**Accepted cost:** a small amount of structure carried for a future that may not arrive, and code
review overhead to keep RCRE specifics out of shared logic.

**Explicitly out of scope until leadership says otherwise:** billing, subscriptions, brokerage
onboarding flows, white-label theming, a tenant admin console, cross-brokerage benchmarking,
public API for third parties, reseller tooling.

## Revisit when

- RCRE asks to onboard a second brokerage, **or**
- a commercial agreement about packaging is signed, **or**
- the `organization_id` discipline is measurably slowing delivery — in which case the honest move
  is to reopen this ADR, not to quietly abandon Rule 2.
