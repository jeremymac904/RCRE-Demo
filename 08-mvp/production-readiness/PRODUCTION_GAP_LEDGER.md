# RCRE Production Readiness Gap Ledger

**Audit baseline:** GitHub `main`, merge commit `3138c12b3408fe6f09b30e54152f16523411ff1d`  
**Working branch:** `work/rcre-production-readiness`  
**Date:** 2026-09-30  
**Scope:** Production readiness only. MLS provider activation remains parked; the merged MLS foundation is included only where hosted persistence/operations require it.

This ledger records implementation evidence, not prior completion claims. Findings are deduplicated across the requested audit tracks. P0/P1 counts are issue clusters, not affected routes or individual test cases. No production service was contacted or changed during this audit. The initial audit was read-only. Repair work is now in progress on this branch.

## Initial counts

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 3 | Immediate safety, data-loss, or financial exposure; must be repaired before any production use. |
| P1 | 21 | Required for the requested brokerage operating platform and before a production go decision. |
| P2 | 6 | Important production quality, trust, accessibility, operations, or verification work. |
| P3 | 0 | No separately tracked post-launch-only item at this audit stage; unrequested enhancements are excluded. |

**Current disposition: PRODUCTION NO GO.** The 562-test baseline and successful local build do not establish production authentication, persistence, service integrations, or hosted authorization. See the repair snapshot below for current dispositions.

## Deduplicated P0 findings

| ID | Finding and evidence | Status | Required repair / verification |
|---|---|---|---|
| P0-01 | **Anyone can mint a signed production persona session.** `netlify.toml` enables `RCRE_DEMO_ENABLED=1`; `/login` renders the persona chooser; `src/app/api/session/route.ts` accepts a posted `userId` and calls `createSession`; `auth.ts` resolves fixed personas including `broker_owner`. There is no authenticated Google identity proof on this path. | Unsafe / Production blocker | Remove demo auth from production config and fail closed. Production session creation must consume a verified identity-provider subject plus an active invitation/membership. Tests must show anonymous persona POST is denied and cannot create any role. |
| P0-02 | **Production business state is ephemeral.** `src/lib/platform/store.ts` routes deploy storage to `/tmp/rcre-runtime` SQLite; platform services and routes use it for CRM, members, invitations, website configuration, inquiries, and other workflows. Serverless restart/instance changes can lose or split state. | Demo only / Production blocker | Route production persistence to hosted PostgreSQL and durable object storage, then test restart, concurrency, tenant isolation, backup, and restore. Until configured, production must fail closed rather than silently use `/tmp`. |
| P0-03 | **A paid OpenRouter model can be selected and sent.** `src/lib/services/cloud-ai/providers.ts` exposes multiple paid-capable providers/models; Settings suggests paid models; `cloud-transport.ts` can issue `/chat/completions` as validation fallback when model discovery fails. There is no transport-level exact model allowlist. | Unsafe / Production blocker | Enforce web AI exact allowlist `openrouter` + `openrouter/free` before save, validation, and every outbound request; reject auto, paid, online/search variants and other providers in the web path. Negative tests must assert no outbound request occurs. Desktop subscription auth must remain a separate official flow. |

## Deduplicated P1 findings

| ID | Finding and evidence | Status | Required repair / verification |
|---|---|---|---|
| P1-01 | **Google sign-in and real invitation delivery are missing.** `/login` is local-persona-only; `/api/session` has no OAuth callback. `platform/access.ts` accepts `.test` invite addresses and writes only `local_mail`. | Missing / Demo only | Add Google OIDC login separate from optional Gmail/Calendar/Drive scopes; invitation-bound identity, resend/expiry/revocation, durable records, and delivery outbox. Verify against approved OAuth client and test identities. |
| P1-02 | **Session revocation is not enforced for signed cookies.** `auth.ts:155-173` returns an actor after signature/expiry validation without consulting the session’s revoked state; logout/revoke updates only SQLite. Cookie configuration omits `Secure`. | Unsafe / Broken | Use a durable revocable session identifier/version and Secure production cookies; test copied-cookie revocation, expiry, replay, logout, and session rotation. |
| P1-03 | **PostgreSQL repository is disconnected and its identity bootstrap is broken.** `getRepository()` has no runtime caller. If activated, `PgRepository` bootstrap reads call `q(null)`, while `withRlsSession()` rejects a null actor. Actual APIs still use SQLite. | Disconnected / Broken | Integrate the repository into production service boundaries and design a narrowly scoped bootstrap role/query that cannot bypass tenant isolation. Add real PostgreSQL integration tests. |
| P1-04 | **Migrations/RLS have no live PostgreSQL execution evidence.** Migrations 0001–0004 exist, but RLS checks are source/static tests; migration 0003 says it was not executed. | Partial / Untested | Validate migration order and repeatability on a production-like PostgreSQL instance, run least-privilege and cross-tenant queries, apply only with the authorized hosted project, then record applied migration state. |
| P1-05 | **No hosted backup/restore or durable upload storage.** Local backup scripts cover SQLite/files only. Libraries, Academy, Community, and transaction uploads use local paths or inline base64 under the deployment `/tmp` store. | Missing / Production blocker | Configure PostgreSQL PITR/retention and private object storage, then perform and document an actual restore drill and denied-access checks. |
| P1-06 | **Taquilla cannot manage members under her managing-broker role.** `can()` does not grant `settings.people` to `managing_broker`; settings UI limits People management to `broker_owner`. | Broken | Grant Taquilla the explicitly scoped agent-management capabilities she needs, with audit records and negative tests for agents, TC, and unrelated offices. Preserve Julio’s owner role and Margie’s TC boundary. |
| P1-07 | **Agent lifecycle and onboarding are incomplete.** Current People UI only changes role/office/team/disabled state. Onboarding records a completion timestamp; it does not persist the full canonical profile, licensing, markets, specialties, headshot, social links, website setup, or training access. | Partial / Demo only | Build durable invite → Google sign-in → profile/license/market/template flow and broker management for active state, public visibility, roles, licenses, and website/training status. Optional steps must not block basic work. |
| P1-08 | **Lead capture is not production-safe or reliable.** General public inquiries and profile forms store to SQLite; agent website `captureLead()` fabricates an accepted reference and forms announce success without an API save. No outbox guarantees email failure cannot lose leads. | Demo only / Unsafe | Replace every form helper with validated, spam-protected, idempotent server intake that commits CRM data durably before success, preserves attribution, routes only to a verified owner, and queues notification separately. Never display success before commit. |
| P1-09 | **CRM production querying and duplicate control are missing.** Contacts are read as a full in-process set; server-side search/filter/sort/pagination/counts are not wired. Contact creation uses random IDs on every call, and request retries can duplicate leads. | Partial / Demo only | Add scoped SQL query APIs, indexes, cursor/offset paging, idempotency keys, duplicate policy, concurrency tests, and counts from the same authorized query. |
| P1-10 | **Agent website configuration and publishing are disconnected from canonical people.** Config reads default to unpublished, no writer was found, dynamic pages do not enforce publish/active status, and personal-site profiles read different data than canonical roster records. | Disconnected / Unsafe | Use canonical verified people and scoped persisted config; enforce active/public/published state server-side; add preview, publish, unpublish, and attribution tests. |
| P1-11 | **The actual RCRE AI path and knowledge grounding are disconnected/missing.** Settings validation is not persisted; the assistant runtime does not receive server-held cloud credentials; no versioned, scoped RCRE knowledge library/retrieval was found. | Disconnected / Missing | Implement one server-only inference boundary with free-only model enforcement, sanitized context, deterministic fallback, source-cited scoped KB retrieval, prompt-injection protections, and evidence-based output tests. |
| P1-12 | **Google Workspace integrations are not implemented.** No OAuth callback, refresh-token persistence, Gmail/Calendar/Drive adapters, or connection lifecycle exists. | Missing | Build separate per-user OAuth with minimal scopes, secure refresh-token persistence, reconnect/disconnect, draft-only Gmail verification, read calendar/Drive tests, and no external sends/sharing without authorization. |
| P1-13 | **Desktop client and official subscription provider authentication are absent.** No desktop runtime/provider settings or documented supported account authentication path exists in this repository. | Missing | Build a supported desktop client/auth boundary only after validating provider terms and official auth method; use OS secure storage and keep it distinct from web API keys. Never read another app’s private token files. |
| P1-14 | **Transactions are fixture/local-store workflows; signing and document processing are unavailable.** Transaction services seed synthetic records and store document content in the platform store; no production private object storage or verified signing callbacks exist. | Partial / Demo only | Persist transactions and metadata in PostgreSQL, move files to private durable storage with validation/scanning, and implement verified signing/processing adapters or label those steps unavailable without fake completion. |
| P1-15 | **Training is not a production LMS lifecycle.** Imported lessons exist, but the public Training page describes missing enrollment/quizzes/certificates/discussion, and categories/course authoring/assignments are constrained; required state resources and some videos have not been supplied. | Partial / Missing content | Make courses/lessons/resources/categories/assignments/progress durable and permissioned. Load only approved AL/FL compliance content and supplied video/resources. |
| P1-16 | **Community persistence and YouTube-to-Community automation are missing for production.** Forum interactions use generic local storage; YouTube automation is not in app code. | Demo only / Missing | Durable posts/comments/reactions and moderation; implement idempotent approved-video discovery into an internal draft/post workflow, never external social posting. |
| P1-17 | **Marketing workflows are local outbox demonstrations rather than production delivery.** Draft/version/approval surfaces exist, but scheduled local work is not a provider execution receipt or production delivery. | Partial / Disconnected | Preserve local approvals, move state/assets to hosted persistence, implement provider-specific execution only behind approved credentials and explicit review, with truthful queued/failed/sent status. |
| P1-18 | **Swag, business cards, and Gmail signature generation are absent.** No catalog, agent-populated state-specific card preview/download, or signature generator route was found. | Missing | Implement from canonical verified profile and license records; do not invent prices or compliance copy. Gmail installation may remain manual; require verified state/brokerage wording. |
| P1-19 | **Recruiting pipeline is local and does not convert to production invitations.** Recruiting fixtures and updates use the generic store; prospect lifecycle is not connected to durable membership/invite flow. | Demo only | Persist prospect/source/consent/notes/tasks and audited stage changes; connect a qualified prospect to the invitation workflow without creating duplicate people. |
| P1-20 | **Production notifications and operational audit/observability are incomplete.** No durable notification worker/outbox, structured redacted logs, provider health, or production alert/error pipeline is verified. | Missing / Untested | Add durable in-app/email notification jobs, retries/idempotency, health/readiness checks, non-PII structured logs, OAuth/lead/AI/job failure events, and observable administrative status. |
| P1-21 | **Production deployment prerequisites and safety modes are not verified.** Runtime secret values/scopes, hosted DB, OAuth settings, durable storage, and production fixture exclusion are not evidenced by repository tests. | Untested / Production blocker | Define fail-closed production mode, verify secure environment separation and that fixtures/personas cannot load in production. Do not deploy or migrate without the explicitly required host/database evidence. |

## P2 findings

| ID | Finding and evidence | Status | Required repair / verification |
|---|---|---|---|
| P2-01 | Rendered browser, keyboard, assistive-technology, and production-width QA have not been independently run for this branch; base mobile controls include 36px target sizing. | Untested / Partial | Independent real-browser, keyboard, contrast, reduced-motion, zoom/reflow, and axe review at 390/768/1024/1440 plus fixes. |
| P2-02 | Public agent-template routes can expose invented personas, specialties/licenses, performance counts, and pretend listing cards from fixture data. | Unsafe | Keep template previews private/noindex or replace with verified active canonical identities and suppress unsupported data. |
| P2-03 | Some agent-site resource links use `href="#"`, producing dead controls. | Broken | Link to real resources or remove those actions; add route/action coverage. |
| P2-04 | Property-search rate limiting uses in-process memory and trusts forwarded headers, so limits are not reliable across serverless instances. | Partial / Unsafe | Use a shared rate-limit mechanism and trusted proxy configuration; test bypass and bursts. |
| P2-05 | Production health endpoint reports local synthetic SQLite state; no CI/error-tracking/backup status contract is verified. | Demo only / Untested | Make readiness report actual database/storage/dependency state and wire supported CI/deployment checks. |
| P2-06 | `assertLiveConfig()` requires FUB credentials when live mode is selected even though the CRM must operate independently of FUB; the helper is currently unused. | Partial | Validate optional integrations independently from core startup and add configuration tests. |

## Fourteen-track coverage and status

| Track | Initial status | Key evidence / ledger references |
|---|---|---|
| 1. Authentication and security | **Unsafe / Production blocker** | P0-01, P1-01, P1-02; public persona POST, demo role identities, ineffective signed-cookie revocation. |
| 2. Database, persistence, storage, backups | **Demo only / Production blocker** | P0-02, P1-03–05; SQLite `/tmp`, disconnected PostgreSQL adapter, no live migration/backup test. |
| 3. Agent onboarding and administration | **Partial / Demo only** | P1-01, P1-06–07; Taquilla access denied, captured-only invitations, timestamp-only onboarding. |
| 4. CRM and lead management | **Partial / Demo only** | P1-08–09; local service tests pass, production paging/deduplication/persistence absent. |
| 5. Public website and forms | **Partial / Production blocker** | P1-08, P1-21; server validation exists, but storage/notification/spam/idempotency do not. |
| 6. Agent websites | **Partial / Disconnected** | P1-08, P1-10; template rendering exists; lead helper is no-op and publish state/canonical source are disconnected. |
| 7. RCRE AI and knowledge | **Unsafe / Disconnected** | P0-03, P1-11; paid model path possible, settings/runtime disconnected, no brokerage KB. |
| 8. Desktop AI provider architecture | **Missing** | P1-13; no desktop app or supported subscription auth implementation. |
| 9. Google Workspace | **Missing** | P1-12; integration tiles are status-only, no OAuth/API adapters. |
| 10. Transactions | **Partial / Demo only** | P1-14; local transactional checks exist, but no durable production state/storage or actual signing. |
| 11. Training and Community | **Partial / Demo only** | P1-15–16; curriculum/community local workflows exist; production lifecycle and content/automation gaps remain. |
| 12. Marketing, Swag, business cards, signatures | **Partial / Missing** | P1-17–18; approval/outbox UI exists; Swag/card/signature surfaces are absent. |
| 13. Infrastructure, Netlify, operations | **Production blocker / Untested** | P0-02, P1-03–05, P1-20–21, P2-04–06; Netlify config routes data to temporary storage and turns on demo auth. |
| 14. Accessibility, responsive QA, performance | **Untested** | P2-01; CSS primitives exist, but no independent current branch/production evidence or Lighthouse baseline. |

## Baseline verification

Executed on the merged-main starting commit before repairs:

- `npm test`: 562 tests passed across 39 files.
- `npm run typecheck`: passed.
- `npm run lint -- --quiet`: passed with zero errors.
- `npm run build`: passed; existing advisory warnings remain.
- Rendered browser audit for this production-readiness task: not yet performed. The current user’s built-in-browser-only preference is retained; this environment’s page-capture tool is voice-session-only, so no substitute browser is claimed.

## External activation blockers observed

No `DATABASE_URL`/Supabase URL or keys, Google OAuth client, OpenRouter key, FUB key, mail provider key, or error-reporting DSN was available in the current shell environment. No local environment file was found in the repo. The required values must be installed through the authorized secret manager/Netlify environment, never committed here. Also needed: the target Supabase project reference and approved Google OAuth consent/client/redirect setup, secure object-storage configuration, production test-agent Google identities, authorized brokerage policy/forms, state-specific compliance text, and available provider service details.

These dependencies block live activation/verification only. Code hardening, fail-closed behavior, local integration tests, durable adapter integration, and all independent product work continue while the exact setup path is being resolved.

## Repair assignment and verification loop

| Owner | Assigned findings | Scope / current state |
|---|---|---|
| Identity and access repair agent | P0-01, P1-01, P1-02, P1-06, P1-07 | Anonymous persona sessions, revocation/cookies, Google/invitation path, Taquilla-scoped member administration, onboarding/lifecycle. Active. |
| AI boundary repair agent | P0-03, P1-11 | Exact free-only model gate and truthful knowledge/retrieval capability. Active. |
| Public/agent lead repair agent | P1-08, P1-10, P2-02, P2-03 | Truthful server-persisted capture, attribution/routing, agent-site publication boundary and dead actions. Active. |
| Primary orchestrator | P0-02, P1-03–05, P1-09, P1-12–21, P2-04–06 | PostgreSQL/store path, persistence/infrastructure, production operations and remaining product surfaces; code work and exact external blockers being validated. Active. |
| Independent verification team | All repaired P0/P1, after repair pass | New auditors who did not implement the repairs will attempt to falsify production readiness. Not started. |

Once the current repair owners report, additional specialist repair assignments will be made for each remaining P1 surface; this table will be updated with named owners and evidence. Production go remains prohibited until independent verification finds zero P0/P1, or a finding is fully blocked by a named external dependency and the user receives an explicit no-go report.

## Repair and independent verification snapshot — 2026-09-30

The independent auth/AI, data/lead, and operations reviewers did not author the repair commits and attempted to falsify the changed paths. Their focused suites passed (23 tests / 2 files; 26 tests / 5 files; 60 tests / 8 files respectively). The completed transaction repair added 37 focused tests across five files. Findings below are based on source inspection and local tests only; none represent a live provider or hosted-database test.

### Current P0 status

| ID | Current result | Evidence and limit |
|---|---|---|
| P0-01 | **Mitigated by fail-closed production authentication** | Production disables demo personas; both `/api/session` and `createSession` reject persona-based sign-in. Google OIDC is not yet present, so production users cannot sign in. Independent auth tests passed. |
| P0-02 | **Mitigated by fail-closed storage** | Production runtime never resolves a SQLite path and throws `DURABLE_STORE_UNAVAILABLE` before opening SQLite. No temporary persistent brokerage state is written. PostgreSQL is not wired to the product service layer, so production workflows remain unavailable. |
| P0-03 | **Closed for web/portal inference routing** | Portal transport pins `openrouter/free`, prohibits provider/model/endpoint overrides and paid fallback, and caps prompt/completion prices at zero. Public chat now uses deterministic retrieval only; its separate Ollama request path was removed. No live OpenRouter call was made because no key was available. |

These changes remove the audited immediate unsafe paths. They do **not** establish a production-ready operating platform.

### P1 disposition

Twenty production-readiness clusters remain open. P1-06 (Taquilla’s managing-broker permission to administer her own office) is repaired and focused role-scope tests pass; this capability is still unusable in production while authentication and durable storage are off. The remaining clusters are blocked or incomplete: Google sign-in/invitations (01), durable production sessions (02), connecting PostgreSQL to service repositories (03), executing migrations and RLS tests on a real PostgreSQL project (04), private object storage and restore drill (05), full canonical onboarding/lifecycle (07), production lead intake/outbox (08), server-side CRM query/paging (09), durable/public agent-site publishing (10), brokerage knowledge retrieval (11), optional Google services (12), desktop supported subscription login (13), production transaction persistence/storage/signing (14), durable Training (15), durable Community and production video ingestion (16), production Marketing provider execution (17), durable Brand Resources and approved jurisdiction copy (18), durable Recruiting and invitation flow (19), durable notifications/operational logging (20), and deployment secret/config/fixture verification (21).

Independent review confirmed: current lead forms return 503 before any production write; CRM service routes remain SQLite-backed; `getRepository()` has no production callers; live migrations 0001–0004, backup/restore, and private object storage are unverified; agent-site pages cannot load canonical profile/config without the missing store; onboarding photo and profile data are not joined to canonical agent records. MLS migration 0004 remains unapplied.

### Additional repair from independent review

- A production agent-site profile lookup that could throw outside its `notFound()` boundary is now contained by that boundary.
- Public chat can no longer call local Ollama or another alternate inference provider. It displays and returns the deterministic published-page guide until it shares the exact free-only server boundary.
- A bounded request-body reader now enforces upload size while streaming, before multipart parsing; this addresses the operations reviewer’s P2 memory-amplification finding. The targeted tests cover a chunked oversized body, a valid multipart body, and a declared oversized length.
- The eight-template agent previews remain local/development-only. Production property search returns no fixture inventory when no provider is connected.
- Swag navigation now appears in desktop and mobile workspace tools; demo-state notice is suppressed in production.

### Verification boundary

Current local verification after the repair set: 641 tests passed across 54 files; TypeScript passed; ESLint passed with 0 errors and 76 pre-existing warnings; production build passed. The production build initially exposed a client import of a `server-only` profile service from the brand-resource component. The data/types were split into a client-safe module and the final production build passed. Upload byte limits are enforced before multipart parsing and have bounded-stream tests. No rendered browser inspection was available in this session. Hosted OAuth, OpenRouter, Google services, Netlify production runtime, PostgreSQL, migrations, backup/restore, and live feature journeys remain unverified.

**Current counts:** initial P0 3 → current unresolved P0 0 (all three unsafe paths are closed by fail-closed controls); initial P1 21 → current open P1 20 (Taquilla scoped administration is repaired in local authorization tests); initial P2 6 → current open P2 3 (browser QA, shared production search rate limiting, and optional FUB configuration cleanup remain).

**Current production decision: NO GO.** The repository is safer to host in an unavailable state, but cannot yet provide the production workflows specified in the mandate.

### Additional independent public/Workspace/desktop audit

A fourth independent reviewer found no alternate paid web AI path. It confirmed there is no Google OIDC callback, no Gmail/Calendar/Drive OAuth adapter, and no desktop client/provider-auth implementation; those are real open P1 items, not just missing credentials. Public lead acceptance and agent-site publishing remain unavailable in production until the durable store is connected. The production pages for Swag/card/signature explicitly state that no output was produced when storage is unavailable. Public hash links are in-page anchors; no `href="#"` dead links remain. The reviewer also flagged public chat’s cookie `Secure` attribute depending on an unset `RCRE_MODE`; this has now been changed to depend on `NODE_ENV==='production'` and covered by a regression test.
