# Hermes Desktop Strategy — Should It Be RCRE's Primary Interface?

**Date:** 2026-08-19
**Challenges:** the non-goal *"No desktop application"* in
[RCRE-ECOSYSTEM-ARCHITECTURE.md](../../03-architecture/RCRE-ECOSYSTEM-ARCHITECTURE.md) §6

---

## 1. Why the original non-goal was written

The architecture doc excluded a desktop app because LegendsOS v2 ships an Electron shell that adds
real maintenance cost for no clear benefit, and RCRE has no need to maintain a desktop client.

**That reasoning was about building and maintaining a desktop shell.** Hermes Desktop is a different
proposition: a shell that already exists, is MIT-licensed, auto-updates itself, and exposes a
first-class plugin API. The original non-goal does not automatically extend to it, so it deserves a
fresh answer.

---

## 2. What Hermes Desktop actually permits — verified

Contribution areas read directly from `apps/desktop/src/` in the v0.19.0 source tree:

`ROUTES_AREA` · `PANES_AREA` · `SIDEBAR_NAV_AREA` · `PALETTE_AREA` · `KEYBINDS_AREA` ·
`THEMES_AREA` · `LAYOUTS_AREA` — plus status-bar items per the official docs.

Delivery model: *"A plugin is a single ESM file dropped in
`$HERMES_HOME/desktop-plugins/<id>/plugin.js`; the app loads it within seconds and hot-reloads every
save."*

**So RCRE could contribute, without forking anything:**

| RCRE surface | Mechanism |
|---|---|
| **RCRE Today** — full page | `ROUTES_AREA` + `SIDEBAR_NAV_AREA` |
| **RCRE Command** — broker page | `ROUTES_AREA`, shown only in broker profiles |
| Lead detail / contact pane | `PANES_AREA` |
| Transaction pane | `PANES_AREA` |
| "Log this call", "Draft follow-up", "Start listing intake" | `PALETTE_AREA` |
| Keyboard shortcuts | `KEYBINDS_AREA` |
| RCRE brand theme (light + dark) | `THEMES_AREA` |
| Status-bar: today's exceptions, approval count | status-bar items |

Alongside these, the agent gets **for free**: chat with streaming tool activity, voice mode and wake
word, memory graph, cron management UI, messaging/bot management, artifacts gallery, HUD mode,
global-hotkey Quick Entry, file drag-and-drop, multi-tab/multi-window, command palette, find-in-page,
and remappable shortcuts.

Rebuilding that surface area in a browser portal is not a sprint. It is the majority of a year.

---

## 3. The honest counter-evidence

Jeremy's own Legends Agent OS is the closest precedent, and it is instructive in both directions.

Its plugin README describes a `/legends` full-page workspace with Today, Atlas, Workspaces, Skills,
Memory, Research, Automation, and Messages views. The **shipped `plugin.js` is 77 lines** and
contributes three command-palette entries plus one keybind, with a header stating: *"The experience
shell is native Hermes Desktop (single navigation, native Today/Atlas/Workspaces routes, built-in
Legends theme). This plugin only contributes lightweight command-palette / keybind shortcuts to
native routes."*

**The reason the plugin is thin is documented in the repository's own git state.** `git status` on
the vendored Hermes tree (changes dated 2026-07-31) shows the Legends custom experience was built by
**editing Hermes core**, not by using the plugin SDK:

- **New files:** `apps/desktop/src/app/today/index.tsx`, `apps/desktop/src/app/workspaces/index.tsx`,
  `apps/desktop/src/app/shell/legends-chrome.tsx`,
  `apps/desktop/src/app/chat/sidebar/legends-profile-panel.tsx`,
  `apps/desktop/src/store/atlas-context.ts`
- **Modified core files:** `routes.ts`, `contrib/surfaces.tsx`, `types.ts`, `themes/presets.ts`,
  `chat/sidebar/index.tsx`, `components/chat/intro.tsx`, `settings/about-settings.tsx`, `i18n/en.ts`,
  `i18n/zh.ts`

**This contradicts that project's own `Upstream_Strategy.md`**, which asserts *"Core changes: None
planned or required for P0. The official disk desktop-plugin SDK… [is] sufficient."* It was not.

**This is the single most important piece of counter-evidence in the entire investigation**, and it
changes the risk assessment materially:

- The plugin SDK's contribution areas are real and verified — but the one team that attempted a rich
  custom workspace **routed around them and patched core instead.**
- Patching core forfeits clean upstream merges on a very fast-moving dependency, which is precisely
  the outcome the upstream strategy existed to prevent.
- Whether that reflects a genuine SDK limitation or simply the path of least resistance under
  deadline is **not determinable from the artifacts**. Either way, it is the only real-world data
  point available, and it points the same direction.

**Consequence for RCRE:** treat a rich custom desktop route as **unproven and higher-risk than the
SDK surface suggests**. Keep the RCRE plugin thin. Time-box any `ROUTES_AREA` spike, and treat
"we ended up needing to patch core" as a spike failure condition that stops the work — not as a
signal to proceed.

---

## 4. Desktop plugin vs. browser portal

| Dimension | Hermes Desktop + RCRE plugin | Conventional browser Agent Portal |
|---|---|---|
| **Dev effort to first useful surface** | **Low** — chat, voice, cron, memory, artifacts, messaging all exist | **High** — every pixel is RCRE's |
| **Dev effort for a rich custom workspace** | Medium, and **partly unproven** on this SDK | High but fully understood |
| **Maintenance** | **Low** for the shell; RCRE maintains only its plugin | High — auth, sessions, streaming, uploads, realtime, accessibility |
| **Updates** | **Automatic**, upstream-driven | RCRE ships every change |
| **Upstream breakage risk** | **Real.** Fast-moving dependency; SDK changes can break the plugin | None |
| **Security** | Plugins are *"trusted renderer code rather than a sandbox"*; local credentials on agent machines | RCRE controls the whole boundary; nothing on the endpoint |
| **UX for agents** | Excellent for conversation, voice, research. **Weaker for dense structured work** | Excellent for tables, pipelines, dashboards, bulk edits |
| **Adoption friction** | **High** — install, macOS TCC permissions, profile import, provider keys | **Low** — a URL and a login |
| **Mobile** | **None natively.** Messaging gateways only | **Responsive web works everywhere** |
| **Central management** | **Weak.** Managed Scope is advisory and world-readable; no MDM; no admin console | **Strong** — server-side roles, instant revocation |
| **Branding** | Theme + plugin naming, but *"Powered by Hermes Agent"*; app name/icon not replaceable | **Fully RCRE** |
| **Distribution** | Per-machine installer + onboarding | Send a link |
| **Support burden** | **High** — every agent's laptop is a deployment | Low — one server |
| **Vendor dependency** | Real, but **MIT-licensed and forkable** — a genuine mitigation | None |
| **Offboarding an agent** | Messy — data and credentials on a personal machine | Clean — revoke the session |

---

## 5. The decisive considerations

**Against desktop-only:**

- **Mobile.** Real estate agents work from cars, showings, and open houses. A desktop-only system
  fails the moment of highest value. Messaging gateways partially cover this — and Telegram/SMS/
  WhatsApp are genuinely good for "what's my day" — but they are not a portal.
- **Offboarding and data custody.** Agents leave. Client data and credentials sitting in
  `~/.hermes/` on a personal laptop is a brokerage data-custody problem, not an inconvenience.
- **Central control.** Managed Scope is explicitly *"advisory rather than absolute"*, world-readable,
  with *"no remote MDM delivery"* and *"no group-scoped permissions."* A brokerage cannot rely on it
  to enforce policy.
- **Adoption.** The delivery risk already flagged as highest in the roadmap is agent adoption.
  Installing a desktop app with accessibility permissions is a materially higher barrier than a URL.

**For desktop:**

- **It is the single most impressive artifact RCRE could put in front of a recruit.** A branded
  desktop application that talks, remembers, researches, and executes is categorically different
  from a web CRM. That is the recruiting objective, directly.
- **The capability gap is enormous.** Voice, wake word, memory graph, artifacts, HUD, multi-channel
  cron delivery — RCRE will not build these.
- **Power users will prefer it.** Top producers with real volume will use the deep tool.

---

## 6. Recommendation

**Both — with a clear primary, and in a specific order.**

### The RCRE portal (web) is the system of record's interface. It is primary and mandatory.

Because it must be: mobile-accessible, instantly revocable, centrally controlled, fully branded,
zero-install, and the place structured work happens (pipelines, tables, bulk edits, dashboards,
recruiting pipeline, admin). It is also where the *broker* lives, and where an offboarding is a
button rather than a laptop retrieval.

Critically, **the portal is where RCRE Today and RCRE Command are guaranteed to exist.** They are
rendered from RCRE data by RCRE code. That makes them available to every agent on every device with
no install.

### Hermes Desktop is the power surface. It is optional, opt-in, and the recruiting showpiece.

Delivered as an **RCRE-configured Hermes profile** with the RCRE MCP server, the RCRE skill tap, RCRE
theme, RCRE cron routines, and a **thin** RCRE plugin contributing navigation, palette commands,
keybinds, and status-bar items that jump to RCRE surfaces.

This inverts the original assumption in a useful way: RCRE does not need to make Hermes Desktop
*feel like an RCRE application*. It needs Hermes Desktop to be **the RCRE agent's power tool**,
visibly RCRE-configured, with the heavy custom UI living in the portal where RCRE controls it.

### Sequencing

| Step | What | Why |
|---|---|---|
| **1** | RCRE MCP server + portal RCRE Today | Works everywhere, no install, proves the data |
| **2** | Hermes Desktop with RCRE profile, skills, theme, cron — **no custom routes yet** | Delivers ~80% of the wow with ~10% of the effort. Validates adoption before investing in custom UI |
| **3** | Thin RCRE plugin: sidebar nav, palette commands, keybinds, status bar | Low risk, high polish, small surface to maintain against upstream churn |
| **4** | **Spike** a custom `ROUTES_AREA` page (RCRE Today in-desktop) | Time-boxed. Answers the unproven question directly |
| **5** | Decide on rich custom routes based on the spike and on real agent behaviour | Evidence, not ambition |

### Revised non-goal

The architecture doc's *"No desktop application"* should be **revised, not deleted**, to:

> **RCRE will not build or maintain its own desktop shell.** RCRE may distribute and configure
> Hermes Desktop as an optional power surface, extended only through the official plugin SDK, with
> the browser portal remaining the primary and mandatory interface.

That preserves the original reasoning — which was sound — while admitting the new evidence.

---

## 7. Conditions that would change this recommendation

**Toward desktop-primary:**
- Hermes ships a native mobile client, or a genuinely capable hosted web client
- Managed Scope gains signed policy files and MDM delivery
- A central org audit/admin console appears
- The `ROUTES_AREA` spike proves rich custom pages are cheap and stable

**Away from Hermes Desktop entirely:**
- Upstream SDK churn repeatedly breaks the RCRE plugin
- Agent-machine credential custody proves unacceptable to counsel or E&O carrier
- Install/permission friction defeats adoption in the design-partner group
- Licensing or branding terms change (currently MIT, so low risk)

---

## 8. Open questions

1. Does the `ROUTES_AREA` API support the data-fetching, auth, and state a real RCRE Today page
   needs? **Requires a spike — not answerable from docs.**
2. How stable is the desktop plugin SDK release-to-release? Needs observation across two or three
   upstream versions.
3. Can plugin visibility be conditioned on profile, so broker routes never render for agents?
   **[UNVERIFIED]** — a plugin can branch on profile, but that is app-layer, not a security boundary.
   Entitlement must be enforced in RCRE's MCP server regardless.
4. What is the realistic per-agent install and onboarding time for a non-technical agent, including
   macOS TCC prompts? Must be measured with a real agent, not estimated.
