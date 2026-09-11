# RCRE product requirements

**Version 2 — 2026-08-24.** Derived from
[Taquilla Allen's leadership answers](../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md).

Supersedes the priority ordering in [ROADMAP-DRAFT.md](../05-planning/ROADMAP-DRAFT.md) and extends
[RCRE-TODAY-DATA-REQUIREMENTS.md](RCRE-TODAY-DATA-REQUIREMENTS.md), which remains valid for its
data contracts.

Every requirement carries one of three labels, and the labels must survive into any document that
quotes them:

- **[VLR]** — Verified Leadership Requirement. Taquilla asked for it.
- **[DP]** — Design Proposal. Our idea for satisfying a requirement. Not approved.
- **[TA]** — Technical Assumption. Believed, not verified. Carries risk.

---

## The three functions that define the product

Taquilla defined these herself, and they are the scope defence for everything below. **[VLR]**

1. **Lead follow-up and prioritisation** — who to contact, why, in what order.
2. **Pipeline and accountability management** — what is falling through, what is overdue, what
   moves a client toward appointment → showing → offer → contract → closing.
3. **Personalised business coach** — RCRE procedures plus individual performance, producing daily
   priorities, scripts, marketing ideas, coaching, time-blocking and specific next actions.

An AI feature that is not one of these three is, by leadership's own definition, lower value.

---

## P0 — the accountability loop

These exist because leadership cannot currently tell whether follow-up happened. Nothing else in
the product matters if this does not work.

### P0.1 Agent daily priorities — RCRE Today

| # | Requirement | Label |
|---|---|---|
| P0.1.1 | Tell the agent who to contact today, in priority order | **[VLR]** |
| P0.1.2 | Give a reason for each, traceable to a real event | **[VLR]** |
| P0.1.3 | Surface leads never contacted | **[VLR]** |
| P0.1.4 | Surface overdue follow-ups | **[VLR]** |
| P0.1.5 | Surface leads sitting too long in a stage | **[VLR]** |
| P0.1.6 | Show today's appointments | **[VLR]** |
| P0.1.7 | Propose a time-blocked plan for the day | **[VLR]** — agents need help with time blocking |
| P0.1.8 | Name the three most important actions to complete today | **[VLR]** |

**[DP]** The day plan is a *suggested schedule*, generated from the same deterministic signals as
the priority list, and it is editable rather than authoritative. We are not building calendar
scheduling, availability logic, or two-way calendar sync in the MVP. The concept has to be
demonstrated before it is engineered.

**[DP]** The three named actions are a deliberate cap. An agent whose problem is organisation is
not helped by a list of fourteen things.

### P0.2 Lead accountability detection

| # | Requirement | Label |
|---|---|---|
| P0.2.1 | Detect a lead assigned and never contacted | **[VLR]** |
| P0.2.2 | Detect a lead whose required follow-up has not occurred | **[VLR]** — **blocked**, see A-18 |
| P0.2.3 | Detect a lead aging in a stage beyond threshold | **[VLR]** |
| P0.2.4 | Detect an agent not updating lead statuses | **[VLR]** — leadership checks this by hand today |
| P0.2.5 | Alert management automatically on all of the above | **[VLR]** |

**P0.2.2 cannot be built yet.** "Required follow-up" is a brokerage policy — how many attempts,
over what window, through which channels, per source. RCRE has not defined it. Building a default
would mean enforcing our standard against their agents, silently. This is the single highest-value
answer we still need.

**[TA]** All detection is deterministic and rule-based. No model decides whether an agent is
behind. Explainability is not a nice-to-have here — these outputs are used to evaluate people.

### P0.3 Management exceptions — RCRE Command

| # | Requirement | Label |
|---|---|---|
| P0.3.1 | Which agents are responding, and which are not | **[VLR]** |
| P0.3.2 | Who has overdue follow-ups | **[VLR]** |
| P0.3.3 | Which leads have never been contacted | **[VLR]** |
| P0.3.4 | First response time, by agent | **[VLR]** |
| P0.3.5 | Contact attempts, by agent | **[VLR]** |
| P0.3.6 | Appointments set | **[VLR]** |
| P0.3.7 | Conversion rates | **[VLR]** |
| P0.3.8 | Time in each stage | **[VLR]** |
| P0.3.9 | Where leads fall out of the pipeline | **[VLR]** |
| P0.3.10 | Which agents are not updating statuses | **[VLR]** |
| P0.3.11 | What requires management attention *today* | **[VLR]** |

**[DP] Command stays exceptions-first.** Leadership's problem is that they check everything
manually. Replacing manual checking with forty charts is the same problem with better typography.
The primary surface answers P0.3.11; the detailed reporting in P0.3.4–P0.3.10 lives one level
deeper, reachable in one click.

### P0.4 Reporting drill-down

**[VLR]** The full-funnel report, lead assignment through closing.

**[DP]** Dimensions: agent · lead source · stage · market · time period.
Metrics: assigned · first response · contact attempts · appointments · conversion · stage aging ·
contracts · closings.

**[TA] Four of these metrics are forward-only** — response time, contact attempts, time in stage,
and pipeline fallout must be accumulated from FUB webhooks and cannot be calculated for the past.
See [FUB-CAPABILITY-VERIFICATION.md §8.2](../../RCRE/08-mvp/FUB-CAPABILITY-VERIFICATION.md).
**The clock starts the day webhooks are registered.** This is the strongest argument in the
project for registering webhooks early, and it needs leadership's explicit decision.

### P0.5 Follow Up Boss intelligence layer

**[VLR]** FUB stays the system of record. **[TA]** RCRE reads via API and webhooks, writes nothing
back in the MVP beyond what leadership explicitly authorises.

**[VLR] NOT AVAILABLE — SMS read receipts.** See [ADR-0014](../06-decisions/adr/0014-no-sms-read-receipts.md).
The need — *did the outreach land* — is met with delivery status, replies, email opens and clicks,
property activity and inbound calls. The word "read" is not used for any of them.

### P0.6 Multi-path lead routing

**[VLR]** Three routing paths, all real:
source → agent · source → Julio/Taquilla → agent · source → leadership → **Alabama team lead** → agent.

**[TA]** The team lead is a third role between broker and agent, with visibility over a subset of
agents. Unconfirmed (A-17), and it affects the permission model, so it needs an answer before the
role hierarchy is built.

---

## P1 — growth

### P1.1 Personalised AI business coaching
**[VLR]** Function 3. Daily priorities, scripts, marketing ideas, coaching, time-blocking, next
actions, grounded in RCRE procedures and the individual agent's performance.
**[DP]** Requires an RCRE procedures corpus that does not exist yet — see open questions.

### P1.2 Marketing system
**[VLR]** RCRE has **no agent marketing platform**. Facebook is the entire marketing presence.
Scope: social content · listing campaigns · open houses · video · email · past-client campaigns ·
database campaigns · buyer campaigns · seller campaigns · personal branding.
**[DP]** The MVP demonstrates the shape and builds the listing campaign end to end. Every public
asset routes through broker approval before publication — real-estate advertising is regulated,
and the approval gate is a compliance control, not a UX preference.

### P1.3 Recruiting system
**[VLR]** Current ISA-led calling underperforms; leadership wants a materially stronger system.
Scope: recruiting CRM · attribution · digital funnels · AI Academy as acquisition · engagement
scoring · follow-up · reporting.
**[VLR] Positioning pillars — and AI is not the headline:** systems and structure · hands-on
coaching and mentorship · multi-market opportunities · business development and growth ·
accountability and performance coaching · agent training and education.
**[DP]** AI is a differentiator *inside* that story. Recruiting material that leads with AI and
omits coaching and structure misrepresents what leadership says the brokerage offers.

### P1.4 Website acquisition
**[VLR]** Six objectives: buyer leads · seller leads · agent recruiting · SEO · agent showcase ·
FUB integration. **[DP]** AEO and GEO discoverability, conversion optimisation, local market
authority, RCRE attribution. See [WEBSITE-OPTIMIZATION-BACKLOG.md](../08-mvp/WEBSITE-OPTIMIZATION-BACKLOG.md).

---

## P2 — later

Deeper transaction intelligence · advanced marketing automation · additional integrations ·
advanced analytics. **[DP]** — none of this was requested; it is our own forward look.

---

## Sequencing note

The P0/P1/P2 labels are business priority. Delivery order is business priority **and** technical
dependency together, and in two places dependency wins:

1. **Webhook registration precedes everything measurable.** Four P0.4 metrics are forward-only.
   Every week of delay is a week of funnel history that cannot be recovered. This should be
   sequenced first even though it produces nothing visible.
2. **P0.2.2 is blocked on a business answer, not on engineering.** Build P0.2.1, P0.2.3 and P0.2.4
   now; leave the required-follow-up rule as a configurable gap that turns on the day RCRE defines
   the cadence.

## Requirements this document cannot yet satisfy

| Requirement | Blocker | Who resolves |
|---|---|---|
| P0.2.2 required-follow-up alert | "Required" is undefined | Taquilla / Julio |
| SMS read receipts | Protocol; not buildable | Closed — ADR-0014 |
| Stage-aging thresholds | No per-stage limits given | Taquilla / Julio |
| Custom dashboards | Scope ambiguous (A-19) | Taquilla |
| Team lead permissions | Role undefined (A-17) | Julio / Taquilla |
| RCRE procedures for coaching | No corpus exists | RCRE |
