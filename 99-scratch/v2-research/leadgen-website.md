# V2 research — Alabama lead-gen test framework · website & IDX decisions

**Date:** 2026-08-26 · **Status:** RESEARCH / PLANNING ONLY. No code, no migrations, no connections.
**Author:** research pass for the RCRE Platform V2 upgrade. Feeds the coordinator's synthesis.

**Label discipline (inherited from `02-discovery/leadership-answers/2026-08-24-TAQUILLA-ALLEN.md`):**

| Label | Meaning |
|---|---|
| **[VLR]** | Verified leadership requirement — RCRE said it |
| **[DP]** | Design proposal — ours, not approved |
| **[TA]** | Technical assumption — believed, not verified |
| **[EXT]** | External research finding, with source. Third-party data, not RCRE truth. |

Nothing in this file is legal advice. Several items below are explicitly marked as requiring
counsel or a licensed compliance review.

---

# PART A — The 90-day Alabama lead generation test

## A0. What the meeting actually established

From the 2026-08-26 transcript (`RCRE & Jeremy AI + … Notes by Gemini.md`, ~00:34:56–00:41:40):

| Fact | Label | Verbatim anchor |
|---|---|---|
| RCRE has **two agents** in Alabama today; Julio and Taquilla also work the market | **[VLR]** | *"Right now we have two and there's me and Julio work out there as well"* |
| Market is **"Birmingham and the surrounding areas"** | **[VLR]** | Taquilla |
| Jeremy offers ad campaigns for a **90-day test**, contingent on agents **calling leads within 5 minutes** | **[DP]** | *"if it's something to where that they can commit to, you know, calling those leads within the first 5 minutes"* |
| Zillow takes **"5 to 40%"** at closing, **no monthly spend** | **[VLR]**, but see A6 | Julio + Taquilla |
| Julio's read: **USDA "definitely"**, first-time buyer yes, **DSCR "probably be a little tougher" … "cuz rents are still pretty low over there"** | **[VLR]** | Julio |
| Julio has MLS access to **Miami, Orlando/Stellar, Gainesville** plus NE FL — *"pretty much state coverage as far as MLS's"* | **[VLR]** | Julio |
| Agents in those FL markets: **one on the team in North Miami**; *"a couple down there that would … could do referrals"* | **[VLR]** | Julio |
| Julio raised speed-to-lead unprompted for the Miami idea | **[VLR]** | *"you got to pick up you know speed to lead"* |
| RCRE has **only a Facebook page** — no Instagram, no YouTube | **[VLR]** | Taquilla |
| Success in Alabama → **expand to Northeast Florida** | **[DP]** | Jeremy |

**Note the sequencing dependency nobody stated out loud.** Meta lead ads deliver against a Facebook
Page. YouTube ads need a channel. RCRE has one Page and nothing else. Taquilla's action item
("get with the social media guy") is therefore **on the critical path for the ad test**, not a
parallel nice-to-have. If the IG/YouTube accounts are not created and connected to a Business
Manager, the Meta half of the test can still run off the existing Page but the YouTube half cannot
run at all.

---

## A1. Birmingham market conditions — testing Julio's read

All figures **[EXT]**. Sources listed at the end of Part A. Where sources disagree I say so rather
than picking the flattering number.

### A1.1 Price and velocity

| Measure | Value | Source |
|---|---|---|
| Birmingham median sale price, 3 mo ending May 2026 | **$210,000**, up **15.6% YoY** | Redfin |
| Days on market | **55 days** (was 46 last year) | Redfin |
| Homes sold, May 2026 | **587** (was 644) | Redfin |
| Metro-wide median *purchase* price implied by Realtor.com | **~$250,000** | derived, see below |
| Zillow ZHVI, Birmingham city | **$137,168**, **down 2.3% YoY** | Zillow |

**The sources disagree hard and it matters.** Redfin says +15.6%; Zillow's ZHVI says −2.3%. These
are different instruments (median of what sold vs. a value index across all homes), and the gap is
the signature of a **mix shift** — fewer, higher-priced homes transacting while the broad low end
softens. Prices up, volume down, DOM up. That is a market where **the buyer has leverage and the
listing side is slower**, which argues for buyer-side campaigns over seller-side ones in the test.

**Do not present a single "Birmingham median" to leadership.** Present the pair and the mix-shift
reading. Julio and Taquilla will know which one matches what they see, and that is a better input
than an average.

### A1.2 Rent

| Measure | Value | Source |
|---|---|---|
| Median monthly rent, Birmingham metro | **$1,300** | Realtor.com investor report, Aug 2026 |
| Average apartment rent | **$1,360** (+2.09% YoY) | RentCafe |
| Average rent (all types) | **$1,150** — 41% below national | Zillow Rental Manager |
| 3BR average | **$1,667** / 1,376 sq ft | RentCafe |

**Julio is right that rents are low in absolute terms.** $1,150–$1,360 against a national average
near $1,950 is the definition of a low-rent market. He is not right that this alone kills the
investor thesis — see A1.4.

### A1.3 Investor activity — this **contradicts** the assumption that Birmingham is a thin investor market

This is the most important external finding in Part A.

| Measure | Value | Source |
|---|---|---|
| Investor share of Birmingham metro homes sold, 2025 | **21.0%** | Realtor.com, released 2026-08-16 |
| National rank by investor share | **#4** (behind Memphis 23.7%, Kansas City 21.2%, St. Louis 21.1%) | Realtor.com |
| National rank by **net** investor buying (bought minus sold) | **#1 in the United States**, +6.6pp gap | Realtor.com |
| YoY change in investor share | **+3.2pp** — among the fastest accelerations nationally | Realtor.com, June 2026 report |
| Median price paid **by investors** | **$206,000** | Realtor.com |
| Institutional share, 2015–2025 | **3.8%**; mid-size investors (100–349 buys) **+2.7%** | Realtor.com |
| Corporate/hedge-fund activity now | *"drastically pulled back, hitting a decade-plus low"* | Bham Now summary of the report |

**Read this carefully, because the headline and the useful fact are different things.**
Birmingham is #1 in the nation for net investor accumulation, and the buyers doing it are
**small and regional, not institutional**. Institutions are at a decade low. The 21% is being
driven by exactly the 1–10-door investor who is the customer for a DSCR loan and who needs an
agent.

Taquilla's own read in the meeting — *"you do have the small investors coming in, but not, you
know…"* — understates it by a wide margin. There is a large, accelerating, non-institutional
investor buyer pool in Birmingham. **[EXT]**

### A1.4 Does DSCR pencil in Birmingham? The arithmetic

Julio said DSCR would be *"a little tougher … cuz rents are still pretty low."* The evidence says
**he is right about the loan and wrong about the market**, and those are two different claims that
got fused into one sentence. Here is the arithmetic.

**Inputs** (all **[EXT]** except rate, which is **[TA]**):

- Purchase price at the investor median: **$206,000**; median rent **$1,300**
- DSCR note rate assumed **7.75%**, 30-yr fixed **[TA]** — DSCR paper prices roughly 100–150bp over
  agency; published 2026 ranges cited 6.5%–8%
- **Alabama Class II assessment.** Tenant-occupied residential is **Class II, assessed at 20%** of
  fair market value; owner-occupied is **Class III at 10%**. A rental's property-tax bill is
  therefore **roughly double** the published "effective rate," and it loses the homestead
  exemption. Jefferson County published effective rate **0.57%–0.59%** (the **highest in Alabama**,
  not the lowest) → **~1.14%–1.18% effective on a rental**. **[EXT]**
- **Insurance is the sleeper cost.** Birmingham homeowners average **$2,601–$3,226/yr**; a landlord
  (DP-3-class) policy runs **~25% higher → ~$3,250–$4,033/yr ≈ $271–$336/mo**. Alabama carries
  severe convective storm, hail and tornado exposure and it prices in. **[EXT]**

**Scenarios** (P&I at 7.75%/30yr; taxes at 1.16% effective Class II; insurance $300/mo):

| # | Price | Rent | Down | Loan | P&I | Tax | Ins | PITIA | **DSCR** |
|---|---|---|---|---|---|---|---|---|---|
| A | $206,000 | $1,300 | 20% | $164,800 | $1,181 | $199 | $300 | **$1,680** | **0.77** |
| B | $206,000 | $1,300 | 25% | $154,500 | $1,107 | $199 | $300 | **$1,606** | **0.81** |
| C | $150,000 | $1,300 | 20% | $120,000 | $860 | $145 | $300 | **$1,305** | **1.00** |
| D | $150,000 | $1,600 | 20% | $120,000 | $860 | $145 | $300 | **$1,305** | **1.23** |

**Break-even rent-to-price for DSCR 1.0 at 20% down ≈ 0.87% of purchase price per month.**
**The Birmingham market median is $1,300 / $206,000 = 0.63%/mo — about 28% short of break-even.**

Two further constraints narrow the window:

- **DSCR programs carry minimum loan amounts, commonly $100,000–$150,000.** **[EXT]** At 20% down,
  a $125,000 purchase is a $100,000 loan — the floor. Below that, most lenders will not originate,
  and the source language is blunt: *"the rare item … with no workaround."*
- Combining both: **the DSCR-viable window in Birmingham is roughly a $125k–$185k purchase that
  rents at ≥0.87%/mo.** That is a real band, but it is narrow, and it is not where the median sits.

### A1.5 Verdict on DSCR in the Alabama test — say this plainly

**The evidence SUPPORTS Julio on DSCR loan viability and CONTRADICTS the premise that Birmingham
lacks investor demand.** Both things are true at once:

1. **At the market median, a DSCR purchase loan does not qualify** (0.77–0.81). Julio is correct,
   and correct for the reason he gave — rents are too low relative to price — plus two he did not
   mention (Class II tax doubling, and Alabama insurance).
2. **Investor demand is nonetheless the strongest in the country by net accumulation**, and it is
   small-investor demand, i.e. the agent-served, financeable kind.

The reconciliation: **those investors are largely not using DSCR purchase money.** They are buying
cash, hard money, portfolio/commercial paper, or BRRRR-ing at price points below DSCR minimums.

**[DP] Recommendation — three parts:**

- **Do NOT run a "DSCR" campaign in Alabama.** The product does not fit the market's median deal,
  and a campaign that generates leads a lender must decline burns the agents' five-minute
  commitment on unclosable business. That is the fastest way to lose the agents' cooperation, which
  is the only thing the whole test is contingent on.
- **DO run an investor campaign in Alabama — as a brokerage offer, not a loan offer.** "Birmingham
  rental property, below-market and off-market" sells a *transaction*, which is what RCRE gets paid
  for. Financing is a qualification conversation, not the hook. **This distinction also changes who
  the campaign serves — see A7 on the RESPA problem.**
- **Move the DSCR product to where the evidence already is: Central Florida refinances.** Jeremy's
  own observation in the meeting — *"it's been surprising how many refinances have come in in
  Central Florida"* — is a real signal, and a **refinance has a structural DSCR advantage a
  purchase does not: the borrower can size the loan down to hit 1.0**, whereas on a purchase the
  price is fixed by the seller. Julio also flagged Miami investor ads as promising. That is a
  Florida workstream, not an Alabama one, and it should not be smuggled into the Alabama test.

### A1.6 USDA — the evidence **strongly supports** Julio

| Finding | Detail | Source |
|---|---|---|
| Birmingham city itself | **Ineligible.** Excluded urbanized core; every sampled point inside the city falls in USDA's ineligible layer | **[EXT]** |
| Eligible commuter belt | **Pell City, Chelsea, Calera, Montevallo, Springville, Warrior** all returned at least partly eligible | **[EXT]** |
| FY2026 guaranteed income limit, most AL counties | **$122,800** (1–4 person), **$162,100** (5–8), effective 07/13/2026 | **[EXT]** |

**This maps almost exactly onto content RCRE already ranks for.** The existing site carries
county neighborhood pages for **Jefferson, Shelby, St. Clair and Blount** — and the USDA-eligible
ring is precisely outer Jefferson, outer Shelby, St. Clair and essentially all of Blount. The SEO
program the website audit called *"the strongest asset on the site"* is already pointed at the
USDA geography. **[EXT] + existing audit**

Note which constraint binds: the income limit of $122,800 is **generous** relative to Birmingham
household incomes, so **USDA in this market is a map problem, not an income problem.** The whole
campaign turns on "is this address eligible," which is a perfect qualification question for a
five-minute call and a terrible one for an ad. See A4 for why that is also the compliant design.

### A1.7 First-time buyer — supported, with one thing to verify

Alabama Housing Finance Authority **Step Up**: up to **$10,000 or 4% of purchase price** (lesser)
in down-payment assistance as a **10-year second at 3.5%**, paired with a 30-yr fixed FHA/VA/USDA/
conventional first. **Minimum 640 FICO** (680 for HFA Advantage above 80% AMI). Homebuyer education
required. **[EXT]**

**Income limit is contested across sources — $159,200 vs. $97,300.** Do not put a number in ad copy
until AHFA's current published limit is confirmed directly. **[EXT, UNRESOLVED]**

Note that Step Up is not strictly first-time-only (some sources describe first-time or no ownership
in 3 years; others describe it as a moderate-income program). **Confirm before any creative says
"first-time buyers only."** Overstating a program's eligibility in a housing ad is both a
conversion problem and a compliance problem.

---

## A2. Fair housing — exactly what is ruled out

This section is the one most likely to get skipped and most likely to cause harm. It is stated as
prohibitions, not principles.

### A2.1 The category is mandatory and it is applied to you whether you declare it or not

Any ad promoting **property for sale or rent, real estate services, or mortgage products** must run
under Meta's **Housing Special Ad Category**. Meta applies automated detection and will classify
the ad as housing **whether or not you check the box**; failing to declare risks the ad *and the ad
account*. **[EXT]**

**Every campaign in this test — buyer, USDA, first-time buyer, investor — is a housing ad.** There
is no version of this test that escapes the category. The investor campaign is not exempt: it
promotes real estate services and, if financing is mentioned, mortgage products.

### A2.2 What Meta rules out, concretely

Under Housing Special Ad Category you **cannot**:

- Target or exclude by **age**
- Target or exclude by **gender**
- Target or exclude by **ZIP code**
- Target by **income**, **net worth**, or **"high-income ZIP"** style proxies
- Use a **radius smaller than 15 miles** — the minimum targeting unit is a 15-mile radius from a
  dropped pin, or a named city
- Use **standard Lookalike Audiences** — disabled for housing
- Use **Special Ad Audiences** — the former compliant substitute, since **removed entirely**
- Use most **detailed demographic/behavioural** targeting; the surviving prospecting tool is
  Advantage+ Audience operating inside the geographic boundary

**[EXT]** — the 15-mile floor exists specifically to prevent neighborhood-level discrimination
under the Fair Housing Act.

### A2.3 What Google rules out

Google's **Housing, Employment and Credit (HEC)** restricted category prohibits targeting or
excluding on **gender, age, parental status, marital status, or ZIP code**, on top of the standing
prohibition on personalisation by **race, religion, ethnicity, sexual orientation, national origin
or disability**. Practical effect: **geo-targeting must move from ZIP to city, DMA, or radius.**
**[EXT]**

### A2.4 The trap specific to a USDA campaign — read this one twice

**USDA eligibility is geographic and excludes the urbanized core.** The naive campaign build is
"target only the USDA-eligible areas," i.e. **exclude Birmingham city and target the outer ring**.

**Do not build that.** Birmingham city proper and its outer suburban/rural ring differ sharply in
racial composition. A housing ad whose geography excludes a majority-Black urban core and targets
predominantly white outlying counties is **the exact visual pattern of digital redlining**,
regardless of the fact that the underlying USDA rule is federal and facially race-neutral. The
platform rules would block the fine-grained version anyway (no ZIP targeting, 15-mile floor), but
**a compliant-by-accident campaign is not a defensible one**, and RCRE — not the platform — holds
the Fair Housing Act exposure.

**[DP] The compliant design is also the better funnel design:**

- Target the **whole Birmingham metro** (city + named outlying towns, each pin at the mandatory
  15-mile radius, radii allowed to overlap into ineligible ground). A 15-mile radius from downtown
  already covers Homewood, Vestavia, Hoover, Mountain Brook, Bessemer and Trussville; Chelsea
  (~22 mi), Warrior (~25 mi), Springville (~28 mi), Calera (~33 mi), Pell City (~35 mi),
  Montevallo (~35 mi) and Oneonta (~40 mi) each need their own pin. **[TA — distances approximate,
  confirm in the ad builder.]**
- Put eligibility in **copy and in the qualification call**, never in targeting: *"USDA zero-down
  is available on many homes in Blount, St. Clair, Shelby and outer Jefferson County — send us the
  address and we'll check it in a minute."*
- **This converts the compliance constraint into the campaign's best call-opener.** "I'll check
  your address right now" is a five-minute call that has an obvious reason to happen fast.

### A2.5 Standing content prohibitions (from GOVERNANCE §5, restated so they are not lost)

No ad, landing page, blog post, or AI-generated copy in this test may:

- Describe a neighborhood in terms that signal protected-class composition ("safe," "good
  schools," "family neighborhood," "up-and-coming," "changing area")
- Use school ratings as a proxy for neighborhood quality
- Use imagery that consistently depicts one demographic
- Steer, or imply steering, in lead routing logic

**AI-generated marketing copy is the highest-risk surface here.** GOVERNANCE and CLAUDE.md both
require **technical enforcement over prompt-based safety**. A broker-approval gate before any
public housing creative publishes is the enforcement; a system prompt saying "be fair-housing
compliant" is not.

---

## A3. Test framework — channels, structure, budget shape

### A3.1 Channel read, including one correction to a meeting assumption

Jeremy's framing in the meeting: *"YouTube ones are typically much closer to being at the buyer
stage… with stuff on Facebook and Instagram… they could be a year out."*

**[DP] Respectful correction.** YouTube **in-stream** is interruption media — the viewer came for a
video, not for a house. Its intent profile is much closer to Meta than to Search. **The high-intent
surface in the Google stack is Search**, on queries like *usda loan birmingham al*, *first time
home buyer alabama*, *zero down homes blount county*. YouTube's real jobs in this plan are
(a) cheap retargeting of site visitors, (b) building the channel Taquilla is setting up anyway, and
(c) the agent-recruiting playlist Jeremy described — which serves the **primary** business
objective. It should not carry the buyer-lead load in a 90-day test.

Cheap to settle: run a small Search test and a small YouTube test side by side in month 2 and read
cost-per-appointment, not cost-per-lead.

| Channel | Role in the test | Priority |
|---|---|---|
| **Meta lead ads (FB + IG)** | Primary volume. Native FUB integration already exists; do not rebuild it | **1** |
| **Google Search** | High-intent, low-volume, higher CPL. The honest intent channel | **2** |
| **YouTube in-stream** | Retargeting + brand + recruiting playlist. Not the buyer-lead engine | **3** |
| Seller / valuation | **Defer.** Market is slower on the listing side (DOM 55 and rising) and RCRE's valuation flow is unverified (website audit gap #5) | — |

### A3.2 The budget-shape finding that changes the plan

**Three simultaneous campaigns at a small budget produce three campaigns that never exit the
learning phase.** Meta needs roughly 50 optimisation events per ad set per week to stabilise. At a
plausible $20–$30 real-estate lead CPL **[TA]**, that is **$1,000–$1,500 per ad set per week**.
Three ad sets = $3,000–$4,500/week = $39,000–$58,500 over 90 days. That is not the shape of this
test.

**The binding constraint is not money — it is two agents.** An agent working internet leads at
genuine five-minute speed, alongside an existing book, sustains roughly **40–60 new leads/month**
**[TA]**. Two agents ≈ **80–120/month ≈ 240–360 over 90 days**. Buying more leads than that
guarantees SLA failure, which invalidates the test's own premise.

**[DP] Budget shape: $2,000–$3,500/month total (~$6,000–$10,500 across 90 days), sequenced — not
split three ways on day one.**

| Window | Campaigns live | Shape |
|---|---|---|
| **Days 1–30** | **ONE** Meta campaign. First-time-buyer and USDA share one creative concept ("how do I buy in the Birmingham area with little or nothing down") | ~$60–$80/day, single conversion objective, whole-metro geo. Get out of learning phase. |
| **Days 31–60** | Split USDA into its own ad set **if** volume supports it. Add **Google Search** on the high-intent query set | Rebalance on day-14 and day-45 reads |
| **Days 61–90** | Investor campaign — **gated**, see below. Add YouTube retargeting | Only if the SLA held |

**Gate on the investor campaign:** it launches only if median first-touch on paid leads in days
1–60 stayed inside tolerance **and** the RESPA question in A7 has a written answer. The investor
lead is the one most likely to be a mortgage lead rather than a brokerage lead, which is exactly
the fact pattern that needs an answer first.

### A3.3 Kill rules — written before spend, not after

| Trigger | Action |
|---|---|
| Median first-touch on paid leads **> 15 minutes** in any week | **Pause all spend.** 5 minutes is the target; 15 is the tolerance before the economics break |
| **Unanswered-lead rate > 10%** in any week (reporting metric 11) | **Pause all spend** |
| CPL **> 2× plan** after 21 days on a campaign | Kill that campaign, not the test |
| Any fair-housing flag from Meta/Google, or any ad-account restriction | **Stop everything**, review before restart |

The kill rules are the actual enforcement mechanism for the five-minute commitment. Say so out loud
to the agents on day zero — a rule discovered in week six reads as a punishment; a rule agreed in
week zero reads as a deal.

---

## A4. Lead routing with two agents

### A4.1 What RCRE's own data model already says

`0002_reporting_and_routing.sql` encodes the three routing paths leadership described, including
the Alabama-only hop:

```
source -> agent
source -> Julio/Taquilla -> agent
source -> leadership -> ALABAMA TEAM LEAD -> agent
```

and the comment in `assignment_history` states the governing principle: *"time-to-route is a
leadership problem, time-to-first-touch is an agent problem, and conflating them blames the wrong
person."*

**That principle is what makes a 5-minute SLA fair.** With only two agents plus a routing layer, a
lead that sits three minutes in routing leaves the agent two minutes. Measuring one number would
guarantee an argument.

### A4.2 [DP] Three clocks, three owners

| Clock | From → To | Owner | Notes |
|---|---|---|---|
| **Routing time** | `attribution.captured_at` → `assignment_history.assigned_at` (final agent) | **Leadership** | Should be near zero for paid leads — see A4.3 |
| **Agent response time** | `assigned_at` (final) → first outbound call/text/email | **Agent** | This is reporting metric 1, unchanged |
| **Lead experience time** | `captured_at` → first outbound | **The test** | The only one the *consumer* feels, and the only one that predicts conversion |

**A real advantage worth naming:** for RCRE-generated paid leads, the clock start does **not**
depend on `assignment_history`, which is FORWARD-ONLY and the weakest link in metric 1. RCRE owns
the capture point (`POST /api/leads` → `attribution.captured_at`). **Paid-lead response time is
therefore measurable more reliably than organic-lead response time, and from day one of spend
rather than from webhook activation.** That is a genuine reason to run the test early.

### A4.3 [DP] Routing design for exactly two agents

**Round-robin is wrong at n=2.** It manufactures a queue where none is needed and it hands a lead
to whoever is next rather than whoever is available.

Recommended: **simultaneous push, first-to-touch owns, timed escalation.**

```
paid lead captured
  └─> both AL agents alerted simultaneously (t=0)
  └─> first agent to log an outbound touch owns the lead
  └─> t+5min  no outbound touch     -> alert Alabama team lead
  └─> t+10min no outbound touch     -> alert Julio / Taquilla
  └─> t+20min no outbound touch     -> flag on the Command exceptions surface, count against the kill rule
```

**Hard constraint that must be stated to leadership, not buried:** per ADR-0012 **Follow Up Boss is
the system of record**, and per the production checklist RCRE runs **read-only** until Jeremy
authorises writes. **During the 90-day test RCRE alerts; RCRE does not reassign.** Escalation means
a human is told, not that ownership moves automatically. Anyone who describes the escalation ladder
as automatic re-routing is describing a system that does not exist and is not authorised.

**Alert channel constraint:** a 5-minute SLA requires push, not email. GOVERNANCE §4 bars sending
SMS or email to real people without Jeremy's explicit approval. In-app plus mobile push is
buildable now; anything that dials or texts an agent needs an authorisation decision first.

**ADR-0014 applies to the alerts themselves.** An alert may say *delivered*, *replied*, *email
opened*, *email clicked*, *property viewed*. It may never say or imply *read*.

### A4.4 [DP] The policy row that finally unblocks metric 16

`follow_up_policies` ships **empty** and metric 16 (required follow-up compliance) is **BLOCKED BY
BROKERAGE POLICY** — the one Taquilla asked for by name. The 90-day test is the forcing function
that produces the first row:

| Column | Proposed value for the test |
|---|---|
| `lead_category` | `rcre_paid_ad_al` |
| `source_match` | the dedicated FUB source strings from A5.1 |
| `first_attempt_minutes` | **5** |
| `min_attempts_24h` | **3** [DP — needs leadership's number] |
| `min_attempts_7d` | **8** [DP — needs leadership's number] |
| `required_channels` | `{call, text}` |
| `require_distinct_channels` | `true` |
| `nurture_after_days` | [DP — needs leadership's number] |

**This is the honest framing to give leadership:** the ad test is not just a marketing experiment,
it is the event that gets the required-follow-up policy written down for the first time. That
policy then applies to every lead source, not only paid ones. Frame it that way and the policy
sheet stops being homework and becomes a precondition for money being spent on their behalf.

---

## A5. Source attribution

### A5.1 [DP] Make paid leads separable without a join

Leadership must be able to see paid vs. organic without anyone running SQL. Recommended:

- A **dedicated FUB `source` string per campaign family** — e.g. `RCRE Paid — AL FTB`,
  `RCRE Paid — AL USDA`, `RCRE Paid — AL Investor`. FUB's person record carries a `source` string,
  which is exactly what a Pond/smart-list filter and metric 17 (source performance) key off.
- A **dedicated FUB tag** as a redundant marker, because sources get edited by hand.
- **Never** a new pipeline or a parallel CRM. Taquilla's constraint from the meeting is explicit:
  agents must work out of a single CRM.

### A5.2 Meta — reuse the shape already designed, with one new blocker

`08-mvp/META-AND-YOUTUBE-LEAD-ARCHITECTURE.md` already specifies the correct topology: **FUB stays
the delivery path** via its native Facebook Lead Ads integration; RCRE adds an **optional, additive**
Meta Lead Ads webhook that stores `campaign / adset / ad / form / leadgen_id` into `attribution`,
matched by `platform_lead_id` (unique-indexed, replay-safe) or by email+phone. If enrichment breaks,
the lead is still delivered. That asymmetry is the whole point and it should not be changed.

**New blocker this research surfaced, not in that document:**

> **Meta Lead Ads deliver against a Facebook *Page*, and FUB's Facebook integration is configured
> per-Page.** If Jeremy runs the campaigns from his own ad account and Business Manager, RCRE's Page
> must be shared into that Business Manager via **Partner access**, and the FUB↔Facebook connection
> must be confirmed to still fire for leads generated by a partner ad account. **If this is not
> settled before spend, leads can be generated that never reach RCRE's FUB at all.** **[TA — needs
> verification in the actual ad account, and it is a spend-blocking item.]**

Also unresolved from the existing document: whether RCRE's FUB↔Facebook integration is active
today, and on which Page(s).

### A5.3 Google / YouTube — capture at the page or lose it forever

No native Google→FUB lead path exists. Traffic lands on an RCRE-controlled landing page; the page
does the capture; `POST /api/leads` stores the full attribution set (`campaign`, `campaign_id`,
`ad_group`, `creative`, `keyword`, `audience`, `landing_page`, `referrer`, full UTM set, `gclid` in
`attribution.raw`) and forwards to FUB `POST /v1/events` — **never** `POST /v1/people` (ADR-0012).

**`gclid` and UTMs exist only in the inbound request and cannot be reconstructed from FUB
afterwards.** Same lesson as `first_touch_at`.

**Where those landing pages live is a Part B decision, and it is the useful bridge between the two
halves of this document — see B9.**

### A5.4 A concrete schema gap found by reading the migrations

**There is no `ad_spend` table anywhere in `0001`, `0002` or `0003`.** `attribution` records where a
lead came from; nothing records what it cost. Without cost, none of the following can be computed:

- cost per lead, by campaign
- **cost per appointment set** — the primary 90-day success metric (see A6)
- cost per closing
- the Zillow comparison, which is the entire economic justification for the test

**[DP]** A small table — `organization_id`, `source`, `campaign_id`, `campaign`, `date`, `spend`,
`impressions`, `clicks`, `leads` — fed from Meta/Google reporting APIs, or entered by hand for the
test. Manual entry is acceptable for 90 days and is far better than not measuring cost. **Not built
in this pass; recorded as a requirement.**

---

## A6. Conversion reporting and the economic benchmark

### A6.1 The Zillow number needs confirming before it anchors anything

Julio said **"5 to 40%"**. Zillow's own published structure for the Preferred/Flex programme is
**15–40% of logged GCI**, varying by sale ZIP and sale price, with **no monthly spend** — and 40%
for seller-originated connections in all markets. **[EXT]**

**The 5% floor does not appear in any published Zillow material found in this research.** It is
either a transcription artefact of "15," a legacy or grandfathered tier, or a different programme.

**This matters more than it looks.** The floor sets the bar RCRE-generated leads must clear:

- If Zillow's floor is genuinely **5%**, a $210k closing costs RCRE ~$284 of GCI — brutally hard to
  beat with paid ads.
- If it is **15%**, the same closing costs ~$851 — a very different test.

**Action:** get Julio to pull an actual Zillow invoice or the current fee schedule. Do not build the
business case on a number heard once in a transcript. **[UNRESOLVED — blocks the economic model.]**

### A6.2 The comparison, worked

Using Birmingham median **$210,000** and an assumed **2.7%** buy-side commission **[TA]** →
**~$5,670 GCI per closing**.

| Zillow rate | Zillow cost per closing | Closings needed to beat it on $7,500 of spend |
|---|---|---|
| 15% | $851 | **≥ 8.8** |
| 35% | $1,985 | **≥ 3.8** |
| 40% | $2,268 | **≥ 3.3** |

So: **roughly 4 closings from ~$7,500 beats Zillow at 35–40%; roughly 9 are needed to beat a 15%
floor.**

### A6.3 The thing that must be said before the test starts

**A 90-day window cannot measure closings.** Internet buyer leads convert over 6–18 months. Anyone
who promises a closing-based verdict in 90 days is promising something the calendar will not
deliver, and when it does not arrive the test gets called a failure for the wrong reason.

**[DP] Primary 90-day success metrics — leading indicators only:**

| Metric | Why |
|---|---|
| **Median lead-experience response time** | The contingency the whole test rests on |
| **Unanswered-lead rate** (metric 11) | Available day one, no threshold, no history needed |
| **Cost per appointment set** (metric 3) | Appointments are measurable in 90 days; closings are not |
| **Cost per signed buyer-agency agreement** | The nearest measurable proxy for a real closing |
| **Contact rate and attempts-per-lead** (metric 2) | Separates *attempted* from *connected* — five voicemails is not five conversations |

**[DP] Secondary, lagging — and this is a commitment, not a nicety:** keep measuring the 90-day
lead cohort for **12 months after spend stops**. The closings verdict arrives in month 9–12 or not
at all. Write that into the test agreement so the cohort is not abandoned when the ads are.

### A6.4 Evidence base for the five-minute rule

The 5-minute standard comes from the **Oldroyd / MIT Sloan–InsideSales Lead Response Management
study**: contacting a web lead within 5 minutes vs. 30 minutes changes the **odds of contact by
~100×** and the **odds of qualifying by ~21×**, across 3 years, 6 companies, 15,000+ leads and
100,000+ call attempts. It is widely and wrongly credited to Harvard; HBR's separate 2011 audit of
2,241 companies is the source of the *42-hour average response time* and *23% never respond*
figures. **[EXT]**

Use the correct attribution when presenting this to the agents. Getting the citation right is worth
something when you are asking two people to change their behaviour on the strength of it.

---

## A7. Mortgage / referral attribution — **the largest unflagged risk in Part A**

Jeremy McDonald is a **mortgage originator** (`mcdonald-mtg.com`). The proposal on the table is:
**Jeremy pays for advertising that generates real-estate leads for RCRE's agents**, in a context
where those transactions would plausibly produce mortgage business for Jeremy.

**That is a RESPA Section 8 fact pattern and it must go to counsel before any spend.**

**[EXT]** RESPA §8(a) prohibits giving *or accepting* a thing of value pursuant to any agreement or
understanding to refer settlement-service business in connection with a federally related mortgage
loan. Relevant enforcement context found in this research:

- **August 2023 — CFPB consent orders against BOTH a non-bank mortgage lender AND a real estate
  brokerage**, ~$2M combined, for providing and receiving things of value in violation of §8.
  **Both sides were penalised.** That is Jeremy *and* RCRE in this structure.
- **November 2022 — FDIC fined Willamette Valley Bank $425,000** for mortgage **lead-generation
  arrangements** used to *"facilitate and disguise referral payments for mortgage business."*
- Marketing Services Agreements survive only where **actual marketing services are performed**,
  compensation is at **fair market value**, and it is **unrelated to referral volume or value** —
  with documentation. An MSA structured or operated as compensation for referrals violates §8(a).
- Penalties: civil fines, criminal exposure, and **treble damages** in private litigation.

**This is a GOVERNANCE §4 stop condition** — legal/compliance policy, plus "signing anything or
agreeing to terms." It is not a technical decision and this document does not attempt to resolve it.

**[DP] What must be written down before day one of spend — by counsel, not by us:**

1. **Who owns the leads?** RCRE, Jeremy, or jointly — stated in writing.
2. **What, if anything, flows back?** If the answer is "nothing, and no expectation of mortgage
   referrals exists," that must be documented, and the agents must not be told otherwise.
3. **Is the consumer free to choose any lender?** Required, and it must be real in practice, not
   just in a disclosure.
4. **If there is a mortgage relationship**, does it need an **Affiliated Business Arrangement
   disclosure**, an **MSA at fair market value**, or a different structure entirely?
5. **How is a lead that closes a loan with Jeremy but buys with a non-RCRE agent treated?** And the
   reverse?
6. **Consumer-facing disclosure** of the relationship on every landing page and lead form.

**Design consequence that follows immediately:** A1.5 already recommends running the Alabama
investor campaign as a **brokerage** offer rather than a **loan** offer. That recommendation is
independent of RESPA — it is driven by the DSCR arithmetic — but it also happens to keep the
Alabama campaigns on the brokerage side of a line that counsel will care about. **That alignment is
convenient, not a substitute for the legal answer.**

---

## A8. Part A open questions — blocking vs. non-blocking

| # | Question | Owner | Blocking? |
|---|---|---|---|
| A-Q1 | RESPA structure between Jeremy (lender) and RCRE (brokerage) | **Counsel** | **BLOCKS SPEND** |
| A-Q2 | Actual Zillow fee schedule — is the floor 5% or 15%? | Julio | **BLOCKS the economic model** |
| A-Q3 | Whose ad account and Business Manager; Page Partner access; does FUB↔Facebook still fire? | Jeremy | **BLOCKS Meta spend** |
| A-Q4 | Will the two AL agents sign the 5-minute commitment and the kill rules, in writing? | Taquilla | **BLOCKS the test's premise** |
| A-Q5 | `follow_up_policies` values — `min_attempts_24h`, `min_attempts_7d`, `nurture_after_days` | Leadership | Blocks metric 16 only |
| A-Q6 | Current AHFA Step Up income limit ($159,200 vs $97,300) and true first-time-only status | Jeremy | Blocks FTB creative copy |
| A-Q7 | Are IG and YouTube business accounts created and connected? | Taquilla | Blocks YouTube half only |
| A-Q8 | Is authorisation granted for push/SMS alerts to agents? | Jeremy | Blocks the 5-min alert channel |
| A-Q9 | Who are the two AL agents by name, and are they in FUB with correct team membership? | Taquilla | Blocks routing + attribution |
| A-Q10 | Does RCRE want the seller/valuation angle tested at all, given DOM 55 and rising? | Leadership | Non-blocking |

### Part A sources

Redfin Birmingham AL housing market · Zillow Birmingham home values & rental manager · RentCafe
Birmingham average rent · Realtor.com Investor Report (June 2026 and 16 Aug 2026 releases, via
Birmingham Free Press and Bham Now) · USDA Rural Development property eligibility (rd.usda.gov and
2026 eligibility summaries) · Alabama Code §40-8-1 (Class II / Class III assessment) · Jefferson
County effective property tax rate compilations · Insurify / Insuranceopedia / Hippo Alabama and
Birmingham insurance costs · AHFA Step Up programme pages and 2026 summaries · DSCR loan
requirement guides (2026) · Meta Special Ad Category housing guidance (2026) · Google Advertising
Policies — personalised advertising, housing/employment/credit · Zillow Preferred pricing and Mike
DelPrete on the 40% Flex fee · Oldroyd / MIT Sloan–InsideSales Lead Response Management Study ·
CFPB RESPA FAQs and §8 enforcement summaries (CFPB Aug 2023 consent orders; FDIC/Willamette Valley
Bank Nov 2022).

---

# PART B — Website replacement: the IDX/MLS decisions required first

## B0. What changed, and what did not

**Changed:** leadership aligned in the 2026-08-26 meeting on **leaving Luxury Presence**
(*"Transition to custom website portal — The team decided to discontinue their current 'Luxury
Presence' website"*). Taquilla asked directly — *"are you saying come away from that and build
something else"* — and Jeremy answered *"Yes."* **[VLR]**

**Did not change:** every reason **ADR-0005** gave for *not* rebuilding the IDX layer. ADR-0005 is
`Proposed` and bundled two decisions — *keep Luxury Presence* **and** *do not build RCRE-owned IDX*.
**The first is now overtaken by leadership. The second is untouched and its reasoning is
strengthened by this research.**

**[DP] Recommend a new ADR superseding ADR-0005 in part**, so the record shows which half moved and
which half stands. Not drafted here — this is a research pass.

**Also unchanged:** Julio's own assessment of the current site — *"The website is nice, right? It
functions well… It's stable… but yeah, we're not driving nothing to it."* **[VLR]** The problem
leadership described is **traffic and conversion**, not the search experience. That is worth
holding onto in B9.

## B1. Which MLSs — and the count is higher than anyone said

| Market | MLS | Status |
|---|---|---|
| Birmingham AL | **Greater Alabama MLS (GALMLS / GABMLS)** — formerly Birmingham MLS, founded 1958, 3,000+ subscribers, 11 counties | **[EXT]** Confirmed as the Birmingham MLS. Site attribution already reads *"…participating in the Greater Alabama MLS"* |
| NE Florida (Jax/Clay/St. Johns) | **realMLS / Northeast Florida MLS (NEFMLS)**, operated by NEFAR | **[EXT]** |
| Orlando / Central FL | **Stellar MLS** (MFRMLS) | **[EXT]** — confirmed by the `mfro…` listing-ID prefix in the website audit |
| Miami-Dade / Broward / Palm Beach | **MIAMI REALTORS**, which since a **May 2026 merger** with Broward, Palm Beaches & St. Lucie REALTORS runs **TWO MLS systems: MIAMI MLS and BeachesMLS** | **[EXT]** |
| Gainesville | **Gainesville–Alachua County AOR (GACAR / GACMLS)** | **[EXT]** |

**Julio named four or five. The real feed count is up to six.** The Miami merger created one
association but **two MLS systems, each with its own IDX feed** — *"A MIAMI MLS feed does not
include BeachesMLS data… on the wire it is still two feeds, and two feeds is what you license
against."* **[EXT]**

This also resolves the fourth, unidentified feed in the website audit (32-char hashed IDs across
Broward / Palm Beach / Miami-Dade / Port St. Lucie): **[TA]** that is almost certainly BeachesMLS,
distinct from MIAMI MLS.

## B2. "MLS access" is not "IDX Participant" — the first thing to verify

Julio said *"I got Miami, MLS, Access, uh, Orlando, Stellar, Gainesville, all that stuff… pretty
much state coverage as far as MLS's."* **[VLR]**

**IDX requires broker Participant status, not subscriber access.** Per NAR, Participants must be
REALTORS® who are a principal, partner, corporate officer or branch office manager, holding a
current valid **broker's** licence. realMLS is explicit: *"Participant must be a REALTOR® Broker to
enter into this Agreement,"* and *"the Broker of Record must login to REALMLS.REDATAVAULT.COM to
request an IDX on your behalf."* **[EXT]**

**Three distinct things Julio's sentence could mean, with very different consequences:**

1. He is a licensed **subscriber/agent** on those MLSs — search access, **no IDX right**.
2. He is a **Participant broker** — IDX right exists, agreements still need signing.
3. RCRE the **entity** is a Participant — which entity, in which state, matters.

**Must be confirmed per MLS, in writing, naming the legal entity.** This is decision **B-D1** and
nothing else in Part B can be scoped until it is answered.

## B3. What the IDX licence actually obliges you to do

From NAR Policy Statement 7.58, model IDX provisions and local rules **[EXT]**. These are **design
system constraints**, not legal footnotes — a designer who ignores them breaks the licence.

- **Attribution, and the 2026 tightening.** NAR standards updated **4 Feb 2026**: attributions must
  **clearly label** that they credit the **Listing Broker / Office / Agent**, and **"Courtesy of"
  or other unclear language is no longer acceptable**. Every displayed listing must carry the
  **listing brokerage name plus the listing agent's email or phone**, in a **reasonably prominent
  location**, in a **readable colour**, and in a **typeface no smaller than the median size used
  elsewhere in the listing display**.
- **Refresh at least every 12 hours.**
- **Seller opt-out, at two levels:** full opt-out from IDX display, and feature-level opt-out —
  a seller may withhold consent for **automated valuation** on their listing and for **blogging /
  third-party comments**. An AVM widget or a comment feature must be suppressible per listing.
- **Listing-broker blanket prohibition** must be honoured.
- **Commingling.** Many MLSs restrict blending listings from multiple MLSs in one result set, and
  require per-listing MLS identification. **A single "search all RCRE markets" box may be
  non-compliant.** Confirm per MLS — **[TA]**, this is the rule most likely to break the intended UX.

## B4. Feed delivery options and cost shape

**[EXT]**, and note that published pricing is thin — treat every number as indicative until quoted.

| Route | What it is | Cost signal found |
|---|---|---|
| **Direct per-MLS** (RESO Web API / RETS) | Own agreement, own normalisation per MLS | GALMLS: request via `Support@greateralmls.com`, naming the web developer; one source cites a **$10/month** IDX share — unverified. realMLS: API or RETS, **up to 72 hours** to process a request |
| **MLS Grid** | One licence agreement, one rule set, one RESO-normalised feed across participating MLSs | *"you only pay the licence fee required by your MLS"* — MLS Grid collects on the MLS's behalf. **Stellar supports it** |
| **Bridge Interactive** (Zillow Group) | RESO-compliant API. **Stellar supports it** | Generally no platform fee |
| **Trestle** (CoreLogic) | Data marketplace | Plans **from ~$100/month**, per-connection; one source cites **$24 setup + $150/yr** plus monthly. **Independent of MLS licence fees** |
| **Hosted IDX widget** (IDX Broker, iHomeFinder, Showcase IDX, Diverse Solutions, Realtyna, UltimateIDX) | Fastest to ship. All are approved vendors across GALMLS, realMLS, Stellar, MIAMI/BeachesMLS and GACAR | Renting again — **which is the thing they are leaving** |
| Generic industry range | Direct MLS data licences | **$50–$500/month per MLS plus setup** |

**The single highest-leverage question:** **are GALMLS and realMLS on MLS Grid or Bridge?** Stellar
is confirmed on both. If the two markets that actually matter are also covered by one aggregator,
the integration count drops from *N feeds* to *one integration plus N agreements* — a large
difference in build cost and an even larger one in ongoing maintenance. **Not verified in this
research.** **[EXT — UNRESOLVED, and worth one phone call each.]**

## B5. Is a multi-MLS build realistic?

**Technically, yes — with an aggregator. Commercially and operationally, only if the market has an
agent in it.**

Per feed, regardless of route, RCRE carries: Participant status · a signed Data Licence Agreement ·
vendor approval and registration · that MLS's display rules · its refresh obligation · its opt-out
handling · its audit and termination clauses · its fees.

Set that against where RCRE actually has people **[VLR, from the meeting]**:

| Market | Agents | Feed cost/burden | Verdict |
|---|---|---|---|
| Birmingham | **2** (+ Julio, Taquilla) | 1 feed | **Ship in v1** |
| NE Florida | most of the roster | 1 feed | **Ship in v1** |
| Miami | **1** (North Miami) | **2 feeds** (MIAMI + BeachesMLS) | **Defer** |
| Orlando / Central FL | **0** — *"a couple… that would could do referrals"* | 1 feed | **Defer** |
| Gainesville | **0** | 1 feed | **Defer** |

**[DP] v1 ships two feeds: GALMLS and realMLS.** Adding a feed for a market with no agent buys
compliance burden, licence fees, audit exposure and per-MLS display work in exchange for zero
conversion capability. If a Miami listing search is wanted for credibility, that is a marketing
argument, and it should be made explicitly and priced — not smuggled in as a technical default.

**Counter-argument worth recording:** Jeremy's SEO/GEO blog strategy explicitly names Miami as a
target market. **Content targeting a market does not require an IDX feed for that market.** Blog
posts, neighborhood pages and Google Business Profile work can run in Miami with no listing data at
all. That decouples the growth strategy from the licensing burden — see B9.

## B6. The question nobody has asked — MLS data and AI

**This is the highest-consequence unasked question in Part B, and it sits directly across the
stated growth strategy.**

Jeremy's plan, from the meeting: *"blog posts that are specialised for Northeast Florida… another
one down for Miami… one for the Birmingham area… every week you're having each day a brand new
fresh, maximised blog post that's automated."* **[VLR/DP]**

**IDX licences are *display* licences.** They commonly prohibit redistribution, scraping, derivative
datasets, retention beyond stated limits, and use in automated valuation. **[TA — general industry
pattern; must be confirmed against each specific agreement.]**

Unanswered, and each one can independently break a feed:

- May MLS listing data be used as **input to an LLM** that generates market content?
- May **derived statistics** (median price, DOM, inventory by county) be computed from the feed and
  published?
- May listing data enter a **vector store or long-term memory**? Note this compounds the standing
  rule that **no PII may live in Hermes long-term memory** — MLS data carries seller PII.
- What are the **retention and deletion** obligations when a listing goes off-market?
- Does an AI assistant that answers questions *about* listings count as **display** or as
  **redistribution**?

**Read the actual executed agreements before designing the AI blogging engine or the persistent
site assistant.** A licence breach does not produce a warning email — it produces a terminated feed,
and the feed is the part that took months to obtain.

## B7. Leaving Luxury Presence — what leaves with it

From the website audit, Luxury Presence currently holds: the consumer account system
(`/home-search/account`, `/home-search/auth/`), saved searches, "My Homes" / "My Search," the entire
lead database, four-plus normalised MLS feeds, 27 county-scoped blog posts, 10 neighborhood pages,
13 agent pages, and the SEO ranking history attached to all of it.

Decisions required **before** notice is given:

- **Data export.** What is exportable, in what format, and does the contract permit it? Consumer
  accounts, saved searches, lead history, blog content, images.
- **Consent does not transfer cleanly.** Those consumers opted in to **Luxury Presence's** forms.
  Moving them to an RCRE-owned system and messaging them raises **TCPA and consent** questions.
  GOVERNANCE §5 already makes consent state a first-class field; this is where it gets tested.
  **Requires counsel or a compliance review.**
- **Contract terms — still unknown (discovery C4).** Plan, cost, term, renewal date, notice period,
  early-termination cost. **You cannot sequence a cutover without these.**
- **SEO preservation.** A URL map and 301 plan for 50+ ranking pages, designed **before** launch.
  Property-detail URLs are IDX-generated and will change; accept that loss deliberately or match
  the pattern.
- **Roster hygiene.** The audit found drift between homepage and sitemap agent lists. A migration
  is the moment to fix it — live pages for departed agents are a licence-display and credibility
  risk.

## B8. Who signs, and what they are taking on

IDX Data Licence Agreements are tripartite in effect: **the Participant broker (Julio), the MLS, and
the vendor/developer.** GALMLS's own instruction is to request the agreement *"and include the web
developer you are using."* realMLS's agreement is explicitly *"between a Participant… and a
Consultant/Web Designer/Vendor."* **[EXT]**

**In this build, Jeremy is the vendor.** That means Jeremy or his entity signs vendor agreements
with each MLS and accepts their audit, compliance, indemnity and termination terms.

**GOVERNANCE §4 gates this twice** — *"creating accounts with any vendor, MLS, IDX provider, or SaaS
platform"* and *"signing anything, agreeing to terms, or accepting vendor agreements."* It is also
real business exposure that should be a conscious decision, not a side effect of building a website.

## B9. [DP] The sequencing recommendation — split the replacement in two

**The single most useful structural recommendation in this document.**

| Project | Contents | Gated on | Timeline |
|---|---|---|---|
| **B-1: The RCRE-owned site** | Brand, **recruiting presence** (the Tier-1 gap: no `/careers`, no agent value proposition, no way to raise a hand), agent pages, testimonials, county content, the SEO/AEO/GEO blog engine, Google Business Profile automation, the persistent AI assistant, **and the campaign landing pages** | **Nothing.** No MLS agreement, no IDX licence, no feed | **Weeks** |
| **B-2: The IDX search experience** | Listing search, property detail, map, saved searches, consumer accounts | **B-D1 through B-D8 below** | **Months** |

**Why this split is the right one, in three independent arguments:**

1. **B-1 serves the primary business objective.** CLAUDE.md: *"Primary business objective: agent
   recruiting and retention."* The website audit's defining finding was that
   *"rcregroup.com currently gives a prospective agent no reason to join, and no way to raise their
   hand."* **None of fixing that requires a single MLS listing.**
2. **B-1 is what the 90-day ad test needs.** Section A5.3 requires RCRE-controlled landing pages to
   capture `gclid` and UTMs. Building them inside Luxury Presence — a platform being left — is
   waste. **The ad test therefore becomes the first production surface of the new site**, which
   means B-1 gets built against a real traffic load rather than a design review.
3. **B-1 is where leadership's actual complaint lives.** Julio: *"The website is nice… it functions
   well… but we're not driving nothing to it."* The search experience is not the thing that is
   broken. **Do not let the hardest, most expensive, least differentiating component gate the
   component that fixes the stated problem.**

**Corollary on Luxury Presence:** leadership decided to leave. That does not mean leaving on day
one. **[DP]** Ship B-1 on a new domain or subdomain, run it in parallel, move traffic and content
across, and keep the LP IDX search alive under its existing contract until B-2 is licensed and
ready. That converts a risky big-bang cutover into a staged migration, and it buys the time B-D1
through B-D8 will take. **Requires the contract terms in B7 to confirm it is permitted and
affordable.**

## B10. The decision list — every question that must be answered before a line of site code

**Blocking B-2 (IDX search):**

| # | Decision |
|---|---|
| **B-D1** | For each of GALMLS, realMLS, Stellar, MIAMI MLS, BeachesMLS, GACAR — is RCRE (or Julio, or which entity) a **Participant broker** with IDX rights, a subscriber, or neither? In writing, per MLS. |
| **B-D2** | Which markets ship in v1? **[DP] recommends GALMLS + realMLS only.** Requires leadership sign-off on deferring Miami/Orlando/Gainesville. |
| **B-D3** | Miami: which of the two systems (MIAMI MLS / BeachesMLS) holds RCRE's listings, and is one feed or two required? Confirm in writing. |
| **B-D4** | Feed route: direct per-MLS, aggregator (MLS Grid / Bridge / Trestle), or hosted IDX widget. **Depends on B-D5.** |
| **B-D5** | **Are GALMLS and realMLS available via MLS Grid or Bridge?** One call each. This single answer moves the build cost more than any other. |
| **B-D6** | **Commingling:** does each MLS permit blended multi-MLS search results, and what per-listing MLS identification is required? Determines whether a unified search box is legal. |
| **B-D7** | Full display-rule extract per MLS: attribution wording and typography minimums, refresh SLA, opt-out handling (including AVM and comment suppression), branding requirements. **This is a design-system input, delivered before design, not after.** |
| **B-D8** | **The AI question (B6):** what does each executed licence permit regarding LLM input, derived statistics, vector storage, retention, and an assistant that answers questions about listings? |
| **B-D9** | Who signs the vendor agreement, and does Jeremy accept the audit/indemnity/termination terms? **GOVERNANCE §4 gate.** |

**Blocking the cutover (both projects):**

| # | Decision |
|---|---|
| **B-D10** | Luxury Presence contract: plan, cost, term, **renewal date**, notice period, early-termination cost. *(Discovery C4, still open since 2026-08-19.)* |
| **B-D11** | What consumer/lead data is exportable from LP, in what format, and does the contract permit it? |
| **B-D12** | Consent: can LP-acquired consumers be messaged from an RCRE-owned system? **Counsel / compliance.** |
| **B-D13** | URL map and 301 plan for 50+ ranking pages. |
| **B-D14** | True agent roster, and who owns keeping it accurate. |

**Blocking B-1 (the owned site) — a short list, deliberately:**

| # | Decision |
|---|---|
| **B-D15** | Domain strategy: new domain, subdomain, or in-place replacement. Determines whether parallel-run is possible. |
| **B-D16** | **Broker approval gate for AI-generated public content.** Fair housing plus GOVERNANCE's *"broker approval for public marketing."* Must be **technical enforcement**, not a prompt instruction. Blocks the blog engine going live, not the site. |
| **B-D17** | Website examples leadership likes — their own action item from the meeting, still outstanding. |

---

## Cross-cutting notes for the coordinator

1. **Two findings in Part A change the plan rather than decorate it:** the DSCR arithmetic
   (0.77 at the market median) and the budget/learning-phase constraint (three simultaneous
   campaigns at this budget never stabilise). Both point the same way — **fewer campaigns,
   sequenced, gated.**
2. **The single largest risk in this document is A7 (RESPA).** It is not a technical risk, it
   blocks spend, and it lands on **both** Jeremy and RCRE.
3. **The single largest hidden risk in Part B is B6 (MLS data + AI).** It sits underneath the AI
   blogging engine and the persistent site assistant, both of which leadership has already been
   shown and has already agreed to.
4. **B9 is the recommendation most likely to unlock forward motion**: split the website into the
   half that needs no licence and the half that does, and let the 90-day ad test be the first
   production load on the first half.
5. **Nothing in this document was built, connected, or spent.** Everything above is research and
   proposal. Three items are unresolved and explicitly flagged as such: the Zillow floor rate
   (A6.1), the AHFA income limit (A1.7), and whether GALMLS/realMLS are aggregator-available
   (B-D5).
