# Public site elevation and metro journal review

User requested metro blogs based on RCRE's real website, greater visual impact and dynamic behavior, and a public AI chat agent. Work remains in the existing canonical `apps/rcre-demo` application. No production publishing or paid provider use.

## Delivered surfaces

- Home: full-width licensed regional photography, three explicit user-controlled markets, coordinated imagery/journal destination/search market, working buyer/seller/relocation planner, regional journal previews, retained RCRE portraits and lender consumer-choice information.
- `/blog`: one search across 18 stories (6 new original regional articles + 12 existing source-topic articles). Region and topic filters, empty state/reset, URL state restored after refresh/back navigation.
- `/blog/metros/birmingham`: Birmingham and Central Alabama journal.
- `/blog/metros/jacksonville`: Jacksonville and Northeast Florida journal.
- `/blog/metros/south-florida`: Miami and Fort Lauderdale journal, supported by source-listed Miami-Dade/Broward coverage. The public roster does not establish a specific current South Florida resident agent, so the page routes matching through the brokerage. Historical Palm Beach/Port St. Lucie sales do not justify invented current agent bases.
- Six new article routes: `/blog/birmingham-neighborhood-shortlist`, `/blog/birmingham-seller-preparation`, `/blog/jacksonville-river-coast-home-search`, `/blog/northeast-florida-relocation-calendar`, `/blog/miami-fort-lauderdale-building-questions`, `/blog/south-florida-relocation-shortlist`.
- `/image-credits`: source/author/license/crop information and Jacksonville image ShareAlike declaration. Photographs depict Birmingham2026, Jacksonville2014 and Miami2011, not current property inventory. Visible historical dates retained.
- Public CMS: descriptions, titles, images/alternatives, archive/redirect exclusions, published revisions, source notes, metadata and sitemap coverage. Private draft content is never used as chat context.
- Ask RCRE: public-only contextual retrieval, durable visitor-scoped history, source links, clear/cancel/retry, keyboard focus management, inert page behind dialog, screen-reader log announcements and truthful provider status. Chat history uses a separate HttpOnly/SameSite cookie and SQLite records. Per-visitor and site caps, input bounds, cross-origin rejection and fixed local provider endpoint.

## Actual AI boundary

No allowed local model is configured for the public chat. It is explicitly labeled **Site guide · no AI model connected**. This working mode retrieves published pages; it is not presented as live AI inference. The implemented Ollama adapter accepts `RCRE_PUBLIC_CHAT_MODEL` only when the exact configured model is advertised by `http://127.0.0.1:11434/api/tags`, then calls `/api/chat`. It has a25second timeout, no tool execution/private CRM access, no arbitrary endpoint and no paid fallback. Protocol-double success/failure is tested; real public model inference remains unverified until an allowed installed model is selected. Existing private Hermes isolation/startup dependencies remain unchanged in LOCAL-REVIEW-HANDOFF.md.

## Verification and visual review

- 538 tests across33files passed; production build and typecheck passed. Source HTTP and journal/CMS integrity evidence is in `.runtime/public-source/metro-verification.json` and `metro-unified-index-verification.json`.
- Initial browser suite:76 passed checks;48 route/width/theme checks across8routes at375/768/1440;18 axe scans (8routes ×2themes plus open chat ×2themes), zero reported WCAG2A/AA/2.1AA violations and no page JavaScript errors. Final production rerun recorded separately below.
- Interactive in-app browser: homepage market switch updated photography, selected state, market input and journal link; journal and chat inspected directly. Repeatable browser regression uses the existing Playwright testing runtime with explicit profiles/cache/temp/screenshots under RCRE, supplementing the interactive browser.
- Screenshots: `runtime/browser-evidence/metro-chat/`. Personally inspected home desktop/mobile in light theme, Northeast Florida hub dark theme, and open-chat desktop/mobile. Full-length screenshots were also checked for section continuity. Native browser zoom is not newly claimed.
- Independent review found and fixed stale GET chat-history races, inconsistent CMS regional-card image/description treatment, missing completion announcements, and a knowledge gap for new/custom published journals. A delayed-history browser regression verifies the race fix.

## Design comparison ledger

The controlling reference is the existing approved RCRE design and the user's explicit request to elevate it. The practical implementation brief is `runtime/design/public-elevation-brief.md`. Image Gen concepts were intentionally not produced because the installed tool saves outside RCRE; that conflicts with the user's controlling storage rule. No artificial claim of generated-concept fidelity is made.

1. Typography: retained Syne headlines and Nunito Sans body/controls; corrected the chat's initial Georgia/Arial drift to the actual RCRE fonts.
2. Palette: existing neutral light mode, black dark mode and brass remain; photographic overlays deliberately introduced for readable editorial hero contrast. Chat's initial green accents replaced with ink/brass.
3. Composition: preserved logo, essential navigation, buyer/seller/career/lender paths and people. Replaced architectural line-art hero with licensed city photography and market controls as explicitly requested.
4. Density and continuity: removed duplicate blog search sections and duplicate large blog headings. Regional imagery, open article rows, hairlines, brokers and lender section provide varied page rhythm.
5. Interaction: no autoplay or scroll hijacking. Market choices perform coordinated changes; planner submits filters; journal URLs retain filters; chat acts on real local state. Reduced-motion preference removes the scene transition.
6. Responsive/accessibility: readable stacked mobile layouts, tested image loading/overflow, consistent focus, modal background inertness and chat log announcements. Date/photographer/license disclosures remain adjacent or directly linked.

## Remaining external dependencies

For this increment: selection of a permitted installed local AI model for genuine inference; brokerage confirmation of current address-specific agent assignment in source-listed South Florida; editorial/brand/legal approval before any public deployment; fresh licensed photography if contemporary Jacksonville/Miami skyline imagery is required. Existing IDX/FUB/signing/Hermes/production dependencies remain documented in the main handoff. No new production access, real communication or paid service was used.

## Final production verification

Final production rerun passed **77 checks**, with zero page JavaScript errors and zero axe violations in all18 scans. This includes the delayed-history race, source-linked chat persistence after refresh, cross-visitor isolation, cross-origin denial, durable test-history clearing, journal filter refresh, planner handoffs,48 responsive/theme combinations and reduced motion. Evidence: `runtime/browser-evidence/metro-chat/results.json`; execution log: `runtime/logs/metro-browser-qa.txt`.

Production build is running on loopback127.0.0.1:3200; the user-facing in-app browser is left at the homepage. All three delegated workers are completed and stopped. New final local backup: `runtime/backups/platform-1788919629295.sqlite` with paired `.files` bundle. Original source/training files and installed Hermes remain unchanged by this increment.

The final production home first viewport was personally inspected at375×950 (light) and1440×950 (dark), plus the375px open-chat view and full-length desktop/mobile pages. Hero and journal imagery load, mobile text wraps cleanly, the source credits are visible, and the approved type/colour system is consistent. This is verification against the existing design and documented intentional elevation, not a claim of matching a generated concept.
