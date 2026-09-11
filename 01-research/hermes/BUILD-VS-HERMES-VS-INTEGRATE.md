# Build vs. Hermes vs. Integrate — Decision Matrix

**Date:** 2026-08-19
**Covers:** Phase 16

**Legend** — **B** RCRE builds · **HN** Hermes native · **HC** Hermes customization (skill, profile,
plugin, MCP, cron) · **3P** third-party integration · **HY** hybrid
**Phase** refers to [ROADMAP-DRAFT.md](../../05-planning/ROADMAP-DRAFT.md) as revised in
[RCRE-ARCHITECTURE-V2-PROPOSAL.md](RCRE-ARCHITECTURE-V2-PROPOSAL.md).

---

## Data and system of record

| Capability | B | HN | HC | 3P | HY | Recommended | Reason | Risk | Phase |
|---|---|---|---|---|---|---|---|---|---|
| **Database / system of record** | ✅ | — | — | — | — | **RCRE builds** (Postgres/Supabase) | Hermes memory is ~1,300 tokens, per-profile, *"no central knowledge repository."* Non-negotiable | Low | 1 |
| **CRM data model** (people, pipelines, stages, tasks, activity, transactions) | ✅ | — | — | — | — | **RCRE builds** | Relational, multi-user, audited. Nothing in Hermes does this | Low | 1 |
| **Lead capture** | ✅ | — | — | — | — | **RCRE builds** | RCRE owns none of its lead data today. Highest-value, lowest-risk build | Low | 1 |
| **Lead scoring** | ✅ | — | — | — | — | **RCRE builds — deterministic** | A model must not invent scores used to evaluate people and route revenue | Med | 3 |
| **Knowledge system** | ✅ | — | ✅ | — | ✅ | **Hybrid** — RCRE stores + MCP retrieval with citations | Content in RCRE; Hermes retrieves. Never seeded into profile memory | Med | 4 |
| **Audit log** | ✅ | — | ✅ | — | ✅ | **Hybrid** — RCRE server-side is authoritative; `hooks.outbound` feeds it | Hermes audit is per-profile local SQLite. A brokerage needs supervisable central audit | **High** | 1 |
| **File storage** | ✅ | — | — | ✅ | ✅ | **Hybrid** — RCRE for records, Drive/SharePoint for working docs | Retention rules are RCRE's obligation | Med | 3 |

## Identity, permissions, compliance

| Capability | Recommended | Reason | Risk | Phase |
|---|---|---|---|---|
| **Authentication** | **RCRE builds** (Supabase Auth) | One identity across portal and MCP. Hermes profiles are not an identity system | Low | 1 |
| **Permissions / entitlements** | **RCRE builds** — enforced in the MCP server | Profiles shape behaviour; only RCRE grants authority. Identity resolved server-side, never model-supplied | **High** | 1 |
| **Compliance controls** | **Hybrid** — RCRE MCP (primary) + `pre_tool_call` hooks + tool absence | Prompts are guidance, not controls | **High** | 1–4 |
| **Approval workflow** | **Hybrid** — RCRE owns approval state; Hermes surfaces it; `POST /v1/runs/{id}/approval` closes the loop | Approval must be auditable server-side | **High** | 4 |
| **Consent / TCPA / DNC** | **RCRE builds** — enforced in the send path | Legal exposure. Cannot live in a skill | **High** | 1 |

## Interfaces

| Capability | Recommended | Reason | Risk | Phase |
|---|---|---|---|---|
| **Agent Portal (web)** | **RCRE builds — primary, mandatory** | Mobile, zero-install, instantly revocable, fully branded, best for structured work | Low | 3 |
| **Broker/Admin console** | **RCRE builds** | Structured UI beats conversation for pipelines, tables, bulk work | Low | 2–3 |
| **Hermes Desktop** | **Hermes native + thin RCRE plugin** — optional power surface | Voice, memory graph, artifacts, HUD, multi-channel cron come free. Recruiting showpiece | Med | 3 |
| **RCRE Today** | **Hybrid** — RCRE data + Hermes synthesis; rendered in **both** portal and desktop | ~80% RCRE data, ~20% Hermes. Portal guarantees universal access | Med | 3 |
| **Broker Command Center** | **Hybrid** — narrated brief (Hermes) + real dashboard (RCRE) | Conversation for attention; UI for investigation | Med | 3 |
| **Custom desktop routes/panes** | **Hermes customization — spike first** | `ROUTES_AREA`/`PANES_AREA` verified in source, but a rich custom workspace is unproven on this SDK | Med | 4 (spike in 3) |
| **Mobile** | **RCRE responsive portal + SMS** | No native Hermes mobile client. This combination is genuinely sufficient | Med | 3 |
| **Recruiting site** | **RCRE builds** | Public, SEO, fully branded. Nothing to do with Hermes | Low | 2 |
| **AI Academy** | **RCRE builds** + Hermes as the practice environment | Content platform is RCRE's; Hermes is what students learn to use | Low | 5 |

## Agent intelligence

| Capability | Recommended | Reason | Risk | Phase |
|---|---|---|---|---|
| **AI Assistant / agent runtime** | **Hermes native** | This is the decisive reuse. Sessions, tools, providers, streaming, voice, approvals already exist and are hardened | Med | 3–4 |
| **Agent memory (personal)** | **Hermes native** | MEMORY.md / USER.md / SOUL.md are exactly right for personal voice and preference | Low | 3 |
| **Agent memory (client/business facts)** | **RCRE builds** | Must not live on agent laptops. PII-to-memory hook blocks it | **High** | 1 |
| **Skills** | **Hermes customization** — private GitHub tap | Purpose-built: `hermes skills tap add rcre/rcre-skills`, versioned, drift-detected | Med | 3 |
| **AI Twin (voice/style)** | **Hermes native** — SOUL.md + USER.md + brand skill | A genuine native win. Would be months of work to build | Low | 3 |
| **Subagents** | **Hermes native — research fan-out only** | Total context isolation + 3 concurrent + no clarify makes sequential creative pipelines worse, not better | Low | 4 |
| **Provider routing / fallback / caching** | **Hermes native** | Already built, already good | Low | 3 |

## Automation

| Capability | Recommended | Reason | Risk | Phase |
|---|---|---|---|---|
| **Scheduled work (cron)** | **Hermes native** | Natural language + cron, multi-channel delivery, `[SILENT]`, no-agent mode, job chaining. **Supersedes the "in-app jobs" assumption for agent-facing work** | Low | 3 |
| **Event-driven automation** | **RCRE builds the event bus** → invokes Hermes | Hermes cron is time-driven only. RCRE owns triggers, rules, and audit | Med | 4 |
| **Business-logic jobs** (scoring, SLA timers, digests) | **RCRE builds** | Deterministic, server-side, must run whether or not an agent's laptop is on | Low | 1–3 |
| **Webhooks (inbound)** | **RCRE builds** | Lead providers, e-sign, TM push to RCRE | Low | 3 |
| **Webhooks (outbound)** | **Hermes native** (`hooks.outbound`) + RCRE receiver | Signed lifecycle events → RCRE audit | Low | 3 |
| **n8n** | **Neither, for now** | ADR-0004 reasoning holds. Hermes cron covers agent-facing scheduling; RCRE jobs cover business logic | Low | — |

## Communication

| Capability | Recommended | Reason | Risk | Phase |
|---|---|---|---|---|
| **Messaging gateways** | **Hermes native — SMS + one internal channel** | 25+ supported; only 2–3 are useful. Each gateway is a support surface | Med | 3 |
| **Email (agent mailbox)** | **3P via MCP** (Google/Microsoft) | Mature APIs, per-agent OAuth | Med | 4 |
| **Email (marketing send)** | **RCRE builds the send path** | Consent, suppression, audit enforced server-side. Hermes drafts only | **High** | 4 |
| **SMS send** | **RCRE builds the send path** | TCPA. Never let Hermes send directly | **High** | 4 |
| **Voice interaction** | **Hermes native** | Voice mode + wake word + 10 TTS providers. Genuinely valuable in a car | Low | 3 |
| **Calendar** | **3P via MCP** | Read for briefings; writes approval-gated | Low | 4 |
| **Tasks** | **RCRE builds** | Broker must see them; they outlive a session | Low | 1 |

## Work product

| Capability | Recommended | Reason | Risk | Phase |
|---|---|---|---|---|
| **Content generation** | **Hermes native + RCRE compliance gate** | Generation is commodity; the *gate* is the product | **High** | 4 |
| **Marketing assets / images** | **Hermes native** (FAL.ai, 11 models) | Already integrated | Med | 4 |
| **Social publishing** | **RCRE builds the publish path** | Approval-gated, logged, brokerage-liable | **High** | 5 |
| **Transactions** | **RCRE builds** + 3P read | Milestones and tasks in RCRE; **never modify executed documents** | **High** | 4 |
| **Analytics / reporting** | **RCRE builds** + Hermes narrates | Numbers must be deterministic and reproducible | Med | 3 |
| **Browser automation** | **Hermes native — public read-only research** | Rank 4 on the ladder. Never for MLS login or TM mutation | Med | 4 |
| **Computer use** | **Disabled by default** | Every target has an API, a web UI, or should not be automated. Exceptions get their own ADR | **High** | — |

## Additional capabilities identified

| Capability | Recommended | Reason | Risk | Phase |
|---|---|---|---|---|
| **Fleet provisioning / offboarding** | **RCRE builds** | No Hermes admin console. Revoking MCP + OAuth + gateway is RCRE's runbook | **High** | 3 |
| **Skill-version attestation** | **RCRE builds** | `skills update` skips locally-edited skills — RCRE must *see* who is stale | Med | 4 |
| **Cost monitoring per agent** | **RCRE builds** | 13+ profiles on frontier models is a real recurring cost | Med | 3 |
| **Onboarding runbook + installer** | **RCRE builds** | Non-technical agents, macOS TCC prompts, profile import | **High** | 3 |
| **Licence / CE expiry monitoring** | **Hybrid** — RCRE data + Hermes cron | Multi-state compliance | Med | 3 |
| **Fair-housing review queue** | **RCRE builds** | The single highest-liability workflow in the product | **High** | 4 |

---

## The three-sentence summary

**RCRE builds the truth:** database, identity, permissions, consent, audit, compliance gates,
deterministic scoring, the web portal, and the recruiting site.

**Hermes provides the intelligence and the surface:** agent runtime, personal memory and voice,
skills, scheduling, multi-channel delivery, voice mode, research, drafting, and the desktop power
experience.

**RCRE integrates rather than builds:** email, calendar, SMS transport, e-signature, transaction
management, MLS/IDX where licensed, analytics, and review platforms — always at the highest rung of
the integration ladder that works.
