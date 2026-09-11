# Assumptions Register

Working assumptions being used so that discovery does not block all progress. Each is a **risk
until confirmed**. When an assumption is confirmed or corrected, update the row and note the
consequence.

**Status:** `Assumed` · `Confirmed` · `Corrected` · `Retired`

| # | Assumption | Basis | Impact if wrong | Confirms via | Status |
|---|---|---|---|---|---|
| A-01 | RCRE has no unified CRM today; leads live in Luxury Presence and inboxes | No CRM evidence on the public site; leads terminate in vendor forms | High — if a CRM exists and is loved, Phase 1 becomes integration, not construction | C1, C2 | **Corrected** · TA-2026-08-24 |
| A-02 | RCRE has ~13 agents | 13 agent pages in sitemap (homepage shows 9) | Medium — sizes everything; changes the build-vs-buy calculus | A1 | Assumed |
| A-03 | RCRE operates in AL and FL only | Two phone numbers, two states of neighborhood pages, no GA content | Medium — a third state adds license, MLS, and compliance scope | A4 | Assumed |
| A-04 | RCRE belongs to ~4 MLSs (GALMLS, NE Florida, Stellar, a South FL board) | Four distinct listing ID schemes and GALMLS attribution text on property pages | High — drives IDX feasibility, cost, and compliance | C3, F4 | Assumed |
| A-05 | Luxury Presence owns the consumer account and lead database | `/home-search/account` + `/home-search/auth/` disallowed in robots.txt | High — determines whether historical lead data is exportable | C2, C4 | Assumed |
| A-06 | There is no recruiting technology today | Zero recruiting surface on the site; `/careers`, `/join`, `/join-us`, `/work-with-us` all 404 | Medium — an existing recruiting CRM changes Phase 2 | B1, B9 | **Corrected** · TA-2026-08-24 |
| A-07 | Agents are not currently required to use any brokerage software | No portal or login surface beyond the consumer search portal | High — adoption risk is the top delivery risk for the whole project | E4, E5 | **Corrected** · TA-2026-08-24 |
| A-08 | The blog is professionally produced and will continue | 27 well-targeted, recent county-level posts | Medium — if it stops, RCRE loses its best organic asset mid-build | C12 | Assumed |
| A-09 | This is a single-brokerage build, not a resellable multi-brokerage product | Brief describes RCRE specifically | **Very high** — a white-label product is a materially different architecture (ADR-0003) | H3, H7 | **Corrected** · TA-2026-08-24 |
| A-10 | Client and lead data belong to the brokerage, not the individual agent | Standard brokerage practice | High — determines data model, agent offboarding, and portal permissions | D7, F6 | Assumed |
| A-11 | No meaningful automation exists today | No evidence externally | Low-medium | C11 | **Confirmed** · TA-2026-08-24 |
| A-12 | Budget supports a phased multi-quarter build, not a single fixed deliverable | Scope described in the brief | High — changes sequencing and what ships first | H1, H2 | Assumed |
| A-13 | RCRE will accept Postgres/Supabase and a Next.js stack | No stated constraint; matches Jeremy's proven stack | Low — unless an enterprise data platform requirement surfaces | H5 | Assumed |
| A-14 | The "AI Advantage (Realtors)" brand/assets are available to this project | Built by Jeremy, in his workspace | Low-medium — affects the external funnel's branding | Jeremy | Assumed |
| A-15 | Agent testimonials and photos on the site may be reused in recruiting material | Already public | Low — but consent should be confirmed before reuse in recruiting context | F1 | Assumed |

---

## 2026-08-24 — leadership answers from Taquilla Allen

Source: [2026-08-24-TAQUILLA-ALLEN.md](leadership-answers/2026-08-24-TAQUILLA-ALLEN.md).
Rows above were updated in place; the reasoning for each change is here so the register stays
short and the history stays readable.

### Corrected

| # | Was assumed | What leadership actually said | Consequence |
|---|---|---|---|
| A-01 | No unified CRM; leads live in Luxury Presence and inboxes | Follow Up Boss manages and tracks all leads, and all agents are expected to use it | Confirms ADR-0012. The build is an intelligence layer, full stop. |
| A-06 | No recruiting technology exists | No recruiting *technology*, but an **ISA is making recruiting calls today** — and it is underperforming | Recruiting is not greenfield. There is an incumbent motion with a person, a cost and a disappointing result. The recruiting system has to beat a real baseline, and there is a human whose work it changes. |
| A-07 | Agents are not required to use any brokerage software | Agents **are** expected to actively use FUB | Adoption risk is lower than feared for the CRM itself. It is *not* lower for anything new we add. |
| A-09 | Single-brokerage build, not a resellable product | Build and prove inside RCRE first, **then** package for other brokerages | Resolved by ADR-0013. Organisation boundaries stay in the data model; the SaaS layer is not built. |

### Confirmed

| # | Assumption | Confirming statement |
|---|---|---|
| A-11 | No meaningful automation exists today | Leadership manually runs reports, checks status hygiene, monitors lead activity and chases agents |

### New assumptions arising from these answers

| # | Assumption | Basis | Impact if wrong | Confirms via | Status |
|---|---|---|---|---|---|
| A-16 | RCRE's FUB plan and API permission level allow webhook registration and full read access | ADR-0012 work assumed it; not verified against RCRE's actual account | High — webhook-derived metrics are the entire reporting requirement | Julio/Taquilla, FUB account | Assumed |
| A-17 | The Alabama "team lead" is a distinct role with distinct permissions, not just a senior agent | Taquilla describes leads routed to a team lead who then distributes | Medium — adds a third role to the permission model between broker and agent | Julio/Taquilla | Assumed |
| A-18 | "Required follow-up" means a per-source cadence RCRE has not yet defined | Taquilla asks for alerts when required follow-up has not occurred, without defining it | **High — blocks a P0 alert.** Inventing a cadence means enforcing our standard on RCRE's agents | Julio/Taquilla | **Blocking** |
| A-19 | "Customisable dashboards" means saved filters over fixed reports, not a widget canvas | Narrow reading chosen deliberately to avoid scoping large on an ambiguous phrase | Medium — order-of-magnitude scope difference | Taquilla | Assumed |
| A-20 | RCRE has transaction management, e-signature, accounting and file storage tooling that simply was not named | A two-state brokerage necessarily has them; the question was asked and went unanswered | Medium — unnamed systems become integration surprises later | Julio/Taquilla | **Unanswered, not negative** |
| A-21 | Julio's answers would broadly match Taquilla's | Only one of the two brokers has responded | Medium — a disagreement between brokers on priorities would reorder the roadmap | Julio | Assumed |
| A-22 | RCRE texting runs on FUB's own numbers over standard A2P SMS | Consistent with FUB's product; not verified for RCRE | Low — only matters if RCRE already uses an RCS/WhatsApp-capable channel, which would change ADR-0014 | Julio/Taquilla | Assumed |
