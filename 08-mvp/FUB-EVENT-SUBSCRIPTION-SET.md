# Follow Up Boss event subscription set

**Date:** 2026-08-24 · verified against current FUB documentation
**Decision rule:** subscribe to an event only if a leadership metric depends on it.

FUB publishes **37 webhook event types**. RCRE subscribes to **17**. The other 20 are listed at the
bottom with the reason for declining each, because "we did not think of it" and "we decided
against it" should not look the same in six months.

Two constraints shape this:

- **2 webhooks per event per system.** Registering everything wastes a scarce slot and produces
  traffic nobody reads.
- **Every subscribed event is a resolve call.** The payload carries IDs, not records — each
  delivery costs a `GET` against the rate limit. Subscribing to a high-volume event we do not use
  spends budget the backfill needs.

---

## Subscribed — 17 events

### Person lifecycle

| Event | Enables |
|---|---|
| `peopleCreated` | **Lead aging**, **lead volume by source**, and the start of the response-time clock. This is the event every funnel metric is measured *from*. |
| `peopleUpdated` | **Assignment history** and therefore **agent attribution** and the **Alabama routing chain**. FUB fires this on owner change; diffing `assignedUserId` against our stored value is the only way to detect a reassignment, because FUB keeps no assignment history of its own. Also catches source and tag corrections. |
| `peopleStageUpdated` | **Time in stage · stage transition rate · pipeline fallout · lead-to-appointment · lead-to-contract · lead-to-closing.** Six of leadership's metrics rest on this one event. FUB exposes a person's *current* stage and never the history, so if this webhook is missed the interval is gone permanently — no endpoint can recover it later. If only one event could be subscribed, it would be this one. |

### Contact attempts

| Event | Enables |
|---|---|
| `callsCreated` | **First response time · contact attempts · agent activity.** `isIncoming` separates an agent's attempt from a client's call back. |
| `callsUpdated` | **Call outcome.** FUB lets an outcome ("Left Message", "Connected") be set after the fact, and a voicemail is not a conversation. Without this, attempt quality is unmeasurable. |
| `textMessagesCreated` | **Contact attempts · first response time · engagement.** An *inbound* text is the single most reliable evidence outreach landed — the honest substitute for the read receipt that does not exist. |
| `textMessagesUpdated` | **Delivery status** (`sent` → `delivered` / `undelivered`). Never a read status ([ADR-0014](../06-decisions/adr/0014-no-sms-read-receipts.md)). An undelivered text is a bad phone number, which is an agent action, not an agent failure. |
| `emailsCreated` | **Contact attempts · first response time.** Email is a legitimate first touch and omitting it would make email-first agents look unresponsive. |

### Engagement — not contact attempts

Kept strictly separate from the above. These measure what the *client* did.

| Event | Enables |
|---|---|
| `emEventsOpened` | "Opened your last email." A real engagement signal. **Never** presented as a text being read. |
| `emEventsClicked` | Stronger than an open — a click survives image blocking and privacy proxies, which opens do not. |
| `eventsCreated` | **Property views, saved properties, searches, site visits, inbound inquiries.** This is buyer intent, and it drives the priority engine — "viewed three properties in Mandarin this week" comes from here. |

### Outcomes

| Event | Enables |
|---|---|
| `appointmentsCreated` | **Appointment set rate**, the midpoint of the funnel. |
| `appointmentsUpdated` | **Appointment held rate** — but only if RCRE actually records outcomes. See the caveat below. |
| `dealsCreated` | **Lead-to-contract conversion.** |
| `dealsUpdated` | **Lead-to-closing conversion** and deal stage movement. |

### Accountability

| Event | Enables |
|---|---|
| `tasksCreated` | Establishes what an agent committed to do. |
| `tasksUpdated` | **Overdue follow-ups** — completion or its absence. Leadership named this directly. |

---

## Declined — 20 events, with reasons

| Event(s) | Why not |
|---|---|
| `notesCreated`, `notesUpdated`, `notesDeleted` | **Deliberate.** Notes are where agents write candid things about clients. We do not read them, do not store them, and do not want them in a table that feeds AI context. A note is also not evidence of client contact — it is a record of thinking. |
| `peopleDeleted` | Low value in read-only. A deletion in FUB is usually a merge or a mistake; reacting to it risks destroying our own history for a record that comes back. Reconciled during periodic sync instead. |
| `peopleTagsCreated` | Tag changes arrive on `peopleUpdated` anyway. Subscribing separately doubles traffic for the same fact. |
| `peopleRelationshipCreated/Updated/Deleted` | Household relationships. Real, but no leadership metric uses them. |
| `callsDeleted`, `textMessagesDeleted`, `emailsDeleted`, `tasksDeleted`, `appointmentsDeleted`, `dealsDeleted` | Deletions of history. In read-only we keep our own record; reconciliation handles genuine removals. Worth revisiting if RCRE turns out to delete records routinely, which would make our counts drift high. |
| `emEventsUnsubscribed` | **Worth adding later**, when marketing sends email. Today RCRE has no marketing platform, so there is nothing to suppress. |
| `stageCreated`, `stageUpdated`, `stageDeleted` | These are changes to the stage *definitions*, not to a person's stage — a rename or a new pipeline stage. Rare, and better handled by re-reading `GET /v1/stages` on a schedule than by a webhook. |
| `emailsUpdated` | Email edits are not meaningful for accountability. |

---

## Two caveats worth stating before activation

**1. Appointment *held* may not be measurable.** FUB has an `appointmentOutcomes` endpoint, but it
only has data if RCRE's agents actually set outcomes on appointments. If they do not, appointment
*set* rate is measurable and *held* rate is not — and no amount of engineering changes that. This
is a question for leadership, and it is on the round-2 sheet.

**2. `peopleUpdated` is the noisiest subscription here.** It fires on any change to a person. We
take it because assignment history has no other source, and assignment history is what makes the
Alabama routing chain and fair agent attribution possible. The handler must diff against stored
state and discard the no-ops, or it will spend the rate-limit budget on nothing. This is the one
place in the ingestion path where efficiency is a correctness concern rather than a nicety.

## Rate-limit arithmetic

Registered: **250 requests / 10 seconds** globally, **20 / 10 seconds** on `GET /events`.

Each webhook delivery costs roughly one resolve call. At a brokerage of RCRE's size, steady-state
webhook traffic is far below the limit; the pressure is entirely in the **backfill**, which is why
the cutover plan runs it before webhooks rather than alongside them, and paces it with the
`X-RateLimit-Remaining` header rather than a fixed sleep.

## Sources

- [FUB — POST /webhooks (event type list)](https://docs.followupboss.com/reference/webhooks-post)
- [FUB — Webhooks guide (payload, retries, signature, Owner requirement)](https://docs.followupboss.com/reference/webhooks-guide)
- [FUB — Rate limiting](https://docs.followupboss.com/reference/rate-limiting)
- [FUB — GET /events](https://docs.followupboss.com/reference/events-get)
- [FUB — GET /teams](https://docs.followupboss.com/reference/teams-get)
- [FUB — GET /users](https://docs.followupboss.com/reference/users-get)
