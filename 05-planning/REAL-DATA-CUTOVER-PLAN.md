# Real data cutover plan

**Date:** 2026-08-24 · **Status:** awaiting Stage 1 authorisation
**Prerequisite:** [PRODUCTION-READONLY-ACTIVATION-CHECKLIST.md](../08-mvp/PRODUCTION-READONLY-ACTIVATION-CHECKLIST.md)

Nine stages. Read-only throughout stages 1–8; writes are not in scope and are a separate decision.

**The principle:** every stage is independently reversible, and no stage begins until the previous
one has produced evidence it worked. The expensive failure mode here is not a bug — it is
connecting everything at once and then not being able to tell which part is wrong.

---

## Stage 1 — Authenticate

**Do:** one call, `GET /v1/identity`. Then `GET /v1/users`, `GET /v1/teams`, `GET /v1/stages`,
`GET /v1/pipelines`. Five read calls total.

**Produces:** confirmation the key works, the account domain, the agent roster, RCRE's **real
stage names** (we have been guessing them), the team structure, and whether the key belongs to an
Owner (`isOwner`).

**Risk:** minimal. Five GETs. The realistic failure is a key with insufficient permission, which
we would rather discover here than at Stage 3.

**Rollback:** revoke the key. Nothing has been stored.

**Validation:** identity returns RCRE's domain · user count is plausible · at least one user has
`isOwner: true` · stage names are readable · teams exist *(if they do not, that is a finding — see
the Alabama routing questions).*

> ### ⚠ JEREMY APPROVAL REQUIRED
> **This is the first time RCRE code touches RCRE's production Follow Up Boss.**

---

## Stage 2 — Historical backfill

**Do:** read history without registering anything. `/v1/people` → `/v1/calls`, `/v1/textMessages`,
`/v1/appointments`, `/v1/deals`, `/v1/tasks`, `/v1/events`. Paced against the
`X-RateLimit-Remaining` header, cursors in `sync_state` so it resumes rather than restarts.

**Produces:** the seven day-one metrics — unanswered leads, overdue follow-ups, appointment set
rate, contact attempts, lead-to-contract, lead-to-closing, agent activity — plus a real picture of
data quality.

**Risk:**
- **Rate limiting.** Mitigated by header-driven pacing and resumable cursors. A 429 delays; it does not corrupt.
- **Volume.** Unknown until Stage 1 tells us the contact count.
- **No date filters on `/v1/calls`.** Backfilling attempts means iterating per person. This is the slow part, and it should be scoped after Stage 1 reveals the real numbers.
- **Data quality surprises.** Missing sources, stale stages, inactive agents holding live leads. These are findings, not failures — and arguably the most valuable output of this stage.

**Rollback:** truncate RCRE tables and rerun. Nothing in FUB changed.

**Validation:** contact count within a plausible range of leadership's expectation · every person
resolves to a real user · stage names match Stage 1 · no message bodies stored anywhere (check the
`activity` table directly) · unanswered-lead count is credible.

> ### ⚠ JEREMY APPROVAL REQUIRED
> Sustained read volume against production. Still no writes, no webhooks.

---

## Stage 3 — Register webhooks — **history starts here**

**Do:** register the 17 events from
[FUB-EVENT-SUBSCRIPTION-SET.md](../08-mvp/FUB-EVENT-SUBSCRIPTION-SET.md). Stamp
`integration_state.webhook_activated_at`.

**Produces:** the beginning of the six forward-only metrics — first response time, time in stage,
stage transition rate, pipeline fallout, assignment history, time to route.

**This is the stage that cannot be done retroactively.** Everything before this moment is
unmeasurable for those six metrics, permanently, no matter what is built later.

**Risk:**
- Registering a webhook is the **one mutation** in the whole read-only period. It creates a webhook resource; it does not touch RCRE's data.
- A wrong or unreachable endpoint means FUB retries for ~8 hours, then drops. Missed events are missed permanently.
- Signature verification must be working **before** registration, not after — an unverified endpoint accepts anything that reaches it.

**Rollback:** `DELETE /v1/webhooks/:id`. Immediate. The only cost is the gap.

**Validation:** signature verification rejects a deliberately malformed payload *(test this first)*
· endpoint returns 2XX within 10 seconds · a real event arrives and resolves · `stage_transitions`
and `assignment_history` receive their first `detected_via = 'webhook'` rows.

> ### ⚠ JEREMY APPROVAL REQUIRED — **the time-sensitive one**
> Every week of delay is a week of funnel history RCRE will never be able to produce.

---

## Stage 4 — Validate normalisation

**Do:** no new access. Verify that what we stored matches what FUB holds. Spot-check individual
contacts against the FUB UI, field by field.

**Risk:** none — nothing new is touched. The risk is *skipping it*, and then discovering at Stage 8
that a metric has been wrong since Stage 2.

**Rollback:** n/a.

**Validation:** stage names map exactly · assignment matches the FUB UI · direction is right on
every activity type *(an inbound call counted as an attempt would inflate every agent)* ·
timestamps are timezone-correct · dedup holds under replayed webhooks · **no message bodies, no
recording URLs, no read status anywhere.**

*Report back. No approval needed.*

---

## Stage 5 — Validate RCRE Today against real data

**Do:** point Today at real data for **one agent who has agreed to it**. Compare its priorities
against what that agent would have said themselves.

**Risk:** the interesting one. The priority engine has only ever run on fixtures built to make it
look good. Real data will disagree with it — and that disagreement is the whole point of this stage.

**Rollback:** `RCRE_DATA_MODE=fixtures`.

**Validation:** does the agent agree with the priority order? · are the reasons true? · does
anything embarrassing surface — a dead lead ranked first, a duplicate, a client who has closed? ·
does the day plan respect real appointments?

**Success is not "it works."** Success is a specific list of what the engine got wrong.

> ### ⚠ JEREMY APPROVAL REQUIRED
> Real client data appears in a user interface for the first time. Requires the agent's consent.

---

## Stage 6 — Validate Command reporting

**Do:** run the funnel report over real backfilled data, for brokers only.

**Risk:** **this is where a number could damage someone.** These metrics describe named agents.
A miscounted contact attempt or a misattributed lead is not a rendering bug — it is a false
statement about a person's work, shown to their broker.

**Rollback:** `RCRE_DATA_MODE=fixtures`.

**Validation:** every forward-only metric is clamped to `webhook_activated_at` and **says so
on screen** · backfill rows excluded from time-in-stage · response time measured from final
assignment · reassigned leads attributed to whoever held them at the time · totals reconcile
against FUB's own reporting where it overlaps.

**Hold every agent-level number until Stage 8.** Aggregates first; named-agent comparisons after
leadership has sanity-checked them.

> ### ⚠ JEREMY APPROVAL REQUIRED
> Performance data about named real people.

---

## Stage 7 — Silent observation

**Do:** run for a defined period — **recommend 30 days minimum, 45 preferred** — with ingestion
live and no one acting on the output. Long enough for a full lead lifecycle: a lead arrives, gets
worked, converts or stalls.

**Risk:** low technically. The real risk is impatience — acting on a metric before there is enough
history for it to mean anything. A stage-aging median over eleven days of data is noise.

**Rollback:** disable per the checklist. Captured data stays.

**Validation:** webhook delivery success rate · no gaps in `stage_transitions` · assignment chains
look sane, especially the Alabama path · error and retry rates steady · rate-limit headroom.

> ### ⚠ JEREMY APPROVAL REQUIRED to begin, and a defined end date.

---

## Stage 8 — Compare against leadership's understanding

**Do:** sit down with Julio and Taquilla. Show them the numbers. Ask what they expected.

**This is the real validation, and it is a conversation rather than a test.** If the system says
median first response is 14 minutes and leadership believes it is two hours, one of them is wrong
and finding out which is the entire point of the exercise. Either answer is valuable: the system
has a bug, or leadership has been managing on an inaccurate picture — which is precisely the
problem this product exists to fix.

**Risk:** the numbers may be unwelcome. Some agent will look worse than expected. Handle that
before the meeting, not during it.

**Validation:** where the system and leadership disagree, the discrepancy is *explained* — not
explained away. An unexplained gap means the metric is not ready to manage on.

*Report back. No approval needed.*

---

## Stage 9 — Consider writes

**Not part of this plan.** A separate decision, made after Stage 8, with its own ADR.

For the record, the likely first candidates, in order of increasing risk: creating a task ·
logging a note · updating a stage · sending a message *(a very different category — client-facing,
and gated by approval no matter what)*.

**Every current guard stays until an ADR removes it:** `RCRE_ALLOW_FUB_WRITES=false`,
`integration_state.writes_enabled=false`, and no write tools in the MCP server.

> ### ⚠ SEPARATE AUTHORISATION — out of scope for read-only activation.

---

## Summary

| Stage | Approval | Reversible | Data at risk |
|---|---|---|---|
| 1 Authenticate | **Yes** | Fully | None |
| 2 Backfill | **Yes** | Fully | None — reads only |
| 3 Webhooks | **Yes** ⏰ | Yes, gap is permanent | None |
| 4 Normalisation | No | n/a | None |
| 5 Today | **Yes** | Fully | Client data shown to one agent |
| 6 Command | **Yes** | Fully | Agent performance shown to brokers |
| 7 Observation | **Yes** | Fully | None |
| 8 Compare | No | n/a | None |
| 9 Writes | **Separate** | — | **FUB data — out of scope** |

⏰ Stage 3 is the only one with a cost to waiting.
