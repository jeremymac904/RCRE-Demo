# Website Optimization Backlog

**Date:** 2026-08-19 · **Scope:** improvements **within and around** Luxury Presence.
**Not in scope:** replacing the platform (ADR-0005). Nothing here touches the live site
without Jeremy's authorization.

---

## The governing principle

**SEO is the foundation. There is no separate "GEO hack".**

Traditional search, AI Overviews, AI Mode, answer engines and LLM retrieval all reward the
same thing: original, specific, locally authoritative content that answers a real question
better than the alternatives. Content built to game retrieval reads as built to game
retrieval, and increasingly gets treated that way.

**Explicit anti-goal: no mass-generated location pages.** Thousands of near-identical
"Homes for sale in [neighbourhood]" pages is the single most common brokerage SEO mistake.
It dilutes the domain, competes with the IDX pages that already exist, and produces exactly
the thin content that both classical ranking and LLM retrieval discount. RCRE's 27 existing
county-level posts are worth more than 2,000 generated ones.

---

## What is already good — do not break it

From the website audit:

- **27 county-scoped blog posts** with genuine search intent (CDD vs HOA, homestead
  exemption, military relocation to Duval). This is a real asset and someone competent is
  producing it.
- **13 substantive agent profile pages** with bios, multi-state licences, personal listing
  feeds and individual testimonials.
- Working multi-MLS IDX across ~4 feeds.
- Consumer search accounts with saved searches.

The backlog below adds to this. It does not restructure it.

---

## P0 — highest return, lowest risk

### 1. Topic-matched offers on the existing 27 blog posts
**Problem:** every post ends in a generic contact form. A reader who just finished
"Florida Homestead Exemption in Duval" has demonstrated precise intent and is offered
nothing relevant.

**Do:** one matched offer per post — a homestead filing checklist, a CDD-vs-HOA comparison,
a military relocation guide, a Clay County first-time buyer walkthrough.

**Why first:** cheapest conversion win available. The traffic already exists.

**Depends on:** RCRE lead capture (built) + landing pages. Attribution captured at the form.

### 2. Owned lead capture alongside the vendor's
**Problem:** RCRE owns none of its lead data. Every lead lands in Luxury Presence.

**Do:** post every form submission to `POST /api/leads` in addition to the vendor path, then
forward to FUB via the Events API.

**Why:** `first_touch_at` and campaign attribution cannot be reconstructed later. Every day
without this is data permanently lost.

**Needs:** whether Luxury Presence forms can post to a second endpoint, or whether a
lightweight script is required. **Discovery C15.**

### 3. Agent roster reconciliation
**Problem:** 13 agent pages in the sitemap, 9 on the homepage. Live profile pages for
agents who may have left is a credibility and compliance exposure, not just untidiness.

**Do:** reconcile site ↔ MLS ↔ roster. Assign an owner and a recurring check.

### 4. Recruiting presence
**Problem:** `/careers`, `/join`, `/join-us`, `/work-with-us` all 404. For a brokerage whose
primary objective is recruiting, there is no surface at all.

**Do:** the RCRE-owned recruiting page (prototype built at `/join`), linked from the main
site navigation and footer.

---

## P1 — structural

### 5. Structured data
Add and validate: `RealEstateAgent` per agent page, `RealEstateListing` on property pages
(within MLS display rules), `LocalBusiness` + `Organization` with correct AL and FL
addresses, `BlogPosting` with author attribution, `FAQPage` where genuine Q&A exists,
`BreadcrumbList`.

**Why it matters for answer engines:** entity clarity is what lets a retrieval system state
"RCRE Group is a brokerage in Birmingham and Jacksonville" with confidence. Schema is the
cheapest way to be unambiguous.

**Caution:** never mark up FAQ content that does not visibly exist on the page.

### 6. Agent authority
Each agent page currently has a bio and listings. Add, where the agent will genuinely
sustain it: neighbourhood specialisation stated plainly, a short intro video, their own
content, credentials and certifications, and consistent NAP across the site, Google Business
Profile and Zillow.

**Why:** agent-level authority is what makes "who is a good agent in Mandarin?" answerable
with a name. It is also a retention and recruiting asset — an agent whose personal brand is
built on RCRE's site has a reason to stay.

### 7. Genuine local expertise content
Extend what already works. Topics from real questions, answered specifically:

- Military relocation to NAS Jacksonville — PCS timing, BAH, VA loans in Duval and Clay
- CDD vs HOA — the actual arithmetic, with real community examples
- Homestead exemption filing — Duval, Clay, St. Johns, Nassau, with deadlines
- Over-the-Mountain suburbs — Jefferson and Shelby, honest tradeoffs
- New construction vs resale in St. Johns
- Flood zones and insurance — coastal Florida reality

**Rule:** if the piece could have been written by someone who has never worked the market,
it is not worth publishing. Local specificity is the entire moat.

### 8. Google Business Profile alignment
Verify both AL and FL locations, exact NAP match, correct categories, posts, Q&A seeded with
real questions, and review responses. GBP is disproportionately influential for
"real estate agent near me" and for AI answers about local businesses.

### 9. Search Console and analytics baseline
Verify Search Console for both states' content, submit sitemaps, establish a query and
landing-page baseline **before** changes, wire GA4 events for every conversion path, and
tag every campaign consistently.

**Why now:** without a baseline, none of the work below can be proven to have helped.

---

## P2 — conversion and depth

### 10. Neighbourhood pages that earn their existence
Improve the **10 existing county pages** rather than generating more. Each should have: a
market snapshot with real numbers, genuine local knowledge, the agents who work it, a
market-report subscription, and a county-specific new-listing alert.

**Ten strong pages beat a thousand thin ones.** This is the point at which most brokerage
SEO programmes go wrong.

### 11. Home valuation honesty
"Instant home valuation" that arrives as a human callback is a common source of lead
disappointment and a trust cost. Either deliver something instant, or say plainly what
happens next.

### 12. Video
No video anywhere on the site currently — despite Jeremy having extensive production
tooling. Start with agent introductions and county market updates. Video is
disproportionately effective for agent authority and is reusable across social.

### 13. Internal linking
Blog → relevant county page → agents who work it → listings. Currently these exist as
islands. Contextual, non-templated links only.

### 14. Technical SEO pass
Core Web Vitals per template, mobile rendering, canonical handling on IDX pages, crawl-budget
review (IDX sites routinely waste it), 404 audit, and confirmation that the four
`Disallow` paths in `robots.txt` are still intentional.

### 15. Conversion path instrumentation
Measure: blog → offer → lead, county page → alert signup, agent page → contact, valuation
start → completion, search portal registration → first inquiry.

**Then optimise the worst one.** Not before.

---

## Explicitly not doing

| Not doing | Why |
|---|---|
| Mass AI-generated location pages | Thin content, dilutes the domain, competes with IDX |
| Replacing Luxury Presence | ADR-0005. Not this phase |
| A separate "GEO strategy" | Good SEO already is the answer-engine strategy |
| Keyword-stuffed agent bios | Reads as spam to humans and machines |
| Buying links | Risk with no upside |
| Duplicating IDX pages | The vendor already handles this under MLS terms |
| Blog volume for its own sake | 27 good posts beat 200 filler ones |

---

## Sequencing

**Now (no site change):** #2 lead capture, #9 measurement baseline, #4 recruiting page.
**Then (small site changes):** #1 topic-matched offers, #3 roster fix, #5 schema, #8 GBP.
**Then (ongoing):** #6 agent authority, #7 content, #10 county pages, #12 video.
**Continuous:** #13 internal linking, #14 technical, #15 conversion measurement.

---

## Open questions

1. Can Luxury Presence forms post to a second endpoint, or is a script needed? *(C15)*
2. Who produces the blog, and what does it cost? *(C12)*
3. What CMS control does RCRE actually have vs. vendor support? *(C15)*
4. Is Search Console already verified, and by whom?
5. Are both GBP locations verified and claimed?
6. Where does "Get Cash Offer" route? *(C13)*

---

# Leadership objectives — 2026-08-24

Added after [Taquilla Allen's discovery answers](../02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md) §8.
Everything above this line was inferred from an external audit. Everything below is what
leadership actually asked for, and it takes precedence where the two differ.

> "Right now, the website is pretty much just there."
> — Taquilla Allen, Managing Broker

That is leadership's own assessment, and it independently confirms the audit's conclusion. Useful
to note: the audit and the broker reached the same verdict from opposite directions.

## The six stated objectives — **[VLR]**

| # | Objective | Maps to backlog item | Gap |
|---|---|---|---|
| W1 | Generate **buyer** leads | #1 topic-matched offers, #2 owned capture, #10 neighbourhood pages | Covered |
| W2 | Generate **seller** leads | #11 home valuation honesty | **Under-served.** Seller acquisition is one item; leadership names it as a co-equal objective |
| W3 | Attract potential **agents** | #4 recruiting presence | Covered, and now higher priority |
| W4 | Improve **SEO** presence | #5, #7, #8, #9, #13, #14 | Covered |
| W5 | **Showcase RCRE agents** | #3 roster reconciliation, #6 agent authority | Covered |
| W6 | Integrate with **Follow Up Boss** | Not in the original backlog | **Missing entirely** |

Two real gaps, and W6 is the more consequential.

## New backlog items

### 15. Follow Up Boss as the destination for every website lead — **[VLR]**

Every form on the site — buyer inquiry, seller valuation, listing inquiry, agent recruiting,
newsletter — lands in FUB as a properly attributed lead, via `POST /v1/events` and never
`POST /v1/people` (see [ADR-0012](../06-decisions/adr/0012-follow-up-boss-incumbent.md) and
§4 of the FUB verification).

**Why this is first among the new items:** it is the seam between the website and the
accountability loop. A website lead that does not reach FUB is invisible to every alert, every
metric and every priority list the rest of this project builds. It also makes website performance
measurable in the same currency as everything else — leads, response time, conversion — rather
than in traffic.

**[DP]** Recruiting inquiries route to the confidential recruiting pipeline, **not** into the
general contact database. A prospective agent is usually licensed somewhere else; their inquiry
must not be visible to the agent roster.

### 16. Seller acquisition as a first-class track — **[VLR]**

Leadership names seller leads alongside buyer leads. The current site treats valuation as a single
utility page. Sellers search differently, convert on different offers, and decide over a longer
window than buyers.

**[DP]** A seller track: "what is my home worth" with an honest range and a human follow-up rather
than an instant number; equity and timing content; recently-sold proof by neighbourhood; a
listing-preparation offer. Item #11's honesty principle governs all of it — an inflated instant
estimate wins the lead and loses the appointment.

### 17. AEO and GEO discoverability — **[DP]**

Not requested by leadership. Our own forward look, recorded as a proposal, not a requirement.

Search is increasingly answered rather than listed. Being *citable* is a distinct discipline from
ranking: direct question-and-answer structure, factual claims with dates, clear entity definitions
for RCRE and its agents, and content that reads as a source rather than as marketing.

**[TA]** This is a bet on where discovery traffic goes, not a measurable channel today. It should
be built as a by-product of doing #5 (structured data) and #7 (genuine local expertise) properly,
not as separate work with its own budget.

### 18. Attribution end to end — **[DP]**

Source, campaign, page and first-touch carried from the website into FUB and preserved through
the funnel, so "where do our best leads come from" is answerable with the same lineage as
everything else in Command.

## Priority change

Items **#2 (owned lead capture)** and **#4 (recruiting presence)** were already P0. They are now
joined by **#15 (FUB integration)** at P0 — without it, the other two produce leads the rest of
the system cannot see.

**Not authorised:** none of this touches the live site until Jeremy says so. The live RCRE website
remains off-limits (CLAUDE.md, hard constraint 3).
