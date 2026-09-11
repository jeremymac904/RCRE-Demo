# RCRE local review handoff

The canonical production application is running at **http://localhost:3200/** from `apps/rcre-demo` in the existing RCRE project. Preferred Lender: `/financing`. Public site, portal and local backend share that origin. Editing agents are stopped; the app and its necessary local scheduling/reminder worker remain running.

## Latest public-site upgrade

The homepage now includes a photographic market explorer and working move planner. `/blog` has one searchable18-story journal, with dedicated `/blog/metros/birmingham`, `/blog/metros/jacksonville`, and `/blog/metros/south-florida` hubs. Ask RCRE is available throughout the public site with persisted public-only conversations; it is explicitly a site guide until an allowed local model is configured. The increment passed538 tests,77 production browser checks and18 axe scans with no violations; production build passed. Latest backup: `runtime/backups/platform-1788919629295.sqlite` with paired `.files` bundle. See `PUBLIC-ELEVATION-REVIEW.md` for new implementation, current test evidence, photography credits and precise AI boundary. Earlier Lighthouse scores below describe the earlier public layout and must not be treated as remeasured scores for this redesign.

## Review access

Open `/login` and choose a clearly labeled synthetic identity. No password or real brokerage credentials are needed.

| Identity | Role and scope | Start with |
|---|---|---|
| Alex Morgan | Florida Agent | Today → contact → task → Pipeline/Calendar |
| Jordan Ellis | Alabama Agent | Today → CRM; configured local campaign attribution |
| Casey Brooks | Alabama Team Leader | Agents → Jordan’s evidence; office lead policy |
| Morgan Reed | Alabama Managing Broker | Command → reporting → approvals |
| Taylor Hayes | Broker Owner | All-office Command, settings/people, CMS, audit/data |
| Riley Parker | Florida Transaction Coordinator | Transactions → document → inspection draft → local review/outbox |
| Avery Lane | Marketing/Admin | Content Library → upload → compose → review → editorial calendar |
| Quinn Davis | Trainer | Classroom/Community → authoring → assignments → independent course review |

These are local personas, not assertions about real personnel. Invitation/recovery links are one-use and captured only in the owner’s local mailbox. Local sessions are opaque, expire after12hours and support revocation.

## Public and portal coverage

Public Home, About, agent directory/profiles, Alabama/Florida community families, listing search/list/map/detail, favorites/saved searches, buyer/seller/valuation/relocation/investor guidance, articles/resources, recruiting, contact, privacy/terms/accessibility/consent and financing are connected. Source and legacy URL coverage is in `.runtime/public-source/inventory.json`; source claims and unavailable/rights-sensitive material are held in the CMS review queue. Demonstration listings and illustrative artwork are labeled.

Jeremy’s page includes the exact user-supplied contact/NMLS/brand block, consumer choice, financing pathways, FAQ, an assumption-driven payment calculator, local inquiry and the verified application destination `https://www.loanfactory.com/jeremymcdonald`. No sensitive borrower documents are collected by that inquiry.

Portal workflows use durable canonical records: Today, scoped CRM, Pipeline, Calendar/day planning, Command/agent inspection/reporting, transaction/document preparation, version-specific approvals, marketing media/editorial calendar/batches, recruiting, Community, real imported Classroom curriculum, authoring/assignments, settings, CMS and integration boundaries. FUB source edits are proposals; source deletion remains archived and historical evidence is retained. Course publication requires an independent submitting-editor review. The imported curriculum remains14 courses,181 lessons,243 resource references and220 prompts, with2 actual videos; unprovided recordings are not represented as completed media.

## Verified results

- **525 tests across31 files pass**, TypeScript passes, and the final production build passes. Lint:0 errors,18 warnings. Dependency advisory audit:0 known vulnerabilities.
- **20 final-production Axe page/theme checks:0 violations** for WCAG2A/AA/2.1AA rules tested. **83 responsive/theme/focus/reduced-motion checks:** no horizontal overflow or page JavaScript errors at375/768/1024/1440 widths. Native browser zoom was not verified; a720px reflow simulation is explicitly labeled.
- Three serial Lighthouse mobile runs per representative production page: median Performance **Home97 / Financing97 / Buying98**; Accessibility, Best Practices and SEO **100 for each**. These are local lab measurements, not field Core Web Vitals or ranking promises.
-13 cross-module checks cover shared course approval navigation, linked-media approval invalidation/private access, campaign fixture attribution and consented recruiting linkage/revocation.8 access/settings checks cover invitation, recovery, token replay, mailbox scope, source choices and stage labels. Existing role/task/CMS/transaction/classroom/media workflows have additional evidence in their registers.
- Actual PDF page geometry and unsigned placement previews were rendered; invalid pages and cross-agent access were denied. Exact PDF hash/version, recipients and fields bind local preparation/review. **No cryptographic signature was fabricated.**
- Restart from development to the production app preserved the existing opaque session and exact response hashes for26 contacts,7 tasks including1 completed, personal preferences and8 recruiting records.
- Final backup: `runtime/backups/platform-1788916762755.sqlite` and paired `.files` bundle. SQLite SHA-256 plus all41 mutable-file hashes match. Prior isolated restore-copy exercised the canonical app against a copied backup without overwriting live data. In-place destructive restore/reset is untested.
- Original PostgreSQL migrations passed8 actual least-privilege SQL policy checks in PGlite. **Canonical new schema/role PostgreSQL parity is not established.** The running local repository is SQLite with server-enforced resource scopes.

## Exact activation dependencies and limits

1. **AI/Hermes:** an existing permitted local model is unavailable. The installed read-only Python runtime aborted during the owner-contained OS isolation probe, so actual Hermes startup/inference remains blocked. Dedicated lifecycle/storage/credential boundaries are implemented;5 process ownership/cleanup checks used a synthetic Node process, not Hermes inference. No paid fallback or shared Hermes instance was invoked. A compatible sandboxed runtime and allowed local model must be verified before activation.
2. **Signing/document services:** compatible local Documenso engine, credentials, signer sessions and verified callbacks are absent. External Stirling/OCR and malware-scanning services are not activated. Local PDF inspection/unsigned preview and document version workflows work independently.
3. **FUB:** account credentials, confirmed mappings/scopes/history coverage and explicit authorization are needed for any live read/write/webhook registration. Local signed protocol fixtures, queues, retries, reconciliation, deletions, assignment projection and proposed source edits are verified; no production FUB operation occurred.
4. **IDX and communications/channels:** approved IDX/MLS account and redistribution rights; Google/Microsoft calendar scopes; mail/identity provider setup; RCRE-specific Meta/Ads/YouTube/Business Profile credentials and publishing authorization remain absent. Local captures, calendar records and approved-content outboxes do not send or publish.
5. **Production database:** a project-contained native PostgreSQL runtime/deployment plus canonical schema/role/RLS migration verification is required before production activation. Original migration checks do not establish that parity.
6. **Content/legal:** authorized Jeremy portrait and any additional brand/property media; inaccessible source material; brokerage factual conflicts; final public privacy/terms/advertising/endorsement, state eligibility and commercial-arrangement review. No fabricated office, biography, rate, testimonial, instant valuation or compliance approval fills those gaps.

No production deployment, DNS, customer data, real messages, ads, social publishing or paid AI was activated. Full modular section-builder functionality is not claimed; public CMS supplies complete body/image/profile/navigation/metadata revisions and published redirects, with source layouts preserved.

## Storage and approval-review record

Controlled application files, databases, caches, browser profiles, downloads and reports were directed inside RCRE. No installed Hermes, shared launch configuration or original training asset was intentionally modified. The source hash inventory is retained.

Known OS-created exceptions, inspected read-only and not removed: `Google Chrome-2026-09-08-185040.ips`, `python3.12-2026-09-08-205939.ips`, and `python3.12-2026-09-08-205954.ips` in the user’s `Library/Logs/DiagnosticReports`. Earlier initial commands did not all set explicit npm cache paths, so zero historical outside writes is not proven.

Automatic approval review rejected a destructive reset-guard test because a race could erase persisted records. It was not executed. A read-only stopped-server guard and non-destructive restore-copy checks were used instead. No approval bypass was attempted.

See `IMPLEMENTATION-REGISTER.md`, `LOCAL-OPERATIONS.md`, `academy-build-register.md`, `transactions-ai-build-register.md` and the linked JSON evidence for precise boundaries and repeatable commands.

## September 9 cinematic media update

See [CINEMATIC-REVIEW.md](CINEMATIC-REVIEW.md) for the new three-film gallery, six licensed photos across all 18 journal articles, current verification, and the disclosed encoder-installer cache containment incident. Review /#rcre-films and /blog on port 3200. New provenance files document actual source locations; nonlocal editorial media is labeled. Existing roles, lender details, and external integration dependencies remain unchanged.
