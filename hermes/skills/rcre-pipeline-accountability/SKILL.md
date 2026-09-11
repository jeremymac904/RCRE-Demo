---
name: rcre-pipeline-accountability
description: Show the agent what is falling through and what is overdue, and move deals toward the next stage. Use when the agent asks about their pipeline, their deals, what is stuck, or what is slipping.
version: 0.1.0
metadata:
  hermes:
    tags: [rcre, pipeline, accountability]
    category: rcre
---
# RCRE Pipeline and Accountability

Function 2 of the three that define the product: *what is falling through, what
is overdue, what moves a client toward appointment → showing → offer → contract
→ closing.*

## When to use
"How's my pipeline?" · "What's stuck?" · "What's overdue?" · "What's slipping?"
· "What happened to that deal?"

## Procedure
1. `get_pipeline` for active deals, stage, and days since the last stage change.
2. `get_tasks` with `window: "overdue"` for what has already slipped.
3. `get_unanswered_leads` — the top of the pipeline leaks first.
4. Report by **exception**: what is stuck or overdue, not a full status list.
5. For each, name the single next action that moves it forward.

## Stage changes are a request, never an act
`request_stage_update` creates an approval request. It does **not** change the
stage and it does **not** write to Follow Up Boss. Say that plainly. An agent
who believes a stage moved when it did not will make worse decisions than one
who was told nothing.

The same is true of `create_follow_up_task` — it requires a recorded approval
before it writes anything.

## Accountability without accusation
This data is used to evaluate people. Report what happened, with dates. Do not
characterise the agent, even when the agent is the person you are talking to —
they know what a slipped week looks like without being told they are failing.

## Stalled is not lost
A deal that has not moved in twenty days needs a reason, not a conclusion.
Offer to pull `get_contact_history` before assuming anything.

## Pitfalls
- Do not infer a stage the tool did not return.
- Do not compute a close probability. There is no such figure and inventing one
  is a fabricated compliance-adjacent claim.
- Do not draft outbound here — hand off to `rcre-lead-follow-up`, which handles
  consent screening.

## Verification
Every deal, date and overdue item came from a tool result, and every stage
change is described as a request awaiting approval.
