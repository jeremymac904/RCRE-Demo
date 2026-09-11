# Hermes → RCRE Use-Case Map

**Date:** 2026-08-19
**Companion to:** [HERMES-CAPABILITY-AUDIT.md](HERMES-CAPABILITY-AUDIT.md)

Maps RCRE's two user populations against verified Hermes capability. Every row is classified:

| Code | Meaning |
|---|---|
| **H** | Hermes native — works today with configuration and a skill |
| **H+D** | Hermes + RCRE **data** — needs the RCRE MCP server over the RCRE database |
| **H+I** | Hermes + third-party **integration** (Google, MLS, e-sign, phone…) |
| **H+B** | Hermes + RCRE **backend logic** (scoring, routing, dashboards, compliance) |
| **RCRE** | RCRE builds it; Hermes is not the right vehicle |
| **✗** | Should not be automated, or not viable |

**The governing constraint** (Capability Audit §3, L1): Hermes memory is ~1,300 tokens, per-profile,
with no team sharing and no central knowledge repository. **Every use case below that touches a
client, a lead, a transaction, or a number depends on RCRE data reached through MCP.** Hermes
supplies reasoning, interface, and orchestration. It does not supply truth.

---

## Part 1 — Broker owner / management

### Daily operations and exception management

| Use case | Class | What Hermes gives | What RCRE must supply |
|---|---|---|---|
| Daily brokerage briefing | **H+D** | Cron at 06:30, delivery to desktop + Slack/Telegram, natural-language synthesis | Query tools over leads, response times, transactions, tasks |
| Exception management (the real product) | **H+D+B** | Reasoning over exceptions, drafted interventions | Exception *definitions* and thresholds — what counts as overdue, stale, unanswered |
| Lead response-time monitoring | **H+D** | Narration, alerting, escalation drafting | First-touch timestamps — requires owned capture (Phase 1) |
| Leads with no response | **H+D** | Detection, agent-specific nudge drafts | Assignment + activity data |
| Agents with no CRM activity | **H+D** | Weekly rollup, retention-risk flagging | Activity logging RCRE does not have today |
| Overdue task sweep | **H+D** | Digest, prioritisation, follow-up drafts | Task model |
| Transaction exceptions | **H+D+I** | Milestone-gap reasoning | Transaction data; e-sign/TM integration |
| Pipeline monitoring | **H+D** | Trend narration, anomaly calls | Pipeline stages and history |
| Agent production tracking | **H+D** | Comparative analysis, coaching prompts | Production data — likely reconciled from MLS/closings |
| Management dashboards | **RCRE** | — | **Structured UI beats conversation for scanning.** Hermes narrates the dashboard; it should not replace it. |

### Recruiting (the primary objective)

| Use case | Class | Notes |
|---|---|---|
| Recruiting pipeline monitoring | **H+D** | Stage movement, stalls, engagement scoring |
| Recruiting prospect research | **H** | Web/browser research on a named agent's public production, listings, social presence, tenure. **Compliance gate:** never scrape MLS agent rosters for recruiting — see guardrails |
| Recruiting follow-up drafting | **H+D** | Draft only. Sending is approval-gated |
| Recruiting nurture sequences | **H+D+B** | Cron-scheduled touches; RCRE owns consent and suppression |
| "Prospect became highly engaged" alerts | **H+D+B** | RCRE computes engagement score; Hermes narrates and recommends |
| Competitive intelligence (rival brokerage offers, splits, tech) | **H** | Genuinely strong Hermes use — web research, summarised, tracked over time |
| Recruiting content and campaign drafting | **H** | With brand + compliance skills |
| Interview / meeting prep briefs | **H+D** | Prospect history + public research in one brief |
| Offer modelling ("what would this agent net at RCRE vs their current split?") | **H+B** | High-conversion tool. RCRE owns the comp model; Hermes runs the conversation |

### Growth, knowledge and admin

| Use case | Class | Notes |
|---|---|---|
| Agent onboarding orchestration | **H+D+B** | Checklist state lives in RCRE; Hermes drives and chases |
| Agent retention indicators | **H+D+B** | RCRE computes (activity decline, production drop, disengagement); Hermes narrates and suggests intervention |
| SOP creation and maintenance | **H** | Excellent fit — `/learn` turns recordings, docs, and threads into skills |
| Brokerage knowledge Q&A | **H+D** | Retrieval over RCRE knowledge base via MCP, **not** Hermes memory |
| Meeting preparation | **H+D+I** | Calendar + CRM + prior notes |
| Meeting summaries and action extraction | **H+I** | Transcript in → summary + tasks out; task writes approval-gated |
| Business planning | **H+D** | Scenario modelling against real production data |
| Local market research | **H** | Strong. County-level market conditions, permits, employers, schools, migration |
| Competitive/vendor research | **H** | Strong |
| SEO monitoring | **H+I** | Search Console / analytics via MCP or API |
| Website performance | **H+I** | Analytics + Luxury Presence reporting |
| Content planning | **H+D** | Calendar informed by lead-source performance |
| Review monitoring and response drafting | **H+I** | Google/Zillow. **Responses are public — approval required** |
| Training participation tracking | **H+D** | Academy completion data |
| Commission / financial analysis | **H+D** | Read-only. **No fund movement, ever** |
| Policy interpretation for agents | **H+D** | Retrieval + citation. Escalate genuinely novel questions to the broker |

### Additional high-value brokerage cases (derived, not in the brief)

| Use case | Class | Why it matters |
|---|---|---|
| **Licence and CE expiry monitoring** | **H+D** | Multi-state (AL/FL). An expired licence is a brokerage-level compliance failure |
| **Roster drift reconciliation** | **H+D+I** | The website audit found 13 sitemap agent pages vs 9 on the homepage. Automatable weekly check across site, MLS, and roster |
| **Fair-housing review queue** | **H+B** | Every AI-generated public asset queued for human review, with the risky phrases pre-flagged |
| **E&O / file-completeness audit** | **H+D+I** | Missing disclosures or signatures per transaction, before they become claims |
| **Wire-fraud advisory monitoring** | **H+D** | Confirm the warning was delivered and acknowledged per transaction |
| **Agent 1:1 prep pack** | **H+D** | Auto-assembled production, pipeline, activity, and coaching history before each 1:1 |
| **Recruiting-source ROI** | **H+D+B** | Which sources produce agents who actually produce |
| **Lead-source ROI by county** | **H+D** | Which spend converts, per market |
| **Onboarding time-to-first-closing** | **H+D** | The single best recruiting statistic RCRE could publish, once measured |
| **After-hours lead coverage** | **H+D+B** | Detect unassigned/unanswered after-hours leads; escalate |
| **Departure risk / offboarding checklist** | **H+D** | Access revocation, listing reassignment, data return |
| **Vendor renewal calendar** | **H+D** | Luxury Presence renewal is an unanswered discovery item; never miss it again |
| **Market-shift briefings by county** | **H** | 10 counties across two states — genuinely hard to do manually |

---

## Part 2 — Individual real estate agent

### Lead and database work

| Use case | Class | Notes |
|---|---|---|
| Lead conversion coaching | **H+D** | Real lead context + scripts skill |
| Daily prospecting list | **H+D** | *"Who should I contact today?"* — the highest-value single interaction in the whole system |
| CRM management by conversation | **H+D** | Log calls, update stages, set follow-ups without touching a form |
| Database follow-up | **H+D** | Draft batches; **send only on approval** |
| Sphere marketing | **H+D** | Relationship recency + occasion triggers |
| Past-client marketing | **H+D** | Anniversary, equity, life-event triggers |
| Database cleanup | **H+D** | Duplicates, bad emails, missing fields. **Merges/deletes = strong approval** |
| Lead scoring | **H+B** | RCRE computes deterministically; Hermes explains. Do not let a model invent scores |
| Stale-contact detection | **H+D** | Cron sweep |
| Referral generation | **H+D** | Identify likely referrers; draft asks |
| Review generation | **H+D+I** | Post-close timing; draft request; **never fabricate or incentivise reviews** |

### Listings and transactions

| Use case | Class | Notes |
|---|---|---|
| Listing intake | **H+D** | Structured interview → RCRE record. Good conversational fit |
| Property research | **H+I** | Public records, tax, permits, flood, schools. Browser where no API |
| CMA preparation | **H+I** | **MLS-licensed comps required.** Hermes assembles and narrates; it must not invent comps |
| Listing preparation checklist | **H+D** | Photography, staging, disclosures, sign, lockbox |
| Listing marketing | **H+D+B** | Copy, images (FAL.ai), social. **Fair-housing gate before anything publishes** |
| Listing description writing | **H+B** | Highest fair-housing risk surface in the entire product. Mandatory review |
| Open house planning and follow-up | **H+D** | Registration → same-day follow-up drafts. Strong ROI, low risk |
| Buyer consultation prep | **H+D** | Needs analysis, financing readiness, market briefing |
| Showing feedback collection | **H+D+I** | Chase agents, summarise for the seller |
| Offer comparison | **H+D** | Side-by-side terms. **Advisory only — no recommendation to accept** |
| Transaction management | **H+D+I** | Milestones, deadlines, docs. **Never modify an executed contract** |
| Transaction task chasing | **H+D** | Genuinely high-value drudgery removal |
| Closing preparation | **H+D+I** | Final walkthrough, utilities, wire-fraud warning |
| Post-close follow-up | **H+D** | Review request, referral ask, anniversary enrolment |

### Prospecting niches

| Use case | Class | Notes |
|---|---|---|
| Expired listings | **H+I** | **MLS rules govern expired data use.** DNC screening is mandatory before any call list |
| FSBO | **H+I** | Same DNC constraint |
| New construction | **H+I** | Builder inventory, incentives, spec homes. Jeremy has adjacent builder material already |
| Relocation | **H** | Strong — NAS Jacksonville military relocation is a live, high-intent segment in RCRE's blog data |
| Investors | **H+I** | Rent estimates, cap rate, DSCR-style modelling. **Not investment advice** |
| Geographic farming | **H+D+I** | Turnover analysis by subdivision |
| Circle prospecting | **H+I** | **DNC screening non-negotiable** |

### Marketing, content and brand

| Use case | Class | Notes |
|---|---|---|
| Social media content | **H+B** | Generation is easy; compliance review is the product |
| Video scripting | **H** | Strong |
| Video production | **H+I** | Existing tooling in Jeremy's workspace; separate track |
| Email campaigns | **H+D+I** | Draft native; send through the RCRE email integration with consent enforcement |
| SMS | **H+D+I** | **TCPA consent enforced in RCRE data, not by prompt** |
| Personal branding | **H** | SOUL.md + a brand skill per agent |
| AI Twin (voice/style) | **H** | This is precisely what SOUL.md + `USER.md` + a per-agent brand skill are for. **This is a genuine Hermes-native win** |
| Content calendar | **H+D** | Cron-driven |
| Newsletter | **H+D+I** | Draft + approve + send |
| Headshot/asset generation | **H** | FAL.ai image generation |

### Personal operations

| Use case | Class | Notes |
|---|---|---|
| Calendar management | **H+I** | Google/Microsoft via MCP |
| Task management | **H+D** | RCRE tasks so the broker can see them |
| Email triage | **H+I** | Summarise, draft, prioritise. **Draft-only by default** |
| Goal tracking | **H+D** | Against real production |
| Business planning | **H+D** | Real numbers, not aspirations |
| Training | **H+D** | Academy content retrieval and coaching |
| Brokerage questions | **H+D** | *"What's our policy on…"* — retrieval with citation |
| Market research | **H** | Strong |
| Expense/mileage tracking | **H+I** | Convenience; low risk |

### Additional agent cases (derived)

| Use case | Class | Why |
|---|---|---|
| **Post-showing instant follow-up** | **H+D** | Speed is the whole game; a 10-minute note wins deals |
| **Lender/title coordination** | **H+D+I** | Jeremy's mortgage side makes this uniquely credible for RCRE |
| **Buyer financing readiness triage** | **H+D** | Genuine differentiator given the partnership |
| **Neighbourhood expertise briefings** | **H** | Turns a new agent into a credible local voice in 10 minutes |
| **Objection handling rehearsal** | **H** | Voice mode makes live roleplay real, not a worksheet |
| **Listing presentation assembly** | **H+D+I** | Comps + marketing plan + brokerage proof, per appointment |
| **Contract clause explanation** | **H+D** | Retrieval + citation. **Never legal advice** |
| **Deadline countdown alerts** | **H+D** | Inspection, financing, appraisal — missing one is an E&O event |
| **Weekly seller report** | **H+D+I** | Showings, feedback, traffic, recommendation. Sellers rate agents on communication |
| **Duplicate-lead detection across sources** | **H+D** | Zillow + site + open house = one human |
| **Voice capture in the car** | **H** | Between appointments is when agents actually have time. Voice + messaging gateway |

---

## Part 3 — RCRE TODAY (Phase 3 of the brief)

The proposed experience:

> *3 new leads. 2 leads have not received follow up. 4 past clients are worth contacting. 1 buyer
> has not been contacted in 9 days. Your listing at 123 Main has an open house Saturday. 2
> transaction tasks are due. 3 client birthdays are coming up… Recommended actions: Call Sarah.
> Text Michael… Then: "Handle what you can for me."*

### Line-by-line feasibility

| Element | Source of truth | Verdict |
|---|---|---|
| "3 new leads" | RCRE `lead_intake_events` | **RCRE data.** Requires Phase 1 capture. Not available today at all |
| "2 leads have not received follow up" | RCRE activity + first-touch timestamps | **RCRE data + rule** |
| "4 past clients worth contacting" | RCRE contacts + recency + occasion rules | **RCRE data + scoring** |
| "1 buyer not contacted in 9 days" | RCRE activity | **RCRE data + threshold** |
| "Open house Saturday" | RCRE listings + calendar | **RCRE data + calendar integration** |
| "2 transaction tasks due" | RCRE tasks | **RCRE data** |
| "3 birthdays coming up" | RCRE contact fields | **RCRE data** — a field almost certainly missing today |
| "Closing anniversary approaching" | RCRE transactions | **RCRE data** |
| "No social content published today" | RCRE marketing state or social integration | **RCRE data + integration** |
| Recommended actions, prioritised | The model, over the above | **Hermes native** |
| "Handle what you can for me" | Approval-gated batch execution | **Hermes orchestration + RCRE MCP write tools + approval gate** |
| Presentation as a page | Desktop plugin `ROUTES_AREA` + `SIDEBAR_NAV_AREA` | **Hermes Desktop plugin** |
| Morning delivery | Hermes cron 06:30 → desktop + Telegram/Slack | **Hermes native** |
| Voice interaction | Voice mode | **Hermes native** |

### Verdict

**Roughly 80% of RCRE Today is RCRE data. Roughly 20% is Hermes.**

But that 20% is the part that is genuinely hard and genuinely differentiating: the synthesis, the
prioritisation, the natural-language interaction, the scheduled delivery across channels, the voice
mode, and the "handle it" execution loop with human approval. Building that from scratch is months
of work. Building it on Hermes is configuration plus an MCP server.

The uncomfortable implication is the right one: **RCRE Today cannot ship before the RCRE data
platform exists.** No amount of Hermes capability substitutes for having the leads, the activity
timestamps, the tasks, and the birthdays in a queryable store. This *strengthens* the Phase 1
priority already in the roadmap rather than replacing it.

**"Handle what you can for me"** should be tiered from day one, not switched on:

1. **Tier 1 (launch):** Hermes prepares everything — drafted texts, drafted emails, queued tasks,
   assembled campaign — and presents one approval screen. Nothing leaves the building unapproved.
2. **Tier 2 (after trust):** narrow auto-execute for genuinely low-risk internal actions — log the
   call, create the task, move the stage, schedule the reminder.
3. **Tier 3 (much later, per-agent opt-in, per-action):** send a templated, consented,
   pre-approved-pattern message to a known contact.

---

## Part 4 — RCRE COMMAND (Phase 4 of the brief)

> *12 new leads yesterday. Median response time is 14 minutes. 3 leads received no response. 4
> agents have overdue follow ups. 6 active transactions need attention. 2 recruiting prospects
> became highly engaged. 3 new reviews were received. Website generated 17 leads this week. 4
> agents have no meaningful CRM activity this week.*

| Element | Requires | Verdict |
|---|---|---|
| "12 new leads yesterday" | Owned lead capture | **RCRE data (Phase 1)** |
| "Median response time 14 min" | First-touch timestamps per lead | **RCRE data.** Impossible today — leads sit in Luxury Presence |
| "3 leads received no response" | Same | **RCRE data + rule** |
| "4 agents have overdue follow ups" | Task/activity model | **RCRE data** |
| "6 transactions need attention" | Transaction milestones + exception rules | **RCRE data + integration** |
| "2 recruiting prospects became highly engaged" | Recruiting pipeline + engagement scoring | **RCRE data + RCRE-computed score** |
| "3 new reviews" | Google/Zillow integration | **Integration** |
| "Website generated 17 leads this week" | Source attribution | **RCRE data** — needs `source_system` from Phase 1 |
| "4 agents no meaningful CRM activity" | Activity logging + a definition of "meaningful" | **RCRE data + policy** |
| Recommended management actions | The model | **Hermes native** |
| Delivery 07:00 to desktop + phone | Cron + gateway | **Hermes native** |

**Two design points.**

First, **"meaningful activity" is a policy decision, not a model judgement.** If a model decides
what counts, the metric becomes unstable and unfair — and it is being used to evaluate people's
livelihoods. RCRE defines it deterministically; Hermes reports it.

Second, **RCRE Command must be paired with a real dashboard, not replace one.** A daily narrated
briefing is excellent for attention direction. It is poor for the broker who wants to sort agents by
conversion rate and click into three of them. Conversation for the *briefing*; structured UI for the
*investigation*. Both, not one.

**Access control matters here.** RCRE Command reads across every agent's book. It must run in a
broker-scoped profile whose MCP credentials carry broker entitlements, and agent profiles must be
structurally incapable of calling those tools. That is enforced by RCRE's MCP server checking a
server-side identity — never a claim supplied by the model.

---

## Part 5 — What this map concludes

1. **Hermes is a strong runtime and interface layer and a weak system of record.** Every high-value
   use case routes through RCRE data.
2. **The Hermes-native wins are real and non-trivial:** research, drafting, coaching, roleplay,
   voice, scheduled briefings, multi-channel delivery, AI-twin voice/style, SOP authoring from
   source material, and orchestrated execution with human approval.
3. **The RCRE-owned obligations are equally real:** the data platform, scoring and thresholds,
   compliance gates, entitlements, centralized audit, and the structured dashboards that
   conversation is bad at.
4. **Nothing in RCRE Today or RCRE Command is blocked by Hermes.** Both are blocked by RCRE not yet
   owning its data — which is exactly what Phase 1 of the existing roadmap addresses.
