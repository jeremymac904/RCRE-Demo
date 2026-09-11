# RCRE Integration Architecture — MCP, APIs, and the Automation Ladder

**Date:** 2026-08-19
**Covers:** Phase 8 (MCP and integrations) and Phase 11 (computer use / browser automation)

---

## 1. The integration ladder

Ranked by reliability, auditability, and maintenance cost. **Always choose the highest rung that
works.**

| Rank | Method | When it is right | Why it beats the rung below |
|---|---|---|---|
| **1** | **Supported API** | A documented, authenticated, versioned API exists | Deterministic, testable, rate-limited, versioned, auditable |
| **2** | **MCP** | Wrapping an API (or RCRE's own data) for agent use | Everything in rank 1, plus tool-level filtering, OAuth handling, and per-profile scoping enforced by Hermes |
| **3** | **Webhook** | The system pushes events outward | Event-driven, no polling — but one-way |
| **4** | **Controlled browser automation** | No API, but a stable authenticated web UI | Works — but breaks on UI change, is slow, and may violate ToS |
| **5** | **Computer use** | Desktop-only software with no web UI | Last resort. Slowest, most fragile, hardest to audit |
| **✗** | **Do not automate** | Legal instruments, licensed judgement, fund movement | Some things should stay human |

**Ranks 1–2 are where RCRE should live.** Rank 4 is acceptable for read-only research on public
sites. Rank 5 should be an explicitly justified exception, approved case by case.

---

## 2. The RCRE MCP server — the centre of the architecture

This is the most important thing RCRE builds after the database itself.

**Why it must exist.** Hermes memory is ~1,300 tokens with no team sharing and no central knowledge
repository (Capability Audit §3). Every meaningful use case needs RCRE data. MCP is the sanctioned
path, and it is where RCRE's authority model lives.

**Transport:** HTTP (remote), so one server serves every agent's profile and RCRE controls it
centrally. Not stdio — stdio would put the logic on each agent's laptop and defeat central
governance.

**Auth:** OAuth 2.1 — Hermes *"handles discovery, client identification, PKCE, token exchange,
refresh, and step-up auth"* natively. Each agent authenticates as themselves.

**The load-bearing rule:**

> **Identity and entitlement are resolved server-side from the authenticated token. Never from a
> parameter the model supplies.**

If an `agent_id` argument determines what data comes back, the assistant can be talked into
requesting someone else's book. Adopted verbatim from Jeremy's Legends permission model.

**Tool design principles:**

- Narrow, purposeful tools (`rcre_leads_list_mine`) — not a generic `rcre_query(sql)`
- Read tools and write tools clearly separated
- Every write tool returns what it *would* do when called in draft mode
- Every call logged server-side with identity, arguments, and result summary — **this is RCRE's
  audit trail**, since Hermes audit is per-profile and local
- Consent state returned alongside any contact, so a drafting skill cannot ignore it
- Use Hermes per-server `exclude`/`include` filtering as defence in depth — but never as the
  primary control

**Proposed tool surface (illustrative):**

| Group | Tools |
|---|---|
| People | `people_search`, `person_get`, `person_activity`, `person_note_add` |
| Leads | `leads_list_new`, `leads_unanswered`, `lead_get`, `lead_assign`, `lead_status_set` |
| Tasks | `tasks_due`, `task_create`, `task_complete` |
| Transactions | `transactions_active`, `transaction_get`, `transaction_milestones` |
| Listings | `listings_mine`, `listing_get`, `listing_create` |
| Knowledge | `knowledge_search` (returns text **with citation**) |
| Marketing | `campaign_draft_create`, `campaign_submit_for_approval` |
| Comms | `message_draft_create`, `message_send` *(strong approval, consent-checked)* |
| Broker only | `brokerage_metrics`, `agent_activity`, `recruiting_pipeline`, `exceptions_list` |

---

## 3. Integration decisions by system

### RCRE's own systems

| System | Method | Notes |
|---|---|---|
| **RCRE database / CRM** | **MCP (rank 2)** | The RCRE MCP server. Central to everything |
| **RCRE knowledge base** | **MCP** | Retrieval with citations. **Not** Hermes memory |
| **RCRE portal** | Direct — same backend | The portal and MCP server share one data layer and one permission model |

### Communication and productivity

| System | Method | Notes |
|---|---|---|
| **Google Workspace (Gmail, Calendar, Drive)** | **MCP or direct API (rank 1–2)** | Mature APIs, OAuth. Per-agent auth so each agent reaches only their own mail. Pending discovery C5 |
| **Microsoft 365 (Outlook, Teams, OneDrive)** | **MCP or direct API** | Same. Whichever RCRE actually runs |
| **Email sending (marketing)** | **Direct API (rank 1)** | Through RCRE's backend so consent, suppression, and audit are enforced server-side — **never** letting Hermes send directly |
| **SMS** | **Direct API via RCRE backend (rank 1)** | **TCPA consent enforced in RCRE data.** Hermes drafts; RCRE sends |
| **Phone system** | API if available | Call logging is the valuable part. Discovery C6 |
| **Calendar** | **MCP (rank 2)** | Read for briefings; writes approval-gated |

### Real estate systems

| System | Method | Notes |
|---|---|---|
| **MLS / IDX** | **API where licensed (rank 1)** — otherwise **do not** | ~4 MLSs (Capability constraint from ADR-0005). **Licence terms govern everything.** No scraping, no redistribution, no caching beyond permitted retention. Agent-roster data must never be repurposed for recruiting |
| **Luxury Presence** | **Webhook or API if offered; else form-post capture (rank 1/3)** | Priority is capturing leads into RCRE, not automating the CMS. Discovery C4/C15 |
| **Lead providers (Zillow, Realtor.com)** | **API/webhook (rank 1/3)** | Most offer lead delivery. Discovery D4 |
| **Transaction management (Dotloop/SkySlope/Brokermint)** | **API (rank 1)**, else **browser (rank 4) read-only** | Discovery C7. Never modify executed documents by any method |
| **E-signature (DocuSign etc.)** | **API (rank 1)** — read status only | **Never send or execute** a signature request autonomously |
| **Public records / tax / permits** | **Browser (rank 4)** | Legitimate rank-4 use: public data, read-only, no login, no ToS issue |
| **DNC registry** | **API (rank 1) — mandatory** | Any calling list must be screened. Non-negotiable |

### Marketing and analytics

| System | Method | Notes |
|---|---|---|
| **Social publishing** | **API via RCRE backend (rank 1)** | Publishing stays approval-gated and logged. Draft in Hermes, approve in RCRE, publish from RCRE |
| **Image generation** | **Hermes native** | FAL.ai, 11 models, already integrated |
| **Analytics (GA4, Search Console)** | **MCP or API (rank 1–2)** | Read-only |
| **Review platforms (Google, Zillow)** | **API read (rank 1)** | Monitoring native; **responses approval-gated** |
| **Canva / design tools** | API if available, else skip | Low priority |

### Business systems

| System | Method | Notes |
|---|---|---|
| **Accounting / commission** | **Read-only API (rank 1)** or **not automated** | **No fund movement, ever.** Read for reporting only |
| **Academy / training** | Direct — RCRE-owned | Part of the RCRE platform |
| **HR / onboarding docs** | API or manual | Low volume, high sensitivity |

### Should not be automated

Contract execution · price changes · anything committing brokerage funds · fair-housing judgements ·
legal interpretation · anything requiring a licensed professional's judgement.

---

## 4. Browser automation — where rank 4 is acceptable

Hermes supports Browserbase, Browser Use, Firecrawl, Camofox, Lightpanda, and CDP attach to
Chrome/Edge/Brave.

**Acceptable rank-4 uses for RCRE:**

| Use | Why acceptable |
|---|---|
| Public property/tax/permit records | Public data, read-only, no login, no ToS conflict |
| Market and competitive research | Public web |
| County and municipal data | No APIs exist |
| Recruiting research on public profiles | Public data — **but never MLS rosters** |
| School / flood / demographic-adjacent *factual* sources | **Factual only.** Never used to steer |

**Unacceptable without explicit approval and a documented ToS review:**

| Use | Concern |
|---|---|
| Logging into MLS through a browser | Almost certainly violates MLS terms. Credentialed access via automation risks the brokerage's MLS membership — a business-ending outcome |
| Automating a transaction management platform | Legal documents; UI change causes silent failure |
| Automating any system with a working API | Choosing rank 4 over rank 1 is a defect, not a shortcut |
| CRM cleanup by UI automation | Bulk mutation with no transaction and no rollback |
| Website administration | One misclick is public |

**Reliability caveats:** 15,000-character snapshot truncation with LLM summarization; cloud sessions
consume credits and auto-clean after ~2 minutes idle; Chrome 136+ requires a dedicated user-data-dir.
SSRF protection blocks private/internal addresses by default — leave that on.

---

## 5. Computer use — rank 5, exception only

macOS (AX + SkyLight), Windows (UIAutomation), Linux (AT-SPI). Notably it can *"click, type, scroll,
drag"* **without moving the visible cursor or stealing focus**, so it runs in the background. Safety:
*"Destructive actions (click, type, drag, scroll, key, focus_app) require approval"*, with hard
blocks on `curl | bash`, force-delete, lock/logout, and password typing.

**Recommendation for RCRE: disabled by default in all agent profiles.**

Justification:
- Latency 5–20ms per action, slower than foreground automation, and far slower than an API
- Requires macOS Accessibility + Screen Recording grants — a serious permission surface on an
  agent's personal laptop
- Fails on apps without accessibility trees and on elevated Windows processes
- Auditing "the agent clicked something" is materially weaker than auditing an API call
- Every RCRE integration target either has an API, has a web UI, or should not be automated

**The narrow legitimate case:** a broker-side, RCRE-administered workstation running a scheduled
export from a legacy desktop application that offers no API and no web UI. That is a real pattern in
real estate back-office software. If discovery surfaces one, it gets its own ADR, its own machine,
and its own approval — it does not get switched on fleet-wide.

---

## 6. Where the MCP boundary sits

```
   Agent's Hermes profile
   ├── Hermes native tools (web, browser, files, image gen, voice)
   ├── Google/Microsoft MCP        → agent's own mail + calendar (agent-authenticated)
   └── RCRE MCP server (HTTP, OAuth 2.1)  ◄── THE boundary
                │
                ▼
        RCRE backend  ── identity & entitlement resolved here, server-side
                     ── consent enforcement
                     ── compliance gates
                     ── full audit log
                │
                ▼
        RCRE Postgres  +  integrations (email, SMS, social, TM, MLS-licensed)
```

**Everything sensitive passes through one door RCRE owns.** Outbound sending, social publishing,
and record mutation happen in the RCRE backend — not in Hermes — so consent, approval, and audit are
enforced in one place regardless of which interface the agent used.

---

## 7. Build order

| Step | Deliverable | Depends on |
|---|---|---|
| 1 | RCRE MCP server, **read-only tools**, OAuth 2.1, full server-side audit | RCRE database (roadmap Phase 1) |
| 2 | Knowledge retrieval tool with citations | Knowledge base |
| 3 | Draft-creating write tools (drafts only — nothing sends) | — |
| 4 | Google **or** Microsoft MCP (whichever RCRE runs) | Discovery C5 |
| 5 | Calendar read | Step 4 |
| 6 | Approval-gated send path **through the RCRE backend** | Consent model |
| 7 | Lead-provider webhooks into RCRE capture | Discovery D4 |
| 8 | Transaction management read | Discovery C7 |
| 9 | MLS/IDX read — **only if licensing permits and a need survives** | Discovery C3/F4 |

Steps 1–3 are the ones that unlock RCRE Today and RCRE Command. Everything after is incremental.
