# ADR-0011 — Provider-agnostic AI; RCRE does not fund per-agent frontier inference

**Status:** **APPROVED IN PRINCIPLE** — 2026-08-19 by Jeremy McDonald
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald
**Corrects:** the economic assumption in [RCRE-AI-COST-MODEL.md](../../05-planning/RCRE-AI-COST-MODEL.md)

## Context

The AI cost model written on 2026-08-19 modelled RCRE paying frontier-model
inference per agent, and framed the per-agent monthly cost as a brokerage
expense to be justified against agent tooling spend.

**That is not the intended business model.** Jeremy corrected it the same day.

The economics matter more than they first appear. A product whose unit cost
scales linearly with agent count, on a provider RCRE does not control, has two
problems: it caps recruiting (every new agent adds cost before adding revenue),
and it couples RCRE's margin to a third party's price list. Neither is
acceptable for something positioned as a recruiting advantage.

The prior model was not wrong about *how to calculate* cost. It was wrong about
*who pays*.

## Decision

**RCRE's AI architecture is provider-agnostic, and RCRE does not default to
funding frontier-model inference for every agent.**

Provider strategy, in order of preference:

1. **The agent uses their own AI subscription** through Hermes' supported paths.
2. **ChatGPT users** may use Hermes' supported OpenAI Codex OAuth path where
   appropriate.
3. **Another supported subscription or provider** where the agent prefers one.
4. **The agent supplies their own API credentials** where supported.
5. **RCRE-provided default inference prefers free or local models** where
   practical.

Binding constraints:

- **The architecture stays provider-agnostic.** No Claude hard-coding, no OpenAI
  hard-coding.
- **RCRE's product must not become economically dependent on RCRE paying
  per-agent inference fees.**
- Hermes manages provider credentials. RCRE never stores an agent's AI
  subscription credentials.
- If a server-side AI feature becomes necessary, it goes behind a provider
  abstraction, supports free/local options where practical, treats paid provider
  configuration as optional, and documents its cost implications.

## Consequences

- Easy: RCRE's cost does not scale with headcount. Recruiting is not
  cost-capped, which is the whole point.
- Easy: agents who already pay for a subscription get value from it rather than
  being asked to abandon it.
- Easy: no vendor lock-in at the model layer.
- **Hard: quality varies by provider.** An agent on a small local model will get
  materially weaker drafting than one on a frontier model. RCRE's deterministic
  layer must therefore carry the load — see below.
- Hard: support burden. "It's not working" may mean "your provider is
  misconfigured", which RCRE does not control.
- Hard: the demo and the daily experience may differ if the demo runs on a
  strong provider and an agent runs on a weak one. **Demo on a realistic
  configuration.**

**The design consequence that matters most:** because model quality is not
guaranteed, the *insights themselves must be deterministic*. RCRE Today's
prioritisation, thresholds and reasons are computed in code, not by a model, so
they are identical for every agent regardless of provider. The model formats and
converses; it does not decide. That was already the design (see
`src/lib/insights/engine.ts`) and this ADR makes it load-bearing rather than
merely preferable.

## Revisit when

- RCRE decides to fund inference for a specific high-value workload (e.g. the
  broker briefing) as a deliberate, bounded exception.
- Provider pricing changes enough to alter the calculus.
- Pilot evidence shows provider variance materially damages the experience.
