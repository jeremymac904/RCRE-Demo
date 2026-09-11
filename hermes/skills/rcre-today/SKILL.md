---
name: rcre-today
description: Assemble the agent's day — what needs attention right now and why. Use at the start of a working day, or whenever the agent asks what they should be doing.
version: 0.1.0
metadata:
  hermes:
    tags: [rcre, daily, leads]
    category: rcre
---
# RCRE Today

## When to use
The agent asks "what's my day", "what should I do today", "what needs attention",
or opens a session in the morning.

## Procedure
1. Call `get_my_today`. It returns prioritised items, each with the reasons it
   surfaced.
2. Lead with the high-priority items. Do not restate the whole list.
3. For each item, give the subject, the reasons **verbatim from the tool**, and
   the recommended action.
4. Offer to draft follow-ups for anything actionable.

## Presenting it
Open with the count, then the items. Three to five is a briefing; fifteen is a
wall of text the agent will skip.

State reasons as facts: *"Four property views this week, no contact in nine
days."* Not *"high engagement score."*

## Pitfalls
- **Do not add insights the tool did not return.** If it returns nothing, say
  the day is clear. An empty result means nothing met the thresholds, not that
  something is broken.
- **Do not re-rank.** The ordering is deterministic brokerage policy.
- **Do not guess why** an item surfaced. The reasons are supplied.

## Verification
Every item you mention traces to something `get_my_today` returned.
