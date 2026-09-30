# RCRE design system handoff

Inspected 2026-09-17. Documentation-only inventory of the current local working tree; no new browser audit, production deployment or external website modification was performed.

## Authority and location

Local root: `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE`. Canonical rendered application: `apps/rcre-demo`, confirmed through `scripts/local.mjs`, application routes and current source. Repository: https://github.com/jeremymac904/RCRE-Demo; inspected branch `codex/rcre-ecosystem-handoff-2026-09-17`; implementation baseline HEAD `d4ae90d8f40edcff3a2e5996ab0267e6c56c8966`. This handoff describes **working-tree implementation**, including uncommitted files that are not guaranteed to exist in that GitHub commit. A documentation branch/commit does not transfer those implementation files automatically. Consult `RCRE_REPOSITORY_MANIFEST.json` for handoff commit resolution and the source snapshot inventory.

Every path below is relative to that exact local root. GitHub reference form is `https://github.com/jeremymac904/RCRE-Demo/blob/d4ae90d8f40edcff3a2e5996ab0267e6c56c8966/<path>`; verify tracking before relying on it. Live https://rcregroup.com is the source-brand website, not this local app's deployed output.

## Tokens and composition — PROVEN LOCAL

| Contract | Source and actual value |
|---|---|
| Fonts | `apps/rcre-demo/src/app/layout.tsx`: Next font Syne 500/600/700/800 (`--font-syne`), Nunito Sans 300/400/600/700 (`--font-nunito`), latin, display swap. Do not substitute generic serif luxury typography. |
| Theme selection | Same layout runs a before-paint script reading `localStorage['rcre-theme']`; default light, explicit dark, no automatic OS choice. No-JS root remains light. `src/components/ThemeToggle.tsx` owns user control. |
| Light surfaces | `src/app/globals.css`: `--bg #f7f5f2`, `--surface #fff`, `--elevated #f1eee9`, `--sunken #ebe7e1`, `--overlay #fff`. |
| Light text and brass | `--text #14120f`, muted `#565049`, faint `#746d64`; brass fill `#cfb077`, **text brass `#7e602b`**. Older comments mention #8a6a2e; executable CSS wins. Do not use fill brass as small text on white. |
| Dark | bg `#0d0d0d`, surface `#121212`, elevated `#191a1b`, overlay `#1a1a1a`, sunken `#0a0a0a`; text `#f5f3f0`, muted `#a8a29b`, faint `#9c948a`; brass fill/ink `#cfb077`. |
| Semantic colors | Urgent light/dark `#a8401a/#dd8464`; calm `#2f6b52/#7fa894`; warm `#8a6a2e/#cfb077`. Color supplements text/status rather than replacing it. |
| Utility aliases | `apps/rcre-demo/tailwind.config.ts`: ink→surface family, chalk→text family, brass→ink/fill, hair→borders, signal→semantic. `.on-dark` intentionally redeclares tokens for dark subtrees. |
| Type scale | Tailwind micro .6875rem, label .75rem, body .9375rem, lead 1.0625rem, h4 1.125rem, h3 1.5rem, h2 2rem, h1 2.75rem, hero 4rem. Public CSS adds fluid headings with clamp; preserve responsive values. |
| Spacing/shape | Tailwind section 5.5rem, section-sm 3.5rem; panel radius 10px, control 7px; shell 96rem, prose 38rem. Public wrap 1280px/48px horizontal padding; public header max1440px. Public component CSS also uses local spacing; there is not yet one extracted spacing package. |
| Elevation | Light hairlines plus shallow shadows; dark surface steps and raised shadow. See `--hair`, `--hair-strong`, `--shadow-panel`, `--shadow-raised`. |

Paths shortened to `src/…` in token rows are within `apps/rcre-demo`.

## Interaction patterns and boundaries

| Pattern | Source within `apps/rcre-demo` | Status / extraction instruction |
|---|---|---|
| Public navigation/footer/mobile menu | `src/components/public/PublicShell.tsx`, `public.css` | PROVEN LOCAL. Extract nav item configuration and brokerage identity; preserve skip link, semantic nav and keyboard menu. |
| Public button/form/card | `src/components/public/public.css`, `PublicInteractions.tsx` | PROVEN LOCAL. Brass primary, outlined secondary, 48px minimum public button height, 3px focus outline. Forms require API receipt and render errors; do not replace with success toast. |
| Portal shell/navigation/dashboard | `src/components/AppShell.tsx`, `src/app/globals.css`, `tailwind.config.ts` | PROVEN LOCAL. Requires persona permissions, route configuration and scoped data. Not a public-site shell. |
| Tables, empty/error states | `src/components/PlatformWorkspace.tsx`, `src/components/SettingsWorkspace.tsx`, management `WebsiteManager.tsx` | PROVEN LOCAL. Existing domain-local rendering; no separately packaged universal data-table/state component. Extract semantics and loading/error rules after isolating service calls. |
| Modal/drawer/editor preview | `src/components/agent-website/management/WebsiteManager.tsx`, `management.css` | PROVEN LOCAL. Saved-draft preview widths and management dialogs depend on scoped server snapshots. Verify focus restoration/trapping again after extraction. |
| Scroll reveal/parallax | `src/components/public/HomepageMotion.tsx`, `homepage-motion.css`, `ImageWall.tsx`, `image-wall.css` | PROVEN LOCAL. Browser-managed scroll/observer effects and reduced-motion rules; keep content visible without JS. Do not blindly apply portal comment “never on page load” to later public motion implementation. |
| Media | `CinematicFilm.tsx`, `CinematicGallery.tsx`, `BlogPhotography.tsx`, `MetroPhotoCredit.tsx` under public components | PROVEN LOCAL. Native playback, local derivatives, credits and editorial-location labels. Media licensing is a separate extraction requirement. |
| Formal independently versioned design package | No extracted package | NOT IMPLEMENTED. This is application CSS/components, not a released npm design system. |

### Responsive implementation

Tailwind default breakpoints remain sm640, md768, lg1024, xl1280, 2xl1536. Separate authored public CSS uses max640/900/1150/1200 and min1201/1441; image wall max760. Agent website CSS uses max600/700/768/900 and min769; manager max760. These are actual mixed implementation boundaries, not a unified tokenized breakpoint API. When extracting, retain layout behavior first, then normalize intentionally with viewport regression tests.

### Accessibility and performance evidence

Status **PROVEN LOCAL**, scoped to recorded checks, not a blanket WCAG certification or current external-site score. `08-mvp/AGENT-WEBSITE-SYSTEM-REVIEW.md` records September 12 eight-template browser checks at1440/375, 29 assertions and no axe violations; `08-mvp/AGENT-WEBSITE-MANAGEMENT-QA.md` records 25 management assertions. `08-mvp/PUBLIC-ELEVATION-REVIEW.md`, `HOMEPAGE-JOIN-REVIEW.md`, `CINEMATIC-REVIEW.md` document public visual checks. Machine evidence is under `runtime/browser-evidence/{homepage-performance,people,people-performance,metro-chat,integration-release,live-activation}`. These dated artifacts are local and may be untracked; a receiving workspace must rerun its own current tests, not copy historical pass totals as a new release result. Field Core Web Vitals and deployed accessibility: **BLOCKED EXTERNAL DEPENDENCY**. Known performance work is tracked in `08-mvp/WEBSITE-OPTIMIZATION-BACKLOG.md`; do not advertise a guaranteed 2.5s LCP.

## Public coverage and reuse boundary

| Surface | Actual source/routes | Status |
|---|---|---|
| Home/navigation/buyer/seller/contact | `src/app/page.tsx`, `src/app/[...publicPath]/page.tsx`; `/`, `/buying`, `/selling`, `/first-time-buyers`, `/relocation`, `/investors`, `/home-valuation`, `/contact` | PROVEN LOCAL — content and durable inquiry flows. |
| Directory/profile/markets/community | `PeopleDirectory.tsx`, `VerifiedProfile.tsx`, `src/lib/people/verified-roster.json`, `src/lib/public/content.ts`; `/team`, `/agent/{slug}`, `/markets/{alabama,florida}`, `/neighborhoods/{slug}` | PROVEN LOCAL — verified identity projection; public role is not operational permission. |
| Search/listings/property experience | `PropertySearch.tsx`; `/home-search/listings`, `/properties/sale`, `/properties/sold` | PROVEN LOCAL for local filters/favorites/inquiry interface; SIMULATED for example inventory; BLOCKED EXTERNAL DEPENDENCY for authorized IDX/MLS feed and real property-detail data. Do not export proprietary source listing photos. |
| Blog/resources/local guides | `MetroJournal.tsx`, `src/lib/public/{content,metro-journal}.ts`; `/blog`, metro hubs and article routes | PROVEN LOCAL — combined search/filter and sourced editorial content. Current article-route register is authoritative, not historical source-feed counts. |
| Recruiting | `src/app/join/page.tsx`, `AgentWebsiteShowcase.tsx` | PROVEN LOCAL for public showcase and locally saved recruiting inquiry; no external recruiter message. |
| Preferred lender | `src/app/financing/page.tsx`, `PublicInteractions.tsx`, `src/lib/public/calculator.ts` | PROVEN LOCAL for exact lender facts, calculator and durable inquiry. Application destination is external; verify current source before reuse. Copy requirements remain RCRE/Jeremy-specific. |
| CMS/SEO/schema | `PublicContentStudio.tsx`, `src/lib/public/server.ts`, public admin APIs, `src/app/{robots.txt,sitemap.xml}/route.ts` | PROVEN LOCAL — versioned published content, redirects, noIndex, metadata/schema and constrained previews. External indexing/rankings: BLOCKED EXTERNAL DEPENDENCY. |
| Public assistant | `PublicChatAgent.tsx`, `src/lib/services/public-chat.ts` | PROVEN LOCAL for bounded local navigation/lead experience; do not describe as unrestricted live AI concierge. |

Source filenames should be verified through the manifest when importing; the receiving workspace must include dependent types/services, not just JSX.

## Asset and tenant extraction rules

Preserve `08-mvp/{CINEMATIC-PHOTO-PROVENANCE,CINEMATIC-VIDEO-PROVENANCE,HOMEPAGE-WALL-PROVENANCE,METRO-ASSET-PROVENANCE}.md` and `01-research/people-live-2026-09-12/PROVENANCE.md`. RCRE logos, verified portraits, brokerage biographies, team license data, market assignments and Jeremy lender facts remain tenant-specific. Real photography may depict a different place/year; keep the recorded captions and credits. Rights-cleared source evidence does not authorize mislabeling a generic photograph as an available listing. No media files are copied into this handoff.

Extraction order: tokens/fonts → public shell primitives → receipt-based forms → approved identity projection → reusable editorial blocks → template renderer/editor. Run dual-theme, reduced-motion, keyboard, mobile-overflow, image-credit, permission and persistence checks in each new tenant. See companion agent website document for operational contracts and missing integrations.
