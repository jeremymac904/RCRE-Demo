# RCRE integration and transaction boundaries

Audit date: 2026-09-17. This is a source-and-dated-evidence handoff, not a new activation or production acceptance. Repository-relative paths resolve under `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE`. Canonical app: `apps/rcre-demo`; local URL normally `http://localhost:3200`. Baseline commit is `d4ae90d8f40edcff3a2e5996ab0267e6c56c8966`; extensive working-tree changes are not represented by that baseline. Reconcile the parent handoff manifest/delivered commit before reuse. No credentials were read and no live calls, source changes, tests or builds were made for this document.

## Status matrix

Use these exact capability labels: **PROVEN LOCAL**, **PROVEN AUTHORIZED SANDBOX**, **SIMULATED**, **BLOCKED EXTERNAL DEPENDENCY**, **PLANNED**, **NOT IMPLEMENTED**. The second label is deliberately not used for real production API reads. A local adapter may be PROVEN LOCAL and have separately described limited authorized live evidence without its entire external workflow being proven.

| Boundary | Status | What this does and does not establish |
|---|---|---|
| FUB GET-only client, discovery, mapping, checkpoints, quarantine, signed queue and drain | PROVEN LOCAL | Durable local/mock tests. September 14 real production reads were limited to a Lender key. |
| Full FUB brokerage contact/deal/activity backfill | BLOCKED EXTERNAL DEPENDENCY | Supplied Lender visibility did not provide brokerage records; nonempty live pagination is unverified. |
| Fixture FUB webhook/import workflow | SIMULATED | Separate local-test adapter and fixture key; not production FUB evidence. |
| FUB external writes or webhook registration | NOT IMPLEMENTED | Writes hard-rejected; no registration endpoint. Local proposed changes do not mutate FUB. |
| Google OAuth, encrypted token lifecycle, proposal gates | PROVEN LOCAL | Mocked transport tests; not an activated account. |
| Live Gmail/Calendar/Drive use | BLOCKED EXTERNAL DEPENDENCY | Credentials, consent and authorized activation pending in dated evidence. |
| Canonical MCP read transport | PROVEN LOCAL | Five authenticated scoped tools; no arbitrary SQL/writes. |
| Legacy MCP registry write execution | NOT IMPLEMENTED | Declarative metadata is not executable transport. |
| Hermes owned lifecycle safeguards | PROVEN LOCAL | Synthetic lifecycle test evidence; actual isolated inference remains blocked. |
| Actual Hermes/local-model inference | BLOCKED EXTERNAL DEPENDENCY | Isolation probe failed and no permitted model success is established. |
| Free-only OpenRouter adapter | PROVEN LOCAL | Limited real production HTTPS success September 14; not seven-workflow reliability. |
| Transaction records, deadlines, document versions, approvals, local outbox | PROVEN LOCAL | Scoped durable workflow; no external communication or legal approval implied. |
| Native PDF inspection and unsigned signing preparation | PROVEN LOCAL | Actual PDF parsing/page bounds and reviewed payload tests. |
| Stirling HTTP extraction/OCR adapter | NOT IMPLEMENTED | Interface and unavailable stub exist; an engine alone will not complete integration. |
| Documenso signing API/callback adapter | NOT IMPLEMENTED | Interface and unavailable stub exist; actual signing also needs deployment/credentials. |
| External PDF/signing services and signer completion | BLOCKED EXTERNAL DEPENDENCY | No configured permitted service or verified callback/signature evidence. |
| General outbound email/SMS delivery | NOT IMPLEMENTED | Local outboxes/drafts are not deliveries; Google execution is separately gated. |
| Meta/YouTube lead architecture | PLANNED | Design document only; no ad account connection or public publishing evidence. |
| Instagram/Facebook/YouTube/GBP publishing and ad launches | NOT IMPLEMENTED | No verified executable production publishing adapter in this handoff. |
| External IDX/MLS listing feed | BLOCKED EXTERNAL DEPENDENCY | No licensed activated feed established; local editorial content is not live inventory. |
| Local website events and lead analytics | PROVEN LOCAL | Application-recorded events/leads, not external analytics ingestion or attribution certainty. |
| Search Console, GA/third-party analytics ingestion | NOT IMPLEMENTED | No verified authenticated external connector established. |
| Hosted multi-tenant production storage/auth deployment | BLOCKED EXTERNAL DEPENDENCY | Local PostgreSQL proven; hosted Supabase and production identity/hosting not activated. |

## Follow Up Boss: read-only system-of-record boundary

Source: `apps/rcre-demo/src/lib/fub/client.ts`, `durable-sync.ts`, `user-mapping.ts`, `intelligence.ts`, `signature.ts`, `normalize.ts`; API `src/app/api/fub-read/route.ts` and `src/app/api/webhooks/fub-read/[account]/route.ts`; administration `/admin/fub-sync`, `/admin/fub-users`, `/admin/fub-validation`. These `src/` paths share the canonical app prefix.

The client rejects every non-GET method regardless of legacy allow-write flags, pins `api.followupboss.com/v1`, refuses redirects, bounds timeouts and keeps Basic authentication server-side. `RCRE_FUB_READ_ENABLED` is explicit authorization configuration; incompatible `RCRE_FUB_MODE` values fail closed. Configuration is not a license to perform unrelated calls. This handoff performed none.

Read discovery verifies identity/account role, then users and stages. Broker with `isOwner: true` is Owner; Broker without it is Admin; Agent/Lender remain their own roles; insufficient evidence stays Unknown. Confirmed mappings resolve FUB user IDs to canonical person/actor/office. Name matches alone do not confirm. Unknown owners are quarantined, never automatically converted into people. Complete user refresh and inactive flags must not be confused with partial page omission.

Credential fingerprint/generation binding prevents reusing prior-account mappings or active source data after a key change. No key value is exposed in status. Rebinding quarantines old-generation data and requires renewed mapping review. Legacy fixture mappings in the shared collection are kept distinct by source classification.

Pages have durable checkpoints, bounded batches, leases and a shared rate-limit/retry gate. Users precede contacts. Text messages and emails require `personId` and enumerate only imported authorized contacts with per-person pagination/checkpoints; no contacts produces an explicit blocker rather than a completed zero-coverage claim. Calls/text/email/events retain metadata, not bodies or subjects. Deleted or quarantined parents cannot supply active child records. Appointments and tasks preserve missing outcome/completion as unknown rather than fabricate planned/overdue states.

FUB contacts remain authoritative replica records. Local requested changes are separate proposals; changing a local proposal does not silently overwrite the CRM replica or dispatch an external update. `services/fub-local.ts` and `/api/webhooks/fub` are the separate fixture/local-test path, not the production read path.

Production webhook handling validates the raw body signature, commits a durable receipt/queue before acknowledgement, ignores supplied remote URIs and refetches from pinned endpoints. Explicit deletion events can tombstone records; an ambiguous 404 is not deletion proof. Drain/retry processing is bounded and available through the local worker/admin contract. No FUB webhook is registered by this application. A prepared event list is readiness metadata, not a provider subscription.

`fub_read_audit` stores append-only metadata for credential binding, pages/failures and queue outcomes. Observed stage/assignment histories record baseline/change, `observedAt`, `previousObservedAt`, and `exactTimeKnown: false`. Repeated identical imports do not invent changes. Initial snapshots never substitute updated time for stage entry time. API-observed calls can omit provider data, and FUB appointment availability is not a complete Google-synced calendar. Coverage, zero, unknown and unavailable are separate states.

**Dated live result:** `08-mvp/LIVE-LOCAL-ACTIVATION-2026-09-14.md` records real FUB account discovery with a Lender user, 20 users, 19 stages and 12 confirmed canonical mappings. People/tasks/deals/calls/events returned zero visible rows; one appointment was quarantined. No active customer, task, deal, appointment or activity was imported. This does not prove the brokerage has zero records. The empty people read was repeated, but nonempty live pagination/idempotency is unproven. Text/email global requests failed and the importer was corrected to per-person reads. Today/Command/Reporting remained explicitly fixture mode. A suitable authorized key and verified mapping/coverage are needed before live intelligence acceptance. No FUB writes occurred.

Official contracts were reviewed during implementation, including FUB identity/users roles, text message person filters, call limitations and appointment limitations. Preserve dated supporting references in `08-mvp/FUB-READ-BOUNDARY-REGISTER.md`, `08-mvp/FUB-INTELLIGENCE-VALIDATION.md` and the activation report rather than assuming API completeness.

Tests: `apps/rcre-demo/tests/fub-discovery.test.ts`, `fub-durable-read.test.ts`, `fub-user-mapping.test.ts`, `fub-intelligence.test.ts`, `fub-intelligence-api.test.ts`, `fub-proposals-api.test.ts`, `fub-local.test.ts`, `integration/fub-client.test.ts`.

## Google Workspace and external communications

Source: `apps/rcre-demo/src/lib/integrations/google/service.ts`, `security.ts`, `src/app/api/integrations/google/[[...path]]/route.ts`, and `src/app/settings/integrations/google/`. Design/proof: `08-mvp/GOOGLE-WORKSPACE-IMPLEMENTATION.md`, `apps/rcre-demo/tests/google-integration.test.ts`.

The currently specified shared Google account is `it@rcregroup.com`. Broker-owner mailbox/resource authority is distinct from an office-designated managing broker's ability to review eligible document proposals. Reviewing a proposal grants no general mailbox access.

OAuth uses PKCE S256, short-lived single-use state, HttpOnly browser binding and actor/organization/generation binding. Disconnect invalidates pending work. Complete token packets and temporary verifiers are AES-256-GCM encrypted with fresh nonces and organization/owner authenticated data; tokens are not sent to the browser. Fixed endpoints and bounded timeouts apply. Refresh failure requires reconnection; disconnected in-flight results are withheld.

Supported local contracts are limited Gmail search/selected plaintext thread reads, scoped contact/transaction linking, next-50 primary-calendar event reads and selected/app-authorized Drive metadata. A selected-thread unanswered signal is not whole-mailbox SLA proof. Calendar proposals have source ETag checks and no attendees (`sendUpdates: none`). Drive uses `drive.file`; it is not arbitrary account-wide download/share access.

Every supported external write, including creating a Gmail draft or private Drive text file, is a local exact-payload/version/hash proposal first. Current reviewer policy, expiry and connection generation are rechecked before explicit execution. Claim-before-dispatch and uncertain-result states prevent casual replay; uncertainty is not converted into success or retried blindly. Local proposals can be cancelled. A saved draft in RCRE is not a Gmail draft, and a local outbox completion is not delivered email/SMS.

Server configuration names are `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `RCRE_INTEGRATION_ENCRYPTION_KEY`. Values must never be copied into handoff docs. Requested scopes are identity/email plus `gmail.readonly`, `gmail.compose`, `calendar.events.owned`, `drive.file`; excess grants are rejected. Durable kinds include `google_connections`, `google_oauth_states`, `google_proposals`, `google_mail_links`, `google_drive_authorized`; Google audit events are separate.

Twenty-one mocked Google integration tests were recorded; credentials/consent were pending and no live Gmail, Calendar or Drive changes occurred. Reuse needs a separately authorized Google client, encryption key, intended account/tenant policy, production redirect/HTTPS, durable database and live verification. Do not share RCRE mailbox authority with another brand by copying these settings.

## Transactions: durable records and contract-derived deadlines

Source: `apps/rcre-demo/src/lib/services/transactions.ts`, `deadlines.ts`, `document-services.ts`; UI `src/components/Transactions.tsx`; APIs `src/app/api/transactions/route.ts`, `src/app/api/document-inspection/route.ts`. All `src/` paths in this section use the canonical app prefix.

`TransactionRecord` carries identity/organization, owner/office/team/TC assignment, address/client, representation/lender/title, closing date/status/version, deadlines/checklist/comments, update time and optional contact/FUB/source references. Server scope allows the owner, broker owner, office managing broker, team leader or assigned TC as defined by the service. Marketing/admin and trainer roles do not acquire transaction access merely because they administer other modules.

Optimistic version checks prevent stale edits. `transaction_history` preserves snapshots; `transaction_assignment_history` preserves assignment changes. Policy records are organization/office scoped and include checklist/document requirements, review hours, separate-reviewer policy and retention notes. A retention note is not evidence of automated legally sufficient retention/deletion.

FUB deal projections distinguish fixture and `fub-read` namespaces/credential generations, retain stable references and suppress deleted/quarantined sources. Imported deal dates are not presumed executed contract dates. Unknown representation, contract terms and deadlines remain explicit. Current actor/office routing must not rewrite historical lead/assignment evidence.

The deadline engine requires a confirmed source term, effective date, day count (0–730), calendar/business-day selection, timezone and explicit holiday list. Date-only arithmetic avoids DST shifts; the effective date is excluded and the resulting day is included. Manual overrides require a valid date and reason. There is no automatically authoritative state-law holiday/calendar feed, contract interpretation or legal opinion. Timezone validation does not turn date-only deadlines into verified hour-of-day legal deadlines. A human must supply and confirm the operative contract terms.

## Private documents, inspection excerpts and approvals

Uploads accept bounded PDF/plaintext (5 MB) with PDF header checks and sanitized names. Exact bytes are privately stored with SHA-256; replacement creates a new document/version instead of overwriting evidence. Access is transaction/organization scoped. The document status `synthetic_unscanned` explicitly does not represent malware scanning. Do not advertise an encrypted, malware-cleared commercial document vault from this implementation; storage authorization and content safety are different controls.

Plaintext excerpts can become numbered inspection observations. This is not PDF OCR or engineering diagnosis. `InspectionDraft` binds the source document ID/hash, exact draft version, selected items/passages and body. Editing resets draft state. Submission enters review with policy expiry. Approval checks current designated document owners, applicable separate-reviewer policy, state, expiry and exact version/hash. It is a human workflow approval, not legal or compliance certification.

The approved exact body is consumed into `transaction_outbox` for TC local review; `completed_locally` is local completion only. No repair request, amendment, email or SMS is thereby sent. Version changes invalidate prior approval. Future outbound adapters must recheck the exact approved bytes and recipient authority and preserve idempotent dispatch/uncertain results; never treat a toast or provider-name setting as execution evidence.

## Native PDF preparation versus Stirling and Documenso

Native PDF preparation is implemented with actual `pdf-lib` parsing. `inspectPDF` validates a parseable unencrypted PDF, page count (1–2,000), dimensions, crop geometry and supported rotation. Signing preparation binds document ID/hash/version, inspected pages, recipients, signing order, recipient/page coordinates and a payload hash. It enforces 1–20 recipients, 1–100 fields, unique recipient emails, valid order, at least one field per recipient, real page existence and whole-field bounds. Review reinspects the PDF and revalidates the exact payload; stale/replayed preparation cannot silently pass.

The preview is an unsigned, normalized single-page PDF with placement boxes marked UNSIGNED. It handles crop/rotation and removes annotations/actions from the generated preview while preserving the original. This is not a cryptographic signature, trusted completion certificate or comprehensive PDF sanitizer.

`SigningAdapter` defines `status`, `createRequest`, `verifyCompletion`. The present `UnconfiguredDocumenso` returns unavailable, throws on request creation and returns false for completion. `DocumentProcessingAdapter.extractText` currently has `UnconfiguredStirling`, which throws unavailable. Therefore the HTTP integrations are **NOT IMPLEMENTED**, not simply configured-but-off. Permitted engines/deployment/API edition/licensing/credentials are **BLOCKED EXTERNAL DEPENDENCY** items as well; supplying them still requires implementing, securing and testing the adapters, callback verification and actual completion evidence. Do not claim Documenso signing, Stirling extraction/OCR or remote retention is working.

Focused tests: `apps/rcre-demo/tests/transactions-ai.test.ts` (scope, persistence, source hash/version, approval replay, deadlines, settings and provider doubles) and `tests/unit/pdf-preparation.test.ts` (actual PDF geometry, rotation, page bounds, cross-organization denial, hash changes and unsigned output). Earlier browser evidence in `08-mvp/transactions-ai-build-register.md` includes desktop/mobile rendering and anonymous denial. Its SQLite-era runtime note is superseded by current PostgreSQL evidence.

## Other ecosystem adapters and local worker

`08-mvp/META-AND-YOUTUBE-LEAD-ARCHITECTURE.md` is a design: native FUB Facebook lead capture plus possible attribution enrichment. It proves no connected ad account or delivery. YouTube/Facebook/Instagram/Google Business Profile publishing, ad launches, external Search Console and external analytics ingestion have no verified operational adapter in this handoff. A local content library, calendar, link or draft is not a publishing integration. IDX/MLS requires licensed authorized source access; editorial photos and local examples cannot be described as live listings.

Local website analytics/events and persisted lead intake are implemented separately from external analytics. They establish application events, not cross-device identity or reliable marketing attribution. See the agent website handoff for those exact routes/contracts.

`scripts/local-worker.mjs` and `apps/rcre-demo/src/app/api/local-worker/route.ts` supply authenticated local scheduling/reminder work and gated FUB drain. They do not authorize outbound communications or prove hosted durable scheduling. `scripts/integration-env.mjs` validates an optional project-contained private environment file; do not export that file. Current local PostgreSQL persistence is separate from hosted Supabase activation. Hosted production identity, durable worker ownership, HTTPS, monitoring and tenant-specific secrets remain explicit deployment work.

Hermes/MCP/OpenRouter details and their limited proof are in `RCRE_AI_ASSISTANT_HANDOFF.md`. In particular, broad legacy MCP tool metadata is not a write gateway, and local protocol doubles are not actual Hermes inference.

## Transfer rules and verification limits

Reusable contracts: actor-scoped service boundaries; durable receipt-before-ack; credential-generation binding; confirmed canonical user mapping; source quarantine; unknown versus zero coverage; immutable source versions; exact-payload approvals; cancellation and uncertain dispatch states; deterministic contract-derived deadlines. These patterns can transfer without granting another tenant RCRE identity, records or credentials.

High-effort extraction areas are authentication/tenant provisioning, people/office policy, production database enforcement, external identity bindings, document storage/scanning/retention, mailbox authority, signature callbacks and hosted worker lifecycle. Preserve source IDs and historical assignments. Every new company needs explicit organization ownership and independent connector secrets/consent; never copy RCRE customer data or rely on a browser-selected tenant label.

The most recent dated report, `08-mvp/LIVE-LOCAL-ACTIVATION-2026-09-14.md`, records 728 tests/52 files, typecheck/build success, 34 PostgreSQL checks and 19 browser checks. The parent independently reran the unit suite on September 17, again 728 tests across 52 files, with evidence at `runtime/handoff/current-unit-tests.txt`; this specialist documentation pass ran no tests. The cited build, database and browser checks remain dated September 14 evidence unless the aggregate handoff supplies newer results. `08-mvp/INTEGRATIONS-REVIEW-2026-09-14.md` is an earlier same-day pre-activation snapshot: its missing-key statements are superseded only where the later activation report supplies evidence. Private evidence under `runtime/activation/`, `runtime/logs/activation-*.txt` and `runtime/browser-evidence/live-activation/` should remain private local references, not be copied as ecosystem sample data.

No production deployment, FUB write, webhook registration, public publication, paid-model fallback, real outbound message or signing completion is authorized or claimed by this handoff.
