# RCRE Academy — asset provenance

Every file the RCRE Academy serves was **copied** out of Jeremy's existing production
workspace. That workspace is read-only and was not modified by this import.

**Source root (READ ONLY):**
`/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/SKOOL COMMUNITIES/AI Advantage (Realtors)/`

**Destination (RCRE-owned):**
`RCRE/apps/rcre-demo/public/academy/` — the only place these media live. Nothing is
duplicated into a second RCRE directory.

**Generated data module:** `RCRE/apps/rcre-demo/src/data/academy.ts`
**Verifier:** `RCRE/apps/rcre-demo/scripts/verify-academy-assets.mjs`
**Import date:** 2026-08-24

---

## What was copied

| Destination | Count | Bytes | Source path | Why | Transformation |
|---|---|---|---|---|---|
| `public/academy/covers/` | 15 | 468 KB | `08_course_graphics/course_covers/*.png` | Course catalog + recruiting cards | 1920×1080 PNG → 1280×720 WebP q82. Browser delivery; originals are 5.4 MB. |
| `public/academy/cards/` | 181 | 2.2 MB | `08_course_graphics/lesson_cards/*/*.png` | Lesson artwork + video poster frames | 1600×900 PNG → 800×450 WebP q78. Cards only render small; originals are 42 MB. |
| `public/academy/handouts/` | 29 | 31 MB | `11_handouts_branded/pdf/` (28) · `11_handouts_branded/workbook/` (1) | Real student handouts, cheat sheets, checklists, 50-page workbook | Byte-identical copy, filenames slugged. |
| `public/academy/downloads/` | 16 | 396 KB | `12_student_downloads/{project_zips,starter_kit,bundles,prompt_library}` | Real student project packages and prompt packs | Byte-identical copy, filenames slugged. |
| `public/academy/video/` | 2 MP4 + 2 VTT | 89 MB | `Course Production/Course_01/Lesson_{01,07}/{Final,Captions}/` | The only two finished lesson renders that exist | **No re-encode** (Phase H). `ffmpeg -c copy -movflags +faststart` for progressive playback; SRT → WebVTT for `<track>`. |

**Total copied: 122 MB** (budget was ~150 MB).

`covers/00-school-welcome.webp` is intentionally unreferenced by `academy.ts` — it is the
School Welcome plate, reserved for the Academy home hero. Not a course.

## Video: the honest position

The source README states "Nothing has been recorded or rendered. That is deliberate and is
the next phase." That is true for **179 of 181 lessons**, and those lessons carry
`status: 'in-production'` with **no `video` field** — the UI must not render a player.

It is **not** true for two lessons. `Course Production/` (last touched after the README was
written) contains finished renders with captions:

- Course 1 Lesson 1 — *Settings and Personalization* — 3:16, 1920×1080 H.264 + SRT
- Course 1 Lesson 7 — *Privacy and Common Sense* — 1:19, 1920×1080 H.264 + SRT

Those two are marked `status: 'ready'` and are the only lessons with a `video`. No duration,
file, or caption anywhere in `academy.ts` is fabricated.

## Lesson descriptions

Taken from `13_skool_build/courses/*.md` (the paste-ready Skool copy), which carries the
**full** description in Jeremy's own words.

`13_skool_build/lessons/ALL_LESSON_DESCRIPTIONS.md` contains the same descriptions truncated
to fit a flat markdown table — e.g. Course 1 Lesson 1 loses "I'm going to show you what I
recommend changing, what I would leave alone…". Source README rule 3 says do not replace
Jeremy's voice with generic corporate language and rule 2 says do not shorten his prompts, so
the untruncated text is used. No description was rewritten, paraphrased, or generated.

## Public recruiting preview

`publicPreview: true` only where `13_skool_build/courses/ALL_COURSES_INDEX.md` designates the
**whole course** as Free:

- Course 1 — ChatGPT Setup and Personalization — *Tier: Free*
- Course 2 — Prompting for Real Estate — *Tier: Free*
- Course 14 — AI Advantage Elite Preview — *Tier: Free (Elite teaser)*

Everything else is `false`, including:

- Course 3 — *Free (Twin Lite) / Premium (full)* — mixed tier. The course-level boolean cannot
  express "one artifact inside it is free", so it defaults closed.
- Courses 5 and 6 — *Premium (sample lesson free)* — same reasoning.

## What was deliberately NOT copied, and why

| Excluded | Why |
|---|---|
| `15_archive/` (7.1 MB) — `ai_realtor_pro_purple`, `copy_v1`, `graphics_v1`, `prompts_v1`, `duplicate_persona_files`, `handoff_prompts_v1`, `package_snapshots` | Superseded by definition. The workspace is append-only; the archive is the discard pile. |
| `08_course_graphics/thumbnails/` (73 MB, 377 video title frames) | Title frames for videos that do not exist yet. Copying them would imply 377 renders exist. |
| `09_video_production/` — per-course production briefs | Source-production documents. Never intended for students (Phase I). |
| `Course Production/**/HeyGen Source/`, `Raw Walkthrough/`, `Production Files/`, `B Roll/`, `Motion Graphics/` (~730 MB) | Intermediate production media. The `Final/` render is the deliverable; shipping the A-roll concat and composite would duplicate the same footage several times over (Phase C: no duplicate giant media). |
| `14_scripts/` (120 MB) | The build automation for the source workspace. Not RCRE's to run, and explicitly out of scope. |
| `16_production_data/{heygen_batch,render_jobs,walkthrough_jobs,videos,motion_graphics}.json` | Production work lists (195 HeyGen jobs, 377 render jobs, 181 walkthrough jobs). Internal scheduling data, not student content. |
| `16_production_data/synthetic_demo/` | Synthetic demo fixtures for the video shoot. RCRE has its own demo data. |
| `12_student_downloads/bundles/All_Student_Projects.zip` | Aggregate of the 11 project ZIPs already copied individually. Pure duplication. |
| `07_brand/`, `00_source_assets/` | AI Advantage brand system. RCRE Academy uses the RCRE design system; only course artwork carries over. |
| `01_skool/`, `02_facebook/`, `03_youtube/` | Platform upload sets for Skool / Facebook / YouTube. RCRE is not embedding Skool. |
| `04_prompts/` | Brand and image-generation prompts — the folder's own README says no student prompts live here. |
| `05_copy/`, `06_reports/`, `10_templates/`, `BUILD_OUT_PLAN.md`, `HERMES_CONTRIBUTION_PLAN.md`, `IDEA.md`, `LINKS_NEEDED_FROM_JEREMY.md` | Internal build, QA, planning and tooling documents. Read for the audit, not shipped. |
| `heygen_intro` / `walkthrough_notes` fields in `curriculum.json` | Presenter scripts and shoot notes — production input, not lesson copy. |

## Known incompleteness in the source

- 179 of 181 lessons have **no video**. Recording is the source project's declared next phase.
- `LINKS_NEEDED_FROM_JEREMY.md` — nine Legends AI assistant URLs are still unresolved, so 13
  of the copied project ZIPs contain documented placeholder slots for those URLs. The ZIPs are
  otherwise complete and pass the source project's own integrity validation.
- The Elite waitlist is marked BLOCKED in `13_skool_build/pinned/PINNED_RESOURCES.md` — the
  Elite offer, price, and enrollment path are not defined. Course 14 is a preview only.
- `06_reports/build_validation.md` reports **56/56 checks passing** for everything else:
  15 covers, 181 lesson cards, 28 PDFs, 11 ZIPs, 181 lesson descriptions, 220 prompts.

## Read-only guarantee

A full `find`-based inventory of the source tree (path, size, mtime for all 3,955 files) was
captured before the import and re-captured after. The two are identical. Nothing in
`AI Advantage (Realtors)` was written, moved, renamed, deleted, or regenerated. No script from
`14_scripts/` was executed. Every `cp` and `ffmpeg` invocation read from the source and wrote
into `RCRE/`.

## September 8, 2026 authorization hardening

Videos, captions, PDFs, ZIPs and prompt packs were moved (not duplicated) from `apps/rcre-demo/public/academy/{video,handouts,downloads}` to `training-assets/protected/{video,handouts,downloads}`. Public covers and lesson artwork remain at their original URLs. Authorized media delivery is `/api/academy/media/…`, with role enrollment checks and byte range support. All lesson text and prompt resource rendering requires an authenticated portal session and course enrollment. Source hashes and modification times are recorded in `08-mvp/academy-source-integrity.json`; targeted rescan still finds two final videos. No original source assets were changed.
