# Hermes Profiles and the RCRE Skill Library

**Date:** 2026-08-19
**Covers:** Phase 5 (profile architecture) and Phase 6 (skill library design)

---

## Part 1 — Profile architecture

### The proposal under test

> SHARED RCRE KNOWLEDGE + SHARED VERSION-CONTROLLED RCRE SKILLS + CENTRAL RCRE CRM/DATA PLATFORM +
> INDIVIDUAL HERMES PROFILES

### Verdict: technically sound, with one component that must be built differently than described

Three of the four pillars map cleanly onto verified Hermes mechanisms. One does not.

| Pillar | Mechanism | Sound? |
|---|---|---|
| Individual Hermes profiles | Separate `HERMES_HOME` per agent: own `config.yaml`, `.env`, `auth.json`, memory, skills, sessions, cron, MCP config, logs | **Yes — this is exactly what profiles are** |
| Shared version-controlled RCRE skills | **Private GitHub tap**: *"A tap is any GitHub repo (public or private — private needs `GITHUB_TOKEN`)"*, added via `hermes skills tap add rcre/rcre-skills` | **Yes — purpose-built for this** |
| Central RCRE CRM / data platform | RCRE Postgres, reached through the RCRE MCP server | **Yes — and mandatory** |
| **Shared RCRE knowledge** | ✗ **Not Hermes memory.** Memory is ~1,300 tokens, per-profile, and the docs state plainly: *"No team collaboration or central knowledge repository exists"* | **Must be RCRE-side retrieval via MCP** |

**The correction that matters:** brokerage knowledge — policies, procedures, contracts, scripts,
market data, training — lives in RCRE's knowledge store and is retrieved on demand through an MCP
tool. It is *not* seeded into each agent's `MEMORY.md`. Attempting the latter fails on size, fails on
governance (a policy change would require touching 13+ machines), and fails on auditability.

Skills can carry *doctrine* (how to run a listing intake). The knowledge store carries *content*
(the actual policy text, the actual market numbers). Keep that line clean.

### Recommended profile model

**One profile per human, role-shaped by configuration.**

| Profile | Who | Entitlements via RCRE MCP |
|---|---|---|
| `rcre-agent` | Every licensed agent (one instance each) | Own book only |
| `rcre-team-lead` | Team leaders | Own book + team |
| `rcre-broker` | Broker-owner, managing brokers | Whole brokerage, incl. recruiting |
| `rcre-admin` | Staff / TC / marketing | Scoped by function, no full book |
| `rcre-recruiting` | Recruiter(s) | Recruiting pipeline only |

Each is a **profile template** — a `config.yaml` (model, approvals, hooks, MCP servers, toolsets),
a `SOUL.md`, a skill set, and cron routines — instantiated per person.

**Critical:** the profile does **not** grant permission. The RCRE MCP server does, based on a
server-side identity bound to credentials, never on a claim the model makes. Jeremy's own Legends
permission model already states this correctly: *"Identity in P1 comes from trusted authentication,
never model-provided claims."* Adopt it verbatim.

Profiles shape *behaviour and available tools*. RCRE's backend enforces *authority*. If those two
are ever confused, an agent could ask their assistant for the broker view and get it.

### Personal layer (what genuinely belongs on the agent's machine)

`USER.md` and `MEMORY.md`, `SOUL.md` (voice and style — this is the AI Twin), personal preferences,
market areas, business goals, personal cron routines, personal credentials, and locally-authored
personal skills.

**What must never land there:** client PII, lead lists, transaction detail, commission data. Those
are retrieved per-query through MCP and must not be written into profile memory. This is a real
risk, because the agent *will* try to remember useful things about clients. See "contamination"
below.

### Contamination and isolation risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Client PII drifting into `MEMORY.md`** — the agent writes "Sarah Chen is pre-approved to $450k" as a memory | **High** | `pre_tool_call` hook blocking `memory` writes matching PII patterns; explicit SOUL.md prohibition; periodic automated profile audit. **This is the single most likely failure mode.** |
| Cross-agent leakage via shared machine | Medium | One profile per human; never share a `HERMES_HOME`. Docs warn: *"Don't point two agent processes at the same Hermes home directory"* |
| Agent departs with local memory/skills/tokens | **High** | Keep records in RCRE; offboarding revokes MCP credentials and OAuth immediately — the profile becomes inert. Document in the ICA |
| Agent edits a compliance-critical shared skill | **High** | `hermes skills update` **skips locally-edited skills**. Requires `--force` policy for compliance skills + server-side verification that the enforcing MCP tool, not the skill, holds the rule |
| Agent installs a third-party skill or plugin | Medium | Backend plugins are disabled by default (`plugins.enabled`). Skill taps can be policy-restricted. Note: capability consent is *"not isolation"* |
| Broker tools reachable from an agent profile | **Critical** | Enforced in the MCP server by identity, not by which tools are configured |
| Provider keys on agent machines | Medium | Prefer RCRE-issued scoped keys or a gateway; credential pools where useful |
| Model writes a wrong "fact" into memory and repeats it | Medium | Memory is a *frozen snapshot at session start*, so corrections lag by a restart. Keep facts in RCRE data, not memory |

### Synchronisation and administration challenges — the honest list

1. **No central admin console.** No provisioning, no policy push, no fleet audit. Managed Scope is
   *"advisory rather than absolute"*, world-readable, with no MDM. **RCRE must build the
   administration layer it needs into its own backend** — entitlements, audit, revocation.
2. **Skill updates are pull, not push.** `hermes skills check` / `update` run on the agent's machine.
   RCRE cannot force a distribution. Mitigation: a cron routine per profile that runs
   `skills check/update`, plus a server-side attestation of installed skill versions so RCRE can
   *see* who is stale even if it cannot force them.
3. **Per-machine provisioning.** Install, permissions, profile import, credential setup, per agent.
   The profile export/import path (`.tar.gz`, keys stripped) is the practical tool here.
4. **Version drift** across agents on models, Hermes versions, and skill versions.
5. **Audit is local.** Approvals in per-profile `state.db`. **RCRE must capture its own audit
   server-side** — every MCP call logged by the RCRE server, plus `hooks.outbound` signed lifecycle
   events pushed to an RCRE endpoint.
6. **Cost per agent.** 13+ profiles running scheduled briefings on frontier models is a real
   recurring line item that must be modelled before rollout.

### Deployment sequence

1. Build the RCRE MCP server (read-only first) and the skills tap repo.
2. Author profile templates + `SOUL.md` + cron templates.
3. Pilot with 2–3 design-partner agents. Measure install time, adoption, cost, and PII leakage.
4. Write the onboarding runbook from what actually went wrong in the pilot.
5. Roll out with a named human owner for provisioning and offboarding.

---

## Part 2 — The RCRE skill library

### Design rules

- **Skills carry procedure, not data.** Anything factual comes from MCP at call time.
- **Skills do not carry authority.** A skill can describe an approval step; only the MCP server and
  `pre_tool_call` hooks can enforce it.
- **Compliance-critical skills are marked** and covered by a force-update policy, with the real
  enforcement duplicated server-side.
- **Brokerage-level skills** ship from the RCRE tap and are version-controlled. **Agent-level skills**
  may be personalised locally.
- Use `metadata.hermes.requires_toolsets` so skills hide when their tools are unavailable.

**Risk key:** L = low · M = medium · H = high (client-, money-, or compliance-facing)
**Level:** B = brokerage-governed · A = agent-personalisable

### Agent-facing skills

| Skill | Purpose | Key inputs | Data | Tools / integrations | Output | Approval | Risk | Level |
|---|---|---|---|---|---|---|---|---|
| **rcre-daily-brief** | Assemble RCRE Today | agent id, date | leads, activity, tasks, transactions, contacts, calendar | RCRE MCP, calendar | Prioritised briefing + recommended actions | No (read) | L | B |
| **rcre-lead-conversion** | Work a new lead to contact | lead id | lead, source, history, consent | RCRE MCP | Call script, text draft, email draft | **Yes — before send** | M | B |
| **rcre-daily-prospecting** | "Who should I contact today?" | agent id | contacts, recency, scores, occasions | RCRE MCP | Ranked call list with reasons | No (read) | L | B |
| **rcre-buyer-consultation** | Prep and run buyer consult | contact id | contact, search history, financing | RCRE MCP, MLS-derived market data | Prep brief, needs analysis, next steps | No | L | B |
| **rcre-listing-intake** | Structured seller intake | address, seller | property, comps | RCRE MCP, public records | Listing record + task list | Yes — record write | M | B |
| **rcre-cma-prep** | Assemble a CMA | address, comps criteria | MLS comps **(licensed)**, RCRE history | MLS/IDX, RCRE MCP | Comp set + pricing narrative | **Yes — pricing advice** | **H** | B |
| **rcre-listing-marketing** | Full listing campaign | listing id | listing, media, brand | RCRE MCP, image gen, social | Copy, images, social, email | **Yes — fair housing** | **H** | B |
| **rcre-open-house** | Plan and follow up | listing id, date | listing, registrants | RCRE MCP, calendar | Plan, materials, same-day follow-up drafts | Yes — before send | M | B |
| **rcre-sphere-followup** | Sphere touches | agent id | contacts, recency, occasions | RCRE MCP | Prioritised list + drafts | Yes — before send | M | A |
| **rcre-past-client-followup** | Anniversary / equity / life events | agent id | transactions, contacts | RCRE MCP | Occasion list + drafts | Yes — before send | M | A |
| **rcre-expired-listings** | Expired outreach | market, window | MLS expired **(rules-permitting)**, DNC | MLS, **DNC screening** | Vetted list + scripts | **Yes — DNC + TCPA** | **H** | B |
| **rcre-fsbo** | FSBO outreach | market | public sources, DNC | Browser, **DNC screening** | Vetted list + scripts | **Yes** | **H** | B |
| **rcre-new-construction** | Builder inventory and incentives | market, builder | builder data | Browser, RCRE MCP | Inventory brief, buyer-facing summary | No (research) | L | B |
| **rcre-relocation** | Relocation buyer support | origin, destination, timeline | market, schools, commute | Browser, RCRE MCP | Relocation guide | No | L | B |
| **rcre-investor** | Investment analysis | address, assumptions | rents, taxes, HOA | Browser, RCRE MCP | Cash-flow/return analysis + caveats | **Yes — not investment advice** | **H** | B |
| **rcre-social-media** | Social content | topic, platform | brand, listings | RCRE MCP, image gen | Post set + assets | **Yes — fair housing** | **H** | B |
| **rcre-video** | Video scripting | topic, format | brand, market | RCRE MCP | Script, shot list, captions | Yes if public | M | A |
| **rcre-content-creation** | Long-form / blog / newsletter | topic, audience | market, brand | RCRE MCP, browser | Draft + assets | **Yes** | M | B |
| **rcre-database-cleanup** | Hygiene | agent id, scope | contacts | RCRE MCP | Duplicate/gap/bad-data report + proposed fixes | **Yes — strong for merge/delete** | **H** | B |
| **rcre-transaction-support** | Milestones and chasing | transaction id | transaction, tasks, docs | RCRE MCP, TM/e-sign | Status, overdue items, drafts | Yes — before outbound | M | B |
| **rcre-market-research** | County/market intelligence | county, timeframe | market data | Browser, RCRE MCP | Briefing with sources | No (read) | L | B |
| **rcre-property-research** | Property due diligence | address | public records | Browser | Research brief with sources | No (read) | L | B |
| **rcre-business-planning** | Goals and gap analysis | agent id, goals | production, pipeline, conversion | RCRE MCP | Plan + activity targets | No | L | A |
| **rcre-brokerage-procedures** | "What's our policy on…" | question | knowledge store | RCRE MCP | Answer **with citation** | No (read) | M | B |
| **rcre-referral-generation** | Identify and ask | agent id | contacts, transactions | RCRE MCP | Candidates + drafts | Yes — before send | M | A |
| **rcre-review-generation** | Post-close review requests | transaction id | transaction, consent | RCRE MCP, review platforms | Timing + drafts | **Yes — never fabricate/incentivise** | **H** | B |
| **rcre-ai-twin** | Personal voice and style | agent id | brand, samples | — | Style rules applied to all drafting | No | L | **A** |

### Brokerage-facing skills

| Skill | Purpose | Data | Output | Approval | Risk | Level |
|---|---|---|---|---|---|---|
| **rcre-command-brief** | RCRE Command daily briefing | leads, response times, transactions, recruiting, activity | Briefing + management actions | No (read) | M | B |
| **rcre-recruiting** | Work the recruiting pipeline | recruiting pipeline, engagement | Prioritised prospects + drafts | **Yes — before contact** | **H** | B |
| **rcre-recruiting-research** | Research a named prospect | public sources | Prospect brief | No (read). **Never MLS rosters** | **H** | B |
| **rcre-agent-onboarding** | Drive onboarding to first closing | onboarding checklist | Status, blockers, next actions | Yes — for outbound | M | B |
| **rcre-agent-accountability** | 1:1 prep and coaching | production, activity, pipeline | Prep pack + coaching points | No (read). **Human judgement on people decisions** | **H** | B |
| **rcre-exception-review** | Exception sweep | thresholds + all books | Exception list + interventions | No (read) | M | B |
| **rcre-sop-authoring** | Turn source material into SOP/skill | recordings, docs | Draft SOP / skill | **Yes — broker approves** | M | B |
| **rcre-compliance-review** | Pre-publish screen | asset + rules | Flagged phrases + risk rating | **Advisory only — human decides** | **H** | B |
| **rcre-competitive-intel** | Rival brokerage offers/tech | public sources | Comparison brief | No (read) | L | B |
| **rcre-vendor-research** | Evaluate vendors | public + contracts | Comparison + questions | No | L | B |
| **rcre-license-monitoring** | Licence/CE expiry (AL/FL) | roster, licences | Expiry alerts | No (read) | M | B |
| **rcre-roster-reconciliation** | Site vs MLS vs roster drift | roster, site, MLS | Discrepancy report | No (read) | M | B |

### Skills that should **not** exist

| Not built | Why |
|---|---|
| Autonomous price-change skill | Pricing is a licensed judgement with fiduciary duty |
| Contract execution / modification skill | Legal instrument. Human only |
| Legal advice skill | Unauthorised practice of law |
| Automated review posting | Platform ToS and consumer-protection exposure |
| Demographic/"neighbourhood quality" targeting | **Fair housing.** Prohibited outright |
| Autonomous cold outreach | TCPA/DNC. Approval always |
| Commission or fund movement | Never |

### Tap repository shape

```
rcre/rcre-skills   (private GitHub repo)
├── skills/
│   ├── rcre-daily-brief/
│   │   ├── SKILL.md
│   │   ├── references/     # policy excerpts, script libraries
│   │   └── templates/
│   ├── rcre-listing-marketing/
│   └── …
└── README.md
```

Installed with `hermes skills tap add rcre/rcre-skills` (`GITHUB_TOKEN` for private). Versioned via
frontmatter `version` plus git tags. Compliance-critical skills flagged in `metadata.hermes.tags`
and covered by the force-update policy.

**The governing caution, restated:** a skill is guidance to a model. It is not a control. Every rule
that actually matters must also exist in the RCRE MCP server or a `pre_tool_call` hook, where it is
enforced in code.
