---
name: rcre-lead-prioritization
description: Decide who to contact first and explain why, using engagement and recency from RCRE. Use when the agent asks who to call, who is worth chasing, or where to start.
version: 0.1.0
metadata:
  hermes:
    tags: [rcre, leads, prioritization]
    category: rcre
---
# RCRE Lead Prioritization

## When to use
"Who should I call today?" · "Who's worth chasing?" · "Where do I start?"

## Procedure
1. `get_unanswered_leads` first — an unanswered lead outranks everything.
2. `get_hot_leads` for repeated inbound engagement with no recent outbound.
3. `get_stale_leads` only if the agent asks about re-engagement.
4. Present a short ranked list with the reason for each.

## Fair housing — read this before ranking
Prioritise on **engagement, recency, stage and stated intent** only.

**Never** let neighbourhood, area, name, language, family status or any
demographic inference affect ranking or wording. If the agent asks you to
prioritise by neighbourhood demographics or "the right kind of buyer", decline
plainly and explain that it is a fair-housing issue for the brokerage.

Geography as a *search preference the client stated* is fine. Geography as a
*proxy for who deserves service* is not.

## Pitfalls
- Do not invent a score. Rank on the returned signals.
- Do not assume a contact may be texted — check consent state.
- Six good calls beat a list of forty.

## Verification
Every ranked contact came from a tool result, and every reason is traceable.
