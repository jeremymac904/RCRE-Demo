# RCRE Architecture V2 — Proposal

**Date:** 2026-08-19
**Status:** **Proposal.** Nothing here is Accepted without Jeremy's approval.
**Supersedes nothing yet.** [RCRE-ECOSYSTEM-ARCHITECTURE.md](../../03-architecture/RCRE-ECOSYSTEM-ARCHITECTURE.md)
remains the current document until this is approved. Prior reasoning is preserved, not erased.
**Covers:** Phases 13, 15, 17 of the Hermes investigation brief.

---

## 1. What changed, and what did not

### What did not change

The V1 core thesis survives the investigation intact, and in fact gets stronger:

- **One database, one auth system, one permission model.** Hermes has no system of record —
  memory is ~1,300 tokens, per-profile, with *"no team collaboration or central knowledge
  repository."* RCRE must own its data. (ADR-0002 unaffected.)
- **RCRE owns none of its lead data today.** Still the most urgent problem. Phase 1 is unchanged.
- **Recruiting is the primary objective and the largest gap.** Unchanged.
- **Keep Luxury Presence.** Unchanged (ADR-0005).
- **No stub UI.** Unchanged, and *reinforced* — see §5.

### What changed

| V1 assumption | V2 position |
|---|---|
| RCRE builds the AI assistant and agent runtime | **Hermes provides it.** Sessions, tools, providers, streaming, voice, memory, approvals, skills — hardened and MIT-licensed |
| RCRE builds the automation layer (in-app jobs) | **Split.** Hermes cron for agent-facing scheduled work; RCRE jobs for deterministic business logic |
| "No desktop application" | **Revised.** RCRE will not *build* a desktop shell, but may *distribute and configure* Hermes Desktop as an optional power surface |
| The Agent Portal is the only agent interface | **Portal is primary and mandatory; Hermes Desktop is an optional power surface** |
| Knowledge system built from scratch | **Hybrid** — RCRE stores and governs; Hermes retrieves via MCP with citations |
| One application | **Still one application — plus a runtime.** See ADR-0003 revision in §5 |

**The net effect:** RCRE's build shrinks meaningfully on the intelligence layer and stays exactly the
same on the data layer. That is a good trade, because the data layer is where RCRE's durable value
lives and the intelligence layer is where the commodity is.

---

## 2. Revised layer model

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PUBLIC                                                                  │
│  Consumer site (Luxury Presence — keep)  ·  Recruiting site (RCRE) ·      │
│  Academy public tier (RCRE)                                              │
└───────────────────────────────┬──────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  RCRE PLATFORM — the system of record                     [RCRE BUILDS]  │
│  Postgres · Auth · RLS · people · pipelines · tasks · transactions ·      │
│  knowledge · consent · deterministic scoring · compliance gates ·        │
│  server-side AUDIT · business-logic jobs · event bus                     │
└───────┬──────────────────────────────────────────┬───────────────────────┘
        │                                          │
        │  RCRE MCP SERVER (HTTP, OAuth 2.1)       │  Web app
        │  ── identity resolved SERVER-SIDE ──     │
        ▼                                          ▼
┌────────────────────────────────┐   ┌─────────────────────────────────────┐
│  HERMES RUNTIME     [HERMES]   │   │  RCRE PORTAL          [RCRE BUILDS] │
│  per-agent profiles            │   │  PRIMARY · MANDATORY · MOBILE       │
│  personal memory · SOUL/AI Twin│   │  RCRE Today · RCRE Command ·        │
│  RCRE skill tap · cron         │   │  pipelines · tables · dashboards ·  │
│  voice · research · drafting   │   │  recruiting · admin · approvals     │
│  pre_tool_call guardrails      │   │  Academy                            │
└───────┬────────────────────────┘   └─────────────────────────────────────┘
        │
        ├── Hermes Desktop (optional power surface, thin RCRE plugin)
        └── Messaging: SMS + one internal channel
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  INTEGRATIONS  — all outbound action executes in the RCRE backend        │
│  Email · SMS · Calendar · E-sign(read) · TM(read) · MLS(licensed) ·      │
│  Analytics · Reviews · Social(approval-gated publish)                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**The single most important line in this diagram** is the RCRE MCP server. It is the one door
between the intelligence layer and the truth layer, and RCRE owns both sides of it.

---

## 3. Phase 13 — does RCRE need a conventional CRM front end?

The brief asks whether RCRE primarily needs a *structured data platform with Hermes as the
intelligent interaction layer*, rather than CRM screens agents must manipulate.

**Answer: RCRE needs both, and the split is not close.**

### Where conversation is objectively better

| Task | Why |
|---|---|
| *"Who should I contact today?"* | Ranking + reasoning + explanation. A screen shows a list; the assistant tells you *why* |
| *"Follow up with everyone from my last three open houses who hasn't responded"* | Compound query + batch drafting. This would be three screens and a filter builder |
| Logging a call while walking to the car | Voice, hands-free |
| *"What's our policy on…"* | Retrieval with citation |
| Listing intake | A structured interview beats a 40-field form |
| Research and drafting of every kind | No contest |
| The morning briefing | Synthesis across six data sources |

### Where structured UI is objectively better — and must be built

| Task | Why conversation fails |
|---|---|
| **Scanning a pipeline** | Spatial comparison. Fifty leads as prose is unusable |
| **Bulk operations** | Select 30, reassign. Describing a selection is slower and riskier |
| **Dashboards and trends** | Charts. A model narrating numbers is a worse chart |
| **Reviewing a long draft before sending** | You need to see it, not hear a summary |
| **Approval queues** | Scan, compare, batch-decide |
| **Transaction checklists** | Persistent state you glance at repeatedly |
| **Recruiting pipeline management** | Stage board, drag, compare |
| **Admin: roster, roles, permissions** | High-stakes, must be precise and reviewable |
| **Anything a broker uses to evaluate people** | Must be deterministic, reproducible, and defensible |
| **Onboarding a new agent to the system** | You cannot learn a system you cannot see |

### The design rule

> **Conversation for intent, judgement, and synthesis. Structured UI for scanning, comparison, bulk
> action, and anything a human must verify.**

A useful test: *if the user needs to compare more than three things, or trust a number, build a
screen.* Conversational CRMs fail in practice not because conversation is bad, but because they
remove the ability to *see* — and people need to see their business.

### Consequence for the CRM build

The V1 CRM scope stands, with one refinement: **build fewer screens, but build the right ones.**

Screens RCRE definitely builds: pipeline board · contact record · lead queue · task list ·
transaction checklist · approval queue · dashboards · recruiting pipeline · admin/roster ·
RCRE Today · RCRE Command.

Screens RCRE can **skip**, because conversation genuinely serves better: complex search builders ·
bulk-edit wizards · report builders · "compose message" forms · data-entry-heavy intake forms.

That is a real reduction — probably a third fewer screens than a conventional CRM — without
pretending agents can run a business through a chat box.

---

## 4. Phase 15 — the recruiting differentiator

### What must be true before RCRE can honestly claim *"an AI-powered real estate business operating system"*

Not "we give you ChatGPT." Not "we provide AI training." The claim requires, at minimum:

1. **It knows the agent's actual business.** Their leads, their clients, their transactions, their
   numbers. This is the whole difference, and it requires the RCRE data platform. *(Phase 1)*
2. **It tells them what to do today, unprompted.** RCRE Today, delivered every morning without
   being asked. *(Phase 3)*
3. **It does work, not just talk.** Drafts sent for approval, tasks created, campaigns assembled.
   *(Phase 4)*
4. **It sounds like them.** AI Twin — SOUL.md, their voice, their market, their brand. *(Phase 3)*
5. **It is available where they work.** Phone included. *(Phase 3)*
6. **It knows the brokerage.** Policies, procedures, contracts — answered with citations. *(Phase 4)*
7. **It is safe.** Fair-housing gate, consent enforcement, approval before anything public.
   *(Phases 1–4)*

**Anything less and an experienced agent correctly identifies it as ChatGPT with a logo.** That
recognition is fatal to the recruiting claim, which is why ADR-0006 (no stub UI) matters more here
than anywhere else.

### The smallest compelling demo

**Setup:** one real RCRE agent, real data, ten minutes.

**The demo — in this order:**

1. **06:30, on the recruit's phone.** An SMS arrives: *"Good morning. 3 new leads. 2 haven't been
   followed up. Sarah Chen viewed 4 listings in Mandarin Lakes this week and hasn't been contacted
   in 9 days. Your Riverside open house is Saturday — the campaign is drafted. 2 transaction tasks
   due today."*
   → *The recruit's brokerage does not do this. This alone lands.*

2. **Open the laptop.** RCRE Today is already on screen: the same information, with each item
   clickable to the underlying record. Prioritised, with reasons.

3. **Speak to it.** *"Why Sarah?"* → It explains: four views in one neighbourhood, price band
   matches her pre-approval, no contact in nine days, and she opened the last two emails.
   → *This is the moment. It knows the business, not the internet.*

4. **Ask it to work.** *"Draft a follow-up to Sarah and everyone else who's gone quiet."*
   → Drafts appear in her voice, referencing the specific listings she viewed. **One approval
   screen.** The recruit sees consent status on every recipient.

5. **Approve.** Messages go out through RCRE with full audit.

6. **Show the listing workflow.** *"I'm listing 123 Main tomorrow."* → Property research assembled,
   comps pulled, marketing copy drafted, social queued, open house plan built, follow-up sequence
   prepared. **Held for review, with the fair-housing check visible.**
   → *The compliance gate is a selling point, not friction. Experienced agents know the risk.*

7. **The broker view, if recruiting a team lead.** RCRE Command: response times, exceptions, who
   needs help.

**Total: about ten minutes.** The line an experienced Realtor should say at the end is *"I don't get
anything like this at my brokerage"* — and the reason they say it is step 3, not step 6. Generic AI
demos everywhere; an AI that knows *their* pipeline exists almost nowhere.

**What this demo requires:** the data platform, the MCP server, RCRE Today in the portal, a Hermes
profile with RCRE skills, SMS delivery, and the approval path. **It does not require** the Academy,
the automation suite, custom desktop routes, subagents, or bots. That is a genuinely achievable
scope.

---

## 5. Phase 17 — ADR dispositions

**ADR-0001 (storage boundary) — Accepted. Not reviewed, not modified.**

| ADR | Disposition | Rationale |
|---|---|---|
| **0002** — Postgres + Supabase Auth | **KEEP unchanged** | The investigation *strengthened* it. Hermes explicitly has no system of record and no team knowledge store. The relational argument, the RLS argument, and the Firebase rejection all stand |
| **0003** — Single application | **REVISE** | Still one RCRE application and one database — but the architecture now includes an **adopted third-party runtime** (Hermes) alongside it. That is not the Growth/Execution split the ADR rejected: there is still one database, one auth system, one permission model. The ADR should say so explicitly rather than be read as forbidding Hermes |
| **0004** — In-app jobs before n8n | **REVISE** | The anti-n8n reasoning holds completely. But the framing is now wrong: agent-facing scheduled work should use **Hermes cron** (natural-language scheduling, multi-channel delivery, `[SILENT]`, no-agent mode, per-job model pins) rather than in-app jobs. RCRE in-app jobs remain correct for deterministic business logic that must run regardless of any agent's machine. Revise to a **three-way split**: Hermes cron / RCRE jobs / still-not-n8n |
| **0005** — Keep Luxury Presence, no owned IDX | **KEEP unchanged** | Nothing in the Hermes research touches it. If anything the ~4-MLS licensing burden is now more clearly a reason to stay out |
| **0006** — No stub UI | **KEEP, and strengthen** | Hermes makes it *easier* to ship real capability fast, which raises the bar rather than lowering it. Add an explicit clause: **no Hermes surface may be exposed to an agent until its RCRE MCP tools are wired and working.** A configured-but-hollow assistant is the worst possible stub |
| **NEW 0007** | **Adopt Hermes Agent as the RCRE agent runtime** | The central decision of this investigation. Needs its own ADR with alternatives and exit strategy |
| **NEW 0008** | **RCRE MCP server as the single integration boundary** | Identity server-side, never model-supplied. The security keystone |
| **NEW 0009** | **Hermes Desktop as an optional power surface; portal remains primary** | Directly revises the *"No desktop application"* non-goal |

### Revised non-goal wording

The architecture doc's *"No desktop application"* becomes:

> **RCRE will not build or maintain its own desktop shell.** RCRE may distribute and configure
> Hermes Desktop as an optional power surface, extended only through the official plugin SDK. The
> browser portal remains the primary and mandatory interface for all agents.

Other V1 non-goals — no consumer-site rebuild, no owned IDX, no autonomous outbound, no
multi-brokerage ambition, no stub UI — **all stand unchanged.**

---

## 6. Revised roadmap

Phase numbering is preserved from V1 so history stays readable. Changes are marked.

| Phase | V1 | V2 | Change |
|---|---|---|---|
| **0** Discovery | Leadership answers | **Unchanged** + add Hermes pilot cost model and an install-friction test with one real agent | Added |
| **1** Foundation + Capture | Schema, auth, RLS, capture | **Unchanged**, plus **RCRE MCP server (read-only) + server-side audit** | **Expanded** |
| **2** Recruiting Platform | Public site + pipeline | **Unchanged** | — |
| **3** Agent Portal v1 | Four working features | **Portal RCRE Today + RCRE Command**, plus **Hermes pilot** with 2–3 design partners: profiles, skill tap, cron, SMS, theme, thin plugin | **Expanded** |
| **4** AI Assistant v1 | Build assistant, answer+draft | **Now largely Hermes.** Focus shifts to **write tools, approval path, compliance gates, knowledge retrieval**, and the `ROUTES_AREA` spike | **Re-scoped** |
| **5** AI Academy | Curriculum + funnel | **Unchanged** + Hermes as the practice environment | Minor |
| **6** Automation | Sequences, agentic workflows | **Unchanged** + event bus → Hermes runs | Minor |
| **7** Website decision | At renewal | **Unchanged** | — |

**The most important sequencing point:** Phase 3 now delivers the recruiting demo. That pulls the
single most valuable business outcome forward, because the demo needs the data platform (Phase 1),
the portal (Phase 3), and a configured Hermes profile — not the full automation suite.

### New risks introduced by adopting Hermes

| Risk | Severity | Mitigation |
|---|---|---|
| **Upstream dependency and SDK churn** | Med-High | MIT licence means RCRE can fork. Jeremy's Legends upstream-strategy doc is a tested upgrade procedure — adopt it. Keep the RCRE plugin thin |
| **Per-machine install friction defeats adoption** | **High** | Portal is primary and requires no install. Desktop is opt-in. Measure install time with a real agent in Phase 0 |
| **Client PII leaking into profile memory** | **High** | `pre_tool_call` PII guard, `fail_closed`, periodic profile audit |
| **No central admin console** | **High** | RCRE builds provisioning, entitlement, audit, and offboarding in its own backend. Do not rely on Managed Scope |
| **Per-agent model cost** | Med | `[SILENT]` routines, no-agent mode, cheaper models on mechanical work. Model the cost before rollout |
| **"Powered by Hermes Agent" branding** | Low-Med | Position the *system* as RCRE's, not the shell. Acceptable and honest |
| **Agent-machine data custody at offboarding** | **High** | Records stay in RCRE; offboarding revokes MCP + OAuth + gateway. Document in the ICA |

---

## 7. What Jeremy needs to decide

1. **Adopt Hermes as the RCRE agent runtime?** (ADR-0007) — the central question.
2. **Accept the portal-primary / desktop-optional split?** (ADR-0009)
3. **Accept the revised ADR-0004 three-way automation split?**
4. **Approve the Phase 3 recruiting demo as the near-term target?**
5. **Approve a time-boxed `ROUTES_AREA` spike** to resolve the one genuinely unproven question?

None of these should be marked Accepted without that conversation.
