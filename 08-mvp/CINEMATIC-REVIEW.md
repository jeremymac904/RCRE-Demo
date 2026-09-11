# Cinematic media review — September 9, 2026

Canonical application: apps/rcre-demo. Local production URL: http://localhost:3200/ . Films: /#rcre-films. Regional blogs: /blog. Preferred Lender: /financing.

Added three actual-motion silent H.264 films with optimized WebP posters, six licensed photographic editorial assets, and photographic covers/full-width images for all 18 journal articles. Homepage films play once when visible, with pause/native controls, offscreen pause, reduced-motion/save-data protection, and retry with a still-image fallback. Keyboard focus transfers from the disappearing play overlay to persistent controls. Journal film playback is manual. Existing metro search/filter/refresh behavior is retained. CMS image overrides are respected. Central credits: /image-credits.

Photographs and films are sourced real media, not AI-generated. Nonlocal editorial imagery is labeled with its source/location limitations and never presented as an RCRE listing. See CINEMATIC-PHOTO-PROVENANCE.md and CINEMATIC-VIDEO-PROVENANCE.md for individual licenses and source records.

Validation:
- 538 tests across 33 files passed.
- Production build passed including type checking; pre-existing lint warnings and plain-img optimization warnings remain.
- Existing public browser suite: 77 checks passed; zero page errors and zero axe violations, including 48 responsive/theme combinations and public chat regression.
- Cinematic browser suite: 17 grouped checks, verifying every cover and article image, all three films decoding moving frames, pause/offscreen behavior, keyboard focus transfer, reduced-motion behavior, visible autoplay, error/retry, and six responsive/theme accessibility scans. Results: runtime/browser-evidence/cinematic/results.json.
- Direct rendered in-app review of homepage film and blog/article design; additional desktop/mobile screenshots under runtime/browser-evidence/cinematic.
- Original video sources passed full decode and distinct-frame motion verification: runtime/cinematic-video-sources/verification.json.
- No new performance score is claimed for this layout.

Storage incident: ffmpeg-static's installer wrote its cache at /Users/jeremymcdonald/Library/Caches/ffmpeg-static-nodejs despite RCRE-local temporary/cache settings. This violated the requested containment. Further installer runs were stopped; the outside directory was left untouched. The installed encoder, downloaded source media, optimized media, browser profiles, screenshots, logs, and database backup are inside RCRE. No paid media service or external publishing was used.

External integrations and demo-role instructions remain in LOCAL-REVIEW-HANDOFF.md. Public Ask RCRE remains the explicitly labeled site guide unless an authorized real model is configured; media work does not change that provider dependency. No live FUB writes, messaging, ad launches, deployment, or provider billing was enabled.

Final database backup: runtime/backups/platform-1788956835790.sqlite and matching .files bundle. All editing subagents completed; production server left running for review.
