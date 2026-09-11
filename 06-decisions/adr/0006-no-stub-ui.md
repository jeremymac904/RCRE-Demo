# ADR-0006 — Ship no stub or "Coming Soon" surfaces

**Status:** Proposed
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald

## Context

LegendsOS v2's own `CLAUDE.md` lists nine integrations that are "UI-present but not backend-wired"
and display "Coming Soon": Zapier, Meta (FB/IG), Google OAuth, Google Drive, Google Calendar,
Telegram, HeyGen, YouTube, Google Business Profile.

Related patterns appear elsewhere in the estate: the Apex Advisor platform ships an
`ai-coaching-assistant` page with "seven assistant mode cards" and explicitly "no live AI in
version one"; several routes exist in duplicate; a `localStorage` role-preview stands in for
authentication.

For an internal tool this is a survivable shortcut. For RCRE it is not, because of one specific
fact: **the Agent Portal is the recruiting pitch.** A prospective agent evaluating RCRE will be
shown the platform. If they click three things that do not work, the conclusion is not "early
product" — it is "this brokerage oversells." That damages the primary business objective directly.

## Decision

RCRE ships **no stub UI**. A surface appears in the product only when it works end to end.

Concretely:
- No "Coming Soon" tiles, cards, or nav entries
- No disabled buttons for unbuilt features
- No integration listed in settings until it authenticates and performs a real action
- No dashboard metric rendered from placeholder data
- Roadmap communication happens in conversation and in documents, not as dead UI

Where a capability is genuinely partial, say so honestly in words — "Email drafts are generated for
your review; sending is not yet connected" — rather than rendering a button that does nothing.

Corollary: **ship fewer things that work.** Four working Agent Portal features beat twelve promised
ones.

## Alternatives considered

- **Stub UI to show roadmap.** Rejected — the reason above.
- **Feature flags hiding incomplete work.** Accepted as the *implementation* of this decision.
  Flags are how unfinished work stays out of the UI; they are not a license to render it disabled.
- **A separate labelled "Preview" area.** Deferred. Acceptable later for genuine beta features with
  opted-in users, but not for v1 and not as a home for permanently unfinished work.

## Consequences

- Easy: everything a recruit or agent sees is real, so the demo needs no apology.
- Easy: forces honest scope conversations early.
- Hard: the product looks smaller than the ambition for a while. That is the correct trade.
- Hard: requires discipline when a feature is 80% done and tempting to expose.

## Revisit when

Never for the recruiting-facing surfaces. Possibly relaxed for opt-in beta features once the
platform is established and there is a real user base to opt in.

---

## REVISION — 2026-08-19 (Hermes investigation)

**Status remains Proposed. The decision is unchanged and one clause is added.**

Adopting Hermes (ADR-0007) makes it far easier to expose capability quickly — a profile can be
configured in an afternoon and will happily *appear* to be an RCRE assistant. That raises the bar for
this ADR rather than lowering it, and it introduces a new failure mode the original decision did not
anticipate.

**A configured-but-hollow assistant is the worst possible stub.** An assistant that answers
confidently but cannot actually see the agent's leads, transactions, or clients is not an incomplete
feature — it is a demo that actively misleads. An experienced Realtor will identify it within two
questions as "ChatGPT with a logo," which is precisely the positioning the recruiting objective must
avoid.

**Added clause:**

> No Hermes surface may be exposed to an agent — desktop profile, messaging bot, or scheduled
> routine — until its RCRE MCP tools are wired and returning real data for that agent. Configuring
> the runtime is not shipping the capability.

Corollary, unchanged in spirit: ship fewer things that genuinely know the agent's business, rather
than a broad assistant that knows none of it.
