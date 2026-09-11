# RCRE Hermes Pilot Plan

**Status:** Plan only. **Not authorized to configure or run.** Jeremy approves before anything starts.
**Date:** 2026-08-19
**Depends on:** ADR-0007/0008/0009 (approved in principle) · at minimum a read-only RCRE MCP server
with some real data behind it

---

## 1. Why a pilot, and what it is actually for

The Hermes investigation answered what Hermes *can* do. It could not answer what a **working Realtor
who did not ask for this** will actually do with it. Those are different questions, and the second
one decides whether the strategy survives.

Three risks can only be retired by putting it in front of real people:

1. **Adoption.** Already the highest-rated delivery risk on the project. Install friction, macOS
   permission prompts, and "I don't have time for this" are not measurable from documentation.
2. **Cost.** Per-agent model spend at roster scale is currently a guess. One month of real usage
   replaces the guess.
3. **The desktop question.** ADR-0009 keeps the portal primary and treats Desktop as optional. The
   pilot tests whether that split is right — or whether agents ignore Desktop entirely, or love it
   enough to change the ordering.

**This pilot is not a demo and not a rollout.** It is an experiment with pre-committed success and
failure criteria, written down *before* it runs so the result cannot be rationalised afterwards.

---

## 2. Participants

Five people. Deliberately small.

| # | Role | Who | Why |
|---|---|---|---|
| 1 | **Broker / owner** | RCRE ownership | Tests RCRE Command, the broker view, and whether leadership finds the briefing worth reading |
| 2–4 | **Three agents** | Chosen with leadership (interview §11) | The actual test |
| 5 | **Administrator** | Jeremy | Provisioning, support burden, cost tracking, incident handling |

**Choosing the three agents matters more than anything else in this plan.** Get:

- **One enthusiast** — comfortable with technology, will push it, gives detailed feedback
- **One ordinary agent** — average technical comfort, busy, no particular interest in AI. **This is
  the most important participant.** The enthusiast will make it look better than it is
- **One sceptic** — if they will engage honestly. A polite sceptic who quietly stops using it teaches
  you nothing; an honest one who says "this is annoying and here's why" is worth more than the
  enthusiast

Ask leadership directly: *"Who would give me honest feedback rather than being polite?"*

**Do not** pick three enthusiasts. The result will be encouraging and wrong.

---

## 3. Prerequisites — none of this starts until these exist

- [ ] ADR-0007/0008/0009 approved in principle ✅ *(done 2026-08-19)*
- [ ] Discovery complete enough to know what data exists
- [ ] **RCRE MCP server with read-only tools over real RCRE data.** Without this the pilot tests a
      generic chatbot and proves nothing (ADR-0006: no hollow surfaces)
- [ ] At least a minimal RCRE data platform — leads, contacts, activity, tasks
- [ ] `rcre-agent` and `rcre-broker` profile templates
- [ ] A starter skill set — realistically 5–8 skills, not 39
- [ ] Guardrail hooks deployed and **tested against real attempts**, especially the PII-to-memory guard
- [ ] Written participant agreement: what data is accessed, what is logged, what happens at the end
- [ ] Cost tracking per participant, from day one
- [ ] A named support contact (Jeremy) and an agreed response expectation
- [ ] Explicit sign-off from leadership on client data reaching agents' machines

**If the MCP server isn't ready, delay the pilot.** A Hermes profile with no RCRE data is exactly the
"ChatGPT with a logo" failure ADR-0006 exists to prevent, and running it would poison the pilot group
against the real thing.

---

## 4. Duration and shape

**Four weeks.** Long enough for novelty to wear off; short enough to stay contained.

| Week | Focus | What we watch |
|---|---|---|
| **0** | Setup, one participant at a time, Jeremy present | **Install time, permission friction, where people get stuck.** This week produces the onboarding runbook |
| **1** | Guided use. Daily brief on. A weekly check-in call | First impressions, what they try, what confuses them |
| **2** | Unguided. No prompting from Jeremy | **The honest week.** Does usage continue when nobody is watching? |
| **3** | Introduce one or two more skills based on week 1–2 demand | Do new capabilities get picked up, or ignored? |
| **4** | Exit interviews, cost reconciliation, write-up | Decision |

**Week 2 is the real experiment.** Weeks 1 and 3 have an observer effect. Week 2 measures whether
this survives contact with an ordinary Tuesday.

---

## 5. What the pilot must answer

### Installation and setup

- How long does installation actually take, per person, wall-clock?
- Which macOS permission prompts (Accessibility, Screen Recording, TCC) confuse people, and where do
  they stall?
- Windows differences?
- Could an agent do this alone from written instructions, or is hand-holding mandatory?
- How much of Jeremy's time did each setup consume?
- What broke?

> **This produces the onboarding runbook.** Write it *from what went wrong*, not from what was planned.

### Cost

- Tokens per agent per day, and per week
- Cost split: interactive conversation vs. scheduled routines vs. research
- Cost difference between the enthusiast and the ordinary agent — **the ratio is the number that
  matters for fleet budgeting**
- What did the broker profile cost?
- Which workloads could run on a cheaper model with no felt quality loss?
- Feed results into [RCRE-AI-COST-MODEL.md](RCRE-AI-COST-MODEL.md) and replace the estimates

### Actual usage

- Which skills were used? How often?
- Which were never touched?
- **What did they ask for that doesn't exist?** — the highest-value output of the whole pilot
- Where did they misunderstand what it could do?
- Where did it give a wrong or unhelpful answer, and what did they do next?
- Did anyone stop using it? When, and why?

### Channel preference

- Desktop vs. portal vs. SMS — where did each person actually spend time?
- Did anyone use voice? In the car?
- Did the morning brief get read?
- **Was Desktop worth its install cost for each participant?**

> This directly tests ADR-0009. If ordinary agents live in SMS and the portal and never open Desktop,
> the optional-power-surface framing is confirmed. If they open Desktop constantly, reconsider.

### Support and safety

- How many support requests? What kind?
- What did Jeremy spend per week supporting five people? **Multiply by roster size and be honest
  about it**
- **Did anyone try to put client PII into memory?** Did the hook catch it?
- Did anyone attempt something prohibited?
- Did anyone find a way around a guardrail?
- Any near-miss involving client data?
- Did anyone try to install their own skills or plugins?
- What made anyone uncomfortable?

### The recruiting question

- Would each participant tell another agent about this?
- Shown the whole thing, would an agent at another brokerage find it compelling?
- **Ask the broker directly: would you use this in a recruiting conversation tomorrow?**

---

## 6. Success and failure criteria

**Committed before the pilot runs.**

### Success — all of these

| # | Criterion | Threshold |
|---|---|---|
| S1 | **Ordinary agent still using it in week 2, unprompted** | The single most important criterion |
| S2 | Setup completable in **under 60 minutes** per agent with support | |
| S3 | Blended cost per agent **within the modelled band** | See cost model |
| S4 | **Zero client-PII leaks** into profile memory | Non-negotiable |
| S5 | **Zero guardrail bypasses** | Non-negotiable |
| S6 | At least **three skills** in genuine repeated use | |
| S7 | Support burden extrapolates to **under ~4 hours/week** at roster scale | |
| S8 | Broker reads the morning briefing **most days** | |
| S9 | At least two participants say they'd recommend it | |
| S10 | The recruiting demo can be run end to end **without apologising** | |

### Failure — any one of these

| # | Criterion | Consequence |
|---|---|---|
| F1 | **Ordinary agent stops using it once nobody is watching** | The strategy needs rethinking, not more features |
| F2 | Setup routinely exceeds 2 hours or requires Jeremy for every step | Desktop is not deployable at scale as configured |
| F3 | **Any client-PII leak into memory that the guard did not catch** | **Stop. Fix before anything continues** |
| F4 | **Any guardrail bypass** | **Stop** |
| F5 | Cost per agent exceeds ~2× the modelled band | Re-model before rollout |
| F6 | Support burden extrapolates beyond ~10 hours/week | Not sustainable |
| F7 | Participants use it as generic ChatGPT and get nothing RCRE-specific from it | The MCP data layer isn't earning its place |
| F8 | Anything is discovered that RCRE's compliance posture cannot accept | Escalate to counsel |

### Ambiguous — expected, and fine

Partial adoption, enthusiast-only usage, or "useful but not daily" is **not failure**. It means
scoping down and finding the two or three things that genuinely matter. Record it honestly rather
than reading it as either success or failure.

---

## 7. What the pilot must not do

- **No client outbound.** Everything drafts; nothing sends. Not to leads, not to clients, not to
  recruits.
- **No production writes** to any incumbent system.
- **No real transaction modification.**
- **No computer use.** Disabled in all pilot profiles.
- **No shell or code execution** in agent profiles.
- **No agent-installed skills or plugins.**
- **No pilot to more than five people.** Expanding mid-pilot destroys the measurement.
- **No new features mid-pilot** beyond the planned week-3 skill additions.
- **No fixing problems silently** — log them; they are the output.

---

## 8. What we collect

| Source | What |
|---|---|
| **RCRE MCP server logs** | Every call: identity, tool, timestamp. Usage truth |
| **Cost data** | Per profile, daily |
| **Setup log** | Time, blockers, permission prompts, Jeremy's hours |
| **Support log** | Every request, category, time spent |
| **Weekly 15-min check-ins** | Same three questions each week: *What did you use? What annoyed you? What did you want that wasn't there?* |
| **Exit interview, 30 min** | Per participant |
| **Guardrail events** | Every hook block, every refusal |

**Set expectations at the start:** participants know their tool usage is logged. That is both ethically
required and part of what a brokerage supervision model looks like in production.

---

## 9. Exit interview

1. Walk me through how you actually used it in a normal week.
2. What did you use most?
3. What did you never touch?
4. **What did you want it to do that it couldn't?**
5. When did it get something wrong? What did you do?
6. Desktop, portal, or text — where did you spend your time, and why?
7. Did you use voice? When?
8. Did the morning brief matter?
9. What annoyed you?
10. **Did anything make you uncomfortable?**
11. Would you keep using it if we stopped supporting it tomorrow?
12. Would you tell another agent about it?
13. **If you were at another brokerage and saw this, would it matter to you?**
14. What should we build next?

---

## 10. Outputs

1. **Pilot findings report** — against every criterion in §6, including the failures
2. **Onboarding runbook** — written from what actually went wrong
3. **Updated cost model** — real numbers replacing estimates
4. **Skill priority list** — what to build next, from what they asked for
5. **ADR dispositions** — 0007/0008/0009 move to `Accepted`, get revised, or get reconsidered
6. **Go / adjust / stop recommendation**

---

## 11. Decision after the pilot

| Outcome | Next |
|---|---|
| **Success criteria met** | Move ADRs to Accepted. Plan phased rollout with the runbook. Keep the pilot group as design partners |
| **Adoption weak, capability sound** | Keep Hermes for broker + power users. Portal carries the agent experience. **Revise ADR-0009 toward portal-only for most agents** |
| **Cost too high** | Re-model with cheaper models on scheduled work. Reduce routine frequency. Re-test |
| **Support burden too high** | Rethink distribution — hosted/remote gateway, or portal-only for most agents |
| **Safety failure** | **Stop.** Fix and re-pilot. No rollout |
| **Agents want it but not on Desktop** | Confirms ADR-0009. Invest in portal + SMS; keep Desktop for power users |
| **Broader failure** | Hermes remains a Jeremy/broker tool. RCRE builds a narrower assistant against the same MCP layer — which still exists and is still useful. **The MCP boundary is what makes this reversible** |

---

## 12. Cost of running the pilot

| Item | Estimate |
|---|---|
| Model usage, 5 profiles × 4 weeks | See [RCRE-AI-COST-MODEL.md](RCRE-AI-COST-MODEL.md) |
| Jeremy's setup time | ~1–2 hours per participant |
| Jeremy's support time | ~2–4 hours per week |
| Check-ins and exit interviews | ~6 hours total |
| Participant time | ~1 hour setup + ~30 min/week each |

**Small.** Which is the point — this is cheap insurance against a fleet-wide deployment that agents
don't use.
