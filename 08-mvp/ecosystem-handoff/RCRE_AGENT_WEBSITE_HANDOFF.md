# RCRE agent website extraction handoff

Inspected 2026-09-17; documentation only. This is a local proving implementation, not a deployed website factory or a production SaaS offering.

## Source authority

Root `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE`; canonical app `apps/rcre-demo`. Git remote https://github.com/jeremymac904/RCRE-Demo; inspected branch `codex/rcre-ecosystem-handoff-2026-09-17`, baseline HEAD `d4ae90d8f40edcff3a2e5996ab0267e6c56c8966`. Working-tree sources contain additional uncommitted implementation. A GitHub checkout at baseline is **not** sufficient evidence that every path/function documented here is present. See manifest and final handoff commit in entry document. No live RCRE site or external ecosystem repository was modified.

All code paths below are relative to `apps/rcre-demo/` under the exact root above. GitHub baseline path form: `https://github.com/jeremymac904/RCRE-Demo/blob/d4ae90d8f40edcff3a2e5996ab0267e6c56c8966/apps/rcre-demo/<path>`; do not assume an untracked file has that URL.

## Entry points and functional architecture

| Capability | Path / contract | Status and evidence |
|---|---|---|
| Eight template presentations | `src/components/agent-website/AgentTemplatePreview.tsx`, `agent-template-preview.css`; `src/lib/agent-website/preview-catalog.ts`, `types.ts`; `/agent/preview/{rcre-signature,rcre-luxury,rcre-rural,rcre-investor,rcre-urban,rcre-suburban,rcre-new-construction,rcre-historic}` | PROVEN LOCAL for rendering; SIMULATED for showroom agents/business claims. `tests/site-rendering.test.ts`; dated September12 browser review. |
| Agent website management | `src/components/agent-website/management/WebsiteManager.tsx`, `management.css`; `/website`, `/website/settings`, `/website/gallery` | PROVEN LOCAL. Save, select template, preview, publish locally, unpublish and leads/events panels backed by services. `tests/agent-website-system.test.ts`, `agent-site-api.test.ts`. |
| Broker fleet | `/admin/website`; brokerage editorial CMS `/admin/website/content` | PROVEN LOCAL. Fleet management is separate from public CMS; share architecture carefully, not one generic permissions switch. |
| Published site / private preview | `src/app/sites/[slug]/page.tsx`; `/sites/{slug}`, `/website/preview/{id}` | PROVEN LOCAL. Published snapshot only; preview authorization; no private broker notes/domain requests projected publicly. |
| Canonical owner identity | `src/lib/people/{catalog,types}.ts`, `verified-roster.json`; `src/lib/agent-website/site-service.ts` | PROVEN LOCAL. Identity is projected from canonical people, not agent-editable invented name/title/license. `tests/agent-website-people.test.ts`, `verified-people-rendering.test.ts`. |
| Persistent local lifecycle | `src/lib/agent-website/site-model.ts`, `site-service.ts`; `src/lib/platform/store.ts`, PostgreSQL worker/store | PROVEN LOCAL. Uses shared records, not a separate website database. Historical September12 review mentions SQLite; current durable architecture uses PostgreSQL through the shared store. Tests may isolate with SQLite. See durable-data handoff. |
| External custom hostname | Domain mode path/subdomain/custom and status not_configured/requested/pending_verification/ready/active | BLOCKED EXTERNAL DEPENDENCY. Local path active; saving a hostname only records requested. DNS proof, certificate issuance, host mapping and production hosting are NOT IMPLEMENTED here. |

### Current identity warning

`08-mvp/AGENT-WEBSITE-SYSTEM-REVIEW.md` predates canonical-person reconciliation. Its Alex Morgan/Jordan Ellis/Rowan Hayes demo owner descriptions are historical, not today's authoritative roster. Follow `site.personId`, current `site-service.ts` identity projection and `08-mvp/PEOPLE-RECONCILIATION-AUDIT.md`. Verified public route is `/agent/{source-slug}`. Public profiles and website schemas use canonical Person identity; legacy aliases must not become duplicate Realtors. Synthetic internal operators/showroom previews remain explicitly separate.

## Reusable contracts and state changes

`SiteContent`: template, brand, name/title/biography, headline, hero/headshot, markets/specialties, phone/email, socialLinks, buyerContent/sellerContent/ctaText, resources/articles/videos, enabled forms, preferredLender, seoTitle/seoDescription/shareImage, aeo/geo/analytics. These fields are not all freely editable identities: service projection/schema enforce canonical identity and approved local assets.

`AgentSite`: id/slug/personId/legacySlugs, ownerId/organizationId/officeId, draft, published, version, publishedVersion, status draft/published/suspended, timestamps, license/disclosures/brokerNotes, domain request. Agent content cannot overwrite broker-controlled disclosures or scoping. Optimistic versions reject stale writes. Switching templates preserves content. Publishing creates a reviewed local snapshot; saving a draft does not replace public content. Suspension, unpublish and inactive owner block public retrieval.

Access: broker_owner and marketing_admin may manage organizational sites; managing_broker only scoped office; agent/team_leader own site, subject to canonical-person eligibility. TC/trainer do not acquire website-management authority. Read `allowed`, `canManageSites`, `activeOwner`, `getSiteFor` in `site-service.ts`; never trust caller owner/organization fields. Authentication is local persona review, not proof of production identity-provider readiness.

Eight intake types: buyer, seller, property, relocation, valuation, general, consultation, preferred_lender. `captureSiteLead` validates published/active site, enabled form, allowed market, consent and payload. One transaction persists website lead + assigned local contact + notification + optional submission event + audit. UUID request key prevents retry duplication. Attribution records page, market, source/campaign, UTM source/medium/campaign/content/term, landingPage and timestamp. UI requires saved ID and reports errors; consultation submission does not book a calendar or send a message.

FUB queue is **PROVEN LOCAL** as an outbox: `queueWebsiteLead` writes a hashed `website_fub_outbox` item with `externalWrites:false`; local_only→pending_sync is real. External FUB dispatch is **BLOCKED EXTERNAL DEPENDENCY** and must not be advertised as synced. Current read-only FUB activation does not grant write authority. `SyncStatus` includes synced/failed for future handling; type membership is not implementation evidence.

Approved content: broker/admin selects exact approved Marketing version; `approvedSource`, `publicResource`, `previewResource` enforce owner/org/current approved version and licensed, nonarchived asset. Private preview can expose approved content to authorized staff before publication. Public resource only exists when selected by an active locally published site; revoking approval/altering source invalidates access. Resources are not arbitrary private Academy/document URLs. Source-version approval and scope regression tests are in `tests/agent-website-system.test.ts`.

## Feature-by-feature extraction map

| Requested pattern | Existing implementation | Exact status / next boundary |
|---|---|---|
| Realtor homepage | Eight templates, shared `AgentTemplatePreview`, `SiteSections`, persisted configuration | PROVEN LOCAL. Needs configuration extraction and tenant-safe branding, not another demo copy. |
| Agent bio/headshot/profile | Canonical people; `public/VerifiedProfile.tsx`; `SiteSections.tsx` | PROVEN LOCAL. Preserve field provenance and 13-person identity. Portrait sizes/quality vary; replacement rights/identity verification are tenant work. |
| Markets | Saved selected markets, visible tags/service-area schema; public `/markets/*`, metro hubs | PROVEN LOCAL. Geographic claims are curated, not automatically inferred from transactions. |
| Listings/property details | Public `PropertySearch.tsx` and sample/boundary UX; templates may show editorial property imagery | SIMULATED inventory. Actual IDX/MLS inventory, attribution/licensing and property data: BLOCKED EXTERNAL DEPENDENCY. |
| Buyer/seller resources | Visible persisted copy and approved resources selections | PROVEN LOCAL. Local educational guidance, not lender eligibility or legal advice authority. |
| Open houses | No reusable public open-house event/RSVP product in agent-site model | NOT IMPLEMENTED. Portal appointments do not establish this website feature. |
| Home valuation | Valuation intake form and brokerage `/home-valuation` | PROVEN LOCAL for intake. Automated valuation/comparable feed: NOT IMPLEMENTED; no valuation amount is generated. |
| Reviews/testimonials | Brokerage testimonials route; source ownership safeguards | PROVEN LOCAL for static public content. Agent-specific verified review data/import system: NOT IMPLEMENTED; global source review feed must not be attributed to each Realtor. |
| Blog/local content/community guides | `public/MetroJournal.tsx`, `lib/public/{metro-journal,content}.ts`; selected approved site articles | PROVEN LOCAL. Not automatic original-reporting or unattended publishing. |
| Contact/lead capture | `SiteSections.tsx`, `/api/agent-sites/public/{slug}/leads`, `site-service.ts` | PROVEN LOCAL; 8 types, receipt, attribution, scope, persistence. Production delivery: BLOCKED EXTERNAL DEPENDENCY. |
| Calendar | Consultation request intake | PROVEN LOCAL for inquiry only. Agent-site booking/availability integration: NOT IMPLEMENTED. Google integration elsewhere does not automatically attach a booking engine here. |
| Social links | Validated label/url list rendered with rel=noreferrer | PROVEN LOCAL. Account OAuth, statistics and social posting: NOT IMPLEMENTED in website system. |
| YouTube | Configurable social link and approved video resource selections | PROVEN LOCAL for links/native licensed video. YouTube channel feed, OAuth, scheduled publishing: NOT IMPLEMENTED. Architectural ideas in `08-mvp/META-AND-YOUTUBE-LEAD-ARCHITECTURE.md` are PLANNED. |
| Google Business Profile | May be entered as generic external link | PROVEN LOCAL for generic link only. GBP ownership verification, posts, reviews and sync: NOT IMPLEMENTED. |
| AI assistant | Brokerage public chat and separate portal Assistant exist | PROVEN LOCAL in their own scopes. Per-agent tenant-configured website AI with scoped knowledge/lead authority: NOT IMPLEMENTED as a website-builder contract. |
| SEO | `site-seo.ts`: titles/descriptions, canonical, OG/Twitter, Person/ProfilePage/Breadcrumb/selected Article and qualified VideoObject | PROVEN LOCAL. Origin hardcoded localhost3200 and all agent sites noindex; production URL/indexing configuration must be extracted before external use. |
| AEO | Visible buyer/seller FAQ with FAQPage when enabled | PROVEN LOCAL for markup/content. Search-engine inclusion or answer placement: BLOCKED EXTERNAL DEPENDENCY. |
| GEO | Selected markets produce Service/areaServed schema | PROVEN LOCAL for markup. No generative-search ranking engine/monitoring; those are NOT IMPLEMENTED. |
| Analytics | 7 local event types, persisted counts, published analytics toggle | PROVEN LOCAL. Not unique visitors, GA4, Search Console, ad attribution or production traffic analytics; those integrations BLOCKED EXTERNAL DEPENDENCY. |
| RSS | No agent-site feed endpoint/subscription job in current route/model | NOT IMPLEMENTED. |
| Social content | Exact approved Marketing article/assets can be selected | PROVEN LOCAL for approval/projection. Cross-network publishing/scheduling: NOT IMPLEMENTED here. |
| Preferred lender | `/financing` link, option-controlled highlight, canonical Jeremy lender details and consumer choice | PROVEN LOCAL. Keep tenant-specific contact/license/branding; do not generalize Jeremy facts to all loan officers. |

## Tests and existing evidence

Use `tests/{agent-website-system,agent-site-api,site-rendering,agent-website-people,verified-people-rendering,public-redirects,public-calculator,metro-journal,public-chat}.test.ts`. These test files are inspected source, not a new test execution claim. September12 `08-mvp/AGENT-WEBSITE-SYSTEM-REVIEW.md` records a then-current 572-test full suite, 29 eight-template browser checks and 25 management assertions. Counts are historical; later identity/durable/AI work changed the suite. `08-mvp/AGENT-WEBSITE-MANAGEMENT-QA.md` contains management journey details; current browser artifacts reside under `runtime/browser-evidence` and may be untracked. `08-mvp/PEOPLE-RECONCILIATION-REVIEW.md` supersedes old synthetic identity assumptions.

Required receiving-workspace validation: two synthetic tenants with same human-readable names but distinct IDs; owner/broker/admin/outsider checks; snapshot publish/unpublish/suspend; exact-version content approval and revocation; local asset path safety; all eight intake forms and retry idempotency; analytics disabled; UTM retention; no fabricated sync/domain-active state; all eight designs desktop/mobile/both themes; keyboard navigation and reduced motion. Use synthetic captures only in external demos.

## Extraction recommendation

Candidate `realtor-website-builder` Skill is supported by a **PROVEN LOCAL** rendering/editor/intake pattern, but the Skill itself is **PLANNED** and must not be created in this documentation task. Extract configuration/type boundaries and a service interface first; preserve brokerage-owned disclosures, canonical person IDs, independent org/office authorization, approved resource versions and explicit external-delivery states. Replace localhost origin, RCRE-specific seeds/brand/lender/market content and local persona login through deliberate tenant adapters. Keep deployment/domain/IDX/review/social/booking providers unconfigured until separately verified.

Recommended AI Realtor Pro presentation: synthetic interactive preview or recorded walkthrough plus “request a custom build.” Classify full website builder as NEEDS EXTRACTION, current presentations as DEMO ONLY, and live social/IDX/GBP/automated scheduling promises as NOT READY. The external website ecosystem remains authoritative for its own shared onboarding/configuration/Skill architecture; no new factory is created here.
