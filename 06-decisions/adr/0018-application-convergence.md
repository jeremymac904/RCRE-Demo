# ADR-0018 — One canonical RCRE application: the domain layer moves into the UI app

**Status:** **APPROVED** — 2026-08-26 by Jeremy McDonald
**Date:** 2026-08-26
**Decision owner:** Jeremy McDonald

## Context

RCRE has two applications that share **no code**.

| | `apps/rcre-demo` | `apps/rcre` |
|---|---|---|
| Size | 81 TS/TSX files + 247 public assets (~93 MB) | 45 files across `src/`, `tests/`, `supabase/` |
| Routes | 20+ — the entire approved experience | **5** |
| Data | 100% synthetic, hard-coded | Real domain layer |
| Tests | **none** | **414 passing** |
| Auth | a cookie naming a persona | `getActor()` failing closed, RLS |

Leadership's 26 August reactions were to `rcre-demo` — verified from the recording. So every
enhancement request targets a screen with no backend, while the real backend has excellent bones and
almost no UI.

Maintaining both is untenable: the demo drifts toward being a mock nobody can ship, and the backend
grows capability nobody can see.

## Decision

**Converge into one canonical application. `apps/rcre-demo` becomes that application, and the domain
layer moves into it.**

The direction is decided by an asymmetry in what can move *safely*, not by which half matters more.

**The domain layer is portable.** `apps/rcre/src/lib/**` contains **zero React**. Its only non-relative
imports are `@/lib/*`, `server-only`, `next/headers`, `pg` and `node:crypto`. Both tsconfigs resolve
`@/*` → `./src/*` identically, so `src/lib/`, `tests/`, `supabase/` and `vitest.config.ts` move with
**no import rewrites** — and 414 tests re-run immediately to prove the move was clean.

**The UI is not portable.** Moving 81 files the other way means replacing a 6-line stylesheet with a
269-line token system, replacing a Tailwind config whose vocabulary is *incompatible* with the one all
81 files are written against, porting fonts, the pre-paint theme script and 93 MB of assets — and then
rewriting the seven UI files `apps/rcre` already has, because they use the vocabulary being replaced.
That is a blind rewrite, and it is **unverifiable**: the demo has no tests.

**The rule: move the half that has a safety net.**

### The seam already exists

`repository.ts` defines a 13-method `Repository` with `MemoryRepository` and `PgRepository`, selected
by `getRepository()`. Scoping is enforced *inside* the repository — `listPeople(actor)` filters by
assignment, `listRecruitingProspects` throws `PermissionDeniedError`. **Eight of twelve authenticated
demo screens re-point to it with no redesign.** Four gaps are additions, not redesigns.

### Sequence, with the invariant that makes it safe

**Build, typecheck and the full test suite stay green after every phase.**

0. Prepare — rename, merge dependencies
1. Move the domain layer; verify the MCP tests' relative import depth still resolves
2. **Rewire `/today` alone, fixtures mode** — this falsifies or confirms the whole plan for one day's work
3. Real identity — delete the persona cookie, widen roles
4. The seven remaining read screens, one per step, deleting each in-page role branch **only after a
   test proves the repository refuses**
5. New domains · 6. Live data + RLS · 7. Real assistant and campaigns

### Synthetic data

`academy.ts` is **real curriculum** with provenance → database seed. The seven authored contact
stories → **test fixtures** (richer than the current 5-person set). `reporting.ts` → **delete**: it is
a seeded PRNG that assigns synthetic performance to **named real RCRE agents**, which is exactly what
must not survive contact with production.

## Alternatives considered

**Move the UI into `apps/rcre`.** Rejected — see above. It is the larger, unverifiable half.

**Keep both, sync manually.** Rejected. This is the status quo and it is what produced a demo asserting
a fair-housing check that did not exist ([ADR-0016](0016-no-unearned-compliance-claims.md)).

**Rewrite cleanly from both.** Rejected, and explicitly forbidden by Jeremy: *"Do not perform a blind
rewrite."* It would discard 414 tests and a working experience simultaneously.

## Consequences

**Easy:** one app, one test suite, one deployment. The demo stops being a parallel truth.

**Hard:** phases 3 and 6 are the dangerous ones. Phase 3 has a window where the persona cookie is gone
and in-page role guards are being removed — repository scoping must land **first**, never in the same
commit. Phase 6 is the first contact with live data, where one failure mode is obvious (empty screens)
and the other is silent (**one agent seeing the whole brokerage's client data**).

**Accepted cost:** ~34–50 working days, and `apps/rcre-demo` carries a name that no longer describes
it. Renaming is cosmetic and deferred rather than risking a path change mid-migration.

**Neither legacy app is removed or archived until Jeremy has reviewed the converged application
running locally.**

## Revisit when

- Phase 2 shows the demo's markup cannot carry domain data — then the direction inverts, and that is
  precisely why `/today` alone goes first, **or**
- a deployment target is pinned to the `apps/rcre` path, in which case `git mv` the directories but
  keep the direction of travel.
