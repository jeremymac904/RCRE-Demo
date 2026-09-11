# RCRE Group Website Audit — rcregroup.com

**Audit date:** 2026-08-19
**Method:** Read-only. Public page fetches, sitemap enumeration, `robots.txt`, HTTP response
headers, and browser network inspection. **No change was made to the live site.**

---

## 1. Executive read

RCRE runs a competent, modern, vendor-hosted brokerage marketing site. It does the consumer side
adequately: it looks credible, it has real IDX search, real agent pages, real testimonials, and —
unusually for a brokerage this size — a genuine, actively-published local SEO content program.

It does the **business-critical side not at all**. There is no recruiting presence, no agent value
proposition, no lead ownership, and no system of record. The site is a brochure with a search box
attached, and every lead it generates lands inside a vendor platform RCRE does not control.

For a brokerage whose stated primary objective is **agent recruiting and retention**, the most
significant finding of this audit is a negative one: **rcregroup.com currently gives a prospective
agent no reason to join, and no way to raise their hand.**

---

## 2. Technology fingerprint

| Signal | Finding |
|---|---|
| `x-powered-by` header | **`Luxury Presence`** |
| Hosting | Static assets from **Amazon S3**, fronted by **Cloudflare** (`cf-ray … -MIA`) |
| App layer | Luxury Presence GraphQL (`POST /api-nv/graphql`), a `/federation` endpoint, `/api/v1/map` |
| Bot protection | Cloudflare challenge platform (`/cdn-cgi/challenge-platform/…`) |
| Caching | `cache-control: max-age=600, stale-while-revalidate=1200, public` |
| Footer credit | "Website design by Luxury Presence" |

**Luxury Presence** is a well-regarded, high-end real estate website vendor. This is a reasonable
choice and the execution is clean. It is also a **closed platform**: RCRE rents the site, the
consumer accounts, the saved searches, and the lead database.

### IDX / MLS data

Property URLs and page markup confirm **multiple MLS feeds aggregated by Luxury Presence**:

- **Greater Alabama MLS (GALMLS)** — confirmed by attribution text: *"courtesy of the Real Estate
  Brokers participating in the Greater Alabama MLS"*. Birmingham-area listings carry 8-digit IDs
  (e.g. `21447159`).
- **Northeast Florida MLS** — Jacksonville/Clay/St. Johns listings carry 7-digit IDs
  (e.g. `2140001`, `2149693`).
- **Stellar MLS / MFRMLS** — at least one Port Charlotte listing carries an `mfro…` prefix
  (`mfro6218901`).
- **South Florida (likely BeachesMLS/Miami area)** — Broward, Palm Beach, Miami-Dade, and Port
  St. Lucie listings carry 32-character hashed IDs, a different ID scheme from the others.

The GraphQL layer exposes `mlsId`, `mlsLogo`, `mlsAttribution`, and backfill parameters for
`MLSListingIds`, `MLSAgentIds`, `MLSOfficeIds` — i.e. Luxury Presence is normalizing several
distinct feeds behind one interface.

**Implication.** This is the single most important technical constraint on the project. Four-ish
MLS feeds is a substantial licensing, compliance, and engineering burden that Luxury Presence is
currently absorbing. Any plan that involves RCRE taking over its own IDX must budget for
per-MLS IDX agreements, per-MLS display and attribution rules, and per-MLS data retention terms.
**Replacing the IDX layer should not be an early-phase objective.**

---

## 3. Site architecture

### Sitemap inventory

`sitemap.xml` is an index pointing to five child sitemaps:

| Sitemap | Contents | Count |
|---|---|---|
| `sitemap-static.xml` | Core pages | **12** |
| `sitemap-agent-dpages.xml` | Agent profiles | **13** |
| `sitemap-blog-dpages.xml` | Blog posts | **27** |
| `sitemap-neighborhoods-dpages.xml` | County/neighborhood guides | **10** |
| `sitemap-properties-dpages--0.xml` | Property detail pages | 40+ (paginated, IDX-driven) |

### Static pages (complete list)

`/` · `/blog` · `/contact` · `/home-valuation` · `/neighborhoods` · `/properties/sale` ·
`/properties/sold` · `/team` · `/terms-and-conditions` · `/testimonials` ·
`/home-search/listings` · `/404`

**Notably absent:** any `/careers`, `/join`, `/join-us`, `/work-with-us`, or `/agents/join` page.
All return **404** (verified). There is also no `/about` page in the sitemap — `/about` 301-redirects.

### Navigation

Properties (Featured / Past Transactions) · Home Search · Home Valuation · Neighborhoods ·
Contact · Meet Our Agents · Testimonials · Blog · My Search Portal

### `robots.txt`

Disallows `/thankyou`, `/thank-you`, `/modules/`, `/internal/`, `/home-search/account`,
`/home-search/auth/`, `/api/`, `/cdn-cgi/`, `/modals.html`. Crawl-delays for SemrushBot,
SiteAuditBot, PetalBot, dotbot.

The `/home-search/account` and `/home-search/auth/` paths confirm a **consumer account system** —
registration, saved searches, "My Homes," "My Search." This is a real lead database, and it lives
inside Luxury Presence.

---

## 4. Content and coverage

### Geography

| State | Counties covered (neighborhood pages) |
|---|---|
| **Alabama** | Jefferson, Shelby, St. Clair, Blount |
| **Florida** | Duval, Clay, St. Johns, Nassau, Broward, Miami-Dade |

Listings additionally appear in Palm Beach, St. Lucie, Charlotte, and Homestead — i.e. **actual
listing coverage is broader than the marketing coverage**. There are no Georgia pages and no
Georgia listings observed.

Phone numbers: **AL (205) 851-8866** · **FL (904) 906-9038**.
HQ: **1 Chase Corporate Dr #400, Birmingham AL 35244**.

The geography is genuinely bifurcated: a Birmingham metro business and a Northeast Florida
(Jacksonville) business, plus scattered South Florida activity. These are different markets with
different MLSs, different competitors, and different recruiting dynamics.

### Blog — the strongest asset on the site

27 posts, all published recently (2026), all **county-scoped and intent-matched**. Examples:

- `first-time-homebuyer-steps-in-clay-county`
- `cdd-vs-hoa-fees-in-clay-county-whats-the-difference`
- `florida-homestead-exemption-in-duval-eligibility-and-savings`
- `military-relocation-to-duval-county-housing-guide`
- `best-jefferson-county-suburbs-for-birmingham-area-living`
- `timing-your-clay-county-home-sale-for-maximum-interest`
- `where-duval-countys-fall-2026-restaurant-wave-is-actually-landing`

This is a well-designed local SEO program: county-level targeting, a healthy buyer/seller/lifestyle
mix, and topics with real search intent (CDD vs HOA, homestead exemption, military relocation to
Jacksonville — NAS Jax is a major relocation driver). Whoever is producing this understands the
market.

**Every one of these posts is a lead magnet with no magnet attached.** They terminate in a generic
contact form rather than a topic-matched offer (a homestead-exemption checklist, a CDD-vs-HOA
comparison tool, a military relocation guide). That is the fastest available conversion win on the
entire site.

### Agents

**13 agents** in the sitemap; the homepage displays **9**. The roster is drifting — at least four
agents (`delonda-allen`, `johann-velez`, `lekeshia-jones`, `rodrigo-tello-sanchez`, `urban-garrett`)
have live profile pages but no homepage presence, and homepage-listed agents include names not in
the sitemap. **Confirm the true roster with leadership; do not trust either surface.**

Agent pages are substantive — photo, bio, multiple license numbers across states, phone, email,
office address, specializations, languages, social links, a personal listings feed, and
agent-specific testimonials. The qualifying broker's page carries 20+ listings and 8 testimonials.

**This is the single most important recruiting artifact RCRE already has** and it is the strongest
argument available for the platform pitch: *"this is what your page looks like the day you join,
and here's the system that keeps it filled."*

### Social proof

- "84 Properties Sold This Year"
- "22 Average Days on Market"
- Extensive testimonials, at both brokerage and agent level
- A "Our Certifications" logo section
- Facebook, Instagram, Zillow links

Brand positioning: *"Building Dreams One Home at a Time"*, "unparalleled service and expertise,"
clients treated "like family."

---

## 5. Conversion surfaces

| Path | Mechanism | Where the lead lands |
|---|---|---|
| Buyer | Contact form — name, phone, email, interest (Selling & Buying / Selling / Buying / Renting / Other) | Luxury Presence |
| Seller | `/home-valuation` — address, name, email, phone + opt-in consent | Luxury Presence |
| Cash offer | "Get Cash Offer" CTA | Unclear — needs confirmation |
| Search portal | `/home-search/account` registration, saved searches, "My Homes" | Luxury Presence |
| Newsletter | "EXPLORE HOMES FIRST — SUBSCRIBE FOR UPDATES!" | Luxury Presence |
| Agent-direct | Per-agent contact forms | Luxury Presence |
| **Recruiting** | **None** | **—** |

Other CTAs: "Explore Alabama Homes," "Explore Florida Homes," "Buy Properties," "List Your Home,"
"Get your instant home valuation," "Schedule a free consultation."

Consent language is present on the valuation and newsletter forms — good, and necessary for TCPA.

---

## 6. Gaps and opportunities, ranked

### Tier 1 — Strategic

**1. Zero recruiting presence.** No careers page, no agent value proposition, no commission or
split information, no "why RCRE," no application form, no way for a licensed agent to express
interest. For a brokerage whose primary objective is recruiting, this is the defining gap. Every
recruiting conversation currently happens entirely off-site and unassisted.

**2. No lead ownership or system of record.** Every lead — buyer, seller, valuation, portal
registration, newsletter, agent-direct — lands in Luxury Presence. RCRE cannot see cross-source
lead behavior, cannot route or score leads on its own rules, cannot measure agent responsiveness,
and cannot build anything on top of its own data. **This is the strongest argument for the RCRE
CRM, and it is independent of the website question.**

**3. No agent-facing value proposition, anywhere.** The site speaks exclusively to consumers. An
agent evaluating RCRE learns nothing about tools, support, training, marketing, lead flow, or
technology. The intended positioning — *"RCRE gives its agents an AI-powered real estate business
operating system"* — currently has no surface at all.

### Tier 2 — Conversion

**4. 27 blog posts with no topic-matched conversion.** Highest-ROI, lowest-risk fix available.

**5. Home valuation is a form, not a product.** "Instant home valuation" that arrives as a human
callback is a common source of lead disappointment. Confirm what actually happens.

**6. Neighborhood pages are marketing pages, not lead engines.** 10 county pages with no
market-report subscription, no new-listing alert by county, no county-specific offer.

**7. Roster drift between homepage and sitemap.** Live pages for agents who may no longer be with
the brokerage is a compliance and credibility risk. Needs an owner and a process.

**8. Marketing geography narrower than listing geography.** Listings in Palm Beach, St. Lucie,
Charlotte, Homestead with no corresponding content coverage.

### Tier 3 — Structural

**9. Vendor lock-in.** Site, consumer accounts, saved searches, lead database, and four MLS
integrations all sit inside Luxury Presence. Any migration plan must account for the fact that
**the IDX aggregation is the hardest part to replace and the least valuable to rebuild.**

**10. Two distinct markets, one undifferentiated brand.** Birmingham and Jacksonville are
addressed with the same voice and structure.

**11. No visible video.** No agent intro video, no market updates, no property video — despite
Jeremy having extensive video production tooling already built.

---

## 7. What is genuinely good and must not be broken

A rebuild is not obviously the right move, and this section exists to prevent one by reflex:

- The local SEO content program is real, current, and well-targeted.
- The agent profile pages are substantive and are RCRE's best recruiting asset.
- Multi-MLS IDX aggregation across ~4 feeds is working — expensive to replicate.
- The consumer search portal with accounts and saved searches functions.
- Design quality is credible for the price point.
- Testimonial volume and specificity are strong.
- The site is fast, cached, and bot-protected.

**The strategic conclusion is not "replace the website."** It is: *leave the consumer marketing
site where it performs, and build the layers RCRE actually lacks — recruiting, CRM, agent portal,
academy, and assistant — as owned systems that the marketing site feeds.*

---

## 8. Open questions this audit could not answer

Recorded in full in [../../02-discovery/DISCOVERY-QUESTIONS.md](../../02-discovery/DISCOVERY-QUESTIONS.md).
The most load-bearing:

- Which Luxury Presence plan, at what cost, on what contract term and renewal date?
- Where do leads go **after** Luxury Presence — is there a CRM behind it?
- Which MLSs is RCRE actually a member of, and who holds the IDX agreements?
- Is the blog content produced in-house, by Luxury Presence, or by an agency?
- What is the true agent roster, and who maintains it?
- Does "Get Cash Offer" route to an iBuyer, an investor partner, or RCRE?
- Is Georgia an actual operating market or aspirational?
