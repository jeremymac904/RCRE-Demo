# Cinematic video provenance

Acquired and verified September 9, 2026. These are real recorded stock videos with moving scenes/camera, not generated footage or still photographs animated with pan/zoom. They are editorial inspiration only: no claim that they depict an RCRE listing, Alabama/Florida community, currently available property, or endorsed homeowner.

## License evidence

Each original Pexels source page below identifies its creator and links “Free to use” to the [Pexels License](https://www.pexels.com/license/). That license was read on acquisition: free downloads, commercial website/blog/app use and modifications are allowed; attribution is appreciated but not required. It prohibits implying endorsement by people/brands, selling unaltered copies, redistributing on stock platforms, offensive treatment of identifiable people, and using imagery as a trademark. These clips are used as website editorial media, not a logo, resale asset, or endorsement. No paid generation, external upload, or messages were performed.

## Header / coast

- Public video: `/brand/cinematic/video-coast.mp4`
- Poster: `/brand/cinematic/video-coast-poster.webp`
- Scene: turquoise ocean meeting a sandy beach, overhead drone view. Source page includes Algarve tags; no specific US location claim is made.
- Creator: Nino Souza.
- Source: https://www.pexels.com/video/drone-shot-of-ocean-waves-at-the-seashore-4193133/
- Original download discovered from that page's Free download link: https://videos.pexels.com/video-files/4193133/4193133-uhd_2562_1440_24fps.mp4
- Source retained: `runtime/cinematic-video-sources/pexels-4193133.mp4`.
- Output: 12 seconds, 1920 × 1080, H.264 High/yuv420p, 24 fps, silent, 3,586,297 bytes.
- Changes: first 12 seconds, scaled/center-cropped to 16:9, audio removed, H.264 CRF26/maxrate2800k with faststart. Poster extracted at second 2. No synthetic motion or scene alterations.
- Suggested visible credit: **Coastal film by Nino Souza / Pexels. Editorial inspiration.** Link to source and license.

## Journal / shoreline

- Public video: `/brand/cinematic/video-shoreline.mp4`
- Poster: `/brand/cinematic/video-shoreline-poster.webp`
- Scene: aerial waves and broad pale sandy shoreline. Source page includes California Beach tag; no Alabama/Florida location claim is made.
- Creator: ArtHouse Studio.
- Source: https://www.pexels.com/video/aerial-view-of-ocean-waves-4631568/
- Original download: https://videos.pexels.com/video-files/4631568/4631568-uhd_3840_2160_24fps.mp4
- Source retained: `runtime/cinematic-video-sources/pexels-4631568.mp4`.
- Output: 12 seconds, 1920 × 1080, H.264 High/yuv420p, 24 fps, silent, 3,531,484 bytes.
- Changes: first 12 seconds, scaled to 1080p, audio removed, H.264 CRF26/maxrate2800k with faststart. Poster extracted at second 2.
- Suggested visible credit: **Shoreline film by ArtHouse Studio / Pexels. Editorial inspiration.** Link to source and license.

## Journal / architecture

- Public video: `/brand/cinematic/video-architecture.mp4`
- Poster: `/brand/cinematic/video-architecture-poster.webp`
- Scene: actual drone movement around a white contemporary house and rooftop terrace; portrait composition. People are visible at a distance. Do not imply they endorse RCRE, or that the home is listed by RCRE or available for sale. Generic architectural inspiration only.
- Creator: just a hobby.
- Source: https://www.pexels.com/video/aerial-view-of-modern-house-with-terrace-34698342/
- Original download: https://videos.pexels.com/video-files/34698342/14707021_1080_1920_30fps.mp4
- Source retained: `runtime/cinematic-video-sources/pexels-34698342.mp4`.
- Output: 8.75 seconds, 608 × 1080 (portrait), H.264 High/yuv420p, 24 fps, silent, 2,220,313 bytes.
- Changes: full source duration, resized approximately preserving portrait ratio to even dimensions, converted from 30 to 24 fps, audio removed, H.264 CRF26/maxrate2400k with faststart. Poster extracted at second 2. Keep portrait presentation rather than cropping out the house.
- Suggested visible credit: **Architecture film by just a hobby / Pexels. Illustrative property; not an RCRE listing.** Link to source and license.

## Verification

`runtime/cinematic-video-sources/verification.json` records file size, duration, decoded stream dimensions/rate, full decode exit status, and frame uniqueness. All three full decodes passed. At one sample per second, distinct frame hashes were 12/12 for coast, 12/12 for shoreline, and 9/9 for architecture. Posters were personally visually inspected. This validates motion files and source imagery; app playback/accessibility verification belongs to the integrating UI workflow. All video/poster files are below 5MB. Originals and encoder logs remain in RCRE.

## Local optimizer and containment deviation

The project had no ffmpeg in PATH or standard locations. Root authorized an isolated `ffmpeg-static` install under `runtime/cinematic-tools` with TMPDIR and npm_config_cache explicitly inside RCRE. ffmpeg-static 5.3.0 installed its executable at `runtime/cinematic-tools/node_modules/ffmpeg-static/ffmpeg`. No global package or canonical app manifest changed.

**Unexpected outside-cache write:** the dependency's install.js creates `FileCache(envPaths(pkg.name).cache)`. On macOS, env-paths chooses the user's Library/Caches and ignores npm_config_cache/TMPDIR. Read-only inspection immediately after installation confirmed `/Users/jeremymcdonald/Library/Caches/ffmpeg-static-nodejs` created/updated September 9 at 08:14. This cache write was not intended and violates the requested all-RCRE containment. Root was immediately informed. The cache was left untouched because everything outside RCRE is read-only. No further installer calls ran. All subsequent encoding used the existing RCRE-contained binary; all media, encoder output/logs, posters, and verification were written inside RCRE.
