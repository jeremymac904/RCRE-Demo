# Doc & Signature Stack — Documenso + Stirling PDF, and a Dotloop fact-check

**Status:** Research only. No code written, nothing installed, no containers run.
**Retrieval date for all sources:** 2026-08-26.
**Scope:** (1) Documenso e-signature, (2) Stirling PDF document processing, (3) reconciliation of
RCRE's own prior Dotloop research against primary Dotloop docs.

**Evidence convention used throughout:**
- **[V]** = Verified — read directly in a primary source (official docs, official repo, live OpenAPI spec, LICENSE file).
- **[I]** = Inferred — a reasonable reading of verified facts, but not stated outright in a primary source.
- **[U]** = Unverified — could not confirm from a primary source. Treat as an open question, not a fact.

---

# TASK 1 — Documenso (e-signature)

**Approved posture:** self-hosted Community Edition, consumed by RCRE as an independent
service over its HTTP API. **Not forked into RCRE.** Everything below is assessed against
that posture.

## 1.1 Headline: the Envelope API premise is CORRECT — and stronger than assumed

The instruction was to use the current Envelope API rather than the legacy document/template
creation endpoints, and to say so plainly if the docs did not support that. **The docs support
it, and the live machine-readable spec supports it even more decisively than the prose docs do.**

I pulled Documenso's live OpenAPI document and parsed it rather than relying on the narrative
docs. Source: `https://app.documenso.com/api/v2/openapi.json` (title: "Documenso v2 API",
server `https://app.documenso.com/api/v2`). **[V]**

Of **89 documented operations, 52 are flagged `deprecated: true` in the spec itself.** The
deprecated set is *exactly* the legacy surface: **[V]**

- every `/document/*` operation (create, update, delete, distribute, duplicate, redistribute,
  get, get-many, download, attachments)
- every `/document/field/*` and `/document/recipient/*` operation
- every `/template/*` operation, **including `POST /template/use`**
- every `/template/field/*` and `/template/recipient/*` operation

The **37 non-deprecated operations** are the envelope surface plus folders and embedding.

**Verdict: build against `/envelope/*` only. Do not write a single call against `/document/*`
or `/template/*`.** Note specifically that `POST /template/use` — the endpoint most third-party
tutorials and blog posts still demonstrate for "create a document from a template with prefilled
values" — **is deprecated.** Its replacement is `POST /envelope/use`. Any code sample RCRE copies
from a blog written before Nov 2025 will target the dead surface.

### Deprecation status and timeline — precisely

This needs care, because the honest answer is "deprecated but not dated."

- Documenso 2.0 shipped **13 November 2025**, introducing envelopes and taking API v2 out of
  beta. API v1 is "supported and functional, but deprecated"; "all new functionality will go to
  V2." Source: `https://documenso.com/blog/announcing-documenso-2-0` **[V]**
- The versioning page states "The current version of the API is `v2`" and that new integrations
  "should create documents and templates through the `/envelope/*` endpoints," with the older
  ones "deprecated in favor of `POST /envelope/create`."
  Source: `https://docs.documenso.com/developers/public-api/versioning` **[V]**
- The public API overview states plainly: "Documents and templates are being deprecated and
  replaced by envelopes."
  Source: `https://docs.documenso.com/developers/public-api` **[V]**
- **No sunset date, no removal date, and no support window is published anywhere I could find.**
  The versioning page commits only to a process: when something is deprecated they "will provide
  information about the deprecation in the release notes and give a timeline for when the feature
  or endpoint will be removed." No such timeline has been issued for the document/template
  endpoints. **[V — verified absence, checked versioning page, API overview, and the spec]**
- The same versioning page carries a caveat RCRE should take seriously: Documenso "may make
  changes to the API without incrementing the version number," and breaking changes may occur
  even though they try to avoid them. **[V]**

**What this means operationally:** there is no deadline forcing a migration, but there is also no
promise of stability. Because RCRE is self-hosting, **RCRE controls its own upgrade cadence** —
a Documenso release cannot break RCRE overnight, because RCRE chooses when to pull a new image.
That is a meaningful advantage of the self-hosted posture over the cloud one. The corresponding
duty is that someone must read release notes before each upgrade. **[I]**

**Current release at time of writing: v2.17.0, published 2026-08-19.** Repo last pushed
2026-08-26 (the day of this research). 14,761 stars. The project is actively maintained, not
dormant. Source: GitHub API `repos/documenso/documenso` and `/releases`. **[V]**

## 1.2 The actual current API surface

Auth is a single API key in the `Authorization` header (`apiKey` security scheme, `in: header`,
`name: Authorization`), sent as `Authorization: api_xxxxxxxxxxxxxxxx`. **[V]**

### Active endpoints, by capability

| Capability | Endpoint(s) | Notes |
|---|---|---|
| **Envelope creation** | `POST /envelope/create` | `multipart/form-data`. One-step: PDF files + full structure in a single call. Replaces the old two-step upload. **[V]** |
| **Templates** | `POST /envelope/create` with `type: TEMPLATE`; then `POST /envelope/use` | Templates are no longer a separate object — an envelope is either `DOCUMENT` or `TEMPLATE`. `envelope/use` creates a document envelope from a template envelope, and can upload custom files to replace the template PDFs. **[V]** |
| **Recipients** | `POST /envelope/recipient/create-many`, `update-many`, `delete`, `GET /envelope/recipient/{recipientId}`, `POST /envelope/recipient/{recipientId}/reject` | Also settable inline in `envelope/create` via `payload.recipients[]`. **[V]** |
| **Signing fields** | `POST /envelope/field/create-many`, `update-many`, `delete`, `GET /envelope/field/{fieldId}` | Also inline per-recipient in create. **[V]** |
| **Envelope items (the PDFs)** | `POST /envelope/item/create-many`, `update-many`, `delete` | Multi-document packages. **[V]** |
| **Attachments** | `GET /envelope/attachment`, `POST /envelope/attachment/create`/`update`/`delete` | Non-signable supporting files. **[V]** |
| **Send** | `POST /envelope/distribute`, `POST /envelope/redistribute` | JSON body, `envelopeId`. **[V]** |
| **Status** | `GET /envelope/{envelopeId}`, `POST /envelope/get-many`, `GET /envelope` | **[V]** |
| **Completed PDF retrieval** | `GET /envelope/item/{envelopeItemId}/download` | See §1.3 — this is the one that matters most. **[V]** |
| **Audit trail** | `GET /envelope/{envelopeId}/audit-log` (structured, searchable), `GET /envelope/{envelopeId}/audit-log/download` (PDF) | **[V]** |
| **Signing certificate** | `GET /envelope/{envelopeId}/certificate/download` | "Download the signing certificate for a completed document as a PDF." **[V]** |
| **Lifecycle** | `POST /envelope/cancel`, `/delete`, `/duplicate`, `/update` | **[V]** |
| **Organisation** | `GET /folder`, `POST /folder/create`/`update`/`delete` | **[V]** |
| **Embedding** | `POST /embedding/create-presign-token`, `verify-presign-token` | For embedding the signing UI in RCRE's own app if ever wanted. **[V]** |

### Enums, verified from the spec **[V]**

- **Recipient roles:** `SIGNER`, `APPROVER`, `CC`, `VIEWER`, `ASSISTANT`
- **Envelope status:** `DRAFT`, `PENDING`, `COMPLETED`, `REJECTED`, `CANCELLED`
- **Per-recipient signing status:** `NOT_SIGNED`, `SIGNED`, `REJECTED`
- **Field types (11):** `SIGNATURE`, `FREE_SIGNATURE`, `INITIALS`, `NAME`, `EMAIL`, `DATE`,
  `TEXT`, `NUMBER`, `RADIO`, `CHECKBOX`, `DROPDOWN`
- **Signing order mode:** `PARALLEL` | `SEQUENTIAL` (in `payload.meta.signingOrder`)
- **Distribution method:** `EMAIL` | `NONE`
- **Access auth:** `ACCOUNT`, `TWO_FACTOR_AUTH`; **action auth:** `ACCOUNT`, `PASSKEY`,
  `TWO_FACTOR_AUTH`, `PASSWORD`
- **Visibility:** `EVERYONE`, `MANAGER_AND_ABOVE`, `ADMIN`
- **Email trigger types:** includes `SIGNING_REQUEST`, `APPROVE_REQUEST`, `ASSISTING_REQUEST`,
  `VIEW_REQUEST`, `REMINDER`, `CC`, `DOCUMENT_COMPLETED`

### Field positioning

Fields are placed by **percentage coordinates**: `page` (required), `positionX`, `positionY`,
`width`, `height`, each 0–100, plus `type` and optional `fieldMeta`. An optional `identifier`
selects which envelope item (filename or 0-based index). **[V]**

**Design consequence for RCRE:** percentage-based placement means RCRE must know where on the
page a signature goes. For RCRE's own repeatable forms this is solved once by building a
TEMPLATE envelope and reusing it. For arbitrary third-party PDFs it is not automatic — something
must decide the coordinates. Budget for template-building as real setup work. **[I]**

## 1.3 Completed PDF retrieval — verified, and it is clean

This was called out as a make-or-break item, so I checked the spec rather than the prose.

`GET /envelope/item/{envelopeItemId}/download` **[V]**

- Response 200 declares a **required response header `Content-Type: application/pdf`** — it
  returns actual PDF bytes, not a JSON wrapper. (The spec's JSON content schema for the 200 is
  empty `{}`, which is a spec-authoring artifact; the declared `Content-Type` header is the
  authoritative signal.)
- It takes a **`version` query parameter**, enum `original | signed | pending`, **default
  `signed`**. The spec's own description:
  - `signed` — "returns the completed document with all signatures and the audit trail"
  - `original` — "returns the original uploaded document"
  - `pending` — "returns the original document with currently-inserted fields burned in (only
    valid while the envelope is in PENDING status; **not a final executed document**)"

**Verdict: completed-PDF retrieval is fully supported and the default behaviour is the correct
one.** The `signed` version bundles the audit trail into the returned PDF. Separately, the
audit log and the signing certificate are each independently downloadable as their own PDFs.
This is a materially better position than Dotloop, and it is the single most important technical
reason this architecture works.

**Sequence RCRE will use:** `GET /envelope/{envelopeId}` to obtain envelope item IDs and status →
`GET /envelope/item/{envelopeItemId}/download?version=signed` per item. **[V, composed from two
verified endpoints]**

## 1.4 Prefill

Two distinct mechanisms, both verified in the spec: **[V]**

1. **`payload.formValues`** — present on **both** `envelope/create` and `envelope/use`. Typed as
   an object map of `string -> string | boolean | number`. This is the AcroForm-style
   prefill path: values keyed by PDF form field name.
   **Caveat [U]:** the spec supplies **no description text** for `formValues` on either endpoint
   (I checked — the description is empty). The key-matching semantics against AcroForm field
   names are therefore **not documented and must be confirmed by experiment** against a real
   RCRE form before any architecture depends on it. Do not treat this as settled.
2. **`prefillFields`** — on `envelope/use` only. An array of `{ id, type, value }` objects
   targeting specific *Documenso* fields (not PDF AcroForm fields) defined on the template.
   This is the reliable, documented prefill path for template-driven flows.

`envelope/use` full payload keys, verified: `envelopeId`, `externalId`, `recipients`,
`distributeDocument`, `customDocumentData`, `folderId`, `prefillFields`, `override`,
`attachments`, `formValues`. **[V]**

**Recommendation:** treat `prefillFields` on a TEMPLATE envelope as the primary prefill path
(documented, typed, deterministic). Treat `formValues` as promising but unproven — **and note
that it partially overlaps with what Stirling PDF would be doing in §2. Resolve that overlap by
experiment before committing an architecture**; see §4.

## 1.5 Signing order, approvers, assistants

- **Signing order:** `payload.meta.signingOrder` = `PARALLEL` or `SEQUENTIAL`; each recipient
  carries an optional numeric `signingOrder`. Recipients sharing an order number act
  simultaneously at that step. **[V for the enum and field; the same-number-acts-simultaneously
  behaviour is from the user docs at `https://docs.documenso.com/docs/users/documents/add-recipients`]**
- **Approvers:** `APPROVER` is a first-class role, with its own `APPROVE_REQUEST` email type. **[V]**
- **Assistants:** `ASSISTANT` is a first-class role with an `ASSISTING_REQUEST` email type. Per
  the user docs, sequential signing is required to use it, and the assistant must be ordered
  before the signers whose fields they prefill. **[V from user docs]**
- `payload.meta.allowDictateNextSigner` permits a signer to nominate who comes next. **[V]**

**Open item [U]:** GitHub issue #2526 ("Signature Flow — Approver Role Should Block Signature
Requests Until Completed") suggests the exact blocking semantics of `APPROVER` have been
questioned by users. I did not verify the current behaviour or whether it is resolved.
**If RCRE's workflow requires a broker approval to hard-block signing, test it explicitly.**

## 1.6 Webhooks — and one real gap

Event types (from `https://docs.documenso.com/docs/developers/webhooks`): **[V]**

- Document: `DOCUMENT_CREATED`, `DOCUMENT_SENT`, `DOCUMENT_OPENED`, `DOCUMENT_SIGNED`,
  `DOCUMENT_COMPLETED`, `DOCUMENT_REJECTED`, `DOCUMENT_CANCELLED`
- Recipient: `RECIPIENT_COMPLETED`, `REMINDER_SENT`, `RECIPIENT_EXPIRED`
- Template: `TEMPLATE_CREATED`, `TEMPLATE_UPDATED`, `TEMPLATE_DELETED`, `TEMPLATE_USED`

Payload carries `event`, `payload`, `createdAt`, `webhookEndpoint`. The docs state `envelopeId`
is "the canonical v2 identifier" in payloads — so despite the `DOCUMENT_*` event names, the
payloads are envelope-aware. Webhooks are signature-verified; there is a dedicated verification
page at `https://docs.documenso.com/docs/developers/webhooks/verification`. **[V]**

**Two things to record honestly:**

1. **The payload does not include a download URL for the completed document.** RCRE must react to
   `DOCUMENT_COMPLETED` by calling the download endpoint itself. Minor, but it means the webhook
   handler needs API credentials, not just a public listener. **[V]**
2. **There are NO webhook-management endpoints in the v2 API.** I searched all 89 paths in the
   OpenAPI spec: zero paths contain "webhook." **[V — verified absence]** Webhook endpoints
   appear to be configurable only through the Documenso UI. **[I]** For RCRE this is a one-time
   manual setup step per environment, and it means webhook config **cannot be provisioned as
   code**. Worth knowing before someone plans an automated environment bootstrap.

## 1.7 Self-hosting specifics

**Deployment options:** Docker (single container + external DB), Docker Compose
("production-ready setup with all dependencies"), Kubernetes, Railway.
Source: `https://docs.documenso.com/docs/self-hosting` **[V]**

**Documented requirements** (`https://docs.documenso.com/docs/self-hosting/getting-started/requirements`): **[V]**

| | Minimum (test/dev) | Recommended (production) |
|---|---|---|
| CPU | 1 core | 2+ cores |
| RAM | 1 GB | 2+ GB |
| Storage | 10 GB | 20+ GB |

- **PostgreSQL 14+**
- Node.js 22+ / npm 11+ (build only)
- A signing certificate (.p12)
- An SMTP server
- A reverse proxy for TLS termination (nginx, Caddy, Traefik, HAProxy, or a cloud LB)

These are modest requirements. Documenso is not a heavy service. **[V]**

**Security note from the self-hosting docs:** Documenso states the operator is responsible for
firewall configuration and egress filtering, because the platform "cannot fully mitigate SSRF
risks to internal network addresses." **RCRE must do egress filtering on this container.**
Do not skip this. **[V]**

### Environment variables

Source: `https://docs.documenso.com/docs/self-hosting/configuration/environment`. Verbatim names. **[V]**

**Core (required):** `NEXTAUTH_SECRET`, `NEXT_PUBLIC_WEBAPP_URL`,
`NEXT_PRIVATE_ENCRYPTION_KEY` (min 32 chars), `NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY` (min 32 chars).
Optional: `PORT` (default 3000), `NEXT_PRIVATE_INTERNAL_WEBAPP_URL`.

**Database:** `NEXT_PRIVATE_DATABASE_URL` (required, pooled),
`NEXT_PRIVATE_DIRECT_DATABASE_URL` (required when pooling, used for migrations).

**SMTP (required for anything to work — signing invitations are email-driven):**
`NEXT_PRIVATE_SMTP_TRANSPORT` (`smtp-auth` default, or `smtp-api`, `resend`, `mailchannels`),
`NEXT_PRIVATE_SMTP_HOST`, `NEXT_PRIVATE_SMTP_PORT` (587), `NEXT_PRIVATE_SMTP_USERNAME`,
`NEXT_PRIVATE_SMTP_PASSWORD`, `NEXT_PRIVATE_SMTP_SECURE`, `NEXT_PRIVATE_SMTP_UNSAFE_IGNORE_TLS`,
`NEXT_PRIVATE_SMTP_SERVICE`, **`NEXT_PRIVATE_SMTP_FROM_ADDRESS` (required)**,
**`NEXT_PRIVATE_SMTP_FROM_NAME` (required)**. Resend/MailChannels keys and DKIM vars exist for
those transports.

**Storage:** `NEXT_PUBLIC_UPLOAD_TRANSPORT` — **default is `database`**, alternative `s3`.
S3 vars: `NEXT_PRIVATE_UPLOAD_BUCKET`, `NEXT_PRIVATE_UPLOAD_REGION` (default us-east-1),
`NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID`, `NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY`,
`NEXT_PRIVATE_UPLOAD_ENDPOINT` (for S3-compatible), `NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE`
(required for MinIO), plus CloudFront distribution vars.
`NEXT_PUBLIC_DOCUMENT_SIZE_UPLOAD_LIMIT` — **default 5 MB**.

**Signing certificate:** `NEXT_PRIVATE_SIGNING_TRANSPORT` (`local` default | `gcloud-hsm` | `csc`),
`NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH` (default `/opt/documenso/cert.p12`),
`NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS` (base64 alternative),
`NEXT_PRIVATE_SIGNING_PASSPHRASE`, `NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY` (LTV; required for
CSC), `NEXT_PUBLIC_SIGNING_CONTACT_INFO`, `NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER`.

**Background jobs:** `NEXT_PRIVATE_JOBS_PROVIDER` (`local` default | `bullmq` | `inngest`),
`NEXT_PRIVATE_REDIS_URL`, `NEXT_PRIVATE_REDIS_PREFIX`, `NEXT_PRIVATE_BULLMQ_CONCURRENCY`,
`NEXT_PRIVATE_INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.

### Storage — two decisions RCRE must make up front

Source: `https://docs.documenso.com/docs/self-hosting/configuration/storage` **[V]**

Backends: **database** (default — documents stored base64 in Postgres), **S3-compatible**
(AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, Backblaze B2, Wasabi), **Azure Blob**.

Two traps, both documented:

1. **"Documents uploaded to one storage backend cannot be automatically migrated to another.
   Plan your storage strategy before deploying to production."** This is a one-way door. The
   default (`database`) is the wrong choice for RCRE if volume is expected — base64 adds ~33%
   overhead and the docs call database storage suitable only for "small deployments."
   **Decide S3-vs-database before the first real transaction is signed.** **[V]**
2. **The 5 MB default upload limit is too small for real estate.** Scanned multi-page purchase
   contracts routinely exceed it. Raise `NEXT_PUBLIC_DOCUMENT_SIZE_UPLOAD_LIMIT` deliberately. **[V]**

These two settings interact with **ADR-0001 (storage boundary)** and should be reconciled
against it. **[I]**

### Signing certificates for self-hosted — the part people get wrong

Source: `https://docs.documenso.com/developers/self-hosting/signing-certificate` and the
self-hosting overview. **[V]**

**Documenso does not ship a certificate.** The self-hosting docs state a certificate must be
generated before deployment and that **signing functionality will fail without it.** This is the
most common self-host failure. **[V]**

Four transports: **[V]**

| Transport | What it gives you |
|---|---|
| **`local`** (default) | A `.p12` file you supply — self-signed or CA-issued |
| **`gcloud-hsm`** | Key held in Google Cloud HSM |
| **`csc`** | Routes to a third-party Trust Service Provider for AES/QES |
| *(+ timestamp authority)* | `NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY` for LTV/trusted timestamps |

**The honest position on self-signed certificates.** Documenso's own docs say a self-signed cert
is acceptable "for most scenarios lacking regulatory requirements" — free, fully under your
control, fine for internal/business documents. But they also state the limitations plainly: **[V]**

- Adobe Acrobat will **not** show the green checkmark
- The certificate is **not on Adobe's trust list**
- **Recipients will see a warning that the signature "cannot be verified"**

**This is the trap.** A self-signed cert still produces a cryptographically valid signature that
proves the document has not been altered since signing. What it does *not* do is prove *who*
signed, to a third party, automatically. **A buyer, lender, title company, or opposing counsel
opening RCRE's executed contract in Acrobat will see a warning banner.** In real estate — where
the counterparty is routinely a title company or a lender — that is a business problem, not just
a cosmetic one. **[I, but a direct consequence of the verified facts above]**

**Recommendation:** plan for a **CA-issued document-signing certificate** for production, and
treat self-signed as acceptable for development and internal testing only. The cost of a
document-signing certificate is real but modest relative to per-envelope SaaS pricing.
**[I — I did not verify current certificate pricing or which CAs Documenso works with; that is
an open procurement question, marked [U].]**

**Certificate handling, from the Docker docs** (`https://docs.documenso.com/docs/self-hosting/deployment/docker-compose`): **[V]**

- Prefer a **volume mount** over baking the cert into the image. Place at `/opt/documenso/cert.p12`,
  `chown 1001:1001`, `chmod 400` (container runs as UID 1001).
- Base64 via `NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS` if mounting is unavailable.
- **Explicit warning: do not generate or store the signing certificate inside the container.**
  If the container is destroyed/rebuilt, or multiple instances run, the certificate is lost or
  inconsistent. This belongs in RCRE's secrets/backup procedure — **losing this key means losing
  the ability to validate every previously signed document.** **[V for the warning; the
  consequence framing is [I]]**

**One live caveat [U]:** GitHub issue #2017 reports the audit trail not being appended to the
completed PDF on self-hosted v2.4.1 despite `ENABLE_AUDIT_TRAIL=true`. I could not determine the
root cause or resolution from the issue page, and the current release is v2.17.0 — far newer.
**Do not assume it is broken; do verify on the actual deployed version** that a completed PDF
comes back with the audit trail attached. This is a 10-minute smoke test and it protects the
single most legally important artifact in the system.

## 1.8 AGPL-3.0 obligations — the part that needs legal review

**Confirmed licence: AGPL-3.0.** GitHub API reports `spdx_id: AGPL-3.0` for
`documenso/documenso`. Documenso operates an explicit **dual-licence** model: Community Edition
under AGPL-3.0, Enterprise Edition under a commercial licence.
Sources: GitHub API; `https://docs.documenso.com/docs/policies/licenses`;
`https://docs.documenso.com/docs/policies/enterprise-edition` **[V]**

### What AGPL permits, verbatim from Documenso's licensing page **[V]**

Allows: "Use Documenso for any purpose, **including commercial use**" and "Self-host Documenso
on your own infrastructure."

Requires: "**If you modify Documenso and make it available over a network, you must provide
access to the complete source code of your modified version under AGPL-3.0.**"

Documenso's own decision tree says a commercial licence applies when you: **modify Documenso AND
your modifications aren't open source**, OR you are **"embedding Documenso in a commercial product."** **[V]**

### Applying that to RCRE's three scenarios

**(a) Running it as a separate service RCRE talks to over HTTP — RCRE's approved posture.**

**Low risk.** The AGPL §13 network clause is triggered by *modification*. Running an
**unmodified** Documenso and calling its API over HTTP does not oblige RCRE to release RCRE's own
source code. RCRE's application is a *separate work* that communicates with Documenso at arm's
length over a network protocol — it is not a derivative work of Documenso. This is precisely why
"independent service, not forked" is the right call, and it is worth recording that **the
architectural decision to keep Documenso unforked is also the licence-compliance decision.**
**[I — this is the standard and widely-held reading of AGPL §13, but it is a legal
interpretation, not a quotation from a primary source. It is not legal advice.]**

The residual obligation even when unmodified: AGPL §13 requires that users interacting with the
instance over a network be offered the **corresponding source of that instance**. For an
unmodified deployment this is satisfied by pointing at the upstream repository at the matching
version. **Practical step: keep a record of the exact image tag/commit deployed.** Cheap now,
awkward to reconstruct later. **[I]**

**(b) Modifying it.**

**This is the tripwire.** The moment RCRE patches Documenso — a branding change, a tweak to the
signing flow, a custom field type, a bug fix not upstreamed — AGPL §13 engages, and RCRE must
offer the complete corresponding source of the modified version, under AGPL-3.0, to everyone who
interacts with it over the network. **That plausibly includes every outside party who clicks a
signing link** — buyers, sellers, co-op agents, lenders. **[I]**

**Recommendation: adopt a standing rule that RCRE does not modify Documenso.** Configuration,
environment variables, and API usage only. If a change is genuinely needed, either (i) upstream
it as a PR, or (ii) escalate to the commercial-licence question. Whitelabeling/branding is the
most likely thing someone will want to change — check whether it is achievable through
configuration before anyone touches code. **[I; whether branding is config-only is [U] — not verified.]**

**(c) Future commercial resale of RCRE to other brokerages — ADR-0013.**

**This is the item that needs legal review, and it should be flagged now rather than discovered
later.** ADR-0013 establishes RCRE as the proving ground with packaging as a legitimate later
goal. That future intersects AGPL directly.

The specific risk: Documenso's own page names **"embedding Documenso in a commercial product"**
as a trigger for the commercial licence — *without* conditioning it on modification. That is
broader than the modification trigger, and it is Documenso's own framing of when they expect to
be paid. Whether "RCRE ships to another brokerage, who self-hosts their own unmodified Documenso
alongside it" counts as *embedding* is genuinely arguable and **is not resolved by anything I can
read in the public docs.** **[U — this is the crux and it is unresolved.]**

**What needs legal review before packaging, specifically:**

1. Does RCRE **bundle, distribute, or deploy** Documenso as part of the product, or does the
   customer brokerage stand up their own instance independently? These are very different
   positions. The second is far safer.
2. Is Documenso **modified** in any way in the packaged product — including branding, theming,
   or configuration baked into a custom image? A custom Docker image containing a modified
   Documenso is distribution of a modified work.
3. Does RCRE **operate** Documenso on behalf of customer brokerages (multi-tenant / managed
   hosting)? If RCRE runs it as a service for third parties, §13 obligations attach to RCRE as
   the operator.
4. Does the packaged product's architecture make Documenso look like a **component of** RCRE
   rather than an **independent service** RCRE integrates with? Architecture and marketing
   language both matter to this analysis.
5. Confirm whether AGPL's **§13 source-offer** obligation would extend to the customer
   brokerage's end users, and who bears it.

**Mitigation available today, and it costs nothing:** keeping Documenso unmodified and
architecturally at arm's length — exactly the approved posture — preserves the strongest possible
position for every one of those five questions. **The decision already made is the right one;
what is needed is the discipline to hold it.** **[I]**

**The commercial alternative exists.** Enterprise Edition is a "Commercial license that removes
AGPL-3.0 source code disclosure requirements, allowing organisations to integrate Documenso into
proprietary products," aimed at those who "build proprietary products integrating Documenso" or
"offer SaaS with custom modifications they wish to keep private." Pricing is "Contact sales,"
varying by deployment type, user count, monthly volume, support level and contract term.
**[V]** A third-party blog cites $30,000/year for the self-hosted enterprise licence; **that
figure is [U] — it is not from Documenso and I could not confirm it. Do not plan against it.**

**Net position: AGPL is not a blocker for RCRE today, and there is a clean commercial escape
hatch for later.** The risk is not the licence — it is drifting into modification without
noticing.

## 1.9 AI/ML terms — how Documenso compares to what disqualified Dotloop

This is where the self-hosted posture pays off most clearly, and there is a genuinely surprising
finding.

**Documenso's *cloud* Terms of Service contain an AI/data-use clause that is arguably worse than
expected.** Section 4.2 grants Documenso "an irrevocable, perpetual, transferable, sublicensable
(through multiple tiers), fully paid, royalty-free, and worldwide right and license to use, copy,
store, modify, distribute, reproduce, publish, list information regarding, make derivative works
of, and display your User Content and Output: (i) to maintain and provide the Service; (ii) to
improve our products and the Service and for our other business purposes, such as data analysis,
customer research, developing new products or features, and identifying usage trends."
Section 5.4 permits use of Usage Data "for any lawful purpose... to develop new products,
services, and/or features... for research and analytics."
Source: `https://documenso.com/terms` **[V]**

Ironically, §3.2(c) of the same ToS *prohibits users* from using service content "for any machine
learning and/or artificial intelligence training or development purposes." **[V]**

**Why this does not affect RCRE.** Those terms govern the hosted SaaS at documenso.com.
**RCRE is self-hosting the AGPL Community Edition, so no Documenso ToS attaches to RCRE's document
content at all.** The governing instrument is the AGPL licence — which imposes source-code
obligations, not data-use obligations. **Documents never leave RCRE's infrastructure, so there is
nothing for a third party to train on.** **[I, following directly from the verified facts]**

**This is the structural answer to the problem that disqualified Dotloop.** Dotloop's restriction
was unavoidable because Dotloop is SaaS — using it means accepting its terms. Self-hosting
removes the counterparty entirely. **The recommendation is therefore to record explicitly that
RCRE must NOT use documenso.com cloud**, even for a quick pilot or a convenience test, because
doing so would pull client documents under §4.2. **This deserves to be a hard rule, not a
preference** — it is exactly the sort of shortcut that gets taken under time pressure. **[I]**

Documenso's privacy policy lists only Plausible Analytics, GitHub and Stripe as subprocessors and
contains **no mention of AI, ML, or model training**. Source: `https://documenso.com/privacy`
**[V]** — but again, this governs the cloud service, not a self-hosted instance.


---

# TASK 2 — Stirling PDF (document processing engine)

**Approved posture:** RCRE's self-hosted document-processing engine. **Stirling is NOT the
e-signature workflow engine — Documenso owns signing.** Nothing below disturbs that boundary,
and §2.7 flags the one place the two overlap.

**Method note:** rather than relying on the docs site, I read the repository source directly —
the file tree (8,049 files), the controller classes, and the LICENSE files. Endpoint paths below
were resolved by reading the controller annotations and the meta-annotations that supply the URL
prefixes. This matters, because the single most important finding in this section is **not**
stated on the marketing site.

Repo: `github.com/Stirling-Tools/Stirling-PDF` — 90,472 stars, last pushed 2026-08-26. **[V]**

## 2.1 HEADLINE: form filling is fully supported — the architecture holds

This was the make-or-break question, and the answer is an unambiguous **yes**.

There is a dedicated `FormFillController` at
`app/core/src/main/java/stirling/software/SPDF/controller/api/form/FormFillController.java`,
class-annotated `@RequestMapping("/api/v1/form")`. **[V]**

Its own OpenAPI tag description states the intent verbatim: **[V]**

> Work with PDF form fields: read them, fill them, edit them, or remove them. Treats a PDF as a
> structured form instead of just flat pages.
> Typical uses: • Inspect which form fields exist in a PDF • **Autofill forms from your own
> systems (e.g. CRM, ERP)** • Change or delete form fields before sending out a final,
> non-editable copy • Unlock read-only form fields when you need to update them

That second bullet is precisely RCRE's use case, described by the vendor.

### The three capabilities RCRE asked about **[V, all read from source]**

| Requirement | Endpoint | Verdict |
|---|---|---|
| **Read AcroForm field names/types** | `POST /api/v1/form/fields` — "Inspect PDF form fields — Returns metadata describing each field in the provided PDF form" | **YES** |
| **Fill AcroForm field values** | `POST /api/v1/form/fill` — "Populates the supplied PDF form using values from the provided JSON payload and returns the filled PDF" | **YES** |
| **Flatten** | `POST /api/v1/form/fill?flatten=true`, or `POST /api/v1/misc/flatten` | **YES** |

**`POST /api/v1/form/fill` signature, read from source:** `multipart/form-data` with
- `file` (required) — the input PDF
- `data` — "JSON object of field-value pairs to apply", documented example `{"field":"value"}`
- `flatten` — boolean, **default `false`**

It calls `FormUtils.applyFieldValues(document, values, flatten, true)`. **Fill and flatten happen
in a single call** — RCRE does not need a second round-trip to lock a completed form. **[V]**

### The wider form surface — more than expected **[V]**

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/form/fields` | Inspect field metadata |
| `POST /api/v1/form/fields-with-coordinates` | Field metadata **plus widget coordinates** |
| `POST /api/v1/form/extract-csv` | Export field values as CSV |
| `POST /api/v1/form/extract-xlsx` | Export field values as XLSX |
| `POST /api/v1/form/fill` | Fill field values (+ optional flatten) |
| `POST /api/v1/form/add-fields` | Add new form fields from a JSON array of definitions |
| `POST /api/v1/form/edit-fields` | Apply a batch of field edits |
| `POST /api/v1/form/modify-fields` | Modify existing fields |
| `POST /api/v1/form/delete-fields` | Remove specified fields |
| `POST /api/v1/misc/unlock-pdf-forms` | Unlock read-only fields (`UnlockPDFFormsController`) |

**`/fields-with-coordinates` is quietly the most valuable endpoint here.** It returns widget
coordinates for each field — which is exactly the input needed to compute Documenso's
percentage-based field placement. That is a real, non-obvious bridge between the two systems.
**[I — the endpoint is verified; using it to derive Documenso coordinates is my inference and
would need a unit-conversion step from PDF points to 0–100 percentages.]**

Also note `FormUtils.repairMissingWidgetPageReferences(document)` runs before every operation —
Stirling defensively repairs malformed forms. Useful, given that agency- and lender-supplied PDFs
are frequently malformed. **[V]**

**Conclusion: RCRE does NOT need a separate PDF library for form filling.** The architecture as
approved stands. This was the item flagged as potentially architecture-changing; it is not.

## 2.2 Wider REST API surface **[V — paths resolved from controller source]**

URL prefixes are supplied by meta-annotations, verified in
`app/common/src/main/java/stirling/software/common/annotations/api/`: `@GeneralApi` →
`/api/v1/general`, `@MiscApi` → `/api/v1/misc`, `@SecurityApi` → `/api/v1/security`,
`@ConvertApi` → `/api/v1/convert`, `@PipelineApi` → `/api/v1/pipeline`. **[V]**

| Capability | Verified endpoint(s) |
|---|---|
| **Merge** | `POST /api/v1/general/merge-pdfs` |
| **Split** | `POST /api/v1/general/split-pages` (+ by-chapters, by-sections, by-size, auto-split controllers) |
| **Rotate** | `POST /api/v1/general/rotate-pdf` (+ `misc/auto-rotate`) |
| **Reorder** | `POST /api/v1/general/rearrange-pages`, `POST /api/v1/general/remove-pages` |
| **Flatten** | `POST /api/v1/misc/flatten` — `flattenOnlyForms` boolean; when true calls `acroForm.flatten()`, else flattens whole pages |
| **OCR** | `POST /api/v1/misc/ocr-pdf` |
| **Redaction** | `POST /api/v1/security/redact` (manual), `POST /api/v1/security/auto-redact` (pattern-based), `POST /api/v1/security/redact-execute` |
| **Compression** | `POST /api/v1/misc/compress-pdf` |
| **Security** | `POST /api/v1/security/add-password`, `/remove-password`; plus cert-signing, stamp/watermark, sanitise, get-info controllers |
| **Conversion** | `POST /api/v1/convert/file/pdf` (office→PDF) plus a large converters package: PDF→Office/Excel/HTML/EPUB/PDFA, HTML/Markdown/SVG/EML/website/image→PDF |
| **Pipelines** | `POST /api/v1/pipeline/handleData` (+ `PipelineDirectoryProcessor` for watched-folder automation) |

The repo contains **356 controller classes** — the surface is far broader than the list above.
**[V]**

**Auto-redaction caveat [I]:** `auto-redact` is pattern/text-based. For genuinely sensitive
removal, confirm it deletes the underlying content rather than drawing black boxes over it.
Stirling has a `redact-execute` step which suggests real content removal, but **I did not verify
the implementation.** Given RCRE handles SSNs and bank details on mortgage documents, **verify
this before relying on it** — a black rectangle over selectable text is a data breach waiting to
happen. **[U on the implementation]**

## 2.3 MCP server — YES, but it is PROPRIETARY. This is the finding to act on.

**An official MCP server exists.** It lives at
`app/proprietary/src/main/java/stirling/software/proprietary/mcp/` — 69 files including
`McpServerController.java`, a JSON-RPC layer, a tool catalog, and a security package
(`McpApiKeyAuthFilter`, `McpAudienceValidator`, `McpUserBindingFilter`, `McpRequestSizeFilter`). **[V]**

Exposed tools, from `mcp/tools/`: `StirlingUploadTool`, `StirlingDownloadTool`,
`StirlingConvertTool`, `StirlingPagesTool`, `StirlingSecurityTool`, `StirlingMiscTool`,
`StirlingAiTool`, `DescribeOperationTool`. The design is category-based rather than
one-tool-per-endpoint — a `DescribeOperationTool` lets a client discover operation schemas at
runtime. **[V]**

**The catch, and it is a significant one: `app/proprietary/` is explicitly carved OUT of the
MIT licence.** See §2.5. **The MCP server is not free-to-use software.** Production use requires
a paid Stirling PDF User License.

**Recommendation:** RCRE should plan to drive Stirling through its **REST API**, not its MCP
server. The REST API is MIT-licensed and covers everything RCRE needs, form filling included.
Treating the MCP server as "free because Stirling is open source" would be a licence violation.
**If the MCP interface is genuinely wanted, it is a purchasing decision, not a technical one.** **[I]**

## 2.4 Self-hosting

**Three image variants, confirmed from the repo's `docker/` directory:** **[V]**

- `docker/embedded/Dockerfile.ultra-lite` — minimal
- `docker/embedded/Dockerfile` — standard
- `docker/embedded/Dockerfile.fat` — everything bundled

with matching compose files (`docker-compose.ultra-lite.yml`, `docker-compose.yml`,
`docker-compose.fat.yml`), plus split frontend/backend compose files
(`docker-compose-unified-backend.yml`, `-frontend.yml`, `-both.yml`). **[V]**

**A separate `docker/unoserver/` image exists** — this is the LibreOffice/UNO conversion worker,
run as its own container, with `README-remote-uno.md` documenting a remote-UNO topology. **[V]**
So office conversion can be scaled or isolated separately from the main app — useful, because
LibreOffice is the heaviest and least predictable dependency in the stack. **[I]**

External binary dependencies, evident from the controllers: **Tesseract** + per-language data for
`ocr-pdf`; **LibreOffice/unoserver** for office conversion; **Calibre** for e-book conversion.
These are OS binaries, not Java libraries — **the `ultra-lite` image will fail at runtime on OCR
and office conversion.** This is the most common Stirling self-hosting complaint. **[V for the
dependencies and variants; [I] for the failure mode]**

**Recommendation:** RCRE needs OCR (scanned contracts) and likely office conversion, so plan on
the **fat** image, or the standard image plus the separate `unoserver` container. **[I]**

**[U] — documented RAM/CPU/disk figures.** I did not locate official resource requirements.
Java + LibreOffice + Tesseract is substantially heavier than Documenso's documented 2 GB;
**do not size these two services from one estimate.** Confirm against
`https://docs.stirlingpdf.com` before provisioning. **[I]**

## 2.5 Licence — open-core, and the boundary matters

**GitHub reports the licence as `NOASSERTION` / "Other"** — not MIT — because the LICENSE file is
a modified MIT with carve-outs. **[V]**

`LICENSE` at repo root reads: **[V]**

> MIT License. Copyright (c) 2025 Stirling PDF Inc.
> Portions of this software are licensed as follows:
> * All content that resides under the "app/proprietary/" directory … is licensed under the
>   license defined in "app/proprietary/LICENSE".
> * [likewise for `app/saas/`, `engine/`, `frontend/editor/src/proprietary/`, `/desktop/`,
>   `/saas/`, `/cloud/`, `/prototypes/`, `/portal/`, `/portal-saas/`]
> * Content outside of the above mentioned directories or restrictions above is available under
>   the MIT License as defined below.

`app/proprietary/LICENSE` is the **"Stirling PDF User License"**, and it is restrictive: **[V]**

> **Production use of the Stirling PDF Software is only permitted with a valid Stirling PDF User
> License.**
> … You or your organization may not use the Software in production, at scale, or for
> business-critical processes unless you have agreed to … the Stirling PDF Subscription Terms of
> Service … and hold an active User License subscription covering the appropriate number of
> licensed users.
> **Trial and Minimal Use:** … internal trial, evaluation, or minimal use, provided that … you do
> not … use the Software in client-facing or commercial contexts.
> **Modifications:** You may modify the Software only for development or internal testing
> purposes. Any such modifications … may not be deployed in production without a valid User
> License; may not be distributed or sublicensed; remain the intellectual property of Stirling PDF.

### What this means for RCRE, concretely

| Component | Location | Licence | RCRE production use |
|---|---|---|---|
| **Core PDF ops — merge, split, rotate, reorder, flatten, OCR, redact, compress, convert, pipelines** | `app/core/` | **MIT** | **Free. No obligations beyond attribution.** |
| **Form filling — `/api/v1/form/*`** | `app/core/.../controller/api/form/` | **MIT** | **Free.** ✅ |
| **MCP server** | `app/proprietary/.../mcp/` | **Stirling PDF User License** | **Paid licence required for production.** ❌ |
| SaaS / desktop / cloud / portal / engine components | `app/saas/`, `engine/`, `frontend/editor/src/*` | Separate licences | Out of scope; do not use |

**The good news: everything RCRE actually needs — including the critical form-fill capability —
sits in `app/core/` under MIT.** MIT imposes only attribution: retain the copyright notice and
licence text. It places **no restriction on future commercial resale of RCRE**, which is a
markedly easier position than Documenso's AGPL. **[I, from the verified licence text]**

**Two cautions:** **[I]**
1. The carve-out boundary is **directory-based and can move between releases.** A capability that
   is MIT today could be relocated into `app/proprietary/` tomorrow. **Re-check the LICENSE file
   and the directory of any endpoint RCRE depends on at each upgrade.** Pin image versions.
2. "Stirling PDF Inc." (2025) indicates a commercial entity now stewards the project. Open-core
   projects tend to migrate features toward the paid tier over time. This is not a reason to
   avoid Stirling — it *is* a reason to keep RCRE's usage confined to documented REST endpoints
   so that a future licence shift is a contained problem.

**Before packaging RCRE commercially (ADR-0013), the Stirling licence needs the same review pass
as Documenso's** — specifically to confirm that the endpoints RCRE depends on are still MIT at
that time, and that nothing has drifted into `app/proprietary/`. Lower risk than the AGPL
question, but not zero. **[I]**

## 2.6 Security posture

I found the configuration template, so most of this is now verified rather than assumed.
Source: `app/core/src/main/resources/settings.yml.template`. **[V]**

### Telemetry — present, and NOT off by default

```
enableAnalytics: null  # Master toggle ... or leave as 'null' to prompt admin on first launch
enablePosthog:   null  # Enable PostHog analytics ... 'null' to enable by default when analytics is enabled
enableScarf:     null  # Enable Scarf tracking pixel ... 'null' to enable by default when analytics is enabled
```

**Two third-party trackers ship in the product: PostHog and a Scarf tracking pixel.** The default
(`null`) prompts the admin on first launch, and if analytics is enabled both are then **enabled by
default**. **[V]**

**Recommendation: set `enableAnalytics: false` explicitly in RCRE's config before the service ever
sees a client document.** Do not rely on answering a first-launch prompt correctly — set it in
the file. This is a one-line change and it is the difference between "no third party is
contacted" and "we think nobody clicked yes." **[I]**

### Two dangerous defaults worth knowing

```
enableUrlToPDF: false  # INTERNAL ONLY, known security issues, should not be used externally
corsAllowedOrigins: [] # WARNING: leaving this empty falls back to allowing ALL origins
                       # (with credentials), it does NOT disable CORS.
```

- **`enableUrlToPDF` is correctly `false` by default** and Stirling's own comment says it has
  "known security issues" and "should not be used externally." **Leave it off.** This is the SSRF
  vector. **[V]**
- **`corsAllowedOrigins: []` is an empty-means-everything trap.** Stirling's own warning is
  explicit: empty does **not** disable CORS, it allows **all** origins **with credentials**.
  **RCRE must set explicit origins.** **[V]** This is the single most likely misconfiguration in
  a default deployment.
- `disableSanitize: false` — HTML sanitisation is on by default. Leave it. **[V]**
- `metrics.enabled: true` — Info APIs exposed by default. **[V]**

### Air-gapped operation

Core operations are local binaries (PDFBox, Tesseract, LibreOffice, Ghostscript) with no inherent
need for outbound access, so **fully offline operation is achievable** once analytics is disabled
and `enableUrlToPDF` stays off. **[I, well-supported by the verified config]** The converters that
deliberately fetch remote content (`ConvertWebsiteToPDF`, `ConvertHtmlToPDF`) are the exception —
keep them disabled or egress-filtered.

### Remaining unknowns

- **`StirlingAiTool`** exists in the proprietary MCP package. **[V]** Whether it calls an external
  AI service is **[U]**. Given that third-party AI processing is exactly what disqualified
  Dotloop, **confirm before enabling anything under `app/proprietary/`** — though RCRE's
  recommended posture (REST only, §2.3) avoids it entirely.
- **CVEs / security advisories:** not reviewed. **[U]**

**Bottom line for client documents:** the MIT core is a local processing engine and is a
reasonable place to send client PDFs — **provided** three explicit deployment steps:
set `enableAnalytics: false`, set explicit `corsAllowedOrigins`, and leave `enableUrlToPDF: false`.
All three are config-file one-liners and all three should be checklist items, not assumptions. **[I]**

## 2.7 The Documenso / Stirling boundary — one real overlap

The approved rule is clean: **Stirling processes, Documenso signs.** One genuine overlap needs a
decision.

**Both systems can prefill PDF form fields.** Documenso's `envelope/create` and `envelope/use`
accept `payload.formValues` (§1.4); Stirling offers `POST /api/v1/form/fill`. Doing it in both
places would be a silent source of conflicting output.

**Recommendation: prefill in Stirling, sign in Documenso.** Reasons: **[I]**

1. Stirling's form-fill semantics are **documented and verified from source**; Documenso's
   `formValues` has **no description text at all** in its OpenAPI spec (§1.4) and its
   field-name-matching behaviour is unconfirmed.
2. It keeps the boundary crisp and matches the approved architecture — Stirling does document
   preparation, Documenso does the signing ceremony.
3. Stirling can `fill` and `flatten` in one call, producing a clean, locked PDF to hand to
   Documenso — which removes any ambiguity about whether a field is a form field or a signature
   field once it reaches the signing engine.

**Proposed pipeline:** Stirling `POST /api/v1/form/fields` (discover) → RCRE maps data →
Stirling `POST /api/v1/form/fill` (fill, flatten) → Documenso `POST /envelope/create` (upload +
place signature fields) → `POST /envelope/distribute` → webhook `DOCUMENT_COMPLETED` →
Documenso `GET /envelope/item/{id}/download?version=signed`. **Every endpoint in this chain is
verified above.** **[V for the endpoints; [I] for the composition]**

---

# TASK 3 — Reconciling RCRE's own Dotloop research against primary docs

**Framing, restated so it is not lost:** the AI/ML restriction in Dotloop's terms is by itself
sufficient to remove Dotloop from the target architecture. **That decision is made and is not
reopened here.** This section exists solely so that RCRE's written record does not assert
endpoint-level facts that were never verified. One of our claims turns out to be wrong, and it is
better to correct it in our own file than to have a vendor or a partner correct it for us.

**Primary source:** `https://dotloop.github.io/public-api/` — the canonical Dotloop Public API v2
reference. **Page footer states "Last updated 2026-03-06."** Retrieved 2026-08-26. The full
document plus its PDF edition and a 2019 archived snapshot were compared.

## 3.1 Corrected table

| Claim in `99-scratch/v2-research/dotloop.md` | Verdict | What the primary docs actually say | Primary source |
|---|---|---|---|
| "You **cannot download document content**"; the API is "write-in, metadata-out" | **REFUTED** | The reference's own **Changelog** contradicts it. **07/26/2017:** "Introducing Document API to upload and **download** documents." **11/01/2017:** "Fix issue where opening **downloaded documents via the API** triggered a print dialog to appear." Download is a shipped feature Dotloop has since bug-fixed. | `https://dotloop.github.io/public-api/` §19 Changelog |
| `GET .../document/:did` returns "METADATA ONLY" | **PARTIALLY CORRECT** | §8.2 documents the endpoint with an explicit `Accept: application/json` header. Naming an Accept header is only meaningful under content negotiation — the JSON variant returns metadata; the doc never spells out the other variant. Same wording in the 2019 snapshot and the PDF edition, so this is long-standing under-documentation, not a recent change. | §8.2 Get a Document |
| "Verified by full-text search for `application/pdf` — only hits are in the upload section" | **CONFIRMED as a search result — but the inference drawn from it was wrong** | The search reproduces exactly: 2 hits, both in §8.3 Upload. The search was accurate; the conclusion was not, because §19 Changelog was never read. | §8.3; PDF edition |
| *(gap — not claimed)* Is there an Accept-header download variant? | **Mechanism identified, NOT primary-documented** | Two independent third-party clients implement download as `GET` on the **same** document URL with `Accept: application/pdf` (`sampatbadhe/dotloop-ruby`, `Loft47/dotloop_api`). This explains why §8.2 bothers to state `Accept: application/json`. **Corroborating only — not primary.** | GitHub, non-primary |
| "There is **no signature, signing-request, or e-sign-status endpoint**" | **CONFIRMED** | Every `signat*` hit is webhook security (`X-DOTLOOP-SIGNATURE`, `X-DOTLOOP-TIMESTAMP`, "Subscription Signing Key", HMAC-SHA-1). No signing resource in the 21-section TOC. | §14.3, §17.1, full TOC |
| "No `DOCUMENT_*`, no `TASK_*`, no signature/e-sign webhook event" | **CONFIRMED** | Exhaustive scan of every ALL-CAPS token returns no `DOCUMENT_*` or `TASK_*` constant of any kind. | §14.4 |
| The 16 listed webhook event types | **CONFIRMED — verbatim and complete** | `LOOP_CREATED`, `LOOP_UPDATED`, `LOOP_MERGED`, `LOOP_PARTICIPANT_CREATED/UPDATED/DELETED`, `CONTACT_CREATED/UPDATED/DELETED`, `PROFILE_UPDATED`, `USER_PROFILE_ACTIVATED/DEACTIVATED`, `USER_ADDED_TO_PROFILE`, `USER_REMOVED_FROM_PROFILE`, `SUBSCRIPTION_REMOVED`, `SUBSCRIPTION_DISABLED`. List post-dates the 05/20/2025 "new Webhook event types" changelog entry — it is current, not stale. | §14.4 |
| Webhook delivery: at-least-once, 5s timeout, retry backoff, 90-day retention, "Initial Release" | **CONFIRMED** | All verbatim. §14 is titled "Webhooks (Initial Release)". | §14.3, §16.1 |
| Loop Tasks are "read-only — no create/update/delete" | **CONFIRMED** | §10 contains exactly 4 endpoints, all `GET`, all `Required scope: loop:read`. No POST/PATCH/DELETE anywhere in §10. | §10 Loop Tasks |
| Loop Templates read-only (`template:read`) | **CONFIRMED** | §13: only two GETs. | §13 |
| Loop Activities GET list only | **CONFIRMED** | §11.1 GET only. Caveat: `meta.total` returns `-1`, so counting requires full pagination. | §11.1 |
| Verb inventory for Participants / Contacts / Profiles / Loops / Loop Details / Folders / Account | **CONFIRMED** | Matches exactly. Folders correctly have no DELETE. | §3–§9 |
| "Webhook Subscriptions — GET list/one, POST, PATCH" | **REFUTED (omission)** | **`DELETE /subscription/:subscription_id` exists** (§15.5, returns `204 No Content`). Our table omits it. | §15.5 |
| Base URL, OAuth URLs, ~12h token TTL, 100 req/min per user, scope set | **CONFIRMED** | `https://api-gateway.dotloop.com/public/v2/`; "expire usually after 12 hours"; FAQ "100 requests per minute for a user" with `X-RateLimit-*` and 429. | §1.2–§1.5, §20 FAQ |

**Unverifiable:** `support.dotloop.com` search returned **HTTP 401** — no official support-site
corroboration obtained. `github.com/dotloop` has **no public `public-api` repo**, so the doc
source could not be read. No live API calls were attempted (no credentials; a 401 would be
returned regardless of Accept header and would yield no information either way).

## 3.2 What must change in our written record

**Strike — affirmatively wrong:**

- **"You cannot download document content."** Dotloop's own changelog says the Document API
  uploads *and* downloads. Every downstream restatement must go with it: the bolded
  **"THE HARD LIMIT: you cannot get documents out,"** the **"write-in, metadata-out"**
  characterisation, and bullet 4 of the Bottom Line.
- Replace with: *"The endpoint reference documents only the JSON metadata response for
  `GET .../document/:id`, but §8.2 specifies an `Accept` header and the changelog states the
  Document API supports download; retrieval of binary content appears to work via
  `Accept: application/pdf` on the same URL. The mechanism is undocumented in the reference and
  unverified against a live token."*
- **"Do not apply for Dotloop API access… for an API that cannot return a document"** — the
  *reasoning* is factually wrong. The recommendation is unaffected, because it rests on the
  AI/ML clause, which is independent.

**Soften:**

- §2 table row for Loop Documents ("METADATA ONLY") → note the undocumented Accept variant.
- Add `DELETE` to the Webhook Subscriptions row.
- Record the doc's last-updated date (2026-03-06) so future readers know the retrieval baseline.
  Our file implicitly treats the Dotloop API as static; the changelog shows active maintenance
  (e.g. 07/17/2025 added `include_archived` on both Folder GETs).

**Keep as written — these held up fully:** the e-signature finding, the webhook event
enumeration and the "no DOCUMENT_*/TASK_*" conclusion, tasks read-only, templates and activities
read-only, and the auth/rate-limit/scope table. **The operative conclusion — that the demoed
"route it for e-signing" flow is not buildable on the Dotloop API — survives intact**, because it
rests on the absence of e-signature endpoints and the absence of document/task/signature webhooks,
both of which are confirmed.

## 3.3 The method lesson, recorded deliberately

The original pass ran a full-text search for `application/pdf`, got a **technically correct**
result, and generalised it into an absolute negative — without reading the changelog in the same
document. That is the specific failure mode to guard against.

**A negative claim ("there is no endpoint that…") requires a higher evidentiary bar than a single
keyword search.** It is not enough to fail to find something; you have to have looked where it
would be. Worth carrying into how RCRE writes up vendor research generally, and worth noting that
this correction was found by re-reading the *same* primary document more carefully — not by
finding a new source.

---

# CROSS-CUTTING: what this means, and what is still open

## The verified end-to-end path

Every endpoint in this chain was verified against a primary source:

1. **Stirling** `POST /api/v1/form/fields` — discover AcroForm fields in the contract
2. RCRE maps its own data to field names
3. **Stirling** `POST /api/v1/form/fill` (`flatten=true`) — produce a filled, locked PDF
4. **Documenso** `POST /envelope/create` — upload, define recipients/roles/signing order, place signature fields
5. **Documenso** `POST /envelope/distribute` — send
6. **Documenso** webhook `DOCUMENT_COMPLETED` → RCRE
7. **Documenso** `GET /envelope/item/{envelopeItemId}/download?version=signed` — retrieve the executed PDF with audit trail
8. **Documenso** `GET /envelope/{envelopeId}/certificate/download` and `/audit-log/download` — retrieve compliance artifacts

**Both approved decisions hold.** Documenso's Envelope API is real, current, and covers every
required capability including completed-PDF retrieval. Stirling can genuinely fill AcroForm
fields, so no additional PDF library is needed and the architecture does not change.

## Licence comparison at a glance

| | Documenso | Stirling PDF (core) |
|---|---|---|
| Licence | **AGPL-3.0** | **MIT** (with proprietary carve-outs) |
| Self-host, unmodified | Free, permitted | Free, permitted |
| Obligation if modified | **Must publish source under AGPL** | None (MIT) |
| Future commercial resale of RCRE | **Needs legal review** | Low risk — but re-verify carve-outs |
| Commercial licence available | Yes (Enterprise, "contact sales") | Yes (Stirling PDF User License) |
| AI/ML terms risk | **None when self-hosted** | None for MIT core |

## The five things most likely to go wrong

1. **Someone modifies Documenso.** It is one small patch away from AGPL §13 obligations. Adopt a
   standing "configuration only, never modify Documenso" rule.
2. **Someone uses documenso.com cloud "just to test."** The cloud ToS §4.2 grants Documenso a
   perpetual licence over uploaded content for "developing new products or features." Self-hosted
   only — treat this as a hard rule.
3. **The Documenso storage backend is left on the `database` default.** Migration between backends
   is explicitly not supported. Decide before the first real signature.
4. **Stirling ships with `corsAllowedOrigins: []`, which allows all origins with credentials, and
   with PostHog + Scarf telemetry not disabled by default.** Three config lines fix both.
5. **The Documenso signing certificate is generated inside the container.** Documenso's own docs
   warn against it. Losing that key means losing the ability to validate every previously signed
   document.

## Open questions — verify before building, do not assume

| # | Question | Why it matters | How to close it |
|---|---|---|---|
| 1 | Does Documenso `payload.formValues` actually match AcroForm field names? | Undocumented in the OpenAPI spec (no description text at all) | 15-minute experiment against a real RCRE form. **Resolves the §2.7 overlap.** |
| 2 | Does a completed PDF from the deployed version really come back with the audit trail attached? | Issue #2017 reported this failing on self-hosted v2.4.1 | Smoke test on the deployed version. Protects the most legally important artifact. |
| 3 | Does Documenso's `APPROVER` role hard-block signing until approval? | Issue #2526 questions the semantics | Test with a two-step envelope |
| 4 | Does Stirling's `auto-redact` remove underlying content or just draw boxes? | RCRE handles SSNs and bank details | Fill, redact, then extract text from the output |
| 5 | Which CA should issue RCRE's document-signing certificate, and at what cost? | Self-signed shows "signature cannot be verified" to title companies and lenders | Procurement question |
| 6 | Stirling's documented RAM/CPU/disk requirements | Not located in primary sources | Check `docs.stirlingpdf.com` before provisioning |
| 7 | Can Documenso whitelabeling/branding be done through configuration alone? | If it requires code changes, it triggers AGPL | Check config options before anyone edits code |

## Recommended next decisions

- **Record an ADR** adopting self-hosted Documenso CE (unmodified, API-only) and self-hosted
  Stirling PDF (REST API, MIT core only, no proprietary components).
- **Record the "never modify Documenso" and "never use documenso.com cloud" rules explicitly** —
  both are cheap to hold now and expensive to unwind later.
- **Flag the AGPL packaging question to legal before, not during, any ADR-0013 packaging work.**
  The five specific questions are listed in §1.8(c).
- **Correct `99-scratch/v2-research/dotloop.md`** per §3.2 — strike the "cannot download document
  content" claim and its downstream restatements.
- **Reconcile Documenso's storage choice against ADR-0001 (storage boundary)** before deployment.
