# V2 research — Single workspace over Follow Up Boss, and the Broker/Admin operating model

**Author:** planning subagent · **Date:** 2026-08-26 · **Status:** RESEARCH / PROPOSAL. Nothing here is built.
**Scope:** planning pass only. No code written, no migration created, no connection made.

Labels used throughout, per CLAUDE.md:
**[VLR]** verified leadership requirement · **[DP]** design proposal (ours, not approved) ·
**[TA]** technical assumption (believed, not verified — carries risk).

---

# PART A — THE SINGLE WORKSPACE

## A0. The discrepancy, stated precisely

There are not two readings. There are **three**, and the third is the one leadership actually committed to.

### Reading 1 — Gemini's Decisions section
> "The team agreed to maintain 'Follow-up Boss' as the central CRM, integrating all automation and
> tools directly into it to avoid requiring agents to navigate duplicate systems."

This asserts a **direction of integration** (tools go *into* FUB) that no line of the transcript
states. It is a summariser's inference from Taquilla's sentence about two CRMs. Treat the clause
"integrating all automation and tools directly into it" as **unsupported**.

### Reading 2 — the transcript (00:32:58 → 00:33:54)
> **Taquilla:** "I was thinking like with agents that if we… and then me I guess me and Julio will
> talk more about this — not really having them go into two different CRM because that's going to
> be crazy for them. That that's we seen how that works, right?"
>
> **Jeremy:** "Yeah. I definitely agree with that. And I mean, it is nice that it can integrate with
> Follow-up Boss. they really could just work out of your system. Um, and it would do everything
> like, you know, update the files, put the notes in there, you know, everything that you can do,
> you know, through the integrations."
>
> **Taquilla:** "right."

Taquilla states a **constraint** (one CRM for agents). She does **not** name which one. Jeremy
proposes RCRE-on-top. Her "right." is assent, but thin — she moves immediately to another topic.

### Reading 3 — what Taquilla scoped for herself, seconds later (00:33:54)
> **Taquilla:** "And then but far as like the training, you know, we would say, hey, you go over to
> here to do the training. Um, but me and Julio would definitely be using it for uh keeping up with
> the leads um how they're following up um in there."

This is the most concrete statement of intended adoption in the entire meeting, and it is
**narrower than both other readings**:

- **Agents → RCRE for training.** Stated.
- **Leadership → RCRE for lead accountability.** Stated, emphatically ("definitely").
- **Agents → RCRE as their daily CRM.** *Not stated.* Not refused either.

### Conclusion on the discrepancy

**The single-workspace decision has not actually been made.** What was agreed is a *principle*:
agents must not be asked to work two CRMs. Both Reading 1 and Reading 2 satisfy that principle.
Taquilla also explicitly deferred: *"me and Julio will talk more about this."*

Do not write V2 documents that describe single-workspace as a decision. Describe it as **the
recommended resolution of an open decision**, with the evidence, and put it to Julio and Taquilla
as a question.

### Why Reading 1 is not buildable as written

"Integrate all tools directly into FUB" cannot deliver what leadership asked for, because FUB has
no extension surface that can host it. FUB's in-product extension points are the Inbox Apps
surface (message channels), Zapier, and the public API. None of them can render:

- the agent inspector Taquilla described at 00:09–00:10:05
- stage-transition history (FUB does not keep it — that is why RCRE accumulates it)
- assignment history / the Alabama routing chain (FUB keeps no assignment history)
- the classroom, community, coaching, day plan, marketing builder, recruiting CRM

So Reading 1 describes a **data direction**, not a UI. As a data direction it is correct and it is
already ADR-0012. As a UI instruction it is impossible.

### Why Reading 1 nonetheless contains the sharpest constraint in the whole design

If agents work in RCRE and RCRE **cannot write**, then work happens in RCRE that FUB never learns
about — and FUB stops being the system of record in fact while remaining it on paper. That is a
worse outcome than either pure option. **This is the strongest argument for eventually earning
write authorisation, and it should be presented to Jeremy in exactly those terms.**

## A1. Recommendation — "Single pane, FUB of record"

**[DP]** Separate three things that the meeting collapsed into one word ("CRM"):

| Role | System | Basis |
|---|---|---|
| **System of record** — the file, the contact, the message history | **Follow Up Boss** | ADR-0012, binding |
| **System of engagement** — where the human decides and works | **RCRE** (target) | Reading 2 + Reading 3 |
| **System of communication** — where texts/calls/emails actually happen | **Follow Up Boss** (today, and recommended for V2) | see A9/W5 |

Sentence for leadership:
> *"Agents get one place to work. Follow Up Boss stays the file of record and keeps every message.
> Nothing leaves Follow Up Boss — RCRE adds the layer Follow Up Boss does not have."*

**The rule that keeps this honest:** RCRE must never become a second place where client
communication happens *unless that communication is mirrored into FUB*. Until write is authorised,
"work out of RCRE" means **decide in RCRE, act in FUB** — and RCRE's job is to make that handoff
one click rather than a re-navigation and a re-search.

**[TA] — UNVERIFIED, needs checking before this is promised:** the FUB deep-link URL format for a
person record, and whether the FUB **mobile** app supports a URL scheme. Nothing in this repository
records either. This matters more than it sounds: agents text from the FUB mobile app, so a
desktop-only deep link may not reach the place the work actually happens.

## A2. Read synchronisation

Three lanes. Two are already designed in `apps/rcre/src/lib/` (`sync/backfill.ts`, `fub/webhook.ts`);
the third is new for V2.

1. **Backfill** (cutover Stage 2). Keyset pagination only (`next`, never `offset` — FUB enforces
   this for deep sets), resume checkpoints in `sync_state`, paced by `X-RateLimit-Remaining` rather
   than a fixed sleep. Slow part: `/v1/calls` has no date-range filter, so attempts must be
   iterated per person.
2. **Webhook stream** (cutover Stage 3). 17 subscribed events. Ledger-first: receive → verify HMAC →
   persist → 200 within FUB's 10-second window → resolve out of band by re-fetching the
   authoritative record. Out-of-order safe by construction, because the payload carries IDs only.
3. **Reconciliation sweep** — **NEW, and required.** Webhooks retry for ~8 hours and then the event
   is gone forever; `peopleDeleted` is deliberately unsubscribed; stage *definitions* are
   deliberately polled rather than subscribed. So:
   - **Nightly:** re-read people changed since the last checkpoint. **[TA]** — whether
     `GET /v1/people` supports an updated-since filter or sort is **unverified**; if it does not,
     the sweep must be a bounded rolling re-read and that changes its cost materially.
   - **Weekly:** full re-read of `/v1/stages`, `/v1/pipelines`, `/v1/users`, `/v1/teams`. Small,
     cheap, and it is how stage renames and roster changes are caught.

**Freshness is part of the contract, not a nicety. [DP]** Every management surface displays its own
data age from two clocks: `last_webhook_at` and `last_reconcile_at`. If webhook lag exceeds a
threshold, the inspector says *syncing* instead of showing a count. An accountability screen that
is quietly forty minutes stale will eventually be used to confront an agent who did make the call,
and that is how a brokerage stops trusting the product.

**[DP] Latency budget:** webhook resolve p95 under 60 seconds. Management screens read the local
mirror only — **never a live FUB call on page render** (rate limit and page latency both). The one
exception is an explicit, per-agent, rate-limited "Refresh from Follow Up Boss" control.

## A3. Write synchronisation and conflict ownership

Design it now; ship it dark (see A9). Grounded only in the verified surface.

### Verified write surface

| Write | Endpoint | Limit | Notes |
|---|---|---|---|
| Lead in | `POST /v1/events` | unlimited context | **The only correct lead path.** `POST /v1/people` runs no automations, no lead-flow assignment, no notification, no dedupe. `campaign.source` required whenever `campaign` is sent. |
| Person field update | `PUT /v1/people` | 25 / 10s | **[TA]** partial-update semantics and any concurrency control are **unverified** |
| Note | `/v1/notes` | 10 / 10s | see asymmetry below |
| Task | tasks endpoints | global 250 / 10s | lowest-risk write |
| Webhook registration | `/v1/webhooks` | — | **Owner permission required**; Admin is not sufficient |

**Status codes on `POST /v1/events` — `200` event on existing person · `201` new person · `204`
lead flow archived and the lead was IGNORED.** 204 must be treated as **failure to deliver** and
must raise an alert. It is a silent lead-loss mode and it looks like success to naive code.

**[TA] — the single most dangerous ambiguity in the write design:** whether `POST /v1/textMessages`
**sends** a message or only **logs** one. The repository cites the endpoint but does not resolve
this. A "log the text I already sent" path and a "send this text" path must never be the same code
path, must never share a permission, and must never share a UI control. Verify before designing
anything on top of it.

### The notes asymmetry — state it explicitly so it does not read as a contradiction

RCRE **deliberately does not read notes** (they are where agents write candid things about clients,
and that table feeds AI context). But **writing** a note is a different act. **[DP]** RCRE may
`POST` a note recording an RCRE-side action ("Follow-up task created from RCRE Command") and never
`GET` one. Write-only, never read-back. This is the cheapest way to make RCRE-side activity visible
inside FUB without RCRE ever storing note content.

### Field ownership matrix — one owner per field, always

| Class | Owner | Examples | Conflict rule |
|---|---|---|---|
| **FUB-owned** | FUB | name, emails, phones, tags, source, current stage, current assigned user, deals, appointments, message history | **FUB always wins.** RCRE overwrites its mirror on every resolve. RCRE writes these only through an approved, audited, single-purpose action. |
| **RCRE-derived** | RCRE | `assignment_history`, `stage_transitions`, `first_touch_at`, `last_outbound_at`, priority, reasons, response-time metrics, status-hygiene flags, engagement rollups | FUB never sees these; conflict is impossible. Recomputed from FUB truth, never authored. |
| **RCRE-originated** | RCRE | day plan, coaching, academy progress, marketing assets, recruiting prospects, approvals, alert state, policies | Lives only in RCRE. **Not** pushed to FUB. |

Genuine two-writer conflict is possible on exactly five things: **stage · assigned owner · task ·
note · lead event.** Nothing else.

### Write-through, read-back — the rule that keeps the mirror honest **[DP]**

**RCRE never sets its own mirror from its own write.** It writes to FUB, then waits for the
corresponding webhook (`peopleStageUpdated`, `tasksCreated`, …) to confirm, and updates the mirror
from the re-fetched authoritative record. Consequences:

- the mirror is self-healing
- a silently failed write becomes visible as an **unconfirmed intent** rather than as a lie
- there is exactly one code path that writes the mirror (the resolver), which is far easier to
  reason about than two

### Optimistic concurrency — never blind-write

Before any `PUT /v1/people`, re-fetch the person. If the field's current value differs from the
value the human saw when they approved, **abort and re-present the decision**. FUB documents no
ETag / `If-Match`, so this is application-layer optimistic concurrency. **[TA]** unverified whether
FUB offers anything better.

### Self-write suppression — a real correctness trap

The documented webhook payload is `{eventId, eventCreated, event, resourceIds, uri}`. **It carries
no originating-system identifier.** So RCRE **cannot** tell its own writes from an agent's writes
by looking at the webhook. If this is not handled, RCRE will count its own stage write as *the
agent updated the status*, which corrupts status hygiene — the exact metric leadership asked for.

**[DP] Mitigation:** an `outbound_writes` ledger keyed by
`(person_id, field, new_value, requested_at, status)`. When a resolve produces a change matching a
pending row inside a window, mark it **confirmed** rather than attributing it to the agent. Rows
that never match inside the window become **unconfirmed intents** and are surfaced.

## A4. FUB ID mapping

The existing schema already has the right instinct: `fub_task_id`,
`unique (organization_id, fub_resource_type, fub_resource_id)`, `deleted_in_fub` soft-marking.
Extend it:

- Every mirrored entity carries `(organization_id, fub_<entity>_id)` UNIQUE + `last_synced_at` +
  `deleted_in_fub`.
- **Person merges are the hazard.** `POST /v1/events` dedupes, and a merge collapses two FUB ids
  into one; `peopleDeleted` cascades and deletes associated notes/calls/texts with no individual
  delete events. **[DP] New table required in V2:**
  `person_id_aliases (organization_id, fub_person_id, canonical_person_id, merged_at)` so history
  attached to a losing id survives and still rolls up to the surviving person. **This does not
  exist in migrations 0001–0003.**
- **`users.fub_user_id` mapping is a precondition for any agent-level number.** **[DP]** An
  unmapped FUB user must make the inspector **refuse to render numbers**, not render zeros. Zeros
  get read as "this agent did nothing".
- **Teams:** `GET /v1/teams` exposes `teamLeaderOf` — this is where the Alabama team-lead layer
  (P0.6 / open question A-17) is *discovered* rather than assumed. **[TA]** unverified that RCRE's
  Alabama team lead is modelled as a FUB team leader at all.
- **Stage names must never be hard-coded.** The demo's `Stage` union is authored. In production,
  stages come from `GET /v1/stages`, and `stage_aging_policies` must key on the **FUB stage id**,
  not a display string, or a rename silently disables every aging alert.

## A5. Webhooks

Already correct in design: Owner-only registration, ledger-first, idempotent by `eventId`,
out-of-order safe, HMAC verified with FUB's unusual construction (base64 the raw body **first**,
then HMAC that string with `X-System-Key`). V2 additions:

- **Dead letter + replay.** A resolve failing three times parks as `status='failed'` and is
  replayable by hand. Because the payload carries no data, replay is always safe.
- **Gap detector.** Nightly, compare FUB's `updated` against `last_synced_at`; a person updated in
  FUB but never resolved is a missed event. Record a `sync_gap` and re-resolve. This is the only
  defence against the ~8-hour retry cliff.
- **Slot budget:** 2 webhooks per event per system. Do not register a second endpoint casually,
  and unregister anything unused.
- **`peopleUpdated` noise control.** It fires on any change. The handler must diff against stored
  state and discard no-ops, or it spends the rate-limit budget on nothing. Here efficiency is a
  correctness concern.

## A6. Audit

`audit_events` already carries actor / action / effect / allowed / denied_reason / summary-only
detail. V2 additions **[DP]**:

- **Paired rows on every FUB write:** `fub.write.requested` and `fub.write.confirmed|failed`,
  recording the FUB status code — **especially `204`**, which must be logged as a failure.
- **Approval is a first-class record:** approving human, the exact payload approved, and a hash so
  the executed payload can be proven identical to the approved one. *Approving text A and sending
  text B is the failure mode that ends the programme.*
- **Manager reads are audited too.** The inspector is a surveillance surface. Logging who looked at
  whose book protects both sides, costs almost nothing, and is the right posture for a licensed
  brokerage.

## A7. Approval

Three tiers, matching the existing `ToolEffect` in `mcp/rcre-mcp-server/src/tools.ts`:

- **`read`** — no approval.
- **`draft`** — RCRE composes; a human sends. Nothing leaves RCRE. (This is where
  `draft_follow_up` sits today.)
- **`write`** — requires **three independent gates, all true**: recorded human approval
  (`requiresApproval`), `integration_state.writes_enabled`, and `RCRE_ALLOW_FUB_WRITES`. Plus the
  fourth, strongest control that already exists: **no write tool is registered in the MCP server**,
  and a tool that does not exist cannot be jailbroken into running.

Compliance overlay (same approval ledger, different subject):
- **Broker approval before any public marketing asset publishes.** Real-estate advertising is
  regulated; this is a control, not a UX preference.
- **Human approval for legally consequential documents** — the purchase contracts, initial CDs and
  FHA case-number requests Jeremy demonstrated at 00:28:54 are exactly this class.
- **Fair housing:** no routing, prioritisation or alert rule may key on a protected class or a
  proxy for one. Priority is behaviour and recency only, as `get_hot_leads` already states.
- **TCPA:** consent state must gate any future send path, as a first-class field, not a checkbox.

## A8. Failure recovery

| Failure | Response |
|---|---|
| **429** | Honour `Retry-After` **even when `X-RateLimit-Remaining` says otherwise** — FUB documents this explicitly. Already implemented. |
| **Webhook endpoint down** | FUB retries 5 times over ~8h. Beyond that: gap detector + reconcile sweep. |
| **Key revoked / 401** | Fail closed. Freeze management surfaces behind an explicit "as of" state; never show stale numbers as current. |
| **Write never confirmed** | Park in `unconfirmed_intents`, surface to the agent as *"not confirmed in Follow Up Boss — open the record"*. Never silently assume success. |
| **`204` on lead event** | Lead flow archived; the lead was dropped. Alert immediately. |
| **Merge / delete in FUB** | Soft-mark + alias table. Never hard-delete derived history. |
| **Clock / timezone** | Store UTC, compute in RCRE local time, state the timezone on every report. |

## A9. What an agent can do WITHOUT opening FUB

The honest answer is staged, because writing to FUB is currently **unauthorised**.

**Today (read-only):** see the prioritised list of who to contact and why, with traceable reasons ·
full contact context (stage, source, owner, engagement, property views, saved properties, email
opens/clicks, last inbound/outbound, days in stage, appointments, deal milestone, tasks) · own
performance against the roster · a drafted text/email/script that never leaves RCRE · a day plan ·
training, community, coaching · marketing creation behind broker approval.

**Today they CANNOT:** send anything · change a stage · create or complete a task · log a call.

> **Framing to use with leadership:** *today RCRE is where you decide, Follow Up Boss is where you
> act.* The gap is one click. Closing that click is precisely what write authorisation buys, and it
> is the difference between "one workspace" as a slogan and as a fact.

**After W2:** create/complete a follow-up task; log an activity outcome; post an RCRE-action note.
**After W3:** apply an approved stage update (compare-and-set).
**After W4:** send a lead event for RCRE-originated leads — this matters directly because of the
Alabama ad campaigns Jeremy proposed (00:34:56) and Taquilla's "leads we generate on our own"
question (00:33:54).
**W5 (outbound send):** **recommend NOT in V2.** It converts RCRE from a system of engagement into
a communication system, drags in TCPA consent as a hard gate, and duplicates the one thing FUB
genuinely does well.

## A10. Staged path to earning write authorisation

Preconditions: cutover Stages 1–8 complete; read-only proven; Stage 8 reconciliation done.
**[DP] Also: obtain a FUB trial/sandbox account first** (already recommended, still unresolved —
item #9 in FUB-CAPABILITY-VERIFICATION §7). Every write stage should be exercised there before
production.

| Stage | What | Duration | Evidence it produces |
|---|---|---|---|
| **W1 — Shadow writes** | Every write the system *would* have made is recorded in `outbound_writes` with `status='shadow'` and executed against nothing | 2 weeks | *"Here are the 214 writes we would have made. Here are the 3 that were wrong, and why."* **This is the artefact that earns the authorisation** — it makes Jeremy's decision informed rather than brave, at zero risk. |
| **W2 — Tasks only** | One volunteer agent. Kill switch armed. | 2 weeks | Confirmation rate, unconfirmed intents, agent reaction |
| **W3 — Stage updates** | Approval-gated, compare-and-set, same pilot agent | 2 weeks | Conflict rate, self-write suppression correctness |
| **W4 — Lead events** | RCRE-originated leads only, `POST /v1/events`, `campaign.source` always set, 204 alerting live | 4 weeks | Attribution integrity |
| **W5 — Outbound send** | Separate ADR. TCPA consent gate. **Recommend deferring past V2.** | — | — |

Each stage gets its own ADR row, its own environment flag, its own `integration_state` boolean, and
a documented rollback (revoke key in FUB · flip the DB flag · `RCRE_DATA_MODE=fixtures` ·
`DELETE /v1/webhooks/:id`).

---

# PART B — BROKER / ADMIN OPERATIONS

## B0. What Taquilla actually asked for

> *"I don't want to have to go through so many funnels to see who's been contacting who… I want to
> be able to go into one of the agents things and look at their leads… needs to see who they have
> contacted and who they haven't contacted… so it can make it easier on myself and the manager to
> be able to just like, hey, what's going on with this person that hasn't been touched — like I
> said one day overdue whatever."* (00:09–00:10:05) **[VLR]**

Three design consequences, all load-bearing:

1. **Navigation is person-first, not report-first.** "Go into one of the agents and look at their
   leads." The inspector opens on **their book**, not on their metrics.
2. **The primary control is a binary**: contacted / not contacted. Not a funnel, not a chart.
3. **"So many funnels" is a complaint about depth.** Every extra click is the thing she is asking
   to remove. One screen, one level of drill.

## B1. The agent inspector — specification **[DP]**

Route: `/agents/[id]`. One screen. No tabs above the fold.

**1 · Header.** Name, market, team lead, role. **Data-freshness stamp** — *"Follow Up Boss data as
of 9:41am."* Exception flags.

**2 · The answer strip.** Five counts, each a **filter on the list below**, never a link away:
**Assigned · Contacted · Uncontacted · Overdue · Stale stage.** This is the direct answer to
"who they have contacted and who they haven't," and it must be one click.

**3 · The book.** One row per lead:
name · source · stage · days in stage · **last outbound (channel + direction + age)** · last inbound ·
**attempts as three small counts (calls / texts / emails)** · next action + due · exception bar.
Default sort is worst-first: uncontacted-oldest → overdue → stale-in-stage.

**4 · Right rail.** Median first response vs roster median · attempts per lead · appointments set
(and held, if measurable) · pipeline (under contract, closed YTD) · stage-age distribution ·
status-hygiene flag · training progress · marketing activity · listings.

**5 · Row expand — the communication METADATA timeline.**
> *Call · outbound · 3m12s · "Left Message" · Tue 2:14pm*
> *Text · outbound · delivered · Tue 2:16pm*
> *Email · opened by client · Wed 8:02am*
> *Viewed 3 properties in Mandarin · Thu*

**No message contents.** This answers "what's going on with this person that hasn't been touched"
completely.

### Feasibility, per requested item — and it must be shown honestly

| Requested | Availability |
|---|---|
| Assigned leads | Day one |
| **Contacted / uncontacted** | **Day one.** No policy, no threshold, no accumulated history. The most valuable metric in the product. |
| Last outreach (when / channel / direction) | Day one |
| Calls · texts · emails | Day one (partial — `/v1/calls` has no date filter, needs per-person iteration) |
| Contact attempts | Day one — report **per lead**, and split attempted vs connected via `calls.outcome` |
| **Response time** | **FORWARD-ONLY.** Renders as unavailable before webhook activation. |
| **Stage age** | **FORWARD-ONLY.** FUB exposes current stage only; the history has no other source. |
| Overdue follow-up | Day one for **tasks**. **Required follow-up is blocked on policy.** |
| Status hygiene | Forward-only + threshold |
| Appointments set | Day one. **Held may be permanently unmeasurable** — it depends on RCRE's agents recording outcomes, and no engineering changes that. |
| Pipeline / transactions | Day one **if** RCRE uses FUB Deals — unconfirmed |
| Training progress | Day one, RCRE-native, genuinely real |
| Marketing activity | Day one, RCRE-native, genuinely real |

**Hard rule:** an unavailable metric renders as **unavailable with its reason** — never as zero,
never omitted silently. A blank where a number belongs is how a broker concludes an agent did
nothing.

## B2. "One day overdue" — a signal, not a policy

Taquilla said *"like I said one day overdue whatever"* — and "whatever" is doing real work. Read it
as **[VLR]**: leadership wants a **day-scale**, not week-scale, overdue horizon. That is genuinely
new information against an empty `follow_up_policies` table and it narrows the range enormously.

**[DP] Do not hard-code one day.** Ship `follow_up_policies` with a **proposed** default of *1
business day to first contact on a new lead*, per source and per stage, and render it in the UI as:

> *RCRE standard: 1 business day — **proposed, not yet confirmed by leadership.***

That satisfies the shape of P0.2.2 without silently enforcing our standard against RCRE's agents,
which the requirements explicitly forbid. It converts an open question into a one-word answer from
Taquilla instead of a blank form.

**Two different "overdue" must be worded differently in the UI:**
- **Overdue task** — the agent committed in FUB and missed it (metric 12, day one).
- **Overdue by standard** — no task existed; the brokerage rule was missed (metric 16, blocked).
An agent who creates no tasks has no overdue tasks. That is exactly why both are needed.

## B3. Metadata versus contents

**Default: metadata only.** Metadata answers: did outreach happen · when · which channel · which
direction · how many times · was it delivered · did they reply · how long was the call · what was
the outcome · did they open or click · did they view property. **That answers every question
Taquilla asked.**

**Contents would be necessary in exactly three cases**, none of which is a dashboard:
1. **Quality coaching** — attempts are happening and not working; someone must read what was said.
2. **Complaint or compliance investigation** — fair housing, licence law, client dispute.
3. **Legal hold / discovery.**

**[DP] Design answer: RCRE never stores contents; the broker opens the record in Follow Up Boss.**
They already have permission there, the disclosure is FUB's rather than RCRE's, contents stay out
of AI context, and the cost is one click. This preserves the schema commitment
(`activity.summary` — *"Summary only. Never store full message bodies — this table feeds AI
context"*) without weakening the investigation path.

**Authorisation required if leadership later insists RCRE surface contents:**
(a) an explicit written brokerage decision by Julio as Qualifying Broker;
(b) **agent notice** — agents must be told their message contents are visible to management in
RCRE;
(c) a new ADR superseding the explicit "no message bodies" commitment;
(d) exclusion from AI context **by construction**, not by prompt instruction;
(e) per-access audit;
(f) subscribing to notes and/or fetching message bodies, both currently declined by design.
**Recommendation: decline.**

**ADR-0014 in the inspector:** no "read" column, no read icon, no "seen" state, ever. Delivery
vocabulary is `sent / delivered / undelivered / unknown` — and `unknown` is the honest state for
A2P long-code traffic. **An inbound reply is the strongest signal available and should be the
visually strongest element in a row.** An undelivered text means a bad phone number, which is an
agent *action item*, not an agent *failure* — the wording matters.

## B4. Manager alerts

**Four alert classes, in ascending order of what they require:**

1. **Never contacted** — deterministic, day one, no policy needed. The one to ship first.
2. **Task overdue** — day one.
3. **Stage aging** — forward-only **and** blocked on a per-stage threshold.
4. **Required follow-up not performed** — blocked on policy; **ships inert, and that is correct
   behaviour, not a gap.**

**Operational alerts:** undelivered text · lead-event `204` (lead silently dropped) · unconfirmed
write · sync gap / stale mirror.

**[DP] Delivery.** Alerts land in RCRE Command and a daily digest. **Not** SMS or email to agents
until sending is authorised. **Routing must respect the Alabama chain** discovered in discovery: an
Alabama alert goes to the **team lead first**, escalating to Julio/Taquilla after N hours.
Otherwise the team-lead layer is bypassed and leadership receives everything — which is the exact
problem they came to solve.

**[DP] Anti-noise rules, non-negotiable:** dedupe per `(person, rule)` with a cool-off · suppress
while the agent is still inside the window · batch into a digest rather than firing per lead ·
never alert on something the agent cannot act on · every alert carries an acknowledge / snooze /
escalate state so it is a **workflow**, not a **view**. An alert system that cries wolf gets muted
in week two, and then the product has failed silently.

## B5. Daily broker briefing **[DP]**

One message each morning:

- **What changed since yesterday** — new leads, appointments set, contracts, closings.
- **What needs you today** — **capped at five**, each with a name and a reason, each one click from
  the briefing to the agent inspector or the contact.
- **Who is drifting** — at most two agents, with specific evidence and a specific ask
  (*"Sarah has 4 leads uncontacted past 1 business day; the oldest is 3 days"*).
- **One coaching prompt.**
- **What we could not compute today, and why** (sync gap, unmapped FUB user, pre-activation metric).

**Hard rules:**
- Every number is computed **deterministically before any model is invoked**. The model writes
  prose over a fixed fact set and **may not introduce a number**. These outputs are used to
  evaluate people; explainability is a requirement, not a nicety.
- **Provider-agnostic (ADR-0011).** The briefing must render usefully with **no model available at
  all** — falling back to the structured list. Never hard-code Anthropic or OpenAI.
- **No PII into Hermes long-term memory.** The briefing is produced from an MCP call and not
  retained.

## B6. Honest assessment of the current screens

### RCRE Command (`app/command/page.tsx`, 477 lines) — closest to target
**Already satisfies:** exceptions-first structure · "Leads nobody answered" with hours-waiting and
owner · agent activity with faces · pipeline stages past threshold, sorted by how far past · recruits
needing attention · lead-source mix · recruiting pipeline · four headline metrics that link into
filtered views · deterministic urgency ordering, explicitly never model-decided.
**Must change:** broker-only (`role !== 'broker'` redirects) with **no team-lead role**, which P0.6
requires · no data-freshness stamp · **no alert state** (acknowledge / snooze / escalate) so it is a
view, not a workflow · "Median first response" has no unavailable rendering for the pre-activation
period · stage thresholds are placeholders shown without the "proposed, not confirmed" framing ·
every number is synthetic.

### Reporting (`app/command/reporting/page.tsx`, 377 lines) — right shape, missing honesty rails
**Already satisfies:** by agent / source / stage · period and market filters · funnel from assigned →
appointment → under contract → closed · response-time flagging above standard.
**Must change:** no drill-through from a funnel step to the underlying people (a funnel you cannot
open is a picture) · **no distinction between backfilled and webhook-measured rows** — the data
model requires that only `detected_via='webhook'` rows be averaged for time-in-stage, and the demo
cannot express that at all · **no "earliest valid date" banner** from
`integration_state.webhook_activated_at`, which the data model requires of *every* report surface ·
no unavailable-metric rendering · no export.

### Agents list + agent detail (`app/agents/page.tsx` 184 · `app/agents/[id]/page.tsx` 286)
**Already satisfies — and the instincts are right:** their book · stale-in-stage with days past
threshold · overdue follow-ups · never-answered · response time **against the roster median**
(context, not a bare number) · training progress · listings · an explicit "every figure is
synthetic" disclosure · thresholds labelled as placeholders.
**Must change to satisfy Taquilla's actual ask:**
1. **No contacted / uncontacted split as a primary control.** "Never answered" is a small sidebar
   list. She asked for exactly this binary, front and centre.
2. **Rows show `last contact Nd ago` and nothing else** — no channel, no direction, no attempt
   counts, no delivery status, no inbound. The metadata timeline is the missing half of
   "who they have contacted."
3. **No appointments, no transactions, no marketing activity, no status-hygiene flag.**
4. **No per-row "days overdue against standard"** — only against tasks.
5. **No filter or sort on the book at all.** Fine at 14 contacts; unusable at 400.
6. **No team-lead scoping** and no audit of the manager's own view.
7. **No freshness stamp**, so a stale mirror is indistinguishable from an idle agent.

### CRM contact detail (`app/crm/[id]/page.tsx`, 387 lines) — reuse this
Already renders a metadata timeline with property views, saved properties, email opens, and
**no message bodies**. This is the correct pattern; the inspector's row-expand should reuse it
directly rather than invent a second one.

---

# C. Things I could not verify — do not state any of these as fact

1. FUB **deep-link URL format** for a person record; whether the FUB **mobile** app supports a URL
   scheme. Nothing in the repo records either. Load-bearing for "one click to act."
2. Whether **`POST /v1/textMessages` sends or only logs**. Critical; must be resolved before any
   send-adjacent design.
3. Whether **`PUT /v1/people`** supports partial update, and whether FUB offers any concurrency
   control (ETag / If-Match).
4. Whether **`GET /v1/people` supports an updated-since filter/sort** for the reconciliation sweep.
5. Whether a webhook payload can **identify the originating system** (documented payload says no —
   hence the `outbound_writes` ledger).
6. Whether **RCRE uses FUB Deals** or tracks contracts only as person stages (decides metrics 6/7).
7. Whether **RCRE's agents record appointment outcomes** (decides whether "held" exists at all).
8. **Total agent count.** Only "two in Alabama, plus me and Julio" is on record (00:34:56). Backfill
   sizing and rate-limit planning both depend on this.
9. Whether the **Alabama team lead** is modelled as a FUB team leader with `teamLeaderOf` set.
10. **Taquilla at 00:33:54:** *"if we do decide to partner on some things and start generating leads
    on our own you don't want them in follows anyway."* Jeremy's reply was about mortgage referral,
    not about system-of-record. **This is unresolved and it is a genuine architectural fork:** if a
    class of leads deliberately bypasses FUB, ADR-0012 needs a stated exception and the
    single-workspace model needs a second lead class with its own ownership rules. Neither person
    closed it.
11. **Dotloop API access** (Julio's ask at 00:30:47; ~$500/month; Zillow-encouraged, not required).
    Jeremy took the action item. Unverified. Julio confirmed dotloop is e-signature only.
12. **Whether Julio agrees with the single-workspace framing.** He was in the room and stated no
    position. Taquilla explicitly deferred: *"me and Julio will talk more about this."*
13. The Gemini "Decisions" clause *"integrating all automation and tools directly into it"* is
    **not supported by the transcript** and should not be quoted back to leadership as their decision.
