# RCRE team and broker portal handoff

Documentation audit: 2026-09-17. Read this with `RCRE_ECOSYSTEM_HANDOFF.md` and the repository manifest. No application changes, provider calls, deployment, or extraction were performed for this document.

## Verified checkout and convergence

Local root: `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE`. Remote: `https://github.com/jeremymac904/RCRE-Demo.git`. Audit branch: `codex/rcre-ecosystem-handoff-2026-09-17`. Source baseline: `d4ae90d8f40edcff3a2e5996ab0267e6c56c8966`.

Canonical runtime is **`apps/rcre-demo`**, verified from `scripts/local.mjs`: it launches that app's Next binary/cwd and the local worker against the shared store. `apps/rcre` still exists; existence does not make it a second operational portal. The canonical app now contains actual backend routes/services, not only a frontend. Source below may be uncommitted at the baseline; the manifest distinguishes tracked commit content from the local working tree. Do not assume a GitHub checkout of that commit contains every local feature.

All source paths below are relative to the exact root above. Canonical source prefix: `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE/apps/rcre-demo/src/`. Repository tree: https://github.com/jeremymac904/RCRE-Demo/tree/d4ae90d8f40edcff3a2e5996ab0267e6c56c8966 — this is a baseline locator, not proof that uncommitted source is published there.

## State and evidence legend

`PROVEN LOCAL` means implemented local behavior supported by source, regression coverage and existing local verification artifacts. It does not mean production authentication, hosted operations, compliance certification or live provider execution. `SIMULATED` identifies fixture data/results. `BLOCKED EXTERNAL DEPENDENCY` identifies an implemented boundary lacking necessary external authority/service. `PLANNED` identifies a documented future concept. `NOT IMPLEMENTED` identifies absent behavior. No capability here is classified `PROVEN AUTHORIZED SANDBOX`: no provider sandbox evidence was found for these portal workflows.

This audit read source/tests and prior evidence; it did not rerun tests or browser journeys. Latest consolidated existing local evidence is `08-mvp/LIVE-LOCAL-ACTIVATION-2026-09-14.md`: 728 tests/52 files, 34 database checks and 19 browser checks. Those counts are historical evidence, not a new September 17 result.

## Role matrix — server authority, not navigation visibility

Shared signed-in routes: `/assistant`, `/training`, `/training/classroom`, `/training/classroom/[courseId]/[lessonId]`, `/training/community`, `/training/manage` learner view, `/settings/personal`, `/settings/account`, `/settings/ai`. Course enrollment can further deny content/media. All seven roles have AI capability, but model context must be scoped through backend services. Nav links are incomplete conveniences; route/API checks remain authoritative.

| Role | Dashboard, data and CRM | Actions, marketing, recruiting | Training/content | Transactions | Settings/administration |
|---|---|---|---|---|---|
| agent | `/today`, `/crm`, `/crm/[id]`, `/pipeline`, `/calendar`; own contact scope | Local contact/task/activity/calendar mutations; imported FUB edits become proposals. `/marketing`, `/content-library`: own drafts, approved shared content read/copy; cannot approve/schedule. `/website` own site. No recruiting/Command/reporting | Own progress/bookmarks/community posts; no course authoring or moderation | `/transactions`: owned or explicitly assigned records | Personal/account/AI only; no people/integration/audit administration |
| team_leader | Agent routes plus `/command`, `/agents`, `/agents/[id]`, `/reporting`; office-scoped CRM, transaction team scope | `/recruiting`, local prospect stage/tasks/meetings; marketing edits office/own, approved organization content read, reviewer actions subject to policy | Learner; **not** academy author/moderator despite broad `can('academy.*')` helper | Own/team/assigned records, scoped assignment and transaction policy | Shared settings plus `/settings/leads`; no organization people/integration settings |
| managing_broker | Command/reporting/agent inspector; office CRM | Office recruiting, marketing, approvals; scoped website fleet and public roster | Learner; **not** academy author/moderator | Office/assigned transactions and policy | Shared settings + leads; public roster/FUB user mapping separately guarded. Google proposal-only review when explicitly designated; no shared mailbox access |
| broker_owner | All organization dashboard/CRM/reporting data | Organization routing, recruiting, approvals, marketing, website fleet | Academy author, independent publication reviewer, assignments, policies, moderation | Organization transactions/assignment/policy | All settings groups; people/lifecycle/audit/integration/provider administration |
| transaction_coordinator | No Today/CRM/Pipeline/Command/reporting. Transaction-centered nav | No marketing/recruiting. Own website can exist without granting CRM | Learner/community author; no authoring/moderation | Own or specifically TC-assigned records; no blanket office transactions | Personal/account/AI only; no brokerage/lead/admin settings |
| marketing_admin | Marketing-centered nav; Calendar capability for own work, no CRM/Pipeline/Command | `/marketing`, `/content-library`, `/approvals`; organization marketing edits/reviews, `/admin/website`, `/admin/website/content` | Learner/community author; no academy administration | Denied | Personal/account/AI + marketing settings; CMS capability does not confer people/CRM/integration administration |
| trainer | Training-centered nav; no CRM/Command/reporting | No marketing/recruiting | `/training/manage`: courses, independent reviews, assignments/enrollment/config; community moderation | Denied | Personal/account/AI + academy settings; no integration/people/CRM administration |

Evidence: `src/lib/platform/auth.ts` (`can`, `scopedOwner`, directory), route guards in `src/app/{today,command,crm,pipeline,calendar,marketing,content-library}/page.tsx`, `src/components/AppShell.tsx`, `src/lib/academy-service.ts` (`academyManager`), `src/lib/academy-community.ts`, `src/lib/services/transactions.ts` (`ensureTransactions`, `permitted`), `src/lib/platform/recruiting.ts`, `src/lib/agent-website/site-service.ts`, `src/lib/integrations/google/service.ts`. Resolve paths under canonical source prefix. Tests: `tests/unit/{permissions,platform,platform-review,office-priorities,marketing-scope,agent-inspector,recruiting-access}.test.ts`, `tests/transactions-ai.test.ts`, `tests/google-integration.test.ts`.

Important scope details: CRM team leaders currently use office scope rather than an independently modeled multi-team hierarchy. Local membership configuration enforces one team per office. Transaction scope explicitly considers team and TC assignment. Course administration is only trainer/owner; the broad capability helper alone is insufficient documentation of actual action permission. Approved marketing content is organization-shared, whereas drafts remain scoped.

## Capability inventory

| Capability | Status | Actual durable behavior / limit | Evidence |
|---|---|---|---|
| Local persona sessions and role/office enforcement | PROVEN LOCAL | Signed cookie resolves active canonical membership; backend service guards and SQL policies coexist | `src/lib/platform/auth.ts`; `tests/unit/permissions.test.ts`; `scripts/verify-postgres.mjs`; `08-mvp/POSTGRES-DIRECT-VERIFICATION.md` |
| Hosted identity/SSO/MFA/session revocation guarantees | NOT IMPLEMENTED | Demo mode is the current authentication boundary. Signed-cookie path does not consult the session mirror's revoked flag. A source-known fallback signing secret exists for local review. Do not extract this as production auth | `src/lib/platform/auth.ts` (`demoEnabled`, `sessionSecret`, `actorOrNull`, `revokeSession`); `src/app/api/platform/[...path]/route.ts` sessions action |
| Today/CRM/Pipeline/Calendar local work | PROVEN LOCAL | Record/task edits, filters/saved views, calendar conflict/version checks and local reminders persist | `src/components/PlatformWorkspace.tsx`; `src/lib/platform/service.ts`; `tests/unit/{platform-review,calendar-reminders,lead-policy}.test.ts` |
| Demonstration dashboard performance and example clients/listings | SIMULATED | Fixture-mode signals are not real agent performance | `src/lib/platform/service.ts` seed; `src/data/demo.ts`; `08-mvp/LIVE-LOCAL-ACTIVATION-2026-09-14.md` |
| FUB-backed meaningful brokerage dashboard | BLOCKED EXTERNAL DEPENDENCY | Read-only importer exists; latest authorized key reported Lender role and no accessible contact backfill. Unknown history is not zero. Live mode remains separate from fixtures | `src/lib/fub/intelligence.ts`; `tests/fub-intelligence.test.ts`; `08-mvp/LIVE-LOCAL-ACTIVATION-2026-09-14.md` |
| Command/reporting/agent inspector | PROVEN LOCAL | Scoped contacts, observed outreach, tasks, appointment evidence, transaction concerns, training and source gaps; report calculations derived from local evidence | `src/components/{PlatformWorkspace,AgentInspector,FubSignalsWorkspace}.tsx`; `tests/unit/{agent-inspector,reporting}.test.ts` |
| Recruiting and local onboarding | PROVEN LOCAL | Scoped prospect stage/tasks/meetings, version checks, consent-based learning linkage and local invitation mailbox; consent revocation removes learning projection | `src/lib/platform/{recruiting,access}.ts`; `tests/unit/recruiting-access.test.ts`; no email delivery claim |
| Team AI | PROVEN LOCAL | Shared Assistant UI uses actor-scoped services; output is an unapproved draft, not authority. Free OpenRouter live local calls previously verified; rate limits remain possible | `src/components/Assistant.tsx`; `tests/{assistant-free-boundary,assistant-free-intent,openrouter-free}.test.ts`; activation report |
| Transaction coordination / document preparation | PROVEN LOCAL | Versioned records, deterministic confirmed-term deadlines, private documents, hash-bound draft review, real local PDF page/signature-position preview | `src/lib/services/{transactions,deadlines,document-services}.ts`; `tests/transactions-ai.test.ts`; `tests/unit/pdf-preparation.test.ts`; `08-mvp/transactions-ai-build-register.md` |
| Remote signing/PDF service execution | BLOCKED EXTERNAL DEPENDENCY | Local unsigned preview is not a signed contract, Documenso envelope or Stirling processing receipt | `src/lib/services/document-services.ts`; transaction register |
| Preferences/settings | PROVEN LOCAL | Versioned group settings affect themes/notifications/calendar/lead policy/reviewer selection; values do not prove provider connectivity | `src/components/SettingsWorkspace.tsx`; `src/lib/platform/{service,settings}.ts`; `tests/unit/{platform-review,reviewer-policy,calendar-reminders}.test.ts` |
| Persistent portal database | PROVEN LOCAL | PostgreSQL authoritative via launcher; SQLite isolated test/development mode; scoped records and append-only audit protections | `scripts/local.mjs`; `src/lib/platform/{store,postgres-store}.ts`; `08-mvp/POSTGRES-DIRECT-VERIFICATION.md` |
| Hosted production portal | BLOCKED EXTERNAL DEPENDENCY | Correct hosted RCRE database, secure production identity, operations, secrets and provider authority remain required | `08-mvp/PRODUCTION-READONLY-ACTIVATION-CHECKLIST.md`; activation report |

## Bounded reusable portal component candidates — 14

Count means 14 explicit extraction candidates, not 14 independently packaged products. All depend on React/Next and approved portal theme tokens; none should be copied with private runtime data. Parent reusable inventory should count these once rather than also counting every subcomponent.

| # | Candidate / canonical `src/components/` path | Contract/dependencies and permission boundary | RCRE-specific coupling; extraction approach / difficulty | Evidence |
|---|---|---|---|---|
| 1 | `AppShell.tsx` | User display + platformRole, navigation, preferences | RCRE logo/role nav; inject brand/nav/capability map. Low | Current routes; integration browser evidence |
| 2 | `PlatformWorkspace.tsx` | Actor + mode + record ID; platform APIs | Large multi-mode brokerage workspace; split by service adapters before reuse. High | platform/reporting/marketing tests |
| 3 | `SettingsWorkspace.tsx` | Actor + group; versioned Setting | RCRE groups, offices, reviewer policy; schema-driven tenant settings. Medium | platform-review, reviewer-policy tests |
| 4 | `AgentInspector.tsx` | Scoped per-agent evidence projection | Canonical person IDs and current office rules; inject directory/evidence sources. Medium | agent-inspector tests |
| 5 | `FubSignalsWorkspace.tsx` | Scoped signal/coverage response | FUB field meanings and fixture/live switch; preserve unknown coverage semantics. Medium | fub-intelligence/API tests |
| 6 | `Transactions.tsx` | TransactionRecord, DocumentRecord, approval APIs | State policy, contract conventions and providers remain tenant-specific. High | transactions-ai, pdf-preparation tests |
| 7 | `MarketingComposer.tsx` | Workflow fact inputs → editable draft callback | Branding/disclosures/templates; inject approved copy, never relabel templates as model inference. Low | marketing-scope + library-day-plan tests / source templates |
| 8 | `MarketingBatches.tsx` | Scoped content IDs → independent draft batch | Approval/schedule rules; extract with batch API, not buttons alone. Medium | marketing-batches route / marketing-scope tests |
| 9 | `LibraryAssets.tsx` | Private versioned asset metadata/upload/download | Storage root, rights metadata, entitlement; tenant storage adapter. Medium | library-day-plan tests |
| 10 | `AcademyManager.tsx` | Course/assignment/policy/progress contracts | Imported catalog and two-role publication policy; replace content source, preserve review binding. High | academy-functional/review regressions |
| 11 | `AcademyProgressProvider.tsx` | Identity-scoped progress API | Organization+owner keys; retain server truth, inject endpoint. Medium | academy-functional / asset HTTP verification |
| 12 | `AcademyLessonStage.tsx` | Sanitized lesson/resources/video availability | Real protected media routes, source rights; extract renderer with entitlement adapter. Medium | academy browser result and media verification |
| 13 | `CommunityFeed.tsx` | Scoped posts/comments/attachments API | Category policy, author/moderator rules; extract service + attachment rules together. Medium | academy-functional / community browser evidence |
| 14 | `RecruitDetail.tsx` | Scoped prospect/events + consented learning | Local mail, office scope and opt-in projection; replace delivery/provider only after independent authorization. Medium | recruiting-access tests |

## Extraction conditions

Keep RCRE identities, public roster, broker roles, office memberships, imported FUB mappings, customer records, lender disclosures, brokerage operating rules and curriculum outside generic packages. Replace auth first; parameterize organization/team/office, brand, capabilities, storage and integration registry. A reusable team portal is **NEEDS EXTRACTION**, with synthetic demos appropriate now. Production multi-tenant onboarding, billing and self-service tenant provisioning are **NOT IMPLEMENTED**, not implied by organization fields.

Required reproduction checks: all seven role/API denial cases, foreign organization and cross-office access, stale versions, refresh persistence, direct private-file URLs, reviewer/hash binding, fixture/live separation, consent withdrawal, both themes/mobile accessibility, real database policy verification and production identity/session tests. Do not expose actual RCRE or FUB data in AI Realtor Pro demos.
