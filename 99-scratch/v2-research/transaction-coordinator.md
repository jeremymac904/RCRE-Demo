# RCRE Platform V2 — Transaction Coordinator workspace

**Status:** PLANNING PASS ONLY. No code, no migrations, no connections. Scratch research.
**Date:** 2026-08-26
**Scope:** design of the Transactions module — agent view, TC queue, broker exceptions, deadline
engine, state checklists, documents, approval gate, Dotloop posture, inspection→email workflow.

Labels carried from [RCRE-PRODUCT-REQUIREMENTS.md](../../04-requirements/RCRE-PRODUCT-REQUIREMENTS.md)
and preserved per CLAUDE.md:

- **[VLR]** Verified Leadership Requirement — RCRE leadership said it.
- **[DP]** Design Proposal — our idea. Not approved. Never describe to RCRE as something they asked for.
- **[TA]** Technical Assumption — believed, not verified. Carries risk.

---

## 0. Evidence base

Everything in §0 is quoted or paraphrased from the 2026-08-26 meeting transcript in
`RCRE & Jeremy AI + - 2026_08_26 09_58 EDT - Notes by Gemini.md`. Timestamps are the transcript's own.

| Ref | Evidence | Label |
|---|---|---|
| 00:11:55 | Taquilla, describing her own training modules: *"you just drop … the inspection report in there and put the numbers that the people want to have done and have [ChatGPT] pull it and then say email to Margie and it does … So just little things to teach them so they're not so time consumed."* Then: *"Hey, drop the PDF in and tell it the numbers. Tell it to draft the email. Send it to Margie."* | **[VLR]** — a workflow she already performs and already values, and which she intends to **teach as a training module**. |
| 00:28:54 | Jeremy: *"there's a few different lenders that require us to fill out forms for like ordering FHA case numbers or … initial CDs and … for funding purposes … I've got a pipeline folder … it's got those templates in there. So I literally will just be like 'go into this customer's folder and fill out the FHA case number request form' … 'All right, here you go. It's done.'"* | **[DP]** — Jeremy's own mortgage-side workflow, proposed as a pattern. Not an RCRE requirement. |
| 00:29:48 | Jeremy on filling a purchase contract by conversational command. Taquilla: *"See, that to me that's next level."* Jeremy: *"we can also build in to where that it will send the buyer or the seller … the contract to be e-signed … and then once it's e-signed have it come back in … from like a transaction coordinator."* | **[VLR]** — leadership enthusiasm, not a specification. The *capability direction* is endorsed; nothing about format, scope or control was agreed. |
| 00:29:48 | Jeremy: *"So Margie's your transaction coordinator for everybody or do you have—"* Julio: **"Florida."** | **[VLR]** — **Margie covers Florida.** Alabama's TC arrangement was not stated. |
| 00:30:11 | Jeremy: *"you can give me like the timelines of when you would want the transaction coordinator to send stuff out."* No timelines were given in the meeting. | **Outstanding request** — RCRE input required. |
| 00:30:47 | Jeremy: *"what I recommend doing is having it to where that the agent will draft the email and then all you got to do is go in, review it, make sure everything looks good on it, approve it, and send it."* | **[DP]** — the draft→review→approve→send pattern. Jeremy's recommendation; leadership did not formally adopt it. This design makes it **mandatory and technically enforced**, which is a stronger claim than what was said. |
| 00:30:47 | Julio: *"So that would integrate with our Dotloop then, right?"* Jeremy: *"is Dotloop more than e-signing? Does it do more than that?"* Julio: **"Uh, no, not really."** | **[VLR]** as a statement of **how RCRE uses Dotloop**. Not a verified product fact — Dotloop markets itself as transaction management. Design for "RCRE uses it for e-sign", not "it can only e-sign". |
| 00:31:57 | Julio: Dotloop is *"like five something a month"*, it is a Zillow product, Zillow *"not so much requires but highly encourages"* it. Taquilla: Dotloop, Follow Up Boss *"all that's going to be tied into Zillow like a package."* | **[VLR]** — commercial context. ≈$500/mo, switching cost is relationship cost with Zillow, not just software cost. |
| 00:31:57 | Taquilla: agents must work out of a **single CRM** to avoid operational confusion. | **[VLR]** — a scope constraint on this module. Transactions must not become a second place agents live. |
| Action item | *"[Jeremy McDonald] Investigate DotLoop API: verify API access and capabilities."* | Open. A separate agent is verifying a possible **AI/ML restriction on Dotloop Data**. This document is written to work either way (§10) and **does not state that outcome**. |

### Scope defence — why this module is in scope at all

Taquilla's own definition of AI Function 2 is *"Pipeline and accountability management — monitor
leads **and transactions**, identify clients falling through the cracks, flag overdue follow-ups,
and move clients toward appointments, showings, offers, contracts and closings."*
([leadership answers §9](../../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md)) **[VLR]**

Transactions are named by leadership inside a core function. This module is defensible under the
three-function scope defence. Anything in it that does not serve *"identify what is falling through
the cracks"* or *"move a client toward closing"* should be cut.

### The architectural fact worth naming out loud

Transaction management is **the first place RCRE holds business truth that Follow Up Boss does not
hold.** FUB has Deals; it does not have critical dates, state checklists, document completeness,
approvals or a compliance file. Dotloop holds documents, and RCRE uses it for e-sign only. So:

**Transactions are RCRE-OWNED, like `recruiting_prospects`, and unlike `people`.** **[DP]**

That is a genuine extension of ADR-0012, not a violation of it — ADR-0012 makes FUB the system of
record for **CRM contact data**, and nothing in this module writes contact data back to FUB. But it
should be stated in an ADR rather than absorbed silently, because "RCRE builds an intelligence layer,
never a replacement" is the sentence the project defends itself with, and transaction management is
not an intelligence layer. It is a system of record for a new object.

**Recommendation:** raise **ADR-0016 — Transactions are an RCRE-owned system of record**, with the
explicit boundary that (a) contact identity stays in FUB, (b) documents of record may stay in
Dotloop, (c) RCRE owns dates, checklist state, approvals and audit.

---

## 1. Navigation, and how a transaction relates to Pipeline

### The conceptual line

**Pipeline is a person moving. A transaction is a deal executing.** Pipeline answers *is this person
progressing.* A transaction answers *will this close on time and is the file complete.* They have
different clocks (aging vs. contractual deadlines), different failure modes (silence vs. a missed
date), and different owners (agent vs. TC).

Today the demo already carries the seam: `DemoContact.deal = { stage, value, closingDate, milestone,
milestoneDue }` in `apps/rcre-demo/src/data/demo.ts`, and `PIPELINE_STAGES` includes `Under Contract`
while deliberately excluding `Closed` from the board. That is the right instinct and V2 formalises it.

### Creation trigger **[DP]**

A transaction is created **deterministically, never by a model**, on the first of:

1. `peopleStageUpdated` moves a person into a contract-class stage (`Under Contract`), **or**
2. `dealsCreated` / `dealsUpdated` puts a FUB deal into a contract-class stage, **or**
3. A human creates it manually (the escape hatch that must always exist — a referral, a listing that
   went under contract outside FUB, a deal an agent forgot to stage).

Which of (1) or (2) is primary depends on **whether RCRE actually uses FUB Deals** — already an open
question in [RCRE-REPORTING-DATA-MODEL.md §6](../../04-requirements/RCRE-REPORTING-DATA-MODEL.md).
**Unresolved.** Build (1) and (3) first; (1) works regardless of Deals adoption. **[TA]**

Creation produces a transaction in status `intake` with **no dates and no checklist**. It does not
guess. The TC (or agent, where there is no TC) runs intake.

### Navigation **[DP]**

`AppShell.tsx` navigation is deliberately short. Additions:

| Role | Change |
|---|---|
| Agent (`AGENT_NAV`) | Insert **Transactions** → `/transactions`, immediately after Pipeline. |
| Broker (`BROKER_NAV`) | Insert **Transactions** → `/transactions`, after Pipeline. Broker lands on the exception view. |
| TC (new nav set) | **Transactions** is the *first* item and the landing route. Margie does not need Recruiting, Marketing, or Listings. Her nav is: Transactions · RCRE AI · Contacts · Training. |

Routes:

```
/transactions                  role-aware index: agent list | TC queue | broker exceptions
/transactions/[id]             the transaction workspace (tabs: Overview · Dates · Checklist ·
                               Documents · Parties · Messages · Tasks · History)
/transactions/queue            explicit TC queue (TC + broker)
/transactions/exceptions       explicit broker exception board (broker + owner)
/transactions/approvals        the approval queue — see §9
```

**Cross-links, both directions, no dead ends:**
- Contact record (`/crm/[id]`) gains a Transaction card when one exists → deep-links to it.
- Pipeline `Under Contract` cards show a transaction chip with the next critical date.
- Listing (`/listings/[id]`) links to the transaction when the listing goes under contract.
- Transaction Overview links back to the contact, the listing, and the assigned agent.

**Constraint from Taquilla's "single CRM" rule [VLR]:** the transaction workspace must not duplicate
the contact workspace. Communication *with the client* stays on the contact record and in FUB.
The transaction holds communication with **transaction parties** (TC, title, lender, co-op agent) and
**documents**. Do not build a second inbox for the same client.

---

## 2. Agent transaction view

The agent is not a transaction coordinator and must never be given a coordinator's screen. An agent
has three jobs in a live transaction: **produce documents, get signatures, keep the client informed.**

**`/transactions` (agent) — a short list, not a board.** One row per live transaction:
address · client · side · closing date · **the single next thing this agent owes** · a red chip if a
critical date is inside 48h and unsatisfied.

**`/transactions/[id]` (agent) — Overview leads with two panels:**

1. **"You owe"** — the agent's own open checklist items and tasks, each with its deadline and the
   reason it exists. Cap the visible list; the discipline that governs RCRE Today (three priority
   actions, never fourteen) applies here.
2. **"Waiting on"** — what the TC, the other side, the lender, or title owes, with who and since when.
   This is the panel that stops the "Margie, where are we?" phone call, which is the real time cost.

Then: critical date strip (next five, colour-coded), document completeness bar (satisfied / required /
missing, with the missing list named), and a compressed party list.

**Agent capabilities:** upload a document, request a document from the client, run the
inspection→email workflow (§11), draft a party email, confirm a critical date they have first-hand
evidence for, mark their own checklist items complete. **[DP]**

**Agent may NOT:** approve a legally consequential document (§9), send anything to the other side
without approval, change a checklist template, waive a required item, or alter a confirmed date
without a revision record.

---

## 3. TC queue — how Margie actually works a day

This is the surface that decides whether the module is real. A dashboard is not a work surface.
Margie does not want to know how many transactions are healthy; she wants the next thing to do.

**Layout [DP]** — three panes: queue rail · queue list · action panel.

**Queue rail** — counts, ordered by urgency, and each is a saved query, not a folder:

| Queue | Definition (deterministic) |
|---|---|
| **New — needs intake** | `status = intake`. No dates, no checklist yet. |
| **Deadlines today / overdue** | Confirmed critical dates due ≤ today, status not satisfied/waived. |
| **Deadlines this week** | Same, due ≤ +7d. |
| **Needs my action** | Open items where `owner_role = tc`. |
| **Awaiting agent** | Open items where `owner_role = agent`, past their due. |
| **Awaiting outside party** | Open items owned by lender/title/co-op/HOA, past due. |
| **Out for signature** | Documents in `out_for_signature`, aged. |
| **Ready to close** | Closing ≤ +10d, with the unsatisfied required-item count shown. |
| **File incomplete — closed** | Closed transactions with unsatisfied required items. The compliance tail. |
| **My approvals** | Artefacts awaiting a TC-tier approval (§9). |

**Queue list** — one row per transaction: address · agent (with headshot, per the design direction) ·
side · closing date · **the one next action** · age of that action. Sorted by hard deadline, then by age.

**Action panel** — the selected transaction, with the action inline. Margie should complete most
items without leaving the queue.

### A day in the queue **[DP]**

1. **08:30 — New (2).** Two contracts came under contract overnight. She opens the first. The
   executed contract PDF is attached. She runs **intake**: the system proposes extracted fields
   (parties, price, effective date, closing date, financing type, EMD amount) each with a page
   citation. She confirms or corrects each one. **Nothing is applied until she confirms it.**
2. **08:40 — Dates.** From the confirmed effective date, the deadline engine *proposes* the critical
   dates that the applicable rule set produces. She confirms each. Any date the rules cannot produce
   is entered by hand and marked `manual`. Confirmation is the act that lets a date drive outbound
   obligations (§4).
3. **08:45 — Checklist instantiated** from the state × side template version in force. Tasks fan out
   to the agent and to her. The agent gets a notification listing exactly what they owe and when.
4. **09:00 — Deadlines today (5).** She works the board. Each row's action is one of: chase a party,
   send a status email (TC-tier approval, self-approve, one click), generate a document from template
   (broker-tier approval), mark a date satisfied against an executed document.
5. **11:00 — Awaiting agent (3).** One agent is two days late on a signed disclosure. She nudges from
   the row. The second nudge auto-escalates to the broker exception board — configurable, and the
   escalation ladder is RCRE's to set, not ours.
6. **14:00 — Ready to close (4).** Missing-item lists per file. She works them down.
7. **16:30 — File incomplete (1).** A file closed last week is still short one document. This is the
   queue that protects the brokerage at audit time and the one nobody has time for today, which is
   exactly why it should be a standing queue rather than a report someone remembers to run.

**Multi-TC and no-TC:** the rail is scoped by `tc_assignments` (§7). If Alabama has no TC, Alabama
transactions land in an **unassigned** queue visible to the broker — never silently on Margie, never
silently on the agent.

---

## 4. Critical dates and the deadline engine

### The date set **[DP]** — codes, not legal claims

These are the *slots the engine supports*. **Which apply, and how each is computed, is contract- and
state-specific and is brokerage/legal input.** Nothing here asserts an Alabama or Florida requirement.

`effective_date` · `emd_due` · `emd_received` · `inspection_period_end` · `inspection_response_due` ·
`repair_resolution_due` · `loan_application_due` · `financing_approval_due` · `appraisal_ordered` ·
`appraisal_received` · `appraisal_objection_due` · `title_commitment_due` · `title_objection_due` ·
`survey_due` · `hoa_condo_docs_delivery_due` · `hoa_condo_review_period_end` ·
`insurance_binding_due` · `walkthrough` · `closing_date` · `possession_date` · `contingency_removal` ·
plus `custom` slots, because every contract has one thing the template did not anticipate.

### How a date comes into existence

Three sources, and the source is stored, always:

| `source` | Meaning | May drive outbound? |
|---|---|---|
| `extracted` | AI read it off a document. **A proposal.** Carries page + text-span citation and a confidence value. | **No** — not until confirmed. |
| `computed` | The rule engine derived it from an anchor date. **A proposal.** Carries the rule id. | **No** — not until confirmed. |
| `manual` | A human typed it. | **No** — not until confirmed by a second act, or auto-confirmed if the same human confirms in the same step. |

**Every critical date carries `status`:** `proposed → confirmed → satisfied | waived | missed |
superseded`. **[DP]**

### The enforcement rule that matters

> **An unconfirmed date may generate internal reminders. It may never generate an outbound
> communication, an e-sign envelope, or a document that states a deadline to any party.**

Enforced technically, not by policy text: the outbound artefact builder resolves every date token
through a function that returns only `confirmed`/`satisfied` dates and **raises** on anything else, so
a template referencing an unconfirmed date fails to render rather than rendering a guess. A DB CHECK
on `outbound_artifacts` requires `unconfirmed_date_refs = 0`.

### The rule engine **[DP]**

`date_rules` rows, scoped to a checklist template version:

```
anchor_code        effective_date | acceptance_date | closing_date | <another date_code>
offset             integer
direction          before | after
basis              calendar_days | business_days
end_of_day_time    time
timezone           from transaction.market
weekend_holiday    roll_forward | roll_backward | no_roll
```

**`date_rules` ships EMPTY.** This is the project's established "ships inert" pattern —
`follow_up_policies` and `stage_aging_policies` already do exactly this
(`0002_reporting_and_routing.sql`: *"Empty table = the required-follow-up alert does not fire. That is
the correct behaviour, not a bug."*). With no rules, **no dates are computed and the TC enters them
by hand — and the deadline board, the queue, the escalation ladder and the exception view all still
work.** That is the single most important sequencing decision in this document: **the module is
useful to Margie on day one with zero legal input.**

**Do not invent:** whether a given contract counts calendar or business days, whether a deadline
falling on a weekend rolls, what "days" means for the specific AL and FL forms RCRE uses, or what
time of day a period ends. All of it is legal/brokerage input.

**Timezone is not a detail.** Florida is Eastern; Alabama is predominantly Central. A "5pm deadline"
is a different instant in Jacksonville and Birmingham. Store an explicit IANA timezone per
transaction, derived from market, and render every deadline with its zone. **[TA]** — confirm
RCRE's Alabama market timezone rather than assuming.

### Amendments and revisions

An extension does not overwrite a date. It writes a **new** `critical_dates` row with
`revision_of = <prior id>`, the prior row moves to `superseded`, and the revision records the document
that caused it. The Dates tab shows current dates with a revision count; History shows every change,
who made it, and against which document. Silent date mutation in a transaction system is how disputes
become unwinnable.

### Escalation **[DP]** — thresholds are RCRE's

`T-7 / T-3 / T-1 / due today / overdue`, each mapping to an audience
(`agent | tc | team_lead | broker | owner`), per date code. Same shape as `stage_aging_policies`,
same posture: **ships empty; no rows, no alerts.** Deliver via a policy sheet in the established
house style (§13).

**A note that belongs in that sheet, from the existing stage-aging sheet:** *"Under Contract is
different in kind. Time there is not a performance signal; it is the length of an escrow. What you
probably want alerted is not the duration but a contingency date passing."* This module is the answer
to that sentence, and the sheet should say so.

---

## 5. State-specific checklists — the mechanism, not the content

### The hard rule

**We design the mechanism. RCRE and their counsel supply the content.** Alabama and Florida differ in
required forms, disclosure obligations, who holds escrow, who conducts closing, and record retention.
Nothing in this project may assert any of it. Any AL/FL requirement that appears in the product must
be traceable to a named human at RCRE who approved it.

### Model **[DP]**

```
checklist_templates
  organization_id, id, name
  state              AL | FL                      -- extend when RCRE adds a state
  side               buyer | seller | dual | referral
  property_type      resale | new_construction | condo | land | commercial | ...
  financing_type     cash | conventional | fha | va | usda | other | any
  version            integer
  effective_from     date
  effective_to       date null
  approved_by_user_id            -- who at RCRE signed off. NOT NULL to publish.
  approved_at
  authority_note     text        -- RCRE's own words on why this item set is what it is
  is_published       boolean default false

checklist_items
  template_id, code, label, sequence
  is_required        boolean
  document_type      -- links to the document taxonomy; null for non-document items
  owner_role         agent | tc | broker | client | outside_party
  due_rule_id        -- optional link into date_rules
  authority_note     text        -- RCRE/counsel note. Displayed on hover in the UI.
  allows_waiver      boolean
  waiver_requires_role
```

**Ships with zero published templates.** With none published, intake offers a **blank checklist** the
TC builds by hand for that transaction, and the transaction can optionally be saved as a **draft
template**. That is the honest path from "Margie's practice" to "RCRE's template": capture what she
already does, let the broker review and publish it, rather than researching law and handing it to her.

### Versioning is not optional

A transaction **binds to the template version in force at contract execution** and never
auto-migrates. Forms change annually. A file audited in 2028 must show the checklist that applied in
2026. Republishing a template creates version N+1; live transactions on version N stay there, and the
TC queue shows an optional "template updated" advisory the broker can choose to apply per file.

### The "do not invent" list, stated explicitly

Do **not** encode, seed, or suggest: required AL/FL disclosure forms · whose disclosure obligation is
whose · escrow holder rules · attorney-vs-title closing practice · agency disclosure timing · condo
or HOA delivery and review periods · earnest money handling and disbursement rules · record retention
periods · licence display requirements on generated documents. **All of it is legal/brokerage input.**

The **UI must show provenance**: an item sourced from a published, broker-approved template shows the
approver and date. An item a TC added ad hoc shows as ad hoc. A user should never be unable to tell
which is which.

---

## 6. Buyer vs seller workflows, documents, completeness

### Side drives the template, not a code path

Buyer and seller transactions differ in *which* items appear, *who owns* them, and *which dates*
apply — all of which is template data. Do not fork the workflow engine by side; fork the template.
Dual agency, where permitted, selects a `dual` template and — **[DP]** — should force broker
approval on every artefact, not just the broker-tier ones. Whether RCRE permits dual/transaction
brokerage in each state and under what disclosure is **brokerage input**, unverified.

### Document taxonomy and provenance

```
documents
  transaction_id, id
  document_type_proposed      -- AI or filename heuristic. A suggestion.
  document_type_confirmed     -- null until a human confirms
  classification_confirmed_by, classification_confirmed_at
  provenance      dotloop | rcre_generated | agent_upload | client_upload |
                  email_ingest | counterparty | mls
  ai_processing_allowed       boolean   -- DERIVED SERVER-SIDE FROM PROVENANCE. Not user-settable.
  status          received | draft | out_for_signature | partially_executed | executed | void
  sha256, storage_ref, page_count, version, supersedes_document_id
  contains_sensitive_flags    jsonb     -- e.g. detected bank/routing digits → §9 wire rule
```

### Completeness detection — deterministic, and deliberately dumb **[DP]**

> A required checklist item is satisfied **only** when a document exists whose
> `document_type_confirmed` matches the item's `document_type`, whose `status` is terminal
> (`executed` or `received`), and whose classification was **confirmed by a human**.

`document_type_proposed` **never** satisfies an item. This is the single line that stops a
misclassified PDF from silently marking a compliance file complete. Enforce it in the satisfaction
query — the join is on `document_type_confirmed`, so an unconfirmed document is invisible to
completeness by construction, not by a rule someone has to remember.

Completeness is displayed as **"14 of 17 required · 3 missing: [named]"**. Never a percentage alone,
never a green tick, never "looks complete." A count with the missing items named is a fact; a
percentage is an opinion.

**Waivers** require a reason, an approver of the role the item specifies, and a timestamp — and they
show as waived, never as satisfied, everywhere in the UI and in every export.

---

## 7. Market-specific TC assignment

### Model **[DP]**

```
tc_assignments
  organization_id, user_id
  state             AL | FL
  market            nullable — finer than state (Jacksonville / NE FL, Birmingham, ...)
  is_primary        boolean
  effective_from, effective_to
```

Routing on transaction creation: match `state` + `market` → primary TC. Multiple TCs, backup TCs, and
a TC covering two markets all fall out of the data with no code change.

**Florida → Margie. [VLR]** — Julio answered "Florida" when asked whether Margie covers everybody.

### 🚩 Alabama has no named transaction coordinator

Nothing in the meeting or in any project document names an Alabama TC. Three possibilities, all
unverified: Alabama agents self-coordinate; the Alabama team lead coordinates; or Margie in fact
covers both and Julio's "Florida" was answering a different question.

**Design so the gap is visible rather than papered over:**

- No matching `tc_assignments` row → transaction gets `tc_user_id = NULL`, status `unassigned_tc`.
- It lands in an **Unassigned** queue on the broker exception board with the reason stated:
  *"No coordinator is assigned for Alabama."*
- The agent's view says *"No coordinator assigned — you are covering coordination on this file"*,
  and their checklist shows the TC-owned items reassigned to them, explicitly marked as such.
- **Never** auto-assign to Margie. **Never** silently drop TC-owned items.

### Permissions **[DP]**

The existing enum already has `staff`, and `0003_row_level_security.sql` describes it precisely:
*"staff are deliberately NOT in `rcre_is_broker()`, so they never reach deals, recruiting, the audit
log, or the integration kill switch."* That is a good fit for a TC's **boundary**.

But `rcre_is_org_wide_reader()` currently grants `staff` a brokerage-wide read of the client book, and
a Florida TC does not need Alabama's book. **Recommendation:** do **not** add a new role enum value
(it would require revisiting every policy in 0003). Instead add **one** new helper alongside
`rcre_can_see_person()`:

```
rcre_can_see_transaction(p_transaction_id uuid)  -- SECURITY DEFINER, org-filtered
  owner / broker      → all transactions in org
  team_lead           → transactions of agents on teams they lead
  agent               → own transactions
  staff (TC)          → transactions whose (state, market) matches an active tc_assignments row
  recruiter / viewer  → none
```

Every transaction-hanging table (`critical_dates`, `documents`, `transaction_tasks`,
`transaction_messages`, `approvals`, `dispatches`) expresses visibility through that one function —
the same reasoning the existing file gives for `rcre_can_see_person()`.

**Decision needed from Jeremy:** transaction scope is narrower than the existing `staff` book scope.
That is intentional least-privilege, but it is an inconsistency and should be a conscious choice.

### 🚩 Unverified about Margie

Last name · whether she is an employee, contractor, or third-party TC service · whether she is an RCRE
system user at all · whether she is a licensee · what she uses today (Dotloop? spreadsheets? email?) ·
her working hours and capacity · **and the TC send timelines Jeremy explicitly asked for at 00:30:11
and did not receive.** A TC workspace designed without watching the TC work is a guess. **Recommend a
30-minute shadowing session with Margie before any build**, and treat its output as the seed for the
Florida checklist template.

---

## 8. Tasks, communication history, audit history

### Tasks — and a cross-module hazard

`transaction_tasks` are **RCRE-owned** and **must not be written into Follow Up Boss.** **[DP]**

Reason, and it is not stylistic: `tasks` in FUB feed metric 12, *overdue follow-ups*, in the
reporting model — a **lead-accountability** measure. Pushing "upload the signed disclosure" into FUB
as a task would make TC paperwork indistinguishable from client follow-up failure, and would corrupt
the one metric leadership most wants to trust. Transaction tasks live in their own table, appear on
RCRE Today in their own group, and are **excluded from every follow-up-accountability calculation**.
This exclusion should be asserted by a test.

Task fields: transaction_id · checklist_item_id (nullable) · critical_date_id (nullable) ·
owner_user_id · owner_role · title · due_at · status · escalation_state · created_by · source
(`template` | `date_rule` | `manual` | `escalation`).

### Communication history — two stores, on purpose

The existing `activity` table carries an explicit instruction: *"Summary only. Never store full
message bodies — this table feeds AI context."* Transaction correspondence has the opposite
requirement: an executed-document email trail is a **business record**.

So: **[DP]**

| Store | Contents | Purpose | AI context? |
|---|---|---|---|
| `activity` | summary metadata only | AI context, engagement signals | Yes |
| `transaction_messages` | full rendered artefact, recipients, attachments manifest, provider ids, delivery result | Compliance record | **No** — never joined into AI context by default; only a specific, audited tool may read one |

Retention for `transaction_messages` is **legal input** — AL and FL brokerage record-retention periods
differ and this document does not state either. Ships with retention `null` = retain, and a documented
place to set it.

### Audit history

Reuse `audit_events` (append-only, already built, already the audit of record). Every one of these
writes a row: date confirmed · date revised · document classification confirmed · checklist item
satisfied or waived · template version bound · approval granted, rejected, revoked or expired ·
artefact dispatched or refused · TC assignment changed · extraction job run or refused.

`audit_events.detail` is documented as *"SUMMARY ONLY, no PII"* — honour it. Reference documents by
id and hash, never by content.

**Transaction History tab** = a human-readable projection of `audit_events` + `critical_dates`
revisions + document versions, in one timeline, filterable. This is the screen that answers "what
happened on this file and who did it", which is the question that gets asked exactly when it matters.

---

## 9. THE APPROVAL GATE

This is the heart of the module. The requirement is not "the UI asks for confirmation." It is:
**the system must be incapable of sending or executing without a recorded human approval.**

### Nine mechanisms. Each is a real control, not a sentence.

**1. There is no send capability in the AI path — at all.**
The MCP registry already asserts forbidden tool names by test (`tools.ts`: *"Prohibited capability is
absent by construction, which is the strongest control available — a tool that does not exist cannot
be invoked, jailbroken, or argued into running"*). Extend that forbidden list with:
`send_email` · `send_sms` · `send_for_signature` · `execute_document` · `sign_document` ·
`set_critical_date` · `confirm_document_type` · `waive_checklist_item` · `approve_artifact` ·
`release_earnest_money` · `disburse_funds` · `send_wire_instructions` · `update_wire_instructions`.
**Approval itself is never an MCP tool.** A human approves in the RCRE UI, authenticated, or not at all.

**2. Credential separation.** The drafting/extraction service holds **no** credentials for the e-sign
provider or the mail transport. Only the **dispatcher**, a separate service identity, does. A prompt
injection inside a counterparty PDF cannot reach a credential that is not in the process.

**3. Content-hash binding.** `approvals.artifact_sha256` is recorded at approval. The dispatcher
re-hashes at send time and **refuses on mismatch.** Editing an approved draft produces a new version in
`draft` state and voids the approval. "Approve, then tweak, then send" is structurally impossible.

**4. Recipient binding.** The approval records the exact recipient set. The dispatcher refuses any
recipient not in it. A document that says *"please also copy legal@…"* cannot add a recipient — that
text is data, and it is surfaced to the human, never acted on.

**5. Database-level enforcement.**
- `dispatches.approval_id NOT NULL`, FK to `approvals`.
- Dispatch is performed **only** by a `SECURITY DEFINER` function that re-validates: approval exists ·
  matches the artefact hash · approver held the required role at approval time · not expired · not
  revoked · outbound is enabled.
- **No role has an INSERT policy on `dispatches`.** The only writer is the definer function.
- `approvals` has **no UPDATE and no DELETE policy at all.** Revocation is a new row. An approval,
  once granted, is a permanent fact.

**6. Four-eyes on the highest tier.** For broker-tier artefacts, `CHECK (approver_user_id <>
created_by_user_id)`. An agent cannot draft and approve their own purchase contract.

**7. Approval expiry.** An approval unused for longer than a configured window is stale; the dispatcher
refuses it and requires re-approval. Prevents an approved-but-unsent draft going out after the facts
changed.

**8. Kill switch, defaulted off.** `RCRE_ALLOW_OUTBOUND`, server-side only, default `false` — the exact
pattern already used for `RCRE_ALLOW_FUB_WRITES`, which has tests asserting it refuses while gated.
Same here: tests assert every dispatch path refuses while gated.

**9. Injection containment.** Extracted document text is stored as data and rendered as data. It is
never placed in a system-prompt position, extraction runs with **no tools available**, and any
instruction-shaped content found in a document is flagged to the human and never executed. This is the
same instruction-source boundary the project applies everywhere else.

### Artefact state machine

```
draft ──► submitted_for_approval ──► approved(v,hash,recipients,expiry) ──► dispatched ──► delivered
   ▲              │                        │                                    │
   └── rejected ◄─┘                        └── revoked / expired                └── failed
   └── superseded (any edit creates a new version and voids the approval)
```

### 🔒 What is gated, and who may approve — **[DP], requires brokerage/legal sign-off**

| Artefact | Tier | Who may approve | Four-eyes |
|---|---|---|---|
| Purchase contract / offer prepared for signature | **Broker** | Qualifying/Managing Broker for that state | **Yes** — agent may not self-approve |
| Amendment · addendum · extension · repair addendum | **Broker** | Broker | Yes |
| Counter-offer | **Broker** | Broker | Yes |
| Termination / release of contract | **Broker, no delegation** | Qualifying Broker only | Yes |
| **Earnest money release or disbursement instruction** | **Broker, no delegation** | Qualifying Broker only | Yes |
| Listing agreement · buyer brokerage agreement | **Broker** | Broker | Yes |
| Seller disclosure prepared for signature | **Agent + broker visible** | Listing agent | No — **needs confirmation** |
| **E-sign envelope send (any document)** | Inherits the underlying document's tier, **plus** TC approval of routing and signer order | Both | Per tier |
| Any message to the other side stating a **dollar amount** (repair credit, price change) | **Broker** | Broker | Yes — **needs confirmation**; this is negotiation |
| Critical date confirmation or revision | **TC or agent** confirm; broker notified | TC / agent | No |
| Routine TC status update to a party (no legal content, no amounts) | **TC, self-approve** | TC | No |
| Internal inspection-summary email to the TC (§11) | **Agent, self-approve** | Agent | No |
| Public marketing derived from a transaction ("JUST SOLD") | **Broker** — existing marketing rule | Broker | Per marketing policy |
| **Wire instructions, bank details, or payment routing — in any direction** | **PROHIBITED** | **Nobody** | — |

### 🚨 The wire rule — state it loudly

**The system never drafts, fills, forwards, edits, quotes, summarises, or transmits wiring
instructions, account numbers, or routing numbers. There is no tool. There is no approval that
unlocks it. Inbound email containing them is never auto-forwarded.** Real-estate wire fraud is the
highest-severity, highest-frequency loss event in this industry, and the attack is a plausible email
in a live transaction thread — precisely the artefact this module produces. A document detected to
contain bank-routing patterns sets `contains_sensitive_flags` and is excluded from AI processing and
from any auto-forward path.

### 🚩 What the approval matrix needs before it can be built

- **Which broker approves which state's transactions.** Julio Arango is Qualifying Broker and Taquilla
  Allen is Managing Broker. Which of them is broker of record in Alabama and which in Florida — and
  whether one person qualifies in both — is **unverified** and this design cannot proceed on a guess.
- Whether AL and FL broker-supervision rules require broker review of these artefacts at all, or of
  more than these.
- Whether Margie may approve anything at all (she may not be a licensee).
- The escalation and delegation path when the approver is unavailable at a deadline. A gate with no
  human behind it at 4:55pm on a Friday is a gate people route around.

---

## 10. Where Dotloop fits — designed for both branches

**A separate agent is verifying whether Dotloop's terms restrict use of Dotloop Data for AI/ML. This
document does not state that outcome and does not depend on it.**

### What is actually verified

Julio: Dotloop is *"not really"* more than e-signing **as RCRE uses it**; ≈$500/month; a Zillow
product Zillow *"highly encourages"*; Taquilla expects Dotloop and FUB to be bundled with Zillow.
Jeremy has an open action item to obtain the developer documentation. **[VLR]** for the usage and
commercial facts. **Whether Dotloop offers a usable API or webhooks at all is unverified** — Julio's
speculation that it might work "through Follow Up Boss" is speculation and there is no evidence in
this project of a FUB↔Dotloop document API.

### The architecture that makes the branch a config change **[DP]**

Two interfaces, and **RCRE's transaction truth lives on neither side of them**:

```
DocumentRepository   list · fetch · store · version · executed-callback
SignatureProvider    create envelope · route signers · send · status · retrieve executed
```

Implementations: `DotloopRepository` / `DotloopSignatureProvider`, plus at least one alternative.
Dates, checklist state, approvals, tasks, messages and audit stay in RCRE **always**. This is the
decision that makes both branches survivable — and it also means a $500/month renewal, or a Zillow
packaging change, is a configuration decision rather than a rebuild.

### Branch A — Dotloop Data may NOT be used for AI/ML

- Dotloop remains the e-sign system and the loop of record. RCRE **never** sends Dotloop-sourced
  document content to any model.
- **Technical enforcement, not policy text:** `documents.ai_processing_allowed` is **derived
  server-side from `provenance`** and is not user-settable. The extraction service requires
  `ai_processing_allowed = true`; a DB `CHECK` on the extraction-job table refuses the insert
  otherwise. A refusal writes an `audit_events` row. There is no prompt instruction involved.
- **What survives:** everything sourced from `agent_upload`, `client_upload`, `email_ingest`, and
  `rcre_generated`. In practice the agent receives the executed contract and the inspection report
  directly — so **the inspection workflow (§11) and contract-date extraction both survive Branch A**,
  because they run on documents RCRE received, not on Dotloop's copy.
- **What is lost:** mining historical loops, and auto-extraction from documents that only ever exist
  inside Dotloop.
- **Metadata sub-branch, unresolved:** loop status, participant list, document names and executed
  timestamps are what the deadline engine actually needs, and they may or may not fall under the same
  restriction. Build metadata sync behind its own flag so it can be turned off independently, and make
  sure the module degrades cleanly to **manual date entry** — which §4 already guarantees, because
  `date_rules` ships empty anyway.
- **Worst case — no usable API:** RCRE-side upload plus a non-Dotloop e-sign provider for
  RCRE-generated documents; Dotloop retained as the compliance file, with the TC uploading executed
  documents into it manually. That is what happens today, so the floor is "no worse than current",
  with the deadline board, checklist and approval gate added on top. **This is a real, shippable V1.**

### Branch B — Dotloop Data may be used

- `DotloopRepository` becomes live: loop create on transaction creation, document sync, executed-document
  callbacks satisfying checklist items automatically (still subject to **human confirmation of
  classification**, §6), and envelope send through `DotloopSignatureProvider`.
- Extraction may run on Dotloop-sourced documents.
- **Nothing about the approval gate changes.** A Dotloop envelope send is a dispatch and requires an
  approval row exactly like an email. This is why the gate sits in RCRE and not in the adapter.

### Build order regardless of branch

`ai_processing_allowed` + `provenance` should be built **now**, in either branch. They are also how
this module will handle MLS-licensed content, counterparty documents, and anything with a
sensitive-data flag. **Do not write a line of Dotloop integration until API access, commercial terms
and the AI/ML question are confirmed in writing.**

---

## 11. Inspection report → email — the productised workflow

Taquilla already does this by hand in ChatGPT and named it as a training module she is building. It
is the highest-confidence AI feature in this entire module because a real user already does it
voluntarily. It is also **deliberately Dotloop-independent** (the agent receives the inspection
report directly), which is why it should be the **first** AI capability shipped.

### End to end **[DP]**

**1 · Ingest.** Transaction → Inspection card → *Add inspection report*. Sources: upload, drag-drop,
a per-transaction ingest address (`tx-<token>@…`), or phone camera → PDF. Creates a `documents` row:
`document_type_proposed = inspection_report`, `provenance = agent_upload`, linked to the transaction
and to the `inspection_period_end` critical date.

**2 · Guard, before anything else runs.** `ai_processing_allowed` check (§10) · sensitive-pattern scan
(§9 wire rule) · file type and page cap · **server-side inference only**. A refusal is logged and
explained to the user in words.

**3 · Extract — proposal only.** Structured findings: system-by-system, severity as the *report's own*
characterisation, each with a **page number and text span**. Explicitly **not** produced: cost
estimates, safety or code characterisations, contract interpretation, or a recommendation about what
to request. Stored as `inspection_findings`, `status = proposed`.

**4 · The agent supplies the ask — Taquilla's *"tell it the numbers."*** The agent enters the
requested items and dollar amounts. The item list may be **pre-populated** from extracted findings;
**every dollar amount is typed by a human.** A model-invented repair credit heading to the other side
is a real financial harm, and this is the field where that would happen.

**5 · Compose — draft only.** Brokerage template renders: transaction identifiers · buyer's requested
items and amounts · the **confirmed** inspection-response deadline (unconfirmed dates fail the render,
§4) · attachment manifest. Compliance lint runs and **blocks**: protected-class language (fair
housing), legal-advice phrasing, promissory language, and any bank/routing pattern.

**6 · Review — provenance visible.** The draft shows, side by side, which sentences came from
extraction (each clickable to its page in the PDF), which came from the agent's typed input, and which
from the template. The agent verifies against the source without leaving the screen. This is the step
ChatGPT structurally cannot offer and it is where the product earns its place.

**7 · Approve.** Internal email to the TC = **agent self-approval, one click**, hash-bound, logged.
This tier must stay fast; Taquilla's whole point was *"so they're not so time consumed."* If it takes
longer than her ChatGPT flow, it has failed.

**8 · Dispatch.** Backend sends, recipient-bound. **V1 alternative that carries zero send risk:** open
a fully prefilled draft in the agent's own mail client with the attachment. Ship that first if
outbound is not yet authorised — the value is in the composition and the structure, not the SMTP call.

**9 · The TC receives work, not email.** The message lands in Margie's queue as a **structured item** —
transaction · deadline · requested items · amounts · source PDF attached — not as loose prose she must
re-key. **This is the actual productisation.** ChatGPT gives Taquilla a better email; RCRE gives Margie
a better inbox. Say it that way in the demo.

**10 · TC action.** Margie generates the repair addendum / inspection response from the brokerage
template (**broker-tier approval**, §9 — it goes to the other side and contains amounts), routes for
e-sign, and the executed document returns.

**11 · Closure.** The executed response satisfies its checklist item and closes
`inspection_response_due`. If the deadline passes unsatisfied: agent alert → escalation → broker
exception. This is the loop leadership described as *"identify clients falling through the cracks."*

**12 · Training tie-in — this is what Taquilla asked for.** Ship an Academy lesson that runs the
workflow against a **synthetic** transaction inside the product. Her ChatGPT version becomes the
"how to do this anywhere" lesson; the product version is the "how we do it here" lesson. It satisfies
her stated plan, and a recruit watching an agent do this in four clicks is a recruiting asset.

**Explicitly out of scope for this workflow:** proposing dollar amounts · advising repair vs. credit ·
interpreting what the contract entitles the client to · contacting the other side without broker
approval · characterising a finding as a safety or code violation.

---

## 12. Data model and MCP surface — summary

**New tables**, all with `organization_id`, all under RLS via `rcre_can_see_transaction()`:
`transactions` · `transaction_parties` · `critical_dates` · `date_rules` · `checklist_templates` ·
`checklist_items` · `transaction_checklist` · `documents` · `document_extractions` ·
`outbound_artifacts` · `approvals` · `dispatches` · `transaction_tasks` · `transaction_messages` ·
`tc_assignments`. Audit reuses `audit_events`.

**Size discipline:** 0001 shipped 13 tables with a comment defending that number. Fifteen more is a
real increase and should be justified table by table in the migration header the same way. Candidates
to merge if pressed: `checklist_items` into a JSONB column on `checklist_templates`;
`document_extractions` into `documents`. **[DP]**

**MCP tools — read-heavy, all narrow, authority resolved server-side:**
`get_my_transactions` · `get_transaction` · `get_transaction_critical_dates` · `get_missing_documents` ·
`get_tc_queue` (staff/broker) · `get_transaction_exceptions` (broker) ·
`summarize_inspection_report` (effect `draft`) · `draft_transaction_email` (effect `draft`) ·
`request_critical_date_confirmation` (effect `write`, requires approval) ·
`request_document_classification` (effect `write`, requires approval).

**Absent by construction** — see §9 mechanism 1. Add every one to the existing forbidden-tool test.

---

## 13. Sequencing

| Phase | Contents | Blocked on |
|---|---|---|
| **0 — useful with zero legal input** | transactions object · manual critical dates · deadline board · TC queue · agent view · broker exceptions · transaction tasks · document upload with human classification · completeness · message log · audit · **approval gate + dispatcher with outbound OFF** | Nothing. Buildable now. |
| **1 — the inspection workflow** | §11 end to end, ending at a prefilled mail draft | The AI data-handling decision (§14 item 3). **Not** blocked on Dotloop. |
| **2 — brokerage content** | checklist templates published · date rules · escalation thresholds · approval matrix signed off · retention set | Policy sheets returned + broker/counsel sign-off |
| **3 — Dotloop** | repository + e-sign adapters | API access, terms, and the AI/ML answer, **in writing** |
| **4 — template filling** | FHA case number request, initial CD, contract prefill | Form licensing (§14 item 5) + lender-document question (§14 item 4) |

**Policy sheets to write**, in the established house style
(`POLICY-SHEET-STAGE-AGING.md` is the model — five minutes, tables with blanks, our suggested
first-draft numbers to react to, and a clear statement that our numbers are ours):

1. `POLICY-SHEET-CRITICAL-DATES-AL.md` and `-FL.md` — which dates, which anchor, calendar or business
   days, weekend rolling, time of day.
2. `POLICY-SHEET-TRANSACTION-CHECKLIST-AL.md` and `-FL.md` — required documents by side, who owns
   each, and who at RCRE approves the list.
3. `POLICY-SHEET-TC-TIMELINES.md` — **Jeremy asked for this in the meeting at 00:30:11 and did not
   receive it.** When should the TC send what, to whom, relative to which date.
4. `POLICY-SHEET-APPROVAL-MATRIX.md` — the §9 table, for broker/counsel to correct and sign.

---

## 14. 🚩 Could not verify — do not let these become assumptions

1. **Dotloop's AI/ML terms.** Separate agent verifying. Not stated here.
2. **Whether Dotloop has a usable API/webhooks at all.** Jeremy's action item, open. Julio's "maybe
   through Follow Up Boss" is speculation with no supporting evidence in this project.
3. **The AI data-handling decision, and it conflicts with ADR-0011.** ADR-0011 says agents bring their
   own provider and RCRE prefers free/local. **A purchase contract cannot be sent to an agent's
   personal consumer AI account.** Transaction document processing therefore needs an **RCRE-controlled,
   server-side inference path** with a real data-processing posture (self-hosted/local, or a provider
   under a DPA with no-training terms) — configured per organisation, provider-agnostic, and **never**
   the agent's BYO subscription. This is the one place in the product where BYO-provider does not work,
   and it carries a cost implication ADR-0011 was written to avoid. **It needs an explicit decision
   from Jeremy and probably an ADR.** Worth noting: Taquilla is already putting inspection reports
   into personal ChatGPT today, so the product improves the current data posture rather than
   worsening it — but that argument must be made honestly, not used to skip the decision.
4. **The FHA case number request / initial CD forms are lender documents, not brokerage documents.**
   Jeremy's 00:28:54 example is from his mortgage business. Whether an RCRE *real estate* transaction
   ever produces them, who is permitted to prepare them, and whether TRID/lender rules allow a
   brokerage system to generate an initial CD at all — **all unverified.** Do not build this from the
   meeting quote. It was an illustration of a capability, not a requirement.
5. **Whether the AL/FL association forms RCRE uses may be programmatically filled.** State association
   and NAR forms are typically copyrighted and licensed to members with conditions. Legal input.
6. **Which broker is broker of record in which state**, and therefore who approves what (§9).
7. **Every AL/FL legal detail** — required documents, date conventions, escrow holder, closing
   practice (attorney vs. title), retention periods, dual-agency permissibility. Mechanism designed;
   content is RCRE's and counsel's.
8. **Margie** — role type, system user status, licensure, current tooling, capacity, and the send
   timelines. **Recommend a shadowing session before build.**
9. **Alabama TC** — nobody named. Designed as a visible gap (§7), not a default.
10. **Whether RCRE uses FUB Deals** — determines the creation trigger (§1). Already open in the
    reporting data model.
11. **Alabama market timezone** — assumed Central, not verified (§4).
12. **Volume** — number of live transactions per month. Determines whether Margie's queue is a list or
    needs real triage. Unknown.

---

## 15. The three sentences this module has to earn

- **For Margie:** *"Everything I have to do today is one list, in deadline order, and the thing I need
  to do it with is already attached."*
- **For the agent:** *"I know what I owe, what I'm waiting on, and I stopped calling Margie to ask."*
- **For Julio and Taquilla:** *"Nothing legally consequential left this brokerage without a named
  human approving it, and I can prove it."*
