# Leadership discovery answers — Taquilla Allen

**Source:** Taquilla Allen, Managing Broker, RCRE Group
**Received:** 2026-08-24, in writing, relayed by Jeremy McDonald
**Status:** **AUTHORITATIVE.** These are leadership's own words about their own business.

This document does not replace [RCRE-LEADERSHIP-DISCOVERY-INTERVIEW.md](../RCRE-LEADERSHIP-DISCOVERY-INTERVIEW.md)
or any other discovery document. Those record what we asked and what we assumed. This records
what leadership answered. Where the two conflict, **this wins**, and the older document keeps its
original text so the change of understanding stays visible.

---

## How to read the classifications

Every downstream document derived from this file must preserve these three labels. They are not
decoration — they are the difference between something RCRE asked for and something we decided.

| Label | Meaning | Who is accountable |
|---|---|---|
| **VERIFIED LEADERSHIP REQUIREMENT** | Taquilla stated it. It is a business requirement. | RCRE |
| **DESIGN PROPOSAL** | Our idea for how to satisfy a requirement. Not yet approved. | Jeremy / build team |
| **TECHNICAL ASSUMPTION** | Something we believe is true but have not verified. Carries risk. | Build team |

A **DESIGN PROPOSAL** must never be presented to RCRE as something they asked for. A
**TECHNICAL ASSUMPTION** must never be presented to RCRE as something that works.

---

## 1. Follow Up Boss — current use

> "We currently use Follow Up Boss to manage and track our leads, and all of our agents are
> expected to actively use it."

- **VERIFIED LEADERSHIP REQUIREMENT** — FUB is the lead management system of record. Confirms
  [ADR-0012](../../06-decisions/adr/0012-follow-up-boss-incumbent.md).
- **VERIFIED** — all agents are *expected* to use it actively. Note the word: **expected**, not
  *observed*. Leadership separately says they have no good way to know whether follow-up happened,
  so expectation and reality are not the same thing, and closing that gap is the product.

### What Taquilla wants FUB to do better

> "I would like the ability to see when someone has read a text message that was sent through the
> system."

- **VERIFIED LEADERSHIP REQUIREMENT** — the underlying need is *knowing whether outreach landed*.
- **The specific mechanism requested is not technically available.** See
  [FUB-CAPABILITY-VERIFICATION.md §8](../../08-mvp/FUB-CAPABILITY-VERIFICATION.md) for the
  verification. Summary: standard SMS carries no read receipt at the protocol level. This is not
  an FUB limitation and no vendor can supply it over SMS.
- **DESIGN PROPOSAL** — satisfy the *need* with the engagement signals that do exist (delivery
  status, replies, email opens and clicks, site and property activity, inbound calls) rather than
  the *mechanism* requested.

> "I would also like better reporting so we can quickly see each agent's performance from lead
> assignment through closing, including response time, contact attempts, appointments, conversion
> rates, how long leads remain in each stage, and where leads are falling out of the pipeline."

- **VERIFIED LEADERSHIP REQUIREMENT** — the full funnel report, by agent, assignment → closing.
  Seven named metrics. This is the single most concrete requirement in the entire discovery.

> "More customizable dashboards and automated alerts when agents are not following up or when a
> lead has been sitting in a stage too long would also be extremely helpful."

- **VERIFIED LEADERSHIP REQUIREMENT** — automated alerts on two conditions: **no follow-up** and
  **stage aging**.
- **VERIFIED LEADERSHIP REQUIREMENT** — customisable dashboards. *Customisable* is doing real work
  in that sentence and we have not scoped what it means. See open questions.

## 2. Lead routing and follow-up accountability

> "Most leads come directly to the agents. In some cases, Julio or I will answer the lead and
> assign it to an agent. In Alabama, we sometimes answer the lead and assign it to the team lead,
> who then distributes it to an agent."

- **VERIFIED** — three distinct routing paths, not one:
  1. Source → agent directly (the majority)
  2. Source → Julio or Taquilla → agent
  3. Source → leadership → **Alabama team lead** → agent
- **VERIFIED** — Alabama has a **team lead layer** that Florida does not. This is a role RCRE has
  that no prior document accounted for.

> "We currently do not have a great way of knowing whether the proper follow-up actually happened.
> It would be very helpful to have automated alerts when a lead has not been contacted or when the
> required follow-up has not occurred."

- **VERIFIED LEADERSHIP REQUIREMENT — P0.** Lead accountability is the confirmed core problem.
- Note the two distinct conditions again: **never contacted** and **required follow-up not
  performed**. The second is harder: it presumes a definition of "required", which RCRE has not
  given us. See open questions.

## 3. Recruiting

> "We currently have an ISA making recruiting calls, but it has not been very productive. We need
> to explore other options and develop a much stronger recruiting system. Recruiting is definitely
> an area where we need additional help."

- **VERIFIED** — there *is* a recruiting motion today: an **ISA making outbound calls**.
- **VERIFIED** — it is **underperforming**, in leadership's own assessment.
- **VERIFIED LEADERSHIP REQUIREMENT** — RCRE wants a materially stronger recruiting system and is
  explicitly asking for help.
- This **corrects assumption A-06** ("there is no recruiting technology today"). There is no
  recruiting *technology*, but there is a recruiting *process* and a person doing it.

## 4. Why an agent should choose RCRE

> "Systems and structure · Hands-on coaching and mentorship · Multi-market opportunities ·
> Business development and growth · Accountability and performance coaching · Agent training and
> education"

- **VERIFIED LEADERSHIP REQUIREMENT** — these six are RCRE's recruiting positioning pillars.
- **This is a correction to our positioning.** Taquilla was asked what matters *outside* AI, and
  named six things — none of which is AI. AI is a differentiator *inside* a broader agent growth
  system, not the headline. Recruiting material that leads with AI and omits coaching, structure
  and multi-market opportunity misrepresents the brokerage.

## 5. What agents need most

> "Consistent follow-up, organization, and time blocking."

- **VERIFIED LEADERSHIP REQUIREMENT** — three named agent problems. All three are *behavioural*,
  not informational. An agent surface that only *shows* information does not solve any of them.
- **Time blocking is new.** No prior requirement document mentions it.

## 6. What leadership repeats manually

> "Running reports, checking to make sure agents are keeping their lead statuses updated,
> monitoring lead activity, and following up with agents to make sure things are being completed."

- **VERIFIED LEADERSHIP REQUIREMENT** — four repeated management tasks, all of them
  *verification* work: checking that something happened.
- **This validates RCRE Command as a primary product surface**, and defines its job precisely:
  move management from *checking everything* to *being told what needs attention*.
- **Note the third item — "agents keeping their lead statuses updated".** Stage hygiene is itself
  a monitored behaviour. An agent who never updates a stage will look identical to an agent with
  no movement, which corrupts every funnel metric leadership asked for in §1.

## 7. Technology and marketing

> "For lead management and communication, we primarily use Follow Up Boss. We currently do not
> have a strong marketing system or platform in place for the agents. Our main team marketing
> presence right now is our Facebook page. This is an area we need to build out."

- **VERIFIED** — FUB covers lead management **and communication** (texting, email, calling).
- **VERIFIED** — there is **no agent marketing platform**. Marketing presence is a Facebook page.
- **VERIFIED LEADERSHIP REQUIREMENT** — marketing is an explicit build-out area.
- **Taquilla did not answer** the transaction management, e-signature, accounting, or file storage
  parts of the question. Treat those as **still unknown**, not as "none". A brokerage in two
  states necessarily has transaction and signature tooling of some kind. See open questions.

## 8. Website

> "We need a better strategy for driving traffic to the website and turning that traffic into
> actual opportunities. Right now, the website is pretty much just there. I would like it to
> actively generate buyer and seller leads, attract potential agents, improve our SEO presence,
> showcase our agents, and integrate more effectively with Follow Up Boss."

- **VERIFIED LEADERSHIP REQUIREMENT** — six website objectives: buyer leads, seller leads, agent
  recruiting, SEO, agent showcase, FUB integration.
- **VERIFIED** — leadership's own assessment of the current site is that it is "pretty much just
  there". This is direct validation of the website audit's conclusions.

## 9. The three most valuable AI functions

Taquilla defined these herself. **They are the definition of the RCRE AI agent experience.**

1. **Lead follow-up and prioritisation** — tell agents exactly *who* to contact, *why*, and in
   what order.
2. **Pipeline and accountability management** — monitor leads and transactions, identify clients
   falling through the cracks, flag overdue follow-ups, and move clients toward appointments,
   showings, offers, contracts and closings.
3. **Personalised business coach and assistant** — understand RCRE procedures and each agent's
   individual performance; provide daily priorities, scripts, marketing ideas, coaching,
   time-blocking recommendations and specific action steps.

- **VERIFIED LEADERSHIP REQUIREMENT.** Any AI feature that is not one of these three is, by
  leadership's own definition, lower value. That is a scope defence, and it should be used as one.

## 10. Commercial strategy

> "I see us building and using this within RCRE first so we can test it, improve it, and prove
> that it works in a real brokerage environment. Once we have a strong system and can demonstrate
> results, I see a much bigger opportunity to package the technology, systems, and AI tools and
> offer them to other brokerages."

- **VERIFIED LEADERSHIP REQUIREMENT** — RCRE first, as a proving ground. Multi-brokerage
  packaging is a **later, intended** outcome, not a hypothetical one.
- **This resolves the largest open architecture question in the project** and corrects assumption
  A-09. See [ADR-0013](../../06-decisions/adr/0013-rcre-first-proving-ground.md).

---

## What Taquilla did NOT answer

Recorded so that silence is not mistaken for a negative answer.

| Question | Status |
|---|---|
| Transaction management platform | Unanswered |
| Electronic signature platform | Unanswered |
| Accounting platform | Unanswered |
| File storage platform | Unanswered |
| Email platform, separate from FUB | Partially — "primarily FUB" implies something else exists |
| Number of agents | Unanswered |
| Which MLSs RCRE belongs to | Unanswered |
| What "required follow-up" means concretely | Unanswered — blocks a P0 alert |
| What "customisable dashboards" means | Unanswered |
| Whether Julio agrees with all of the above | Unanswered — this is one broker's view |
