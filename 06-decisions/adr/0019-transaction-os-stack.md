# ADR-0019 — Transaction OS: RCRE + Stirling PDF + Documenso. Dotloop removed.

**Status:** **APPROVED** — 2026-08-26 by Jeremy McDonald
**Date:** 2026-08-26
**Decision owner:** Jeremy McDonald
**Closes:** the Dotloop integration question raised by Julio Arango at meeting timestamp 00:30:47

## Context

Julio asked whether RCRE's document automation would integrate with Dotloop, which RCRE pays for and
which Zillow encourages. Research (`99-scratch/v2-research/dotloop.md`, verified independently)
returned two findings, either of which alone is decisive.

**First, the AI prohibition.** Dotloop's API Terms of Use, clause 2(k), effective 2025-05-13,
prohibit using Dotloop Data *"in connection with any type of artificial intelligence, machine
learning, or similar technology, whether for model development/training **or for any other
purpose**."* The final phrase reaches **inference**, not merely training. There is no own-data
carve-out, and the terms state that Dotloop's approval of an API registration does not limit the
prohibition.

The contrast with Follow Up Boss — the same corporate parent — is instructive and worth recording:
FUB's terms state customers *"remain the owner of all business information and data uploaded to our
service … and the data use restrictions herein do not apply to a FUB customer's use of their own
data"*, and its AI clause covers only *"model development or training"*. That asymmetry is what
simultaneously **validates ADR-0012** and **closes Dotloop**.

**Second, capability.** Our research also concluded the Dotloop API cannot perform the workflow the
meeting imagined. Those endpoint-level claims are being reconciled against primary documentation
before they are recorded as fact anywhere. **This ADR does not rest on them.** The AI restriction
alone is sufficient, and it is the stated basis for this decision.

## Decision

**Dotloop is removed from the target architecture. RCRE will not build an AI-over-Dotloop workflow.**

The target Transaction OS is:

```
RCRE Transaction OS   — RCRE-owned transaction data, deadlines, checklists, approvals, audit
    +  Stirling PDF   — self-hosted document processing (form fill, merge, split, OCR, redact, flatten)
    +  Documenso      — self-hosted e-signature, accessed as an independent service via its API
    +  RCRE AI / Hermes — extract · summarise · draft · prepare · explain · recommend
```

**Constraints that come with it:**

- **Documenso owns signing.** Stirling is not an e-signature engine and must never be used as one.
- **Documenso is an independent service reached over its API.** It is not forked into RCRE. Its
  AGPL-3.0 licence and the implications for any future commercial packaging of RCRE (ADR-0013) are
  recorded and flagged for legal review before resale, not before local use.
- **Transaction data is RCRE-owned.** Dotloop is treated as a terminal, human-operated record: a
  person may file an executed document there. Nothing retrieved from Dotloop enters an AI path.
- **AI may** extract, summarise, draft, prepare, explain and recommend. **AI may not** make legal
  decisions, execute contracts, invent contract language, or send legally consequential material
  without the required human approval.
- The deadline engine is **deterministic**. Contractual dates are computed from rules, never inferred.

## Alternatives considered

**Integrate Dotloop deterministically, keeping AI away from Dotloop Data.** Genuinely considered, and
it was the recommendation in an earlier draft. Rejected because the boundary is unenforceable in
practice at our scale: once Dotloop Data is inside RCRE, keeping it out of every AI path forever —
including a coaching summary, a search index, or an assistant answering "what's outstanding on this
file" — depends on every future engineer remembering a rule. A capability that must never be used is
better not acquired. RCRE also has no need for it: RCRE owns the transaction record.

**Keep Dotloop as the e-signature provider with no API integration.** This is effectively what
happens. RCRE does not integrate; RCRE staff may continue using Dotloop as they do today. RCRE's own
signing flow runs through Documenso.

**A commercial e-signature vendor (DocuSign, Dropbox Sign).** Not rejected on merit — deferred.
Documenso self-hosted keeps client documents on infrastructure RCRE controls and has no per-envelope
cost, which matters at a brokerage's margins. Revisit if self-hosted signing certificates prove
operationally unreasonable.

## Consequences

**Easy:** no third-party terms constrain what RCRE AI may do with RCRE's own transaction documents.
The compliance boundary is *ownership*, which is checkable, rather than *provenance*, which is not.

**Hard:** RCRE now self-hosts two services. Documenso needs Postgres, storage, SMTP and a real
signing certificate; Stirling needs dependencies for OCR and conversion. That is operational surface
RCRE did not previously have, and it lands on a brokerage with no IT function.

**Accepted cost:** RCRE may continue paying for Dotloop while using Documenso — duplicated spend
until leadership decides otherwise. That is their call, not an engineering one.

**Legal review required before any commercial packaging:** Documenso's AGPL-3.0 network-use
provisions. Local use by RCRE is not the concern; resale to other brokerages is.

## Addendum — 2026-08-26, after reading both projects' source and licences

Research went to primary sources rather than documentation. Three findings change how this stack is
deployed, though none changes the decision.

### Stirling PDF is open-core, not MIT — and the default image is the licensed flavour

The root LICENSE is MIT but **carves out ten directories; roughly 38% of files sit under a bespoke
"Stirling PDF User License"** that states *"Production use … is only permitted with a valid Stirling
PDF User License"*, with unpaid use limited to *"internal trial, evaluation, or minimal use"*. The
default Docker image builds `STIRLING_FLAVOR=proprietary` and enforces a **5-user cap**.

What is in the licensed portion matters: **accounts, SSO, audit logging, the automation/policy
engine, the MCP server, and API-key authentication.** What is in MIT core: the ~60 PDF tools —
**including the entire form-filling API**, which is the capability RCRE actually needs.

Two consequences follow, and the second is the one that bites:

1. **Drive Stirling over REST, never MCP.** The MCP server is real and well-built, and it is
   proprietary. This confirms and sharpens the earlier note.
2. **An MIT-only build (`STIRLING_FLAVOR=core`) has no authentication at all** — API keys live in the
   licensed module. Worse, with `security.enableLogin: false` the auth filter passes every request
   through unchecked; the key is not optional, it is not read.

**Therefore: run Stirling core-flavour on a private network, reachable only by the RCRE backend, never
exposed to a browser or the internet.** Isolation is what supplies the authentication the MIT build
does not have. That posture also resolves the licence question — no licensed component is deployed.

Also to configure, both verified as unsafe defaults: `corsAllowedOrigins: []` falls back to allowing
**all** origins with credentials, and PostHog and Scarf telemetry are enabled unless explicitly
switched off. Air-gapped operation is explicitly supported.

**Form filling is confirmed real and released** — `POST /api/v1/form/fields` returns per-field
metadata, `POST /api/v1/form/fill` takes a field→value map with an optional `flatten`, backed by
PDFBox. Shipped v2.5.0 (Feb 2026). **AcroForm only — XFA forms will not fill**, which matters because
some association forms are XFA. The published OpenAPI spec is stale and omits the form API entirely;
generate clients from the instance's own `/v1/api-docs`.

The conversion endpoints (`html/pdf`, `markdown/pdf`, `file/pdf`, `url/pdf`) are the recurring
SSRF/path-traversal surface across 12 published advisories. RCRE needs form fill, merge, split and
flatten — all pure PDFBox with no outbound fetch — so the convert group should be removed via
`ENDPOINTS_GROUPS_TO_REMOVE`.

### Documenso — build against `/envelope/*`; the legacy surface is already deprecated

The live OpenAPI spec was parsed rather than trusted: **52 of 89 operations carry `deprecated: true`**,
and they are exactly the legacy `/document/*` and `/template/*` families. The 37 active operations are
`/envelope/*` plus folders and embedding. Jeremy's instruction to use the Envelope architecture is
confirmed correct. **No sunset date is published**, and self-hosting means RCRE controls its own
upgrade cadence.

Note the specific trap: **`POST /template/use` is deprecated** and is what most tutorials still show
for "create a document from a template with prefilled values". Its replacement is `POST /envelope/use`.

**Completed-PDF retrieval is clean** — `GET /envelope/item/{id}/download` returns
`Content-Type: application/pdf` and defaults to the signed version with the audit trail. That is the
strongest technical reason this architecture works.

**Signing certificates are the operational risk.** Documenso ships none and signing fails without
one; a self-signed certificate causes recipients to see *"signature cannot be verified"*. In real
estate the counterparty is routinely a title company or lender, so that is a business problem rather
than a cosmetic one. **Plan on a CA-issued certificate for production**, and never generate the key
inside the container — losing it invalidates every previously signed document.

**Never use documenso.com cloud, not even for a pilot.** Its ToS §4.2 grants Documenso a
*"perpetual, transferable, sublicensable"* licence over user content including *"developing new
products or features"*. Self-hosting attaches no such terms. This is the same class of problem that
disqualified Dotloop, and it is avoided only by self-hosting.

**AGPL:** running unmodified over HTTP is low risk — §13 triggers on modification, so **the decision
not to fork is also the licence-compliance decision.** For future commercial packaging (ADR-0013),
Documenso's own materials name *"embedding Documenso in a commercial product"* as a
commercial-licence trigger **without conditioning it on modification**. That is unresolved and needs
legal review before any resale. An Enterprise Edition exists as a clean alternative; a $30k figure
circulating in third-party blogs is **unverified and must not be planned against**.

### Correction to our own Dotloop research

Our earlier finding that *"you cannot download document content"* from Dotloop is **wrong**. Dotloop's
changelog records *"Introducing Document API to upload and download documents"* (2017-07-26). The
original pass searched for `application/pdf`, got a technically correct result, and generalised it
into an absolute negative.

Corrected and still confirmed: no e-signature endpoints · no `DOCUMENT_*` or `TASK_*` webhook events ·
tasks read-only · templates and activities read-only.

**The decision is unaffected.** It rests on clause 2(k), not on endpoint capability — which is why
that basis was stated explicitly above. Recording the correction anyway, because a plan that quietly
carries a false technical claim is one someone will later act on.

## Revisit when

- Dotloop's API terms change to permit inference on a subscriber's own data, **or**
- Self-hosted signing certificates prove operationally unworkable, **or**
- RCRE decides to package the platform commercially — at which point the AGPL question becomes live
  and must be answered before a contract is signed.
