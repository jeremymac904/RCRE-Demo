# ADR-0017 — The V2 Master Plan supersedes the ADR-0015 scope freeze

**Status:** **APPROVED** — 2026-08-26 by Jeremy McDonald
**Date:** 2026-08-26
**Decision owner:** Jeremy McDonald
**Supersedes:** [ADR-0015](0015-mvp-scope-freeze.md) — which is **not** deleted and remains readable

## Context

[ADR-0015](0015-mvp-scope-freeze.md) froze scope at the three functions leadership named — lead
follow-up and prioritisation, pipeline and accountability management, personalised business coaching
— and kept RCRE Command exceptions-first. It was the right decision when it was made, and its
reasoning is still worth reading: it existed to stop plausible additions accumulating while the
thing that actually mattered was connecting to real data.

The 26 August leadership meeting broke it. Transaction coordination, a marketing content library,
RCRE-authored training, a public website replacement, and an always-on cloud agent are all outside
the three functions. Judged by ADR-0015's own test — *does this materially improve one of the three?*
— most of V2 fails.

That left one question, and it needed answering rather than drifting: **is ADR-0015 superseded, or is
V2 a second programme sequenced behind it?**

## Decision

**ADR-0015 is superseded by the approved RCRE Platform V2 Master Plan**
(`RCRE_PLATFORM_V2_MASTER_PLAN.md`), effective 2026-08-26.

What carries forward, because it was right and remains right:

1. **Exceptions-first Command.** Detailed reporting stays nested at `/command/reporting`. Promoting
   reporting invites report-first navigation, which is precisely the *"I don't want to have to go
   through so many funnels"* complaint that opened the meeting.
2. **The seven-destination ceiling per role**, and the three-part test a capability must pass to earn
   top-level navigation.
3. **The three functions remain the centre of the agent experience.** They are no longer the
   *boundary* of the platform, but Today, RCRE AI and the coach still exist to serve them.
4. **Deferral is still a real answer.** V2 is large; it is sequenced, not simultaneous.

What changes: the scope boundary itself. Transactions, Content Library, training authoring, the
website and Cloud Hermes are now in scope, in the order the Master Plan sets.

## Alternatives considered

**Keep the freeze; run V2 behind it.** Rejected. Leadership has aligned on the larger direction and
the freeze would have become a document everyone routes around — which is worse than an honest
supersession, because a rule that is quietly ignored stops protecting anything.

**Amend ADR-0015 in place.** Rejected. The log's own convention is that reasoning is preserved and
superseded, never rewritten. Someone reading ADR-0015 in a year should find a correct record of why
the freeze existed and what ended it.

**Declare no scope boundary.** Rejected. The seven-item ceiling and the exceptions-first rule are
what stop V2 becoming the everything-product that ADR-0015 was written to prevent.

## Consequences

**Easy:** the V2 workstreams can start without each one relitigating the freeze.

**Hard:** the freeze was load-bearing. Without it, "does this materially improve one of the three?"
stops being a veto. The navigation ceiling and the three-part top-level test now carry that weight
alone, and they are weaker instruments.

**Accepted cost:** scope grows by roughly an order of magnitude. Application convergence
([ADR-0018](0018-application-convergence.md)) is the first workstream precisely because the current
estate cannot carry that growth.

## Revisit when

- The V2 Master Plan is itself superseded, **or**
- Delivery evidence shows the programme is too large for the team, in which case the honest move is a
  new freeze recorded as an ADR — not silent descoping.
