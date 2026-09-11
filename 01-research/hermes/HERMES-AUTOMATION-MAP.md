# RCRE Automation Map — Cron, Events, and Subagents

**Date:** 2026-08-19
**Covers:** Phase 9 (cron/webhooks/event-driven) and Phase 10 (subagents)

---

## 1. The structural constraint

**Hermes cron is time-driven, not event-driven.** Verified: triggers are cron expressions, intervals,
one-shot delays, ISO timestamps, manual `cronjob(action="run")`, and pre-run scripts with `wakeAgent`
gates. There is **no inbound webhook trigger** in the cron system.

**But the API server closes the gap.** `POST /v1/runs` creates an agent run, and
`POST /v1/runs/{run_id}/approval` resolves a pending approval. So the pattern for event-driven work
is:

```
Business event (new lead)
   → RCRE backend (owns the event, the rules, the audit)
   → POST /v1/runs on the agent's Hermes API server   [or gateway message]
   → Hermes reasons, drafts, prepares
   → approval surfaced in RCRE portal or desktop
   → RCRE backend executes the approved action
```

**The important consequence:** the RCRE backend is the event bus. Hermes is the reasoning and
interface layer that the bus invokes. This is architecturally cleaner than Hermes polling, and it
keeps the trigger logic, the audit, and the approval state in RCRE where they can be supervised.

**Practical note:** `POST /v1/runs` requires each agent's Hermes API server to be reachable from
RCRE's backend. For desktop-installed agents behind NAT, that is not generally true. Two viable
fallbacks: (a) deliver the event through a **messaging gateway** (SMS/Teams) which the agent's
Hermes already listens on, or (b) have the agent's profile run a **short-interval cron** that polls
an RCRE "pending work" endpoint. Option (a) is preferred; option (b) is the reliable default.
**[UNVERIFIED]** whether Hermes Cloud or a remote gateway makes direct inbound runs practical at
fleet scale — worth testing in the pilot.

---

## 2. Scheduled work (Hermes cron)

Time-driven, per-profile, delivered to desktop and/or messaging channels.

### Agent profile routines

| Routine | Schedule | Output | Approval | Notes |
|---|---|---|---|---|
| **RCRE Today brief** | Weekdays 06:30 | Desktop + SMS | None (read) | The flagship |
| Daily prospecting list | Weekdays 07:00 | Desktop | None | Can fold into Today |
| Unanswered-lead check | Every 2h, 8:00–18:00 | SMS if non-zero, else `[SILENT]` | None | Response time is the metric that matters |
| Task/deadline sweep | Weekdays 07:00 + 16:00 | Desktop + SMS | None | Missed inspection deadlines are E&O events |
| Transaction milestone check | Daily 08:00 | Desktop | None | |
| Occasion scan (birthdays, closing anniversaries) | Weekly Mon 07:00 | Desktop with drafts | **Yes — before send** | |
| Stale-contact sweep | Weekly Fri 15:00 | Desktop | None | |
| Weekly business review | Fri 16:00 | Desktop + email | None | Production vs goals |
| Monthly database audit | 1st, 08:00 | Desktop | **Yes — for any fix** | Merges/deletes = strong approval |
| Market intelligence (their counties) | Weekly Mon 06:00 | Desktop | None | Genuinely hard to do manually across 10 counties |
| Calendar prep | Daily 06:45 | Desktop + SMS | None | |
| **Skill freshness check** | Weekly | Silent unless stale | None | `hermes skills check/update` — mitigates the pull-only distribution limit |

### Broker profile routines

| Routine | Schedule | Output | Notes |
|---|---|---|---|
| **RCRE Command brief** | Weekdays 07:00 | Desktop + Teams/Slack + SMS | The flagship |
| Response-time exception report | Daily 09:00 | Desktop | Named agents, named leads |
| No-activity agent report | Weekly Mon 08:00 | Desktop | Retention signal |
| Recruiting pipeline review | Weekly Mon 08:30 | Desktop | Stalls and engagement spikes |
| Recruiting nurture prep | Weekly | Drafts for approval | **Approval before any contact** |
| Onboarding progress | Weekly | Desktop | Time-to-first-closing is the metric |
| Transaction exception sweep | Daily 08:00 | Desktop | |
| Review monitoring | Daily 10:00 | Desktop | Response drafts approval-gated |
| Website/SEO/lead-source performance | Weekly Mon 09:00 | Desktop + email | |
| Licence & CE expiry | Weekly | Desktop | AL + FL. Compliance-critical |
| Roster reconciliation (site vs MLS vs roster) | Weekly | Desktop | The audit found 13 vs 9 drift |
| Competitive intelligence | Monthly | Desktop | Rival splits, tech, offers |
| Vendor renewal calendar | Monthly | Desktop | Luxury Presence renewal must never surprise |
| Monthly business review pack | Monthly | Desktop + email | |

**Cost discipline:** each routine × each agent × frontier model is a recurring cost. Use `[SILENT]`
so nothing fires when there is nothing to say, use no-agent mode for pure data pulls, and pin cheaper
models on mechanical routines. Model the monthly cost before fleet rollout.

---

## 3. Event-driven work (RCRE backend → Hermes)

| Event | Trigger source | What happens | Approval |
|---|---|---|---|
| **New lead** | Website form / lead provider webhook | Route → notify agent → draft first contact | **Yes — before send** |
| **Lead unanswered past SLA** | RCRE timer | Escalate to agent, then team lead, then broker | None (internal) |
| New recruiting prospect | Recruiting form | Notify recruiter, assemble research brief | None (read) |
| Recruiting prospect engagement spike | RCRE scoring | Alert + suggested next touch | Yes — before contact |
| New listing created | RCRE record | Kick off the listing workflow | Yes — for published assets |
| **Executed contract** | TM/e-sign webhook | Create transaction, generate milestones and tasks | None (internal) |
| Transaction milestone reached | TM webhook / RCRE | Update tasks, notify parties | Yes — for outbound |
| **Deadline approaching** | RCRE timer | Alert agent (and broker if critical) | None |
| Open house scheduled | RCRE calendar | Prepare materials and follow-up templates | Yes — for campaign |
| Open house registrant captured | Form | Same-day follow-up draft | **Yes — before send** |
| Showing feedback received | TM / form | Summarise for seller report | Yes — before send |
| Closing completed | RCRE | Review request, referral ask, anniversary enrolment | Yes — before send |
| New review posted | Review platform | Notify + draft response | **Yes — public** |
| Website inquiry | Luxury Presence / RCRE capture | Route and notify | Yes — before send |
| Agent onboarding step completed | RCRE | Advance checklist, notify | None |
| **Agent departure initiated** | RCRE admin | Revoke MCP + OAuth + gateway allowlist; reassign listings | **Human-executed** |

### Scheduled vs event-driven — the rule

- **Event-driven** when latency matters (leads, deadlines, contracts, reviews). Lead response time is
  the single metric most correlated with conversion; it cannot wait for a 6:30am batch.
- **Scheduled** for synthesis, review, and sweeps (briefings, weekly reviews, audits).
- **Both** for the important ones: an unanswered lead is an *immediate* alert **and** appears in
  tomorrow's brief **and** in the broker's exception report. Redundancy is correct here.

---

## 4. Subagents — where they earn their place, and where they do not

### The scenario under test

> *"I am listing 123 Main Street tomorrow. Build everything."* → Property Research Agent, Listing
> Agent, Marketing Agent, Social Agent, Video Agent, Open House Agent, Database Agent, Follow-Up Agent

### The constraints that decide it

- **Up to 3 concurrent subagents by default.** Eight named agents would serialise into three waves.
- **Total context isolation:** *"Subagents start with a completely fresh conversation. They have zero
  knowledge of the parent's conversation history, prior tool calls, or anything discussed before
  delegation."* Every subagent must be handed the property, the seller, the agent's brand voice, the
  market, and the compliance rules — **repeated eight times**.
- **Only the final summary returns** to the parent.
- Subagents lose `memory`, `send_message`, `cronjob`, and `clarify` — so a subagent **cannot ask a
  clarifying question**. On ambiguous listing input, it guesses.
- Roles are `leaf` and `orchestrator` only — **no custom subagent types**.

### Verdict on the eight-agent listing scenario: mostly agent theatre

The work is largely **sequential and shared-context**, which is the worst possible fit for isolated
parallel subagents:

- Marketing copy depends on property research
- Social depends on marketing copy
- Video script depends on marketing copy
- Open house materials depend on the listing package
- Everything depends on the same brand voice and the same fair-housing constraints

Splitting it means re-passing the same context eight times, losing the ability to clarify, and
producing eight summaries the parent must reconcile — for work one well-skilled session does
coherently and more cheaply.

### Where subagents genuinely help

**Parallel, independent, read-only fan-out.** Real RCRE cases:

| Case | Why it fits |
|---|---|
| **Property research fan-out** — tax records, permits, flood, schools, HOA/CDD, prior sales | Genuinely independent sources; each returns a fact block; no shared reasoning needed |
| **Multi-county market research** — one subagent per county | Independent by construction; RCRE has 10 counties |
| **Recruiting prospect research** — production, listings, social, tenure | Independent public sources |
| **Competitive scan** — several rival brokerages in parallel | Independent |
| **Bulk contact enrichment** | Mechanical, parallel — though `execute_code` batching may beat delegation |

**The pattern:** subagents are for **parallel independent research**, not for **sequential creative
production**.

### Recommendation

1. **Do not build a multi-agent listing pipeline.** Build **one `rcre-listing-marketing` skill** that
   runs the sequence in a single session with full context.
2. **Use subagents for research fan-out only**, where sources are genuinely independent.
3. Pin `delegation.model` to an inexpensive model, per the docs' own cost guidance.
4. Revisit if the concurrency default rises meaningfully or if measured quality favours delegation —
   test it, don't assume it.

The brief's own instruction is the right standard: *"Prefer simple architectures unless parallel
subagents materially improve quality or speed."* On the listing scenario, they do neither.

---

## 5. Rollout sequence

| Phase | Automation | Why here |
|---|---|---|
| **1** | None. Build capture + MCP read tools | Nothing to automate until data exists |
| **2** | Read-only scheduled briefs (RCRE Today, RCRE Command) | Zero risk, immediate visible value, builds trust |
| **3** | Event-driven **alerts** (new lead, unanswered, deadline) | Still read-only. Proves the event path |
| **4** | **Draft** generation with approval (follow-ups, campaigns) | First writes — all human-approved |
| **5** | Narrow auto-execute for **internal** actions only (log call, create task, move stage) | Low blast radius, fully reversible |
| **6** | Per-agent opt-in, per-action limited autonomy for consented, templated outbound | Only after audit and trust are established |

**Nothing in phases 1–3 can harm a client, and that is deliberate.** The most common failure mode for
agentic systems in regulated industries is starting at phase 5.
