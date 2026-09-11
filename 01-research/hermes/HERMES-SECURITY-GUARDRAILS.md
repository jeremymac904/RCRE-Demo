# RCRE Security, Compliance and Human-Approval Model

**Date:** 2026-08-19
**Covers:** Phase 14
**Principle:** Every rule that matters is enforced **in code**, not in a prompt. Prompts and skills
are guidance; they are not controls.

---

## 1. Why prompt-level rules are insufficient

A skill saying "never change a listing price" is a suggestion to a language model. It can be
overridden by a confused instruction, an injected string in a tool result, or a novel phrasing. For a
licensed brokerage where a wrong action can mean a fair-housing complaint, a licence issue, or a lost
transaction, that is not an acceptable control.

RCRE has **four layers of genuine technical enforcement** available. Each rule below is assigned to
at least one of them.

| Layer | Mechanism | Strength |
|---|---|---|
| **A. Tool absence** | Prohibited capability is **never registered** as an MCP tool | **Strongest.** Cannot be invoked because it does not exist |
| **B. RCRE MCP server** | Server-side identity, entitlement, consent, and approval-state checks | **Strong.** RCRE owns and audits it |
| **C. `pre_tool_call` hooks** | Return `{"action":"block"}`, or exit code 2, with `fail_closed: true` | **Strong** for local enforcement |
| **D. Hermes config** | Per-server MCP `exclude`, `approvals.deny` globs, toolset disablement, `HERMES_WRITE_SAFE_ROOT` | **Medium.** Defence in depth; lives on the agent's machine |

**Rule of thumb: if it is truly prohibited, do not build the tool (A).** Everything else is defence
in depth.

---

## 2. Action classification

### PROHIBITED — no tool exists

| Action | Enforcement | Why |
|---|---|---|
| Change a listing price | **A** — no price-write tool | Licensed judgement with fiduciary duty |
| Modify an executed contract | **A** | Legal instrument |
| Execute or send for signature | **A** | Legal act |
| Make a fair-housing judgement | **A + B** | Illegal to automate; human liability |
| Target or filter on protected classes | **A + B + C** | Federal Fair Housing Act |
| Commit or move brokerage funds | **A** | Financial control |
| Delete critical CRM records | **A** — soft-delete only, restore via portal | Irreversibility |
| Change brokerage policy | **A** | Governance |
| Give legal advice | **A + prompt** | Unauthorised practice of law |
| Publish to a public channel without review | **A + B** | Brokerage owns agent marketing liability |
| Contact a DNC-listed or non-consented number | **B** — consent/DNC check in the send path | TCPA |
| Access another agent's book | **B** — server-side identity | Confidentiality |
| Scrape MLS agent rosters for recruiting | **A + policy** | MLS terms; can cost membership |
| Fabricate or incentivise reviews | **A** | Platform ToS, FTC |
| Cache client PII into profile memory | **C** — `pre_tool_call` blocks `memory` writes matching PII patterns | Data custody; agents' personal machines |

### APPROVAL REQUIRED — strong (broker or designated reviewer)

Bulk operations · any first outbound to a new contact · public publishing (social, listing copy,
website, review responses) · CMA/pricing guidance delivered to a client · record merge or delete ·
consent-state change · commission-affecting changes · recruiting outreach · anything referencing a
protected characteristic even factually.

**Enforcement: B** — the RCRE backend refuses to execute without a recorded approval, with approver
identity and timestamp.

### APPROVAL REQUIRED — standard (the agent themselves)

Send a drafted message to an existing consented contact · create/update a task · move a pipeline
stage · schedule an appointment · create a marketing draft · log an activity · update non-critical
contact fields.

**Enforcement: B**, surfaced via Hermes approval UI or `POST /v1/runs/{id}/approval` from the RCRE
portal.

### LIMITED AUTONOMY — no per-action approval, fully logged, reversible

Log a call or note the agent just described · create an internal reminder · advance an internal
checklist · generate a draft that goes nowhere · assemble a briefing · run research · update
*internal-only* fields.

**Enforcement: B** — allowed tools only, everything logged. **Reversibility is the entry criterion.**

### READ — free

Query own book · search knowledge base **with citation** · market and property research · read
calendar/email · view own performance · read transactions and tasks.

**Enforcement: B** — every read logged with identity and scope.

---

## 3. Enforcement mapping

### Layer A — tool absence (design the surface, not the guardrail)

The RCRE MCP server exposes narrow, purposeful tools. There is no `rcre_query(sql)`, no
`rcre_update(table, id, field, value)`, no `listing_price_set`, no `contract_send`. Prohibited
capability is absent by construction.

### Layer B — the RCRE MCP server

Every call, without exception:

1. **Resolve identity server-side** from the OAuth token. **Never** from a model-supplied argument.
   *(Adopted from Jeremy's Legends permission model: "Identity in P1 comes from trusted
   authentication, never model-provided claims.")*
2. **Resolve entitlement** — agent sees own book; team lead sees team; broker sees all. Recruiting
   data is broker/recruiter only.
3. **Check consent** on anything touching outbound communication; return consent state with contacts
   so drafting cannot ignore it.
4. **Check approval state** — write tools refuse without a recorded approval.
5. **Log** identity, tool, arguments, result summary, timestamp. **This is RCRE's audit of record**,
   because Hermes audit is per-profile local SQLite.
6. **Rate limit** per agent.
7. Return **structured output with citations** for knowledge queries.

### Layer C — `pre_tool_call` hooks

Verified capability: block (`{"action":"block","message":…}`), modify args, or escalate to approval;
shell hooks block on **exit code 2**; `fail_closed: true` blocks when the hook itself fails.

Deploy in every RCRE profile:

| Hook | Purpose |
|---|---|
| **PII-to-memory guard** | Block `memory` writes matching client-PII patterns. **The most likely real-world leak.** |
| **Protected-class term guard** | Intercept content-generating calls containing protected-class or steering language → escalate to approval, never silently allow |
| **Outbound guard** | Any send-shaped tool → force approval regardless of skill instructions |
| **Credential guard** | Block reads of `.env`, `auth.json`, credential paths |
| **Audit forwarder** | Post every tool call to the RCRE audit endpoint (paired with `hooks.outbound` signed events) |

All configured with `fail_closed: true` — if the guard cannot run, the action does not happen.

### Layer D — Hermes configuration hardening (per profile template)

- `approvals.mode: smart` (never `off`)
- **YOLO disabled**, with agents instructed never to enable it. *Note: YOLO does not override the
  hardline blocklist or `approvals.deny`, but it does disable ordinary approval prompts — so it must
  be off*
- `approvals.deny` globs for destructive shell patterns — noting these are **skipped by isolated
  container backends**, so terminal backend choice matters
- Per-MCP-server `exclude` filters as belt-and-braces
- Toolsets disabled that the role does not need — **computer use off by default**, shell/code
  execution off in agent profiles
- `HERMES_WRITE_SAFE_ROOT` scoped to a working directory
- `skills.write_approval: true` so agent-authored skills are staged for review
- `plugins.enabled` limited to RCRE-authored, reviewed plugins only
- SSRF protection left on (`security.allow_private_urls` false)

---

## 4. Known gaps and how RCRE closes them

| Gap | Evidence | RCRE mitigation |
|---|---|---|
| **Managed Scope is advisory, world-readable, no MDM** | Docs: *"relies solely on filesystem permissions"*, *"nothing stops the agent from setting a different value inside its own subprocess shell"*, *"unsuitable for high-sensitivity secrets"* | **Do not depend on it.** Enforce in the MCP server (B), which RCRE hosts and the agent cannot modify. Use Managed Scope only for non-sensitive defaults |
| **Audit is per-profile local SQLite** | Capability Audit §7 | RCRE MCP server logs everything server-side; `hooks.outbound` signed lifecycle events to an RCRE endpoint |
| **Desktop plugins are "trusted renderer code rather than a sandbox"** | Legends plugin README | Only RCRE-authored, code-reviewed plugins. No agent-installed desktop plugins |
| **Backend plugin capabilities are "not isolation"** | Docs: *"a malicious plugin can ignore every gate"* | `plugins.enabled` allowlist only; SHA-pinned installs |
| **Locally-edited skills skipped by `skills update`** | Docs | Compliance rules live in the **MCP server**, not only in skills. Force-update policy for compliance-tagged skills. Server-side attestation of installed skill versions |
| **Client data and tokens on agent machines** | Profile model | Records stay in RCRE and are retrieved per query. PII-to-memory hook. Offboarding revokes MCP + OAuth + gateway allowlist, rendering the local profile inert |
| **Context/prompt injection is pattern detection, not proof** | Docs | Treat all tool results and web content as untrusted. Never let retrieved content authorise an action. Outbound guard forces approval regardless of instructions found in content |
| **Gateway = full toolset access from a phone** | Bots doc | Allowlist-only, no allow-all, `user_allowed_commands` restricted, minimal PII in SMS |

---

## 5. Real-estate-specific compliance rules

| Rule | Enforcement |
|---|---|
| **Fair housing** — no steering, no protected-class targeting, no coded language ("safe neighbourhood", "good schools" as a proxy, "family-friendly") | Protected-class hook (C) + mandatory human review of all public-facing generated content (B) + a `do_not_say` reference in the compliance skill |
| **Listing descriptions carry the highest exposure** | Never auto-publish. Always human-reviewed |
| **MLS rules** vary per MLS (~4 for RCRE) | No scraping; API only where licensed; respect display, attribution, and retention terms; never redistribute |
| **Licence display** — AL and FL requirements differ | Templates enforce; compliance skill checks |
| **TCPA / DNC** | Consent as a first-class field with capture text; DNC screening before any call list; enforced in the send path (B) |
| **Advertising** — brokerage identification, team-name rules | Templates + review |
| **Wire fraud** | Advisory delivery tracked per transaction; **never** let an agent generate wire instructions |
| **Record retention** | RCRE-side per state and MLS requirements — not on agent laptops |
| **Supervision** | Broker must be able to review agent AI activity. Server-side audit makes this possible; per-profile local logs would not |

---

## 6. The approval experience

Guardrails fail when they are annoying. Design targets:

- **Batch, don't interrupt.** RCRE Today ends with *one* approval screen for the day's queued
  actions, not fifteen prompts.
- **Show the diff.** Exactly what will be sent, to whom, on what channel, and why it was suggested.
- **One-tap approve on mobile** via the portal, with `POST /v1/runs/{id}/approval` closing the loop.
- **Fail closed.** Hermes already denies on approval timeout; keep that.
- **Explain refusals.** "I can draft this but the broker must approve public content" teaches the
  model's boundary. A silent failure teaches distrust.
- **Escalation path.** Agent → team lead → broker, with the reason attached.

---

## 7. Pre-deployment checklist

- [ ] RCRE MCP server enforces identity server-side; no `agent_id` parameter is ever trusted
- [ ] Prohibited capabilities have **no tool**
- [ ] All five `pre_tool_call` hooks deployed with `fail_closed: true`
- [ ] YOLO off; `approvals.mode: smart`; terminal backend chosen so `approvals.deny` applies
- [ ] Computer use and shell disabled in agent profiles
- [ ] `plugins.enabled` restricted to RCRE-reviewed plugins
- [ ] `skills.write_approval: true`
- [ ] Server-side audit capturing every MCP call, plus `hooks.outbound` to RCRE
- [ ] Consent and DNC enforced in the send path, not in a skill
- [ ] Fair-housing review gate on every public-facing generated asset
- [ ] Offboarding runbook revokes MCP, OAuth, and gateway allowlists
- [ ] PII-to-memory hook tested against real attempts
- [ ] Broker can review any agent's AI activity from the portal
- [ ] Counsel and E&O carrier have reviewed the data-custody model
