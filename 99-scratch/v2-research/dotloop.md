# Dotloop API + Terms of Use — V2 Research

**Status:** Research only. Planning pass. No code, no migrations, no connections.
**Researcher:** Claude Code subagent
**Retrieval date for every web source below: 2026-08-26**
**Audience:** V2 coordinator

---

## 0. Bottom line, up front

1. **Dotloop has a real public API** (Public API v2, OAuth 2.0, webhooks). Access is
   **application-gated and approved at Dotloop's sole discretion.**
2. **The AI/ML prohibition is REAL.** It is clause **2(k)** of the *Dotloop API Terms of Use*,
   **effective May 13, 2025**. It is broader than a training ban — it explicitly covers
   *"any other purpose"*, which reaches inference. Verbatim text in §3 below.
3. **Dotloop has NO "your own data" carve-out.** Follow Up Boss — same corporate parent —
   **does**. This asymmetry is the single most consequential finding in this document, and it
   *validates* ADR-0012 while *closing* a Dotloop AI integration.
4. Even setting the AI clause aside, the API **cannot do the thing the meeting imagined**:
   you **cannot download document content**, there is **no e-signature endpoint**, tasks are
   **read-only**, and there are **no document or task webhooks**. The demoed "route it for
   e-signing" flow is not buildable on the Dotloop API at any price.
5. **Recommendation: do not integrate the Dotloop API.** Treat Dotloop as a terminal,
   human-operated system of record for executed transaction documents. Build RCRE's
   AI-assisted document preparation on an e-signature provider whose terms permit it, and
   have a human place the finished artifact into Dotloop.

---

## 1. Does Dotloop offer a public API?

**Yes.** "Dotloop Platform — Developer Guide — Public API Version 2."
Source: <https://dotloop.github.io/public-api/> (retrieved 2026-08-26)

| Item | Finding |
|---|---|
| Base endpoint | `https://api-gateway.dotloop.com/public/v2/` |
| Auth | OAuth 2.0, 3-legged, web server applications only |
| Authorize | `https://auth.dotloop.com/oauth/authorize` |
| Token | `https://auth.dotloop.com/oauth/token` |
| Revoke | `https://auth.dotloop.com/oauth/token/revoke` |
| Access token TTL | ~12 hours; refresh token flow required |
| Scopes | `account:read` · `profile:read|write|*` · `loop:read|write|*` · `contact:read|write|*` · `template:read` |
| Rate limit | 100 requests/minute **per user**; `X-RateLimit-*` headers; 429 on exceed |
| Developer registration | Apply at `http://info.dotloop.com/developers` — Dotloop issues client id + secret |
| Gating | **Yes.** Approval required, in Dotloop's sole discretion, per use case |
| Cost | **Not verified for the current agreement.** See note below |

### Access gating — verbatim (current terms, §2)

> "Before accessing the Dotloop APIs, you must apply to register your Approved Site(s),
> system(s), and use cases for Dotloop Data at http://info.dotloop.com/developers (or any
> successor URL) and receive Dotloop's approval in each case, in Dotloop's sole discretion."

Approval is **per use case**, not blanket. The permitted uses are literally defined as
"Permissible Uses" = the use cases Dotloop approved in your registration.

### Cost — FLAGGED, NOT VERIFIED

The **superseded** 2022 agreement had an explicit §9 "No Fees" clause ("no license fees or
other payments will be due... we reserve the right to start charging"). The **current**
(2025-05-13) Dotloop API Terms of Use contains **no fees section at all** — it is silent.
I could not verify whether API access is free, bundled with Business+, or separately priced.
**Do not state that the Dotloop API is free.**

### Developer Center page is stale

`https://info.dotloop.com/developers` renders a marketing page whose footer still reads
"Copyright 2016 | dotloop". I could not confirm from the public page whether new partner
registrations are actively being accepted or how long approval takes. **Unverified.**

---

## 2. What can actually be integrated

Endpoint inventory verified against the live developer guide, 2026-08-26.

| Resource | Read | Write | Notes |
|---|---|---|---|
| Account | GET | — | |
| Profiles | GET list/one | POST create, PATCH update | |
| Loop Summaries | GET list/one | POST create, PATCH update | |
| Loop Details | GET | PATCH | The transaction field data |
| Loop Folders | GET list/one | POST, PATCH | |
| **Loop Documents** | GET list/one — **METADATA ONLY** | **POST upload (binary, multipart)** | **See below — this is the critical limit** |
| Loop Participants | GET list/one | POST add, PATCH update, DELETE | |
| **Loop Tasks** | GET task lists + items | **NONE** | **Read-only. No create/update/delete of tasks** |
| Loop Activities | GET list | — | Activity log |
| Contacts | GET list/one | POST, PATCH, DELETE | |
| **Loop Templates** | GET list/one (`template:read`) | **NONE** | Read-only |
| Loop-It™ Facade | — | POST — create a loop + property + participants + template in one call | |
| Webhook Subscriptions | GET list/one | POST, PATCH | HMAC signature via `X-DOTLOOP-SIGNATURE`, `X-DOTLOOP-TIMESTAMP` |
| Webhook Events | GET list/one | — | Retained 90 days |

### THE HARD LIMIT: you cannot get documents out

`GET /profile/:pid/loop/:lid/folder/:fid/document/:did` returns **metadata only**:

```
{ "data": { "id": 561621, "name": "disclosures.pdf",
            "created": "2017-05-17T01:18:37Z", "updated": "2017-05-17T01:18:37Z" } }
```

There is **no documented endpoint that returns document content/bytes**. The only binary
operation documented is **upload** (`POST ... /document/`, `multipart/form-data`,
`Content-Type: application/pdf`). Verified by full-text search of the developer guide for
`application/pdf` — the only hits are in the **upload** section.

**Consequence:** the Dotloop API is a **write-in, metadata-out** interface. You can push a
prepared PDF *into* a loop. You cannot pull the executed contract *out*.

### E-signature: NOT available via the API

There is **no signature, signing-request, or e-sign-status endpoint** in Public API v2.
Full-text search for "signature" returns only webhook HMAC signing (`X-DOTLOOP-SIGNATURE`)
and the `signingKey` used to sign webhook payloads. **The meeting's "route it for e-signing"
flow cannot be executed through the Dotloop API.** Signature ceremonies happen in Dotloop's
own UI only.

### Webhooks: no document, no task, no signature events

Available event types (verified):

- **User-targeted:** `CONTACT_CREATED`, `CONTACT_UPDATED`, `CONTACT_DELETED`,
  `PROFILE_UPDATED`, `USER_PROFILE_ACTIVATED`, `USER_PROFILE_DEACTIVATED`,
  `USER_ADDED_TO_PROFILE`, `USER_REMOVED_FROM_PROFILE`
- **Profile-targeted:** `LOOP_CREATED`, `LOOP_UPDATED`, `LOOP_MERGED`,
  `LOOP_PARTICIPANT_CREATED`, `LOOP_PARTICIPANT_UPDATED`, `LOOP_PARTICIPANT_DELETED`
- **Subscription lifecycle:** `SUBSCRIPTION_REMOVED`, `SUBSCRIPTION_DISABLED`

**There is no `DOCUMENT_*`, no `TASK_*`, and no signature/e-sign event.** Delivery is
at-least-once, 5-second timeout, retry backoff 30s/1m/15m/30m/1hr/2hr/4hr/8hr.
Webhooks are labelled **"Initial Release"** — treat as immature.

**Consequence:** RCRE cannot be notified that a document was signed, that a compliance task
was completed, or that a file was uploaded. Any "transaction status" feature built on
Dotloop webhooks would be limited to loop-level status field changes.

### What Dotloop the *product* actually does — correcting the meeting record

**[FLAG — contradicts a meeting statement.]** Asked "is dotloop more than e-signing?", both
Julio and Taquilla said **"no, not really."** Dotloop's own current pricing page contradicts
this. Verified feature list (retrieved 2026-08-26, <https://www.dotloop.com/products/plans-pricing/>):

- Premium (Agents) **$34.99/month**: Robust Document Editor · Secure and Legal eSignatures ·
  **MLS and Association Feeds** · Audit Trail · Secured Backup · SMS Texting Communications ·
  In-Person Signing · Document Scanner · Easy-Offer Links · **Document Templates** ·
  **Task Templates** · **Clause Manager** · Online Faxing
- Teams / **Business+ (Brokers)** — custom quote: adds **Charts and Reporting**,
  **Automated Compliance Workflows**, **Multi-Office Compliance**, **Transaction Templates**,
  Custom Branding, Full Visibility into Transactions, Dedicated Success Manager

Dotloop markets itself as replacing "your form creation, e-sign, and transaction management
systems."

**Reading:** RCRE leadership is describing *how RCRE uses Dotloop today* (as an e-sign tool),
not what the product is. This is a **real opportunity that requires no API and no AI**: RCRE
is likely paying for Business+ compliance workflow, task templates, clause manager and
broker reporting it is not using. **This should be verified with Julio before V2 designs any
replacement for it.**

**Pricing sanity check on Julio's "five something a month":** ~13 agents × $34.99 ≈ **$455/mo**;
banner price $29/user/mo × 13 ≈ $377/mo. Julio's ~$500/mo is **plausible and consistent**.
Business+ is custom-quoted, so the exact figure is unverifiable from public sources.

---

## 3. THE CRITICAL QUESTION — the AI/ML prohibition

### VERDICT: THE PROHIBITION IS REAL, IT IS CURRENT, AND IT IS BROAD.

**Document:** Dotloop API Terms of Use
**Contracting entity:** ShowingTime Plus, LLC ("ST+", "Dotloop")
**Effective date printed on the document: MAY 13, 2025**
**Source URL:** <https://www.dotloop.com/api-license-agreement/>
**Retrieved:** 2026-08-26

> *Retrieval note: the page returns HTTP 403 to `curl` and to WebFetch (bot protection). It was
> retrieved successfully with a real browser engine. Anyone re-verifying this must use a browser.*

### Clause 2(k) — VERBATIM

> **"(k) You may not use the Dotloop Data for research purposes, product development or
> improvement, or in connection with any type of artificial intelligence, machine learning, or
> similar technology, whether for model development/training or for any other purpose. For the
> avoidance of doubt, any approval by Dotloop with respect to your Dotloop API registration
> (including your proposed use case with respect to Dotloop Data) will in no way limit the
> prohibition set forth in the preceding sentence."**

### Why this is worse than a normal training ban

Three features make 2(k) unusually hard:

1. **"or for any other purpose"** — this is an explicit extension past model training. It
   reaches **inference**. Sending a loop's data to any LLM to summarise, classify, extract, or
   draft is squarely within the prohibited zone. There is no "we only use it at runtime,
   we don't train on it" defence.
2. **"or similar technology"** — deliberately open-ended. Rules engines are probably fine;
   anything model-based is not.
3. **"any approval ... will in no way limit the prohibition"** — you **cannot negotiate around
   it via the registration process.** Getting your AI use case "approved" does not help. This
   sentence exists specifically to defeat that argument.

### Supporting clauses that independently block an AI layer

The same document, same date, same section:

> "(g) You may not retain copies of Dotloop Data beyond what is necessary to operate your
> integration in accordance with these Dotloop API Terms of Use and applicable law. ... You
> will delete any and all Dotloop Data stored within your Approved Site(s) and system(s) after
> you have made the same available to the applicable Client(s)..."

> "(j) You may not extract and provide to third parties, or otherwise use or share with third
> parties other than the applicable Dotloop Subscriber(s) and/or Client(s), any datapoints
> included in the Dotloop Data for any purpose whatsoever, including, without limitation, for
> purposes of enhancing third parties' data files."

> "(m) You may not use the Dotloop APIs or Dotloop Data for competitive analysis or benchmarking."

> "(s) You may not combine or integrate the Dotloop APIs or the Dotloop Data with any software,
> technology, services, or materials that are not expressly identified by you and approved by
> Dotloop in your Dotloop API registration."

> "(i) You may not use the Dotloop Data to develop direct marketing or telemarketing lists for
> the benefit or use of anyone."

> "(l) You may not use the Dotloop APIs or Dotloop Data to develop or offer products or services
> not intended for use by Dotloop Subscribers and/or Clients, as the case may be."

> "(d) You may not implement the Dotloop APIs or distribute the Dotloop Data on an Approved Site
> such that the Dotloop APIs are the primary functionality on the Approved Site and/or the
> Dotloop Data makes up the majority of the content on the Approved Site."

Additional teeth:

- **§13 Audit** — Dotloop may require a Dotloop-approved third-party auditor to **audit your
  systems and facilities**; you pay if non-compliance is found.
- **§11 Termination** — termination at any time, for any reason, without notice; on termination
  you must **delete all Dotloop Data** in your possession.
- **§3 Acceptable Use** — you may not use the APIs or Data in any way that "harms, or competes
  with, Dotloop, its affiliates, its service providers, its or your customers, or any other
  person, **in Dotloop's sole discretion**." Dotloop's affiliates include **Follow Up Boss**.
- **§6(h)** — no "unauthorized scripting or automation tools, robots, 'scraping' tools."
- **§9(a)** — "The Dotloop APIs are the property of **MFTB HoldCo Inc.**"; Dotloop Data is the
  property of the Subscriber / Clients / licensors.
- **§10 Changes** — Dotloop may change these terms "at any time and without notice to or
  approval from you."
- **§12** — Washington law, exclusive venue King County, WA; prevailing party gets fees.

### CRITICAL: Dotloop has NO customer-own-data carve-out — Follow Up Boss DOES

I searched the full current Dotloop API Terms of Use text for `own data`, `Notwithstanding`,
`remain the owner`, `do not apply`. **Zero hits.** There is no clause exempting a Dotloop
Subscriber's use of its own data from the restrictions.

Now compare **Follow Up Boss API Terms of Use**
(<https://docs.followupboss.com/reference/fub-api-tou>, retrieved 2026-08-26), preamble — VERBATIM:

> **"Notwithstanding the foregoing or anything to the contrary contained herein, FUB customers
> remain the owner of all business information and data uploaded to our service as set forth in
> our Terms of Service and Privacy Policy and the data use restrictions herein do not apply to a
> FUB customer's use of their own data."**

And the FUB AI clause, restriction (l) — VERBATIM:

> **"l. You may not use the FUB Data for research purposes, product development or improvement,
> or in connection with any type of Artificial Intelligence or Machine Learning model development
> or training."**

**Two differences, both decisive:**

| | Dotloop 2(k) | FUB (l) |
|---|---|---|
| Scope of AI ban | training **"or for any other purpose"** — reaches inference | **"model development or training"** only — silent on inference |
| Own-data carve-out | **absent** | **present and explicit** |
| Approval can cure it | **explicitly no** | not addressed |

**Therefore:**
- **RCRE, as a Dotloop Subscriber, using its own loop data through the Dotloop API for AI —
  is prohibited.** The restriction attaches to Dotloop Data obtained via the API regardless
  of whose data it is.
- **RCRE, as a FUB customer, using its own FUB data — including with AI — is exempt from the
  FUB API restrictions**, by the express carve-out. **This validates ADR-0012.**

> **[NOT LEGAL ADVICE — REQUIRES COUNSEL]** This is a documents-and-clauses reading, not a legal
> opinion. Two points genuinely need a lawyer before V2 relies on them:
> (a) whether FUB's own-data carve-out survives when RCRE builds a *product* on top of it and
> (b) whether "AI/ML model development or training" in FUB (l) truly leaves inference untouched.
> RCRE leadership and their counsel make the final call.

### Also checked: the subscriber-side terms have NO AI prohibition

**Document:** ShowingTime+ Terms of Use, **Effective Date: August 11, 2025**, incorporating the
**Dotloop Product Terms**. Source: `https://showingtimeplus.com/terms-of-use`
(redirects to `https://zillow-workspace.com/terms-of-use`, titled "Terms of Use | Zillow Pro").
Retrieved 2026-08-26.

Full-text search for `artificial intelligence`, `machine learning`, `generative`,
`large language`: **zero hits.** The subscriber-facing terms **do not prohibit AI use.**

Relevant subscriber-side clauses instead:

> "Ownership of UGC. **You retain all right, title, and interest to UGC.** ... For the purposes
> of clarity, ShowingTime+ owns all right, title, and interest in and to any anonymized and/or
> de-identified compilation, aggregation, derivative work, or collective work created **by
> ShowingTime+** using or incorporating UGC ('Summary Data')."

> "Subject to the restrictions set forth in these Terms of Use and any Product Terms, you may
> copy information from the Services **without the aid of any automated processes** and only as
> necessary for your personal use or Pro Use to view, save, print, and/or communicate such
> information."

> "BY USING THE SERVICES, YOU AGREE NOT TO: ... **conduct automated queries (including screen and
> database scraping, spiders, robots, crawlers, bypassing 'captcha' or similar precautions, or
> any other automated activity with the purpose of obtaining information from the Services)**...
> access or use any of the Services to develop competitive products or services"

> "use the Services in any way to discriminate against any individual or class of individuals
> protected under federal, state, or local laws, or which may have a discriminatory impact..."

> "...may not be used to post, display, communicate, or otherwise make accessible to any third
> party ... a seller's or listing agent's offer of buyer agent compensation..." *(post-NAR-settlement)*

> "Your Compliance with Applicable Law, Regulation, and MLS and Association Rules."

**This is the seam that makes a compliant boundary possible**, and also the reason
**browser automation of Dotloop is off the table**:

- RCRE **owns its UGC** — the documents its agents and clients created and uploaded.
- A **human** may "view, save, print" that UGC out of Dotloop.
- **No automated process, scraper, robot or crawler may.** The Hermes integration
  architecture's "browser (rank 4) read-only" fallback for transaction management
  (`01-research/hermes/HERMES-INTEGRATION-ARCHITECTURE.md:105`) is **prohibited and must be
  struck.**

---

## 4. Dotloop ↔ Zillow ↔ Follow Up Boss

| Fact | Verified? |
|---|---|
| Dotloop is contracted through **ShowingTime Plus, LLC** | Yes — named as contracting party in both agreements |
| The **Dotloop APIs are the property of MFTB HoldCo Inc.** | Yes — §9(a), verbatim |
| ShowingTime+, dotloop and Follow Up Boss marks are owned by **MFTB HoldCo, Inc., a Zillow affiliate** | Yes — Zillow Group / FUB press materials |
| Zillow Group announced acquisition of Follow Up Boss **Nov 1, 2023** | Yes — Zillow Group investor release |
| ShowingTime+ ToU covers "dotloop, ShowingTime, and **Zillow Pro** platform" collectively | Yes — ToU opening paragraph |
| ShowingTime+ web properties now redirect to **zillow-workspace.com** / "Zillow Pro" | Yes — observed 2026-08-26 |
| Zillow **requires** Dotloop | **NO — Julio says "not so much requires but highly encourages."** Consistent with everything found; no public requirement located |

**Bundling implication.** Taquilla's read in the meeting — "all of that stuff like dot loop,
follow-up boss, all that's going to be tied into Zillow like a package" — is **directionally
correct and is now a strategic risk, not just a billing observation.** RCRE's CRM (FUB), its
transaction/e-sign platform (Dotloop), and its lead source (Zillow Premier Agent) are all
under one corporate parent that is actively consolidating them into a "Zillow Pro" workspace.

**Three concrete consequences for V2:**

1. **Concentration risk.** ADR-0012 already bets the CRM on a Zillow property. Adding Dotloop
   as a second Zillow dependency doubles the exposure to a single vendor's roadmap, pricing,
   and terms — terms which **§10 lets them change without notice.**
2. **The "competes with" clause is a live risk.** Dotloop §3 bars use that "competes with
   Dotloop, **its affiliates**... in Dotloop's sole discretion." An RCRE-branded "AI-powered
   real estate business operating system" arguably competes with the Zillow Pro workspace.
   This is a reason to keep RCRE's transaction surface **independent of Dotloop's API**, not
   built on it.
3. **Consolidation cuts both ways.** If Zillow ships a first-party Dotloop↔FUB link, RCRE gets
   it free and should not have built it. If Zillow tightens API access, an RCRE build breaks.
   Either way, **building the connector is the losing move.**

---

## 5. E-signature alternatives usable with AI-assisted preparation

Two separate questions: (a) do the vendor's terms permit AI-assisted document preparation, and
(b) is the resulting signature legally effective for real estate in AL and FL.

### On (b): the legal floor

Electronic signatures are valid for real estate contracts in both states under the federal
**ESIGN Act** and each state's adoption of **UETA**. What makes an e-signature defensible in
practice is **the audit trail** — signer identity, IP, timestamps, document hash, consent to
do business electronically — not the cryptography. Every option below produces one.
**[Unverified detail: I did not re-verify AL's and FL's specific UETA adoption statutes in this
pass. Treat as well-established but confirm with counsel before relying on it in writing.]**

### Options

| Option | Terms posture for AI-assisted prep | Notes |
|---|---|---|
| **Form Simplicity + Sabal Sign** (Florida Realtors) | **Not verified — must be read** | **Strongest FL candidate.** Owned/operated by Florida Realtors; free/included with FL Realtors membership. Sabal Sign is Florida Realtors' own built-in e-sign, unlimited signing sessions, replacing the prior eSign. **Has a public API** (`formsapidev.floridarealtors.org`). Native FR/BAR forms. **RCRE's Florida agents may already have this at no additional cost.** |
| **DocuSign eSignature API** | **Not verified — must be read** | Industry default. Developer sandbox free; production API plans publicly listed from ~$50/mo (40 envelopes) to ~$480/yr per user tiers — **volume-metered, verify against RCRE's real transaction count.** Mature audit trail, well-understood by title/lenders. |
| **Dropbox Sign (HelloSign) API** | **Not verified** | Cheaper per-envelope than DocuSign historically; good API. Not researched in depth this pass. |
| **Documenso** (open source) | AGPL-3.0 — you control the terms | TypeScript stack, self-hostable, cloud from ~$30/mo. Self-hosting means **no third-party data-use restriction at all** — RCRE's data never leaves RCRE. |
| **DocuSeal** (open source) | Open source, self-host or cloud | Templates, audit trails, API, webhooks. Marketed as HIPAA/GDPR/SOC 2 aligned on the cloud product. |
| **OpenSign** (open source) | Open source | Multi-party signing, audit logs, API, webhooks. Less mature. |
| **Authentisign** (Lone Wolf) | Not researched | Common in real estate; bundled with some association memberships. |

**Design consequence of ADR-0011 (provider-agnostic AI):** self-hosting the e-signature layer
(Documenso / DocuSeal) is unusually attractive here, because it is the **only** option where
RCRE holds the entire document lifecycle and no vendor's terms can later be amended to prohibit
what RCRE built.

### Real-estate-specific constraints that bind regardless of vendor

1. **State/association forms are licensed, not free.**
   - **Florida:** FR/BAR contracts are produced by a joint committee of **Florida Realtors and
     The Florida Bar**. Current revision dates are at 7/2026. They are copyrighted and
     distributed to members through licensed platforms. **RCRE may not reproduce, re-key, or
     have an AI regenerate these forms** — AI may only **fill fields in** and **explain** an
     authorised copy.
   - **Alabama:** the **2026 Alabama REALTORS® Statewide Legal Forms** library is a member
     benefit under a **forms subscription**, valid for use until **March 31, 2027**. Same rule:
     fill, don't regenerate. **Version currency is a compliance duty** — an AI that fills a
     superseded form creates liability.
2. **Broker record retention.**
   - **Florida:** **five years**. Fla. Admin. Code **61J2-14.012** with Fla. Stat. **§475.5015**.
     Electronic copies are acceptable; records may be held off-site but must be readily available
     to DBPR on audit. **Litigated records: retained at least two years after litigation concludes.**
   - **Alabama:** **three years** for "all contracts, leases, listings and other records pertinent
     to real estate transactions," per **Ala. Code §34-27-36(a)(31)** and AREC rules
     (**790-X-3-.04** cited for the estimated closing statement). Both **executed and failed**
     transaction records must be retained. A 2025 AREC rule change permits **virtual** rather
     than physical retention at the place of business.
     **[Partially verified — the three-year figure and the citations came from secondary sources.
     Confirm against the AREC administrative code before it goes into a policy document.]**
   - **Design consequence:** whichever platform holds executed documents, **RCRE must be able to
     produce a complete transaction file on demand for 5 years (FL) / 3 years (AL).** Dotloop
     restriction 2(g) — *delete Dotloop Data after delivery* — is **directly in tension with a
     broker's retention duty** if RCRE's system were the retention store. Another reason the
     retention store must be RCRE's own, sourced independently of the Dotloop API.
3. **Human approval for legally consequential documents.** Already a standing RCRE rule; it is
   also the practical answer to unauthorised-practice-of-law exposure. AI drafts; a licensed
   human — the agent, the qualifying broker, or Margie as FL transaction coordinator — reviews
   and sends.
4. **Fair housing.** Per GOVERNANCE §5 and echoed by ShowingTime+'s own anti-discrimination
   clause. Applies to any AI-generated text touching a transaction.
5. **Buyer-agent compensation.** ShowingTime+ ToU expressly bars publishing offers of buyer
   agent compensation through the Services. Any RCRE-generated marketing must respect the same
   post-settlement rule.

---

## 6. THE COMPLIANT INTEGRATION BOUNDARY

### The principle

> **The prohibition attaches to the pipe, not to the facts.**
> "Dotloop Data" is defined as data obtained **through the Dotloop APIs**. It is the *acquisition
> path* that carries clause 2(k). The same fact — a closing date, an address, a client name —
> is unrestricted when RCRE holds it because RCRE originated it or received it through a
> different, permitted channel.

Therefore the boundary is: **RCRE never becomes a Dotloop API licensee.** With no API license,
there is no Dotloop Data, and clause 2(k) never attaches to anything in the RCRE system.

### Three data classes

**CLASS A — RCRE-ORIGINATED. AI PERMITTED.**
Data RCRE creates, holds, and owns independently of Dotloop.
- Transaction records RCRE's own agents enter into the RCRE platform
- Follow Up Boss data (own-data carve-out — ADR-0012 path, `POST /v1/events`)
- Documents RCRE's agents author, and completed association forms RCRE fills under its own
  forms subscription
- E-signature envelopes and audit trails from RCRE's own e-sign provider
- Coaching notes, pipeline stages, accountability policy, recruiting records
- MLS/IDX data **subject to its own separate MLS licence terms — not covered by this document**

**CLASS B — DOTLOOP-HELD. HUMAN-ONLY. NEVER TOUCHES AI.**
Anything inside Dotloop.
- Loops, participants, loop status, tasks, activity log, templates, clause manager content
- Executed documents stored in Dotloop
- Anything a Dotloop webhook or endpoint would return

**CLASS C — THE CROSSING POINT. ONE DIRECTION ONLY.**
A finished, human-approved PDF, and its transaction identifiers, moving **RCRE → Dotloop**,
placed by a human through the Dotloop UI.

### What may cross which line — concrete

| Movement | Verdict | Why |
|---|---|---|
| RCRE-prepared PDF → **human uploads** into Dotloop via the UI | **PERMITTED** | RCRE's own UGC; no API; §5.x ToU permits Pro Use |
| Human reads a loop status in Dotloop → **types** it into RCRE | **PERMITTED** | Human observation; not automated extraction; the resulting RCRE record is Class A |
| RCRE AI drafts a purchase contract from **Class A data + RCRE's licensed form**, human reviews, human sends for signature via **RCRE's own e-sign provider** | **PERMITTED** | No Dotloop involvement anywhere in the chain |
| Fully executed envelope from RCRE's e-sign provider → **human files** the PDF into the Dotloop loop | **PERMITTED** | Class C crossing, human-operated |
| Dotloop API → RCRE database | **PROHIBITED (by design)** — do not build | Creates Dotloop Data; triggers 2(k), 2(g), 2(s) |
| Dotloop data → **any** LLM (OpenRouter, DeepSeek, MiniMax, an agent's own ChatGPT) | **PROHIBITED** | 2(k) "any other purpose"; also 2(j) third-party disclosure |
| Dotloop data → Hermes memory or an embedding index | **PROHIBITED** | 2(k); also RCRE's own no-PII-in-Hermes rule |
| Dotloop webhooks → RCRE | **PROHIBITED (by design)** | Requires the API licence; and delivers nothing useful anyway (no doc/task/sign events) |
| Browser automation / scraping of the Dotloop UI | **PROHIBITED** | ShowingTime+ ToU bars automated queries, scraping, robots, crawlers |
| Agent performance benchmarking from Dotloop data | **PROHIBITED** | 2(m) benchmarking; 2(k) if any model touches it |
| Past-client marketing lists built from closed loops | **PROHIBITED** | 2(i) direct marketing/telemarketing lists |
| Screenshot of a Dotloop screen pasted into an AI chat by an agent | **PROHIBITED — and this is the realistic leak.** Needs a written policy and agent training, not just a technical control |

### How RCRE gets the outcome it actually wanted

The meeting wanted: *fill an FHA case number request / initial CD / purchase contract,
route it for e-signing, keep the TC in the loop.* That is achievable **without Dotloop's API**:

1. **RCRE platform** holds the transaction (Class A), sourced from FUB + agent input.
2. **RCRE AI** (provider-agnostic per ADR-0011) drafts and field-fills using **Class A data only**
   and RCRE's **licensed association forms**.
3. **Human approval gate** — the agent, and for legally consequential documents the qualifying
   broker (Julio) or Margie for Florida. Enforced technically, not by prompt.
4. **RCRE's own e-signature provider** runs the ceremony and produces the audit trail.
5. **Human files the executed PDF into Dotloop.** Optionally the compliance copy also lands in
   RCRE's own retention store, satisfying FL 5-year / AL 3-year duties independently.

Dotloop remains what leadership already treats it as: the place executed paper goes to live.
**RCRE never signs the Dotloop API agreement, so clause 2(k) never binds RCRE at all.**

### Export/jurisdiction note relevant to ADR-0011

Dotloop §14: "You agree not to export from anywhere any part of the Dotloop APIs or Dotloop Data
or any direct product thereof except in compliance with... applicable export laws." The
superseded 2022 agreement was blunter: "You shall not... make the API accessible from, any other
country or any location outside the United States."

**This matters beyond Dotloop.** ADR-0011's model routing (OpenRouter, DeepSeek, MiniMax) means
inference may execute **outside the United States**. That is a **separate, standing design
question for any regulated RCRE data** — client PII, transaction detail, financial figures —
regardless of Dotloop. **Flagging for the coordinator as a V2 issue in its own right.**

---

## 7. DO NOT DO THIS LIST

1. **Do not apply for Dotloop API access.** Signing that agreement imports clause 2(k), the
   §13 third-party systems audit right, and the §11 delete-on-termination duty into RCRE's
   stack — for an API that cannot return a document, cannot report a signature, and cannot
   write a task.
2. **Do not send any Dotloop-sourced data to any model.** Not OpenRouter, not DeepSeek, not
   MiniMax, not an agent's own ChatGPT subscription, not a local model. 2(k) says "any other
   purpose," and 2(j) independently bars third-party disclosure.
3. **Do not put Dotloop data into Hermes memory, a vector index, or an embedding store.**
4. **Do not build browser automation, scraping, or an RPA fallback against the Dotloop UI.**
   Strike the "browser (rank 4) read-only" fallback for transaction management in
   `01-research/hermes/HERMES-INTEGRATION-ARCHITECTURE.md:105`.
5. **Do not build agent leaderboards, benchmarks, or brokerage analytics on Dotloop data** —
   2(m) plus 2(k).
6. **Do not build past-client or sphere marketing lists from Dotloop loops** — 2(i).
7. **Do not cache or persist Dotloop data anywhere in RCRE**, even transiently — 2(g) requires
   deletion after delivery, which is incompatible with a reporting layer *and* with broker
   retention duties.
8. **Do not assume registration approval fixes this.** 2(k)'s second sentence exists to defeat
   exactly that argument. Do not spend a call with Dotloop's partner team trying.
9. **Do not have AI regenerate FR/BAR or Alabama Association forms.** Fill authorised, current
   copies; never reproduce the form itself. Track version currency (AL forms expire 2027-03-31).
10. **Do not let AI send a legally consequential document without a named human approver.**
11. **Do not tell RCRE that Dotloop "only does e-signing."** It does form creation, templates,
    clause management, compliance workflow, MLS/association feeds and broker reporting. Verify
    what RCRE's plan includes before designing anything that duplicates it.
12. **Do not state the Dotloop API is free.** The current agreement is silent on fees.
13. **Do not present any of this as legal advice.** It is a clause reading. Counsel decides.

---

## 8. What I could NOT verify — flagged honestly

| Item | Status |
|---|---|
| Whether the Dotloop API costs money today | **Unverified.** Current agreement has no fees section; the superseded 2022 one said no fees |
| Whether Dotloop is currently accepting new API partner registrations | **Unverified.** Developer Center page is stale (footer says 2016) |
| Approval criteria / timeline for API registration | **Unverified.** "Sole discretion," nothing published |
| RCRE's actual Dotloop plan (Premium vs Teams vs Business+) and true monthly cost | **Unknown — ask Julio.** Determines whether compliance workflow and broker reporting are already paid for |
| Whether Dotloop's Terms have changed since 2025-05-13 | Page as retrieved 2026-08-26 shows Effective Date May 13, 2025. §10 permits change without notice — **re-verify before any decision is finalised** |
| DocuSign / Dropbox Sign / Form Simplicity terms on AI-assisted preparation | **Not read.** Must be read clause-by-clause before selecting a provider — assume nothing |
| AL and FL UETA adoption specifics | Not re-verified this pass |
| Alabama 3-year retention figure and exact AREC rule cite | **Partially verified** via secondary sources; confirm against AREC administrative code |
| Whether FUB's own-data carve-out survives RCRE productising on top of it | **Legal question. Needs counsel.** |
| Whether FUB (l)'s "model development or training" truly leaves inference permitted | **Legal question. Needs counsel.** |

---

## 9. Sources (all retrieved 2026-08-26)

- Dotloop API Terms of Use — <https://www.dotloop.com/api-license-agreement/> (Effective May 13, 2025; 403s to non-browser clients)
- Dotloop Public API v2 Developer Guide — <https://dotloop.github.io/public-api/>
- Dotloop Developer Center — <https://info.dotloop.com/developers>
- Dotloop Plans & Pricing — <https://www.dotloop.com/products/plans-pricing/>
- ShowingTime+ Terms of Use incl. Dotloop Product Terms — <https://showingtimeplus.com/terms-of-use> → <https://zillow-workspace.com/terms-of-use> (Effective Aug 11, 2025)
- Follow Up Boss API Terms of Use — <https://docs.followupboss.com/reference/fub-api-tou>
- Zillow Group / Follow Up Boss acquisition — <https://investors.zillowgroup.com/news-and-events/news/news-details/2023/Zillow-Group-to-acquire-Follow-Up-Boss-an-industry-leader-in-customer-relationship-management/default.aspx>
- Fla. Admin. Code 61J2-14.012 Broker's Records — <https://flrules.org/gateway/RuleNo.asp?ID=61J2-14.012>
- Florida Realtors, broker business/records — <https://www.floridarealtors.org/law-ethics/library/broker-business>
- Florida Realtors Form Simplicity — <https://www.floridarealtors.org/tools-research/form-simplicity>
- Alabama Association of REALTORS Statewide Legal Forms — <https://www.alabamarealtors.com/statewide-legal-forms>
- AREC Administrative Code Chapter 790-X-3 — <https://admincode.legislature.state.al.us/administrative-code/790-X-3-.14>
- Superseded Dotloop API License Agreement (Effective Aug 29, 2022) via Internet Archive snapshot 2024-06-24 — used only to show the AI clause is a *later* addition
