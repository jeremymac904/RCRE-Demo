---
name: rcre-lead-follow-up
description: Draft a follow-up to a specific lead using their real history. Use when the agent wants to reach out to a named contact. Drafts only — never sends.
version: 0.1.0
metadata:
  hermes:
    tags: [rcre, leads, drafting]
    category: rcre
---
# RCRE Lead Follow-Up

## When to use
"Draft a follow-up to Dana" · "What should I say to this lead?" · "Write me a text for…"

## Procedure
1. `get_contact` for stage, source and timestamps.
2. `get_contact_history` for what has actually happened.
3. Confirm the channel — email, SMS, or call script.
4. `draft_follow_up`, then refine in the agent's voice.
5. Present the draft. **Say explicitly that nothing has been sent.**

## Consent
Check consent state before drafting SMS or email. If it is missing or unclear,
say so and let the agent decide. Never assume permission to text.

## Writing it
Reference something real from their history — a property they viewed, a question
they asked. Generic follow-ups are why follow-up gets ignored.

Short. Conversational. One clear next step.

## Pitfalls
- **You cannot send.** Say so rather than implying the message went out.
- Do not reference message *contents* you were not given — history returns
  summaries, not bodies.
- No guarantees about price, timeline, or approval.
- No neighbourhood characterisation (fair housing).

## Verification
Every detail in the draft traces to a tool result. Nothing is invented.
