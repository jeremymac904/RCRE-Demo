# Meta and YouTube Lead Architecture

**Date:** 2026-08-19 · **Status:** Design. **No production ad account is connected.**

The objective is not "capture leads" — FUB already does that. It is **preserve
attribution end to end**, so RCRE can answer which campaign, ad group and creative
actually produced closings rather than clicks.

---

## 1. Meta (Facebook / Instagram)

### The key constraint

Follow Up Boss already integrates with Facebook Lead Ads directly. That integration
delivers the lead reliably and fires FUB's lead flow, assignment and action plans.
**Do not rebuild it.**

But FUB's person record carries a `source` string, not campaign structure. The
`campaign` / `ad group` / `creative` breakdown that makes ad spend measurable is
either flattened or absent by the time RCRE sees the person.

### Recommended: FUB-primary with optional attribution enrichment

```
Meta Lead Ad
   └─> Follow Up Boss  (existing native integration — untouched)
          └─> peopleCreated webhook
                 └─> RCRE ingests, normalizes, stores the person

Meta Lead Ads webhook  (OPTIONAL, additive)
   └─> RCRE attribution endpoint
          └─> stores campaign / adset / ad / form / leadgen_id
                 └─> matched to the FUB person by email+phone, or leadgen_id
```

**Why this shape.** FUB stays the delivery path, so nothing about lead handling
becomes RCRE's reliability problem. The optional Meta webhook adds only what FUB
loses — campaign structure — and if it fails, the lead is still delivered. That
asymmetry is the point: the enrichment path can break without costing a lead.

**Matching.** `attribution.platform_lead_id` holds Meta's `leadgen_id` with a
unique index, so a replayed Meta webhook cannot duplicate attribution. Person
matching is by email and phone, falling back to unmatched-but-stored — an
unmatched attribution row is still useful for campaign-level reporting.

### Rejected alternative

**RCRE receives the Meta lead first, then forwards to FUB via `POST /v1/events`.**
Gives perfect attribution and full control, but puts RCRE in the critical path of
lead delivery on day one. A bug means a lost lead, which is the most expensive
failure available. Revisit only if Meta's webhook proves insufficient.

### What we need before building

- Whether RCRE's existing FUB↔Facebook integration is active, and on which page(s)
- Meta app review status for `leads_retrieval` (Jeremy has existing Meta developer infrastructure)
- Page access tokens — **production connection requires Jeremy's authorization**

---

## 2. YouTube / Google Ads

### The constraint

There is no native Google Ads → FUB lead integration equivalent to Facebook Lead
Ads. YouTube traffic lands on a landing page. That is actually an advantage: RCRE
controls the page, so it controls the attribution capture.

### Recommended flow

```
YouTube / Google Ads
   └─> RCRE campaign landing page  (?utm_*&gclid=…)
          └─> POST /api/leads   — attribution captured AT THE MOMENT OF CAPTURE
                 ├─> RCRE attribution row  (campaign, ad group, creative,
                 │                           keyword, gclid, landing page, UTMs)
                 └─> POST /v1/events → Follow Up Boss
                        (type: Registration, campaign object with required source)
                            └─> FUB assigns, notifies, runs action plans
                                   └─> peopleCreated webhook → RCRE links person ↔ attribution
```

**Why capture at the page, not later.** UTMs and `gclid` exist only in the inbound
request. They cannot be reconstructed from the FUB record afterwards. This is the
same lesson as `first_touch_at`: capture it at the moment or lose it permanently.

**Implemented:** `POST /api/leads` accepts the full attribution payload and
forwards to FUB's Events API with a correctly-formed `campaign` object (`source`
is required inside `campaign` whenever the object is sent). FUB forwarding is
**gated off** pending authorization.

### Preserved fields

`campaign` · `campaign_id` · `ad_group` · `ad_group_id` · `creative` ·
`creative_id` · `keyword` · `audience` · `landing_page` · `referrer` ·
full UTM set · `related_agent_id` · `gclid` (in `attribution.raw`)

### Explicit non-goal

**No Google Ads campaign management.** Only measurement and the lead flow. Offline
conversion import back to Google Ads is the obvious future step once closings are
tracked — deliberately out of MVP scope.

---

## 3. Why not Zapier for either

Both flows are directly supported by the FUB API and by platform webhooks. Per
ADR-0012, Zapier is for secondary convenience workflows, not primary
synchronisation. Adding it here would introduce a third-party dependency, per-task
cost, and weaker error handling for capability the API already provides.

---

## 4. Before anything connects to production

- [ ] Jeremy authorizes production Meta asset connection
- [ ] Jeremy authorizes production Google Ads connection
- [ ] FUB system registration completed (`X-System` / `X-System-Key`)
- [ ] `RCRE_ALLOW_FUB_WRITES=true` set deliberately, not by default
- [ ] Landing pages exist and are instrumented
- [ ] Consent language reviewed for TCPA on every capture form
