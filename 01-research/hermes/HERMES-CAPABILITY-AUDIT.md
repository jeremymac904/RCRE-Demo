# Hermes Agent — Capability Audit

**Audit date:** 2026-08-19
**Subject:** Hermes Agent by Nous Research
**Version verified:** **0.19.0** (from `pyproject.toml` in the vendored source at
`legends-team-builds/LegendsAgentOS(Hermes)/hermes-agent/`)
**License:** **MIT**, Copyright (c) 2025 Nous Research (verified from `LICENSE`)

**Method:** Current official documentation at `https://hermes-agent.nousresearch.com/docs/`,
cross-checked against the vendored v0.19.0 source tree in Jeremy's workspace (read-only). Where
docs and source disagree, source wins and is noted. Claims not verified are marked
**[UNVERIFIED]**.

---

## 0. What Hermes Agent is

An open-source, self-improving AI agent that runs as a CLI, a desktop app, an API server, and a
messaging gateway across 25+ chat platforms. Its stated identity: *"The self-improving AI agent —
creates skills from experience, improves them during use, and runs anywhere"* (`pyproject.toml`).

It is a **runtime and interface layer**, not an application platform and not a database. That
distinction turns out to be the load-bearing finding of this audit.

**Sources:** [docs index](https://hermes-agent.nousresearch.com/docs/) ·
[desktop](https://hermes-agent.nousresearch.com/docs/user-guide/desktop) ·
[bot mode](https://hermes-agent.nousresearch.com/docs/user-guide/bot-mode) ·
[skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) ·
[memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) ·
[MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) ·
[security](https://hermes-agent.nousresearch.com/docs/user-guide/security) ·
[hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) ·
[cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron) ·
[delegation](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation) ·
[browser](https://hermes-agent.nousresearch.com/docs/user-guide/features/browser) ·
[computer use](https://hermes-agent.nousresearch.com/docs/user-guide/features/computer-use) ·
[API server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server) ·
[plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins) ·
[messaging](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/) ·
[configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) ·
[managed scope](https://hermes-agent.nousresearch.com/docs/user-guide/managed-scope).
All fetched 2026-08-19.

---

## 1. Hermes Desktop

**Architecture.** Electron shell + native React chat surface, TypeScript/ESM. It launches a
headless `hermes serve` backend exposing a JSON-RPC/WebSocket API (`tui_gateway`) and *"reuses the
agent runtime rather than embedding `hermes --tui`."* macOS, Windows, Linux.

**Surfaces.** Chat with streaming tool activity and a right-hand preview rail; left sidebar
(sessions, profiles, skills, memory graph, cron, messaging, bots); right sidebar (file browser,
terminal, git review); customizable status bar; multi-tab and multi-window; HUD mode
(chrome-free always-on-top bar); global-hotkey Quick Entry; artifacts gallery; interactive memory
graph; command palette (Cmd+K/Cmd+P).

**Extensibility — verified against source.** *"A plugin is a single ESM file dropped in
`$HERMES_HOME/desktop-plugins/<id>/plugin.js`; the app loads it within seconds and hot-reloads
every save."*

Contribution areas, enumerated directly from `apps/desktop/src/` in the v0.19.0 tree:

| Area constant | What RCRE could contribute |
|---|---|
| `ROUTES_AREA` | **Full custom pages** — e.g. an `/rcre/today` route |
| `PANES_AREA` | **Custom panes** — e.g. a lead detail pane |
| `SIDEBAR_NAV_AREA` | **Custom sidebar navigation entries** |
| `PALETTE_AREA` | Command-palette commands |
| `KEYBINDS_AREA` | Rebindable keyboard shortcuts |
| `THEMES_AREA` | **Custom themes** (RCRE brand palette) |
| `LAYOUTS_AREA` | Layout contributions |

Plus status-bar items, per the desktop docs.

This is the decisive Phase 12 finding: **routes, panes, and sidebar navigation are first-class
plugin contributions.** RCRE can add real pages, not just shortcuts.

**Branding.** Custom themes (including VS Code Marketplace theme import/conversion), per-profile
rail colour, light/dark, terminal fonts. Plugin-supplied theme contributions. **The application
name, icon, and "Hermes" identity are not documented as replaceable** — see §14.

**Distribution and updates.** Background update check with one-click update; `hermes update` on
CLI. Installers: macOS (self-signed for TCC permission persistence), Windows NSIS, Linux
AppImage/deb/rpm. Profiles export/import as `.tar.gz` including skills, memory, persona, crons,
plugins, settings and appearance — **API keys are stripped**.

**Multi-machine / fleet.** A *"Registered gateways"* list covers local runtime, remote gateways
(LAN, Tailscale, internet), Hermes Cloud instances, and SSH hosts. *"Update all instances on the
Gateways page dispatches `hermes update` to every eligible gateway at once."* Concurrent
multi-profile sessions with cross-profile `@session` links. Per-profile remote gateway host.

**Security caveat (from Jeremy's own plugin README, and consistent with the plugin model):**
*"Disk plugins are trusted renderer code rather than a sandbox."*

---

## 2. Profiles

A profile is a **separate `HERMES_HOME` directory**. Isolated per profile: `config.yaml`, `.env`,
`auth.json` (OAuth tokens), `MEMORY.md` + `USER.md`, skills (with a per-profile
`.bundled_manifest`), sessions, cron jobs, **MCP server configuration**, and logs (secrets
auto-redacted).

Because `config.yaml` is per-profile, **MCP servers, tool filters, approval settings, and hooks are
all per-profile.** This is what makes role-scoped agents viable.

**Distribution:** *"Profile Distributions: Share a Whole Agent"* — export/import a complete setup as
one file.

**Isolation warning (important):** *"Don't point two agent processes at the same Hermes home
directory"* — concurrent writes conflict. Each agent needs its own profile.

---

## 3. Memory — the most consequential limitation

| Property | Finding |
|---|---|
| Files | `MEMORY.md` (~800 tokens / 2,200 chars) and `USER.md` (~500 tokens / 1,375 chars) |
| Location | `~/.hermes/memories/` — local filesystem |
| Session store | SQLite at `~/.hermes/state.db`, FTS5 full-text search over past conversations |
| Scope | *"scoped per profile by design"* |
| Cross-profile sharing | **Not supported** |
| Team / central knowledge | **"No team collaboration or central knowledge repository exists"** |
| Retrieval semantics | Injected as a **frozen snapshot at session start**; read-only during the session; writes persist to disk but appear in prompts only after restart |
| Editing | Substring matching for add/replace/remove |
| Alternative | External memory providers (Honcho, Mem0, 8 options) |

**Conclusion:** Hermes memory is *personal agent notes* measured in hundreds of tokens. It is not a
CRM, not a knowledge base, and not a shared brokerage record. Any architecture that relies on
Hermes memory as RCRE's system of record is unsound. This single finding preserves the case for the
RCRE data platform.

---

## 4. Skills

**Format.** `SKILL.md` with YAML frontmatter: `name`, `description`, `version`, optional
`platforms`, and `metadata.hermes` (`tags`, `category`, `requires_toolsets`,
`fallback_for_toolsets`). Body sections: When to Use / Procedure / Pitfalls / Verification.
Compatible with the agentskills.io standard.

**Progressive disclosure — three levels:** `skills_list()` metadata (~3k tokens) →
`skill_view(name)` full content → `skill_view(name, path)` specific reference file. *"The agent only
loads the full skill content when it actually needs it."* This matters at RCRE's likely skill count
(25+): metadata cost stays bounded.

**Location.** `~/.hermes/skills/` is *"the primary directory and source of truth."* Also external
directories via `config.yaml`, and project-local `.hermes/skills/` or `.agents/skills/`.

**Authoring.** Hand-written, or agent-authored via the `skill_manage` tool (*"the agent's
procedural memory"*) with `create` / `patch` / `edit` / `delete` / `write_file`. The `/learn`
command turns arbitrary source material into a skill.

**Distribution — the key org mechanism.** *Custom taps*: **"A tap is any GitHub repo (public or
private — private needs `GITHUB_TOKEN`) laid out like this"** with a `skills/` directory. Added via
`hermes skills tap add owner/repo`. This is a version-controlled, private, org-controlled skill
distribution channel — exactly what a brokerage skill library needs.

**Versioning and drift control.** `hermes skills check` reports upstream changes; `hermes skills
update` reinstalls. Content hashes detect drift, and **"Skills you have edited locally… are skipped
by `hermes skills update` so your changes are never silently overwritten."** Force overwrite
requires `--force`.

That property cuts both ways for a brokerage: it protects agent customisation, and it means **a
compliance-critical skill correction will not reach an agent who has locally edited that skill**
unless RCRE forces it. See guardrails doc.

**Governance.** `skills.write_approval: true` stages agent-authored skills in
`~/.hermes/pending/skills/` for review (`/skills pending`, `/skills diff`, `/skills approve`).
Profiles can opt out of bundled skills (`--no-skills`, `hermes skills opt-out`).

**Security.** All hub installs pass a security scanner checking *"data exfiltration, prompt
injection, destructive commands."* Trust levels from `builtin` to `community`. Project skills get
scan-time quarantine.

---

## 5. MCP

- **Transports:** stdio (local subprocess) and HTTP (remote endpoint).
- **Auth:** static bearer headers, **OAuth 2.1** (*"Hermes handles discovery, client
  identification, PKCE, token exchange, refresh, and step-up auth"*), mTLS, and `${VAR}`
  substitution from `~/.hermes/.env`.
- **Tool filtering — technically enforced:** per-server `include` (whitelist) or `exclude`
  (blacklist), fnmatch globs supported; `include` wins if both present. Example given:
  `exclude: [delete_customer]`.
- **Credential isolation for stdio:** *"Hermes does not blindly pass your full shell environment.
  Only explicitly configured `env` plus a safe baseline are passed through"* — only
  `PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR` and XDG vars survive; *"All other
  environment variables (API keys, tokens, secrets) are stripped."*
- **Injection defence:** invisible Unicode TAG characters stripped from tool results.
- **Custom servers:** fully supported, no catalogue dependency.
- **Scope:** configured in `config.yaml` → therefore **per profile**.
- **Limits:** parallel tool calls require opt-in (`supports_parallel_tool_calls: true`); MCP
  sampling rate-limited (`max_rpm: 10`, `max_tool_rounds: 5`).

---

## 6. Hooks — where technical enforcement actually lives

Four parallel systems: **gateway hooks** (`HOOK.yaml` + `handler.py` in `~/.hermes/hooks/`),
**plugin hooks** (`ctx.register_hook()`), **shell hooks** (`hooks:` in `config.yaml`, any
language), and **outbound webhooks** (`hooks.outbound:` — *"Push signed lifecycle events to
external HTTP endpoints"*).

**Blocking hooks (enforcement points):**

| Hook | Capability |
|---|---|
| **`pre_tool_call`** | **Block** (`{"action":"block","message":…}`), **modify args** (`{"action":"modify","args":{…}}`), or **escalate to human approval** (`{"action":"approve"}`). Shell hooks blocking via **exit code 2**. `fail_closed: true` blocks when the hook itself fails. |
| `pre_gateway_dispatch` | `skip` (drop message), `rewrite` (replace text), or `allow` |
| `pre_verify` | `continue` — keep the agent working rather than accepting its answer (bounded by `agent.max_verify_nudges`, default 3) |
| `transform_tool_result` / `transform_terminal_output` / `transform_llm_output` | Rewrite content before the model or user sees it |

Everything else (`post_tool_call`, `post_llm_call`, `on_session_start/end`, `subagent_stop`, …) is
observer-only.

*"The first valid directive wins (Python plugins registered first, then shell hooks)."*
*"Errors are caught and logged, never crashing the agent."*

**This is the mechanism that makes RCRE's prohibited-action list enforceable in code rather than in
prompt text.**

---

## 7. Security model

Eight documented layers: user authorization (allowlists + DM pairing) · dangerous-command approval ·
file-write safety · container isolation · MCP credential filtering · context-file scanning ·
cross-session isolation · input sanitization.

**Approvals.** `approvals.mode`: `smart` (auxiliary LLM risk assessment, uncertain cases escalate),
`manual`, `off`. **Fail-closed timeout** — no response within the window denies the command.

**YOLO mode.** `--yolo` / `/yolo` / `HERMES_YOLO_MODE=1` disables approval prompts for a session,
with a red banner and status-bar indicator. **It does not override the hardline blocklist.**

**Hardline blocklist.** `rm -rf /`, fork bombs, `dd` on block devices — *"refused to run…regardless
of --yolo…or user explicitly clicking allow always."* Trips before the approval layer.

**`approvals.deny`.** User-defined glob patterns that *"block matching terminal commands
unconditionally — before --yolo…are consulted."* Note: *"Deny rules apply to host-reaching
backends… Isolated container backends skip the guard stack entirely."*

**File writes.** Always-blocked: `~/.ssh/`, `~/.aws/`, `/etc/sudoers`, Hermes `auth.json`/`.env`
under `HERMES_HOME`, and `.env*`/`.envrc` anywhere. `HERMES_WRITE_SAFE_ROOT` hard-restricts writes
to listed prefixes.

**Gateway authorization.** Order: per-platform allow-all → DM pairing approved list → platform
allowlist → global allowlist → global allow-all → **default deny**. DM pairing uses 8-char codes
from a 32-char unambiguous alphabet, 1-hour expiry, 5-failure lockout, `chmod 0600` on pairing data.
Two-tier admin vs regular users per scope, via `allow_admin_from` and `user_allowed_commands`.

**Containers.** Docker/Singularity with all Linux capabilities dropped, `no-new-privileges`,
pids-limit 256, CPU/memory/disk caps. *"Dangerous command checks are skipped because the container
itself is the security boundary."*

**Other.** SSRF protection (RFC 1918 + cloud metadata blocked, fail-closed on DNS failure,
re-validated per redirect hop); Tirith pre-exec content scanning (homograph URLs, pipe-to-interpreter,
terminal injection); context-file injection scanning.

**Audit.** Approval history in `~/.hermes/state.db`. `hermes approvals suggest` mines past decisions
into allowlist proposals, excluding destructive classes.

**Honest limits.** Context-injection scanning is pattern detection, not cryptographic enforcement.
Audit is **per-profile local SQLite** — there is no centralized org audit store.

---

## 8. Cron and scheduling

Schedules: relative one-shot (`30m`), intervals (`every 2h`), cron expressions (`0 9 * * *`), ISO
timestamps, and natural language. Created via `/cron add`, `hermes cron create`, the `cronjob` tool,
or conversation.

Delivery: local files (`~/.hermes/cron/output/`) **and messaging platforms** — Telegram, Discord,
Slack, WhatsApp, Signal, Matrix, email, SMS. `all` fans out to every configured home channel.
`[SILENT]` suppresses delivery while still saving output for audit.

Features: job chaining (`context_from`), continuity mode, **no-agent mode** (script-only, no LLM
tokens), per-job model pins, pre-dispatch config validation with a `blocked_config` state that
alerts once and spends no tokens.

**Critical limitation:** *"The documentation does not mention webhooks or event-driven triggers.
Triggers are limited to time-based scheduling, manual triggering via `cronjob(action="run")`, and
pre-run scripts with `wakeAgent` gates."* **Hermes cron is time-driven, not event-driven.**
Cron-run sessions also cannot create further cron jobs.

Storage is per-profile: `~/.hermes/cron/jobs.json`, `executions.db`.

---

## 9. API server — the inbound event path

This closes the gap §8 opens.

| Endpoint | Purpose |
|---|---|
| `POST /v1/chat/completions` | OpenAI-compatible, streaming or not |
| `POST /v1/responses` | Server-side conversation state via `previous_response_id` |
| **`POST /v1/runs`** | **Create an agent run** with SSE progress — external systems can trigger Hermes |
| `POST /v1/runs/{run_id}/stop` | Interrupt a turn |
| **`POST /v1/runs/{run_id}/approval`** | **Resolve a pending human approval gating tool execution** |
| Jobs API | REST create/modify/pause/run for scheduled work |
| `GET /v1/models`, `GET /v1/capabilities` | Discovery |

**Auth:** `API_SERVER_KEY` bearer token required on every deployment — *"The API server gives full
access to hermes-agent's toolset, including terminal commands."* CORS disabled by default.
Binds `127.0.0.1:8642`; `API_SERVER_HOST` for remote. Multi-user isolation via profiles with
separate ports and keys; `gateway.multiplex_profiles` for per-profile routing.

**Implication for RCRE:** the RCRE backend can (a) trigger Hermes runs on business events, and
(b) surface Hermes approval decisions inside an RCRE-controlled UI rather than only in the desktop
app.

---

## 10. Subagents

Spawned via `delegate_task`. **Up to 3 concurrent by default** (configurable, no hard ceiling);
over-limit batches return tool errors rather than silently truncating.

**Context isolation is total:** *"Subagents start with a completely fresh conversation. They have
zero knowledge of the parent's conversation history, prior tool calls, or anything discussed before
delegation."* Everything needed must be passed in `goal` and `context`.

Toolsets inherit from the parent minus `delegate_task` (leaf agents), `clarify`, `memory`,
`send_message`, `cronjob`. Both roles keep `execute_code`.

Roles: `leaf` (default) and `orchestrator` (can spawn workers when `max_spawn_depth` is raised).
There are **no custom subagent types** — only these two roles plus prompt/toolset scoping.

Only the final summary re-enters the parent context. Cost guidance: pin `delegation.model` to an
inexpensive model while the main session stays on a frontier model.

---

## 11. Messaging gateways

**25+ platforms.** Telegram, Discord, Slack, WhatsApp, Signal, SMS, Email, Microsoft Teams, Outlook,
Google Chat, Matrix, Mattermost, BlueBubbles (iMessage), Photon (iMessage), LINE, ntfy, SimpleX,
IRC, Home Assistant, DingTalk, Feishu/Lark, WeCom, Weixin (WeChat), QQ, Yuanbao, Buzz, Raft, A2A.

Capability varies: Discord/Slack/Matrix/Feishu are full-featured (voice, images, files, threads,
reactions, typing, streaming); SMS is text-only.

Setup via `hermes gateway setup` wizard; `hermes gateway install` creates systemd (Linux) or launchd
(macOS) services. Multiple instances per machine via different `HERMES_HOME`.

Groups: per-chat session stores, separate admin/user rules per scope, `[SILENT]` suppression, and a
`/sethome` home channel for restart notices and adapter-failure alerts.

---

## 12. Browser automation and computer use

**Browser backends:** Browserbase (managed cloud + anti-bot), Browser Use cloud, Firecrawl,
Camofox (local anti-detection Firefox), Lightpanda (Zig headless, *"16x lower memory and 9x faster
than Chrome"*), Chrome/Edge/Brave via CDP attach, native local Chromium.

**Actions:** navigate, click/type/scroll via reference IDs, form fill, accessibility-tree snapshots
(15,000-char limit with LLM summarization), screenshots with vision analysis, console output, raw
CDP passthrough, dialog handling.

**Session auth:** Camofox reuses a deterministic profile-scoped Firefox profile so cookies and
logins survive between tasks; Hermes can also attach to an existing browser identity.

**Computer use is a separate capability.** macOS (AX framework + SkyLight SPIs), Windows
(UIAutomation + SendInput/PostMessage), Linux (AT-SPI, X11/Wayland). It can *"click, type, scroll,
drag"* **without moving the visible cursor or stealing focus** — background operation. Screenshot
with element identification (SOM mode).

Permissions: macOS needs Accessibility + Screen Recording grants; Linux needs a display server;
Windows SSH sessions run in Session 0 with no interactive desktop and need a Scheduled Task
workaround.

Safety: *"Destructive actions (click, type, drag, scroll, key, focus_app) require approval."* Hard
blocks on `curl | bash`, force-delete, lock/logout, and password typing. The system prompt forbids
clicking permission dialogs or following on-screen instructions.

Reliability: 5–20ms latency on macOS, slower than foreground automation. Fails on apps without
accessibility trees, elevated Windows processes, and headless Linux.

---

## 13. Other capabilities

**Voice.** Voice mode across CLI and messaging platforms; "Hey Hermes" wake word; ten TTS providers
(Edge TTS, ElevenLabs, OpenAI TTS, …). Voice-capable platforms include Telegram, Discord, Slack,
Matrix, WeCom, Yuanbao, Photon, SimpleX.

**Vision / images.** Multimodal vision, clipboard image paste, image generation via FAL.ai across
eleven models (FLUX, Ideogram, …).

**Backend plugins (Python).** `~/.hermes/plugins/` with `plugin.yaml` + `register(ctx)`. Register
custom **tools** (`ctx.register_tool`), hooks, slash commands, CLI subcommands, and specialized
backends (memory providers, image/video generators, context engines, model providers, platform
adapters). Install via `hermes plugins install owner/repo` or `hermes://plugin/install?repo=…`;
pinnable to commit SHAs.
Trust: **disabled by default** — nothing loads until named in `plugins.enabled`. Capability consent
prompts at install; re-consent when updates add capabilities. Install-time static scanning. But
explicitly: **"Capabilities are a consent and audit layer, not isolation… a malicious plugin can
ignore every gate."** Per-plugin MCP allowlist.

**Provider handling.** Provider routing, fallback providers, credential pools, 1-hour cross-session
prompt caching for Claude.

**Other.** Checkpoints and rollback (working-directory snapshots before file changes), context files
(`.hermes.md`, `CLAUDE.md`), context references (files/folders/diffs/URLs injected into messages),
batch processing, code execution (Python calling Hermes tools), ACP/IDE integration (VS Code, Zed,
JetBrains), SOUL.md personality.

---

## 14. Commercial deployment — licensing, branding, administration

**Licensing.** MIT. Permits use, copy, modify, merge, publish, distribute, sublicense, and sell.
**No licensing obstacle to commercial brokerage deployment or to a paid RCRE product built on it.**
MIT requires the copyright notice and licence text be retained in substantial portions.

**Branding.** Themeable and plugin-extensible. Jeremy's own Legends plugin README states the
approach candidly: *"This is an experience-layer brand. The official Hermes Agent engine, provider
architecture, OAuth, updates, voice, skills, memory, cron, messaging, MCP, profiles, projects,
tools, and plugin host remain upstream-owned"* — and it displays **"Powered by Hermes Agent."**
Full white-labelling (renaming the app, replacing the icon, removing Hermes identity) is **not a
documented feature**. It would require forking the Electron shell, which forfeits the auto-update
path. **[UNVERIFIED]** whether Nous Research offers any trademark/branding arrangement.

**Central administration — Managed Scope.** `/etc/hermes/config.yaml` and `/etc/hermes/.env`,
root-owned, 0644/0755, relocatable via `HERMES_MANAGED_DIR`. Precedence: **managed → user → defaults**,
above even shell environment variables, leaf-level merged.

**Managed Scope limitations, stated in the docs:**
- Enforcement *"relies solely on filesystem permissions"*
- The managed `.env` is **world-readable** — *"unsuitable for high-sensitivity secrets"*
- *"nothing stops the agent from setting a different value inside its own subprocess shell"* — the
  boundary is **advisory rather than absolute**
- **Out of scope:** signed files, remote MDM delivery, group-scoped permissions, hard agent-level
  boundaries

**Fleet management.** The Gateways page lists registered gateways and can dispatch `hermes update`
to all eligible instances. There is **no central admin console** for policy, no per-user
provisioning system, no org-wide audit aggregation, and no role/entitlement management.

---

## 15. Limitations that matter for a brokerage deploying to licensed agents

Ranked by how much they constrain RCRE.

| # | Limitation | Consequence for RCRE |
|---|---|---|
| **L1** | **Memory is ~1,300 tokens, per-profile, with no cross-profile or team sharing and "no central knowledge repository"** | Hermes cannot be the system of record. RCRE must own the data platform. |
| **L2** | **No centralized org audit store** — approvals and sessions live in per-profile local SQLite | A brokerage needs a supervisable, retained audit trail. RCRE must capture it server-side via outbound webhooks + its own MCP server. |
| **L3** | **Managed Scope is advisory, world-readable, no MDM** | Policy cannot be hard-enforced from the OS layer. Enforcement must live in RCRE's MCP server and `pre_tool_call` hooks, which RCRE controls. |
| **L4** | **Cron is time-driven only; no inbound event triggers** | "New lead arrives → agent acts" requires the RCRE backend to call `POST /v1/runs` or message the gateway. Not native. |
| **L5** | **Per-machine install; Electron desktop; no native mobile app** | Agents work from phones and cars. Mobile access is via messaging gateways only — a real UX constraint, not a fatal one. |
| **L6** | **Desktop plugins are "trusted renderer code rather than a sandbox"; backend plugin capabilities are "not isolation"** | Only RCRE-authored, reviewed plugins may be deployed. No agent-installed plugins on managed profiles. |
| **L7** | **Locally-edited skills are skipped by `skills update`** | A compliance fix may silently fail to reach an agent who edited that skill. Needs `--force` policy + server-side verification. |
| **L8** | **Skills, memory, and credentials live on the agent's machine** | Agent departure = data on a personal laptop. Client data must stay in RCRE's platform, retrieved via MCP, never cached into profile memory. |
| **L9** | **Subagents start with zero parent context** | Delegation requires expensive explicit context passing; often slower and costlier than a single session. |
| **L10** | **No white-label; "Powered by Hermes Agent"** | RCRE's recruiting claim must be about the *system*, not a wholly-owned app. Manageable, but a positioning constraint. |
| **L11** | **Setup burden on non-technical users** | Install, permissions (macOS TCC), provider keys, profile import. Needs a genuine onboarding path, not a README. |
| **L12** | **Upstream velocity** — the vendored tree shows PR numbers in the tens of thousands | Fast-moving dependency. Requires a disciplined upgrade process (Jeremy already wrote one). |
| **L13** | **`approvals.deny` is skipped by isolated container backends** | Guardrail configuration must account for which terminal backend a profile uses. |
| **L14** | **Provider costs are per-agent** | 13+ agents running frontier models on scheduled briefings is a real recurring cost; needs modelling. |

---

## 16. Precedent — Legends Agent OS

Jeremy has already built a vertical product on Hermes:
`legends-team-builds/LegendsAgentOS(Hermes)/` — *"Mortgage-focused desktop AI companion built as an
upstream-compatible extension of official Hermes Agent."*

**What it contains:** five role profiles (`legends-loan-officer`, `legends-processor`,
`legends-team-leader`, `legends-marketing`, `legends-admin`), 15 vertical skills under
`skills/legends/`, a desktop plugin, 8 cron templates, a custom MCP policy gateway
(`integrations/legends-mcp/`), a typed API contract (`integrations/legends-api/`), plus permission
model, threat model, data-handling and upstream-strategy docs.

**Its stated posture:** *"Official Hermes source remains intact under `hermes-agent/`… Core changes:
None planned or required for P0. The official disk desktop-plugin SDK, profiles, skills, MCP client,
and config surfaces are sufficient."*

**Its permission ladder** — Read / Human approval / Strong approval / Prohibited — with *"Identity in
P1 comes from trusted authentication, never model-provided claims."* That last clause is the single
most important sentence in the whole precedent and RCRE should adopt it verbatim.

**The honest caveat — and it is a significant one.**

The plugin README describes an ambitious full `/legends` workspace, but the shipped `plugin.js` is
**77 lines** contributing three command-palette entries and one keybind.

`git status` on the vendored tree (dated 2026-07-31, unrelated to this audit) reveals why:

```
 M apps/desktop/src/app/chat/sidebar/index.tsx      ?? apps/desktop/src/app/today/index.tsx
 M apps/desktop/src/app/contrib/surfaces.tsx        ?? apps/desktop/src/app/workspaces/index.tsx
 M apps/desktop/src/app/routes.ts                   ?? apps/desktop/src/app/shell/legends-chrome.tsx
 M apps/desktop/src/app/types.ts                    ?? apps/desktop/src/app/chat/sidebar/legends-profile-panel.tsx
 M apps/desktop/src/themes/presets.ts               ?? apps/desktop/src/store/atlas-context.ts
 M apps/desktop/src/components/chat/intro.tsx
 M apps/desktop/src/i18n/en.ts  M apps/desktop/src/i18n/zh.ts  M .../about-settings.tsx
```

The Legends "Today" and "Workspaces" pages, the custom shell chrome, the profile panel, the theme,
and the routing changes were implemented as **direct modifications to Hermes core desktop source** —
nine modified files and five new ones — **not** as plugin contributions.

**This directly contradicts that project's own `Upstream_Strategy.md`**, which states: *"Core
changes: None planned or required for P0. The official disk desktop-plugin SDK, profiles, skills,
MCP client, and config surfaces are sufficient."* In practice they were not sufficient for the
experience that was wanted.

**Two conclusions follow, and they matter for RCRE:**

1. The precedent proves the **governance design** (profiles, skills, permission ladder, MCP policy
   gateway, upgrade procedure) — which remains genuinely valuable.
2. It provides **evidence against** the assumption that a rich custom desktop workspace is
   comfortably achievable through the plugin SDK alone. The one team that tried ended up patching
   core, which forfeits clean upstream merges — exactly the outcome the upstream strategy was
   written to avoid.

RCRE should treat "build RCRE Today as a custom desktop route" as **unproven and higher-risk than it
appears**, and should not commit a phase to it without a time-boxed spike.
