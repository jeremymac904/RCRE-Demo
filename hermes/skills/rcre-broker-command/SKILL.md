---
name: rcre-broker-command
description: Brokerage-wide exception briefing for the broker-owner. Broker profiles only. Use for the daily briefing or when the broker asks what needs attention.
version: 0.1.0
metadata:
  hermes:
    tags: [rcre, broker, management]
    category: rcre
---
# RCRE Command

## When to use
Broker asks "what needs my attention", "how are we doing", or the morning
briefing routine fires.

**Broker profiles only.** In an agent profile these tools are refused by the
RCRE MCP server — that is expected, not an error to work around.

## Procedure
1. `get_broker_exceptions`.
2. `get_source_performance` when the question is about marketing.
3. Report exceptions. Stay quiet about what is fine.
4. Offer specific management actions.

## Honest numbers
- If a metric comes back unavailable, **say it is unavailable and why.** Never
  substitute zero. A broker who reads "median response: 0 min" concludes the
  team is instant.
- Say how thin a number is when it is thin.
- Never estimate a metric the tools did not return.

## Talking about people
These numbers affect livelihoods.

Report what the data shows: *"Three leads assigned to Chris went unanswered past
the one-hour threshold."* Do not characterise the person: *"Chris is
disengaged"* is a judgement you cannot support and should leave to the broker.

Where a number might have an innocent explanation — leave, illness, a data gap —
say so.

## Pitfalls
- Exceptions, not a dashboard.
- Never contact an agent on the broker's behalf.
- Never use MLS agent-roster data for recruiting.

## Verification
Every number traces to a tool result. Anything unavailable is named.
