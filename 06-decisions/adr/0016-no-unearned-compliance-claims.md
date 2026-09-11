# ADR-0016 — The product may not claim a compliance check passed unless one ran

**Status:** **APPROVED** — 2026-08-26 by Jeremy McDonald
**Date:** 2026-08-26
**Decision owner:** Jeremy McDonald

## Context

The campaign builder displayed **"Fair housing check passed"** on every generated campaign. Nothing
evaluated anything. A code comment in `PreviewSurfaces.tsx` asserted *"the real builder runs that
step"* — it did not.

This was on screen during the 26 August leadership demo, shown to a qualifying broker and a managing
broker. It is the worst-shaped defect the estate has produced: a **false compliance assertion**, in
the one domain where a false assertion carries statutory exposure, made to the people whose licences
are at risk.

It is worth being precise about why this was worse than an ordinary bug. An unimplemented feature
tells the user nothing. A *claim* that a control ran tells the user they may stop looking. Fair
housing is exactly the area where a broker's own review is the control, and we told them it had
already happened.

## Decision

**The interface may state that a review is REQUIRED. It may not state that a check PASSED, CLEARED,
was VERIFIED or was APPROVED, unless code actually evaluated the content and was capable of failing
it.**

The string is now **"Compliance review required"**.

This is enforced, not remembered: `99-scratch/qa.py` fails the build on any line matching a
compliance noun near a passing verb, outside comments. Comments may discuss the history — that is how
this ADR stays discoverable from the code. The guard was verified non-vacuous by reintroducing the
original string and confirming the sweep fails.

The rule generalises beyond fair housing, and deliberately so: disclosure checks, licence checks and
legal review are all subject to it. Anywhere the product wants to reassure, it must first be able to
alarm.

## Alternatives considered

**Leave it and build the check later.** Rejected. The claim was live and being demonstrated; the
check is months away behind the marketing module.

**Soften to "fair housing reviewed".** Rejected — still asserts an action nobody took.

**Remove the line entirely.** Rejected, narrowly. The line occupies the place where a real control
belongs, and "review required" is both true and useful: it tells the agent a human step remains.

## Consequences

**Easy:** every compliance statement in the product is now defensible. Nobody has to caveat a demo.

**Hard:** when a real fair-housing control is built, restoring a passing claim requires deleting a
guard clause — deliberately, so that removing it is a decision rather than an accident.

**Accepted cost:** the campaign builder looks slightly less finished. That is the honest state.

## Revisit when

A control exists that inspects campaign copy against fair-housing criteria **and can fail it**. At
that point a passing claim becomes earned, and the guard is narrowed rather than removed.
