# RCRE Convergence — Migration Inventory

**Status:** inventory and plan only. No file was moved, deleted or rewritten in producing this.
**Produced:** 2026-08-26, by reading the source of both applications, not their documentation.
**Verification performed (read-only):**

| Check | Command | Result |
|---|---|---|
| `apps/rcre` test suite | `vitest run` | **409 passed / 409**, 11 files, 1.07s |
| `apps/rcre` types | `tsc --noEmit` | clean |
| `apps/rcre-demo` types | `tsc --noEmit` | clean |
| Academy asset integrity | `node scripts/verify-academy-assets.mjs` | 243 refs, 0 missing, 0 size mismatches, 1 orphan (`/academy/covers/00-school-welcome.webp`) |

File counts (actual, excluding `node_modules`/`.next`): `apps/rcre-demo` = 81 `.ts`/`.tsx` + 1 `.css` under `src/`, plus 244 files under `public/academy` and 3 under `public/brand`. `apps/rcre` = 45 files under `src/` + `tests/` + `supabase/`.

A **third component**, owned by neither app, is load-bearing and must be in scope: `RCRE/mcp/rcre-mcp-server/` (3 source files) and `RCRE/hermes/hooks/` (the deployed PII hook + rule table). `apps/rcre/tests/unit/mcp-authorization.test.ts` reaches **outside its own app** via `../../../../mcp/rcre-mcp-server/src/authorize` — 148 of the 409 tests depend on that relative path holding.

---

## 1. The target shape

### Recommendation: `apps/rcre-demo` becomes the canonical app. The domain layer moves into it.

Not because the UI is worth more than the domain layer — it is not — but because of a hard asymmetry in **what can be moved without being broken silently**.

**The domain layer is a portable directory.** `apps/rcre/src/lib/**` contains **zero React** (verified: no file under `src/lib` mentions React or JSX). Its only non-relative imports are `@/lib/*`, `server-only`, `next/headers`, `pg`, and `node:crypto`. Both apps already resolve `@/*` to `./src/*` with **identical** tsconfig paths. So `src/lib/`, `tests/`, `supabase/` and `vitest.config.ts` move as a unit with **no import rewrites at all**, and the 409 tests re-run in the new location to prove it.

**The UI is not a portable directory.** Moving 81 files the other way requires, at minimum:

- replacing `apps/rcre/src/app/globals.css` (**6 lines**) with the demo's (**269 lines** of light/dark token system);
- replacing `apps/rcre/tailwind.config.ts`, whose token vocabulary is **incompatible**, not merely different — `rcre` uses `ink.soft`/`ink.mute`/`line`/`rcre.deep`/`rcre.accent`; the demo uses `ink.raised`/`ink.elevated`/`brass`/`brass.fill`/`chalk`/`hair`/`signal.urgent` plus a custom type scale, `borderRadius.panel`, `maxWidth.shell` and four keyframe animations. Every one of the 81 demo files is written against the second vocabulary;
- porting `next/font` (Syne + Nunito Sans), the pre-paint theme script, `next.config.mjs` `images.remotePatterns` (CloudFront + Cloudinary), and **~93 MB** of `public/` assets;
- and then **rewriting the seven UI files apps/rcre already has** (`layout.tsx`, `page.tsx`, `today`, `command`, `join`, `InsightCard`, `EmptyState`), because they are authored against the vocabulary being replaced and would render broken.

That is a rewrite of the approved experience by another name — exactly what Jeremy forbade. And it is **unverifiable**: `apps/rcre-demo` has no test suite, so a UI regression introduced during the move has nothing to catch it.

**The rule that decides it: move the half that has a safety net, not the half that doesn't.**

**Trade-offs accepted.** The canonical app inherits the demo's `package.json` name (`rcre-demo`) and port (3200) — both are cosmetic and should be renamed to `rcre-app` / 3100 in Phase 0 so the deployment identity of `apps/rcre` survives. The demo's `next.config.mjs` sets `devIndicators: false` and permits two remote image hosts; both need review before production. And `apps/rcre-demo/src/lib/academy.ts` imports `node:fs` — already handled correctly (it never reaches a client bundle), but it is a constraint the merged app inherits.

**What would change my mind:**

1. If `apps/rcre` had a deployment target, CI, `middleware.ts` or auth integration already pointed at it. **It does not** — verified: no middleware, no `.github`, no CI config in either app.
2. If the 93 MB of Academy video made the canonical app undeployable on the chosen host. Mitigation is to move `public/academy/video/*` to object storage, not to reverse the direction.
3. If Jeremy states the `apps/rcre` path itself is contractually pinned. Then invert the *paths* — `git mv apps/rcre apps/rcre-domain; git mv apps/rcre-demo apps/rcre` — but keep the *direction*: the domain layer still merges into the UI app.

---

## 2. The seam: does `repository.ts` already provide it?

**Yes — almost entirely, and it is better than expected.**

`apps/rcre/src/lib/db/repository.ts` defines `interface Repository` with 13 methods, two implementations (`MemoryRepository` over `MemorySeed`, `PgRepository` over Postgres), and `getRepository()` in `db/index.ts` which selects between them on `dataMode()`. Crucially **scoping is enforced inside the repository, not in the caller** — `listPeople(actor)` filters to `assignedUserId === actor.userId` for non-broker roles; `listRecruitingProspects` throws `PermissionDeniedError` for roles outside `{owner, broker, recruiter}`; `listActivity` authorizes *through* `getPerson`, so no person means no activity.

**Can the demo's screens be re-pointed at it without redesign? Yes, for 8 of 12 authenticated screens.** The demo's page-level shape is already `read → filter → render`:

- `/today` → `listPeople`, `listTasks`, `listAppointments`, `listActivityForPeople` — all present
- `/crm`, `/crm/[id]` → `listPeople`, `getPerson`, `listActivity` — all present
- `/pipeline` → `listPeople` (+ `Person.stage`) — present
- `/command` → `listPeople`, `listTasks`, `listDeals`, `listUsers` — all present
- `/agents`, `/agents/[id]` → `listUsers`, `listPeople` — present
- `/recruiting`, `/recruiting/[id]` → `listRecruitingProspects` — present

**Four gaps must be added to the interface** (they are additions, not redesigns):

1. `listListings(actor)` — no listings table exists in migrations 0001–0003 at all. Listings are a new domain, not a migration.
2. `listStageTransitions(actor, personId)` — the type (`StageTransition`) and the table (`stage_transitions`, migration 0002) exist; the repository does not read them. Needed for `stageEnteredAt` / stage-aging.
3. Academy progress — `getAcademyProgress(actor)` / `markLessonComplete(actor, lessonId)`. No table exists.
4. Community posts — `listCommunityPosts` / `createCommunityPost`. No table exists.

**Type impedance is real but mechanical.** The demo renders `DemoContact` (`firstName`, `lastName`, `stage`, `ownerId`, `timeline[]`, `reasons[]`, `nextAction`); the domain renders `Person` (`assignedUserId`, no `timeline`, no `reasons`) plus `Activity[]` and `Insight[]`. The mapping is: `ownerId → assignedUserId`, `timeline → Activity[]`, `reasons/priority/recommendation → Insight` from `insights/engine.ts` (which already produces exactly `{ type, priority, subject, reasons[], recommendedAction }`). **This is the single highest-value discovery in the inventory: the demo's authored `reasons[]` arrays are the hand-written output of a rule engine that already exists and is covered by 28 tests.**

---

## 3. File-level inventory — `apps/rcre-demo` (the canonical shell)

### 3.1 App shell and configuration

| File | Class | Notes |
|---|---|---|
| `src/app/layout.tsx` | **KEEP IN PLACE** | Fonts, pre-paint theme script. Replaces `apps/rcre/src/app/layout.tsx`. |
| `src/app/globals.css` (269 ln) | **KEEP IN PLACE** | **REPLACE**s `apps/rcre/src/app/globals.css` (6 ln). Demo wins: full light/dark token system. |
| `tailwind.config.ts` | **KEEP IN PLACE** | **REPLACE**s `apps/rcre/tailwind.config.ts`. Demo wins: it is the vocabulary 81 files are written against. |
| `next.config.mjs` | **KEEP IN PLACE + review** | Audit `devIndicators: false` and the two `remotePatterns` hosts before production. |
| `tsconfig.json` | **KEEP IN PLACE** | Identical `@/*` alias to `apps/rcre` — this is what makes the domain-layer move free. |
| `package.json` | **MIGRATE + REWIRE** | Merge in `pg`, `zod`, `server-only`, `vitest`, `@types/pg` from `apps/rcre`. Rename to `rcre-app`, port 3100. |
| `postcss.config.mjs`, `next-env.d.ts` | **KEEP IN PLACE** | — |
| `scripts/verify-academy-assets.mjs` | **KEEP IN PLACE** | Real integrity check; wire into CI. |
| `tsconfig.tsbuildinfo` | **DELETE** | Build artifact, should not be tracked. |

### 3.2 Authentication — the whole persona-cookie path

| File | Class | Notes |
|---|---|---|
| `src/lib/session.ts` | **DELETE** | `currentUser()` reads cookie `rcre_demo_user`, looks up `USERS` from `@/data/demo`. No password, no verification. Replaced by `apps/rcre/src/lib/auth/session.ts` → Supabase Auth. |
| `src/app/api/session/route.ts` | **DELETE** | POST sets the persona cookie from a form field; GET deletes it. This is "sign in as anyone by name". |
| `src/app/login/page.tsx` | **MIGRATE + REWIRE** | The *screen* is good (two named doors, honest copy). Rewire the `<form action="/api/session">` to a real credential flow. Keep the layout, replace the mechanism. |
| `src/lib/greeting.ts` | **MIGRATE AS-IS** | 10 lines, pure. |

### 3.3 Screens — MIGRATE + REWIRE (UI good, data source changes)

Every row below keeps its markup. The "Today" column names the exact synthetic import; "Real replacement" names the backend module.

| Route (file) | Today | Real replacement |
|---|---|---|
| `src/app/today/page.tsx` (397 ln) | `CONTACTS`, `TASKS`, `APPOINTMENTS`, `LISTINGS`, `DEMO_NOW`, `contactsFor`, `contactById('c-dana')`, `isStageStale`, `daysInStage` from `@/data/demo` | `repo.listPeople/listTasks/listAppointments/listActivityForPeople(actor)` → `buildToday(bundle)` from `@/lib/insights/engine`. The hard-coded `priority = contactById('c-dana')` becomes `insights.filter(i => i.priority === 'high')[0]`. `isStageStale`/`daysInStage` → `evaluateStageAging` in `@/lib/reporting/policy`. |
| `src/app/command/page.tsx` (477 ln) | `brokerageMetrics()` from `@/data/demo`; `STAGE_AGING` from `@/data/reporting`; `USERS`, `RECRUITS` | `buildBrokerMetrics(now, people, tasks, deals)` from `@/lib/insights/engine` (already returns `newLeads24h`, `unansweredLeads`, `medianFirstResponseMinutes`, `agentsWithOverdueTasks`, `leadsBySource`, **plus `unavailable[]`** — adopt that honesty panel). `STAGE_AGING` → `timeInStage()` from `@/lib/reporting/metrics`. `RECRUITS` → `repo.listRecruitingProspects(actor)`. |
| `src/app/command/reporting/page.tsx` (377 ln) | `funnelRows(period)` from `@/data/reporting` — a **seeded pseudo-random generator** | `firstResponseReport`, `contactAttempts`, `appointmentSetRate`, `leadToContract`, `leadToClosing`, `sourcePerformance`, `agentActivity`, `pipelineFallout` from `@/lib/reporting/metrics` (16 metrics, 61 tests). Must also adopt `clampWindow()` — four of these metrics are forward-only and the real module returns the clamped window so the UI can state its own earliest valid date. |
| `src/app/crm/page.tsx` (225 ln) | `CONTACTS`, `contactsFor(user.id)`, `userById` | `repo.listPeople(actor)` — **the in-page `user.role === 'broker' ? CONTACTS : contactsFor(user.id)` branch is deleted**, because the repository already does that. |
| `src/app/crm/[id]/page.tsx` (387 ln) | `contactById`, `TASKS`, `APPOINTMENTS`, `c.timeline` | `repo.getPerson(actor, id)` (returns null → `notFound()`), `repo.listActivity(actor, id)` for the timeline, `repo.listTasks/listAppointments`. **The in-page guard `if (user.role !== 'broker' && contact.ownerId !== user.id) notFound()` is deleted** — `getPerson` already fails closed. |
| `src/app/pipeline/page.tsx` (100 ln) | `CONTACTS`, `PIPELINE_STAGES`, `contactsFor` | `repo.listPeople(actor)` grouped by `Person.stage`; `PIPELINE_STAGES` becomes a stages table seeded from `FubClient.listStages()`. |
| `src/app/agents/page.tsx` (184 ln) | `USERS` + `u.stats` (synthetic per-agent figures) | `repo.listUsers(actor)` + `agentActivity()` from `@/lib/reporting/metrics`. **`DemoUser.stats` has no real equivalent and must not be faked** — render only computable columns. |
| `src/app/agents/[id]/page.tsx` (286 ln) | `USERS`, `CONTACTS`, `TASKS`, `LISTINGS` | `repo.getUser` + `repo.listPeople(actor)` filtered by `assignedUserId`. Roster percentile at line 46 → `agentActivity()`. |
| `src/app/recruiting/page.tsx` (177 ln) | `RECRUITS` from `@/data/demo` | `repo.listRecruitingProspects(actor)` — already role-gated and already throws for non-recruiting roles. |
| `src/app/recruiting/[id]/page.tsx` (162 ln) | `recruitById` | Add `getRecruitingProspect(actor, id)` to `Repository` (trivial, mirrors `getPerson`). |
| `src/app/listings/page.tsx` (100 ln) | `LISTINGS` | **New domain.** Needs a `listings` table + `listListings(actor)`. Nothing in migrations 0001–0003 covers it. |
| `src/app/listings/[id]/page.tsx` (247 ln) | `listingById`, `contactById`, `userById` | Same; plus `ListingEngagement` needs a real engagement source. |
| `src/app/marketing/page.tsx` (149 ln) | `LISTINGS` + a literal `WORKFLOWS` array | `WORKFLOWS` is honest scaffolding (it says only one workflow is built end-to-end). Keep as authored config until the workflows are real. |
| `src/app/assistant/page.tsx` (22 ln) | passes `agentName` to `<Assistant>` | Rewire to `repo.getUser(actor.userId).fullName`. |
| `src/app/join/page.tsx` (355 ln) | `ACADEMY`, `POSTS`, `OPEN_COURSES` | **REPLACES** `apps/rcre/src/app/join/page.tsx` (159 ln). Demo version wins — richer, uses real curriculum, same honesty discipline (no splits, no fees, no invented testimonials). Wire its form to the existing `POST /api/leads` with `kind: 'recruiting'`. |
| `src/app/page.tsx` (181 ln) | Public marketing page | **KEEP IN PLACE.** Replaces `apps/rcre/src/app/page.tsx` (26 ln). |

### 3.4 Screens — Academy and Community

| Route | Class | Notes |
|---|---|---|
| `src/app/training/page.tsx` (185 ln) | **MIGRATE AS-IS** | Reads `@/lib/academy` (real curriculum) + `POSTS`. Only the `POSTS` reference rewires. |
| `src/app/training/layout.tsx` (49 ln) | **MIGRATE + REWIRE** | Seeds `AcademyProgressProvider` from `ACADEMY_PROGRESS`; seed becomes `repo.getAcademyProgress(actor)`. |
| `src/app/training/classroom/page.tsx` (103 ln) | **MIGRATE AS-IS** | Pure curriculum. |
| `src/app/training/classroom/[courseId]/page.tsx` (126 ln) | **MIGRATE AS-IS** | Pure curriculum. |
| `src/app/training/classroom/[courseId]/[lessonId]/page.tsx` (159 ln) | **MIGRATE AS-IS** | Pure curriculum + the two real videos. |
| `src/app/training/community/page.tsx` (195 ln) | **MIGRATE + REWIRE** | `POSTS`, `LEADERBOARD`, `postsIn`, `trainingOfTheDay` from `@/data/community` → `repo.listCommunityPosts(actor)`. The server-side lesson-href resolution (`CommunityLessonLink`) is a correct pattern — **preserve it**. |

### 3.5 Components — MIGRATE AS-IS (presentational, no synthetic import)

`AppShell.tsx` (149) · `ThemeToggle.tsx` (87) · `Logo.tsx` · `Avatar.tsx` · `PageHeader.tsx` · `BackLink.tsx` · `StageChip.tsx` · `CrmSearch.tsx` · `ListingVisual.tsx` · `ListingEngagement.tsx` · `DayPlan.tsx` · `AttentionRow.tsx` · `PublicPillars.tsx` · `JoinPillars.tsx` · `PreviewShowcase.tsx` · `PreviewSurfaces.tsx` (363) · `TrainingNav.tsx` · `AcademyProgressBar.tsx` · `AcademyLessonStage.tsx` · `AcademyResourceList.tsx` · `AcademyCourseCard.tsx` · `AcademyCatalogCard.tsx` · `CommunityFilters.tsx` · `CommunityPromptBlock.tsx` · `CommunityModel.ts` — **25 files, no change.**

One rewire inside `AppShell.tsx`: `AGENT_NAV` / `BROKER_NAV` are keyed on `role: 'agent' | 'broker'` and must widen to the seven-role `UserRole` union (`owner | broker | team_lead | agent | staff | recruiter | viewer`) — the research already calls for a `transaction_coordinator` nav set.

### 3.6 Components — MIGRATE + REWIRE

| Component | Synthetic import today | Real replacement |
|---|---|---|
| `Assistant.tsx` (390) | `SUGGESTED`, `TURNS` from `@/data/conversations` — a scripted transcript replayed on a 700 ms `setTimeout` | Real Hermes turn over the MCP boundary. **The chrome is already correct and must survive**: `StatusPill` ('done' / 'drafted, not sent' / 'needs your approval'), the tool-activity strip, and the `ACTIONS` map's three honest outcomes (`href` / `ask` / `note`). Note the scripted tool labels are literally `rcre.get_my_today`, `rcre.get_hot_leads` — **they already name real tools in `mcp/rcre-mcp-server/src/tools.ts`.** The transcript is a specification of the wire format. |
| `CampaignBuilder.tsx` (137) | `STEPS` + `OUTPUT` const arrays, staged by `setTimeout(..., i*850)` | Real generation behind an approval gate. **Preserve**: the fair-housing review step, "Compliance review required", the `approved` gate, and the "Send to broker for review" affordance. All four map to `draft_*` MCP tools with `requiresApproval: true`. |
| `AcademyProgressProvider.tsx` (341) | `localStorage['rcre-academy-progress-v1']`, seeded from `ACADEMY_PROGRESS` | Server-persisted per-user progress. **Keep the `useSyncExternalStore` architecture** — three surfaces update in one frame. Change the store's backing from `localStorage` to a mutation + revalidate. |
| `CommunityFeed.tsx` (137) | `localStorage['rcre-community-posts-v1']` and `['rcre-community-likes-v1']` | `repo.listCommunityPosts` / `createCommunityPost` / `toggleLike`. |
| `CommunityComposer.tsx` (198) | writes `CommunityLocalPost` to `localStorage` | Server action → `createCommunityPost(actor, …)`. |
| `CommunityPost.tsx` (157), `CommunityRail.tsx` (80) | props from `@/data/community` | Props from the repository. Markup unchanged. |
| `CrmSignals.tsx` (73) | `STAGE_THRESHOLD_DAYS`, `daysInStage`, `isStageStale` from `@/data/demo` — thresholds marked "PLACEHOLDERS — RCRE has not set these" | `evaluateStageAging()` + the `stage_aging_policies` table (migration 0002). **Critical: `policy.ts` returns NO violations when no policy rows exist. The demo's placeholder thresholds must NOT be seeded as defaults** — that would silently enforce our standard against RCRE's agents. |
| `PriorityCard.tsx` (57) | `DemoContact.reasons[]`, `.recommendation` | `Insight.reasons[]`, `Insight.recommendedAction` — same shape, one rename. |
| `RecruitSignals.tsx` (108), `RecruitPipeline.tsx` (63) | `DemoRecruit` | `RecruitingProspect` from `@/lib/types` + fields to add (`engagement`, `channel`, onboarding state). |
| `AcademyContinueCard` (100), `AcademyCourseResume` (51), `AcademyLessonRow` (107), `AcademyLessonNavigator` (168), `AcademyOverviewProgress` (89), `AcademyProgressSummary` (24), `AcademyMarkComplete` (66) | all consume `AcademyProgressProvider` | **No change needed** once the provider's backing store changes. They are already behind the seam. |
| `TrainingAccess.tsx` (45) | reads `course.publicPreview` from real curriculum | **MIGRATE AS-IS.** Correct by construction; do not reintroduce a hard-coded open-course list. |
| `DemoAction.tsx` (35), `LogCallButton.tsx` (28), `DraftOutreachButton.tsx` (38) | acknowledge-and-explain buttons | **KEEP during migration, DELETE per-instance as each real action lands.** They are the honest placeholder pattern; deleting them all at once would leave dead buttons. |

### 3.7 Data files

Covered in full in §5.

---

## 4. File-level inventory — `apps/rcre` (the domain layer)

### 4.1 MIGRATE AS-IS — moves as a directory, zero edits

`src/lib/types.ts` (215) · `src/lib/db/repository.ts` (191) · `src/lib/db/pg.ts` (227) · `src/lib/db/index.ts` (28) · `src/lib/db/rls.ts` (209) · `src/lib/config/env.ts` (49) · `src/lib/fub/client.ts` (250) · `src/lib/fub/normalize.ts` (319) · `src/lib/fub/types.ts` (84) · `src/lib/fub/signature.ts` (32) · `src/lib/fub/webhook.ts` (160) · `src/lib/fub/stageHistory.ts` (150) · `src/lib/fub/assignmentHistory.ts` (233) · `src/lib/insights/engine.ts` (507) · `src/lib/reporting/metrics.ts` (870) · `src/lib/reporting/policy.ts` (295) · `src/lib/sync/backfill.ts` (517)

`supabase/migrations/0001_rcre_mvp_core.sql` (403) · `0002_reporting_and_routing.sql` (370) · `0003_row_level_security.sql` (954) — **22 tables.**

`vitest.config.ts` · `tests/stubs/server-only.ts` · `tests/fixtures/seed.ts` (158) · all 11 test files (2,660 ln).

`.env.example` — **MIGRATE AS-IS.** Names only, correctly server-only, with both write gates defaulting off.

### 4.2 MIGRATE + REWIRE

| File | Notes |
|---|---|
| `src/lib/auth/session.ts` (33) | `getActor()` is the **correct target shape** and already fails closed in live mode (`return null`). Its fixtures branch reads cookie `rcre_dev_role` and maps to `BROKER_ID`/`AGENT_A` — replace that branch with Supabase Auth. Everything downstream is already shaped for it: every repository call takes a resolved `Actor`. |
| `src/app/api/leads/route.ts` (105) | Move as-is; **then fix** — see §8.2. |
| `src/app/api/webhooks/fub/route.ts` (45) | Move as-is; **then fix** the in-process `memoryLedger` — see §8.3. |
| `src/app/dev/role/route.ts` (48) | **Keep during migration** (it refuses outright outside fixtures mode, which is correct), **DELETE at Phase 6** once Supabase Auth lands. |

### 4.3 REPLACE — superseded by the demo's version

| File | Superseded by | Why |
|---|---|---|
| `src/app/layout.tsx` (56) | `rcre-demo/src/app/layout.tsx` | Demo has the fonts, the theme system, no dev banner. |
| `src/app/globals.css` (6) | `rcre-demo/src/app/globals.css` (269) | Six lines vs the full token system. |
| `tailwind.config.ts` | `rcre-demo/tailwind.config.ts` | Incompatible vocabulary; 81 files depend on the demo's. |
| `src/app/page.tsx` (26) | `rcre-demo/src/app/page.tsx` (181) | Two-link stub vs the approved public page. |
| `src/app/join/page.tsx` (159) | `rcre-demo/src/app/join/page.tsx` (355) | Both hold the same honesty line on splits/fees/testimonials; the demo's is the designed one. |
| `src/app/today/page.tsx` (86) | `rcre-demo/src/app/today/page.tsx` (397) | **But keep its logic**: this file is the reference implementation of `getActor → repo → buildToday → render` and of the `recordAudit({action:'view_today'})` call. Port that spine into the demo's page. |
| `src/app/command/page.tsx` (119) | `rcre-demo/src/app/command/page.tsx` (477) | **But keep two things**: the `canSeeWholeBrokerage(actor.role)` gate with its **denial audit record**, and the "Not yet measurable" `unavailable[]` panel. Both are honesty features the demo lacks. |
| `src/components/InsightCard.tsx` (52) | `rcre-demo/src/components/PriorityCard.tsx` + `AttentionRow.tsx` | Demo styling wins. **Keep `TYPE_LABEL`** — the 11-entry `Record<Insight['type'], string>` map is the display vocabulary for the real engine. |
| `src/components/EmptyState.tsx` (8) | demo equivalents | Trivial. |

### 4.4 Shared components — KEEP IN PLACE (outside both apps)

`mcp/rcre-mcp-server/src/tools.ts` (329) — 17 tools, `FORBIDDEN_ARG_NAMES`, `PROHIBITED_TOOL_NAMES`.
`mcp/rcre-mcp-server/src/authorize.ts` (221) — the 6-stage gate + approval binding.
`mcp/rcre-mcp-server/src/pii-guard.ts` (157) — reads `hermes/hooks/rcre-pii-rules.json`.
`hermes/hooks/block-pii-memory.mjs` (131) + `rcre-pii-rules.json` (72) — the deployed hook.
`hermes/profiles/*`, `hermes/skills/*` — 2 profiles, 9 skills.

**These stay where they are.** But the test import path `../../../../mcp/rcre-mcp-server/src/authorize` is depth-sensitive: it resolves from `apps/rcre/tests/unit/`. If the canonical app sits at the same depth (`apps/rcre/tests/unit/`), the path is unchanged. **Verify this on the first test run after the move — 148 tests depend on it.**

---

## 5. The synthetic-data problem

| File | Lines | Disposition |
|---|---|---|
| `src/data/academy.ts` | **2,826** | **MIGRATE AS-IS → database seed.** This is REAL imported curriculum: 14 courses, 181 lessons, generated from Jeremy's AI Advantage production workspace, with `sourcePath` provenance on every record. It becomes the seed for `courses` / `lessons` / `lesson_resources` tables. **`sourcePath` must be stripped at the boundary, exactly as `lib/academy.ts` does today** (it was leaking into the streamed React payload before that fix — do not regress it). The `demoProgress` export at the tail is the only synthetic part: it becomes a **test fixture**. |
| `src/data/academy-types.ts` | 97 | **MIGRATE AS-IS.** The data contract. Its rule "a lesson without a video renders as what it is" is a truthfulness constraint, not a stub. |
| `src/lib/academy.ts` | 204 | **MIGRATE AS-IS.** Already a proper data boundary with one swap line. `node:fs` asset verification is server-only and correct. |
| `public/academy/**` | 244 files, ~93 MB | **MIGRATE AS-IS.** 2 real MP4s + VTTs, 29 PDF handouts, 15 covers, ~198 lesson cards. Consider object storage for the video. |
| `src/data/demo.ts` | **899** | **SPLIT.** (a) `USERS` roster → **seed** for `users`, after the corrections in §5.1. (b) `CONTACTS`/`TASKS`/`APPOINTMENTS`/`RECRUITS` (the seven authored stories) → **test fixture**, merged into `tests/fixtures/seed.ts` — they are better stories than the current 5-person fixture and the two overlap by design (Dana Whitfield, Marcus Ordonez, Priya Raghunathan, the Kowalczyks appear in both). (c) `LISTINGS` → **seed** for the new listings table. (d) `brokerageMetrics()` → **DELETE**, superseded by `buildBrokerMetrics()`. (e) `STAGE_THRESHOLD_DAYS`/`daysInStage`/`isStageStale` → **DELETE**, superseded by `stage_aging_policies` + `evaluateStageAging()`. (f) `STAGE_ENTERED` / `NEXT_ACTION` const maps → **DELETE**, superseded by `stage_transitions` + `Insight.recommendedAction`. (g) `DEMO_NOW = new Date()` → **DELETE**; fixtures use the pinned `NOW = '2026-08-19T15:00:00.000Z'`. |
| `src/data/community.ts` | 278 | **TEST FIXTURE, then DELETE.** All posts are fiction. Two things survive: the `CATEGORIES` list → **seed** for a categories table; and the discipline that **every lesson a post cites resolves to a real lesson** (it calls `lessonById`/`courseById`) → becomes a foreign-key constraint. Jeremy McDonald appears as instructor because he is one — keep that identity, drop the invented posts. |
| `src/data/conversations.ts` | 399 | **TEST FIXTURE (golden transcript), then DELETE.** The `Block` union (`text` / `reasons` / `draft` / `plan` / `actions` / `source`) is the **assistant's real response schema** — extract it to `src/lib/assistant/blocks.ts` and keep it. `TURNS` becomes a conformance fixture: the live assistant should be able to produce these shapes. `SUGGESTED` → seed for starter prompts. |
| `src/data/reporting.ts` | 163 | **DELETE.** `funnelRows()` is a seeded pseudo-random generator; `AGENT_PROFILE` assigns synthetic performance to **named real RCRE agents** (`u-chad`: `speed: 2.8, convert: 0.45`). Superseded entirely by `@/lib/reporting/metrics.ts`. Keep only `PERIODS` (a UI control) and `MARKETS` (→ seed). |

### 5.1 REQUIRED CORRECTION — the "Margie" collision

**Current state in `apps/rcre-demo/src/data/demo.ts:81`:**

```ts
id: 'u-rita', name: 'Marguerite Olsen-Alvarez', firstName: 'Rita', role: 'agent',
title: 'REALTOR®', market: 'St. Johns County, FL', initials: 'MO',
```

A **partial** rename has already happened (`u-margie` → `u-rita`), but **the collision is not resolved**: "Margie" is the standard diminutive of "Marguerite", the surname is unchanged, and the initials are still `MO`. A reader meeting "Marguerite Olsen-Alvarez, REALTOR®" in the demo and Margie the Florida TC in the same conversation will read them as the same person. `INTEGRATION_AND_RISK_MATRIX.md` §3.8 flags this; the fix was not completed.

**Exact changes required — five sites, all in `apps/rcre-demo/src/data/`:**

1. `demo.ts:81` — replace the whole persona with a name sharing **no first-name root, no surname and no initials** with Margie. E.g. `id: 'u-noor', name: 'Noor Bengtsson', firstName: 'Noor', initials: 'NB'`. Keep `role: 'agent'`, `title: 'REALTOR®'`, `market: 'St. Johns County, FL'` and the `stats` block unchanged — the demo story does not depend on the name.
2. `demo.ts:561` — listing `l-5` `agentId: 'u-rita'` → the new id.
3. `reporting.ts:81` — `AGENT_PROFILE['u-rita']` → the new id. *(This file is slated for deletion; correct it anyway so the demo is safe to run in the interim.)*
4. `community.ts:80` — the `const MARGIE = {...}` binding: rename **both** the constant and its `authorName`/`authorId`/`initials`.
5. `community.ts` lines 98, 169, 199, 259 — four further `'u-rita'` / `'Marguerite Olsen-Alvarez'` / `'MO'` occurrences (comments `c-2`, `c-10`, post `p-7`, leaderboard row).

**Then, separately:** when the TC role lands, add a **Transaction Coordinator persona whose nav has no Recruiting, Marketing or Listings** — and do not attach a `REALTOR®` title to it. Margie's licensure is listed as unverified in `INTEGRATION_AND_RISK_MATRIX.md` §3.9 and §5; do not resolve it by assumption in demo data.

**Grep gate for the merge:** `grep -rni "margie\|marguerite\|olsen" apps/` must return nothing outside documentation.

---

## 6. Dependency-ordered migration sequence

The invariant: **after every phase, `npm run build` succeeds, `tsc --noEmit` is clean, and `vitest run` is green.** The seam that lets synthetic and real coexist is `getRepository()` + `dataMode()`: `RCRE_DATA_MODE=fixtures` keeps the whole app on `MemoryRepository` while screens are re-pointed one at a time.

**Phase 0 — Prepare (no behaviour change).**
Rename `rcre-demo` → `rcre-app` in `package.json`, port 3200 → 3100. Merge `pg`/`zod`/`server-only`/`vitest`/`@types/pg` into the demo's deps. Complete the §5.1 Margie correction *first*, while it is still a five-line edit in one directory. **Gate:** both apps still build; grep gate clean.

**Phase 1 — Move the domain layer.**
Copy `apps/rcre/{src/lib, tests, supabase, vitest.config.ts, .env.example}` into the canonical app. No import rewrites (identical `@/*` alias). Verify the MCP test path depth. **Gate: 409/409 green in the new location.** Nothing in the UI has changed yet.

**Phase 2 — Establish the seam behind one screen.**
Rewire **`/today` only** to `getActor() → getRepository() → buildToday()`, in fixtures mode, rendering into the demo's existing markup. Extend `tests/fixtures/seed.ts` with the demo's seven stories so the screen looks the same. **Gate:** `/today` renders the approved design from `MemoryRepository`. This phase proves the whole thesis — if the demo's markup cannot take domain data without redesign, stop and re-plan.

**Phase 3 — Real identity.**
Replace `lib/session.ts` (persona cookie) with `getActor()`. Delete `api/session/route.ts`. Rewire `login/page.tsx` to a real credential flow. Widen `AppShell` nav from `'agent'|'broker'` to the seven-role union. **Gate:** an agent session cannot reach `/command`, `/agents`, `/recruiting`; the denial is audited. Port `apps/rcre/src/app/command/page.tsx`'s denial-audit block.

**Phase 4 — Remaining read screens, one per step.**
Order by dependency: `/crm` → `/crm/[id]` → `/pipeline` → `/command` → `/command/reporting` → `/agents` → `/recruiting`. Delete each page's in-line role branch as the repository takes over. **Gate per screen:** a permissions test asserting an agent sees only their own book on that route.

**Phase 5 — New domains.**
Listings, Academy progress, Community — each needs a migration, a repository method, and a seed. These are additive and can run in parallel with Phase 4.

**Phase 6 — Live data.**
Provision Postgres, apply 0001–0003, **wire `PgRepository` through `withRlsSession` (§8.1)**, run the backfill, register the FUB webhook (time-sensitive: four metrics accrue forward only), flip `RCRE_DATA_MODE=live`. Delete `dev/role/route.ts`.

**Phase 7 — Real assistant and real campaigns.**
Replace `conversations.ts` replay with a live Hermes turn over the MCP boundary; replace `CampaignBuilder`'s `setTimeout` with real generation behind `requiresApproval`. Last, because everything else must be real first for the assistant to have anything true to say.

---

## 7. What must NOT regress

| Capability | Where it lives now | How convergence breaks it | The test that proves it didn't |
|---|---|---|---|
| **409 tests** | `apps/rcre/tests/**` | The MCP tests import `../../../../mcp/rcre-mcp-server/src/*`; a directory-depth change silently unresolves 148 of them | `vitest run` reports exactly `409 passed (409)` after Phase 1. A drop to 261 means the MCP path broke. |
| **RLS** | `0003_row_level_security.sql` (954 ln) + `db/rls.ts` | Already not wired (§8.1). A merge that "makes Postgres work" by connecting as owner would defeat it permanently | `tests/unit/rls-policy.test.ts` (40) stays green **plus** a new integration test: agent A's session returns 0 rows for agent B's person. |
| **6-stage MCP authorization** | `mcp/.../authorize.ts` | A convenience "internal" tool added during Phase 7 that skips `authorizeCall` | `mcp-authorization.test.ts` (148) green; the surface tests (`no tool matching /sql\|raw\|admin\|execute/`, `every write requiresApproval`) fail on any new tool that cheats. |
| **PII guard** | `pii-guard.ts` + `hermes/hooks/block-pii-memory.mjs` | Hook path or rule-table path changes when directories move | The "DEPLOYED hook, run as Hermes runs it" describe block — it executes the real `.mjs` and asserts exit code 2 with a block directive. |
| **Role scoping — agent cannot reach broker surfaces** | 10 in-page `if (user.role !== 'broker') redirect(...)` guards in the demo | Deleting a page's guard before the repository takes over leaves a window where an agent can load `/command` | `tests/unit/permissions.test.ts` (15) + one route test per screen in Phase 4. |
| **Role scoping — agent cannot reach another agent's contact** | `crm/[id]/page.tsx:69` (demo) / `getPerson` + `listActivity` (domain) | Same window | `MemoryRepository.getPerson(agentA, 'p-other-agent')` returns null; `listActivity` throws `PermissionDeniedError`. Already covered — keep it covered. |
| **Light / dark** | 269-line token system + pre-paint script in `layout.tsx` | Merging `apps/rcre`'s 6-line `globals.css` or its tailwind config over the demo's | Visual check both themes on every migrated route; assert `--brass-ink` ≠ `--brass-fill` in light (the 2:1-contrast fix). |
| **Mobile** | `AppShell` sheet + `lg:` breakpoints throughout | A merged layout that drops the mobile bar | Every route at 375 px with no horizontal scroll. |
| **Academy — real curriculum** | `data/academy.ts` (2,826) + 244 public files | Treating it as "demo data" and deleting it with the rest of `src/data/` | `node scripts/verify-academy-assets.mjs` → 243 refs, 0 missing, 0 size mismatches. Plus: 14 courses, 181 lessons, exactly 2 with `status: 'ready'`. |
| **2 playable videos** | `public/academy/video/c01-l0{1,7}.{mp4,vtt}` | Asset move drops 93 MB | Both play with captions; the other 179 lessons show no player. |
| **Community localStorage persistence** | `CommunityFeed` + `CommunityComposer` | Server persistence lands and the local path is deleted before it works | A composed post survives a refresh — by whichever mechanism is current. |
| **Approval gates** | `CampaignBuilder` approve/schedule; `Assistant` `StatusPill`; `authorize.ts` step 6; `env.gates.allowFubWrites` / `allowOutboundSend` (both default false) | A real send path landing before the gate | `sendLeadEvent` throws when `RCRE_ALLOW_FUB_WRITES` is unset; `authorizeCall` returns `approval_required` for every write tool without a bound, unexpired, unconsumed approval. |
| **Policy emptiness** | `reporting/policy.ts` | Seeding the demo's placeholder `STAGE_THRESHOLD_DAYS` as real policy | The explicit empty-policy test: no rows → no violations. |

---

## 8. Already broken or contradictory — found while reading

**8.1 — `PgRepository` never opens an RLS session. (Serious.)**
`db/rls.ts` provides `withRlsSession`, and migration 0003 (954 lines) defines policies reading `rcre.organization_id` / `rcre.user_id` / `rcre.role`. Grep confirms `withRlsSession` / `applyRlsContext` are referenced **only in `db/rls.ts` itself and in `tests/unit/rls-policy.test.ts`**. `PgRepository.q()` takes a pooled client and queries directly — the GUCs are never set. With RLS enabled, every query returns zero rows; with it disabled or the app connecting as owner, RLS is not enforcing anything. The in-SQL `personScope()` predicates are the only live control. **Fix in Phase 6, before any live data.**

**8.2 — `POST /api/leads` records nothing.**
Its header says it "records the capture and returns `forwardedToFub: false`". It returns `202 {status:'captured'}` and **performs no write** — no repository call, no insert. Recruiting leads in particular are documented as "stored in RCRE only" and are stored nowhere. Attribution the comment correctly says "cannot be reconstructed later" is being discarded at the moment of capture.

**8.3 — The FUB webhook ledger is a module-level `Set` in a route file.**
`api/webhooks/fub/route.ts` holds `memoryLedger` in process memory. It is honestly labelled "Placeholder ledger until the Postgres repository lands", but the `webhook_events` table with its unique index already exists in migration 0001. Idempotency and out-of-order safety — the two properties `webhook.ts` is built around — do not survive a restart or a second instance.

**8.4 — The Margie rename is half-done.** §5.1.

**8.5 — `DEMO_NOW = new Date()` is evaluated at module load.**
Every relative time in the demo ("9 hours ago", "no contact in nine days") drifts against a long-running server process. On a dev server left up overnight the demo's own story stops being true. Harmless in a screen-share, fatal if anyone ever leaves the demo running as a reference.

**8.6 — Assistant copy is pinned to specific demo records.**
`Assistant.tsx`'s `ACTIONS` map hard-codes `/crm/c-dana`, `/crm/c-marcus`, `/training/classroom/c02/c02-l05`. Renaming or reseeding a contact breaks the assistant silently — the button navigates to a 404. Any fixture change must re-check this map.

**8.7 — Two `clock` declarations in `today/page.tsx`.**
One at module scope (line ~22) and one inside `TodayPage` (line ~70), identical bodies. Typechecks; it is shadowing, not a bug. Worth cleaning during the rewire.

**8.8 — One orphaned Academy asset.** `/academy/covers/00-school-welcome.webp` is on disk and referenced by nothing.

**8.9 — `rcre-mcp-server` has no server entrypoint.**
`src/` contains `tools.ts`, `authorize.ts`, `pii-guard.ts` — a registry and a decision function, thoroughly tested, with no `index.ts` and no MCP SDK dependency. The authorization boundary is designed and proven; the server that would enforce it does not exist yet. Phase 7 is larger than "wire up the assistant".

---

## 9. Effort and risk

| Phase | Scope | Sizing | Confidence |
|---|---|---|---|
| 0 — Prepare | Rename, merge deps, Margie fix | **0.5 day** | High |
| 1 — Move domain layer | Directory move, verify 409 | **1 day** | High — no import rewrites |
| 2 — Seam behind `/today` | Rewire 1 screen, extend fixtures | **2–3 days** | Medium — this is where the thesis is tested |
| 3 — Real identity | Supabase Auth, delete persona cookie, widen roles | **3–5 days** | Medium — external dependency |
| 4 — 7 read screens | ~1 day each incl. a permissions test | **7–9 days** | Medium |
| 5 — New domains | Listings + Academy progress + Community: 3 migrations, ~8 repo methods, 3 seeds | **5–8 days** | Medium-low — new schema design |
| 6 — Live data | RLS wiring, Postgres, backfill, webhook registration | **5–8 days** | **Low** — blocked on B1/B2 (owner-level FUB key, webhook registration) |
| 7 — Real assistant + campaigns | MCP server entrypoint, Hermes wiring, approval persistence | **10–15 days** | **Low** — §8.9 |
| | **Total** | **~34–50 working days** | |

### The three highest-risk moments

**1. Phase 2 — the first screen through the seam.**
Everything rests on the claim that the demo's markup can take domain data without redesign. If `/today` cannot render `Person` + `Insight[]` in the approved layout, the whole plan inverts and Phases 3–7 are re-planned against a different target shape. *Mitigation:* do `/today` alone, in fixtures mode, before touching anything else. It is the cheapest possible falsification of the plan.

**2. Phase 3 — the authentication swap.**
There is a window where the persona cookie is gone and Supabase Auth is not yet fully wired, and 10 pages have in-line `role !== 'broker'` guards being deleted in favour of repository scoping. Deleting a guard one commit too early leaves an agent able to load `/command`. *Mitigation:* repository scoping lands **first**; a page's in-line guard is deleted only after a passing test proves the repository refuses. Never both in one commit.

**3. Phase 6 — first contact with live data, with RLS unwired.**
§8.1 means the app has **never** run against a real Postgres with policies active. Two failure modes, in opposite directions: every screen renders empty (policies deny everything because the GUCs are unset — recoverable, obvious), or the app connects with a role that bypasses RLS and one agent sees the whole brokerage's client data (not obvious, and the worst outcome in this document). Compounding it: webhook registration is **time-sensitive** — response time, contact attempts, time-in-stage and pipeline fallout accrue forward only, so every day unregistered is a day of history that cannot be recovered. *Mitigation:* wire `withRlsSession` and prove cross-agent isolation against a real database **before** the first live read; connect as a non-owner role that cannot bypass RLS; register the webhook early, even while the rest is still on fixtures.
