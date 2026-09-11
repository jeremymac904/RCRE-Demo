# ADR-0009 — Hermes Desktop is an optional power surface; the web portal is primary

**Status:** **APPROVED IN PRINCIPLE** — 2026-08-19 by Jeremy McDonald
**Date:** 2026-08-19 · **Approved in principle:** 2026-08-19
**Decision owner:** Jeremy McDonald
**Revises:** the non-goal *"No desktop application"* in RCRE-ECOSYSTEM-ARCHITECTURE.md §6

> **Approval scope.** Direction approved, with an explicit anti-fork condition added by Jeremy
> (see §Decision item 5). The `ROUTES_AREA` proof of concept is **explicitly not yet authorized.**

## Context

The V1 architecture listed "No desktop application" as an explicit non-goal. That reasoning was
about **building and maintaining a desktop shell** — a real cost with no clear RCRE benefit, learned
from LegendsOS v2's Electron shell.

Hermes Desktop is a different proposition: an MIT-licensed Electron+React app that already exists,
auto-updates itself, and exposes a plugin SDK. Contribution areas verified directly from the
v0.19.0 source (`apps/desktop/src/`): `ROUTES_AREA`, `PANES_AREA`, `SIDEBAR_NAV_AREA`,
`PALETTE_AREA`, `KEYBINDS_AREA`, `THEMES_AREA`, `LAYOUTS_AREA`, plus status-bar items. Plugins are a
single ESM file with hot reload.

It also brings voice mode, wake word, memory graph, artifacts gallery, HUD mode, global-hotkey quick
entry, multi-channel cron delivery, and a command palette — none of which RCRE would build.

Against that: **no native mobile client** (agents work from cars and showings); **no central admin
console**, with Managed Scope *"advisory rather than absolute"*; **per-machine install friction**
including macOS Accessibility and Screen Recording grants; **data and credentials on personal
laptops**, which is an offboarding problem; and plugins that are *"trusted renderer code rather than
a sandbox."*

**The counter-evidence is stronger than it first appears.** Jeremy's own Legends desktop plugin
documents an ambitious custom workspace but **ships 77 lines** of palette commands and one keybind.
`git status` on the vendored Hermes tree (changes dated 2026-07-31) shows why: the Legends "Today"
and "Workspaces" pages, custom shell chrome, profile panel, and theme were built by **patching Hermes
core** — five new files under `apps/desktop/src/` plus nine modified core files including
`routes.ts`, `contrib/surfaces.tsx`, `types.ts`, and `themes/presets.ts`.

That **contradicts that project's own `Upstream_Strategy.md`** (*"Core changes: None planned or
required for P0. The official disk desktop-plugin SDK… [is] sufficient"*). The only team to attempt
a rich custom Hermes desktop workspace routed around the plugin SDK and patched core — forfeiting
the clean upstream merges the strategy existed to protect. Whether that reflects a real SDK
limitation or expedience under deadline cannot be determined from the artifacts, but it is the only
real-world data point available.

## Decision

**Both surfaces, with a clear primary.**

1. **The RCRE web portal is primary and mandatory.** It is mobile-accessible, zero-install,
   instantly revocable, fully branded, centrally controlled, and better for structured work. **RCRE
   Today and RCRE Command are guaranteed to exist in the portal**, rendered from RCRE data.
2. **Hermes Desktop is optional and opt-in** — an RCRE-configured profile with the RCRE MCP server,
   RCRE skill tap, RCRE theme, and RCRE cron routines, plus a **thin** plugin contributing sidebar
   navigation, palette commands, keybinds, and status-bar items.
3. **RCRE will not build or maintain its own desktop shell.** Extension only via the official plugin
   SDK.
4. **Hermes Desktop is treated as:** an optional power-user interface · an AI workspace · a
   recruiting differentiator · and potentially an agent daily operating surface. *(Jeremy,
   2026-08-19.)*
5. **RCRE will NOT maintain a forked Hermes Desktop** unless a future proof of concept demonstrates
   the required functionality cannot be achieved through supported extension mechanisms **and
   Jeremy explicitly approves maintaining a fork.** *(Jeremy, 2026-08-19 — standing constraint.)*
   **That proof of concept is not authorized yet.**
6. **A rich custom `ROUTES_AREA` page is a time-boxed spike, not a committed phase.** Decide from the
   spike and from real agent behaviour. **"We ended up needing to patch core" is a spike failure
   condition that stops the work** — not a signal to proceed. Patching core forfeits auto-updates and
   upstream security fixes, which is the main reason to adopt Hermes rather than build (ADR-0007).

Revised non-goal wording:

> **RCRE will not build or maintain its own desktop shell.** RCRE may distribute and configure
> Hermes Desktop as an optional power surface, extended only through the official plugin SDK. The
> browser portal remains the primary and mandatory interface for all agents.

## Alternatives considered

- **Portal only.** Rejected: forfeits voice, wake word, scheduled multi-channel delivery, and the
  single most impressive artifact RCRE could show a recruit.
- **Desktop only / desktop-primary.** Rejected: no mobile, no central revocation, high install
  friction against the project's top delivery risk (adoption), and client data on personal machines.
- **Build a rich custom desktop workspace immediately.** Rejected as premature — supported by the
  SDK, but unproven at this scope, including in Jeremy's own precedent.

## Consequences

- Easy: every agent has access on day one via a URL; power users get a deeper tool.
- Easy: the recruiting demo can use the desktop for impact while the portal guarantees delivery.
- Easy: offboarding is clean for the portal; the desktop profile goes inert once MCP and OAuth are
  revoked.
- Hard: two surfaces to keep coherent. Mitigated by both reading the same MCP server and the same
  data.
- Hard: desktop support burden scales per machine. Mitigated by desktop being optional.
- Accepted cost: the desktop surface says "Powered by Hermes Agent."

## Revisit when

- The `ROUTES_AREA` spike shows rich custom pages are cheap and stable
- Hermes ships a mobile client or capable hosted web client
- Managed Scope gains signed policy files and MDM delivery
- Pilot data shows agents overwhelmingly prefer one surface
