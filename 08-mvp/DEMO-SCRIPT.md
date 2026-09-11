# RCRE demo — click-through script

**URL:** http://localhost:3200 · light mode is the default · toggle bottom-left of the sidebar.

Everything below is synthetic. Julio Arango and Taquilla Allen are real people with public
roles and public headshots; every number attached to them is invented and labelled as such.
No other person in the demo is real.

---

## Part 1 — The agent (Sarah Brockner)

1. **`/login` → Sarah Brockner.** Two personas, no password. Say out loud that this is a
   demonstration environment.
2. **Today.** The greeting states the count, then names the single thing that matters. Dana
   Whitfield is the priority card — five reasons, each traceable to an event, and a
   recommendation.
3. **Today's plan** — directly beneath it. The same signals, arranged into a suggested day around
   the appointments that are already booked, ending in **"If you only do three things"**. This is
   the answer to leadership's statement that agents struggle with organisation and time blocking:
   a longer list does not help someone whose problem is a longer list. The cap is the feature.
   Then: never-answered leads, follow-ups, the calendar, the listing with no marketing, and the
   agent's own numbers.
4. **Click Dana's card → contact record.** Full activity in both directions, source, assigned
   agent, price range, property interest, open tasks, and the AI panel with its reasoning.
   "← Today" returns to where you came from, not to a generic list.
5. **Ask RCRE AI why →** hands the same contact to the assistant.
6. **RCRE AI.** Run the chips in order:
   - *Who should I contact today?* — four people, ordered, with reasons
   - *Why should I contact Dana?* — reasoning plus the CRM card it read
   - *Draft the text* — a message that references what she actually looked at
   - **Plan my day** — the coaching turn. It arranges the day, then makes an observation about
     *her* pattern: strong first response, weak at day nine — and tells her what to drop if the
     day slips. This is the third of leadership's three functions, and it is what separates a
     coach from a search box.
   - *Show me leads nobody followed up with* — including one it will not act on because it
     belongs to another agent
   - *Handle what you can for me* — the split between done and waiting
   - **What needs my approval?** — three items, and it flags which one deserves a second look
   - *Show me my pipeline*
   Approve one item and watch it strike through. Nothing sends.
7. **Contacts.** Filter chips arrive from Command drill-ins; rows open the record and carry the
   filter back with them.
8. **Listings → 4407 Ortega Boulevard → Build the campaign.** The workflow runs step by step,
   produces the assets, passes a fair-housing check, and then **stops for approval**. Approve it
   and it says exactly what production would do and what this environment did not do.
9. **Training.** Short courses, progress, outcomes. Deliberately simple.

## Part 2 — The broker (Taquilla Allen or Julio Arango)

Sign out, choose the broker.

10. **Command.** Four brokerage numbers, then the exceptions: unanswered leads with the agent's
   name attached, agent activity, lead sources, recruiting. Every number and every row drills in.
   Command stays **exceptions-first** on purpose — leadership's problem is that they check
   everything by hand, and replacing manual checking with forty charts is the same problem in a
   nicer font.
11. **Full funnel report** (button at the top of Command). Lead assignment through closing, by
    agent, by lead source, or by stage; 30 days / 90 days / year to date; filtered by market.
    Nine columns: assigned, first response, attempts per lead, appointments, appointment rate,
    contracts, closings, fell out. **Chad Vesely is the story** — most leads assigned, slowest
    response, worst appointment rate, most fallout. Underneath, a funnel showing where leads are
    lost between stages.
    - Switch to **By stage** for stage aging: median time in stage against a threshold, and how
      many are over it now. The thresholds are labelled as placeholders, because RCRE has not set
      them and they are a brokerage policy decision, not a technical one.
    - Say the caveat out loud: **first response, attempts, time in stage and fallout can only be
      accumulated forward from the day webhooks are registered.** They cannot be backfilled.
12. **Click an agent row → agent record.** Their book, exception flags, overdue follow-ups,
    AI-training progress, never-answered leads, listings.
13. **Click a lead source → filtered contacts.** The Command context comes back with you.
14. **Recruiting.** Open with **"Where they came from"** — the channel mix. The AI Academy,
    Instagram and referral channels carry the engaged prospects; the ISA cold-call channel carries
    the cold ones. That contrast is the argument for the recruiting system, and leadership already
    knows the current motion is not productive.
15. **Nia Okonkwo.** The recruiting story: she found the public AI Academy through
    search, completed the course, attended the live session, then read the Join page twice this
    week. **Draft outreach** shows a message written from that trail. Nothing sends.
16. **`/join`** — the public recruiting page an agent like Nia actually sees.

---

## What this demo now shows that leadership specifically asked for

| Taquilla asked for | Where it is |
|---|---|
| Who to contact today, and why | Today · priority card · assistant |
| Leads nobody has followed up with | Today · Command · Contacts filter |
| Overdue follow-ups | Today · agent record |
| Leads sitting too long in a stage | Reporting → By stage |
| Time blocking help | Today's plan |
| The three most important actions | "If you only do three things" |
| Response time, attempts, appointments, conversion, stage aging, fallout — by agent | Full funnel report |
| Automated management alerts | Command exceptions (the alert delivery channel is not built) |
| A stronger recruiting model | Recruiting channel mix + Nia's Academy trail |
| An agent marketing platform | Marketing + the listing campaign builder |

**What she asked for that is not here, and will not be:** SMS read receipts. They do not exist at
the protocol level. See [ADR-0014](../06-decisions/adr/0014-no-sms-read-receipts.md). The demo
answers the underlying question — *did it land* — with delivery, replies, email opens and property
activity, and never uses the word "read".

## Added in the full build — 2026-08-24

| Screen | What is new |
|---|---|
| Today | Today's plan (time blocking) · "If you only do three things" · **Sitting too long** (stage aging) · four direct assistant entry points |
| RCRE AI | **Plan my day** coaching turn · three action states named consistently — `Done` / `Drafted · not sent` / `Needs your approval` |
| Contacts | **Search** (name, email, phone digits, area, tags) · next-action column · stage aging · deal panel with live milestone |
| Pipeline | Per-card aging, next action, over-threshold treatment |
| Listings | Full workspace — MLS, days on market, description, features, tasks with overdue, engagement trend, inquiries |
| Command | **Pipeline stages past threshold** and **Recruits who need attention** — the two exception questions that were previously unanswered |
| Reporting | Resolved date ranges · forward-only caveat raised above the numbers with `†` markers on the four affected measures |
| Recruiting | Prospect pipeline board · priority ordering · Academy and Join-page engagement · onboarding progress |
| Agents | Sorted by exception count · needs-attention column · stale-in-stage section · every row opens the record |
| Public / Join | The **six leadership pillars** drive both pages from one source; AI appears only after all six |
| Marketing | All ten campaign types; the listing campaign remains the interactive end-to-end flow |

## What is genuinely functional

- Every route, link, filter, drill-in and back-link — crawled across both personas, all resolve
- **Role scoping — 14 cases verified.** An agent cannot reach Command, reporting, recruiting, the
  agent roster, or another agent's contact. Recruiting is the sharpest case: prospects are usually
  licensed at another brokerage.
- CRM search, stage aging, deal context, listing tasks and engagement
- Role scoping — an agent cannot open, or be linked to, another agent's contact
- Light/dark theming with a persisted choice, applied before first paint
- The campaign builder's step sequence and its approval gate
- The assistant's conversation flow, tool-activity display, approvals and action routing
- Mobile layout on every screen, including a card list for Contacts

## What is simulated

- **The assistant does not call a model.** Responses are scripted over the synthetic dataset
  (`src/data/conversations.ts` explains why). Free text maps to the nearest scripted turn.
- **Nothing sends, writes, schedules or publishes.** Approve buttons record the approval in the
  browser and say plainly what production would have done.
- **All performance figures are invented**, including those beside real names.
- **Listing imagery is generated**, not photography. RCRE's CDN rate-limits and previously
  returned a wrong building for a listing; generated visuals cannot fail mid-demo.
- **Follow Up Boss is not connected.** The demo shows the intelligence layer described in
  ADR-0012, reading data that FUB would own.
