# Hermes Agent Research

Deep architecture investigation conducted 2026-08-19, before accepting the V1 RCRE architecture.

**The question:** what should RCRE build, what should Hermes provide, and what should RCRE integrate
rather than build?

**The answer in one line:** RCRE builds the truth (data, identity, permissions, consent, audit,
compliance, portal); Hermes provides the intelligence and the surface (runtime, personal memory,
skills, scheduling, voice, multi-channel delivery, desktop); RCRE integrates everything else at the
highest rung of the integration ladder that works.

## Documents

| Document | Answers |
|---|---|
| [HERMES-CAPABILITY-AUDIT.md](HERMES-CAPABILITY-AUDIT.md) | What Hermes v0.19.0 actually does, verified against docs **and** source. Includes the 14 limitations that matter for a brokerage |
| [HERMES-RCRE-USE-CASE-MAP.md](HERMES-RCRE-USE-CASE-MAP.md) | Broker and agent use cases classified by who supplies what. Includes RCRE Today and RCRE Command feasibility line by line |
| [HERMES-DESKTOP-STRATEGY.md](HERMES-DESKTOP-STRATEGY.md) | Should Hermes Desktop be RCRE's primary interface? Challenges the "no desktop application" non-goal |
| [HERMES-PROFILES-AND-SKILLS.md](HERMES-PROFILES-AND-SKILLS.md) | Per-agent profile architecture, contamination risks, and the 39-skill RCRE library design |
| [HERMES-BOTS-AND-GATEWAYS.md](HERMES-BOTS-AND-GATEWAYS.md) | Should RCRE build seven bots? (No.) Which messaging channels are worth it? (Two.) |
| [HERMES-INTEGRATION-ARCHITECTURE.md](HERMES-INTEGRATION-ARCHITECTURE.md) | The integration ladder, the RCRE MCP server design, and where browser/computer use is acceptable |
| [HERMES-AUTOMATION-MAP.md](HERMES-AUTOMATION-MAP.md) | Cron vs event-driven work, and where subagents genuinely help vs agent theatre |
| [HERMES-SECURITY-GUARDRAILS.md](HERMES-SECURITY-GUARDRAILS.md) | The five-tier action model, enforced in code across four technical layers |
| [BUILD-VS-HERMES-VS-INTEGRATE.md](BUILD-VS-HERMES-VS-INTEGRATE.md) | The definitive capability-by-capability decision matrix |
| [RCRE-ARCHITECTURE-V2-PROPOSAL.md](RCRE-ARCHITECTURE-V2-PROPOSAL.md) | The proposed revised architecture, CRM-vs-conversation analysis, the recruiting demo, and ADR dispositions |

## Verified facts worth remembering

- **Hermes Agent v0.19.0, MIT licensed**, Nous Research. No commercial obstacle.
- **A Bot *is* a profile.** Bot Mode is a UI layer over profiles.
- **Memory is ~1,300 tokens, per-profile.** Docs: *"No team collaboration or central knowledge
  repository exists."* This is why RCRE still needs its own data platform.
- **`pre_tool_call` hooks can technically block tool calls** (`fail_closed`, exit code 2). Real
  enforcement, not prompt text.
- **Private GitHub taps** are the org skill-distribution mechanism.
- **Desktop plugin contribution areas** (verified in source): `ROUTES_AREA`, `PANES_AREA`,
  `SIDEBAR_NAV_AREA`, `PALETTE_AREA`, `KEYBINDS_AREA`, `THEMES_AREA`, `LAYOUTS_AREA`.
- **Cron is time-driven only.** The API server's `POST /v1/runs` is the inbound event path.
- **Managed Scope is advisory**, world-readable, with no MDM. Do not depend on it for policy.

## Precedent — and its most important lesson

Jeremy has already built a Hermes vertical: `legends-team-builds/LegendsAgentOS(Hermes)/` (read-only).
It contributes a genuinely valuable governance design — role profiles, a permission ladder, an MCP
policy gateway, and a tested upstream-upgrade procedure.

**But it also contains the investigation's strongest counter-evidence.** Its desktop plugin is 77
lines, and `git status` on the vendored tree shows why: the custom "Today" and "Workspaces" pages,
shell chrome, and theme were built by **patching Hermes core** (5 new files + 9 modified core files),
not through the plugin SDK — contradicting that project's own `Upstream_Strategy.md` claim that no
core changes were needed.

**Read it as:** the governance design is reusable; the claim that a rich custom desktop workspace is
comfortably achievable through the plugin SDK is **not supported by the one attempt on record.**

## Status

All conclusions are **proposals**. ADRs 0007–0009 are new; 0003, 0004 and 0006 carry appended
revisions; 0002 and 0005 were reviewed and kept. Nothing is Accepted without Jeremy's approval.
