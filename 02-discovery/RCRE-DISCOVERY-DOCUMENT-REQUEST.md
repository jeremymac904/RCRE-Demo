# Discovery Document Request

**For:** RCRE leadership
**From:** Jeremy

Nothing here is requested out of curiosity. Each item either **blocks a design decision** or
**materially changes what we build**. Where something isn't available, "we don't have that" is itself
a useful answer — please say so rather than creating it for us.

**Classification**

| | Meaning |
|---|---|
| **REQUIRED** | We cannot responsibly design without it |
| **HIGH VALUE** | Materially changes the design, or saves substantial time |
| **OPTIONAL** | Useful if it already exists. Do not create it |

**Handling:** several items contain agent PII, client data, or commercial terms. Please share by
secure link rather than email attachment. Everything stays inside the RCRE project workspace, is not
shared onward, and is used only for this design work.

---

## REQUIRED — the five that matter most

### 1. Agent roster
**Why:** Sizes everything, and we have conflicting counts — the website shows 13 agent profile pages
but 9 agents on the homepage. We need the truth. This also has a compliance angle: live profile pages
for agents no longer with the brokerage are a real exposure.

Ideally: name · state(s) · licence number · start date · status (active/inactive) · team ·
email · role.

### 2. Commission and fee schedule
**Why:** This is the recruiting product. A recruiting site that won't discuss compensation does not
convert. We also need to know which parts you're willing to state publicly versus discuss privately.

Include splits, caps, and any fees — desk, tech, E&O, transaction, franchise.

### 3. CRM export (or a sample)
**Why:** **The single most decision-changing item on this list.** It determines whether Phase 1 is
*build a CRM*, *integrate the one you have*, or *build only a data layer around it*. We need to see
what data actually exists and how complete it is — not what the system is capable of storing.

A structured export is ideal. If that's hard, a **screenshot of a typical contact record** plus a
rough record count gets us most of the way.

### 4. Independent Contractor Agreement
**Why:** Determines who owns client data when an agent leaves. That single question shapes the data
model, the agent portal's permissions, and offboarding. Getting it wrong is expensive to reverse.

### 5. Luxury Presence agreement
**Why:** Cost, term, **renewal date**, what's included, and — critically — whether lead data is
exportable. Drives ADR-0005 and the Phase 7 website decision.

---

## REQUIRED — also needed

### 6. MLS and IDX agreements
**Why:** We believe RCRE touches at least four MLSs (Greater Alabama, Northeast Florida, Stellar, and
a South Florida board). Each has its own display, retention, and third-party-use rules, and they
govern what any AI tooling may legally do with listing and agent data. **Non-negotiable before we
design anything touching listings.**

### 7. Brokerage policy manual / agent handbook
**Why:** Becomes the foundation of the brokerage knowledge system — the thing an AI assistant answers
from. Also tells us what requires broker approval today, which sets the automation boundaries.

If it doesn't exist, say so — that's a finding, and building it may become part of the project.

---

## HIGH VALUE

### 8. Production report — last 12 months
Transactions and volume by agent, by state. Sizes the business, sets realistic dashboards, and gives
us honest numbers for recruiting copy. **Also lets us calculate time-to-first-closing for new
agents** — the best recruiting statistic a brokerage can publish, and one almost nobody measures.

### 9. Recruiting materials
Whatever you currently send a prospective agent — deck, one-pager, email, anything. We need to see
the current pitch before writing a better one.

### 10. Recruiting pipeline / prospect list
Even a spreadsheet. Shows how recruiting is tracked today, what stages you think in, and how many
prospects are in flight.

### 11. Agent onboarding checklist
What happens between signing and first closing. Becomes the onboarding workflow — and the gaps become
the case for building one.

### 12. Lead routing policy
Written or described. How leads get assigned, what response is expected, who's accountable. If it's
unwritten, a paragraph from you is fine — that *is* the artifact.

### 13. Transaction checklist
Your milestone and task list per deal. Becomes the transaction workflow. If different agents use
different checklists, send two or three.

### 14. Brand guide
Logo files, colours, fonts, voice. Needed for the recruiting site and for anything the AI generates on
an agent's behalf.

### 15. Marketing and advertising guidelines
What agents may and may not publish, what needs approval, required disclosures. **This becomes the
compliance gate on AI-generated content — the highest-liability part of the product.** If nothing is
written down, tell us how it works in practice.

### 16. Vendor and software list with costs
Complements [RCRE-CURRENT-TECHNOLOGY-INVENTORY.md](RCRE-CURRENT-TECHNOLOGY-INVENTORY.md). Often a
bookkeeper can produce this faster than filling in the form.

### 17. Recruiting results — last 24 months
How many recruited, from where, how many are still here, how many left. Tells us which recruiting
sources actually produce agents who stay.

---

## OPTIONAL — only if it already exists

### 18. Existing SOPs
Any documented process. Feeds the knowledge system.

### 19. Training materials
Onboarding curriculum, scripts, playbooks. Feeds the Academy.

### 20. Marketing performance reports
Website analytics, lead-source reporting, ad performance.

### 21. Compliance guidelines beyond the handbook
Fair housing training records, advertising review process, past issues worth knowing about.

### 22. Agent survey results
If you've ever surveyed agents about what they want or complain about, that's gold.

### 23. Org chart
Only if one exists. Otherwise §1 of the interview covers it.

### 24. Sample marketing assets
A few recent listing flyers, social posts, or emails. Shows us the current bar.

---

## Deliberately not requested

Named so you know we thought about it and decided against:

| Not requested | Why |
|---|---|
| Full client database with PII | We don't need real client records to design. A structure sample is enough |
| Financial statements | Not our business, and not needed |
| Individual agent compensation | The schedule is enough; individual arrangements are not our concern |
| Personnel files | No |
| Bank or payment details | Never |
| Historical transaction documents | Executed contracts add nothing to the design |
| Anything under NDA with a third party | Tell us it exists; don't send it |

---

## Priority if you're short on time

**Send first:** the agent roster · the commission and fee schedule · a CRM export or sample.

Those three answer more design questions than everything else combined.

---

**Requested:** 2026-08-19 · **Tracking:** update `02-discovery/ANSWERS.md` as items arrive
