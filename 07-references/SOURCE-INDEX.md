# Source Index — Read-Only Reference Paths

Pointers to prior material worth consulting during the RCRE build.

**Every path below is READ ONLY.** Inspect in place. If specific material is needed, **copy** it
into `RCRE/` — never move it, never modify the original. See [GOVERNANCE.md](../GOVERNANCE.md) §2.

Root: `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/`

---

## Tier 1 — Consult directly

| What | Path | Use it for |
|---|---|---|
| **LegendsOS v2** | `legends-team-builds/legendsos/legendsos-v2/` | The reference implementation |
| ↳ Schema + RLS | `…/supabase/migrations/` | 34 migrations, ~78 tables. Start with `20260512000000_init_schema.sql` and `20260512000100_rls_policies.sql` |
| ↳ Lead intake model | `…/migrations/20260601102000_lead_intake_foundation.sql` | Lead → contact → assignment → follow-up → attribution. Already has a `recruiting` lead type |
| ↳ Agent runtime | `…/migrations/20260601100000_agent_runtime.sql` | Sessions, private memory, versioned skills, tool calls, traces |
| ↳ Token security | `…/migrations/20260531234512_integration_settings_and_oauth_tokens.sql` | Service-role-only token store; `safe_mode` + `live_*` gates |
| ↳ Academy schema | `…/migrations/20260612125900_academy_base_schema.sql` | Feed, daily entries, scorecard, weekly progress |
| ↳ Architecture docs | `…/docs/architecture/` | `ARCHITECTURE.md`, `SECURITY.md`, `USER_MANAGEMENT.md`, `AUTOMATION.md`, `ZAPIER_VS_N8N_AUDIT.md` |
| ↳ Permissions | `…/lib/permissions.ts`, `…/lib/impersonation.ts` | Role gating; owner impersonation |
| **AI Realtor Pro** | `jeremy-axon-master-build-folder/AI-Realtor-Pro-Final/` | Closest existing agent-facing product |
| ↳ Product spec | `00-operations/aionui-bootstrap/project-handoffs/ai-realtor-pro-build-handoff.md` | The best agent-facing product definition in the estate |
| ↳ AI provider router | `…/lib/ai/router.ts` | Typed inputs, retry, timeout, honest mocks. Port this pattern |
| ↳ Follow Up Boss client | `…/lib/integrations/fub.ts` | Clean server-only FUB client |
| ↳ Coach knowledge | `…/legends_realtor_coach_knowledge/`, `…/packages/prompts/` | Real estate coaching + marketing prompts |
| ↳ AI Twin / SEO research | `…/deep-research-report-ai-twin-for-seo-aeo-geo.md` | Agent personal-branding positioning |
| **Ecosystem master doc** | `00-operations/aionui-bootstrap/project-handoffs/fhbn-ai-realtor-pro-legendsos-marketing-ecosystem-master.md` | How Jeremy already reasons about connected products |

## Tier 2 — Patterns worth adapting

| What | Path | Use it for |
|---|---|---|
| **FHBN** (consumer real estate site) | `jeremy-axon-master-build-folder/florida-home-buying-network-main/` | Lead payload design, metro-hub content pattern, agent directory + pro profiles |
| ↳ Lead API | `…/services/api.ts`, `…/docs/supabase-leads-setup.md` | Attribution-preserving lead shape |
| **Apex Advisor / training platform** | `loan-factory-product-starter-kit/apps/loan-factory-elite-sales-marketing-training/` | AI Academy blueprint: 101→601 ladder, learner paths, trackers, certifications |
| **Career portal prototype** | `external-career-portal-loanfactory-style/src/components/` | `CompCalculator`, `LicensingRoadmap`, `StateGuide`, `WebinarRegister`, `FAQAccordion` |
| **Marketing Content OS** | `loan-factory-marketing-content-os/` | Brief → prompt → draft → compliance checklist → review → publish |
| ↳ Compliance gate | `…/compliance/` | `do_not_say.md`, `required_disclosures.md`, `pre_publish_checklist.md` — replace content, keep structure |
| ↳ Realtor templates | `…/templates/realtor_co_branded_brief.md`, `…/examples/realtor_campaigns/` | Already realtor-facing |
| **Skool — AI Advantage (Realtors)** | `SKOOL COMMUNITIES/AI Advantage (Realtors)/` | External agent-education funnel assets, onboarding script, setup copy |
| **master-kb** | `master-kb/` | Knowledge base structure for AI bootstrapping. ⚠️ Contains real borrower PII in `03_PIPELINE_AND_BORROWERS/` — read the *structure*, not the records |
| **Social automation method** | `Jeremy's Social Media Automation Engine/` | 90-day calendar → captions → image prompts → platform field map |
| **Realtor GPT knowledge** | `legends-team-builds/legends-customGPTs/` | `legends-realtor-ai-twin-builder`, `legends-realtor-co-marketing-studio`, `13-realtor-newsletter-agent` |
| **Governance discipline** | `00-operations/` | `DECISION-LOG.md`, `RISK-REGISTER.md`, `APPROVAL-QUEUE.md`. Take the ladder, not the volume |

## Tier 3 — Context only

| What | Path | Note |
|---|---|---|
| Workspace operating rules | `README.md`, `AGENTS.md` (root) | Jeremy's standing safety rules — RCRE inherits these |
| Project registry | `00-operations/PROJECT-REGISTRY.md` | Canonical paths, git state, risk ratings for prior projects |
| n8n registry | `05-n8n-automation-registry/` | Registry discipline; see ADR-0004 on the tool itself |
| Model routing | `03-model-routing/` | Provider registry, task→model map, cost controls |
| MCP registry | `04-mcp-connections/` | Server registry, tool scopes, risk levels |
| GOAT Architect API | `goat-architect-api/` | Reference for a clean typed API + OpenAPI surface |
| TERA+ audit | `TERA+ Build/TERA-Product-OS/` | Method reference: how to audit an incumbent platform before replacing it |

---

## Not relevant to RCRE

Recorded so future sessions do not re-investigate: `agent-os/`, `06-desktop-orchestrator/`,
`Building_My_Perfect_Monster_Knowledge_System/`, `barndoplans/`, `Flo-os/`, `MotivationFactory/`,
`VIP_Coaching_Ecosystem_Working/`, `USLLM`, `BlackFame AI`, `GroveAI.Dev`, `OpenHands`,
`AI Video Platform`, `ai-video-factory`, `homevision-studio`, `YouTube_Downloads/`,
`YouTube_Research/`, `Audio Podcast/`, `Loans On Demand Videos/`, `transcripts/`,
`video_summaries/`, `document_summaries/`, and the vendored third-party archives in
`legends-team-builds/` (`AionUi-main.zip`, `OpenSwarm-main.zip`, `UI-TARS-desktop-main.zip`,
`herdr-master.zip`, `multica-main.zip`, `openhuman-main.zip`, `paperclip-master.zip`,
`GitNexus-main.zip`, `hermes-desktop-main.zip`).

## External references

| What | URL |
|---|---|
| RCRE live site | https://rcregroup.com/ |
| RCRE sitemap index | https://rcregroup.com/sitemap.xml |
| Website platform | Luxury Presence (confirmed via `x-powered-by` header) |
