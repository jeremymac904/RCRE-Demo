# ADR-0005 — Keep Luxury Presence; do not build RCRE-owned IDX in early phases

**Status:** Proposed
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald

## Context

The website audit found rcregroup.com runs on **Luxury Presence** (confirmed via `x-powered-by`
header), served from S3 behind Cloudflare, aggregating **at least four distinct MLS feeds**:

- Greater Alabama MLS (GALMLS) — confirmed by attribution text
- Northeast Florida MLS — Jacksonville/Clay/St. Johns listings
- Stellar MLS / MFRMLS — at least one Port Charlotte listing (`mfro…` prefix)
- A fourth South Florida source — Broward/Palm Beach/Miami-Dade listings use a different, hashed
  ID scheme

It also hosts consumer accounts, saved searches, and the entire lead database
(`/home-search/account`, `/home-search/auth/`).

The consumer site is the *least* broken part of RCRE's estate: real IDX, 27 well-targeted county
SEO blog posts, 13 substantive agent pages, working consumer accounts, credible design. The gaps
RCRE actually has — recruiting, CRM, agent portal, academy, assistant — are all things the website
vendor was never going to provide.

Replacing IDX means negotiating per-MLS IDX agreements, honoring per-MLS display/attribution/
retention rules, and maintaining four normalizing integrations. It is the most expensive thing on
the board and the least differentiating.

## Decision

1. **Keep Luxury Presence** as the consumer marketing site through at least Phase 6.
2. **Do not build RCRE-owned IDX** in early phases.
3. **Do add an owned lead-capture path** in Phase 1, running alongside the vendor's, so RCRE begins
   accumulating its own attributed lead data immediately.
4. **Revisit the platform decision at contract renewal**, informed by real data.

## Alternatives considered

- **Rebuild the consumer site immediately.** Rejected: highest cost, highest risk, attacks the one
  thing that works, and does not advance the primary objective (recruiting).
- **Build RCRE-owned IDX now.** Rejected: four MLS relationships, four compliance regimes, and
  substantial ongoing engineering for a capability RCRE already has.
- **Move to a different vendor (kvCORE, Sierra, Ylopo, Real Geeks).** Deferred: cannot be evaluated
  without contract terms, cost, and what RCRE actually needs from a website. Discovery C4.

## Consequences

- Easy: focus goes to the actual gaps. No listing-data compliance burden in year one.
- Easy: the SEO program and its ranking history are preserved.
- Hard: RCRE remains dependent on a vendor for its most public surface, and continues to pay for it.
- Hard: the owned capture path means two lead destinations temporarily. Mitigated by treating the
  RCRE database as the system of record from day one and the vendor as a source.
- Accepted risk: vendor lock-in persists. Reduced — not eliminated — by RCRE owning its lead data
  going forward.

## Revisit when

- Luxury Presence contract renewal (**date unknown — discovery C4**).
- The Agent Portal makes agent-page functionality that Luxury Presence cannot support strategically
  necessary.
- Vendor cost or capability changes materially.
