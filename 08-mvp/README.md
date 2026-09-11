# RCRE MVP

**Thesis:** an intelligence layer **on top of** Follow Up Boss — not a replacement CRM
(ADR-0012).

It answers what FUB does not: *What should I do today? Why? What can the system prepare?
What can it safely handle after I approve it?*

## Scope, as leadership defined it — 2026-08-24

Taquilla Allen named the three functions this product exists to perform
([source](../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md) §9). Use them as a
scope defence — anything outside them is, by her own definition, lower value:

1. **Lead follow-up and prioritisation** — who to contact, why, in what order
2. **Pipeline and accountability management** — what is falling through, what is overdue
3. **Personalised business coach** — RCRE procedures plus individual performance → daily
   priorities, scripts, coaching, time blocking, next actions

Priorities now live in
[RCRE-PRODUCT-REQUIREMENTS.md](../04-requirements/RCRE-PRODUCT-REQUIREMENTS.md).

**One capability is confirmed impossible:** SMS read receipts. See
[ADR-0014](../06-decisions/adr/0014-no-sms-read-receipts.md) and §8.1 of the FUB verification.

**One action is time-sensitive:** four of the seven metrics leadership asked for can only be
accumulated forward from webhook registration. They cannot be backfilled. Registration is
read-only and still unauthorised — see §8.2 and open question 3.

## Status

| Component | State |
|---|---|
| Minimum data model | ✅ 13 tables, migration `0001` written |
| Reporting / routing schema | ✅ 8 tables + 2 columns, migration `0002` written. **Never run** |
| FUB connector | ✅ Client, signature verification, normalizer. **Not connected** |
| Webhook ingestion | ✅ Async pattern + idempotency. **Not registered** |
| Read-only activation prep | ✅ Checklist, event set, data model, cutover plan. **Awaiting Stage 1 approval** |
| RCRE Today | ✅ Working on fixtures |
| RCRE Command | ✅ Working on fixtures |
| MCP tools | ✅ 14 tools + authorization. **Server transport not wired** |
| Hermes profiles/skills | ✅ 2 profiles, 7 skills. **Templates only** |
| Recruiting page | ✅ Prototype at `/join` |
| Meta / YouTube flows | ✅ Designed. **Nothing connected** |
| Website backlog | ✅ Written |
| Postgres repository | ⚠️ Written, **never run against a database** |
| Authentication | ❌ Dev-only cookie. **Must be replaced before production** |

**124 tests passing.** Typecheck clean. Production build clean.

## Layout

```
apps/rcre/            Next.js 15 app
  src/lib/fub/        client · signature · normalize · webhook
  src/lib/insights/   the deterministic insight engine
  src/lib/db/         repository interface · memory · postgres
  src/app/            /today · /command · /join · /api/webhooks/fub · /api/leads
  supabase/migrations/0001_rcre_mvp_core.sql
  tests/              124 tests
mcp/rcre-mcp-server/  tool registry + authorization
hermes/               profile and skill templates
```

## Run it

```bash
cd apps/rcre && npm install && npm run dev     # http://localhost:3100
```

Defaults to `RCRE_DATA_MODE=fixtures`. A banner marks every page as synthetic.
Switch role for the broker view: `document.cookie = 'rcre_dev_role=broker; path=/'`

```bash
npm test        # 124 tests
npm run typecheck
npm run build
```

## Design rules this code enforces

**`first_touch_at` is non-negotiable.** The first *outbound* touch. Notes and stage changes
do not count — a note records thinking about someone, not contacting them, and these metrics
evaluate people. Derivation is order-independent and a replay can never move it later.

**No data = no tile.** `buildBrokerMetrics` returns `null` and names the gap in `unavailable`
rather than reporting zero. A broker reading "median response: 0 min" would conclude the team
is instant.

**Every insight explains itself.** Reasons are facts — *"viewed 3 properties, no contact in
9 days"* — not scores. Agents trust reasons and argue with scores.

**Deterministic, not model-decided.** No model chooses priority. This matters more under
ADR-0011: agents bring their own provider, so model quality varies. Insights must not.

**Fair housing in code.** Ranking uses engagement, recency, stage and stated intent only.
Never location, name, or any proxy.

**Scoping in the repository.** Every read takes a resolved `Actor`; the repository decides
what is visible. A UI bug cannot leak another agent's book.

**Summaries only.** Message bodies are never stored — this data feeds AI context.

## Not authorized

Live website changes · production FUB webhook registration · production FUB writes ·
production Meta or Google Ads · deployment · email · SMS · social publishing · real client PII.

`RCRE_ALLOW_FUB_WRITES` and `RCRE_ALLOW_OUTBOUND_SEND` default to `false`.

## Documents

- [FUB-CAPABILITY-VERIFICATION.md](FUB-CAPABILITY-VERIFICATION.md) — verified API facts and what we still need
- [META-AND-YOUTUBE-LEAD-ARCHITECTURE.md](META-AND-YOUTUBE-LEAD-ARCHITECTURE.md)
- [WEBSITE-OPTIMIZATION-BACKLOG.md](WEBSITE-OPTIMIZATION-BACKLOG.md)
- [../04-requirements/RCRE-TODAY-DATA-REQUIREMENTS.md](../04-requirements/RCRE-TODAY-DATA-REQUIREMENTS.md)

## Integration status — FUB reporting pipeline

Added 2026-08-24. All modules are pure and offline: the HTTP client is injected, `now` is a
parameter, and no file below can reach the network. Pilot-ready means *the logic is complete and
tested against fixtures* — every one of them still waits on the production key, the webhook
registration, and the policy sheets.

| Module | What it does | Tested | Pilot-ready |
|---|---|---|---|
| `src/lib/sync/backfill.ts` | Resumable, header-paced backfill planner + executor. Dependency order, per-resource cursor state in `sync_state`, `X-RateLimit-Remaining` / `Retry-After` pacing, per-person fan-out for `/v1/calls` | 27 tests | ✅ yes — pending an owner-level key |
| `src/lib/fub/stageHistory.ts` | `peopleStageUpdated` → `stage_transitions`, with the measured-vs-backfilled interval distinction | 12 tests | ✅ yes — pending webhook registration |
| `src/lib/fub/assignmentHistory.ts` | `peopleUpdated` diff → `assignment_history`, Alabama routing chain, cheap no-op discard, inferred reason | 18 tests | ✅ yes — reason is a labelled heuristic |
| `src/lib/reporting/metrics.ts` | The metrics of [RCRE-REPORTING-DATA-MODEL.md](../04-requirements/RCRE-REPORTING-DATA-MODEL.md): response time, contact attempts, conversions, time in stage, transition rate, fallout, unanswered, overdue, agent activity, source performance | 46 tests | ✅ yes — forward-only metrics return their clamped window |
| `src/lib/reporting/policy.ts` | Required-follow-up and stage-aging evaluators | 15 tests | ⚠️ ships **inert** — with no policy rows it returns no violations, by design |

**Four rules are enforced in code and asserted in tests**, because each has an obvious wrong
implementation that nobody would notice in a chart:

- Never-touched leads are **excluded** from response-time medians, never scored `0`.
- Response time is measured from `assignment_history.is_final_agent`, never from lead creation,
  and never against a backfilled assignment row.
- Time-in-stage counts `detected_via = 'webhook'` rows only, and reports how many it excluded.
- Rates are derived from totals after aggregation, never averaged from per-row rates.

**The `/v1/calls` cost is real and should be approved before the run.** The endpoint has no
date-range filter, so contact-attempt history requires per-person iteration — a floor of one
request per person, every run, with no incremental catch-up available. `planBackfill()` reports
that number up front rather than discovering it partway through.
