# Integration and risk matrix — RCRE Platform V2

**Date:** 2026-08-26 · **Status:** for Jeremy's approval. Nothing here is built.
Companion to `RCRE_PLATFORM_V2_MASTER_PLAN.md` and `MEETING_REQUIREMENTS_TRACEABILITY.md`.

---

## 1. The finding that changes the plan: Dotloop

Julio asked, at 00:30:47, *"So that would integrate with our dot loop then, right?"* The answer is
**no**, for two independent reasons. Either one alone would be enough.

### 1a. The AI prohibition is real, current, and broader than a training ban

**Dotloop API Terms of Use, clause 2(k), effective 2025-05-13** — you may not use Dotloop Data:

> *"for research purposes, product development or improvement, or in connection with any type of
> artificial intelligence, machine learning, or similar technology, whether for model
> development/training **or for any other purpose**."*

The final phrase reaches **inference**, not just training. And the terms state that Dotloop's
approval of an API registration does **not** limit the prohibition.

**There is no "your own data" carve-out.** A full-text search of the current terms for *own data*,
*Notwithstanding*, *remain the owner*, *do not apply* returns nothing.

### 1b. Even ignoring the AI clause, the API cannot do what the meeting imagined

| The meeting assumed | The API actually offers |
|---|---|
| Route a contract for e-signing | **No signature endpoint exists.** Signing happens only in Dotloop's own UI |
| Get the executed document back | **Document GET returns metadata only.** No endpoint returns bytes. Upload is the only binary operation |
| Know when something was signed | **No `DOCUMENT_*`, no `TASK_*`, no signature webhooks.** Only loop, participant, contact and profile events |
| Manage TC tasks | **Tasks are read-only** |

The Dotloop API is **write-in, metadata-out**. You can push a prepared PDF into a loop. You cannot
pull the executed contract out, and you cannot be told it was signed.

### 1c. The asymmetry that matters — Follow Up Boss is different

| | Dotloop 2(k) | Follow Up Boss (l) |
|---|---|---|
| AI scope | training **"or for any other purpose"** — reaches inference | **"model development or training"** only — silent on inference |
| Own-data carve-out | **absent** | **present and explicit** |
| Can approval cure it | **explicitly no** | not addressed |

FUB's terms state customers *"remain the owner of all business information and data uploaded to our
service … and the data use restrictions herein do not apply to a FUB customer's use of their own
data."* Same corporate parent, opposite posture. **This validates ADR-0012 and closes Dotloop.**

### 1d. Recommendation

**Do not become a Dotloop API licensee.** Treat Dotloop as a terminal, human-operated system of
record for executed documents. Build AI-assisted preparation on an e-signature provider whose terms
permit it, and have a **human** place the finished artefact into Dotloop.

The one-way boundary, stated so it can be enforced rather than remembered:

```
RCRE-originated document  ──AI may process──►  prepared draft  ──human approves──►  e-sign vendor
                                                                                          │
                                                              human files executed doc ◄───┘
                                                                     into Dotloop
Dotloop Data  ──✗ never enters any AI path, for any purpose ✗──
```

**Sources:** [Dotloop API License Agreement](https://www.dotloop.com/api-license-agreement/) ·
[Dotloop Public API v2](https://dotloop.github.io/public-api/) ·
[FUB API Terms of Use](https://docs.followupboss.com/reference/fub-api-tou) — all retrieved 2026-08-26.
**Not verified:** Dotloop's ~$500/month price (Julio's figure, from memory, in the meeting).

---

## 2. Integration register

| Integration | Status | Can we do it | Gate |
|---|---|---|---|
| **Follow Up Boss — read** | Architecture complete, unregistered | Yes. ~14 read endpoints implemented | Jeremy authorises production key |
| **FUB — webhooks** | Built, **never registered** | Yes, 17 events chosen | Jeremy. **Time-sensitive** — 4 metrics accrue only forward |
| **FUB — write** | One path exists (`POST /v1/events`), gated off | Yes, within ADR-0012 | New ADR + staged authorisation |
| **Dotloop** | **Do not integrate** | No — see §1 | Closed unless terms change |
| **E-signature vendor** | Not selected | Yes | Vendor choice + terms review (P-new) |
| **Gmail / Calendar / Drive** | Not started | Yes, Google OAuth | Scope + retention policy |
| **Meta / Instagram ads** | Not started | Yes | **Business Manager ownership — see §3.3** |
| **YouTube / Google Ads** | Not started | Yes | Channel must exist first (RCRE action) |
| **Google Business Profile** | Not started | Yes | RCRE grants access |
| **OpenRouter / DeepSeek / MiniMax** | **Zero code exists** | Yes | Provider policy ADR |
| **Skool (external community)** | Not started | Yes, manual | Course-tier + revenue decision |
| **IDX / MLS** | Not started | **Unknown** | Participant status per MLS — see §4 |
| **n8n** | Jeremy uses it; ADR-0004 defers it | Yes | ADR-0004 revision |

---

## 3. Risk register

Severity: **BLOCKER** stops a workstream · **SERIOUS** must be resolved before that surface ships ·
**NOTE** worth deciding deliberately.

### 3.1 BLOCKER — "Fair housing check passed" is rendered today, and no check runs

`apps/rcre-demo/src/components/CampaignBuilder.tsx:96` and `PreviewSurfaces.tsx:299` display
**"Fair housing check passed"**. Nothing evaluates anything. `PreviewSurfaces.tsx:259` carries a
comment asserting *"the real builder runs that step"* — it does not.

This was on screen during the 26 August demo. Affirmatively telling a broker that a fair-housing
control passed, when none exists, is the worst-shaped defect in the estate: it is a false compliance
assertion, in the one domain where a false assertion carries statutory exposure, shown to the person
whose licence is at risk.

**Recommendation: delete the string this week**, independently of the V2 programme. It is a
three-line change. I have not made it — this pass is planning-only and the instruction was explicit —
but it should not wait for the marketing module.

### 3.2 BLOCKER — broker review does not cure unauthorised practice of law

A recurring assumption in the module designs is that a licensed human reviewing an AI-drafted
contract resolves UPL exposure. It does not. UPL turns on **who prepares the instrument, and whether
preparation is blank-filling on an approved standard form** — not on who reviews it afterwards. A
licensee is not a lawyer; their review satisfies **supervision**, not UPL.

This compounds: the transaction design also generates **amendments, addenda, repair addenda,
counter-offers and terminations** — free-text instruments with the *highest* exposure and least
likely to sit inside a blank-filling safe harbour.

**Required before any document-preparation code:** a per-state, per-artefact determination —
*is this blank-filling on an authorised form, or is it drafting?* Julio plus brokerage counsel.

### 3.3 SERIOUS — the ad programme routes around the approval architecture

The content design builds a real approval gate (approval bound to an immutable asset version,
broker-only transition enforced in a policy `WITH CHECK`). The lead-gen design then runs creative
from **Jeremy's** ad account and Business Manager, and never mentions **brokerage identification,
licensed-in-state disclosure, or Equal Housing Opportunity** on ad creative or landing pages.

*Equal Housing Opportunity* appears **nowhere** in any of the nine research documents.

**Required:** every housing ad and landing page is RCRE advertising and passes the same approval
ledger; brokerage ID and EHO added to the creative lint; **"who is the advertiser of record"**
answered before a dollar is spent.

### 3.4 SERIOUS — GLBA / Reg P / FTC Safeguards were not considered

Zero references across all research to `glba`, `gramm`, `privacy notice`, `nonpublic personal`, or
`safeguards`. The plan puts a **mortgage originator** in the loop and collects consumer qualification
data on RCRE-owned landing pages. RESPA §8 was handled well; the privacy and data-security regime
was not considered at all.

**Required:** counsel determines what privacy notice and opt-out are owed, and whether the lead store
is in scope for the Safeguards Rule. This blocks ad spend, not just launch.

### 3.5 SERIOUS — provider routing sends client PII offshore with no analysis

The Hermes design routes conversation, coaching and drafting to **DeepSeek / MiniMax**, and consent /
TCPA / DNC state travels with every contact. No document analyses jurisdiction, training-on-input
posture, or DPA availability for those vendors.

**Required:** a provider table with columns for jurisdiction, training posture and DPA — marked
unverified where unverified — before any contact data reaches a hosted model.

### 3.6 SERIOUS — TCPA consent is not wired to the follow-up policy

The lead-gen design proposes `required_channels = {call, text}` for paid leads. `consent_state`
exists on `attribution` but is never connected. As written, the compliance metric would mark an agent
**non-compliant for not texting a lead who never consented to texts**.

**Required:** `required_channels` becomes consent-conditional, and the TCPA consent language captured
on the Meta lead form and landing page is specified. Neither document specifies it today.

### 3.7 SERIOUS — recorded Zillow calls

Taquilla wants real recorded client calls as training material. The design gates playback on consent
status — but a gate does not cure a recording made without consent, and continued retention is its
own exposure. Florida is a two-party-consent state.

**Required:** a disposition path for already-recorded material, not only a playback gate.

### 3.8 NOTE — the demo's "Margie" is a different person from the real Margie

`demo.ts` contains a synthetic agent **"Margie Olsen-Alvarez, REALTOR®"**. The real Margie is
Florida's transaction coordinator. A TC demo would contradict itself on screen. Rename the persona
before any TC demonstration.

### 3.9 NOTE — Margie's licensure and role are unverified

Whether she is a licensee materially changes what she may prepare and approve. It is currently
assumed in one document and flagged unverified in another. Settle it before designing her permissions.

---

## 4. External blockers

| # | Blocker | Owner | Blocks |
|---|---|---|---|
| B1 | Production FUB API key (owner-level) + system registration | **Jeremy** | Nearly all measurement |
| B2 | Webhook registration — **time-sensitive**, 4 metrics accrue only forward | **Jeremy** | Response time, attempts, time-in-stage, fallout |
| B3 | Required-follow-up cadences and stage-aging thresholds | **Taquilla** | Metric 16, "one day overdue" alert |
| B4 | Contract-preparation authority determination | **Julio + counsel** | All document automation |
| B5 | IDX Participant status per MLS — **access ≠ participant** | **Julio** | Website replacement |
| B6 | Instagram + YouTube business channels | **Taquilla** (social manager) | Ad programme |
| B7 | E-signature vendor selection and terms review | **Jeremy** | Signature flow |
| B8 | Alabama TC coverage — Margie is Florida-only | **Taquilla** | AL transactions |
| B9 | Advertiser of record for housing ads | **Julio** | Ad spend |
| B10 | GLBA / Safeguards scope | **counsel** | Lead capture |

---

## 5. Explicitly not verified — do not restate these as facts

- Whether `apps/rcre` has ever run against a live Postgres (`db/pg.ts` says it has not)
- Dotloop's ~$500/month price
- OpenRouter's free-tier terms (10,000 prompts/day on a $10 balance — Jeremy's figure)
- Margie's surname, licensure, employment status and system access
- Whether RCRE holds **IDX Participant** status in any named MLS, as distinct from MLS access
- Whether the FUB Facebook Lead Ads integration is active
- Alabama document-retention period (partially verified, secondary sources)
- Alabama and Florida UETA specifics for e-signature validity
- Whether AL/FL association forms may be programmatically filled
