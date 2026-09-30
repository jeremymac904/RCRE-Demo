# Reusable data contracts

Snapshot: 2026-09-17. Paths below are relative to canonical `apps/rcre-demo/src/`; combine with the absolute root in the manifest. This is a map of actual types, not a newly implemented shared schema. `lib/domain-types.ts` models the earlier normalized database and uses a different role vocabulary; do not mistake its `Person` CRM contact for `VerifiedPerson`, the authoritative brokerage human identity.

## Current contracts

| Domain | Authoritative current source / symbol | Important fields and invariant | Reuse status |
|---|---|---|---|
| Agent identity | `lib/people/types.ts` `VerifiedPerson`, `PersonLifecycle`; `lib/people/catalog.ts` | Stable id/slug, publicTitle, brokerageRoles, operationalRoles, states/markets, arrays of sourced licenses/phones/addresses, provenance, original and derivative photo paths. One human, many states. Lifecycle keeps history. | PROVEN LOCAL |
| Operating user | `lib/platform/auth.ts` `PlatformActor` | id/userId, organizationId, role, teamId, officeId; derive identity server-side, never from model/body. Canonical person mapping supplies display data. | PROVEN LOCAL |
| Team | `PlatformActor.teamId`, members/settings in `lib/platform/auth.ts`, `settings.ts` | Current grouping by team/office; no independently managed reusable Team aggregate. | SIMULATED |
| Brokerage | `lib/domain-types.ts` `Organization`; `lib/platform/settings.ts` brokerage schema; PostgreSQL organizations/platform_key | Organization key fences records; configured public identity and document reviewers. RCRE organization and persona seed are not generic tenant provisioning. | PROVEN LOCAL |
| Market | `lib/public/metro-journal.ts` `MetroJournal`; people markets/state arrays | Slug/name/state/counties, source links and linked agents. Markets are editorial/source-backed, not a universal geographic ontology. | PROVEN LOCAL |
| Listing | `data/demo.ts` `DemoListing`; `lib/public/properties.ts` | Listing/detail display and inquiry refs; source/licensing/availability must be supplied. Fixture/legacy display data is not licensed IDX access. | SIMULATED |
| Lead capture | `lib/agent-website/site-model.ts` `WebsiteLead`; `site-service.ts` `leadSchema` | websiteId, agentId, organizationId, officeId, formType, contactId, consent, attribution/UTMs, timestamp, syncStatus. UUID requestId supports deduplication. `local_only` is not delivered. | PROVEN LOCAL |
| Contact | `lib/platform/service.ts` `Contact` extends `data/demo.ts` `DemoContact` | Owner/org/office/version; stage/source; FUB ID and sourceSystem; quarantine/deletion flags. Real/fixture selection is explicit. | PROVEN LOCAL |
| Task / appointment | `lib/platform/service.ts` `Task`, `Appointment` | Owner/org/office, due/start/end, optimistic version, source provenance. Imported records cannot be silently changed as FUB truth. | PROVEN LOCAL |
| FUB identity mapping | `lib/fub/user-mapping.ts` `FubUserMapping` | Numeric external ID string, candidate person IDs, status, reasons, version; only confirmed active unique binding resolves. Unknown users never create people. | PROVEN LOCAL |
| Content / blog | `lib/public/content.ts` `PublicContent`, `PublishedContent`; `metro-journal.ts` `MetroArticle` | Draft/published/archived, revision/history, visible metadata, canonical/noIndex/redirect, sources; locally published is not remotely deployed. | PROVEN LOCAL |
| Campaign / marketing | `lib/platform/service.ts` marketing functions; `components/MarketingComposer.tsx`, `MarketingBatches.tsx` | Versioned local records, office/owner scope, reviewer and scheduled item; discover runtime fields in service rather than invent a stable SDK interface. | PROVEN LOCAL |
| Asset | `lib/platform/library.ts` `LibraryAsset` | Mime/size/hash/version/previousId, owner/org, license/source/tags, archive; uploaded bytes stay private and permission checked. | PROVEN LOCAL |
| Course / lesson / resource | `data/academy.ts`, `lib/academy.ts` | Course/lesson/resource IDs, ordering and source content pointers. Curriculum rights are distinct from application-code rights. | PROVEN LOCAL |
| Training progress | `lib/academy-service.ts` `Progress`, `Assignment`, `CoursePolicy`, `AcademyDraft` | owner/org, completion/bookmarks/playback positions, role entitlement, target/exemptions, versioned reviewed authoring. | PROVEN LOCAL |
| Community | `lib/academy-community.ts` `Post` | Org/owner, moderation, attachments, comments/likes and optional lesson relation. Enrollment never grants CRM access. | PROVEN LOCAL |
| AI request | `lib/services/ai.ts` `AIConfig`; `openrouter-free/sanitizer.ts` `FreeRouterInput`, `AiStructuredSignal` | Provider policy server-owned; fixed instructions + anonymous allowlisted signals, not raw prompt/history/documents. Context switches and caps. | PROVEN LOCAL |
| AI result | `lib/services/ai.ts` `AIJob`; `openrouter-free/index.ts` | Conversation/owner/org, queued/running/local/external/failed/canceled states; unapproved text, scoped evidence links. Model output cannot set actor or authority. | PROVEN LOCAL |
| Approval / review | `lib/services/transactions.ts` `InspectionDraft`; marketing service; `lib/integrations/google/service.ts` proposals | Resource version/hash, reviewer/expiry/consumption and connection generation where applicable. No single universal Approval type exists; adapter must preserve each domain's predicates. | PROVEN LOCAL |
| Transaction | `lib/services/transactions.ts` `TransactionRecord`, `TransactionPolicy` | Owner/org/office/team/TC, representation, status/version, confirmed deadlines, checklist/comments, optional FUB lineage. Policy defaults are synthetic until leadership approves. | PROVEN LOCAL |
| Deadline | `lib/services/deadlines.ts` `DeadlineTerm` | Source term, effective date, day count/convention/timezone/holidays, confirmed flag, override reason. Model cannot certify legal meaning. | PROVEN LOCAL |
| Document | `lib/services/transactions.ts` `DocumentRecord`; `document-services.ts` | Private bytes/hash/version/ownership; `synthetic_unscanned` is an explicit production scanning gap. Local unsigned preview is not a signature. | PROVEN LOCAL |
| Testimonial | `VerifiedPerson.testimonials`, website types/catalog | Attributed text with source URL; do not synthesize production endorsements or review aggregates. No live review ingestion engine. | PROVEN LOCAL |
| Website configuration | `lib/agent-website/site-model.ts` `AgentSite`, `SiteContent`; `site-service.ts` strict schemas | Draft/published/version; personId projection; owner/org/office; theme and content; domain mode/status is a request workflow, not DNS provisioning. | PROVEN LOCAL |
| Social account | Google service connection types; marketing channel settings | Google owner-scoped connection exists. No unified authorized YouTube/Meta/GBP account aggregate or token runtime. | NOT IMPLEMENTED |
| Analytics | `site-model.ts` `SiteEvent`, `SiteSummary`; `lib/reporting/metrics.ts`; `lib/fub/intelligence.ts` | Narrow event enum + aggregate counts; backend source coverage and null unknowns. Local events are not GA4/Search Console data or proof of ROI. | PROVEN LOCAL |

## Proposed cross-workspace contract — PLANNED, not code

The ecosystem workspace owns versioned onboarding and reusable site configuration. Extend its existing schema instead of introducing another source of truth. Proposed fields to negotiate:

```ts
interface ProfessionalBuildRequestV1 {
  contractVersion: '1.0'; requestId: string;
  tenantRef: string; professionalRef: string;
  audience: 'loan_officer' | 'realtor' | 'team' | 'brokerage';
  identityConfigRef: string; // approved facts, licenses, brokerage and provenance
  siteConfigRef: string;   // existing mortgagewebsitebuilder config or future Realtor schema
  featureEntitlements: string[];
  contentCatalogRef: string; assetRightsManifestRef: string;
  leadDestinationRef: string; // resolved server-side; no emailed form bodies in this contract
  aiPolicyRef: string; integrationRegistryRef: string;
  approvals: { scope: string; evidenceRef: string; revision: number }[];
  mode: 'synthetic_review' | 'authorized_sandbox' | 'production';
}
```

IDs are opaque references, not authorization. Receiver authenticates issuer, tenant and entitlement separately; reject additional fields, cross-tenant refs, unverified destinations and duplicate request IDs. Do not include keys, OAuth tokens, borrower fields, CRM bodies, private messages, documents, or scraped member records. A configuration reference does not prove that it exists or is approved.

Proposed adapter result: `requestId`, `tenantRef`, `configRevision`, source commit/hash manifest, build artifact reference, verification evidence reference, missing-input codes, and one of `review_only|blocked|verified_local|authorized_release`. The receiving workspace must reconcile these proposed statuses with its existing contracts before implementation. Neither a build result nor a skill grants deployment or provider write authority.

## Schema migration / isolation constraints

1. Preserve one canonical human identity; map external users with `(organizationId, provider, externalUserId)` and explicit review. Do not duplicate Sarah or Margie to model another role.
2. Keep public display rights, operational permissions and licensing separate. Public REALTORS can also hold private TC roles.
3. Preserve source IDs, collection-start dates, tombstones and uncertainty. Count zero only when the result set and coverage justify it.
4. Require tenant and actor context at every service boundary; port the service checks as well as SQL fences. Current trusted server GUC setting and service-role credentials do not defend against an attacker holding that credential.
5. Move secrets through server secret references, not config JSON. Re-encrypt Google tokens for the target tenant/account key and AAD; never copy RCRE encrypted tokens/keys as reusable assets.
6. Native PostgreSQL record collections and older normalized schema are not interchangeable. Migrations0004–0009 plus platform_users bindings define the current runtime; `public.people` is a CRM-contact mirror, not canonical brokerage people.
