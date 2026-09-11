# ADR-0007 — Adopt Hermes Agent as the RCRE agent runtime

**Status:** **APPROVED IN PRINCIPLE** — 2026-08-19 by Jeremy McDonald
**Date:** 2026-08-19 · **Approved in principle:** 2026-08-19
**Decision owner:** Jeremy McDonald

> **Approval scope.** Jeremy has approved the *architectural direction*. This authorizes design,
> planning, and a controlled pilot. It does **not** authorize production application development.
> The decision moves to full `Accepted` after the Hermes pilot
> ([RCRE-HERMES-PILOT-PLAN.md](../../05-planning/RCRE-HERMES-PILOT-PLAN.md)) and leadership
> discovery report evidence.

## Context

The V1 architecture assumed RCRE would build its AI assistant, agent runtime, memory, skills, and
automation layer. A deep investigation of Hermes Agent v0.19.0 (Nous Research, MIT licence)
challenged that assumption. Findings in
[HERMES-CAPABILITY-AUDIT.md](../../01-research/hermes/HERMES-CAPABILITY-AUDIT.md).

What Hermes already provides, hardened and in production use: a multi-provider agent runtime with
sessions and streaming; per-profile isolated memory and personality (SOUL.md); a versioned skills
system with private GitHub tap distribution; MCP client with OAuth 2.1, mTLS, and per-tool
filtering; a four-system hook layer where `pre_tool_call` can technically block or modify tool calls;
an eight-layer security model with fail-closed approvals and a hardline blocklist; cron with natural
language scheduling and delivery to 25+ messaging platforms; an Electron desktop app with a plugin
SDK exposing routes, panes, sidebar navigation, palette, keybinds, and themes; voice mode with wake
word; browser automation across six backends; computer use; subagent delegation; and an
OpenAI-compatible API server with a Runs API and an approval-resolution endpoint.

Building even a fraction of this is a multi-quarter effort that produces no RCRE-specific value.

Jeremy has already proven the extension pattern: `legends-team-builds/LegendsAgentOS(Hermes)/` is a
mortgage vertical built as an upstream-compatible extension, with role profiles, 15 skills, a
desktop plugin, cron templates, a policy MCP gateway, and a documented upgrade procedure — with
**"Core changes: None planned or required."**

Critically, the investigation also established what Hermes is **not**: memory is ~1,300 tokens,
per-profile, with the docs stating plainly that **"No team collaboration or central knowledge
repository exists."** Hermes is a runtime, not a system of record.

## Decision

**Adopt Hermes Agent as RCRE's agent runtime and optional power interface.**

RCRE will not build an agent runtime, a skills engine, a personal-memory system, an agent scheduling
system, a voice stack, or a messaging gateway layer.

**Hermes is expected to provide:** agent reasoning · tool calling · personal memory · personal
profile behaviour · skills · scheduled agent work · messaging gateways · voice · research · browser
automation where appropriate · subagents where genuinely useful · and optional Hermes Desktop usage.

**RCRE will NOT treat Hermes memory as the brokerage system of record.** *(Jeremy, 2026-08-19.)*

RCRE **will** build, and Hermes will not touch: the system of record, authentication, entitlements,
consent enforcement, compliance gates, deterministic scoring, server-side audit, and the web portal.

Extension is via official surfaces only — profiles, skills (private tap), MCP server, hooks, cron,
and the desktop plugin SDK. **No core forks.** Adopt Jeremy's Legends upstream strategy verbatim,
including its conflict rule: *"Prefer adapting extensions to the new SDK over patching upstream."*

## Alternatives considered

- **Build the runtime ourselves (V1 assumption).** Rejected: months of undifferentiated work. RCRE's
  durable value is its data, workflows, and compliance posture — not a chat loop.
- **A hosted assistant platform** (a commercial agent SaaS). Rejected: less control over guardrails,
  weaker per-profile isolation, no comparable skill/hook/MCP extensibility, and vendor lock-in
  without the MIT escape hatch.
- **Direct LLM API integration with a thin custom harness.** Genuinely viable for a narrow
  answer-and-draft assistant, and it avoids the install-friction problem. Rejected because it
  forfeits voice, scheduled multi-channel delivery, skills, and the desktop experience — which are
  precisely the things that make the recruiting claim credible.
- **Fork Hermes.** Rejected: forfeits auto-updates and upstream security fixes for a fast-moving
  dependency. MIT means forking remains available as an exit, which is the point.

## Consequences

- Easy: an enormous capability surface arrives immediately, including voice, scheduling, research,
  and multi-channel delivery.
- Easy: RCRE's engineering concentrates on data, compliance, and workflow — the differentiating parts.
- Easy: a genuinely impressive recruiting demo becomes reachable in Phase 3 rather than Phase 6.
- Hard: **upstream dependency.** The vendored tree shows very high PR velocity. Requires a
  disciplined upgrade process and a deliberately thin RCRE plugin.
- Hard: **per-machine deployment.** Install, macOS TCC permissions, profile import, credentials —
  for non-technical users. Mitigated by the portal being primary (ADR-0009).
- Hard: **no central admin console.** Managed Scope is *"advisory rather than absolute"*,
  world-readable, with no MDM. RCRE must build provisioning, entitlement, audit, and offboarding
  itself.
- Hard: **agent-machine data custody.** Mitigated by keeping records in RCRE, a PII-to-memory
  blocking hook, and offboarding that revokes MCP, OAuth, and gateway access.
- Accepted cost: **"Powered by Hermes Agent"** branding. Full white-label is not available without
  forking the shell.
- Accepted cost: per-agent model spend must be modelled before fleet rollout.

## Exit strategy

MIT licence permits forking, modification, and commercial redistribution. If upstream direction
becomes unacceptable, RCRE can pin a version and maintain it. Because all RCRE logic lives in the
MCP server, the skill tap, and the portal — not in Hermes core — the runtime is replaceable without
touching the system of record. **That separation is the reason this decision is reversible, and it
must be maintained deliberately.**

## Revisit when

- Upstream SDK churn repeatedly breaks the RCRE plugin or skills
- Install friction defeats adoption in the Phase 3 design-partner pilot
- Per-agent cost proves unsustainable at roster scale
- Counsel or the E&O carrier objects to the data-custody model
- Licensing terms change
