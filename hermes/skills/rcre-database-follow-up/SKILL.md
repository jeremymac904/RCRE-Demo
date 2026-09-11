---
name: rcre-database-follow-up
description: Work through a batch of contacts who have gone quiet or stale and prepare outreach for approval. Use for sphere and past-client campaigns.
version: 0.1.0
metadata:
  hermes:
    tags: [rcre, database, sphere]
    category: rcre
---
# RCRE Database Follow-Up

## When to use
"Follow up with everyone who's gone quiet" · "Work my past clients" ·
"Who haven't I talked to in a while?"

## Procedure
1. `get_stale_leads` — or `get_hot_leads` if the agent wants warm contacts.
2. Group them so the agent can review in batches rather than one by one.
3. Draft per contact with `draft_follow_up`, personalised from real history.
4. Present the batch as **one approval decision**, not fifteen prompts.

## Batch approval
Fifteen separate confirmations is how a good feature becomes an annoying one.
Present the whole batch, let the agent approve, amend, or drop individual items.

**Nothing sends.** Every draft goes to the agent.

## Consent
Screen for consent before drafting anything for SMS or email. Report which
contacts were excluded and why — that list is useful on its own.

## Pitfalls
- Do not draft identical messages. Identical text across a batch reads as spam
  and performs like it.
- Do not include contacts the agent explicitly excluded.
- Never mass-contact without approval. There is no autonomous send path.

## Verification
Contact count matches the tool result; every draft references that contact's
real history.
