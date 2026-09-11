# ADR-0012 — Follow Up Boss is the incumbent CRM; RCRE builds an intelligence layer

**Status:** **APPROVED IN PRINCIPLE** — 2026-08-19 by Jeremy McDonald
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald
**Resolves:** the Phase 1 question left open in the roadmap — build a CRM,
integrate the incumbent, or build only a data layer around it

## Context

Discovery established that RCRE already runs **Follow Up Boss**, primarily for
Zillow leads and as the general brokerage CRM. All agents technically use it
because it is the brokerage CRM, though adoption and utilisation could be better.

The V1 architecture assumed RCRE might build its own CRM. It should not.

FUB already provides CRM records, lead handling, Zillow integration, contact
management, tasks, Smart Lists, communications, automations, deal tracking, AI
features, Facebook Lead Ad integration, an open API, webhooks and Zapier
integration. Rebuilding any of that would cost months and produce something
worse, while forcing a migration on agents who have not asked for one.

The real problem is not that RCRE lacks a CRM. It is that the CRM does not tell
anyone what to do, and nobody can measure whether it happened.

## Decision

**Follow Up Boss remains the system of record for CRM contact data. RCRE builds
an intelligence layer on top of it.**

```
RCRE INTELLIGENCE LAYER  ON TOP OF  FOLLOW UP BOSS
        — not —
RCRE REPLACEMENT CRM
```

The MVP answers four questions FUB does not:

> What should I do today? · Why should I do it? · What can the system prepare
> for me? · What can it safely handle after I approve it?

Integration rules:

- **FUB API and webhooks are the primary integration.** Zapier is permitted only
  for secondary, low-risk convenience workflows where it is materially easier —
  never as the primary synchronisation layer for anything the API or webhooks
  support directly.
- **Leads are sent via `POST /v1/events`, never `POST /v1/people`.** Verified in
  FUB's documentation: `/people` creates a person but runs no automations, no
  lead-flow assignment, no agent notification, no action plans and no dedupe.
- **Field ownership is explicit.** FUB owns contact data. RCRE owns derived
  timestamps, attribution and intelligence. RCRE never blind-overwrites FUB.
- **Webhook ingestion is asynchronous** — receive, verify, persist, acknowledge
  within FUB's 10-second window, then process out of band by re-fetching the
  authoritative record.
- **Do not duplicate FUB functionality** to claim RCRE built it.

## Alternatives considered

- **Build a replacement CRM.** Rejected: months of work to reproduce a product
  RCRE already pays for and agents already use, plus a migration nobody wants.
- **Zapier as the synchronisation layer.** Rejected as primary: it adds a
  third-party dependency, per-task cost, and weaker error handling than direct
  API integration, for capability the FUB API already exposes. Retained for
  low-risk convenience cases.
- **Read-only mirror with no write path at all.** Rejected: the MVP needs to
  send captured leads into FUB so lead flow and assignment fire correctly.

## Consequences

- Easy: no migration, no retraining, no data loss risk. Agents keep working
  where they already work.
- Easy: RCRE's scope shrinks to what actually differentiates — insight,
  attribution, measurement, and the AI layer.
- Easy: FUB's own permission model (agent keys see only assigned contacts)
  aligns with RCRE's scoping rather than fighting it.
- Hard: RCRE depends on FUB availability and rate limits (global 250 requests /
  10s window with a registered system key).
- Hard: some data RCRE wants may not exist in FUB — website behavioural signals
  in particular. Those need separate capture.
- Hard: if RCRE ever leaves FUB, the connector is rewritten. Mitigated by
  normalizing into an RCRE-owned schema rather than storing FUB shapes.
- **Accepted:** RCRE cannot fix FUB adoption by building software. Adoption is a
  brokerage practice problem. What RCRE *can* do is make using it visibly worth
  the effort, and make non-use visible to the broker.

## Revisit when

- FUB is being replaced for business reasons unrelated to this project.
- A required capability proves impossible through the FUB API.
- Rate limits or costs become a material constraint at RCRE's scale.
