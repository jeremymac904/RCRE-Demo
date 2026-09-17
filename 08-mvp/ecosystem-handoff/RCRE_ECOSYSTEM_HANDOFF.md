# RCRE → website and AI ecosystem handoff

**Audit date: September 17, 2026. Start here.** RCRE is a brokerage-specific proving application. AI Realtor Pro is the separate public Realtor technology/education brand. This package documents extraction boundaries; it does not create a SaaS platform, extract code, install Skills, activate integrations or authorize marketing claims.

## Verified repository and delivery boundary

- Local root: `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE`
- Git remote: https://github.com/jeremymac904/RCRE-Demo.git
- Isolated handoff branch: `codex/rcre-ecosystem-handoff-2026-09-17`
- Implementation audit HEAD, initially on `main`: `d4ae90d8f40edcff3a2e5996ab0267e6c56c8966`. Remote main matched at inspection.
- Canonical application: **`apps/rcre-demo`**, verified from the actual Next binary and working directory in `scripts/local.mjs`, public/portal API implementation and PostgreSQL store. `apps/rcre` remains a historical reference; do not launch or create another application.
- Handoff commit: resolve `git log -1 --format=%H -- 08-mvp/ecosystem-handoff`; the delivery response supplies the exact hash. A document cannot embed its own final commit hash. [Branch package](https://github.com/jeremymac904/RCRE-Demo/tree/codex/rcre-ecosystem-handoff-2026-09-17/08-mvp/ecosystem-handoff) becomes available after successful push.

**Critical source-delivery gap:** the reviewed local tree contains substantial preexisting modified/untracked application implementation. This commit contains only these fourteen handoff files. It does not deliver those changes. A remote-only clone at the baseline or documentation commit cannot reproduce all current features. The [manifest](RCRE_REPOSITORY_MANIFEST.json) fingerprints 500 selected source/test/configuration files and identifies baseline-identical, modified and absent files. Only identical files receive exact-source GitHub URLs. Other source references are exact local paths, not claims that GitHub already contains them. Implementation delivery needs a separate scoped review; do not indiscriminately stage the existing dirty tree.

Current local HTTP observation: `/` and `/login` at `http://localhost:3200` were unreachable during this audit. The documentation task did not restart the private-key-loading launcher or activate providers. The live https://rcregroup.com website was not modified and is not proof this local application is deployed.

## Read the package

| File | Receiving session uses it for |
|---|---|
| [Repository manifest](RCRE_REPOSITORY_MANIFEST.json) | Absolute paths, source hashes, branch/baseline, runtime/convergence evidence |
| [Reusable component inventory](RCRE_REUSABLE_COMPONENT_INVENTORY.md) | 20 website and 14 portal candidate units, contracts, dependencies, scope and extraction |
| [Data contracts](RCRE_REUSABLE_DATA_CONTRACTS.md) | Actual types versus proposed factory envelope; tenant/source identity |
| [Design system](RCRE_DESIGN_SYSTEM_HANDOFF.md) | Exact fonts, tokens, responsive/theme/motion rules and public page coverage |
| [Agent websites](RCRE_AGENT_WEBSITE_HANDOFF.md) | Eight templates, canonical people, editor, publication, forms, missing provider features |
| [Team/broker portal](RCRE_TEAM_BROKER_PORTAL_HANDOFF.md) | Seven-role route/action matrix, management and authorization boundaries |
| [AI assistant](RCRE_AI_ASSISTANT_HANDOFF.md) | Deterministic/local/free-only runtime, actual MCP, Hermes and privacy |
| [Marketing](RCRE_MARKETING_AUTOMATION_HANDOFF.md) | Draft/library/approval/queue workflows versus delivery and publishing |
| [Content/training](RCRE_CONTENT_TRAINING_HANDOFF.md) | Imported curriculum, authoring, assignment, progress, protected assets and rights |
| [Integration boundaries](RCRE_INTEGRATION_BOUNDARIES.md) | FUB, Google, documents, transactions, signing, communications and provider gaps |
| [Skill candidates](RCRE_SKILL_EXTRACTION_CANDIDATES.md) | Seven bounded reproduction candidates and two deferred proposals; no Skills created |
| [AI Realtor Pro map](RCRE_TO_AI_REALTOR_PRO_MAP.md) | All 21 offerings, allowed demos and proposed website-factory collaboration |
| [Risk register](RCRE_REUSE_RISK_REGISTER.md) | Source delivery, auth, tenant isolation, rights, provider and governance blockers |

## Evidence-based capability register

Each row is deliberately narrow and has exactly one status. PROVEN LOCAL proves its stated local behavior, not production readiness. No capability is classified PROVEN AUTHORIZED SANDBOX: the dated OpenRouter/FUB calls used authorized production endpoints, with limited results.

| Capability | Status | Evidence / remaining boundary |
|---|---|---|
| Public pages, directory, profiles, blogs, inquiries and recruiting showcase | PROVEN LOCAL | Current public routes/components; public/people/metro tests and dated visual reviews in design handoff |
| Eight agent templates, saved configuration, reviewed local publication and lead capture | PROVEN LOCAL | site-service, agent-website-system/API/people tests; no DNS provisioning |
| Public property inventory | SIMULATED | Local search/examples; not licensed live IDX/MLS |
| Local PostgreSQL record persistence and 13 canonical people | PROVEN LOCAL | PostgreSQL adapter/migrations, durable tests; September14 SQL verification |
| Seven-role portal actions and scoped local state | PROVEN LOCAL | Platform/service/role tests; production auth gap below |
| Hosted independent-tenant identity, SSO and enforced session revocation | NOT IMPLEMENTED | Local persona authentication; signed-cookie read does not consult session revocation mirror |
| Deterministic assistant, explicit local task actions and constrained free-provider adapter | PROVEN LOCAL | transactions-ai, assistant-free and openrouter-free tests; limited dated real calls |
| Reliable generation across all seven requested AI workflows | BLOCKED EXTERNAL DEPENDENCY | Final September14 structured run: 2 successful workflows/14 attempts; upstream errors/unusable output |
| Five scoped MCP read tools over authenticated HTTP | PROVEN LOCAL | Actual `/api/mcp` handler/service and local evidence |
| Legacy standalone MCP registry execution | NOT IMPLEMENTED | Tool descriptions do not constitute a listener or write transport |
| Owned Hermes lifecycle controls | PROVEN LOCAL | Isolation/lifecycle boundary with synthetic process evidence |
| Isolated Hermes inference | BLOCKED EXTERNAL DEPENDENCY | Installed Python isolation probe failed; no accepted inference |
| CRM local workflows, FUB read client/mapping/checkpoints/quarantine | PROVEN LOCAL | FUB/platform tests; dated real Lender-key discovery |
| Full real brokerage backfill and real Today/Command acceptance | BLOCKED EXTERNAL DEPENDENCY | Lender visibility: no active imported brokerage records; suitable access/coverage needed |
| Fixture Today, Command and performance stories | SIMULATED | Explicit fixture mode; do not market fictional performance |
| Transaction records, deterministic deadlines, documents and exact-version human approvals | PROVEN LOCAL | transactions-ai and actual native PDF tests; local outbox only |
| Stirling HTTP/OCR and Documenso signing adapters | NOT IMPLEMENTED | Current unavailable stubs/interfaces; keys alone do not implement them |
| Marketing drafts, assets, review and local queue | PROVEN LOCAL | marketing-scope/library/platform tests; no social delivery claim |
| Social publishing, ad launches and general outbound SMS/email | NOT IMPLEMENTED | Local draft/outbox is not external execution |
| Academy catalog, entitlement, authoring, assignments and progress | PROVEN LOCAL | Real imported curriculum + academy tests; incomplete video availability recorded |
| Google OAuth/token/proposal boundary | PROVEN LOCAL | 21 mocked Google cases; not account connection proof |
| Live Google Gmail/Calendar/Drive | BLOCKED EXTERNAL DEPENDENCY | Credentials/consent and separately authorized verification pending |
| Hosted Supabase, licensed IDX/MLS and production domain activation | BLOCKED EXTERNAL DEPENDENCY | Local implementations do not establish hosted/provider operation |
| Generic website factory, shared onboarding and extracted Skills | PLANNED | Proposed contracts only; external ecosystem owns architectural adoption |

The specialist handoffs supply narrower feature classifications and source/evidence references. Never turn a PROVEN LOCAL row into a live external product claim.

## Architecture and what must remain RCRE-specific

Next.js public/portal/API code shares server services, canonical people projection and the platform record store. PostgreSQL migrations 0004–0009 cover the newer durable record architecture; old normalized domain types/migrations also exist and must not be mistaken for the sole current schema. Tests use isolated storage where appropriate. Actor identity is resolved server-side and service checks enforce organization/office/owner scope, but local persona authentication is not a production identity system.

The authoritative thirteen people remain single humans across state relationships. Julio and Taquilla are not duplicated by state; Margie remains publicly REALTOR and internally TC. Keep brokerage roles distinct from public titles. RCRE people, licenses, portraits, lender information, CRM IDs, customer records, office policy, testimonials and curriculum rights are tenant data, not generic template defaults. Never copy private runtime databases, environment files, tokens or imported customer data into the receiving workspace.

Follow Up Boss remains CRM system of record. Hard GET-only mode, credential-generation binding, approved canonical user mapping and unknown-versus-zero coverage must survive extraction. Marketing, transaction and Google approvals bind exact versions/payloads; they do not become model-granted authority. No paid AI fallback, unrestricted database MCP, automatic sends, production webhook registration or public sharing is authorized.

## External ecosystem — read-only observations

Authority: `/Volumes/LegendsOS/Legends_Website_AI_Workspace/PROJECT_TRUTH.md` and `CROSS_SITE_ARCHITECTURE.md`. The latter is a proposal, not an accepted replacement architecture. Keep independent brand/tenant identity; no shared SSO inferred from matching email. The external workspace decides adoption of the proposed configuration envelope.

| Project | Exact local path beneath external root | GitHub / observed local revision |
|---|---|---|
| AI Realtor Pro | `repos/AI-Realtor-Pro-Final` | https://github.com/jeremymac904/AI-Realtor-Pro-Final — main `da9eb6a731ae0300171105077cfd1dcd3297cf28` |
| Legends Mortgage Team | `repos/Legends-Team-Website` | https://github.com/jeremymac904/Legends-Team-Website — main `fd4feb22a752cf175aa8acf3ec53425c1088327f` |
| Jeremy Mortgage | `repos/final-jeremy-mcdonald-mtg.com` | https://github.com/jeremymac904/final-jeremy-mcdonald-mtg.com — main `32ecd09d7379241ec405f4763da09c5477465d97` |
| Florida Home Buying Network | `repos/florida-home-buying-network` | https://github.com/jeremymac904/florida-home-buying-network — main `659feab4636ad0f3d75def88a210a19d9ee7cc16` |
| Existing Hermes bridge | `repos/website_hermes_bridge` | https://github.com/jeremymac904/website_hermes_bridge — detached `563eca4940e4ea844b347b7469318efafe98a032`; runtime disabled |
| LO shared platform | `legends_lo_system/shared_backend` | User-provided https://github.com/jeremymac904/legends-lo-platform; local package `@legends-lo/platform` 0.2.0; independent Git remote not established |

These are local observations, not deployed revision checks. User-provided live addresses: https://mcdonald-mtg.com, https://legendsmortgage.team, https://airealtorpro.app, https://floridahomebuyingnetwork.com. No external files were changed, no provider activated, no site deployed or live output verified here.

Installed skill metadata inspected read-only: `/Users/jeremymcdonald/.agents/skills/mortgagewebsitebuilder/SKILL.md` 1.2.3 and `/Users/jeremymcdonald/.agents/skills/mortgage-lead-funnel-builder/SKILL.md` 1.0.0. Other external source copies have differing versions; see risk register before adopting them. No Skills were executed or created. Existing Jotform onboarding, LO configuration and opaque Hermes bridge contracts should be reconciled by their owning workspace, not replaced with a second source of truth.

## Product and extraction decision

**34 candidate units; seven bounded future Skills:** realtor-website-builder, real-estate-team-website-builder, realtor-portal-builder, brokerage-portal-builder, realtor-marketing-system-builder, realtor-ai-academy-builder and realtor-recruiting-system-builder. AI assistant and CRM Skills are deferred until their remaining acceptance is established.

**READY TO MARKET: none as newly available production software on this evidence.** Synthetic previews/walkthroughs can demonstrate the local application with explicit limits. AI Assistant, AI Lead Follow Up, AI Marketing System, CRM Workspace, Transaction Workspace and Content Automation are DEMO ONLY in the offering map. Websites/portals/content/Academy/recruiting need extraction; SEO/GEO and presentations need more development; social publishing is NOT READY. See all 21 offerings in the product map rather than treating this paragraph as a commercial release approval.

First resolve source delivery. Then extract types/services and tenant configuration with two synthetic tenants, preserve authorization/rights/version checks, reproduce local workflows, and independently approve each provider/deployment. Do not import RCRE data to make an external demo look populated.

## Verification, governance and stopping point

- **Fresh September17:** 728 tests passed across 52 files; raw local receipt `runtime/handoff/current-unit-tests.txt` (not exported). Documentation JSON/path/link/status/secret checks apply to this package.
- **Historical September14 only:** TypeScript and production build passed; ESLint 0 errors/36 warnings; 34 PostgreSQL and 19 browser checks, as recorded in `08-mvp/LIVE-LOCAL-ACTIVATION-2026-09-14.md`. No new build/browser performance acceptance is claimed.
- Documentation commit intentionally leaves all preexisting implementation changes untouched. No application feature changes are part of this task.
- `README.md`, `CLAUDE.md` and early implementation records contain stale canonical-app, SQLite, Margie-role and disconnected-provider statements. Follow current verified source plus later explicit approvals; conflicts are itemized in the risk register. Original governance still governs scope and safety.
- Current request explicitly authorizes isolated branch, handoff commit and push. It authorizes neither merge nor deployment. No unresolved governance approval is needed for the documentation delivery itself.
- No additional human input is required to consume this package. Future source delivery, content rights, hosted identity, connector accounts and external activation need their own scoped decisions; do not request or copy secrets into this handoff.

Stop after handoff delivery. The external website ecosystem remains authoritative for reusable ecosystem implementation; RCRE remains authoritative for brokerage implementation.
