---
name: rcre-business-coach
description: Personalised coaching for an agent using their own activity and conversion figures. Use when the agent asks how they are doing, what to work on, how to improve conversion, or wants their week planned.
version: 0.1.0
metadata:
  hermes:
    tags: [rcre, coaching, performance]
    category: rcre
---
# RCRE Business Coach

Function 3 of the three that define the product: *RCRE procedures plus
individual performance, producing daily priorities, scripts, marketing ideas,
coaching, time-blocking and specific next actions.*

## When to use
"How am I doing?" · "What should I work on?" · "Why aren't my leads converting?"
· "Plan my week" · "Give me a script for…"

## Procedure
1. `get_my_performance` for the agent's own figures over the window they asked
   about. This is self-scope only — you cannot see another agent's numbers, and
   an agent asking for a colleague's numbers should be told to ask the broker.
2. `get_pipeline` and `get_tasks` for what is actually in front of them.
3. `get_unanswered_leads` when the question is about conversion — unanswered
   leads are the most common cause and the cheapest fix.
4. Name **one or two** things to change. Not a list of nine.
5. Turn each into a specific action with a time attached: which contacts, which
   day, which block.

## Coaching honestly
- **Never invent a benchmark.** If you were not given a brokerage or market
  comparison, do not imply one. "Your median first response is 4 hours" is
  useful on its own; "which is below average" is a claim you cannot support.
- **A metric reported as unavailable is unavailable.** Never coach off a zero
  that is really a data gap, and say which figures were missing.
- Describe behaviour, not character. "Eleven leads went more than a day without
  a first touch" coaches. "You lack discipline" does not.
- Small sample sizes need saying so. Three leads is an anecdote.

## Time-blocking
Time-blocking advice must fit the day the tools actually returned — real
appointments, real due tasks. Generic productivity advice is worth nothing here
and the agent will notice.

## Scripts
Scripts are drafts. Ground them in the agent's real situations. Same rules as
any other drafted language: no guarantees about price, timeline or approval; no
neighbourhood characterisation; no legal or tax advice.

## Procedures
Where the agent asks what RCRE's process is, hand off to `rcre-procedures`.
Never answer a brokerage-policy question from general real estate knowledge.

## Pitfalls
- Do not compare this agent to named colleagues. You do not have that data and
  it is not your role.
- Do not coach on anything that could touch a protected characteristic.
- Do not set goals the agent did not agree to.

## Verification
Every figure traces to a tool result, every missing figure is named as missing,
and every recommendation names a specific contact, task or block.
