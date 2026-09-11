# Follow Up Boss — Developer Capability Verification

**Verified:** 2026-08-19 against current official documentation.
**Sources:** `docs.followupboss.com` — `/reference/authentication`, `/reference/rate-limiting`,
`/reference/pagination`, `/reference/webhooks-guide`, `/reference/send-in-a-lead`,
`/reference/events-post`, `/reference/identification`, and the endpoint index at
`docs.followupboss.com/llms.txt`.

**No FUB account was contacted. No credentials were used. Nothing was registered.**

---

## 1. Authentication

Two methods. **API key + HTTP Basic** is right for a server-side integration.

> *"If you are using API Keys to authenticate with Follow Up Boss, you **must** use Basic
> Authentication."*

- API key is the **username**; password blank.
- HTTPS only.
- **The key inherits the permissions of the user it belongs to** — this is load-bearing:
  > *"agent's API key allows access only to people assigned to that agent while broker's API
  > key allows access to all people in the account."*

**Implication for RCRE:** the connector needs a **broker/owner-level key** to mirror the
whole brokerage. FUB's own permission model then aligns with RCRE's scoping rather than
fighting it.

### Permission levels
| Level | Access |
|---|---|
| Owner | Everything, **including webhooks** |
| Admin (Broker) | Almost everything, **but cannot access webhooks** |
| Agent | Only assigned/collaborating contacts |
| Lender | Narrower than agent |

**Webhook registration requires the account OWNER.** An admin key is not sufficient.

### System registration
`X-System` and `X-System-Key` headers identify a registered partner system. Registration at
`apps.followupboss.com/system-registration`. Required for webhooks, and doubles the rate limit.

---

## 2. Rate limits

Sliding **10-second** window. Every response carries `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Window`, `X-RateLimit-Context`.

| Context | Registered | Unregistered |
|---|---|---|
| `global` (all endpoints) | **250** | 125 |
| `events` (GET) | 20 | 10 |
| `POST.events` | unlimited* | unlimited* |
| `PUT.people` | 25 | 25 |
| `notes` | 10 | 10 |

429 returns `Retry-After` in seconds. The docs warn explicitly:

> *"make sure your system respects the 429 header even if `X-RateLimit-Remaining` shows you
> should have requests remaining."*

**Implemented** in `FubClient`: header capture, `Retry-After` honoured, exponential backoff
fallback, no retry on non-429 4xx. Covered by tests.

---

## 3. Pagination

`next` (keyset) or `offset`, with `limit` — **max 100**, default 10. Results descend by id.

> *"It is **highly** encouraged to use `next` instead of `offset` for all API interactions."*

FUB *enforces* `next` for deep result sets. `_metadata` carries `total`, `next`, `nextLink`.

**Implemented:** `FubClient.paginate()` is keyset-only and never sends `offset`. Tested,
including the empty-page termination case.

---

## 4. Sending leads — the critical finding

> *"This endpoint is the **only** correct option to send leads and their activity to Follow
> Up Boss"* — `POST /v1/events`
>
> *"❗️ Avoid sending leads through `POST /v1/people`. It will create a person but **will
> not** run any automations."*

`POST /v1/events` gives: dedupe against existing contacts, event history, agent notification,
action plans, **correct lead-flow assignment**, and social lookup. `POST /v1/people` gives
none of it.

**Action-plan-triggering types:** `Registration`, `Seller Inquiry`, `Property Inquiry`,
`General Inquiry`, `Visited Open House`.
**Automation-triggering types:** `Registration`, `Property Inquiry`, `Seller Inquiry`,
`General Inquiry`.

**Campaign attribution:** the `campaign` object is required for marketing reports, and
`campaign.source` is **required** whenever that object is sent.

**Status codes:** `200` event created against existing person · `201` new person created ·
`204` **lead flow archived and the lead was ignored** — must be treated as a failure to
deliver, not a success.

**Implemented:** `FubClient.sendLeadEvent()` and `POST /api/leads`. **Gated off** behind
`RCRE_ALLOW_FUB_WRITES` (default `false`); tested to confirm it refuses while gated.

---

## 5. Webhooks

**Owner permission required to create, update or delete.**

### Delivery contract
- 2XX required **within 10 seconds**, else FUB retries.
- Retry schedule: 1 min → 5 min → 5 min → 10 min → 30 min (5 attempts, up to 8 hours).
- Callback URL must be HTTPS.
- `X-System` header required on `/v1/webhooks` calls.

### Payload — IDs only, never the record
```json
{ "eventId": "152d60c0-…", "eventCreated": "2016-12-12T15:19:21+00:00",
  "event": "peopleCreated", "resourceIds": [1234, 3244],
  "uri": "https://api.followupboss.com/v1/people?id=1234,3244" }
```

**This shape dictates the architecture.** Because the payload carries no record data, the
processor must re-fetch the authoritative record — which is precisely why out-of-order
delivery is safe. A stale event cannot overwrite newer data, because the event contains no
data.

### Signature verification
> *"base64 encode the JSON payload you received from the request (non-prettified), then
> produce a SHA256 hash with this base64 encoded value and your X-System-Key"*

Reference: `hash_hmac('sha256', base64_encode($body), $systemKey)`.

**Note the unusual order** — the body is base64-encoded *first*, then that string is the HMAC
message. HMACing the raw body directly is the obvious mistake and does not validate.
**Implemented** in `signature.ts` with constant-time comparison; a test asserts the naive
construction does **not** match.

### Events RCRE will subscribe to

> **⚠ SUPERSEDED — 2026-08-24.** The authoritative subscription set is
> [FUB-EVENT-SUBSCRIPTION-SET.md](FUB-EVENT-SUBSCRIPTION-SET.md), which justifies each event
> against a leadership metric. The list below is the earlier draft and differs: it names
> `notesCreated`, `peopleDeleted` and `peopleTagsCreated`, all of which are now **deliberately
> declined**, and omits `emEventsOpened`, `emEventsClicked` and `eventsCreated`, which the
> engagement signals require. Kept for the record; do not implement from it.
`peopleCreated` · `peopleUpdated` · `peopleDeleted` · `peopleStageUpdated` ·
`peopleTagsCreated` · `notesCreated` · `tasksCreated/Updated/Deleted` ·
`appointmentsCreated/Updated/Deleted` · `dealsCreated/Updated/Deleted` ·
`callsCreated/Updated` · `textMessagesCreated/Updated` · `emailsCreated/Updated`

### Two behaviours worth knowing
- **Batch updates split.** Tag, stage, source or re-assignment changes affecting many people
  may arrive as multiple requests. Idempotency by `eventId` handles this.
- **`peopleDeleted` cascades.** Associated notes, calls and texts are deleted with no
  individual delete events. RCRE soft-marks (`deleted_in_fub`) rather than hard-deleting, so
  derived history survives.
- **Appointment webhooks do not fire** for appointments synced from Google/Office 365
  calendars — only ones created in FUB.
- **Custom fields** require `?fields=allFields` on the person fetch. Implemented.

---

## 6. Endpoints RCRE uses

**Read:** `/identity` · `/me` · `/people` · `/people/:id` · `/users` · `/stages` · `/tasks` ·
`/appointments` · `/deals` · `/pipelines` · `/notes/:id` · `/calls` · `/textMessages` ·
`/smartLists`

**Write (all gated):** `/events` (leads — the only correct path) · `/webhooks` (registration)

**Deliberately unused:** `/actionPlans*`, `/automations*`, `/templates*`, `/emCampaigns`,
`/customFields` (write), `/groups`, `/teams`, `/ponds`, Inbox Apps. FUB already does these
well; duplicating them would violate ADR-0012.

---

## 7. What we still need from RCRE

| # | Need | Why | Blocking |
|---|---|---|---|
| 1 | **Owner-level API key** | Broker-wide mirror; agent keys see only their own contacts | **Yes** |
| 2 | **System registration** (`X-System` / `X-System-Key`) | Webhook signature verification and 2× rate limit | **Yes** |
| 3 | **Confirmation the key is Owner, not Admin** | Admins cannot manage webhooks | **Yes** |
| 4 | Publicly reachable HTTPS webhook endpoint | FUB requires HTTPS; localhost will not work | Yes, for webhooks |
| 5 | User list with FUB user ids | Map FUB users → RCRE users for scoping | Yes |
| 6 | Stage list | Interpret stage semantics | No |
| 7 | Pipeline configuration | Deal stage interpretation | No |
| 8 | Confirmation the Facebook Lead Ads integration is active | Meta attribution design | No |
| 9 | Whether a sandbox/trial account can be used | Testing without production risk | **Strongly preferred** |

**Recommendation on #9:** FUB's own onboarding guide describes creating a trial account for
integration development. Doing so would let the connector be exercised end to end without
touching RCRE's production CRM — worth the small effort before any production key is issued.

---

# 8. Taquilla's reporting and alerting requests — feasibility

**Added 2026-08-24**, in response to
[Taquilla Allen's leadership answers](../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md).
Verified against Follow Up Boss's published API documentation and the underlying messaging
protocols. Nothing here was tested against RCRE's production account — that is not authorised.

## 8.1 SMS read receipts — **NOT AVAILABLE. Do not promise this.**

Taquilla asked to "see when someone has read a text message that was sent through the system."

**This cannot be delivered over SMS, by Follow Up Boss or by anyone else.**

The reason is the protocol, not the vendor. SMS has a *delivery* receipt (DLR) — the handset
acknowledged receiving the message — and nothing beyond it. There is no read event in the SMS
specification, so there is no read event for a carrier to forward, an aggregator to relay, or FUB
to display. In the United States, A2P traffic on 10-digit long codes (which is what a brokerage's
texting numbers are) does not even reliably get a true *handset* DLR; carriers commonly return an
intermediate or carrier-level DLR instead. So the honest ceiling for SMS is "we believe it was
delivered", not "we know it was delivered", and certainly not "we know it was read".

**Where the word "Read" does appear in FUB.** FUB's Inbox Apps API defines four message delivery
statuses — `Sent` (default), `Delivered`, `Read`, `Not Delivered` — and `Read` is immutable once
set. This is real, but it is worth being precise about what it is: **FUB does not detect a read.
It exposes a field that an integrating Inbox App writes into.** The read signal has to come from
an underlying channel that genuinely produces one. Channels that do:

| Channel | True read receipt? | Notes |
|---|---|---|
| SMS / MMS | **No** | No read event exists in the protocol |
| RCS | Yes | Requires verified RCS A2P sending and an RCS-capable recipient handset |
| WhatsApp Business | Yes | Recipient can disable read receipts |
| Facebook / Instagram messaging | Yes | Platform-dependent |
| Email | **Not a read** — an *open* | Pixel-based; defeated by image blocking and privacy proxies |

**What this means for RCRE.** Adding read receipts would mean moving conversations off SMS onto
RCS or WhatsApp — a channel change affecting every agent and every client, not a reporting
feature. That is a real option and worth discussing with leadership, but it must be presented as
what it is. It is not a switch we can turn on.

**DESIGN PROPOSAL — what we build instead.** Taquilla's actual need is *did the outreach land*.
Answer it from signals that exist:

| Signal | Source | Available |
|---|---|---|
| Message delivered / not delivered | `textMessagesUpdated` webhook | Yes |
| They replied | `textMessagesCreated`, direction inbound | Yes — the strongest signal of all |
| Email opened | `emEventsOpened` webhook | Yes |
| Email link clicked | `emEventsClicked` webhook | Yes |
| Viewed a property / searched / visited site | `/v1/events` ingestion | Yes |
| Inbound call | `callsCreated` webhook | Yes |

A contact who opened two emails and viewed three properties after a text is *more* informative
than a read receipt would be. We should say so plainly rather than treat it as a consolation.

## 8.2 The seven requested funnel metrics — all computable, most forward-only

FUB publishes 37 webhook event types. The ones that carry this requirement:

```
peopleCreated · peopleUpdated · peopleStageUpdated
callsCreated · callsUpdated
textMessagesCreated · textMessagesUpdated
emailsCreated · emEventsOpened · emEventsClicked
appointmentsCreated · appointmentsUpdated
dealsCreated · dealsUpdated
tasksCreated · tasksUpdated
stageCreated · stageUpdated · stageDeleted
```

| Metric Taquilla asked for | Computable? | How | Backfillable? |
|---|---|---|---|
| Response time (assignment → first outbound) | Yes | `peopleCreated` → first outbound call/text/email | **No** |
| Contact attempts | Yes | Count of outbound calls + texts + emails per contact | **Partial** — the calls/texts/emails exist historically, but `/v1/calls` has no date filter so it needs per-person iteration, and attempts cannot be related to an assignment that was never recorded |
| Appointments set | Yes | `appointmentsCreated` | Partly — current appointments readable |
| Conversion rate | Yes | Stage/deal progression over assigned leads | Partly |
| Time in each stage | Yes | Interval between `peopleStageUpdated` events | **No** |
| Where leads fall out | Yes | Terminal stage before going inactive | **No** |
| Agent status hygiene | Yes | Contacts with activity but no stage change | **No** |

### The one thing leadership must understand about this

**Four of the seven metrics cannot be calculated for the past.** FUB's API exposes a contact's
*current* stage; it does not expose a stage-change history. The history has to be *accumulated*
from `peopleStageUpdated` webhooks, which only fire once RCRE registers the webhook.

This is the same class of problem as `first_touch_at`, already documented in §4 of this file, and
it has the same consequence: **the clock starts the day we connect, not the day RCRE started using
FUB.** Every day that passes before webhook registration is a day of funnel history that can never
be reconstructed.

That makes webhook registration the highest-value, lowest-cost action available to this project,
and it argues for doing it well before the rest of the product is finished. It remains
**unauthorised** today (see CLAUDE.md), and this document does not change that — it makes the case
for asking.

## 8.3 The two requested alerts

| Alert | Feasible | Depends on |
|---|---|---|
| Lead has not been contacted | **Yes, today** | `peopleCreated` + absence of outbound. Deterministic. |
| Lead sitting in a stage too long | **Yes, forward-only** | `peopleStageUpdated` history + a per-stage threshold RCRE has not yet given us |
| **Required follow-up has not occurred** | **Blocked** | RCRE has not defined "required". See below. |

The third alert is the one Taquilla asked for by name and the one we cannot build yet. "Required
follow-up" implies a cadence — how many attempts, over what window, through which channels, before
a lead is considered properly worked. That is a **brokerage policy decision**, not a technical one,
and inventing it would mean the system enforces our standard against RCRE's agents. It is the top
open question in this round of discovery.

## 8.4 Custom dashboards

**Unscoped.** "Customisable dashboards" ranges from *saved filters on a fixed report* to *a
user-configurable widget canvas*, an order of magnitude apart in cost. We are proceeding on the
narrow reading — fixed report surfaces with agent, source, stage, market and period filters — and
have flagged the ambiguity rather than guessing large.

## Sources

- [Follow Up Boss — Inbox Apps delivery status](https://docs.followupboss.com/docs/inbox-apps-delivery-status)
- [Follow Up Boss — POST /textMessages](https://docs.followupboss.com/reference/textmessages-post)
- [Follow Up Boss — POST /webhooks (event type list)](https://docs.followupboss.com/reference/webhooks-post)
- [Follow Up Boss — POST /events](https://docs.followupboss.com/reference/events-post)
- [Infobip — RCS read receipts](https://www.infobip.com/blog/rcs-read-receipts)
- [Bandwidth — Delivery Receipt (DLR) FAQs](https://www.bandwidth.com/support/en/articles/12823161-delivery-receipt-dlr-faqs)
