# ADR-0015 — MVP scope freeze: three agent functions, exceptions-first management

**Status:** **APPROVED** — 2026-08-24 by Jeremy McDonald
**Date:** 2026-08-24
**Decision owner:** Jeremy McDonald
**Basis:** [Taquilla Allen, 2026-08-24](../../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md) §9;
Jeremy's direction of 2026-08-24 ("the demo is sufficient to communicate the vision")

## Context

The demo now communicates the vision, and leadership has defined what the product is for. The
risk from here is not that we build the wrong thing — it is that we keep building things.

Every product at this stage attracts plausible additions. Each one is individually defensible and
collectively fatal, because the thing that actually matters next is not a feature at all: it is
connecting to real data and finding out whether the intelligence layer says true things about
RCRE's actual business. A feature added this month is a feature that has to be validated against
real data next month.

Taquilla defined three functions. That definition is a gift, and it should be used as a gate.

## Decision

**Scope is frozen at the three functions leadership named, plus exceptions-first management.**

### The agent product — RCRE Today

Optimises for exactly three things:

1. **Lead follow-up and prioritisation** — who to contact, why, in what order
2. **Pipeline and accountability management** — what is falling through, what is overdue, what
   moves a client toward appointment → showing → offer → contract → closing
3. **Personalised business coach** — RCRE procedures and individual performance producing daily
   priorities, scripts, coaching, time blocking, and specific next actions

**The test every proposal must pass:** *does this materially improve one of the three?* Not
"is it related to one" — **materially improve**. If not, it is deferred. Not rejected, not
argued about; recorded and deferred.

### The management product — RCRE Command

**Exceptions first.** The first screen answers five questions and nothing else:

- Who needs attention?
- Which leads need attention?
- Which agents need attention?
- Which pipeline stages need attention?
- Which recruiting prospects need attention?

Detailed reporting stays **one level deeper**, reachable in one click, and does not migrate onto
the main screen.

This is not a layout preference. Leadership's stated problem is that they spend their time
manually checking things. A dashboard that presents forty numbers recreates that problem with
better typography — the work of deciding what matters is still theirs. A screen that says "these
five things need you today" does the work. The moment Command's first screen starts accumulating
charts, the product has quietly reverted to the thing it was built to replace.

### Commercial architecture — confirming ADR-0013

RCRE is the proving ground. Build and validate inside RCRE first; packaging for other brokerages
is a legitimate later goal.

**Retain:** organisation-scoped schema (`organization_id` on every tenant-scoped table),
tenant-safe permissions (every read takes a resolved actor), per-organisation configuration in
data rather than code.

**Do not build:** billing · white-labelling · brokerage signup · marketplace · multi-brokerage
administration · SaaS onboarding.

## What this defers

Not rejected — **deferred**, and recorded so they are not re-litigated:

- Additional marketing automations beyond the listing campaign
- Deeper transaction intelligence
- Additional integrations of any kind
- Advanced analytics beyond the funnel report
- More demo surfaces, more assistant turns, more visual work
- Any UI redesign

## Consequences

**Easy:** saying no. The three functions are leadership's own words, so declining an addition is
not a matter of taste — it is a matter of what RCRE asked for. That is a much better conversation
than an argument about priorities.

**Hard:** genuinely good ideas will be deferred. Some of them will be right, and waiting will feel
wasteful. The freeze is worth it anyway, because a smaller system validated against real data is
worth more than a larger one validated against fixtures.

**Accepted cost:** if real data reveals that one of the three functions cannot be delivered as
designed, this ADR is reopened — which is the correct outcome, and exactly what the validation
phase is for.

## Revisit when

- Real-data validation shows one of the three functions is not achievable as specified, **or**
- Leadership adds a fourth priority in writing, **or**
- The read-only observation period completes and the next phase is scoped
