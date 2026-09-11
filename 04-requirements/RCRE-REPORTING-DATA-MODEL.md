# RCRE reporting data model

**Date:** 2026-08-24 · Derived from
[Taquilla Allen's answers](../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md) §1.
Schema: [0002_reporting_and_routing.sql](../apps/rcre/supabase/migrations/0002_reporting_and_routing.sql).

Seventeen metrics, worked backward from what leadership asked for. Each one names the raw events it
needs, so it is obvious which webhook subscription it depends on and what breaks if that
subscription is dropped.

## The three-way split that governs everything here

| | Meaning |
|---|---|
| **AVAILABLE IMMEDIATELY** | Computable from a historical read on day one. Backfillable. |
| **FORWARD-ONLY** | Requires event history FUB does not keep. Starts accumulating at webhook registration. **Not backfillable, ever.** |
| **BLOCKED BY BROKERAGE POLICY** | The calculation is built; the threshold is RCRE's to set. Ships inert. |

Every report surface must state its own earliest valid date by reading
`integration_state.webhook_activated_at`. A chart that silently begins where the data begins
implies a history it does not have.

## Attribution — applied consistently to all sixteen

| Dimension | Rule |
|---|---|
| **Agent** | The agent assigned **at the time of the event**, from `assignment_history`, not the current owner. Reassignment must not retroactively move an agent's past performance onto someone else. |
| **Lead source** | `people.source` as FUB holds it, enriched by `attribution` where RCRE captured the lead. First-touch source, never last. |
| **Market** | From the assigned agent's team (`teams.market`), not from the property. An agent's numbers belong to their market even when a client shops elsewhere. |
| **Time window** | The event's own timestamp, in RCRE's local time. Clamped to `webhook_activated_at` for forward-only metrics. |

---

## 1. First response time

**Business definition** — elapsed time from the moment a lead reached **the agent who was
expected to work it** to that agent's first outbound contact attempt.

**Raw events** — `peopleCreated`, `peopleUpdated` (assignment), `callsCreated`,
`textMessagesCreated`, `emailsCreated`

**Calculation** — `min(first outbound call | text | email).occurred_at − assignment_history.assigned_at`
where `is_final_agent = true`.

Three rules that decide whether this number is fair:

- **Measured from final assignment, not lead arrival.** An Alabama lead routed leadership → team
  lead → agent would otherwise charge the agent for routing delay. Time-to-route is reported
  separately, as a leadership metric.
- **Outbound only.** A note, a stage change, or an inbound call is not a response.
- **Never-contacted leads are excluded, not scored zero.** A lead with no outbound touch has no
  response time; counting it as `0` flatters the median and counting it as `∞` destroys it. It
  belongs in *unanswered leads* (metric 11), which is a count, not a duration.

**Report as median, not mean.** One lead answered three weeks late moves a mean and tells you
nothing about the typical lead.

**Backfill — FORWARD-ONLY.** Calls, texts and emails are readable historically, but
`assignment_history` does not exist before activation, so the clock has no reliable start.

*An earlier draft of this document proposed computing a pre-activation approximation from
`people.created` and labelling it as such. **That has been rejected in implementation.**
`firstResponseForPerson` returns `no_measurable_assignment` instead. An approximation that appears
in the same median as measured values will be read as measured, and the label does not survive a
screenshot. If leadership wants the pre-activation estimate, it belongs on a separately named
function and a separate surface.*

## 2. Contact attempts

**Definition** — count of **outbound** calls, texts and emails to a person.

**Raw events** — `callsCreated`, `callsUpdated`, `textMessagesCreated`, `emailsCreated`

**Calculation** — `count(activity where direction = 'outbound' and kind in ('call','text','email'))`,
per person and per agent-period.

Report **attempts per lead**, not raw attempts — raw volume rewards whoever was assigned the most
leads. Distinguish *attempted* from *connected* using `calls.outcome`: five voicemails is not five
conversations, and an agent-accountability metric that cannot tell them apart will be argued with,
correctly.

**Backfill** — historically readable from `/v1/calls`, `/v1/textMessages`. **Partially available
immediately**, though per-person iteration is required (no date-range filter on `/v1/calls`).

## 3. Appointment set rate

**Definition** — share of assigned leads that reach a scheduled appointment.

**Raw events** — `appointmentsCreated`, `peopleCreated`

**Calculation** — `distinct people with ≥1 appointment ÷ people assigned in period`

**Backfill** — **AVAILABLE IMMEDIATELY.** `/v1/appointments` is historically readable.

## 4. Appointment held rate

**Definition** — share of scheduled appointments that actually happened.

**Raw events** — `appointmentsUpdated`, `GET /v1/appointmentOutcomes`

**Calculation** — `appointments with a "held"-class outcome ÷ appointments scheduled`

**⚠ May be permanently unmeasurable.** FUB supports appointment outcomes, but the field is only
populated if RCRE's agents set it. If they do not, no engineering makes this computable — and
introducing a proxy ("the appointment time passed and nothing was cancelled") would produce a
number that looks like a held rate and is not.

**Status — BLOCKED BY BROKERAGE POLICY**, in the sense that it depends on a brokerage *practice*
rather than a threshold. Question for leadership: *do your agents record appointment outcomes?* If
not, do you want to require it? It is the only path to this metric.

## 5. Lead-to-appointment conversion

Same as metric 3, expressed by cohort: of leads *received* in a period, how many ever reached an
appointment. Distinguish from metric 3 by anchoring on lead receipt date rather than appointment
date — otherwise a good month of appointments from old leads looks like a good month of new-lead
conversion. **AVAILABLE IMMEDIATELY** with a caveat on cohort completeness.

## 6. Lead-to-contract conversion

**Raw events** — `dealsCreated`, `dealsUpdated`, `peopleCreated`
**Calculation** — `distinct people with a deal reaching a contract stage ÷ leads assigned in cohort`
**Backfill** — **AVAILABLE IMMEDIATELY** via `/v1/deals`, if RCRE uses Deals. If they track
contracts only as a person stage, this collapses into metric 8 and should be reported from
`stage_transitions` instead. **Needs confirmation before Stage 2.**

## 7. Lead-to-closing conversion

As metric 6, at a closed/won stage. **AVAILABLE IMMEDIATELY** subject to the same Deals question.

**Watch the rounding.** Contracts and closings are small numbers per agent per source; rounding
each cell independently can produce a 100% close rate out of nothing. (This was a real bug in the
demo generator, found and fixed on 2026-08-24.) Aggregate first, derive rates second.

## 8. Time in stage

**Definition** — days a person spends in a stage before moving on.

**Raw events** — `peopleStageUpdated`
**Calculation** — `stage_transitions.seconds_in_from`, aggregated as a **median** per stage.

**Only count `detected_via = 'webhook'` rows.** Rows written during backfill record the stage as
found on activation day with no entry time behind them. Averaging those in silently mixes measured
intervals with assumed ones.

**Backfill — IMPOSSIBLE.** FUB exposes current stage only. **FORWARD-ONLY.** This is the single
strongest argument for early webhook registration.

## 9. Stage transition rate

**Definition** — for each stage, the share of people who move forward, move backward, or go
inactive within a window.
**Raw events** — `peopleStageUpdated` · **FORWARD-ONLY.**

Backward transitions matter more than they sound: Under Contract → Active Buyer is a fallen-through
deal, and it is invisible in any report that only counts forward motion.

## 10. Pipeline fallout

**Definition** — where leads stop. For each stage, the count that entered and never advanced.
**Raw events** — `peopleStageUpdated`, plus `activity` to distinguish *stalled* from *lost*.

**Calculation** — people whose most recent transition is *into* stage X, with no subsequent
transition and no activity for longer than the stage's aging threshold.

**Depends on metric 13's threshold**, so it is **FORWARD-ONLY *and* partially BLOCKED BY
BROKERAGE POLICY.** Without a threshold we can still report "entered and never advanced"; we
cannot responsibly call it *fallout*, because a 40-day-old Active Buyer may be perfectly healthy
and a 40-day-old New Lead is not.

## 11. Unanswered leads

**Definition** — assigned, never contacted outbound.
**Raw events** — `peopleCreated`, `peopleUpdated`, `callsCreated`, `textMessagesCreated`, `emailsCreated`
**Calculation** — `people where first_touch_at is null and assignment exists`, aged by
`assignment_history.assigned_at`.

**AVAILABLE IMMEDIATELY** — *whether* an outbound touch exists is readable from history, even
though *when* it happened relative to assignment is not. This is the most valuable day-one metric:
it needs no threshold, no policy, and no accumulated history, and it directly answers leadership's
"we have no good way of knowing whether follow-up happened."

## 12. Overdue follow-ups

**Definition** — tasks past due, uncompleted.
**Raw events** — `tasksCreated`, `tasksUpdated`
**Calculation** — `tasks where due_at < now() and is_completed = false`
**AVAILABLE IMMEDIATELY** via `/v1/tasks`.

Note the scope: this measures follow-up an agent *committed to in FUB*. It is not the same as
**required follow-up** (metric 16), which measures against brokerage standard whether or not a task
exists. An agent who creates no tasks has no overdue tasks — which is exactly why metric 16 matters.

## 13. Lead aging / stage aging alerts

**Definition** — a person in a stage longer than the brokerage allows.
**Raw events** — `peopleStageUpdated`
**Calculation** — `now() − stage_transitions.occurred_at > stage_aging_policies.max_days`

**BLOCKED BY BROKERAGE POLICY.** `stage_aging_policies` ships empty; with no rows, no alert fires.
That is correct behaviour, not a gap. See the [stage aging policy sheet](../02-discovery/leadership-answers/POLICY-SHEET-STAGE-AGING.md).
Also **FORWARD-ONLY** for accurate entry times.

## 14. Status hygiene

**Definition** — agents whose leads show activity but no stage movement. Leadership checks this by
hand today.
**Raw events** — `peopleStageUpdated`, plus all activity events

**Calculation** — people with ≥N activity events since their last stage transition, where the
current stage implies movement should have occurred. A Connected lead with four calls and three
weeks of silence in the stage field is a bookkeeping failure, and it corrupts every other metric on
this page.

**FORWARD-ONLY.** Needs a threshold from RCRE — partially **BLOCKED BY BROKERAGE POLICY**.

## 15. Agent activity

**Definition** — outbound volume per agent per period, by channel.
**Raw events** — `callsCreated`, `textMessagesCreated`, `emailsCreated`
**AVAILABLE IMMEDIATELY.**

**Report it beside outcomes, never alone.** Activity volume is the easiest metric to game and the
weakest predictor of production. It belongs next to appointment rate, where a high-activity
low-conversion agent becomes visible as a coaching opportunity rather than a top performer.

## 16. Required follow-up compliance

**Definition** — leads where the brokerage's required follow-up did not occur.
**Raw events** — assignment + all outbound activity
**Calculation** — evaluate `follow_up_policies` (first-attempt window, minimum attempts at 24h and
7d, required channels) against `assignment_history` and outbound `activity`.

**BLOCKED BY BROKERAGE POLICY — this is the one Taquilla asked for by name.** The detection code
is written; `follow_up_policies` is empty; with no rows the alert does not fire. Inventing a
default would mean the system enforces our standard against RCRE's agents while appearing to
enforce theirs. See the [required follow-up policy sheet](../02-discovery/leadership-answers/POLICY-SHEET-REQUIRED-FOLLOWUP.md).

## 17. Source performance

**Definition** — volume, response time, appointment rate and conversion by lead source.
**AVAILABLE IMMEDIATELY** for volume and conversion; response time inherits metric 1's caveat.

Leadership did not ask for this one. It is included because it is the metric most likely to change
a spending decision — the point where reporting stops describing agents and starts describing
where money should go.

---

## Summary

| Available immediately | Forward-only | Blocked by policy |
|---|---|---|
| Unanswered leads | First response time *(true value)* | Required follow-up compliance |
| Overdue follow-ups | Time in stage | Stage aging alerts |
| Appointment set rate | Stage transition rate | Status hygiene *(threshold)* |
| Contact attempts *(partial)* | Pipeline fallout | Pipeline fallout *(threshold)* |
| Lead-to-contract / closing | Assignment / routing history | Appointment held rate *(practice)* |
| Agent activity | Time-to-route | |
| Source performance | | |

**Seven usable on day one. Six that only exist going forward. Five that wait on RCRE.**
