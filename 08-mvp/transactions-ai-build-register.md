# Transaction and AI implementation register — September 8, 2026

Canonical app: `apps/rcre-demo`; private durable adapter: `runtime/data/platform.sqlite`, shared platform store. All code, temporary outputs, test databases, downloaded test tooling, browser profiles and screenshots remain inside RCRE. Installed Hermes and original training sources were read only. No production or account integrations used.

| Requirement | Route / module | Roles / source / persistence | Actions and recoverable states | Evidence status / verification | External dependency |
|---|---|---|---|---|---|
| TX-01 intake and TC queue | `/transactions`, `/transactions/[id]` | Agent assigned; TC assigned; team leader team; managing broker office; owner organization. `transaction_records` | Buyer/seller intake, property/people/closing/status, nearest confirmed deadline sorting, query/status filters, archive, checklist, comments, stale-version rejection | Implemented and verified locally: scoped SQLite tests and browser inspection/outbox flow | No production contract policy assumed |
| TX-02 date engine | `services/deadlines.ts`, detail deadline register | Confirmed source terms, date-only convention, IANA timezone, explicit holiday list | Missing source/confirmation/date blocks; business/calendar days; source changes recalculate; manual override requires reason; transaction snapshots retain prior terms | Implemented and verified locally: DST/weekends/holidays/amendment/override tests | Actual signed contract terms and applicable calendar required for non-synthetic work |
| TX-03 private documents | `/api/transactions?id=…&document=…` | Authenticated transaction scope; `document_records` private SQLite blob versions | PDF header/type/size checks, sanitized name, plain text source preview, exact version download, no inline active content. Unscanned status visible | Implemented and verified locally: unauthorized read, unsafe type and PDF-header tests | Production quarantine scanner; safe PDF extraction/preview engine |
| TX-04 inspection exact-version review | Detail inspection panel | `transaction_drafts`, `transaction_outbox`; source document ID/hash, actor, version, payload hash | Numbered source selection; deterministic excerpt-based draft; editable versions; submit; expiry/separate reviewer policy; one-time approval to local outbox; changed draft needs fresh approval | Implemented and verified locally: actual browser item 2→draft→review→outbox→refresh; SQLite replay/stale version tests | Local outbox is NOT a sent message or compliance approval |
| TX-05 assignment and templates | Transaction list policy panel and detail assignment | `transaction_assignment_history`, office-scoped `transaction_policies` | Agent/TC routing, checklist and required documents affect new intake; approval expiry and separate reviewer enforced; version conflicts | Implemented and verified locally: shared FL agent/TC and unrelated-office denial; settings effect tests | Brokerage retention review; no automatic deletion |
| DOC-01 signing preparation | Detail signing panel; `services/document-services.ts` | Private PDF exact hash, named recipients, fields, order, preparation version | Save validated preparation; review exact payload. Explicit unavailable engine prevents request/execution/completion | Preparation implemented locally; actual signing blocked | Project-contained Documenso service/current Envelopes API, credentials, signing certificate, local mail, verified callback/evidence protocol. Current docs deprecate old Documents APIs. No endpoint guessed |
| DOC-02 processing adapter | `UnconfiguredStirling` | Server-only document adapter | Fail-closed extraction; text upload remains usable | Blocked by named engine dependency | Project-contained Stirling PDF installation and edition/API/license verification |
| AI-01 assistant/jobs | `/assistant`, `/api/assistant` | Owner and organization-scoped `ai_conversations`, `ai_jobs`, `ai_attachments` | New/history/refresh; actual queued/running/completed/failed/canceled states; stream parser; retry new job; cancel; cap; timeout/restart stale job failure; history delete; private text attachment | Deterministic mode explicitly simulated with real local scoped reads. Browser history refresh and tests pass | Actual model inference unavailable; no Ollama listener at loopback 11434 |
| AI-02 provider controls | Assistant Provider & privacy | Owner-scoped `ai_config` | Loopback-only endpoint, model, test, opt-in context sharing, daily caps, pause, connection truthfulness. No paid or silent fallback | Local controls verified; Ollama streaming/failure protocol doubles tested (not model execution) | Existing permitted local model. Hermes requires isolated RCRE runtime, server-only key and explicit endpoint/operator gate |
| AI-03 scoped MCP transport | POST `/api/mcp`, `services/mcp.ts` | Current authenticated local session; service scopes; `ai_tool_audit` | JSON-RPC initialize/ping/tools/list/tools/call; actual priorities/tasks/calendar/deadlines/approval reads; rejects unknown tools and identity arguments; GET 405 | Implemented and verified locally via HTTP browser request and tests | This is a local session-authenticated stateless transport; no production bearer identity deployment claimed |
| AI-04 prompt injection boundary | AI attachments + provider response | Server chooses scope/tools; attachment is untrusted data | Hidden role-change instructions cannot change authority; model text never invokes write tools; one owner cannot read another conversation/attachment | Implemented and verified locally; hidden attachment and unauthorized tool tests | Isolated Hermes tool/process sandbox must be independently verified before enabling |

## Executed evidence

- `RCRE_TEST_DB="$PWD/../../runtime/data/transactions-ai-test.sqlite" TMPDIR="$PWD/../../runtime/tmp" npm test -- tests/transactions-ai.test.ts`: **15 tests pass** (includes real SQLite operations, provider protocol doubles explicitly identified).
- `npm run typecheck`: pass after integration at this checkpoint.
- Browser script: `runtime/browser-evidence/transactions-ai-qa.cjs`, installed Chrome through project `runtime/browser-tools/node_modules/playwright-core`.
- Browser origin: `http://127.0.0.1:3200`. Viewports: 1440×1000, 375×900. No mobile horizontal overflow. Anonymous transaction API 403. MCP `rcre_tasks` invocation succeeds through authenticated HTTP.
- Personally inspected `transaction-mobile-light.png`, `transaction-before-review.png`, `assistant-desktop.png`; light layout legible, controls aligned, long content wraps. `transaction-desktop-dark.png` captures dark token rendering. Browser found and we fixed Origin validation mismatch against Next internal URL.
- Browser encountered public sitemap metadata loader parse error caused by apostrophe in project path; reported to integration/public owner. This is not a transaction/AI runtime error. Clean rerun pending public fix.
- No actual model, Hermes, signing service, PDF processor or sandbox account verified. Provider fixture results are not live integration evidence.

## Sources inspected, read-only

- Existing `hermes/README.md`, profiles and MCP authorization implementation.
- Installed `~/.hermes/hermes-agent/gateway/platforms/api_server.py` and `api_server_openai_routes.py` read only: actual Chat Completions/Responses routes and broad runtime tool behavior confirmed. Existing runtime not invoked because its storage/tools are outside project boundary.
- Official Hermes API server: https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server/
- Official Ollama chat/streaming: https://docs.ollama.com/api/chat and https://docs.ollama.com/capabilities/streaming
- Documenso API/current deprecation notice: https://docs.documenso.com/docs/developers/api

## Exact remaining limits

No claim of full transaction legal document preparation, automatic PDF extraction, cryptographic signing, production role/RLS parity, or actual model execution. Signature preparation exposes ordered multiple recipients with explicit page/position fields; actual engine execution remains blocked. Document malware scanning remains unavailable and files are labelled synthetic/unscanned. Standalone cloud worker deployment and isolated Hermes runtime lifecycle are not installed or exercised. Read-only MCP tools are working; model-driven tool selection is not claimed. The integration owner must preserve these distinctions in final acceptance reporting.

## FUB canonical convergence follow-on

New routes: `/integrations/fub`, `/api/fub`, `/api/webhooks/fub`. Code: `services/fub-local.ts`, `components/FubOperations.tsx`. Uses existing signature, normalization, date derivation and dependency-ordered backfill executor without invoking the network client. Owner-only fixture control operations use the same authenticated platform actor and private SQLite store.

| Requirement | Local behavior and persistence | Verified result | External activation |
|---|---|---|---|
| FUB-01 verified durable intake | Exact raw-body HMAC over base64 payload; fail-closed missing/invalid secret; capped streamed body; integer IDs; transaction persists `fub_deliveries` before 200; uniqueness within organization/event; duplicate accounting | 6 FUB tests pass under Vitest4.1.11; browser signed HTTP ack observed only after ledger row existed queued; duplicate status; invalid signature401 | Local test secret configured privately. No live webhook registered |
| FUB-02 worker and recovery | Durable leases, attempts, exponential next retry, pause/resume/manual drain, failed queue, retry, checkpoints; batch projection transaction rolls back failed resource batch | Tests exercise missing-fixture retry, pause, scope denial and canonical contact identity | Current authoritative source is an explicitly synthetic fixture. Production FUB fetch remains disabled |
| FUB-03 canonical projections and deletion | Existing normalizers produce canonical contacts/tasks/appointments, local deal projection, activity/touch timestamps; preserve FUB IDs and assignment mapping/history; never trust webhook body/URI as source data; deletions mark tombstones/history | Browser fixture becomes assigned agent CRM contact; soft deletion tests preserve history | Field ownership activation and actual account scopes required before real source data |
| FUB-04 backfill and reconciliation | Existing `runBackfill` with fixture paging, dependency order, persisted cursors; resume skips completed pages; explicit reconcile resets checkpoint work and uses current fixtures | Test imports people/tasks, persists complete cursor state, second resume makes zero requests | No empirical production coverage claim; source API limitations remain in original planner |
| FUB-05 operations UI | Source user mapping, synthetic JSON authoring, signed enqueue, drain/retry/pause, ledger/last success/checkpoints; never displays connected due to saved key | `/integrations/fub` at 1440×1000 and375×900; no overflow, no page errors; unprivileged agent403 | Exact dependency text shown in product |

Browser evidence: `runtime/browser-evidence/fub-qa.json`, `fub-desktop.png`, `fub-mobile.png`, `fub-qa.cjs`. Personally inspected desktop. Fixed fixture textarea accessible name during verification. Canonical contact: Protocol Review Synthetic, FUB fixture99208, assigned Alex Morgan. One signed update intentionally left queued as a visible recovery/worker demonstration. Real FUB request count: zero by implementation (no network fetch in this adapter) and test spy.

Package tooling: Playwright-core installed solely under `runtime/browser-tools`, with npm cache and temp inside RCRE. All worker browser profiles and captured outputs inside RCRE. Browser processes closed after each test. No known outside write caused by this worker; integration owner separately tracks host OS diagnostic side effects from other browser runs.

AI context permissions now narrow CRM, transaction, calendar and training retrieval plus MCP tool availability; added actual denial test. Model output remains text-only and cannot execute privileged writes.


## Completion challenge fixes — September 8 follow-on

- FUB tombstones now block stale webhook and backfill resurrection. Source deletion cascades to related tasks, appointments and transaction archives; active lists and reminder inputs exclude deleted parents. Retained history is available through explicitly scoped `contacts/:id?includeDeleted=1` and historical reports preserve deleted contact event/cohort records.
- FUB-owned contact edits now create immutable proposed-change records with source version/scope/submitter. Replica fields, assignment history and version remain unchanged. Contact UI displays the actual staging response, pending patch fields and discard action; external execution is denied. GET/POST `/api/platform/fub-proposals` enforce scoped list/discard only.
- Source deals now project to stable `fub-local-deal-{id}` operational transactions. Source metadata appears in a banner. Representation/property/contract terms remain explicitly unconfirmed; projected source closing is not a confirmed deadline.
- Regression checks: nine FUB tests and three proposed-change API tests pass; source typecheck without incremental output passed. No production build or browser performed during this focused integration window.

### Final FUB directory and reporting corrections
- FUB mappings/projection now resolve the active durable directory, respect office changes and reject disabled/unmapped explicit owners. Deal transaction assignment uses the source deal owner. Mapping UI consumes active agents from the authenticated summary.
- Imported appointments preserve source creation dates and known outcomes; unknown values remain unknown. Historical reports include scoped archived appointment evidence, while active calendar/reminders exclude it.
- Focused FUB suite: 12/12 passed using `runtime/data/fub-final-regression.sqlite`; TypeScript check passed. No browser/build run in this verification window.

### Public website chat agent
- Added `PublicChatAgent` widget and isolated `/api/public/chat` anonymous session boundary. History is visitor-scoped, HttpOnly, durable, clearable, and expires on access after 30 days. Clear cancels an in-flight request and cannot resurrect removed messages.
- Knowledge uses published public guides, communities, approved agent profiles, and lender details only. Archived pages, drafts and private routes are excluded. Every answer carries published-page source links.
- With no configured model, UI explicitly identifies a non-AI site guide. Setting `RCRE_PUBLIC_CHAT_MODEL` to an existing local Ollama model enables actual loopback protocol inference with timeout and advertised-model check. No model downloads, paid provider, silent fallback, private CRM/course context or agent tools.
- Input length, visitor/site rate limits, retry ownership, keyboard focus/escape and private-cookie boundary covered in implementation. Provider failures report no answer and no fallback. Widget mounting and rendered acceptance remain with main integrator.
