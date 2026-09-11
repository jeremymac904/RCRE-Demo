# RCRE Today — Data Requirements

**Date:** 2026-08-19
**Method:** Worked backward from the recruiting demo in
[RCRE-ARCHITECTURE-V2-PROPOSAL.md §4](../01-research/hermes/RCRE-ARCHITECTURE-V2-PROPOSAL.md).
**Purpose:** determine the **smallest useful data platform** — the minimum RCRE must own before the
demo is real.

---

## Why this document decides Phase 1

RCRE Today is roughly 80% RCRE data and 20% Hermes reasoning. Hermes cannot compensate for data that
does not exist. So the question *"what is the smallest thing we must build?"* is answered here, not in
the architecture doc.

**The conclusion, stated up front:** the demo needs **six entities and one derived field**. Everything
else in the demo is optional garnish.

> **people · leads · activity · tasks · listings · transactions**
> plus **first-touch timestamp**, derived from activity

That is a genuinely small platform. It is smaller than a CRM. Whether RCRE *builds* it, *derives it
from an incumbent CRM*, or *syncs it* is the open question discovery answers — but the shape is the
same either way.

---

## Legend

**Exists today?** — our assessment before discovery. **A-xx** references
[ASSUMPTIONS-REGISTER.md](../02-discovery/ASSUMPTIONS-REGISTER.md).

**Nature** — **Deterministic** (a query; must be exactly right) · **Inferred** (AI judgement;
can be wrong) · **Hybrid**

**Privacy** — **Low** / **Med** / **High** (client PII, financial, or protected-class adjacent)

**Priority** — **P0** demo-blocking · **P1** materially better · **P2** later

---

## Part 1 — The demo, line by line

### "3 new leads"

| | |
|---|---|
| **Data** | Lead records with `created_at`, `assigned_to`, `status` |
| **Source** | RCRE lead capture (Phase 1) |
| **Exists today?** | **No.** Leads land in Luxury Presence. RCRE owns none of them (A-05) |
| **Integration** | Website form post → RCRE capture endpoint; lead-provider webhooks |
| **Nature** | **Deterministic** |
| **Approval** | N/A (read) |
| **Privacy** | **Med** — name, email, phone |
| **Priority** | **P0** |

> The most basic line in the demo is also one RCRE currently cannot produce. This is why owned lead
> capture is Phase 1 regardless of how discovery answers.

### "2 leads have not received follow up"

| | |
|---|---|
| **Data** | Lead + **first-touch timestamp** + an RCRE-defined SLA threshold |
| **Source** | Activity log; threshold is brokerage policy |
| **Exists today?** | **No.** No activity logging exists (A-01, A-11) |
| **Integration** | Activity written by portal, Hermes MCP, and ideally call/email/SMS systems |
| **Nature** | **Deterministic** — must be. This measures people |
| **Approval** | N/A to read; **strong approval** before any escalation reaches an agent's manager |
| **Privacy** | **Med** — and **sensitive as an employment metric**, not just as data |
| **Priority** | **P0** |

> **First-touch timestamp is the single highest-value derived field in the system.** It powers this
> line, the broker's response-time metric, agent accountability, and the "we respond in X minutes"
> recruiting claim. It cannot be backfilled — every day without it is permanently lost. **Capture it
> from day one.**
>
> **Design caution:** the definition of "contacted" must be a written policy, not a model's judgement.
> If an agent's performance review is affected by it, it has to be defensible.

### "Sarah Chen viewed 4 listings in Mandarin Lakes this week"

| | |
|---|---|
| **Data** | Contact identity + property-view events with timestamps and geography |
| **Source** | **Luxury Presence consumer portal** — `/home-search/account`, saved searches, "My Homes" |
| **Exists today?** | **Probably yes — inside the vendor.** Whether it is *exportable or streamable* is unknown (A-05, discovery C2/C4) |
| **Integration** | Luxury Presence API/webhook if offered. **If not available, this line dies** |
| **Nature** | **Deterministic** if the data exists |
| **Approval** | N/A |
| **Privacy** | **High** — behavioural tracking of a named consumer |
| **Priority** | **P1** — highest-impact, **highest-risk** item in the demo |

> **This is the line that makes the demo land**, and it depends entirely on a vendor relationship we
> have not yet confirmed. Ask about it explicitly in discovery (§6 of the interview).
>
> **Fallback if unavailable:** substitute a signal RCRE genuinely owns — *"Sarah opened your last two
> emails and clicked the Mandarin Lakes listing"* (email engagement), or *"Sarah has been on your
> list for nine days with no contact."* Weaker, but honest and buildable.
>
> **Never fake this in a demo.** Showing behavioural data RCRE cannot actually produce is the
> ADR-0006 failure in its most damaging form.

### "Price band matches her pre-approval"

| | |
|---|---|
| **Data** | Contact financing status + budget range; listing prices |
| **Source** | Agent-entered, or a lender/partner integration |
| **Exists today?** | **Unlikely to be structured.** Probably in agents' heads or notes |
| **Integration** | Portal field; possibly Jeremy's mortgage side later |
| **Nature** | **Deterministic** comparison over **manually entered** data |
| **Approval** | N/A |
| **Privacy** | **High** — financial. Handle carefully |
| **Priority** | **P1** |

> **Two cautions.** (1) Financial capacity data adjacent to lending has fair-lending sensitivity —
> it must never be used to *filter which clients get service*. (2) It is only as good as agent data
> entry, so the field must be trivially easy to fill or it stays empty.
>
> The mortgage-partnership angle is a real differentiator here, but it is a Phase 4+ integration, not
> a demo dependency.

### "Hasn't been contacted in 9 days"

| | |
|---|---|
| **Data** | Last activity timestamp per contact |
| **Source** | Activity log |
| **Exists today?** | **No** (A-01, A-11) |
| **Integration** | Portal + MCP writes; email/call/SMS logging is the stretch goal |
| **Nature** | **Deterministic** |
| **Approval** | N/A |
| **Privacy** | Med |
| **Priority** | **P0** |

> **The hard part is not the query — it is capture.** If agents call from personal phones and email
> from personal accounts, "last contact" only knows what was logged manually. Two paths: make logging
> effortless (voice: *"log that I called Sarah"*), or integrate email and phone (P1). Probably both.

### "Opened your last two emails"

| | |
|---|---|
| **Data** | Email open/click events tied to a contact |
| **Source** | Marketing email platform |
| **Exists today?** | Depends on the platform (discovery C11) |
| **Integration** | Webhook or API from the email platform |
| **Nature** | **Deterministic** — though open tracking is increasingly unreliable (Apple Mail Privacy Protection). **Clicks are the trustworthy signal** |
| **Approval** | N/A |
| **Privacy** | **High** — behavioural |
| **Priority** | **P1** |

> Prefer click data over open data. Opens now over-report significantly and would make the assistant
> confidently wrong.

### "Your listing at 123 Main has an open house Saturday"

| | |
|---|---|
| **Data** | Listing record + event with date |
| **Source** | RCRE listings; calendar |
| **Exists today?** | **Listing data yes** (MLS/Luxury Presence). **Open house scheduling — unknown** |
| **Integration** | RCRE listing record + calendar (Google/Microsoft) |
| **Nature** | **Deterministic** |
| **Approval** | N/A |
| **Privacy** | **Low** — public |
| **Priority** | **P0** — easiest P0 on the list |

> A minimal `listings` table (address, agent, status, price, key dates) is enough. **Do not attempt to
> mirror MLS data** — licensing constraints (ADR-0005) and no benefit.

### "2 transaction tasks are due"

| | |
|---|---|
| **Data** | Transaction + task records with due dates and status |
| **Source** | RCRE tasks; ideally synced from transaction management |
| **Exists today?** | **In the TM platform, if one exists** (discovery C7) |
| **Integration** | TM API read → RCRE tasks |
| **Nature** | **Deterministic** |
| **Approval** | N/A to read; **approval** to modify anything in the TM system |
| **Privacy** | **Med** |
| **Priority** | **P0** for RCRE-native tasks; **P1** for TM sync |

> Deadline tracking is the highest-consequence item here — a missed inspection or financing deadline
> is an E&O event. Worth building even if nothing else ships.

### "3 client birthdays coming up" · "closing anniversary approaching"

| | |
|---|---|
| **Data** | Contact `birthday` field; transaction `closing_date` |
| **Source** | RCRE contacts and transactions |
| **Exists today?** | **Closing dates: probably yes.** **Birthdays: almost certainly not** |
| **Integration** | Contact field; historical transaction import |
| **Nature** | **Deterministic** |
| **Approval** | **Yes** — before any outreach is sent |
| **Privacy** | **Med** (birthday) / **Low** (closing date) |
| **Priority** | **P1** birthdays · **P0** anniversaries |

> **Closing anniversaries are free.** If any closed-transaction history can be imported, this works
> on day one with no new data collection — a genuinely high-value, zero-effort win.
>
> Birthdays require ongoing agent data entry and will be sparse for a long time. Fine — the briefing
> shows what exists.

### "No social content published today"

| | |
|---|---|
| **Data** | Publishing history per agent |
| **Source** | RCRE marketing records or social platform APIs |
| **Exists today?** | **No** |
| **Integration** | RCRE publish log (if RCRE publishes) or platform APIs |
| **Nature** | **Deterministic** |
| **Approval** | N/A |
| **Privacy** | Low |
| **Priority** | **P2** |

> **Consider cutting this line from the demo.** It is the weakest item — it nags without informing,
> and it implies a daily-posting standard RCRE may not actually hold. It also only works once RCRE
> owns publishing (Phase 5).

### "Recommended actions: Call Sarah. Text Michael…"

| | |
|---|---|
| **Data** | Everything above, plus ranking |
| **Source** | Hermes, over MCP data |
| **Exists today?** | N/A |
| **Nature** | **Inferred** — this is the AI's actual job |
| **Approval** | Recommendations no; **execution yes** |
| **Privacy** | Inherits |
| **Priority** | **P0** |

> **Ranking should be explainable.** *"Sarah — 4 views, 9 days silent"* beats a score. When the
> assistant explains itself, agents trust it; when it emits a number, they argue with it.
>
> **Fair-housing caution:** ranking must derive only from engagement, recency, and stated intent —
> **never** from neighbourhood, name, or any protected-class proxy. This constraint belongs in the
> ranking code, not in a prompt.

### "Handle what you can for me"

| | |
|---|---|
| **Data** | Everything, plus approval state |
| **Source** | Hermes orchestration + RCRE MCP write tools |
| **Nature** | **Hybrid** — inferred plan, deterministic execution |
| **Approval** | **Yes — always, at launch.** One batched approval screen |
| **Privacy** | Inherits |
| **Priority** | **P1** — the demo can land on drafts alone |

> Tier it (see architecture V2 §3): draft-everything at launch → narrow internal auto-execute later →
> per-agent, per-action limited autonomy much later. **Do not start at the end.**

---

## Part 2 — The minimum data platform

Consolidating everything above:

### Entities required for P0

| Entity | Minimum fields | Why |
|---|---|---|
| **people** | id, name, email, phone, type, owner, **consent**, source attribution, created_at | The centre of everything |
| **leads** | id, person, source, `created_at`, assigned_to, status, **first_touch_at** | "3 new leads", "2 unanswered" |
| **activity** | id, person, agent, type, **occurred_at**, channel, note | "9 days", "unanswered", every recency signal |
| **tasks** | id, owner, related record, title, **due_at**, status | "2 tasks due" |
| **listings** | id, address, agent, status, price, key dates | "open house Saturday" |
| **transactions** | id, listing/person, agent, stage, **closing_date**, milestones | anniversaries, deadlines |

### The one derived field that matters most

**`first_touch_at`** — the timestamp of the first outbound activity against a lead.

It powers the agent's "unanswered" line, the broker's median response time, agent accountability, and
the recruiting claim. **It cannot be reconstructed later.** Capture it from the first day leads flow.

### What is explicitly *not* needed for the demo

Marketing campaign records · social publishing history · commission data · full MLS mirror · document
storage · full transaction document management · recruiting pipeline (RCRE Command, not RCRE Today) ·
email/SMS content archives.

**This matters.** The demo does not require a full CRM. It requires six tables and disciplined
timestamp capture.

---

## Part 3 — Build priority

| Priority | Items | Blocks |
|---|---|---|
| **P0 — demo-blocking** | Lead capture with attribution + consent · activity logging with `first_touch_at` · tasks with due dates · minimal listings · transactions with closing dates · recommendation ranking | RCRE Today, RCRE Command, the recruiting demo |
| **P1 — materially better** | Luxury Presence behavioural data *(if obtainable)* · email engagement (clicks) · financing/budget field · birthdays · TM sync · calendar integration · "handle it" execution | Demo impact, agent value |
| **P2 — later** | Social publishing history · full marketing attribution · lender integration · document management | — |

---

## Part 4 — Discovery questions this document raises

| # | Question | Decides |
|---|---|---|
| 1 | **Can Luxury Presence export or stream consumer portal behaviour?** | Whether the demo's best line is real or must be substituted |
| 2 | **Does an incumbent CRM already hold contacts, activity, and tasks?** | Whether Phase 1 is build, integrate, or derive |
| 3 | Can closed-transaction history be imported? | Whether closing anniversaries work on day one |
| 4 | Does the email platform expose click webhooks? | Engagement signals |
| 5 | Does the TM platform have an API? | Task and deadline sync |
| 6 | How do agents communicate — brokerage systems or personal phones/email? | Whether activity capture can be automatic or must be manual |
| 7 | **What is RCRE's written definition of "contacted"?** | The SLA rule, and its defensibility as a people metric |
| 8 | Are contact birthdays recorded anywhere? | P1 sizing |

---

## Part 5 — The honest summary

**RCRE Today is buildable, and smaller than it looks.** Six entities and one derived timestamp deliver
the whole demo except two lines.

**Two lines carry real risk:**

- *"Sarah viewed 4 listings"* depends on a vendor relationship we have not confirmed. **Have the
  fallback ready** and never fake it.
- *"Price band matches her pre-approval"* depends on agent data entry that does not exist yet.

**One field must be captured from day one or it is lost forever:** `first_touch_at`.

**And one line should probably be cut:** the social-posting nag adds friction without insight.

Everything here is achievable in Phase 1 — **whether RCRE builds a CRM, integrates one, or simply
builds this data layer alongside an incumbent.** That is the point: the smallest useful platform is
the same shape in all three cases, which means it can be designed now, before discovery resolves which
path RCRE takes.
