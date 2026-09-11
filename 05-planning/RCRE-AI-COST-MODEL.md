# RCRE AI Cost Model — Framework

> ## ⚠ SUPERSEDED IN ITS CENTRAL ASSUMPTION — 2026-08-19
>
> **This document modelled RCRE paying frontier-model inference per agent. That
> is NOT the business model.** See **[ADR-0011](../06-decisions/adr/0011-provider-agnostic-ai.md)**.
>
> The corrected strategy: agents use their **own** AI subscription, OAuth path,
> or API credentials through Hermes; RCRE-provided default inference prefers
> **free or local models** where practical; the architecture stays
> **provider-agnostic**; and **the product must not become economically
> dependent on RCRE paying per-agent inference fees**.
>
> **What is still valid below:** the workload catalogue (§3), the calculation
> structure (§5), the model-routing guidance (§6), and the cost controls (§7) —
> all of which apply to whoever bears the cost.
>
> **What is no longer valid:** §4 usage profiles framed as an RCRE per-agent
> expense, §8's "cost per agent" framing, and the scenario grid's implication
> that RCRE pays every row. Retained unedited so the reasoning history is
> visible rather than rewritten.
>
> **New question this document must eventually answer:** what does RCRE's own
> spend look like when it is limited to server-side workloads RCRE genuinely
> chooses to fund — realistically the broker briefing and any shared
> compliance screening — rather than every agent's every interaction?


**Date:** 2026-08-19
**Status:** Framework with verified Claude pricing and **unverified usage assumptions**.
**Purpose:** a calculation structure you can drop real numbers into. The pilot
([RCRE-HERMES-PILOT-PLAN.md](RCRE-HERMES-PILOT-PLAN.md)) replaces every estimate here with measurement.

> **Read this honestly.** The *pricing* below is verified. The *token volumes* are estimates built
> from workload shape, not from observation. Costs could plausibly land at half or double these
> figures. **Do not commit to a per-agent price with a client on the strength of this document.**

---

## 1. Verified pricing

**Anthropic first-party API rates** (source: `claude-api` skill reference, cached 2026-06-24 —
re-verify before any commercial commitment):

| Model | Input $/1M | Output $/1M | Context |
|---|---|---|---|
| Claude Fable 5 | $10.00 | $50.00 | 1M |
| **Claude Opus 5** | **$5.00** | **$25.00** | 1M |
| Claude Opus 4.8 / 4.7 / 4.6 | $5.00 | $25.00 | 1M |
| **Claude Sonnet 5** | **$3.00** *(intro $2.00 through 2026-08-31)* | **$15.00** *(intro $10.00)* | 1M |
| Claude Sonnet 4.6 | $3.00 | $15.00 | 1M |
| **Claude Haiku 4.5** | **$1.00** | **$5.00** | 200K |

**Two cost levers that materially change the arithmetic:**

- **Prompt caching** — cross-session 1-hour prefix cache. RCRE's workloads are unusually
  cache-friendly: the same skills, the same system prompt, and the same brokerage context repeat on
  every call. **Cache reads are billed far below fresh input**, so a stable prefix is the single
  biggest cost lever available. Verify the current cache-read rate before modelling savings.
- **Batch API — 50% discount**, asynchronous. Fits overnight work (market research, database sweeps,
  content pre-generation) that has no latency requirement.

**Not verified here:** Hermes also supports OpenRouter, DeepSeek, NVIDIA, Groq, and local Ollama.
Non-Anthropic pricing is **left blank deliberately** — fill in from each provider's current page
before relying on it.

| Provider | Model | Input $/1M | Output $/1M | Verified? |
|---|---|---|---|---|
| OpenRouter | ______ | ______ | ______ | ☐ |
| DeepSeek | ______ | ______ | ______ | ☐ |
| Groq | ______ | ______ | ______ | ☐ |
| Local Ollama | ______ | $0 marginal | $0 marginal | hardware cost only |

---

## 2. Fixed vs. variable

Keep these separate. Fixed costs are the same at 13 agents or 60; variable costs scale per person.

### Fixed infrastructure (monthly)

| Item | Estimate | Notes |
|---|---|---|
| Supabase / Postgres | $______ | Pro tier likely sufficient at this scale |
| App hosting (Vercel/Netlify) | $______ | |
| RCRE MCP server hosting | $______ | Small always-on service |
| File/object storage | $______ | Grows with documents and media |
| Email sending | $______ | Per-volume |
| SMS | $______ | **Per-message — can become significant** |
| Monitoring / logging | $______ | |
| Domains, certs, misc | $______ | |
| **Fixed subtotal** | **$______** | |

### Variable per agent (monthly)

Model usage, per §3–4.

**Fixed costs are trivial next to model costs at any meaningful roster size.** Model usage is where
this is won or lost.

---

## 3. Workload catalogue

Every workload RCRE would run, with the cost characteristics that matter.

| # | Workload | Frequency | Input size | Output size | Cache-friendly? | Latency-sensitive? | Model tier |
|---|---|---|---|---|---|---|---|
| W1 | **Interactive conversation** | Per session | Medium, grows | Medium | **High** — stable skills/system prefix | Yes | **Frontier** |
| W2 | **RCRE Today briefing** | Daily/agent | Medium — structured MCP data | Small | **Very high** — near-identical prompt daily | No | **Mid** |
| W3 | **RCRE Command briefing** | Daily, broker | Large — cross-agent data | Medium | High | No | **Frontier** |
| W4 | Scheduled CRM sweeps (unanswered leads, stale contacts, deadlines) | Several/day | Small | Tiny | Very high | No | **Cheap** — often **no-agent mode, $0** |
| W5 | Market research | Weekly/agent | Large — web results | Medium | Low | No | Mid |
| W6 | Property research | Per listing | Large | Medium | Low | Somewhat | Mid |
| W7 | Content generation (social, email, listing copy) | Variable | Medium | **Large** | Medium | No | **Frontier** — quality is the product |
| W8 | Draft follow-ups | Per batch | Medium | Medium | High | Somewhat | Mid |
| W9 | Knowledge Q&A | Ad hoc | Medium — retrieved docs | Small | **Very high** | Yes | Mid |
| W10 | Skill loading overhead | Every call | ~3K metadata + loaded skills | — | **Very high** | — | — |
| W11 | Subagent research fan-out | Occasional | **3× parallel** | Medium | Low | No | **Cheap** — pin `delegation.model` |
| W12 | Voice (STT/TTS) | Variable | — | — | — | Yes | **Separate per-minute pricing** |
| W13 | Image generation | Per campaign | — | — | — | No | **Per-image, separate** |
| W14 | Compliance screening | Per public asset | Medium | Small | High | No | Mid |

**Three observations that should shape configuration:**

- **W10 is a hidden constant.** Progressive disclosure keeps skill metadata around 3K tokens per call,
  but it is on *every* call. At 39 skills × 13 agents × dozens of calls daily, it compounds. Prompt
  caching is the mitigation — the skill list is perfectly stable.
- **W4 should mostly cost nothing.** Hermes cron supports script-only *no-agent mode*: deterministic
  checks run and deliver output with **zero LLM tokens**. "Are there unanswered leads?" is a database
  query, not a reasoning task. Only escalate to a model when there's something to reason about.
- **W12 and W13 are priced separately** and are not covered by the token table. Model them
  independently once providers are chosen.

---

## 4. Usage profiles

**These volumes are estimates.** Replace with pilot data.

### Light user
An agent who reads the morning brief and occasionally asks a question.

| Workload | Assumption |
|---|---|
| Interactive sessions | ~3/week, short |
| RCRE Today | Daily (read, rarely acted on) |
| Scheduled sweeps | Daily, mostly no-agent |
| Research | Rare |
| Content generation | ~2/month |

**Estimated monthly:** `$______` *(fill after pilot)*

### Normal user
An agent using it as part of their working routine.

| Workload | Assumption |
|---|---|
| Interactive sessions | ~2/day, moderate length |
| RCRE Today | Daily, acted on |
| Scheduled sweeps | Daily |
| Draft follow-ups | ~3×/week batches |
| Research | ~2×/week |
| Content generation | ~2/week |
| Listing workflows | ~2/month |

**Estimated monthly:** `$______`

### Heavy user
A top producer running most of their business through it.

| Workload | Assumption |
|---|---|
| Interactive sessions | Many/day, long, voice included |
| RCRE Today | Daily, fully worked |
| Scheduled sweeps | Multiple daily |
| Draft follow-ups | Daily |
| Research | Daily |
| Content generation | Several/week |
| Listing workflows | Weekly, full campaign |
| Subagent fan-out | Regular |

**Estimated monthly:** `$______`

### Broker profile
Cross-brokerage reads — larger inputs, higher-tier model.

**Estimated monthly:** `$______`

> **The number that matters most is the heavy-to-light ratio.** If it's 3×, budgeting is simple. If
> it's 20×, RCRE needs per-agent caps, tiering, or a usage policy before rollout. The pilot's
> enthusiast-vs-ordinary comparison measures exactly this.

---

## 5. Calculation

```
Per workload:
  cost = (fresh_input_tokens  ÷ 1M × input_rate)
       + (cached_input_tokens ÷ 1M × cache_read_rate)      ← the big lever
       + (output_tokens       ÷ 1M × output_rate)

Per agent per month:
  Σ (workload cost × monthly frequency)

Brokerage per month:
  fixed_infrastructure
+ Σ (agents in each profile × profile cost)
+ broker profile(s)
+ voice minutes × rate
+ images × rate
```

### Scenario grid — fill after pilot

| Roster | Light | Normal | Heavy | Broker | Variable | Fixed | **Total/mo** | **Per agent** |
|---|---|---|---|---|---|---|---|---|
| 13 (today) | 6 | 5 | 2 | 1 | $____ | $____ | **$____** | **$____** |
| 25 | 12 | 10 | 3 | 2 | $____ | $____ | **$____** | **$____** |
| 50 | 25 | 20 | 5 | 3 | $____ | $____ | **$____** | **$____** |
| 100 | 50 | 40 | 10 | 5 | $____ | $____ | **$____** | **$____** |

---

## 6. Model routing — where to spend and where not to

Hermes supports per-job model pins, per-profile defaults, and a separate `delegation.model`. Use them.

| Workload | Recommended | Why |
|---|---|---|
| Interactive conversation | **Frontier (Opus 5)** | This *is* the product. Do not economise here |
| Content generation | **Frontier** | Quality is what agents judge it on |
| RCRE Command briefing | **Frontier** | Cross-agent reasoning; feeds management decisions |
| RCRE Today briefing | **Mid (Sonnet 5)** | Structured input, templated output. Test whether anyone notices |
| Knowledge Q&A | **Mid** | Retrieval does the work; the model summarises |
| Draft follow-ups | **Mid** | Test against frontier — voice quality may justify the upgrade |
| Research summarisation | **Mid** | |
| Scheduled sweeps | **No-agent mode — $0** | Deterministic queries need no model |
| Compliance pre-screen | **Mid**, then human | Advisory only; the human decides |
| Subagent fan-out | **Cheap (Haiku 4.5)** | Docs recommend pinning `delegation.model` cheap while the parent stays frontier |
| Bulk overnight work | **Batch API — 50% off** | No latency requirement |

**Do not economise on:** anything an agent judges quality by, anything touching compliance, and
anything a recruit will see in a demo. **Do economise on:** everything mechanical, scheduled, or
invisible.

---

## 7. Cost controls to build in from day one

| Control | Mechanism |
|---|---|
| **Per-agent monthly cap with alerting** | RCRE backend tracks spend per profile |
| **Prompt caching everywhere** | Stable skill/system prefix; volatile content last |
| **`[SILENT]` on all routines** | Nothing fires when there's nothing to say |
| **No-agent mode for deterministic checks** | Zero tokens |
| **Batch API for overnight work** | 50% |
| **Per-job model pins** | Cheap models on mechanical work |
| **Cheap `delegation.model`** | Subagents are the main runaway risk |
| **Effort tuning** | Lower effort on routine work cuts spend materially |
| **Routine frequency review** | Hourly sweeps are rarely worth 24× the daily cost |
| **Spend visibility per agent** | Behaviour changes when usage is visible |

---

## 8. Framing the cost

> **Superseded framing — see the banner.** Retained because the comparison
> logic is still useful when discussing what an *agent* spends on their own
> subscription, and because deleting it would erase why the original
> conclusion looked reasonable.

Two comparisons worth having ready for the leadership conversation:

**Against agent tools.** Brokerages routinely spend **$50–$300 per agent per month** on kvCORE,
Sierra, Ylopo, BombBomb, Canva, and similar. If RCRE's AI cost lands inside that band while replacing
some of it, the economics are straightforward.

**Against a single transaction.** One additional closed deal per agent per year covers a great deal of
tooling. The honest version of the pitch is *"this should produce at least one more deal per agent per
year"* — and RCRE will be able to test that claim once response times and conversion are measured
(Phase 1).

**The recruiting frame is stronger than the cost frame.** If the platform helps land two additional
agents who each close six deals, the entire AI budget is irrelevant by comparison. That is the
argument to lead with — but only once it's true.

---

## 9. Open items

- [ ] Re-verify Claude pricing at commitment time *(cached 2026-06-24)*
- [ ] Verify the **cache-read rate** — the single most important missing number
- [ ] Verify non-Anthropic provider pricing if used
- [ ] Voice STT/TTS per-minute pricing
- [ ] Image generation per-image pricing
- [ ] SMS per-message pricing
- [ ] **Measure real token volumes in the pilot** — replaces every estimate in §4
- [ ] Confirm whether RCRE or agents bear the cost (interview §11)
- [ ] Model the cost of the recruiting demo itself, if run frequently
