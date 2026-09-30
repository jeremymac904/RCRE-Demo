# RCRE AI assistant handoff

Source audit: 2026-09-17. This document describes the working tree, not a deployed SaaS product. The repository is `https://github.com/jeremymac904/RCRE-Demo.git`; audit baseline is `d4ae90d8f40edcff3a2e5996ab0267e6c56c8966`. Numerous implementations are uncommitted relative to that baseline. A baseline checkout alone does not reproduce this handoff; use the parent handoff manifest and delivered commit to reconcile files.

All paths below are relative to `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE`. The canonical application is `apps/rcre-demo`, launched locally through `scripts/local.mjs`, normally at `http://localhost:3200`. The older `apps/rcre` is not the canonical runtime. No live calls, credentials inspection, builds, or tests were performed for this documentation pass.

## Capability classification

The allowed labels describe each narrow capability, not the whole product. **PROVEN LOCAL** means local implementation/test evidence; it does not imply production deployment. **PROVEN AUTHORIZED SANDBOX** is not applied to real production endpoint reads. **SIMULATED** identifies fixture or protocol-double evidence. **BLOCKED EXTERNAL DEPENDENCY** identifies required unavailable access/runtime. **PLANNED** identifies documented design without implementation. **NOT IMPLEMENTED** identifies missing execution, even where an interface exists.

| Capability | Status | Evidence and limit |
|---|---|---|
| Authenticated assistant, scoped deterministic context, stored conversation/jobs, cancellation and task creation | PROVEN LOCAL | Canonical service/API and `tests/transactions-ai.test.ts`; local persistence does not establish hosted service reliability. |
| Local provider HTTP parsing and model discovery boundary | PROVEN LOCAL | Loopback validation, advertised-model checks and mocked Ollama/Hermes protocol tests. |
| Ollama inference with a permitted installed model | BLOCKED EXTERNAL DEPENDENCY | No permitted local model inference established in dated evidence. No model download is implied. |
| Owned Hermes lifecycle boundary | PROVEN LOCAL | Per-owner files, isolation preflight, owned-process stop and status checks; synthetic process evidence only. |
| Actual isolated Hermes inference | BLOCKED EXTERNAL DEPENDENCY | Installed Python isolation probe aborted; successful Hermes inference is not proven. |
| OpenRouter free-only boundary | PROVEN LOCAL | Fixed endpoint/model, zero-price ceilings, no fallback, constrained context, status/audit. Limited real authorized production-endpoint evidence exists dated September 14 below. |
| Reliable successful generation across all seven intelligence workflows | BLOCKED EXTERNAL DEPENDENCY | Final structured fixture run succeeded for two workflows, not seven; upstream rate limits/unusable responses remain material. |
| Canonical authenticated MCP HTTP transport and five read tools | PROVEN LOCAL | Actual JSON-RPC handler and scoped services; authenticated HTTP `rcre_tasks` tested locally. |
| Standalone legacy MCP registry execution or autonomous model tool selection | NOT IMPLEMENTED | Declarative registry is not a running server; assistant model paths generate text rather than dispatch tools. |
| Public visitor site guide and persisted chat | PROVEN LOCAL | Published public knowledge only, visitor isolation, explicit non-AI guide mode. |
| Public local-model chat inference | BLOCKED EXTERNAL DEPENDENCY | Optional Ollama boundary exists; no permitted local-model success established. |
| Fixture brokerage intelligence | SIMULATED | Fixture records support local workflows; they are not live brokerage metrics. |
| Cross-company assistant service/SSO and tenant onboarding | NOT IMPLEMENTED | Organization fields and local authorization are useful foundations, not proven multi-company deployment. |

## Runtime and files

| Responsibility | Exact source |
|---|---|
| Jobs, provider dispatch, context, conversation and cancellation | `apps/rcre-demo/src/lib/services/ai.ts` |
| Safe fixed intents and deterministic authority routing | `apps/rcre-demo/src/lib/services/ai-free-context.ts` |
| Free-only external adapter and sanitizer | `apps/rcre-demo/src/lib/services/openrouter-free/index.ts`, `sanitizer.ts`, `README.md` |
| Private assistant API and interface | `apps/rcre-demo/src/app/api/assistant/route.ts`, `src/components/Assistant.tsx` |
| Provider administrative status | `apps/rcre-demo/src/app/api/admin/ai-provider/route.ts` |
| Canonical read tools and transport | `apps/rcre-demo/src/lib/services/mcp.ts`, `src/app/api/mcp/route.ts` |
| Local Hermes lifecycle bridge | `apps/rcre-demo/src/lib/services/hermes-runtime.ts`, `scripts/hermes-runtime.mjs`, `scripts/hermes-process.mjs` |
| Public-only guide/model service | `apps/rcre-demo/src/lib/services/public-chat.ts`, `src/app/api/public/chat/route.ts` |
| Auth and durable records | `apps/rcre-demo/src/lib/platform/auth.ts`, `store.ts`, `postgres-store.ts` |

Paths beginning `src/` in a multi-file cell share the preceding `apps/rcre-demo/` prefix. Obsolete cloud provider code under `apps/rcre-demo/src/lib/services/cloud-ai/` is not an enabled paid-cloud offering. The active boundary rejects legacy cloud configuration rather than silently selecting it.

### Private assistant contract

The server resolves `PlatformActor` from authenticated session state: `id`, `userId`, `organizationId`, `role`, `name`, `market`, `teamId`, `officeId`. Browser-provided identity is not authorization. Records in `ai_config`, `ai_jobs`, `ai_conversations`, and `ai_attachments` are owner/organization scoped. Capabilities and context preferences further restrict CRM, calendar, transaction, and training reads. Membership checks are distinct from session revocation: the current `actorOrNull` validates a signed cookie but does not consult the persisted sessions revocation mirror. Server-side revocation enforcement remains a concrete gap before production reuse.

A request creates a persisted job and invokes the selected boundary. Deterministic responses explicitly identify that no inference ran. External and local-model responses remain unapproved drafts. Queue limits, daily caps, personal pause preferences and attachment checks run before inference. A stale queued/running job older than 180 seconds is failed; this is recovery bookkeeping, not proof of a durable autonomous inference worker. Cancellation aborts in-flight work and persists cancellation. Clearing history aborts/removes owned jobs and conversations; late responses cannot restore deleted history.

Plaintext attachments are bounded to 40,000 characters and owner checked. OpenRouter does not accept attachments. Local providers can receive scoped record content, conversation and permitted attachments after sharing opt-in: do not generalize the external adapter's reduced-data claim to all providers. Private assistant prompts and responses are persisted; provider telemetry being metadata-only does not mean the application stores no conversation content.

Task creation is an explicit authenticated action through the scoped platform task service. A generated sentence is not an executed task, approval, send, signature, or CRM mutation. Contract deadline arithmetic and permissions remain deterministic server functions. The authority-routing check covers approval/compliance/legal/contract/deadline/calculation/payment/rate/commission/disbursement/signing/wire/sensitive-account intents. It is a routing safeguard, not legal or compliance validation.

### OpenRouter free-only execution

`inferFreeRouter(actor, {prompt, signals, knownNames}, {signal})` is server-only. It uses fixed `https://openrouter.ai/api/v1/chat/completions` and requested model `openrouter/free`, with zero-price ceilings, fallback disabled and data collection denied. The adapter rejects paid model choices, caller-selected providers, tools/plugins, images/documents, model lists and online/search routing. Timeouts, aborts, bounded response size and rejection of tool/multimodal responses constrain execution. It does not automatically retry through another provider.

Callers must supply fixed task instructions plus allowlisted structured signals. The sanitizer aliases leads and removes known names, common contact/address/credential/link patterns; sensitive documents/credentials are blocked. Regex redaction is not a universal PII detector, especially for unknown names or unusual formats. Reuse requires maintaining the fixed-intent/known-name/structured-signal contract rather than sending raw CRM notes or documents. Provider status exposes configuration and last outcome, not secret values. A saved key/model is not a connection proof; credential changes invalidate stale success state.

**Dated authorized live evidence, not sandbox:** `08-mvp/LIVE-LOCAL-ACTIVATION-2026-09-14.md` records real OpenRouter HTTPS calls. The initial empty-context run produced six workflows across nine attempts, but did not establish useful brokerage intelligence. The final structured fixture run produced two successful drafts in fourteen attempts, for contact-reason and text-draft; all seven workflows were exercised, not all successfully generated. Intermittent 429 and rejected unusable responses remain. The router selecting a free backend does not mean the application requested an alternate model. No paid fallback or web search was used. Do not present these results as reliable production AI acceptance.

### MCP transport versus registry

The canonical `/api/mcp` implements JSON-RPC 2.0 `initialize` (protocol `2025-03-26`), `ping`, `tools/list`, `tools/call` and initialized notification handling. It uses session authentication and request-origin checks. GET is unsupported; batch requests are unsupported. The five executable tools are:

- `rcre_priorities`
- `rcre_tasks`
- `rcre_calendar`
- `rcre_transaction_deadlines`
- `rcre_pending_transaction_approvals`

Tools accept no arbitrary arguments and enforce actor capabilities plus AI context preferences. They invoke scoped service functions and produce `ai_tool_audit` records. They expose no SQL, generic database access, sends or writes. Returned authorized local data can still contain personal information; this is not automatically safe external-provider context.

`mcp/rcre-mcp-server/src/tools.ts`, `authorize.ts`, and `pii-guard.ts` contain a separate declarative registry/authorization design, including draft/write descriptions and older role names. Its package has no executable server listener. These descriptions do not prove mutation transport. Canonical assistant model output does not automatically call either registry. A future authenticated external MCP deployment needs an explicit transport/auth design and tests; copying the tool catalog alone is insufficient.

### Hermes lifecycle and isolation

The local manager reads the installed Hermes source at `/Users/jeremymcdonald/.hermes/hermes-agent` without modifying it. Runtime state lives under RCRE `runtime/hermes-workers/<owner-derived hash>`. It requires an existing permitted Ollama model; it does not download one. On macOS it uses `sandbox-exec`, denies writes outside the owned runtime, limits reads/network, and probes isolation before starting. Credentials require matching owner identity, running state, endpoint and successful isolation evidence; an environment flag alone cannot bypass this.

The owned configuration disables tools and memory, limits turns, and verifies `/v1/toolsets` is disabled. It deliberately does not attach the broad legacy MCP registry. Stop operations check the owned process identity. Existing lifecycle evidence uses a synthetic Node process; the installed Python isolation probe aborted. There is no verified isolated Hermes inference session. See `08-mvp/LOCAL-OPERATIONS.md` and `08-mvp/IMPLEMENTATION-REGISTER.md`; the latter records historical OS diagnostic side effects. This documentation pass generated none.

Extraction is substantial: the launcher is macOS-specific and tied to an installed-source path and current local identity convention. Replacing that with hosted containers, tenant-bound credentials and a supported inference runtime is implementation work, not merely adding a key.

## Public assistant and knowledge

Public chat is a separate visitor-scoped service, not a shortcut to private assistant context. Published site pages, canonical public agents, public metro/journal data and eligible custom published resources supply citations. Private, archived and redirect-source content are excluded. Input length and request rates are bounded; history, clear, retry and cancellation exist. Default guide mode explicitly says no AI model is connected. It supports useful public navigation rather than fabricating live AI.

An optional configured local Ollama provider verifies the advertised model before generation. It has no paid fallback and no private CRM, course or administrative data in its knowledge set. It performs no actions. Public contact/lender facts must continue to come from canonical published content; financing choice language must not be converted into required lender use.

## Security, offline behavior and human gates

Current seven roles are agent, team leader, managing broker, broker owner, transaction coordinator, marketing/admin and trainer. Capabilities are evaluated server-side. The local session system uses signed cookies and membership checks; `actorOrNull` does not consult the persisted sessions revocation mirror, so writing a revoked session record does not establish immediate cookie revocation. It remains a local persona-oriented authentication implementation, not proven production SSO or independent-company provisioning.

When model services are unavailable, deterministic priorities, tasks, deadlines, scoped records and public guide navigation remain available. The UI must preserve provider unavailable/error/cancelled states instead of labeling deterministic text as inference. Exact-version transaction and marketing approvals remain separate services; model-generated text cannot approve itself. Google proposals require exact reviewed payload and explicit execution. FUB is read-only even when a local proposal exists. No model receives generic database or outbound-message authority.

Reusable components include structured intent/context builders, cancellation-safe job handling, scoped read tools and provider error contracts. Medium-to-high extraction work includes organization/role mapping, canonical people integration, private storage, retention, source provenance and local-to-hosted session migration. Shared infrastructure must never reuse organization keys, mailbox authority, canonical user mappings or visitor/conversation IDs between Jeremy Mortgage, Legends, AI Realtor Pro, Florida Home Buying Network or other future tenants.

## Verification and remaining acceptance

Exact focused sources of evidence: `apps/rcre-demo/tests/transactions-ai.test.ts`, `tests/public-chat.test.ts`, and `tests/openrouter-free.test.ts`; lifecycle scripts/evidence in `08-mvp/LOCAL-OPERATIONS.md`. Relative `tests/` paths use the canonical app prefix. `08-mvp/transactions-ai-build-register.md` provides earlier browser/MCP evidence, but its old SQLite runtime description is superseded by current PostgreSQL evidence.

Latest dated activation report records 728 tests across 52 files, typecheck/build success, 34 PostgreSQL checks and 19 browser checks. Those build, database and browser results are September 14 evidence. The parent independently reran the unit suite on September 17: 728 tests across 52 files, recorded in `runtime/handoff/current-unit-tests.txt`. This specialist documentation pass did not itself run tests; the aggregate entry records that fresh unit result separately. Private artifacts are referenced under `runtime/activation/`, `runtime/logs/activation-*.txt` and `runtime/browser-evidence/live-activation/`; do not export raw fixtures, private prompts or tokens into another workspace.

Before production reuse: verify the delivered source commit; implement production identity/tenant onboarding; re-test isolation on the target runtime; achieve permitted local inference or reliable authorized free-provider workflows; validate context redaction with tenant-specific adversarial examples; test real external MCP authentication if needed; establish retention/operational ownership; and obtain explicit authorization for external activation. The local application and dated partial live tests do not remove these requirements.
