# ADR-0002 — PostgreSQL + Supabase Auth as the single data and identity layer

**Status:** Proposed
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald

## Context

The two prior systems most relevant to RCRE disagree on this exact question:

- **LegendsOS v2** — Supabase (Postgres) with Row-Level Security across ~78 tables and 34
  migrations. Multi-tenant, role-based, production.
- **AI Realtor Pro** — Firebase / Firestore, with `localStorage` still holding leads and projects.
  Closest to RCRE's agent-facing product concept.

RCRE cannot inherit both without re-creating the fragmentation that currently splits Jeremy's
estate across incompatible identity and data layers.

RCRE's actual data is relational and constraint-heavy: a person can be a buyer, then a client,
then a referral source; agents belong to teams that belong to offices in states; transactions join
people, properties, agents, and commission splits; recruiting pipelines need stage history and
audit. Reporting across these is join-shaped.

Separately, a brokerage has a hard security requirement that ordinary apps do not: **agents must
not be able to see each other's books.** Enforcing that in application code means every query is a
potential leak.

## Decision

Use **PostgreSQL via Supabase** as the single system of record, with **Supabase Auth** as the
single identity provider, and **Row-Level Security enabled on every table from the first
migration**.

Adopt the LegendsOS RLS pattern directly:
- `SECURITY DEFINER` helper functions (`current_role()`, `is_owner()`, `current_org_id()`) so
  policies do not recurse on `profiles`
- RLS enabled on every table, no exceptions
- A self-update policy that structurally prevents a user from changing their own role
- OAuth tokens in a service-role-only table with no client policies and revoked grants
- Client-readable views expose credential *status*, never secrets

## Alternatives considered

- **Firebase/Firestore** (AI Realtor Pro's choice). Rejected: document model fights relational
  reporting; cross-collection joins become application code; per-agent isolation depends on
  correctly authored security rules over denormalized documents, which is harder to audit than SQL
  policies. It would also mean the agent-facing product and the brokerage system of record speak
  different languages — the exact problem being solved.
- **Plain Postgres (RDS/Neon) + a separate auth provider (Auth0/Clerk).** Reasonable and more
  portable. Rejected for now because RLS policies that read directly from the Supabase JWT are the
  mechanism doing the security work, and decoupling auth weakens that. Revisit if Supabase becomes
  a constraint.
- **Both, bridged by an integration layer.** Rejected: two sources of truth for identity is the
  root cause of the current estate's fragmentation.

## Consequences

- Easy: per-agent data isolation enforced at the database, not in every query.
- Easy: relational reporting, migrations, constraints, transactional integrity.
- Easy: a large, working reference implementation already exists to learn from.
- Hard: RLS policies must be written carefully and tested — a wrong policy is a silent data leak.
  Policy tests are mandatory, not optional.
- Hard: any code salvaged from AI Realtor Pro's Firestore layer needs rewriting. Its *product
  design*, `lib/ai/router.ts`, `lib/integrations/fub.ts`, and prompt libraries port fine; its data
  layer does not.
- Accepted cost: some vendor dependence on Supabase. Mitigated by the fact that the data is
  standard Postgres and portable.

## Revisit when

- Discovery reveals a hard requirement that Postgres/Supabase cannot meet.
- RCRE has an existing enterprise data platform we must integrate with rather than replace.
- Scale or cost characteristics change materially.
