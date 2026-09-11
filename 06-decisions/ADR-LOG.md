# RCRE Architecture Decision Log

Every consequential technical or architectural decision is recorded here, with its reasoning and
its alternatives, so that future sessions and future people understand **why** — not just what.

**Status values:** `Proposed` · **`Approved in Principle`** · `Accepted` · `Deferred` · `Superseded` · `Rejected`

**`Approved in Principle`** means Jeremy has approved the *architectural direction*. Design, planning,
and controlled pilots may proceed. **It does not authorize production application development.** A
decision moves to full `Accepted` on evidence — from leadership discovery and, for the Hermes
decisions, from the [Hermes pilot](../05-planning/RCRE-HERMES-PILOT-PLAN.md).

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](adr/0001-storage-boundary.md) | All RCRE work stays inside `RCRE/`; everything outside is read-only | **Accepted** | 2026-08-19 |
| [0002](adr/0002-database-and-auth.md) | PostgreSQL + Supabase Auth as the single data and identity layer | Proposed | 2026-08-19 |
| [0003](adr/0003-single-application.md) | One application and one database, not a Growth/Execution engine split | Proposed · **revised 2026-08-19** | 2026-08-19 |
| [0004](adr/0004-automation-layer.md) | Automation lanes: Hermes cron / RCRE jobs / not n8n | Proposed · **revised 2026-08-19** | 2026-08-19 |
| [0005](adr/0005-website-and-idx.md) | Keep Luxury Presence; do not build RCRE-owned IDX in early phases | Proposed | 2026-08-19 |
| [0006](adr/0006-no-stub-ui.md) | Ship no stub or "Coming Soon" surfaces | Proposed · **revised 2026-08-19** | 2026-08-19 |
| [0007](adr/0007-adopt-hermes-runtime.md) | Adopt Hermes Agent as the RCRE agent runtime | **APPROVED IN PRINCIPLE** | 2026-08-19 |
| [0008](adr/0008-rcre-mcp-boundary.md) | The RCRE MCP server is the single integration boundary | **APPROVED IN PRINCIPLE** | 2026-08-19 |
| [0009](adr/0009-hermes-desktop-optional.md) | Hermes Desktop optional power surface; portal primary | **APPROVED IN PRINCIPLE** | 2026-08-19 |
| [0010](adr/0010-standing-architecture-directions.md) | Standing architecture directions (12 cross-cutting constraints) | **APPROVED IN PRINCIPLE** | 2026-08-19 |
| [0011](adr/0011-provider-agnostic-ai.md) | Provider-agnostic AI; RCRE does not fund per-agent frontier inference | **APPROVED IN PRINCIPLE** | 2026-08-19 |
| [0012](adr/0012-follow-up-boss-incumbent.md) | Follow Up Boss is the incumbent CRM; RCRE builds an intelligence layer | **APPROVED IN PRINCIPLE** | 2026-08-19 |
| [0013](adr/0013-rcre-first-proving-ground.md) | RCRE is the proving ground; multi-brokerage deferred, not designed away | **APPROVED** | 2026-08-24 |
| [0014](adr/0014-no-sms-read-receipts.md) | No SMS read receipts; report genuine engagement instead | **APPROVED** | 2026-08-24 |
| [0015](adr/0015-mvp-scope-freeze.md) | MVP scope freeze: three agent functions, exceptions-first management | **SUPERSEDED by 0017** | 2026-08-24 |
| [0016](adr/0016-no-unearned-compliance-claims.md) | No unearned compliance claims — "review required", never "check passed" | **APPROVED** | 2026-08-26 |
| [0017](adr/0017-v2-supersedes-scope-freeze.md) | V2 Master Plan supersedes the ADR-0015 scope freeze | **APPROVED** | 2026-08-26 |
| [0018](adr/0018-application-convergence.md) | One canonical RCRE application; converge demo and backend | **APPROVED** | 2026-08-26 |
| [0019](adr/0019-transaction-os-stack.md) | Transaction OS = RCRE + Stirling PDF + Documenso; Dotloop removed | **APPROVED** | 2026-08-26 |

### Revisions

ADRs 0003, 0004, and 0006 were revised on 2026-08-19 following the Hermes investigation. Revisions
are **appended** to the original ADR under a `REVISION` heading — the original reasoning is preserved
and never rewritten. ADR-0001 is Accepted and was not touched.

ADRs 0002 and 0005 were reviewed and **kept unchanged**; the Hermes findings strengthened both.

### Approvals — 2026-08-19

Jeremy approved the general architectural direction from the Hermes investigation. ADRs **0007, 0008,
0009** moved to **Approved in Principle**, and **ADR-0010** was added recording twelve standing
cross-cutting directions. ADRs 0002–0006 remain `Proposed` pending discovery evidence.

**Not authorized by this approval:** production application development, building the MCP server,
configuring or running the Hermes pilot, or the Hermes Desktop `ROUTES_AREA` proof of concept.

### MVP build authorization — 2026-08-19

Jeremy authorized a **controlled local MVP build**. ADR-0011 (provider-agnostic AI) corrects the
economic assumption in the AI cost model; ADR-0012 (Follow Up Boss incumbent) resolves the Phase 1
question in favour of an intelligence layer rather than a replacement CRM.

**Authorized:** source code, local migrations, fixtures, tests, local UI, MCP server code, Hermes
profile and skill templates, development mocks, local test and build runs.

**Still NOT authorized:** changing the live RCRE website · registering production FUB webhooks ·
writing to production FUB · connecting production Meta or Google Ads assets · deploying
infrastructure · sending email or SMS · publishing social posts · using real client PII.

---

## How to add a decision

1. Create `adr/NNNN-short-slug.md` using the template below.
2. Add a row to the table above.
3. Never edit an accepted ADR to change its meaning — supersede it with a new one and mark the old
   one `Superseded by NNNN`.

### Template

```markdown
# ADR-NNNN — <Title>

**Status:** Proposed | Accepted | Deferred | Superseded | Rejected
**Date:** YYYY-MM-DD
**Decision owner:** <name>

## Context
What situation forces a decision? What constraints are real?

## Decision
What we are doing, stated plainly.

## Alternatives considered
What else was on the table, and why it lost.

## Consequences
What this makes easy. What this makes hard. What we accept as a cost.

## Revisit when
The specific condition that should reopen this.
```
