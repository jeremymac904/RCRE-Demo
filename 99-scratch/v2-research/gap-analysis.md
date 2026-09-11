# RCRE Platform V2 — Gap analysis against the current implementation

**Pass:** planning only. No application code, no migrations, no connections were written or changed.
**Method:** I read the seven V2 module designs in `99-scratch/v2-research/`, then inspected the code
myself rather than accepting the designs' claims about it. Every ALREADY SATISFIED verdict below
cites a file I opened.

**Classification vocabulary (exactly one per requirement):**
`SAT` already satisfied · `ENH` needs enhancement · `NEW` new feature · `INT` integration required ·
`POL` policy decision required · `EXT` external blocker.

---

## §0. What "the current implementation" actually is — and the finding that dominates everything

There are **two applications**, and they do not share a line of code.

| | `apps/rcre-demo` | `apps/rcre` |
|---|---|---|
| Size | 14,166 lines TS/TSX, 79 files | 10,498 lines incl. tests, 44 files |
| Routes | 20+ (Today, RCRE AI, CRM+detail, Pipeline, Listings+detail, Marketing, Command, Command/Reporting, Recruiting+detail, Agents+detail, Training / Community / Classroom / course / lesson, Join, Login, landing) | **9 files, 5 routes**: `/`, `/today`, `/command`, `/join`, `+ api/leads`, `api/webhooks/fub`, `dev/role` |
| Data | **100% synthetic**, hard-coded in `src/data/demo.ts` (899 ln), `academy.ts` (2,826 ln), `community.ts` (278 ln), `conversations.ts` (399 ln), `reporting.ts` (163 ln) | Real domain layer: FUB client, 16 reporting metrics, insight engine, backfill, RLS repository |
| Auth | A cookie naming a persona (`src/lib/session.ts`, 19 ln). No password. | `getActor()` fails closed; RLS in SQL (`db/pg.ts`) |
| AI | **None.** `components/Assistant.tsx` replays a scripted transcript; `CampaignBuilder.tsx` is a `setTimeout` sequence with four hard-coded outputs | None |
| Persistence | Community posts = React state. Academy progress = `localStorage` (`AcademyProgressProvider.tsx` L57/L76) | `MemoryRepository` on fixtures; `PgRepository` written but its own header says *"NOT YET EXERCISED against a real database"* |

**This is the single largest gap in the programme and it is not a feature.** Everything leadership
reacted to in the meeting — Command, the campaign builder, Training + Community — they saw in
`rcre-demo`. Every enhancement request in §B1–B7 of the traceability is therefore a request to
enhance a screen that has no backend. The real backend, `apps/rcre`, has excellent bones and
**two rendered screens**.

Any V2 plan that treats "enhance the agent inspector" as a UI task is wrong by roughly an order of
magnitude. The correct framing is: **the demo's screens must be re-implemented on `apps/rcre`'s data
layer before any of Taquilla's asks can be satisfied for real.** That work is not in any of the seven
module designs as a first-class line item, and it should be.

### Verified inventory of the real platform

* **Migrations** — 22 tables. `0001` (13: organizations, users, people, attribution, activity, tasks,
  appointments, deals, lead_snapshots, recruiting_prospects, webhook_events, audit_events,
  hermes_tool_permissions); `0002` (9: teams, team_members, assignment_history, stage_transitions,
  person_engagement, follow_up_policies, stage_aging_policies, sync_state, integration_state);
  `0003` RLS enabled on all 22 with ~60 policies.
* **Role enum** — `('owner','broker','team_lead','agent','staff','recruiter','viewer')`.
  **No `transaction_coordinator`, no `marketing_admin`, no `trainer`.**
* **MCP server** — `mcp/rcre-mcp-server/src`: **17 tools, not 15** (the brief says 15; `tools.ts`
  defines 17). 6-stage `authorizeCall()` in `authorize.ts`; approvals are bound to one tool, one
  actor, one org, single-use, with expiry (`validateApproval`). `pii-guard.ts` shares its rule table
  with `hermes/hooks/rcre-pii-rules.json`.
* **Hermes** — 2 profiles, 9 skills, 1 hook. `skills/rcre-procedures/SKILL.md` is explicitly
  `> **PLACEHOLDER — knowledge base not yet connected.**`
* **FUB** — `lib/fub/client.ts` implements ~14 **read** endpoints plus exactly one write,
  `sendLeadEvent()` → `POST /v1/events` (ADR-0012 honoured, verified at L204). Writes are gated off
  by `env.gates.allowFubWrites`. `api/webhooks/fub/route.ts` verifies signatures but its ledger is
  an in-memory `Set` marked *"Placeholder ledger until the Postgres repository lands"*, and the
  header says **"NOT YET REGISTERED with FUB."**
* **Reporting** — `lib/reporting/metrics.ts` (870 ln) implements the 16 metrics with `clampWindow()`
  honesty rails. Metric 16 (required-follow-up compliance) is deliberately unbuildable: it depends on
  `follow_up_policies`, whose own SQL comment reads *"BLOCKED BY BROKERAGE POLICY until RCRE completes
  the required-follow-up sheet."*

### Things that do not exist anywhere in the codebase

I grepped `apps/rcre/src`, `apps/rcre/supabase`, `apps/rcre-demo/src`, `mcp/rcre-mcp-server/src`
and `hermes/`. **Zero matches** for any of:

`openrouter` · `deepseek` · `minimax` · `anthropic` · `openai` — **there is no model router, no
provider abstraction, and no inference call of any kind in the entire repository.** ADR-0011 is a
decision, not an implementation.

Also zero: `dotloop` · e-signature · `documents` · `document_template` · `critical_date` ·
`transaction` (as a domain object) · training assignment · content asset / content campaign ·
approval queue table · blog / SEO / GBP surface · Skool · Instagram / YouTube connector ·
voice · Telegram / SMS / Gmail gateway · billing telemetry.

---

## §1. Broker oversight of agent lead contact (R1–R8) — Taquilla's first and most emphatic ask

**This is the requirement most at risk of being mis-scoped, in both directions.** The design
documents undersell what exists; the meeting notes undersell how much of it is fake.

| Req | Class | Verdict |
|---|---|---|
| R1 — fewer clicks to see who contacted whom | **ENH** | Path today is Command → Agents → agent = 2 clicks (`app/command/page.tsx` → `app/agents/page.tsx` → `app/agents/[id]/page.tsx`). Genuinely short. What is missing is a **direct** entry: there is no way to go from Command to a named agent's book without passing through the roster. |
| R2 — open one agent, see that agent's leads | **SAT (demo) / NEW (product)** | `app/agents/[id]/page.tsx` L74 `const book = CONTACTS.filter(c => c.ownerId === agent.id)` renders "Their book" with stage chip, source, days since last contact and next action. **This screen already does exactly what she asked.** It does not exist in `apps/rcre`. |
| R3 — contacted vs **not** contacted, per agent | **ENH** | Two of three states exist: "Never answered" (`!c.firstTouchAt`, L75) and "Stale in stage". The missing state is the middle one — *contacted once, then nothing since*. `people.last_outbound_at` exists in `0001` and is displayed on the row, but nothing turns it into a flag. That is the smallest real gap in this whole section. |
| R4 — "one day overdue" threshold | **ENH + POL** | The mechanism exists and is empty on purpose. `stage_aging_policies` (0002 L294) and `follow_up_policies` (0002 L264) both carry SQL comments saying an empty table is correct behaviour, not a bug. The demo uses `STAGE_THRESHOLD_DAYS` and labels it *"Thresholds are placeholders until RCRE sets its own."* **Do not build a threshold engine — one exists. Get the numbers.** |
| R5 — easier for her and the manager | **ENH** | Covered by R1–R4. |
| R6 — leadership will use it for follow-up oversight | **SAT (intent)** | Command already answers the five exceptions-first questions (ADR-0015). Nothing to build; everything to connect. |
| R7 — bots surface where the ball is dropped | **ENH** | `get_broker_exceptions` and `get_unanswered_leads` already exist as MCP tools (`tools.ts` L210, L73) and `rcre-broker-command` is a written Hermes skill. Missing: **push**. Every existing path is pull — the broker has to ask. R7 asks for arrival. |
| R8 — push work down so leadership stops doing it | **NEW** | No delegation or assignment-to-a-role primitive exists. The role enum has no seat to push work *to*. |

**Do not rebuild:** the agent inspector, the exception ranking on `/agents` (`exceptionsFor()`),
the "never answered" derivation, or the threshold tables. **Do build:** a contacted-but-cold flag,
a direct Command→agent link, and push delivery.

---

## §2. Proprietary training authoring and assignment (R9–R17)

| Req | Class | Verdict |
|---|---|---|
| R13 — prompting module | **SAT** | `data/academy.ts` totals: 14 courses, 181 lessons, 220 prompts, 29 handouts, 16 downloads. Real curriculum, real provenance (`sourcePath` per asset). |
| R17 — her training teaches ChatGPT use, not an embedded model | **SAT** | Consistent with ADR-0011 and with the fact that no model is embedded anywhere. |
| R9 — Taquilla authors her own courses | **NEW** | There is **no authoring path at all.** `data/academy.ts` is a 2,826-line generated TypeScript file. Adding a course today means a code change and a deploy. |
| R10/R11 — Zillow 101 from real recorded calls | **NEW + POL** | No upload, no media pipeline. `academy-types.ts` documents that only 2 of 181 lessons have video. **POL:** recording a live consumer call raises two-party-consent exposure in FL; nobody has ruled on it. |
| R12 — ChatGPT account setup walkthrough | **NEW** | Content, not capability — blocked only by R9. |
| R14 — inspection report → email to Margie | **NEW + INT** | Nothing exists. This is the concrete productisable workflow; `transaction-coordinator.md` §11 designs it. Requires document ingest + a send path, neither of which exists. |
| R15 — document walkthroughs, buyer rep forms | **NEW** | Same as R9/R10. |
| R16 — **conditional assignment** ("not every agent is on Zillow") | **NEW** | The hardest missing piece in Training. There is no assignment object, no completion record on the server, no cohort/segment concept. `AcademyProgressProvider.tsx` stores progress in `localStorage` — **a broker cannot see it, and it dies with a browser profile.** Note the consequence: `agent.stats.trainingPct`, which drives the "training behind" exception on `/agents`, is a hard-coded synthetic number in `demo.ts`, not a computation. |
| R51 — community with YouTube links + PDF attachments | **ENH** | `CommunityComposer.tsx` composes posts with a category and a real lesson reference; L180 says attachments are *"Nothing is uploaded from this demonstration."* Posts live in React state. Feed, categories, Training-of-the-Day and lesson linking are real UI; **persistence and attachments are not built.** |
| R53 — external Skool community | **NEW (external) + POL** | Nothing internal. **POL:** the paid-content leak rule (`recruiting-roles.md` §A3.3) — which AI Advantage courses may appear on a public Skool — is a Jeremy commercial decision, and `TrainingAccess.tsx` already encodes the mechanism (`publicPreview` per course) that would enforce it. |

**Do not rebuild:** the Academy catalog, lesson pages, resource lists, Community feed shell,
Training-of-the-Day, or the `publicPreview` public-exposure rule. **Do build:** server-side
progress, an assignment object, and an authoring path.

---

## §3. Documents, contracts, transaction coordination (R18–R24)

**Everything in this section is NEW. Nothing is built. There is no partial credit to award.**

Confirmed by grep across all four source trees: no `documents` table, no `document_templates`, no
`transactions`, no `critical_dates`, no TC queue, no e-sign, no template folder, no fill engine.
The `deals` table (0001 L255) is FUB's deal mirror and is not a transaction file.

| Req | Class | Note |
|---|---|---|
| R18 — fill lender forms from a templates folder | **NEW** | |
| R19 — fill the purchase contract from instruction | **NEW + POL** | **POL — the most consequential open question in the programme.** Who may approve a machine-prepared contract, and does the Qualifying Broker accept that a fill engine is a clerical act rather than unauthorised practice of law? **Must be answered by Julio Arango**, with brokerage counsel. Not answerable by us. |
| R21 — route for e-sign, return executed doc | **NEW + INT + EXT** | See §5. |
| R22 — Margie is the **Florida** TC | **POL** | **Alabama has no named TC.** Nobody said who coordinates an Alabama transaction. **Must be answered by Taquilla Allen.** |
| R23 — TC send-out timelines | **POL** | Same shape as R4: RCRE must supply numbers. **Taquilla / Margie.** |
| R24 — draft → review → approve → send | **SAT as a pattern / NEW for documents** | The pattern is real and enforced in code: `authorize.ts` stage 6 refuses any write tool without a bound, unexpired, single-use approval record. The demo shows the same shape (`Assistant.tsx` `StatusPill`: Done / Drafted·not sent / Needs your approval). **What does not exist is an approval *queue* — a table, a surface, an assignee.** `hermes_tool_permissions.requires_approval` is a per-tool boolean, not a workflow. |

---

## §4. Dotloop and the single CRM workspace (R25–R32)

| Req | Class | Verdict |
|---|---|---|
| R25 — integrate with Dotloop | **EXT** | See §5. Verified independently in `dotloop.md`. |
| R28 — open-source e-sign as the alternative | **NEW** | Nothing built. |
| R30 — agents must not work two CRMs | **NEW** | This is an architectural commitment, not a feature. Today it is **not met in either direction**: `apps/rcre` renders 2 screens, so an agent must use FUB; `apps/rcre-demo` renders 20, none connected, so an agent would have to use both. |
| R31 — agents work out of RCRE, FUB underneath | **NEW + INT** | **The single most consequential gap.** `lib/fub/client.ts` has *one* write method. There is no `createNote`, no `createTask`, no `updatePerson`, no `logCall`. Section 6 of `08-mvp/FUB-CAPABILITY-VERIFICATION.md` lists the write surface as exactly `/events` and `/webhooks`. Taquilla's "update the files, put the notes in there" needs a write-back surface that has not been designed, built, verified, or authorised — plus field ownership, optimistic concurrency and self-write suppression (`workspace-broker.md` §A3). |
| R32 — co-generated leads may sit outside FUB | **POL** | **Must be answered by Julio + Jeremy** — a commercial term with data-routing consequences. Note `api/leads/route.ts` already implements a two-lane split (`kind: 'consumer' | 'recruiting'`, recruiting never leaves RCRE), so the mechanism to route a class of lead away from FUB **exists**; only the policy is missing. |

**Correction the coordinator must carry forward:** the Gemini notes say to keep FUB as the central
CRM and integrate into it. The transcript says the opposite (00:32:58 → 00:33:54). Building
"automation inside FUB" is a different product. The code already sides with the transcript —
`api/leads` writes to RCRE first and forwards to FUB.

---

## §5. External blockers

### Dotloop — **EXT, verified twice, and it does not go away with a phone call**

Dotloop's API License Agreement clause 2(k) prohibits use of Dotloop Data *"in connection with any
type of artificial intelligence, machine learning, or similar technology, whether for model
development/training or for any other purpose."* The final clause is the one that binds: this is not
a training ban. `dotloop.md` §3 also establishes that **Follow Up Boss has a customer-own-data
carve-out and Dotloop has none** — so the two Zillow properties are not equivalent risks.

Two further findings from `dotloop.md` correct the meeting record and must reach leadership:
* **Documents cannot be pulled back out via the API** (§2). R21's "have it come back in" is not
  available on the documented API surface regardless of the AI clause.
* **E-signature is not exposed via the API** (§2). Dotloop's core value to RCRE — Julio: *"no, not
  really"* more than e-signing — is the one thing the integration cannot drive.

**Consequence:** deterministic push into Dotloop is possible; an AI path over Dotloop Data is not.
Documents RCRE AI touches must **originate in RCRE**. `transaction-coordinator.md` §10 designs
Branch A / Branch B so this stays a config change, which is the right call.

### Instagram / YouTube channels (R68) — **EXT, but trivially unblockable**

Taquilla: *"we just have one for Facebook."* This is an RCRE action item, not engineering work.
It blocks R69/R70 and part of the ad test.

### FUB production access — **EXT, and it blocks nearly everything measurable**

`08-mvp/FUB-CAPABILITY-VERIFICATION.md` §7 lists three hard blockers not yet supplied: an
**Owner-level** API key, `X-System`/`X-System-Key` registration, and a publicly reachable HTTPS
webhook endpoint. Until these land, `webhook_activated_at` is null and four of leadership's
sixteen metrics have no data at all. **This is on the critical path and is older than the meeting.**

---

## §6. AI providers and cost (R33–R37)

| Req | Class | Verdict |
|---|---|---|
| R33 — Claude/ChatGPT too expensive internally | **SAT (as a decision)** | ADR-0011, Approved in Principle. |
| R34/R35/R37 — OpenRouter free tier, DeepSeek, MiniMax, local models | **ENH → in truth NEW** | **Honest statement: there is no provider abstraction to enhance.** Zero references anywhere in the repo. ADR-0011 is currently a policy with no enforcement point. The first V2 build item here is a router, not a model choice. |
| R36 — image generation on the user's own ChatGPT subscription | **NEW + POL** | Nothing built. **POL:** if brokerage listing imagery is produced in an agent's personal ChatGPT account, who owns the output and who is liable for a fair-housing failure in an image the brokerage never saw? **Julio must answer.** Also note this pattern is unauditable by design — RCRE gets no record. That tension is worth naming rather than shipping quietly. |

**Flag for the coordinator:** the free-tier claim in R34 ("$10 balance → 10,000 prompts/day") is
Jeremy's meeting statement. `cloud-hermes.md` §6.2 says it verified provider facts; I have not
independently re-verified the figure and it should not be stated as fact in a leadership document
without a dated citation.

---

## §7. Hermes cloud and bots (R38–R47)

| Req | Class | Verdict |
|---|---|---|
| R38 — persistent memory + auto-created skills | **SAT (as design) / ENH** | 9 skills written; `rcre-procedures` is a self-declared placeholder. |
| R40 — sign in with an existing ChatGPT subscription | **SAT (as a decision)** | ADR-0011 anticipates exactly this. |
| R41 — MCP servers and n8n | **SAT/ENH + conflict** | The MCP boundary is real and tested (`mcp-authorization.test.ts`, 711 ln). **But n8n contradicts ADR-0004**, which chose in-app jobs and named n8n as deferred. The meeting screen showed Hermes wired to n8n webhooks. Someone has to decide whether ADR-0004 is revised or the n8n demo was Jeremy's own tooling and stays out of RCRE. |
| R39 — role-based bots, team-leader delegating to specialists | **NEW + POL** | 2 profiles exist. `cloud-hermes.md` §2 argues **against** a bot swarm and for profiles. That is a real architectural disagreement with what leadership was shown and liked, and it needs Jeremy's ruling — not a quiet resolution in a design doc. |
| R42 — Telegram / Gmail / Google Chat / SMS surfaces | **NEW + POL** | No gateway exists. **POL:** an agent messaging a broker bot over SMS creates a business record on a personal carrier account — records-retention and supervision exposure the Qualifying Broker must accept. Also: ADR-0014 means no read receipts, ever, on any of these. |
| R43 — always-on hosting | **NEW** | Local-only today. |
| R44 — voice | **NEW** | Nothing. |
| R45 — cloud/remote gateways | **NEW** | Nothing. |
| R46 — per-model billing visibility | **NEW** | Nothing — and it cannot exist before R34's router does. |
| R47 — the platform itself recruits | **SAT** | `app/join/page.tsx` (355 ln) plus `TrainingAccess.tsx` already make the platform the pitch. |

---

## §8. Marketing catalog, community, recruiting (R48–R55)

| Req | Class | Verdict |
|---|---|---|
| R48 — campaign builder producing images, video, copy | **SAT for shape / NEW for substance** | `CampaignBuilder.tsx` is a 137-line `setTimeout` sequence with four hard-coded strings and a "Fair housing check passed" label that checks nothing. **No image or video generation exists.** State this plainly to leadership — they watched it produce a campaign. |
| R49 — new-agent marketing routed for approval | **ENH** | The button exists; it renders a `DemoAction` note. `marketing/page.tsx` header already commits to the rule: *"Public marketing goes to broker review before it publishes."* The rule is stated, the queue is not built. |
| R50 — a marketing catalog | **ENH** | `marketing/page.tsx` lists 10 workflows; **exactly one has an `href`.** The other nine are `<details>` blocks describing outputs, honestly labelled. Nine workflows to build, plus the asset library `content-training-coach.md` Part A designs. |
| R52 — 30/90-day calendar approved up front, then autopilot | **NEW + POL** | Nothing built. **POL:** blanket pre-approval of unwritten content is the exact thing broker supervision exists to prevent. `content-training-coach.md` §A8 designs a bounded version; the boundary is Julio's to set. |
| R54/R55 — two Alabama agents, declined a $15k vendor | context | Routing design for exactly two agents is in `leadgen-website.md` §A4.3. |

**Do not rebuild:** the Marketing index page's honesty pattern (naming outputs instead of routing to
a stub) — it satisfies ADR-0006 and it is the right shape.

---

## §9. Lead generation, website, search (R56–R71)

| Req | Class | Verdict |
|---|---|---|
| R56 — 90-day Alabama test, contingent on 5-minute speed | **NEW + POL** | No ad connector, no campaign object. **POL:** the 5-minute SLA is a commitment by two named agents; nobody has said what happens when it is missed. `leadgen-website.md` §A4.2 proposes three clocks and three owners. |
| R59 — USDA / first-time buyer; DSCR contested | **NEW + POL + compliance** | **The notes present a contested item as agreed** — Julio pushed back on DSCR in the room. Additionally `leadgen-website.md` §A2.4 flags that a USDA campaign carries a specific fair-housing trap (USDA eligibility is geographic, and geographic targeting is a redlining proxy). This must not be built from the notes. |
| R60 — Florida MLS breadth | **INT + EXT** | `leadgen-website.md` §B1–B2 finds the MLS count is **higher than anyone said** and that "MLS access" ≠ "IDX Participant". Nothing built. |
| R62 — speed to lead | **ENH** | `people.first_touch_at` (0001 L114) is the correct primitive and its comment says *"Cannot be backfilled — capture from day one."* The metric machinery exists (`firstResponseForPerson`). What is missing is the alerting/routing loop that acts inside 5 minutes. |
| R63 — **leave Luxury Presence** | **NEW + supersedes an ADR** | **ADR-0005 currently says "Keep Luxury Presence through at least Phase 6."** Leadership reversed that in the meeting. ADR-0005 must be superseded — not edited — before any website work starts, or the repo will contradict the client. |
| R64 — persistent site AI assistant that knows every page | **NEW** | Nothing. The `(marketing)` route group in the demo is an **empty directory**. |
| R65/R67 — automated SEO/AEO/GEO blogging + Google Business Profile | **NEW** | Nothing. Two phases, zero built. |
| R68 — Instagram + YouTube channels | **EXT** | RCRE action. |
| R69/R70 — YouTube late-funnel buyers, podcast + coaching playlists | **NEW** | Content strategy; no capture surface exists. `leadgen-website.md` §A5.3 flags that Google/YouTube attribution **must be captured at the page or it is lost forever** — and `api/leads/route.ts` already accepts the full UTM/campaign block, so the receiving end is built. |
| R71 — **the promised local HTML file deliverable** | **NEW — and it is the nearest-term commitment in the meeting** | Jeremy committed at 00:47:02 to email a double-clickable local HTML file. **Nothing in the repo produces this.** `apps/rcre-demo` is a Next.js app requiring a dev server; there is no static export configured and I found no export script. This is a small piece of work, but it is the only thing RCRE is actually waiting on, and it is absent from all seven module designs. **Flagging it as the highest-priority near-term item.** |

---

## §10. Requirements traceability

Timestamps are **transcript** times from `RCRE & Jeremy AI + - 2026_08_26 09_58 EDT - Notes by
Gemini.md`. Recording time ≈ transcript time − 3:41 (recording begins at 00:03:41).

**Two timestamp corrections** to the root `MEETING_REQUIREMENTS_TRACEABILITY.md`, verified against
the transcript's `### **HH:MM:SS**` block markers:
* R1 was cited as `00:09:xx`; the utterance sits in the **00:08:38** block (line 323), before the
  00:10:05 marker.
* R15/R16 were cited as `00:28:12`; **no such marker exists.** Those utterances are in the
  **00:27:45** block (lines 585, 587).

| # | Requirement | Time | Who | Verbatim (short) | Class |
|---|---|---|---|---|---|
| R1 | Fewer clicks to see who contacted whom | 00:08:38 | Taquilla | "I don't want to have to go through so many funnels to see who's been contacting who" | ENH |
| R2 | Open one agent, see their leads | 00:08:38→00:10:05 | Taquilla | "go into one of the agents things and look at their leads" | SAT (demo) / NEW (product) |
| R3 | Contacted vs not contacted, per agent | 00:10:05 | Taquilla | "who they have contacted and who they haven't contacted" | ENH |
| R4 | Day-level overdue threshold | 00:10:05 | Taquilla | "hasn't been touched … one day overdue" | ENH + POL |
| R5 | Easier for her and the manager | 00:10:05 | Taquilla | "make it easier on myself and and the manager" | ENH |
| R6 | Leadership uses it for follow-up oversight | 00:33:54 | Taquilla | "me and Julio would definitely be using it for keeping up with the leads" | SAT |
| R7 | Bots surface where the ball is dropped | 00:26:48 | Taquilla | "seeing where dropping the ball at … who's not making contact" | ENH |
| R8 | Push work down from leadership | 00:27:45 | Taquilla | "pass these tasks down to other people" | NEW |
| R9 | She authors her own courses | 00:10:05 | Taquilla | "I'm building my classroom as well" | NEW |
| R10 | Zillow training from live call recordings | 00:10:57 | Taquilla | "taking a live call recording that and being able to place that in there" | NEW + POL |
| R11 | Named "Zillow 101 — initial phone call" | 00:10:57 | Taquilla | "okay Zillow uh 101 uh initial phone call" | NEW |
| R12 | ChatGPT account setup walkthrough | 00:11:55 | Taquilla | "what to turn on, what to turn off" | NEW |
| R13 | Prompting module | 00:11:55 | Taquilla | "going into prompting" | SAT |
| R14 | Inspection report → email to Margie | 00:11:55 | Taquilla | "drop the inspection report in there … say email to Margie and it does" | NEW + INT |
| R15 | Document walkthroughs, buyer rep forms | 00:27:45 | Taquilla | "walking them through and showing them how to fill it out" | NEW |
| R16 | Conditional assignment — not everyone is on Zillow | 00:27:45 | Taquilla | "not every agent in the future is going to be on Zillow" | NEW |
| R17 | Teaches ChatGPT use, not an embedded model | 00:13:07 | Taquilla | "if they had their own subscription" | SAT |
| R18 | Fill lender forms from a templates folder | 00:28:54 | Jeremy | "fill out the FHA case number request form" | NEW |
| R19 | Fill the purchase contract from instruction | 00:29:48 | Jeremy | "go fill out the purchase contract. This is the price that we want" | NEW + POL |
| R20 | Leadership reaction | 00:29:48 | Taquilla | "See, that to me that's next level." | — |
| R21 | Route for e-sign, return executed doc | 00:29:48 | Jeremy | "the contract to be e-signed … and then once it's e-signed have it come back in" | NEW + INT + EXT |
| R22 | Margie is the Florida TC | 00:30:47 | Julio | "Florida" | POL |
| R23 | TC send-out timelines are RCRE's | 00:30:47 | Jeremy | "the timelines of when you would want the transaction coordinator to send stuff out" | POL |
| R24 | Draft → review → approve → send | 00:30:47 | Jeremy | "review it … approve it, and send it" | SAT (pattern) / NEW (docs) |
| R25 | Integrate with Dotloop | 00:30:47 | Julio | "that would integrate with our dot loop then, right?" | EXT |
| R26 | Dotloop is e-sign and little else | 00:30:47 | Julio | "no, not really." | — |
| R27 | ~$500/mo Zillow product, encouraged | 00:31:57 | Julio | "it's a Zillow product" / "Not so much requires but highly encourages" | — |
| R28 | Open-source e-sign is an option | 00:31:57 | Jeremy | "some open-source e-signing platforms" | NEW |
| R29 | Zillow consolidating around FUB | 00:32:58 | Julio | "everything works out of follow-up boss" | — |
| R30 | Agents must not work two CRMs | 00:32:58 | Taquilla | "not really having them go into two different CRM" | NEW |
| R31 | Agents work out of RCRE, FUB underneath | 00:33:54 | Jeremy | "they really could just work out of your system … put the notes in there" | NEW + INT |
| R32 | Co-generated leads may sit outside FUB | 00:33:54 | Taquilla / Jeremy | "you don't want them in follows anyway" | POL |
| R33 | Claude/ChatGPT too expensive internally | 00:14:02 | Jeremy | "your most expensive ones to put in" | SAT |
| R34 | OpenRouter free tier | 00:14:02 | Jeremy | "10,000 prompts per day on them for free" | NEW (no router exists) |
| R35 | DeepSeek and MiniMax | 00:15:06–00:16:06 | Jeremy | "Deep Seek … really good and pretty affordable" | NEW |
| R36 | Image gen on the user's own ChatGPT | 00:15:06 | Jeremy | "a custom GPT for your brokerage … their existing chat GPT subscription" | NEW + POL |
| R37 | Local models on a Mac Studio | 00:25:34 | Jeremy | "you wouldn't have any AI bill at all" | NEW |
| R38 | Persistent memory, auto-created skills | 00:19:27 | Jeremy | "it remembers everything and it creates what are called skills" | SAT (design) |
| R39 | Role-based bots, team-leader delegation | 00:19:27 | Jeremy | "the team leader is going to assign work to the other bots" | NEW + POL |
| R40 | Sign in with an existing ChatGPT subscription | 00:20:45 | Jeremy | "they can actually sign in through their chat GPT subscription" | SAT |
| R41 | MCP servers and n8n | 00:21:56 | Jeremy | "connect it to what's called MCP servers … two different N8N" | SAT/ENH (ADR-0004 conflict) |
| R42 | Telegram, Gmail, Google Chat, SMS | 00:23:00 | Jeremy | "connect it to like Telegram, Gmail, Google chat, text messaging" | NEW + POL |
| R43 | Always-on hosting | 00:23:00 | Jeremy | "my computer never goes to sleep … you can also host this on a VPS" | NEW |
| R44 | Voice | 00:24:20 | Jeremy | "you just talk to it and you don't even ever have to type" | NEW |
| R45 | Cloud and remote gateways | 00:24:20 | Jeremy | "you can set it up on the cloud … remote gateways" | NEW |
| R46 | Per-model billing visibility | 00:24:20 | Jeremy | "you can really track your billing on it" | NEW |
| R47 | The platform itself recruits | 00:26:12 | Taquilla | "some of the stuff that you're saying to me will draw agents" | SAT |
| R48 | Campaign builder: images, video, copy | 00:07:24 | Jeremy | "we can have it create the images, videos, copy" | SAT (shape) / NEW (substance) |
| R49 | New-agent marketing routed for approval | 00:07:24 | Jeremy | "would have to send it to their team leader or one of you for approval" | ENH |
| R50 | A marketing catalog | 00:07:24 | Jeremy | "a whole entire marketing catalog … listing campaigns, open house" | ENH |
| R51 | Community feed, YouTube links, PDFs | 00:07:24 | Jeremy | "you can link YouTube videos, put PDF attachments" | ENH |
| R52 | 30/90-day calendar then autopilot | 00:08:38 | Jeremy | "approve upfront … then just set it on autopilot" | NEW + POL |
| R53 | External Skool community | 00:16:06–00:17:16 | Jeremy | "having a school [Skool] community … attract real estate agents" | NEW + POL |
| R54 | Two Alabama agents, recruiting is the need | 00:34:56 | Taquilla | "Right now we have two … we're trying to recruit more agents" | — |
| R55 | Declined a $15k recruiting vendor | 00:34:56 | Taquilla | "they wanted I think like $15,000" | — |
| R56 | 90-day Alabama test on a 5-minute SLA | 00:34:56 | Jeremy | "commit to calling those leads within the first 5 minutes" | NEW + POL |
| R57 | Zillow 5–40% at close, no monthly | 00:36:00 | Julio | "5 to 40% based on their price points" | — |
| R58 | Birmingham and surrounding | 00:37:01 | Taquilla | "we're in Birmingham and the surrounding areas" | — |
| R59 | USDA + first-time buyer; DSCR doubted | 00:38:04–00:39:08 | Jeremy / Julio | "Definitely USDA … DSCR I think cuz rents are still pretty low over there" | NEW + POL |
| R60 | Florida MLS breadth | 00:39:08 | Julio | "Miami, MLS, Access, Orlando, Stellar, Gainesville" | INT + EXT |
| R61 | One North Miami agent; others refer | 00:40:23 | Julio | "just one on the team if I needed to" | — |
| R62 | Speed to lead is the shared premise | 00:41:40 | Julio | "you got to pick up you know speed to lead" | ENH |
| R63 | Leave Luxury Presence | 00:41:40 | Taquilla / Jeremy | "come away from that and build something else, Jeremy?" — "Yes. Yes." | NEW (supersedes ADR-0005) |
| R64 | Persistent site AI assistant | 00:42:42 | Jeremy | "an AI assistant that people can talk to that knows what's on every single page" | NEW |
| R65 | Automated SEO + AEO + GEO blogging | 00:42:42 | Jeremy | "blog posts that are maximized for SEO, AEO, and GEO" | NEW |
| R66 | Evidence it works | 00:42:42 | Jeremy | "four or five closings so far from ChatGPT this year" | — |
| R67 | Two phases — blog, then Google Business | 00:42:42 | Jeremy | "the blog portion on the website and then Google business" | NEW |
| R68 | Add Instagram and YouTube channels | 00:44:47 | Taquilla / Jeremy | "we just have one for Facebook." / "I would set one up for Instagram and YouTube" | EXT |
| R69 | YouTube buyers are late-funnel | 00:44:47 | Jeremy | "they're typically ready to buy" | NEW |
| R70 | YouTube as content: podcasts, coaching playlist | 00:44:47 | Jeremy | "podcasts with different agents … a playlist … about becoming a [Realtor]" | NEW |
| R71 | Deliverable: a double-clickable local HTML file | 00:47:02 | Jeremy | "it's just going to be a HTML file … just double click on it" | NEW |

---

## §11. Policy decisions register — the exact question and the exact person

| # | Question | Must be answered by |
|---|---|---|
| P1 | What are the required-follow-up cadences (attempts, window, channels) per lead category, and the per-stage maximum days? `follow_up_policies` and `stage_aging_policies` are built and empty. Metric 16 and the "one day overdue" alert stay dark until this lands. | **Taquilla Allen** (Julio to ratify) |
| P2 | Does the Qualifying Broker accept that machine-prepared purchase contracts are a clerical act, and who is the required human approver before any contract leaves RCRE? | **Julio Arango** + brokerage counsel |
| P3 | Who coordinates Alabama transactions? Margie is Florida-only. | **Taquilla Allen** |
| P4 | What are the TC send-out timelines by milestone? | **Taquilla / Margie** |
| P5 | Do co-generated leads bypass FUB, and what is the reciprocal mortgage-referral term? | **Julio + Jeremy** |
| P6 | May listing imagery be generated in an agent's personal ChatGPT account, and who owns / is liable for that output? Note it is unauditable by RCRE by design. | **Julio Arango** |
| P7 | Profiles or a bot swarm? `cloud-hermes.md` §2 recommends profiles; the meeting demo showed and leadership liked a team-leader-plus-specialists model. | **Jeremy McDonald** |
| P8 | Is n8n in or out? ADR-0004 currently says deferred; the Hermes demo was wired to it. | **Jeremy McDonald** (ADR revision) |
| P9 | Which Hermes surfaces are approved for business communication (SMS / Telegram / Gmail), given records-retention and supervision obligations — and confirm ADR-0014 (no read receipts) is understood on all of them. | **Julio Arango** |
| P10 | Which AI Advantage courses may appear on a public Skool, and what is the coaching-revenue split? | **Jeremy McDonald** |
| P11 | What is the consequence when the Alabama 5-minute SLA is missed, and who owns the reassignment clock? | **Taquilla + Julio** |
| P12 | Blanket 30/90-day content pre-approval — what is the maximum scope a broker will pre-approve sight-unseen? | **Julio Arango** |
| P13 | Two-party consent for recording live consumer calls used as training material (FL). | **Julio Arango** + counsel |

---

## §12. ADR consequences of this meeting

| ADR | Current text | Meeting effect |
|---|---|---|
| **0005** — Keep Luxury Presence through Phase 6; no RCRE IDX early | **Directly reversed** by R63. Must be **superseded**, not edited. |
| **0004** — In-app jobs, not n8n | In tension with R41. Needs an explicit revision or an explicit "that was Jeremy's tooling". |
| **0015** — MVP scope freeze at three functions + exceptions-first | Every one of §3, §9 and most of §7 fails the "materially improves one of the three" test. The freeze was correct and the meeting broke it. **Someone must decide whether ADR-0015 is superseded or whether V2 is a second, sequenced programme behind it.** |
| **0011** — Provider-agnostic AI | Reaffirmed by R33–R37, and revealed to be entirely unimplemented. |
| **0012** — FUB system of record | Reaffirmed; but R31 requires a write surface ADR-0012 has not authorised. |
| **0014** — No SMS read receipts | Still binding, and newly relevant to R42. |

New ADRs implied: Dotloop AI boundary (Branch A/B) · e-signature vendor · model router and provider
policy · Hermes hosting · the RCRE-as-workspace/FUB-of-record write model · website replacement.

---

## §13. Explicitly: do not rebuild these

1. `app/agents/[id]/page.tsx` — the agent inspector. It already shows the book, never-answered,
   stale-in-stage and overdue. It needs a data source, not a redesign.
2. `exceptionsFor()` in `app/agents/page.tsx` — exception-first roster ordering.
3. `follow_up_policies` / `stage_aging_policies` — the threshold engine exists and is correctly empty.
4. `lib/reporting/metrics.ts` — 16 metrics with `clampWindow()` honesty rails, 723 lines of tests.
5. `lib/insights/engine.ts` — 8 insight generators, dedupe, priority ordering.
6. `mcp/rcre-mcp-server/src/authorize.ts` — the 6-stage gate and the bound single-use approval record.
   This is the reusable primitive for **every** approval requirement in V2 (documents, marketing,
   contracts). Build the queue on top of it; do not invent a second approval concept.
7. `pii-guard.ts` + `hermes/hooks/` — technical PII enforcement with tested hook parity.
8. `api/leads/route.ts` — full UTM/campaign capture at the moment of capture, plus the
   consumer/recruiting two-lane split that R32 will need.
9. `TrainingAccess.tsx` — the `publicPreview` rule that stops paid curriculum leaking to public surfaces.
10. `data/academy.ts` — 14 courses / 181 lessons of real curriculum with provenance.
11. The Marketing index's honest-stub pattern (name the outputs, do not route to a stub) — ADR-0006.

---

## §14. Could not verify — do not state these as facts

* **Whether `apps/rcre` has ever run against a live Postgres.** `db/pg.ts` says it has not; I did not
  attempt a connection (out of scope for this pass) and there is no evidence either way in the repo.
* **Whether the test suite currently passes.** I read the tests; I did not run them.
* **OpenRouter's free-tier terms** (R34). Jeremy's meeting figure. `cloud-hermes.md` §6.2 claims
  verification; I did not re-verify.
* **Dotloop pricing** (~$500/mo, R27). `dotloop.md` §1 flags it as NOT VERIFIED.
* **Margie's surname, role scope, employment status and system access.** `transaction-coordinator.md`
  §7 flags the same. Note the demo has a synthetic agent "Margie Olsen-Alvarez" in `demo.ts` who is a
  REALTOR®, not a TC — **the demo persona and the real person are different people and the name
  collision is a live confusion risk in any leadership demo.**
* **Whether RCRE holds IDX Participant status** in any of the named MLSs (vs. mere MLS access).
* **Whether the FUB Facebook Lead Ads integration is active** — open item #8 in the FUB verification.
* **The 15-vs-17 MCP tool count.** The task brief says 15; `tools.ts` defines 17. I did not find a
  document that says which 15 were intended, so the brief may simply be stale.
