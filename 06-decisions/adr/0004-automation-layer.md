# ADR-0004 — In-app jobs before n8n

**Status:** Proposed
**Date:** 2026-08-19
**Decision owner:** Jeremy McDonald

## Context

Jeremy's workspace contains a substantial n8n investment: `05-n8n-automation-registry/` documents
three planned instances (Personal VPS, Legends Team VPS, Loan Factory Automation Beta Cloud) and
roughly 19 workflow groups.

Reading the registry honestly: the instances are marked "Planned / unverified," most workflows are
"JSON exists in source repo inventory; not imported here," and six named workflows are explicitly
"inactive." LegendsOS additionally carries a `docs/architecture/ZAPIER_VS_N8N_AUDIT.md`, indicating
the question was already contested.

This is evidence that self-hosted workflow orchestration added operational overhead — instances to
run, credentials to rotate, webhooks to secure, versions to maintain — that exceeded the value
delivered.

RCRE's early automation needs are ordinary: scheduled follow-up, recruiting nurture sequences,
digest emails, data sync, reminder generation.

## Decision

Start with **in-app scheduled jobs and a queue** inside the RCRE application. Automations are
code, versioned in the same repository, tested with the same tooling, and subject to the same
approval gates and audit log as everything else.

Introduce n8n (or any external orchestrator) only when a specific need arises that in-app jobs
genuinely cannot serve — typically non-developers authoring workflows, or long-tail SaaS
connectors not worth hand-writing.

## Alternatives considered

- **n8n from day one**, reusing the existing registry pattern. Rejected: adds a self-hosted service
  and a second place where business logic lives before there is any demonstrated need.
- **Zapier.** Deferred: reasonable for long-tail connectors later; poor fit for core business logic
  and per-record cost scales badly.
- **A managed queue (Inngest, Trigger.dev, QStash).** Genuinely reasonable and worth considering at
  the point in-app cron becomes limiting. Not needed at Phase 1.

## Consequences

- Easy: automation logic is versioned, reviewable, testable, and deployed with the app.
- Easy: no extra infrastructure, credentials, or uptime obligation.
- Hard: non-developers cannot author workflows. Acceptable at RCRE's current scale.
- Hard: each third-party connector must be hand-written. Mitigated by the deliberately narrow
  integration priority list.

## Revisit when

- Non-technical RCRE staff need to author automations themselves.
- Connector count grows past what is reasonable to hand-write.
- A single automation needs orchestration complexity (long-running, multi-branch, human-in-the-loop
  across days) that outgrows a job runner.

**Carry forward regardless:** the *registry discipline* from `05-n8n-automation-registry/` — every
automation named, owned, risk-rated, and approval-gated — is good practice independent of the tool.

---

## REVISION — 2026-08-19 (Hermes investigation)

**Status remains Proposed. The anti-n8n conclusion holds. The framing was too narrow.**

This ADR framed the choice as "in-app jobs vs n8n." Adopting Hermes (ADR-0007) makes that a
three-way split, because Hermes ships a genuinely capable scheduler: natural-language and cron
scheduling, delivery to 25+ messaging platforms, `[SILENT]` suppression, job chaining via
`context_from`, no-agent (script-only, zero-token) mode, per-job model pins, and pre-dispatch config
validation.

**Revised decision — three lanes:**

| Lane | Tool | Why |
|---|---|---|
| **Agent-facing scheduled work** — daily briefs, prospecting lists, sweeps, market research, skill-freshness checks | **Hermes cron** | Per-profile, agent-contextual, delivered to the agent's chosen channels. Already built and better than anything RCRE would write |
| **Deterministic business logic** — SLA timers, lead scoring, digests, data hygiene, event bus | **RCRE in-app jobs** | Must run server-side regardless of whether any agent's machine is on. Must be reproducible and auditable |
| **Third-party workflow orchestration** | **Still not n8n** | The original reasoning is unchanged: the registry in Jeremy's workspace documents three "planned/unverified" instances with most workflows never imported or inactive |

**One important limitation discovered:** Hermes cron is **time-driven only**. There is no inbound
webhook or event trigger in the cron system. Event-driven automation therefore runs the other way —
the RCRE backend owns the event bus and invokes Hermes via `POST /v1/runs`, or delivers through a
messaging gateway, or is polled by a short-interval Hermes routine. RCRE owns triggers, rules, and
audit; Hermes reasons and drafts.

The "revisit when" conditions are unchanged, as is the note to carry forward the registry discipline
regardless of tool.
