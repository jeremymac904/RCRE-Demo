# Production read-only activation checklist

**For:** Jeremy McDonald · **Date:** 2026-08-24 · **Status:** awaiting authorisation

This is the only document you need to read before authorising the connection. Everything below is
either an action for you, or a commitment about what the system will and will not do.

**Nothing here has been done yet.** No credential has been requested, no call made, no webhook
registered.

---

## 1. What you need from Follow Up Boss

Three values. Two are one-time registration; one is a credential.

| # | What | Where you get it |
|---|---|---|
| 1 | **API key** | FUB → **Admin → API** (owner-level account). "Create API Key", name it `RCRE Intelligence Layer`. Copy it once — FUB shows it once. |
| 2 | **X-System name** | Assigned by Follow Up Boss. Email **api@followupboss.com**, ask to register a system for RCRE Group. Say you are building an internal reporting and lead-accountability integration, read-only to start. They reply with the system identifier. |
| 3 | **X-System-Key** | Issued with the system name in the same reply. This is also the HMAC secret used to verify that incoming webhooks are genuinely from FUB. |

### Does it need Owner permissions?

**Yes — for step 2 of activation, and only then.**

- **Reading** (people, calls, texts, emails, appointments, deals, stages, users, teams, events) works with a normal API key, but it returns **only the records that key's user can see**. An agent-level key would show one agent's book, which makes brokerage-wide reporting impossible.
- **Registering webhooks requires Owner permissions.** FUB is explicit about this. Webhooks are account-wide once registered — they fire for every record in the account, not just the key holder's.

So the key must belong to a user with `isOwner: true`. In practice that is Julio or Taquilla, or an account marked Owner created for this purpose. **A dedicated owner-level user for the integration is better than borrowing a personal one** — it keeps the audit trail clean and means revoking it does not disturb anybody's login.

### Why register a system at all

Registration is not bureaucracy. It buys three things:

- **Rate limit doubles** — 250 requests per 10 seconds instead of 125, and 20/10s on `GET /events` instead of 10. The backfill is meaningfully faster and less likely to trip a 429.
- **Webhook signature verification becomes possible** — the X-System-Key is the HMAC secret. Without it we cannot prove an incoming webhook came from FUB.
- **FUB support can see our traffic** if something goes wrong.

---

## 2. Environment variables

Exact names. **Values go in the environment only — never in this repository, never in any
document, never in a commit.**

```
FUB_API_KEY                  # the API key from step 1. Used as HTTP Basic username, blank password.
FUB_SYSTEM                   # the X-System name from step 2
FUB_SYSTEM_KEY               # the X-System-Key from step 3. Also the webhook HMAC secret.
FUB_API_BASE_URL             # https://api.followupboss.com/v1

RCRE_DATA_MODE               # 'fixtures' today. 'live' only when you authorise it.
RCRE_ALLOW_FUB_WRITES        # 'false'. Must stay false for the entire read-only period.
RCRE_ALLOW_OUTBOUND_SEND     # 'false'. Email and SMS sending. Unrelated to FUB, and also off.
RCRE_WEBHOOK_PUBLIC_URL      # the HTTPS endpoint registered with FUB (section 4)
```

The first four already exist in the codebase. `RCRE_WEBHOOK_PUBLIC_URL` is new and only becomes
meaningful at Stage 3 of the cutover.

**Rotation:** if a key is ever exposed, revoke it in FUB → Admin → API and issue a new one. The
system reads it from the environment at startup, so rotation is a restart, not a code change.

---

## 3. What "read-only" is enforced by

Not by good intentions. By four independent mechanisms, any one of which stops a write:

1. **`RCRE_ALLOW_FUB_WRITES=false`** — the FUB client refuses non-GET methods.
2. **`integration_state.writes_enabled = false`** — a database flag checked on every write path, so writes can be disabled without a deploy, and re-enabling needs both.
3. **No write tools exist in the MCP server.** The agent cannot call what is not registered. This is the strongest control: a capability that has no tool cannot be misused by a model, a prompt injection, or a mistake.
4. **`POST /v1/events` is the only write FUB would ever accept from us**, and it is not wired to anything in read-only mode.

---

## 4. The webhook URL

Registered at **Stage 3**, not at activation.

```
https://<rcre-production-host>/api/fub/webhook
```

The host does not exist yet — it is created when infrastructure is deployed, which is a separate
authorisation. FUB requires HTTPS and a 2XX response within 10 seconds; the endpoint acknowledges
first and processes asynchronously, which is already how the handler is built.

**FUB retries a failed delivery 6 times over roughly 8 hours** (1 min, 5, 5, 10, 30…). A brief
outage does not lose events. An outage longer than 8 hours does, permanently.

**Limit:** 2 webhooks per event per system. Unregister anything unused.

---

## 5. Which events we will subscribe to

**17 of the 37 FUB offers.** The reasoning for each is in
[FUB-EVENT-SUBSCRIPTION-SET.md](FUB-EVENT-SUBSCRIPTION-SET.md).

```
peopleCreated          peopleUpdated          peopleStageUpdated
callsCreated           callsUpdated
textMessagesCreated    textMessagesUpdated
emailsCreated
emEventsOpened         emEventsClicked
appointmentsCreated    appointmentsUpdated
dealsCreated           dealsUpdated
tasksCreated           tasksUpdated
eventsCreated
```

We deliberately do **not** subscribe to: notes (message content we do not want), deletions beyond
what we need, relationships, templates, or anything in the Inbox Apps surface.

---

## 6. What RCRE will read

| Endpoint | Why |
|---|---|
| `GET /v1/identity` | Confirms the key works and names the account. First call ever made. |
| `GET /v1/users` | The agent roster, roles, `isOwner`, `teamLeaderOf` |
| `GET /v1/teams` | Teams and their leaders — this is where the Alabama team-lead structure comes from |
| `GET /v1/stages`, `/v1/pipelines` | RCRE's actual stage names, so we stop guessing them |
| `GET /v1/people` | Contacts, current stage, current owner, source |
| `GET /v1/calls`, `/v1/textMessages` | Contact attempts and their direction |
| `GET /v1/appointments`, `/v1/appointmentOutcomes` | Appointments set and, if RCRE records outcomes, held |
| `GET /v1/deals` | Contracts and closings |
| `GET /v1/tasks` | Overdue follow-ups |
| `GET /v1/events` | Property views, searches, site visits — buyer intent |

## 7. What RCRE will store

- Contact identity as FUB holds it (name, emails, phones, stage, source, owner, tags)
- **Activity metadata: type, direction, timestamp, who, duration, outcome**
- Stage transitions — from, to, when, who owned it *(does not exist in FUB)*
- Assignment history — every hop, with timestamps *(does not exist in FUB)*
- Appointments, deals, tasks
- Property and site engagement events
- Teams and team leadership

## 8. What RCRE will deliberately NOT store

This list is a commitment, and it is enforced in the schema.

- **Message bodies.** Not texts, not emails. The `activity` table stores a summary line and the
  column carries a comment saying why: this table feeds AI context, and full client
  correspondence should not.
- **Call recordings or recording URLs.** FUB restricts them; we do not want them.
- **Any "read" status for a text message.** The delivery-status enum has no `read` value, so no
  code path can introduce one by accident ([ADR-0014](../06-decisions/adr/0014-no-sms-read-receipts.md)).
- **Financial or credit detail** beyond a free-text financing note that is never used to filter
  service — a fair-housing consideration, not a storage one.
- **Client PII in any Hermes memory file.** Standing rule, unchanged.
- **Notes.** Not subscribed, not read. They are where agents write things about clients that
  should not travel.

## 9. What RCRE will NEVER modify in read-only mode

**Everything.** Specifically and explicitly: no creating, updating or deleting people, calls,
texts, emails, notes, tasks, appointments, deals, stages, pipelines, users, teams, tags, action
plans, automations, smart lists, or custom fields. No sending anything to anyone. No
`POST /v1/events` — even though it is the *correct* way to send leads, it is a write and it is off.

The only mutation of any kind is registering the webhook itself at Stage 3, and unregistering it
if you disable the connection.

---

## 10. How you disable it immediately

Four ways, fastest first. Any one of them stops the flow.

| Speed | Action | Effect |
|---|---|---|
| **Seconds** | In FUB: **Admin → API → revoke the key** | Every read stops instantly. Webhooks keep arriving but nothing can resolve them, and they fail closed. |
| **Seconds** | Set `integration_state.connection_disabled_at = now()` | Ingestion halts at the application layer. No deploy. |
| **A restart** | Set `RCRE_DATA_MODE=fixtures` | The app reverts to synthetic data and behaves exactly as the demo does today. |
| **A minute** | `DELETE /v1/webhooks/:id` for each registered webhook | Stops delivery at source. |

Revoking the key is the one to reach for if something looks wrong. It is instant, it is done
inside FUB where you can see it, and it needs nothing from me.

**Nothing is destroyed by disabling.** Data already captured stays. If the connection is later
re-enabled, the gap in between is simply a gap — and for the forward-only metrics, that gap is
permanent, which is the same reason activation is time-sensitive in the first place.

---

## 11. What you are authorising, and when

Authorisation is **staged**, not one decision. The full plan is in
[REAL-DATA-CUTOVER-PLAN.md](../05-planning/REAL-DATA-CUTOVER-PLAN.md); the short version:

| Stage | What happens | Your approval |
|---|---|---|
| 1 | One call to `GET /v1/identity` to confirm the key works | **Needed** |
| 2 | Historical backfill — read-only, no webhooks | **Needed** |
| 3 | **Register webhooks — history starts here** | **Needed** |
| 4–6 | Validate normalisation, Today, and Command against real data | Report back only |
| 7 | Run silently for an observation period | **Needed** to begin |
| 8 | Compare our numbers against leadership's understanding | Report back only |
| 9 | Consider write capability | **Separate decision, later** |

**Stage 3 is the time-sensitive one.** Four of the metrics leadership asked for — first response
time, contact attempts, time in stage, pipeline fallout — begin accumulating the moment webhooks
are registered and cannot be reconstructed for any earlier date. Every week of delay is a week of
funnel history RCRE will never be able to produce.
