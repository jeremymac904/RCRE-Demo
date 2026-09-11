# Premium UI Design Principles — RCRE Brokerage Technology Product

**Purpose:** design guidance for an internal demo of RCRE's brokerage technology product that must
read as a *premium instrument*, not a SaaS template, not a developer dashboard, not an AI-generated
landing page.

**Method:** primary-source extraction. CSS custom properties and computed styles were pulled
directly from the live products named below (read-only `curl` of production stylesheets +
`getComputedStyle` in a real browser at 1440×900). Every number attributed to a named product in
this document was measured or read from that vendor's own public documentation — none is recalled
from memory. Where a value is a *recommendation* rather than an observation it is marked **[RCRE]**;
in §11, which had a research pass fail verification, each claim additionally carries **[MEASURED]**
(read live by me) or **[DOC]** (vendor documentation), and everything that could not be verified was
**deleted rather than patched**. See the warning box at the top of §11.

**Date:** 2026-08-19
**Scope:** visual and interaction design only. No brand identity, no copy, no IA.

**Contents**
[0. Thesis](#0-the-one-paragraph-thesis) ·
[0.5 The fifteen rules](#05-the-fifteen-rules-if-you-read-nothing-else) ·
[1. Two registers](#1-two-registers-one-system) ·
[2. Measured reference data](#2-measured-reference-data) ·
[3. Typography](#3-typography--the-prescribed-scale-rcre) ·
[4. Spacing](#4-spacing-rcre) ·
[5. Hierarchy without cards](#5-hierarchy-without-a-grid-of-equal-cards) ·
[6. Borders / shadows / radius](#6-borders-shadows-radius-rcre) ·
[7. Color](#7-color-discipline-rcre) ·
[8. Photography](#8-photography--the-most-under-used-lever) ·
[9. Navigation](#9-navigation--chrome) ·
[10. Data density](#10-data-density--how-premium-products-handle-many-rows) ·
[11. AI surface](#11-the-ai-assistant-surface) ·
[12. Dashboards](#12-executive-dashboard-patterns) ·
[13. Microinteractions](#13-microinteractions-worth-building) ·
[14. Anti-patterns](#14-anti-patterns--the-explicit-do-not-ship-list) ·
[15. Token file](#15-reference-token-file-rcre) ·
[16. QA checklist](#16-pre-demo-qa-checklist) ·
[17. Sources](#17-sources) ·
[18. Applying it to RCRE](#18-applying-this-to-rcres-actual-surfaces-rcre)

---

## 0. The one-paragraph thesis

Premium interfaces do not look expensive because they add things. They look expensive because they
**subtract the three defaults that mark cheap software**: the rounded card, the drop shadow, and
decorative color. What replaces them is *typographic hierarchy*, *hairline structure*, and
*photography that is allowed to be large*. Douglas Elliman's entire site ships exactly three
border-radius values — `0px`, `100px`, `50%` — and no rounded rectangle anywhere. Compass, Sotheby's
and The Agency ship `border-radius: 0` on every image and every input. That single constraint does
more to signal "premium real estate" than any amount of gradient or glassmorphism.

The corollary for a *product* (not a website): premium software products are dense, quiet, and
keyboard-first. Linear's primary UI text is **15px**, its table text is **13px**, its borders are
black at **5–8% opacity**, and its container radius is **12px** — never 16px, never 24px. Density
plus hairlines reads as "instrument." Padding plus shadows reads as "template."

RCRE's product has to be both. Section 1 explains how to hold both without incoherence.

---

## 0.5 The fifteen rules, if you read nothing else

1. **Radius discipline: three values, total.** Register A (editorial/public) = `0`, plus `9999px`
   pills and `50%` avatars. Register B (product) = `6px` controls / `10px` containers / `12px`
   overlays. Nothing above `12px` on a data surface. Every premium brokerage measured — Compass,
   Sotheby's, Elliman, The Agency — ships `border-radius: 0` on **all** photography and inputs.
2. **Structure with 1px *tinted* hairlines, not with shadows.** `rgba(112,115,147,0.10)` — Mercury's
   measured primary, used 23 times on its dashboard — with `0.16` for stronger edges, applied as
   `box-shadow: 0 0 0 1px` so it doesn't consume layout. Every panel on Mercury's production
   dashboard ships `box-shadow: none`. Only menus, popovers and modals get elevation, layered, with a
   1px ring. **Swapping `#e5e7eb` for a tinted 10% alpha is the cheapest upgrade in this document.**
3. **13px is the product's default text size; 15px is its reading size.** Linear ships `13px` for
   lists and `15px` as `--font-size-regular`. Sotheby's public body text is `12px`. 16px in a data
   table is the loudest "admin template" signal available.
4. **Pair a neutral grotesque with an editorial serif — and use the serif in exactly two places.**
   Every premium product measured does this (Linear, Attio and Mercury all ship Tiempos alongside an
   Inter-class sans). Reserve the serif for the page hero and the single dashboard hero number. Inter
   alone at 400/600 reads as a template. **⚠ RCRE caveat:** RCRE's live identity is `Syne` +
   `Nunito Sans` with **no serif at all** — see §18 before adding one. The low-risk version is a
   serif used *only* for the hero number and large prices, as Sotheby's does.
5. **Tracking is a function of case and size.** Uppercase gets a *constant* `+0.08–0.1em` at every
   size (Elliman: 14px→1.4px, 20px→2px, 40px→4px). Sans display gets *negative* tracking that grows
   with size (`-0.011em` @15px → `-0.022em` @32px+, per Linear). **Serif display gets slightly
   positive tracking** (`+0.02em`, per Sotheby's) — never negative.
6. **Spacing: one 4px grid, asymmetric application.** `2 / 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 /
   96 / 128`. Editorial sections `96px` desktop / `56px` mobile. Product: `24px` panel padding,
   `20px` card padding, `12px` cell padding, `36px` row height. Space *above* a heading is 2–3× the
   space below it — symmetric margins read as machine-generated.
7. **Kill the four-equal-cards row — and never repeat a column count.** Mercury's production
   dashboard runs `1fr 1fr` → `repeat(3,1fr)` → full-bleed on a 968px column with a 24px gutter, and
   deliberately pairs *unlike* halves (chart ↔ dense list, never chart ↔ chart). Rhythm change is the
   single most effective no-template technique measured. Panel padding is asymmetric too: `20px 24px 2px`.
8. **One hero number per screen — and it is *smaller and lighter* than instinct says.** Mercury's
   measured hero balance is **28px at weight 380**, the same size as its `<h1>`, with a hero:secondary
   ratio of only **1.47×**. Hierarchy comes from a *display-face switch*, a four-step ink ramp, and
   `tabular-nums` — not from scale. **[RCRE]** cap at 32px in the display serif at weight 400. A
   48–72px bold number is the AI-dashboard signature. Set **every** figure in the product with
   `font-variant-numeric: tabular-nums` + `font-feature-settings:"tnum"` + **`letter-spacing:-0.03em`**
   — Mercury and Stripe converge independently on exactly that tracking value.
9. **Colour budget: ≤5% of text nodes.** A census of Mercury's live dashboard found **15 of 349
   text nodes coloured — 4.3%** — across exactly three colors. Use *dark, desaturated* semantics
   (`#036e43` forest green for money-in, magenta `#d03275` for money-out, red reserved for real
   errors), never `#22c55e`/`#ef4444`. The delta *text* stays neutral; only a 10×13px arrow carries
   color. Depth comes from canvas stepping plus a hairline, never a shadow.
10. **Rows, not cards, for records — and the table is the page.** `36px` rows, `12px` cell padding,
    sticky `11px` uppercase header, `1px` tinted-alpha dividers, hover `--canvas-1`, selection
    `--accent-quiet` + a `2px` accent left border. No zebra striping. Right-align and `tnum` every
    numeric column. Priority is a `6px` dot, never a row background.
11. **Detail opens in a 420px right side panel over `220ms cubic-bezier(.165,.84,.44,1)` — no
    scrim, no route change — and `J`/`K` moves through records with the panel open.** That single
    interaction is the difference between "feels like Superhuman" and "feels like Salesforce".
12. **Photography is the product.** `0` radius, `2.1:1` hero, `3:2` listing cards, `4:5` portraits,
    a full-height double gradient rather than a flat scrim, blurhash → `opacity 0→1` over `400ms`,
    and `scale(1.03)` inside a fixed frame on hover. One photograph at full width beats six at a
    third.
13. **The AI surface inherits the product, not the chatbot.** Measured on Claude's own design
    system: body **13px**, radius tops out at **10px**, controls **24px**, alpha borders, warm
    neutrals, motion between 60ms and 450ms. Asymmetric turns (user bubbled ≤90%, assistant
    unchromed and full-measure), no avatars, no sparkle. Text column capped at ~720px independent of
    pane width. **Verb tense encodes state** — `Searching Follow Up Boss` → `Searched Follow Up Boss,
    1,204 people`. Approvals put **scope in the button** (users approve ~93% of prompts, so a bare
    Allow/Deny is theatre), show the exact payload inline, and undo via a checkpoint, not just a
    toast.
14. **Motion budget: nothing over `260ms` in the product, everything decelerating.** Hover `100ms`
    ease-out, popover `140ms` quart-out, panel `220ms` quart-out, photography `520ms` expo-out,
    route transitions `0ms`. No `ease-in`, no springs, no bounce. Plus a real
    `prefers-reduced-motion` block.
15. **Ship `⌘K`, visible focus rings, hover-revealed shortcuts, optimistic writes with undo, and
    empty states that name the next action *and its keyboard shortcut*.** These five cost days, not
    weeks, and they are what a demo audience actually registers as "this is a real product."

---

## 1. Two registers, one system

The single most important structural decision. Do not average the two aesthetics into a mush —
**zone** them.

### Register A — EDITORIAL
Where the brokerage sells itself: public site, recruiting pages, agent profiles, listing
presentation, marketing asset previews, print/PDF output, the AI Academy front door.

| Property | Value |
|---|---|
| Display face | Editorial serif |
| Radius | `0` everywhere. Pills `9999px` and avatars `50%` are the only exceptions |
| Elevation | None. No `box-shadow` at all |
| Structure | Full-bleed photography, hairline rules, uppercase tracked labels |
| Density | Low. Section rhythm 96–128px desktop |
| Color | Near-monochrome + one metal/accent |

### Register B — INSTRUMENT
Where the agent works: CRM lists, pipeline, transaction workflow, dashboards, AI assistant,
settings, admin.

| Property | Value |
|---|---|
| UI face | Neutral grotesque (Inter-class), 13–15px |
| Radius | `6px` controls, `10px` containers, `9999px` pills. Never above 12px |
| Elevation | Only for surfaces that genuinely float (menus, popovers, modals, toasts) |
| Structure | 1px hairlines at 5–8% opacity; rows, not cards |
| Density | High. 32–40px row heights, 24px panel padding |
| Color | Neutral ramp + one accent + semantic pos/neg only |

### What the two registers SHARE (this is what makes it one product, not two)

1. **The same neutral palette.** Same ink, same hairline, same canvas tokens.
2. **The same 4px spacing grid.** Editorial uses the large end (48/64/96/128), Instrument uses the
   small end (4/8/12/16/24).
3. **The same "overline" label style** — uppercase, `0.08–0.1em` tracking, 11–12px, medium weight.
   This is the strongest connective tissue available and costs nothing. Elliman uses it at 14/16/18/
   20/40px with *constant* `0.1em` tracking; Sotheby's uses it in nav at 12px `1.6px` (`0.133em`).
4. **The serif, used surgically inside Register B.** Reserve the editorial serif for exactly two
   things on product surfaces: the page title of a record, and the single hero number on a
   dashboard. Nothing else. This is precisely what Sotheby's does — its homepage stat "1,100" is set
   in `MercuryDisplay-Roman` at 30px while every surrounding label is 12px BentonSans.

**[RCRE] Zoning rule:** a given screen belongs to exactly one register. The AI assistant panel and
the dashboard are Register B even when they sit next to a full-bleed listing photo. Never put a
Register-A serif headline above a Register-B data table.

---

## 2. Measured reference data

These are the actual production values, for calibration. Do not copy a system wholesale; copy the
*ratios and disciplines*.

### 2.1 Luxury real estate — measured live

| Product | Display face | UI face | Hero H1 | Body | Radius set | Shadows |
|---|---|---|---|---|---|---|
| **Sotheby's Int'l Realty** | `FreightBigBook` (serif) | `BentonSans-Book` / `-Medium`; `MercuryDisplay-Roman` for numerals | 38px / 42.18px lh (1.11) / w400 / **+0.8px (+0.021em)** | **12px / 16.5px (1.375)**, `#5b5b5b` | `0px` only | none observed |
| **Compass** | `Compass Serif` | `Compass Sans`, `Open Sans` | 56px / **56px lh (1.0)** / w700 | 16px / 24px (1.5) | `0px`; tokens say `2px`/`4px` | Material-style elevations, used sparingly |
| **Douglas Elliman** | `Sainte Colombe` (serif) | `Euclid Circular A` | **20px / 28px / w300 / +2px, UPPERCASE** | 18px / 28px / w300 / +0.54px | `0px`, `100px`, `50%` — nothing else | inset 1px ring; `0 1px 0` rule |
| **Christie's Int'l RE** | `Playfair Display` | `Gilroy` | scale to 3.25rem (52px) | 1rem / 1.5 | `0.25rem`, `20rem`, `100vmax` | — |
| **The Agency** | `Playfair Display` w400 | `Lato` | 35px / w400 | 16px | `0px` on all imagery | fixed 80px transparent nav |

**Christie's token scale (verbatim):**
`--global-font-size-1..15: 0.625, 0.75, 0.875, 1, 1.125, 1.1875, 1.25, 1.375, 1.5, 1.75, 2, 2.25, 2.56, 3, 3.25` rem
`--global-spacing-1..17: 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5` rem
`--global-line-height-1..6: 1, 1.1, 1.2, 1.3, 1.4, 1.5`

**Compass token scale (verbatim):**
sizes `10, 12, 14, 16, 18, 24, 28, 32, 36, 42, 50, 60, 72` px · weights `400 / 500 / 600 / 700`
line-heights `1.3` (title & compact) / `1.5` (body)
spacing `--cx-spacing-half:4px  1x:8px  2x:16px  3x:24px  4x:32px  8x:64px`
gutter `24px` desktop / `16px` mobile · column `64px` · `--cx-spacing-borderRadius: 2px`
border `1px`, `--cx-color-border: #dadada`, ink `#171717` / `#242424`

**Elliman's tracking law (the most reusable finding on this page):**
uppercase tracking is a *constant `0.1em`*, applied at every size — 14px→1.4px, 16px→1.6px,
18px→1.8px, 20px→2px, 40px→4px. Line-height for small uppercase is `size + 6px`; for display it
collapses to `1.0`.

### 2.2 Modern product UI — measured live

**Linear** (`static.linear.app/web/_next/static/css/index.*.css`, verbatim tokens):

```
--font-regular: "Inter Variable", "SF Pro Display", -apple-system, …
--font-serif-display: "Tiempos Headline", ui-serif, Georgia, …
--font-monospace: "Berkeley Mono", ui-monospace, "SF Mono", Menlo, monospace
--font-settings: "cv01", "ss03"

--font-weight-light:300  --font-weight-normal:400  --font-weight-medium:510
--font-weight-semibold:590  --font-weight-bold:680

--text-tiny:    0.625rem/1.5   ls -0.015em      (10px)
--text-micro:   0.75rem /1.4   ls  0            (12px)
--text-mini:    0.8125rem/1.5  ls -0.01em       (13px)
--text-small:   0.875rem/1.5   ls -0.013em      (14px)
--text-regular: 0.9375rem/1.6  ls -0.011em      (15px)  ← primary UI text
--text-large:   1.0625rem/1.6  ls  0            (17px)

--title-1: 590 17px/1.4   ls -0.012em
--title-2: 590 20px/1.33  ls -0.012em
--title-3: 590 24px/1.33  ls -0.012em
--title-4: 590 32px/1.125 ls -0.022em
--title-5: 590 40px/1.1   ls -0.022em
--title-6: 590 48px/1     ls -0.022em
--title-7: 590 56px/1.1   ls -0.022em
--title-8: 590 64px/1.06  ls -0.022em
--title-9: 590 72px/1     ls -0.022em

--radius-4:4px --radius-6:6px --radius-8:8px --radius-12:12px --radius-16:16px
--radius-24:24px --radius-32:32px --radius-rounded:9999px --radius-circle:50%

--border-hairline: 0.5px | 1px
--color-border-translucent:        #0000000d   (5%)
--color-border-translucent-strong: #00000014   (8%)
--color-border-primary:  #e9e8ea (light) / #23252a (dark)

--shadow-tiny:   0px 1px 1px 0px #00000017
--shadow-low:    0px 1px 4px -1px #00000017
--shadow-medium: 0px 3px 12px #00000017
--shadow-high:   0px 7px 24px #0000000f

--color-bg-level-0: #fff    / #08090a
--color-bg-level-1: #f8f8f8 / #0f1011
--color-bg-level-2: #f4f4f4 / #141516
--color-bg-level-3: #f0f0f0 / #191a1b
--color-text-primary:    #282a30 / #f7f8f8
--color-text-secondary:  #3c4149 / #d0d6e0
--color-text-tertiary:   #6f6e77 / #8a8f98
--color-text-quaternary: #62666d / #86848d
--color-brand-bg: #5e6ad2   --color-green:#27a644  --color-red:#eb5757
--color-yellow:#f0bf00      --color-blue:#4ea7fc   --color-teal:#00b8cc

--page-max-width: 1024px   --prose-max-width: 624px
--page-padding-inline: 24px  --page-padding-block: 64px  --page-padding-y: 48px
--header-height: 64px | 72px
--homepage-max-width: calc(1344px + outer-padding*2)
--homepage-outer-padding: 10 / 16 / 28 / 46px (responsive ramp)

ease-out-quart:  cubic-bezier(.165,.84,.44,1)
ease-out-expo:   cubic-bezier(.19,1,.22,1)
ease-in-out-quart: cubic-bezier(.77,0,.175,1)
```
Linear buttons: heights `24 / 32 / 40 / 44px`, horizontal padding `10 / 12 / 14 / 16 / 20px`,
radius `5px`. Keyboard chips (`KBD`): `min 16×16px` @10px or `20×20px` @13px, radius `4px`,
`1px` border, `4px` gap between keys, `min-width 48px` for named modifiers.

**Vercel / Geist** (verbatim):
```
--ds-shadow-border-base: 0 0 0 1px #00000014          ← border as shadow, 8% black
--ds-shadow-border-inset: inset 0 0 0 1px #00000014
--ds-shadow-xs:  0px 1px 2px #0000000a
--ds-shadow-small: 0px 2px 2px #0000000a
--ds-shadow-medium: 0px 2px 2px #0000000a, 0px 8px 8px -8px #0000000a
--ds-shadow-large:  0px 2px 2px #0000000a, 0px 8px 16px -4px #0000000a
--ds-shadow-menu: <border-base>, 0px 1px 1px #00000005,
                  0px 4px 8px -4px #0000000a, 0px 16px 24px -8px #0000000f
--ds-shadow-modal-elevated: 0 0 0 1px #00000014, 0px 32px 72px -12px #0000000f,
                  0px 8px 32px -12px #00000014, 0px 8px 24px -12px #0000001f
--ds-gray-alpha-100:#0000000d  -200:#00000014  -300:#0000001a  -500:#00000036
--ds-gray-100:#f2f2f2 -200:#ebebeb -300:#e6e6e6 -400:#eaeaea -500:#c9c9c9
--ds-gray-600:#878787 … --ds-gray-1000:#171717
--font-weight-semibold: 450 | 600      --radius-xl:0.75rem  --radius-3xl:1.5rem
```

**Mercury:** `Arcadia` + `Arcadia Display` (grotesque) paired with `Tiempos Headline` /
`Tiempos Fine` (serif) and `IBM Plex Mono`. Weights `300 / 360 / 400 / 420 / 480 / 500 / 530`.
`--text-base:1rem  2xl:1.75  3xl:2  4xl:2.25  5xl:2.625  6xl:3  7xl:3.438rem`.
`--radius-sm:.25 md:.375 lg:.5 xl:.75 2xl:1 3xl:1.5rem`.

**Claude (CDS, measured live — full token dump in §11.1):** `anthropic-sans` + `anthropic-serif` +
`anthropic-mono`; body **13px/19px**, caption 11/17, title 20/25; radius tops out at **10px**;
control height **24px**; warm neutral ramp `#f0efec → #0b0b0b`; desaturated semantics
(`#008300` green, `#b93535` red); alpha borders; motion budget 60ms–450ms.

**Attio:** `Inter` + `Inter Display` + `Tiempos Text` + `JetBrains Mono`.
**Raycast:** `Inter` + `Instrument Serif` + `JetBrains Mono`; `--radius:8px --radius-md:6px`.
**Stripe:** `sohne-var` at **weight 300** for display with `-1.4px` tracking at 56px; brand
`#635BFF`/`#533afd`; ink `#0A2540`; canvas-soft `#F6F9FC`; hairline `#e3e8ee`.
**Claude:** canvas `#faf9f5`, ink `#141413`, hairline `#e6dfd8`, accent `#cc785c`.

### 2.3 The pattern nobody advertises

**Every single premium product measured pairs a neutral grotesque with an editorial serif:**

| Product | Grotesque | Serif |
|---|---|---|
| Linear | Inter Variable | **Tiempos Headline** |
| Mercury | Arcadia | **Tiempos Headline / Fine** |
| Attio | Inter / Inter Display | **Tiempos Text** |
| Raycast | Inter | **Instrument Serif** |
| Claude | anthropic-sans | **anthropic-serif** |
| Sotheby's | Benton Sans | **Freight / Mercury Display** |
| Elliman | Euclid Circular A | **Sainte Colombe** |
| Compass | Compass Sans | **Compass Serif** |

This is the highest-leverage single decision available. A product that ships *only* Inter looks like
a template. A product that ships Inter **plus a serif used in two or three specific places** reads as
designed. Tiempos is the de-facto choice; free equivalents that hold up: **Instrument Serif**,
**Newsreader**, **Fraunces** (low `SOFT`/`WONK`), **Source Serif 4**, **Libre Caslon Display**.

**Before applying this to RCRE, read §18.** RCRE's live brand ships no serif, and adding one is an
identity decision rather than a styling one.

---

## 3. Typography — the prescribed scale **[RCRE]**

Two families. Three weights each. Nine sizes. If a size is not on this list it does not exist.

### 3.1 Families

```css
--font-display: "Tiempos Headline", "Instrument Serif", Georgia, "Times New Roman", serif;
--font-ui: "Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "Berkeley Mono", ui-monospace, "SF Mono", Menlo, monospace;
--font-feature-ui: "cv01", "ss03", "tnum" 0;   /* Linear ships cv01+ss03 — flat-topped 1, single-storey g */
--font-feature-num: "tnum", "lnum";            /* every table cell, every metric */
```

Weights: display `400` only (never bold a serif display — Sotheby's, The Agency and Christie's all
set hero serif at 400). UI `400 / 510 / 590` (Inter Variable) or `400 / 500 / 600` (static Inter).
**Do not use 700 in Register B.** Linear's heaviest UI weight is 590; Mercury's is 530.

**Use off-grid variable weights.** Every premium product measured avoids the round 100-grid: Linear
ships `300 / 400 / 510 / 590 / 680`, Mercury ships `300 / 360 / 380 / 400 / 420 / 480 / 500 / 530`,
Vercel ships a `450` semibold. Mercury's *hero balance* is weight **380** — lighter than body text.
`font-weight: 400/700` only, when a variable font is loaded, is a tell.

### 3.2 Register A — Editorial scale

| Token | Size (desktop) | Size (mobile) | LH | Weight | Tracking | Use |
|---|---|---|---|---|---|---|
| `ed-display-1` | 64px | 36px | 1.02 | 400 serif | `+0.005em` | Page-owning hero, once per page |
| `ed-display-2` | 48px | 30px | 1.08 | 400 serif | `+0.005em` | Section opener |
| `ed-display-3` | 34px | 26px | 1.15 | 400 serif | `0` | Sub-section |
| `ed-display-4` | 24px | 20px | 1.25 | 400 serif | `0` | Card/listing title |
| `ed-lead` | 20px | 18px | 1.55 | 300–400 sans | `+0.01em` | Standfirst under a hero |
| `ed-body` | 17px | 16px | 1.65 | 400 sans | `0` | Editorial body |
| `ed-overline` | 12px | 11px | 1.4 | 510 sans | **`+0.1em` UPPERCASE** | Eyebrow, nav, metadata |
| `ed-caption` | 12px | 12px | 1.45 | 400 sans | `+0.01em` | Photo credit, legal |

Positive tracking on serif display is a deliberate inversion of the SaaS convention. Sotheby's runs
`+0.8px` on a 38px headline (`+0.021em`); tight negative tracking on a serif reads as a webfont
loading bug, not as luxury.

### 3.3 Register B — Instrument scale

| Token | Size | LH | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `ui-micro` | 10px | 1.5 | 510 | `-0.015em` | Keyboard chips, badge counts |
| `ui-label` | 11px | 1.4 | 510 | **`+0.08em` UPPERCASE** | Column headers, section labels, field labels |
| `ui-xs` | 12px | 1.4 | 400 | `0` | Timestamps, helper text, tertiary metadata |
| `ui-sm` | 13px | 1.5 | 400/510 | `-0.01em` | **Table and list rows — the workhorse** |
| `ui-base` | 14px | 1.5 | 400/510 | `-0.013em` | Forms, panels, chat message body |
| `ui-md` | 15px | 1.6 | 400 | `-0.011em` | Reading text in a detail panel |
| `ui-title-1` | 17px | 1.4 | 590 | `-0.012em` | Panel header, card title |
| `ui-title-2` | 20px | 1.33 | 590 | `-0.012em` | Page title |
| `ui-title-3` | 24px | 1.33 | 590 | `-0.012em` | Screen title |
| `ui-metric` | **32px** | 1.2 | 400 **serif** (or 380–400 sans), `tnum` | **`-0.03em`** | The single hero number — see §12.1, do not oversize |
| `ui-metric-sm` | **19px** | 1.45 | 400 sans, `tnum` | **`-0.03em`** | Secondary metrics (1.47× ratio to hero, measured) |

**Rules that matter more than the numbers:**

1. **13px is the product's default, not 16px.** Every dense premium product lands at 13–15px.
   Sotheby's *website* body is 12px. A 16px table row is the loudest "bootstrap admin" signal there is.
2. **Tracking is a function of size.** Negative and increasing in magnitude as size grows
   (`-0.011em` at 15px → `-0.022em` at 32px+, per Linear). Positive and *constant* at `0.08–0.1em`
   for anything uppercase, at any size (per Elliman).
3. **Three weights per screen, maximum.** Typically `400` body, `510` emphasis, `590` titles.
   Never bold an entire row to indicate unread — change the *ink color* instead.
4. **`font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum"` on every number, plus
   `letter-spacing: -0.03em`.** Prices, commissions, GCI, days-on-market, dates, counts. Mercury and
   Stripe independently converge on exactly `-0.03em` for tabular figures at every size; Stripe ships
   it as a named utility (`.tabular-nums--tight`). Non-tabular figures in a column is the single most
   common tell of an unconsidered dashboard, and `letter-spacing: normal` on a large numeral is the
   second.
5. **Line-height is short for display, long for reading.** `1.0–1.15` above 30px; `1.5–1.65` at
   13–17px. Compass sets its 56px H1 at exactly `56px` line-height.
6. **`max-width` on prose is 60–68ch (~620–680px).** Linear ships `--prose-max-width: 624px`.
   Never let editorial body run the full width of a 1440px viewport.

---

## 4. Spacing **[RCRE]**

One 4px grid. Two ramps drawn from it.

```css
--space-0:0  --space-1:2px  --space-2:4px  --space-3:8px  --space-4:12px
--space-5:16px --space-6:24px --space-7:32px --space-8:48px
--space-9:64px --space-10:96px --space-11:128px --space-12:160px
```

### Register A rhythm (editorial)

| Context | Desktop | Tablet | Mobile |
|---|---|---|---|
| Section vertical padding | **96px** (128px for a chapter break) | 72px | **56px** |
| Gap between a section header and its content | 32px | 32px | 24px |
| Page horizontal gutter | 48px (Linear ramps 10→16→28→46px) | 32px | 20px |
| Content max-width | **1280–1344px** | — | — |
| Prose max-width | **624px** | — | — |
| Gap between editorial cards | 32px | 24px | 16px |
| Space above a hairline rule | 64px; below it 32px (asymmetric — the rule belongs to what follows) | | |

### Register B rhythm (instrument)

| Context | Value |
|---|---|
| App shell padding | 24px |
| Panel / drawer padding | 24px (20px if width < 400px) |
| Card padding (when a card is genuinely warranted) | **20px**, not 24px, not 32px |
| Table cell horizontal padding | 12px (first/last cell 16px to align with panel edge) |
| Table row height | **36px** default · 32px compact · 44px comfortable |
| List row height (with avatar + 2 lines) | 56px |
| Vertical gap between form fields | 16px; between field groups 32px |
| Gap between an inline label and its control | 6px |
| Toolbar height | 44px · sub-toolbar 36px |
| App header height | **56px** (Linear ships 64/72 for marketing; product chrome should be shorter) |
| Sidebar width | **240px** expanded · 56px collapsed |
| Detail panel width | **420px** default, resizable 360–640px (Linear's side panel maxes at 640px) |
| Command palette | 640px wide, 12px radius, max-height 440px |

**Asymmetric spacing is the tell of a designed layout.** Space *above* a heading should be
2–3× the space *below* it. A section header with `margin: 32px 0` reads as machine-generated; the
same header with `margin-top: 64px; margin-bottom: 20px` reads as typeset.

---

## 5. Hierarchy WITHOUT a grid of equal cards

The four-equal-cards row is the defining visual of generic software. Nine replacements, in rough
order of usefulness for RCRE.

### 5.0 Rhythm change — the single most effective technique (measured)

**Never use the same column count twice in a row.** Mercury's production dashboard runs
`1fr 1fr` → `repeat(3,1fr)` → full-bleed, all on a 968px content column with a 24px gutter. That
alternation alone is what separates a real product from an admin template — more than borders,
radii or color. The corollary: the four-equal-cards row fails not because cards are bad but because
*repetition* is bad.

Also measured on Mercury: the two halves of the first row are deliberately **unlike each other** —
a chart on the left, a dense list on the right. The asymmetry is `chart ↔ list`, never
`chart ↔ chart`. And panel padding is asymmetric: `20px 24px 2px`, tight at the bottom where the
content ends.

### 5.1 The stat rail (replaces the KPI card row)
A single horizontal band. No card backgrounds, no borders around each stat, **one 1px vertical rule
between items**, unequal widths.

```
┌──────────────────────────────────────────────────────────────────────┐
│  GCI, MONTH TO DATE                │ Units │ Avg DOM │ Pipeline      │
│  $412,880                          │  37   │   24    │ $8.4M         │
│  ▲ 18.2% vs. July                  │ ▲ 4   │ ▼ 3     │ 61 in escrow  │
└──────────────────────────────────────────────────────────────────────┘
```
Specs: band padding `24px 0`; hairline `1px` above and below the band only; **hero item gets ~40%
of the width**, the rest split evenly. Hero number **32px** in the display face at weight 400;
secondary numbers **19px** in the text face. Both `tabular-nums` at `-0.03em`. Label sits **above**
the number.

*Measured caveat on the dividers:* Stripe's stat row does use vertical rules; **Mercury's uses
spacing only — there are no vertical rules anywhere on its dashboard** — and it reads quieter. If in
doubt, drop the rules; 24px of space separates as well as a line and adds nothing to the ink budget.

*Measured caveat on the sizes:* see §12.1. The hero:secondary ratio in shipping product code is
**1.47×**, not the 2.5× that dashboard folklore prescribes. Resist enlarging the hero.

### 5.2 Asymmetric 2/3 + 1/3
The primary object (the pipeline table, the listing, the conversation) takes `1fr` and the context
column takes a **fixed 320–380px**. Never `grid-template-columns: 1fr 1fr 1fr`. The fixed column is
what makes it read as an application rather than a page.

### 5.3 The rule-and-label section header
```css
.section-header {
  display:flex; align-items:baseline; gap:16px;
  margin-top:64px; margin-bottom:20px;
}
.section-header::after { content:""; flex:1; height:1px; background: var(--hairline); }
```
Label in `ui-label`, then a hairline that runs to the end of the container. This gives structure
with zero boxes. Sotheby's and Elliman both use a variant of it.

### 5.4 Size ratio, not container, as the hierarchy signal
Give the most important element a clear type-size lead and let it sit on the same background as its
neighbours. **But the lead is smaller than instinct suggests** — Mercury's measured hero-to-secondary
ratio is **1.47×** (28px vs 19px), not 2.5×. The remaining hierarchy comes from a *typeface switch*
(display face vs text face), a *four-step ink ramp*, and `tabular-nums`. Four `20px` numbers in four
`#fff` cards with `0 1px 3px rgba(0,0,0,.1)` are ambiguous no matter what you do to the borders —
but a `64px` number is not the fix, it is the AI-dashboard signature.

### 5.5 Full-bleed / inset alternation
Alternate a section that runs edge-to-edge (photography, a dark band) with a section constrained to
`1280px`. The change in *width* is the hierarchy. Sotheby's opens with a full-width `#001731` navy
band; Compass opens with a 1265×600 (2.11:1) full-bleed photograph.

### 5.6 Background-level stepping, not shadows
Use Linear's four canvas levels (`#fff / #f8f8f8 / #f4f4f4 / #f0f0f0`). Depth comes from a 2–4%
luminance step plus a hairline, never from a shadow. The steps are almost invisible in isolation and
completely legible in context — which is the point.

### 5.7 The table IS the page
For a CRM, the highest-status layout is a full-height table with a sticky 36px header and no
wrapping card at all. Stripe's own reports do this: the chart is a summary, the table is the truth.
A table that floats inside a rounded white card inside a gray page is two containers too many.

### 5.8 One accent, spent once per screen
Hierarchy by scarcity. If exactly one element on the screen is colored, that element is the most
important element, and no amount of size can contradict it.

### 5.9 Whitespace as the frame
Instead of `border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px` around a group, use
`padding-top: 64px` above it and nothing else. The gap does the work of the box.

---

## 6. Borders, shadows, radius **[RCRE]**

### 6.1 Radius

| Surface | Register A | Register B |
|---|---|---|
| Photography, listing media, video | **0** | **0** |
| Inputs, selects, textareas | **0** (underline style) | `6px` |
| Buttons | `0` or `9999px` | `6px` |
| Containers, panels, cards | **0** | `10px` |
| Popover / menu / command palette | — | `12px` |
| Modal | — | `12px` |
| Avatar | `50%` | `6px` (square-ish) or `50%` — pick one and never mix |
| Badge / pill / chip | `9999px` | `9999px` |

**Hard rules.** Never exceed `12px` on a data surface. Never round an image in Register A. Never mix
`8px` and `12px` on sibling elements. Elliman's entire site ships three radii total; that is the
target, not an accident.

### 6.2 Borders — the default structural element

```css
/* TINTED, low-alpha. Never a solid neutral grey. */
--hairline:        rgba(112,115,147,0.10);  /* Mercury's primary — 23 uses on its dashboard */
--hairline-strong: rgba(112,115,147,0.16);  /* secondary — 12 uses                          */
--hairline-max:    rgba(112,115,147,0.22);  /* strongest —  4 uses                          */
/* dark mode */
--hairline-dk:        rgba(255,255,255,0.08);
--hairline-strong-dk: rgba(255,255,255,0.14);
```

**Measured hairline values across the study — all low-alpha, all tinted:**

| Product | Border |
|---|---|
| Mercury | `rgba(112,115,147,0.10)` |
| Brex | `rgba(66,87,138,0.15)` |
| Vercel Geist | `0 0 0 1px #00000014` light / `#ffffff25` dark |
| Linear | `#e9e8ea` light / `#ffffff14` dark; translucent `#0000000d` |

**Swapping `#e5e7eb` for `rgba(112,115,147,0.10)` is the single cheapest upgrade in this document.**
The Tailwind grey is noticeably blue-cold and instantly recognisable; a tinted 10% alpha sits
correctly on any background, including tinted panels and dark mode.

- **1px, always.** `0.5px` only where the platform supports it and only for table row dividers.
- **Alpha, not hex.** An opaque `#e5e7eb` divider becomes visibly wrong the moment it crosses a
  tinted background. Both Linear (`#0000000d`, `#00000014`) and Vercel (`#00000014`) ship alpha.
- **Use `box-shadow: 0 0 0 1px` rather than `border` for container edges** so the border does not
  consume layout box. This is exactly Vercel's `--ds-shadow-border-base: 0 0 0 1px #00000014`.
- **Row dividers, not row backgrounds.** Zebra striping is an admin-template signal. A 1px 6% rule
  between rows plus a hover tint is the premium equivalent.
- **Do not border everything.** A screen should have roughly 3–6 hairlines, not 30. If every group
  has an outline, none of them read as a group.

### 6.3 Shadows — for floating things only

Anything that is part of the page gets **no shadow**. Only things that are temporarily above the
page get one, and it must be a *layered* shadow with a 1px ring, never a single soft blur.

*Measured:* every panel on Mercury's production dashboard ships `box-shadow: none` with a `12px`
radius and a `1px` 10%-alpha border. Vercel formalises the same idea — `--ds-shadow-border-base:
0 0 0 1px #00000014` is a *border expressed as a shadow*, and real elevation is reserved for menus,
tooltips and modals. Note Geist's alphas: `05`, `0a`, `0f` — 2%, 4%, 6%.

```css
/* menus, dropdowns, popovers, command palette */
--shadow-menu:
  0 0 0 1px rgba(0,0,0,0.08),
  0 1px 1px rgba(0,0,0,0.02),
  0 4px 8px -4px rgba(0,0,0,0.04),
  0 16px 24px -8px rgba(0,0,0,0.06);

/* modal / dialog */
--shadow-modal:
  0 0 0 1px rgba(0,0,0,0.08),
  0 8px 32px -12px rgba(0,0,0,0.08),
  0 32px 72px -12px rgba(0,0,0,0.06);

/* the ONLY shadow allowed on a resting element: a 1px hairline ring */
--shadow-ring: 0 0 0 1px rgba(0,0,0,0.08);
```

Forbidden: `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` on a card. `0 10px 15px -3px rgb(0 0 0 / 0.1)`
(Tailwind `shadow-lg`) anywhere. Any shadow with a colored tint. Any shadow on a table row.

---

## 7. Color discipline **[RCRE]**

### 7.1 The budget — measured, not guessed

A census of every leaf text node on Mercury's live dashboard:

```
text nodes:          349
carrying any color:   15
                   →  4.3%
```

**95.7% of the text is neutral**, and the complete colored-text inventory is *three* colors:
`#036e43` (positive / money-in, 11 uses), `#465bd1` (link / action, 3 uses), `#b0175f`
(negative / alert, 1 use). Plus three icon/chart colors: `#188554`, `#d03275`, `#5266eb`.

**[RCRE] Target: ≤5% of text nodes carry color.** Photography does not count toward the budget —
photography *is* the color. On a dashboard screen that means one accent-filled primary button, a
handful of status dots, direction-of-money arrows, and nothing else.

**Note how dark the green is.** `#036e43` is a deep forest green, not `#22c55e`. Low luminance is
what makes it read as *money* rather than as a success toast. The same applies to the negative:
Mercury uses **magenta `#d03275`**, reserving red for actual errors.

### 7.2 The palette shape

```css
/* Ink — 4 steps, that's all */
--ink-1: #1a1a1a;   /* primary text, hero numbers            */
--ink-2: #4a4a4f;   /* secondary text, body                  */
--ink-3: #737278;   /* tertiary — labels, metadata           */
--ink-4: #a3a2a8;   /* quaternary — placeholders, disabled   */

/* Canvas — 4 steps, 2–4% luminance apart */
--canvas-0: #ffffff;
--canvas-1: #fafaf9;
--canvas-2: #f5f4f2;
--canvas-3: #f0efec;

/* Brand — exactly ONE */
--accent: <RCRE brand>;             /* fills: primary button, focus ring, active nav */
--accent-quiet: color-mix(in oklch, var(--accent) 8%, transparent);

/* Semantic — used ONLY on direction-of-money, statuses, and validation. Never decoratively. */
--pos:      #036e43;   /* Mercury — deep forest, reads as money not as a toast */
--pos-icon: #188554;   /* Mercury — the arrow glyph only                       */
--neg:      #d03275;   /* Mercury — MAGENTA. Red is reserved for errors.        */
--error:    #d8351e;   /* Stripe error-500 — actual failures only               */
--warn:     #f0bf00;   /* Linear                                                */
```

**Measured semantic ramps from the other systems** (use these, not Tailwind's):
```
Stripe HDS  success 100 #b6f2c7 · 400 #00b261 · 600 #006f3a
            error   100 #feb9ac · 300 #f4745c · 400 #f3432a
                    500 #d8351e · 600 #a01400 · 700 #721e11
            brand   600 #533afd   (marketing #635bff)
            neutrals are BLUE-TINTED, never pure grey:
                    500 #64748d · 700 #3c4f69 · 900 #1a2c44
Vercel      green 700 #00ab3e / dk #28a948   ·  green 900 #107d32 / dk #00ca52
            red   800 #e2162a / dk #e70022   ·  red   900 #d60020 / dk #ff5e63
            blue  700 #0070f7 / dk #0071f6
```

### 7.3 Where color is permitted

| Allowed | Not allowed |
|---|---|
| One filled primary button per view | Colored section backgrounds |
| Focus ring (2px accent at 40% + 1px solid) | Colored card headers |
| Active nav item (accent text + 2–3px accent rule, per Sotheby's `3px solid` nav underline) | Colored icons in a nav list |
| 6px status dot | Colored badges for every attribute |
| A ▲/▼ **arrow glyph** (the delta text itself stays neutral) | Filled green/red delta pills |
| Positive/negative currency | Gradient buttons |
| Photography | Gradient backgrounds |
| A single dark editorial band (Sotheby's `#001731`) | Multi-hue chart palettes |

### 7.4 Chart color
**One color per chart.** Mercury's single dashboard chart is one `#5266eb` line at `1px` with a
gradient area fill from 16% to 2% alpha of that same color — no second series, no gridlines, no
y-axis. If you genuinely need more than one series, cap it at 3 and take them from **one hue at
descending lightness**, never from a categorical rainbow. If you need more than 3, the answer is a
table.

### 7.5 The luxury move
A single deep, desaturated brand band — navy, ink, forest, oxblood — used for the hero and the
footer, with everything between it in near-white. Sotheby's `#001731` navy with a gold rule is the
canonical version. It costs one color and it is instantly legible as "expensive."

---

## 8. Photography — the most under-used lever

For a real estate product, photography is not decoration; it is the product's primary asset and the
cheapest source of perceived quality.

| Rule | Spec |
|---|---|
| Radius | **`0`. Always.** Confirmed on Compass, Sotheby's, The Agency, Elliman. |
| Hero aspect | `2.1:1` desktop (Compass ships 1265×600), `4:5` or `1:1` mobile |
| Listing card | **`3:2`** (Compass ships 358×239 = 1.497:1). Christie's uses `16:9` for editorial |
| Agent portrait | `4:5` portrait, never a circle crop on a public page |
| Gallery thumb | `1:1` |
| Text over image | Full-height gradient `linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,.65) 100%)` — never a flat 40% black scrim |
| Loading | Dominant-color or blurhash placeholder, `opacity 0→1` over `400ms ease-out`. Never a gray box that pops |
| Hover | `scale(1.03)` on the **image inside a fixed-overflow-hidden frame** over `600ms cubic-bezier(.19,1,.22,1)`. The frame does not move |
| Size discipline | One photograph at 100% viewport width beats six at 33% |

**Anti-pattern:** stock photography of handshakes, generic city skylines, or a laptop on a desk.
For an internal demo, a *small number of real RCRE listing photographs at large size* will outperform
any amount of layout work.

---

## 9. Navigation & chrome

### Register A (public/editorial)
- Fixed header, `64–80px` (The Agency ships 80px), **transparent over the hero**, acquiring a solid
  background + 1px bottom hairline after `~80px` of scroll — transition `background 240ms ease-out`.
- Nav items: `ed-overline` — 12px, weight 510, uppercase, `+0.1em`, `24–32px` apart.
- Active state: **`3px` solid bottom rule in the accent**, `6px` below the text (Sotheby's exact
  spec). Not a pill, not a background tint.
- The logo is the only element permitted to break the type scale.
- Search: a **transparent input with a 1px bottom rule and no radius**, set in the *display serif* at
  20–22px. Sotheby's ships `MercuryDisplay-Roman` at 22px inside a `background: transparent;
  border: none; border-radius: 0` field, `40px` tall, with a `→` glyph instead of a button. This one
  detail carries more luxury signal than any other single element on their site.

### Register B (product)
- Left sidebar `240px`, `--canvas-1` background, `1px` right hairline.
- Sidebar item: `32px` tall, `6px` radius, `8px` horizontal padding, `13px / 510`, icon `16px` at
  tertiary ink. Active = `--canvas-3` fill + primary ink. **No accent fill on nav items.**
- Group labels in the sidebar: `ui-label` (11px uppercase `+0.08em` tertiary), `24px` top margin.
- Top bar `56px`: breadcrumb on the left in 13px, actions right-aligned, `1px` bottom hairline. No
  page title in the top bar if the page already has an H1.
- **`⌘K` command palette is mandatory** for a product claiming to be premium: 640px, 12px radius,
  16px input, 13px results, 12px metadata, `--shadow-menu`. This is the highest
  perceived-quality-per-hour feature available.

---

## 10. Data density — how premium products handle many rows

1. **Default to a table, not cards.** Cards for records are a mobile-first compromise; on desktop
   they waste 60% of the pixels and destroy scanability. Attio, Linear and Height all put the table
   first.
2. **Row height 36px, cell padding 12px horizontal, 0 vertical** (height controls the rhythm, not
   padding). Offer a compact (32px) / comfortable (44px) toggle; persist the choice.
3. **Header row:** `ui-label` — 11px, uppercase, `+0.08em`, weight 510, tertiary ink, `1px` bottom
   hairline at 9%, sticky, `--canvas-0` background. Not bold, not 14px, not a filled gray bar.
4. **Row dividers at `--hairline` (tinted 10% alpha), hover at `--canvas-1`, selected at `--accent-quiet` (8%) with a `2px`
   accent left border.** Never a saturated selection fill.
5. **Right-align every numeric column** and set it in `tnum`. Left-align text. Center nothing.
6. **Truncate with `text-overflow: ellipsis` and reveal on hover in a tooltip** — never wrap a table
   cell to two lines.
7. **Priority without clutter:** encode urgency as a `6px` dot or a `2px` left border on the row, not
   as a background color, a bold row, or a red badge. One dot column, four possible colors, done.
8. **Progressive disclosure:** row actions appear on hover only, right-aligned, as `24px` ghost icon
   buttons. The row shows nothing at rest but data.
9. **Detail opens in a side panel, not a route change.** `420px`, slides from the right over
   `220ms cubic-bezier(.165,.84,.44,1)`, `1px` left hairline, no scrim on desktop (a scrim says
   "modal" and implies the list is unusable, which it isn't). `Esc` closes. `J`/`K` move to the
   next record *with the panel still open* — this is the single interaction that makes a CRM feel
   like Superhuman rather than like Salesforce.
10. **Column count:** 5–7 visible by default. A column picker, not 14 columns and a horizontal
    scrollbar.
11. **Empty state:** left-aligned, inside the table frame, `ui-title-1` line + one `ui-base` line of
    tertiary ink + one primary action + **the keyboard shortcut for that action**. No illustration,
    no centered clip-art, no "Oops! Nothing here yet 🙈".
12. **Loading:** skeleton rows at the *exact* final row height, `--canvas-2` fill, `6px` radius,
    a `1.4s` shimmer at 4% opacity. Never a centered spinner over an empty page.

---

## 11. The AI assistant surface

The fastest way to make a premium product look cheap in 2026 is a badly-styled AI panel. Governing
principle: **the AI is a colleague speaking in the product's own voice, not a bolted-on chatbot.**

> **⚠ Provenance warning — read before using any number in this section.**
> A first-pass research sweep for this section returned a large set of precise-looking figures for
> Zed, VS Code, Perplexity, Windsurf, Attio, Superhuman and Notion that were subsequently
> **retracted as unverified**. Those numbers have been **deleted from this document rather than
> patched**, because invented figures that look trustworthy are worse than no figures.
>
> What remains is limited to three things, labelled throughout:
> **[MEASURED]** — read directly from a live product in this session, by me;
> **[DOC]** — stated in a vendor's own public documentation;
> **[RCRE]** — my recommendation, not an observation.
>
> Where a mechanism is described without a number, that is deliberate: the *structure* is
> well-attested across products even where I could not verify the exact value. **Do not invent the
> missing values — measure them, or choose them from §3–§7 and be internally consistent.**

### 11.1 Claude's own design system, measured **[MEASURED]**

Extracted live from `claude.ai`'s shipped stylesheet (2,087 CSS custom properties visible on the
sign-in surface). This is the most directly relevant reference available, and it independently
confirms most of §3, §6 and §7.

```css
/* Families — the grotesque + serif + mono triad of §2.3, in an AI product */
--font-anthropic-sans:  "anthropic-sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-anthropic-serif: "anthropic-serif", "Anthropic Serif Fallback Georgia", …;
--font-anthropic-mono:  "anthropic-mono", ui-monospace, monospace;

/* Type — note how small this is. 13px is the BODY size of a flagship AI product. */
--cds-font-size-body: 13px;        --cds-leading-body: 19px;      /* lg 14/20 · sm 12/17 */
--cds-font-size-heading: 14px;     --cds-leading-heading: 18px;
--cds-font-size-title: 20px;       --cds-leading-title: 25px;
--cds-font-size-caption: 11px;     --cds-leading-caption: 17px;   /* sm 10px */
--cds-font-size-code: 12px;        --cds-leading-code: 17px;
--cds-font-size-footnote: 12px;    --cds-leading-footnote: 15px;
--cds-font-size-prose: .875rem;    --cds-leading-prose: 1.25rem;  /* 14/20 · lg 15/22 */

/* Radius — the whole set tops out at 10px */
--cds-radius: var(--cds-radius--lg);   /* 10px */   --cds-radius--sm: 7px;  --cds-radius--xs: 6px;
--cds-checkbox-radius--lg: 6px;  --sm: 5px;  --xs: 4px;
--df-radius-card: 8px;   --df-radius-pill: 8px;   --misc-window-radius: 16px;  --radius-full: 999px;

/* Controls — 24px, denser than most design systems ship */
--cds-h-control: 24px;         /* lg 28 · sm 20 · xs 20 */
--cds-h-control-nested: 18px;  /* lg 20 · sm 16 · xs 16 */
--cds-avatar-xs: 16px;  --sm: 20px;  --md: 28px;  --lg: 36px;

/* Space */
--cds-pad-xs: 4px;  --sm: 6px;  --md: 8px;   --lg: 12px;  --xl: 20px;
--cds-gap-xs: 6px;  --sm: 8px;  --md: 12px;  --lg: 20px;  --xl: 32px;

/* Borders are ALPHA, and semantic colors come from a 250-step */
--cds-border-strong:   var(--cds-alpha-3);
--cds-border-stronger: hsl(from var(--cds-neutral-900) h s l / 40%);
--cds-border-accent: var(--cds-blue-250);   --cds-border-danger:  var(--cds-red-250);
--cds-border-success: var(--cds-green-250); --cds-border-warning: var(--cds-yellow-250);

/* Neutrals are WARM, not blue-grey */
--cds-gray-50:#f0efec  100:#e1e0d9  200:#c3c2b7  500:#6d6b67  600:#52514e  700:#383835  900:#0b0b0b

/* Semantics are DESATURATED — compare to #22c55e / #ef4444 */
--cds-green-500:#008300  600:#006300  700:#074506
--cds-red-500:#b93535    600:#8e2626  700:#641919      /* --cds-text-danger = red-600 #8e2626 */
--cds-orange-500:#ae461c 600:#863311  700:#5d230b
--cds-blue-500:#256abf   600:#184f95  700:#0d366b

/* Diff / state tint: 20% fill, 40% border — a reusable formula */
--cds-bg-git-added:     color-mix(in srgb, var(--cds-text-git-added) 20%, transparent);
--cds-border-git-added: color-mix(in srgb, var(--cds-text-git-added) 40%, transparent);
/* full state set: added · opened · removed · modified · queued · merged · conflicting · draft · closed */

/* Motion */
--cds-dur-fast: 60ms   --cds-dur-snap: .12s   --cds-dur-base: .2s   --cds-dur-slow: .45s
--cds-ease-out:       cubic-bezier(0, 0, .2, 1);
--cds-ease-snap:      cubic-bezier(.32, .72, 0, 1);
--cds-ease-overshoot: cubic-bezier(.34, 1.3, .64, 1);

/* Elevation + stacking */
--cds-shadow-popover: 0 8px 24px #0000001f, 0 2px 6px #00000014;
--cds-z-coachmark:35  --cds-z-modal:40  --cds-z-popover:50  --cds-z-tooltip:50  --cds-z-toast:60
```

**Five things to take from this directly:**

1. **13px body / 11px caption / 20px title.** A flagship AI product's *entire* UI runs at 10–20px.
   §3.3's scale is, if anything, slightly generous.
2. **Max radius 10px.** Confirms §6.1. A 24px chat bubble is not what premium AI products ship.
3. **Borders are alpha (`--cds-alpha-3`, `hsl(… / 40%)`)**, exactly as §6.2 argues.
4. **Warm neutrals and desaturated semantics** — `#008300` green, `#b93535` red. Confirms §7.2.
5. **The 20%-fill / 40%-border formula** for any state-tinted block. Reuse it for approval blocks,
   status pills and record diffs rather than inventing new tints.

### 11.2 Layout — decouple the measure from the pane

**[DOC]** ChatGPT's conversation container is capped at `40rem`/`48rem` (640/768px) across
breakpoints, not at the pane width.

**The structural rule is well-attested even where I could not verify each product's number: never
let the text column equal the pane width.** The pane resizes freely; the measure caps and centers.
This is the same discipline as §3.3's `--prose-max-width: 624px`.

**[RCRE]** `680–720px` for the full-screen assistant. In the docked panel, keep §4's `420px` and let
the text fill it. If the assistant ever renders diffs, allow `850–950px`.

### 11.3 User vs assistant — asymmetric, and differentiated by *typeface*

**[MEASURED]** Claude's CDS ships `--font-anthropic-sans` **and** `--font-anthropic-serif` as
siblings — the grotesque + serif pairing of §2.3, present inside an AI product.

The structural pattern across serious products is **asymmetric, not two facing bubbles**: the user
turn gets a light-tinted bubble and is right-aligned at a fraction of the measure; the assistant turn
is unchromed and runs the full measure. Vercel's open-source AI Elements does exactly this — the
user variant carries a background and padding; the assistant variant carries only a text color — and
**ships no avatar at all** in its default Message component.

**[RCRE]**
- User turn: `--canvas-1` fill, `8px` radius, `12px 16px` padding, `max-width: 90%`, right-aligned.
- Assistant turn: no fill, no padding, full measure, `--ink-1`.
- Differentiate additionally **by typeface** if §18 option 2 or 3 is taken — user in the sans,
  assistant in the serif. That single split does more work than any background color.
- **Avatars: none.** If attribution is needed, an `ui-label` line ("HERMES", 11px uppercase
  `+0.08em`, tertiary) above the assistant's first block. Never a robot glyph or gradient orb.
- Turn spacing `32px`; blocks within a turn `12px`.
- **Bubble radius ≤10px.** Claude's entire token set tops out there. A 22–28px radius reads as a
  consumer messaging toy.

### 11.4 Tool / agent activity — where premium is won or lost

**Verb tense encodes state.** This is the highest-value idea in the section and it is confirmed by
Linear's public agent API **[DOC]**: an activity is re-emitted with the verb changed, carrying the
result.

```jsonc
{ "type":"action", "action":"Searching", "parameter":"San Francisco Weather" }
{ "type":"action", "action":"Searched",  "parameter":"San Francisco Weather", "result":"12°C, mostly clear" }
```

**[RCRE]** ship *two strings per tool*, plus separate zero/one/many result forms:
`Searching Follow Up Boss` → `Searched Follow Up Boss, 1,204 people` / `, 1 person` / `, no matches`.

**Linear's *ephemeral activity* is the cleanest collapse model** **[DOC]**: transient steps are
**replaced in place** by the next one rather than accumulating and then collapsing. Only thought and
action activities may be ephemeral. Prefer this to a growing stack.

**[RCRE] row anatomy**
- One line per step, `12–13px` **proportional** text (Claude's `--cds-font-size-body` is 13px) at
  tertiary ink. **Monospace is for the payload, never for the label.**
- `font-variant-numeric: tabular-nums` on any count in the label, so `84 lines` → `128 lines` cannot
  reflow the row.
- Reserve the row's height before it renders so a progress row becoming an expandable row does not
  shift the text.
- Collapse the group after the answer completes, to a single line. Keep it expandable, collapsed by
  default. Keep *edits* and *command output* expanded — those are the ones a user actually reads.
- Chevron hidden until hover or expansion; rotate `90deg` on expand.
- **Never ellipsis-truncate output.** Clamp the block to a fixed height, fade the last ~24px with a
  `mask-image` gradient, and put an explicit `See more` control at the bottom-right.
- Cap tool output and *say so* in the UI. **Every runtime cap is a UI decision.**

**Progress state.** Claude's *thinking* indicator is a slow opacity breath, and — measured
**[MEASURED]** in its keyframes — it is deliberately delayed several seconds before it starts, so a
fast turn never animates at all. That restraint is the point. Use `--cds-dur-fast: 60ms` /
`--cds-dur-base: .2s` for state changes and reserve any looping animation for genuinely long work.

**⚠ Shimmer is now itself a tell** — see §14.2b. If you use it: one element only, never simultaneously
with a spinner, and never on a step that completes in under 500ms.

**Thresholds [RCRE]:** show nothing under `500ms` · show an indicator past `2s` · reflect any state
change within `100ms`.

**Error states.** Vercel AI Elements ships a tool-state machine worth copying wholesale for its
*distinctions*, particularly that **denied ≠ error**:
`pending · running · awaiting approval · responded · completed · denied · error`.
Render the error body as a `10%` tint of the error color in the **same** container as a success
result — not as a full-width red banner. Use §11.1's `20%` fill / `40%` border formula.

### 11.5 Suggested prompts

**[RCRE]** — the structural guidance, with values chosen from §3–§4 rather than borrowed:

- **Empty state only** (3–5 items), plus at most 2 follow-ups after a completed answer.
- **Rows, not chips.** Full-width rows at `40px` with `1px` hairline dividers and a `→` revealed on
  hover. Chips wrap and push the composer down as they multiply; fixed-height rows do not.
- Each suggestion must demonstrate a **different capability**, and must read like something a real
  agent would actually type:
  `Which of my leads went quiet this week` ·
  `Summarise every deal closing in the next 14 days` ·
  `Draft a follow-up for the Hoover showing`.
- Never `Ask me anything`. Never `✨ Try asking…`. Never a question mark on a prompt suggestion —
  they read better as statements of intent.
- They unmount on first send and do not return mid-conversation.

**[MEASURED]** Perplexity's in-composer mode chips are `24px` tall, `12px` text, `9999px` radius,
`0 8px` padding, **transparent background with no border at rest** — small, quiet, and *inside* the
composer rather than floating above it.

### 11.6 Approval / confirmation UX

**The design brief is one published number [DOC]: Claude Code users approve ~93% of permission
prompts.** A binary Allow/Deny at that rate is theatre. The mature response, visible across
products, is to **put scope in the button** rather than asking the same binary question repeatedly.

**[DOC]** Claude Code's plan approval is a three-way with the *mode* embedded in the choice —
`Yes, and use auto mode` · `Yes, manually approve edits` · `No, keep planning` — and the mode itself
is a persistent status-bar affordance cycled with `⇧Tab`. **[DOC]** Cursor, Zed and VS Code all
expose an equivalent queue/steer/mode vocabulary, and all three ship a **checkpoint** (`Restore
Checkpoint`) rather than relying on a toast.

**[DOC] Fatigue guards are part of the design.** Anthropic halts and escalates to a human after
**3 consecutive denials or 20 total**, and its permission classifier deliberately sees only user
messages and tool calls — **the assistant's own prose is stripped**, so the model cannot argue its
way past the gate. Ship an equivalent ceiling and an equivalent blindness.

**[RCRE] the recommended grammar.** RCRE's governance posture (no production FUB writes, no outbound
sends without approval) makes this a first-class feature — lead the demo with it.

| Action class | Surface | Buttons |
|---|---|---|
| Record write (create/update in FUB) | Inline bordered block, `10px` radius, `1px` hairline, `--canvas-1`, showing the **exact payload** and the target record as a link | `Update` · `Approve all like this this session` · `Deny` |
| Drafted communication (email/SMS) | **Staged block** — the draft is composed but *not written or sent* until accepted | `Accept` · `Try again` · `Discard`, with an explicit line: *"Accepting does not send — you'll review before it goes out."* |
| Read-only research | No gate; report afterwards | `Searched web · 6 results` |

- **Scope belongs in the button**, not only in a settings page.
- **Record diffs as `field · old → new` rows** — old struck through at `--ink-4`, new at `--ink-1`.
  A green/red git diff is a developer-tool cue in a brokerage CRM. If you do tint, use §11.1's
  `20%` fill / `40%` border.
- **Hold one verb pair everywhere.** Pick `Approve`/`Deny` or `Keep`/`Reject` and never mix them, and
  bind them to the same key pair across both permission prompts and diff review.
- **Undo is a checkpoint, not just a toast.** A `10s` undo toast for a single write, **plus** a
  per-turn checkpoint for anything that touched more than one record.
- Show keyboard chips on the **first** prompt of a kind, not on every one.

### 11.7 Citations, sources and grounding

**[DOC]** Vercel AI Elements labels its collapsed source list with the literal
`Used {count} sources` and renders inline citations as a hover card — `openDelay` and `closeDelay`
both **0**, so the preview is instant in both directions — with title, URL and a clamped 3-line
excerpt.

**[RCRE] the citation unit for RCRE is the *system of record*, not a footnote number.**
`Follow Up Boss` · `GALMLS` · `Brokerage policy` · `Transaction file` tells an agent something a
superscript `¹` never can. Render it as a baseline-inline pill — **not superscript** — at `10px`,
`mono`, `tabular-nums`, `8px` radius, `3px × 5px` padding, tertiary ink on `--canvas-2`, truncated
around 25 characters, hover `150ms` to `--canvas-3`. On hover, a `320px` card with the record name,
its type, and the matched snippet.

**Source list:** overlap 3 small favicons/type-glyphs and follow them with the total — `9 sources` —
and make **the count itself the click target**. Do not ship a `+N more`.

**Attio's confidence dot is the tightest AI-provenance affordance in the survey and maps perfectly
onto RCRE [DOC]:** a per-cell dot (green = high, yellow = medium, red = low) where hovering reveals
the model's reasoning *and* its sources — and where, if the AI cannot produce a value, **the cell
stays blank**. Honest failure is a premium signal; a confidently wrong autofill is not.

**Context chips [RCRE]:** `24px` tall, `9999px` radius, `1px` hairline, `12px` label, `×` to remove.
**Distinguish attached-by-user from attached-by-system with a `dashed` border and an italic label** —
a cheap, legible distinction. `@` mentions a record; `/` selects a mode. Show a context-window gauge
only if it can be made accurate.

### 11.8 Composer

**[MEASURED]** Perplexity, live at 1440px: composer shell **118px** tall containing a **52px**
textarea, **16px** radius, background `oklch(.9563 .006 75.41)` — a *warm* off-white, not grey —
border `1px solid rgba(39,26,0,0.14)`, a **warm-tinted 14% alpha** that arrives at §6.2's conclusion
from a completely different product, and a near-invisible `0 1px 2px rgba(0,0,0,.05)` shadow. Input
text `16px`. The whole page ships only five radii: `0 / 8 / 15 / 16 / 9999px`.

**[DOC]** Vercel AI Elements grows its textarea with **`field-sizing: content`** between
`min-h-16` (64px) and `max-h-48` (192px) — pure CSS. **Use this; it retires the entire
scrollHeight-measurement dance.**

**[RCRE]**
- Sticky bottom, `--canvas-0`, `1px` top hairline, `16px` padding.
- Field `1px` hairline, `10px` radius, min-height `56px`, `field-sizing: content` capped near
  `200px`, `ui-base` 14px, placeholder at `--ink-4`.
- **Match the composer width to the answer column exactly** so it reads as the foot of the column,
  not as a separate bar.
- Controls sit *inside* the field on the bottom row: attach, mode, and a `28px` send button that is
  **disabled, not hidden**, when empty. Keyboard hint `⏎ send · ⇧⏎ newline` at 10px `--ink-4`,
  revealed on focus.
- **The send button is a state machine:** `⏎` idle → `■` stop while streaming → `✕` on error, all in
  the same 28px footprint so nothing shifts.
- **Queue vs steer.** When a message is submitted mid-generation, deliver it **at the next tool
  boundary, not mid-action**. Offer `Enter` = queue and `⌘⏎` = send now.
- Empty state: composer vertically centered with the greeting above it; on first send it animates to
  the bottom over `260ms` quart-out.

**Inherit the industry shortcut vocabulary, don't invent one:**
`⌘K` command surface · `⌘J` "AI on this thing" · `⇧Tab` cycle mode · `⌘I` open the agent pane.

### 11.9 Streaming and motion

**[DOC]** Vercel's Streamdown is the most prescriptive published artifact on token reveal:

```css
@keyframes sd-fadeIn  { from{opacity:0} to{opacity:1} }
@keyframes sd-blurIn  { from{opacity:0; filter:blur(4px)} to{opacity:1; filter:blur(0)} }
@keyframes sd-slideUp { from{opacity:0; transform:translateY(4px)} to{opacity:1; transform:none} }
animation: var(--sd-animation, sd-fadeIn) var(--sd-duration, 150ms) var(--sd-easing, ease) both;
```
```
MAX_ANIMATION_BACKLOG_MS = 320   /* cap on scheduling ahead of wall-clock  */
MIN_STAGGER_STEP_MS      = 4     /* stagger floor under compression        */
sep = "word"                     /* word-level, not character-level        */
SKIP_TAGS = code, pre, svg, math, annotation      /* code NEVER animates   */
```
**Blur is 4px and translate is 4px — both small — and the reveal is 150ms per word, not per
character.** The scheduler *compresses* stagger under load rather than falling behind.

**Caret [MEASURED/DOC].** Claude's CDS defines a blink keyframe but does not bind it to prose —
**Claude ships no blinking caret in a streaming answer.** If you want one, an `8×16px` block caret
on a slow pulse is the AI Elements pattern. Under `prefers-reduced-motion`, render the full response
instantly.

**Scroll — anchor the user's turn near the top rather than chasing the bottom [DOC].** shadcn's
`MessageScroller` marks each *user* turn as a scroll anchor and positions it near the top of the
viewport with a small peek of the previous turn above it; that is why Claude and ChatGPT pin your
question to the top. Release the lock on wheel, touch, scroll keys or scrollbar drag —
a ~`60px` gap from the bottom is the published release threshold. Keep two concerns **separate**:
*"show the jump-to-latest button"* (whenever not at the bottom) and *"stick to the bottom"*
(only while the lock holds). A11y: viewport `role="region" aria-label="Messages"`, content
`role="log" aria-relevant="additions"` with `aria-busy` while streaming, and the hidden jump button
`inert tabIndex="-1"`. Perf: `content-visibility: auto` + `contain-intrinsic-size` on turn rows;
batch DOM writes in `requestAnimationFrame` and write into a live text node rather than rebuilding.

**Claude's motion tokens [MEASURED]** — adopt these directly:
```
--cds-dur-fast: 60ms   --cds-dur-snap: .12s   --cds-dur-base: .2s   --cds-dur-slow: .45s
--cds-ease-out:       cubic-bezier(0, 0, .2, 1)
--cds-ease-snap:      cubic-bezier(.32, .72, 0, 1)
--cds-ease-overshoot: cubic-bezier(.34, 1.3, .64, 1)
```
Note the whole budget lives between **60ms and 450ms**, and the default out-curve is a plain
decelerate — consistent with §13.

**Motion asymmetry is the hallmark of a considered system [RCRE]:** hover-revealed controls should
**enter slowly with a short delay and leave quickly with none** — roughly `120ms` in after a `100ms`
delay, `60ms` out with `0`. It prevents flicker when the pointer crosses a row without stopping.

**Every animation needs a `prefers-reduced-motion` counterpart. No exceptions.**

### 11.10 Layout-stability details that separate polished from cheap **[RCRE]**

1. `tabular-nums` on every streaming count.
2. Reserve the progress row's height so swapping it for an expandable row cannot shift text.
3. Give any animated-ellipsis label a fixed `min-width` so the dots cannot resize it.
4. Debounce auto-expansion of command output: start a short timer on execute and expand only if real
   output arrives; a fast command must never flash open and shut.
5. Never let a streaming answer reflow content above it.
6. Cap tool output, and state the cap in the UI rather than silently truncating.

## 12. Executive dashboard patterns

> **The measured data corrects the folklore.** Every value in §12.1–12.4 was read from live
> computed styles on Mercury's production demo dashboard (`demo.mercury.com/dashboard`) plus
> shipped CSS from Stripe HDS, Vercel Geist, Linear and Brex. Where it contradicts common dashboard
> advice — and it does, repeatedly — trust the measurement.

### 12.1 The hero number — it is **smaller** than you think

**Mercury's hero balance is 28px at weight 380.** That is *exactly the same size as the page `<h1>`*
("Welcome, Jane" = 28px/380). The hero-to-secondary ratio is **1.47×**, not the 2–3× that generic
dashboard advice prescribes. An oversized 48–72px number is the single clearest signature of an
AI-generated dashboard.

Hierarchy is carried by **typeface switch, tabular figures, tracking and color** — not by scale.

```css
/* Mercury's hero balance — measured, verbatim */
.metric-hero {
  font-family: "Arcadia Display";        /* a separate DISPLAY face; labels use Arcadia Text */
  font-size: 28px;
  font-weight: 380;                      /* LIGHT at display size, not bold */
  letter-spacing: -0.84px;               /* = -0.030em */
  line-height: 36px;                     /* 1.286 */
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  color: #1e1e2a;                        /* neutral. NOT green, NOT brand */
}
```

**The −0.03em convergence.** Mercury applies exactly `-0.030em` to *every* tabular currency figure
at *every* size (28px→−0.84px, 19px→−0.57px, 15px→−0.45px, 13px→−0.39px). Stripe's shipped CSS says
the same thing independently:
```css
.tabular-nums, .tabular-nums--tight { font-feature-settings:"tnum"; font-variant-numeric:tabular-nums }
.tabular-nums--tight { letter-spacing:-.03em }
```
Two independent products converging on the same value. **Use −0.03em on all tabular figures.**

**The superscript-cents mechanic** (the premium tell). Currency is split into spans; the cents are
raised and weighted *heavier* to optically compensate:

| Parent | Cents size | Ratio | Cents `wght` | `top` offset |
|---|---|---|---|---|
| 28px | 20.44px | 0.73× | 440 | −5.42px |
| 19px | 13.87px | 0.73× | 470 | −3.68px |
| 15px | 10.95px | 0.73× | 500 | −2.90px |

Rule: **cents = 0.73 × parent, raised ≈19% of parent, weight +60 to +120 over the integer weight**
(smaller text → heavier cents).

**Separators are de-emphasised.** Inside a single figure, commas and the decimal point render at
`#70707d` while the digits render at `#1e1e2a`. Two-tone numerals. Costs one span, reads as typeset.

**The label — two schools. Pick one, never blend.**

| | Mercury (the calm school) | Brex (the eyebrow school) |
|---|---|---|
| Size | **15px** | 10px |
| Weight | 400 | 500–600 |
| Case | **sentence case** | UPPERCASE |
| Tracking | normal | `0.1em` |
| Line-height | 24px | 14px |
| Color | `#363644` — *one* step down | gray-500 |

Mercury's near-body-size sentence-case label is the more current move and it is what a
brokerage-executive audience will read as calm and expensive. Brex's tracked micro-label is the
alternative and it pairs better with a Register-A editorial surface. **[RCRE]** Use Mercury's on the
dashboard; keep the 11px `+0.08em` uppercase label for *table headers and sidebar group labels
only*, where it is doing structural work rather than decorating a number.

**The delta — bare text, colored arrow.** Mercury's is the most restrained finding in the study:
```css
.metric-delta {
  font-size: 15px; font-weight: 400; letter-spacing: -0.45px;
  color: #363644;                        /* NEUTRAL — the number is not colored */
  background: transparent; padding: 0; border-radius: 0;
}
.metric-delta__arrow { width: 10px; height: 13px; }   /* the ONLY colored element */
/* up   → #188554  */
/* down → #d03275  ← MAGENTA, not red. Red is reserved for errors; money-out is magenta. */
/* parent: display:flex; gap:6px */
```
A filled green/red pill around a percentage is a crypto-dashboard cue. Do not ship one.

**[RCRE] recommendation.** Hero at **32px in the display serif at weight 400** (a small, defensible
step up from Mercury's 28px, justified because RCRE's serif is a lighter-color face than Arcadia
Display), `-0.03em`, `tabular-nums`, neutral ink. Label 15px sentence case one ink-step down. Delta
neutral text + colored arrow. Exactly one per screen.

### 12.2 Downranking metrics 2..n

Mercury's complete measured ramp — **five sizes total**, ratios `1.47× → 1.27× → 1.15×`:

| Role | Size | Weight | Face | Color |
|---|---|---|---|---|
| Hero number / page H1 | 28px | 380 | **Display** | `#1e1e2a` |
| Section header | 19px | 400 | Text | `#1e1e2a` |
| Secondary metric | 19px | 400 | Text | `#1e1e2a` / `#036e43` |
| Label, list value, delta | 15px | 400 | Text | `#363644` |
| Panel title | 15px | 400 | Text | **`#535461` (muted)** |
| Table header, chart axis | 13 / 12px | 400 / 360 | Text | `#70707d` |

Two things to steal outright:

1. **The whole dashboard runs on five sizes and very tight ratios.** No 2.5× jumps.
2. **Panel titles are *muted* (`#535461`) while their values are near-black (`#1e1e2a`).**
   Emphasis is inverted relative to the typical dashboard, where the label shouts and the number
   whispers. This is a one-line change with a disproportionate effect.

**Layout:** secondary metrics are a **vertical list inside a panel** — icon + name left, amount
right-aligned with `text-align: end` and `tabular-nums`. **Separators are spacing only**; there are
no vertical 1px rules between stats anywhere on Mercury's page. (Stripe's stat row does use rules —
both work; the rule-less version is quieter.)

**Secondary metrics do not get charts.** Mercury ships exactly one chart on the entire dashboard.

**Linear's parallel mechanism** is hierarchy as *color*, not size. Its entire `color.css` ships four
classes — `.primary .secondary .tertiary .quaternary` — mapping to
`#282a30 / #3c4149 / #6f6e77 / #62666d` (light). A four-step ink ramp does most of the work that
designers normally try to do with size.

### 12.3 Chart vs. number

Mercury's one chart, measured:
```
size:       470 × 221px            (~2.1:1)
line:       stroke #5266eb · stroke-width 1px · fill none · linecap butt
area fill:  linear-gradient  rgba(82,102,235,0.16) → rgba(82,102,235,0.02)
gridlines:  0                      ← zero <line> elements
y-axis:     none in the SVG        ← endpoints ($1.8M / −$486K) are HTML, top-right
x-axis:     5 date labels, 12px, #70707d, weight 360
colors:     1
```

Rules that fall out:
- **`stroke-width: 1px`.** Not 2, not 3.
- **Zero gridlines, zero y-axis.** Label the two endpoints in HTML instead.
- **Fill *and* line** — a gradient area from 16% to 2% alpha of the line color.
- **One color per chart.**

Decision rule as actually practised: a **number** for current state (balance, count); **one line
chart** for the single "how did we get here" question; **plain counts** for everything else. Mercury
renders `Outstanding 11 / Overdue 1 / Due soon –` as bare numerals with no sparkline. Its credit-card
module uses a thin horizontal **progress bar** rather than a chart.

**Mercury ships no sparklines at all.** If you use one anyway, Tufte's spec is word-sized, no axes,
no labels, no legend — `1px` stroke on screen, `120×28px`, one terminal dot.

Never: a pie chart, a gauge, a single-value donut, a stacked area with >3 bands, a radar chart.

### 12.4 Number formatting

Precision is **contextual** — that is the whole trick:

| Context | Rendering |
|---|---|
| Hero balance | `$5,216,471.18` — **full precision, cents shown** |
| Account list | `$12,505.87`, `$200,000.00`, `$0.00` — full precision |
| Chart axis | `$1.8M`, `−$486K` — **abbreviated** |
| Inline roll-up | `$10K`, `$12.3K`, `$6K` — abbreviated |
| Transaction table | `−$2,200.00`, `$419.00` — full precision |

**Rule: exact where the user might act on it or reconcile it; abbreviated where it is only a
magnitude cue (axes, roll-ups). Never abbreviate a balance.**

Other measured conventions, all worth copying verbatim:
- **`−` U+2212 MINUS SIGN, never a hyphen.** (`−$486K`, `−$2,200.00`)
- `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum"` on **every** numeric element.
- Amount columns `text-align: end`; text columns `text-align: start`.
- **Negative amounts in tables are *not* red.** Both signs render `#1e1e2a`; the minus sign does the
  work. Color is reserved for direction-of-money indicators, not for the figures themselves.
- Time range is a labelled **dropdown** (`Last 30 days`, 15px/400) adjacent to the deltas;
  comparison period is labelled (`Aug 2026`) with `‹ ›` steppers. Never a bare `+18.2%`.
- Empty vs. zero: **`–` means "nothing"; `$0.00` means "measured zero."** Do not conflate them.
- Linear additionally ships **slashed zero** for numerics:
  `font-variant-numeric: lining-nums tabular-nums slashed-zero` on top of its base
  `font-feature-settings: "cv01","ss03"`.

### 12.5 Dashboard composition — measured geometry

Mercury's actual layout at 1512px:
```
sidebar:        220px
content column: 968px (capped, centered)
section gap:    24px
panel padding:  20px 24px 2px      ← ASYMMETRIC, tight at the bottom

Row 1: grid-template-columns: 472px 472px   gap 24px    ← 1fr 1fr, NOT 4-up
       left  = hero balance + the one chart
       right = accounts LIST (not cards)
Row 2: grid-template-columns: 307px 307px 307px  gap 24px   ← 3-up modules
Row 3: full-bleed 968px, own section header, internal gap 14px
```

**The technique is rhythm change: 2-up → 3-up → full-bleed. Never the same column count twice in a
row.** That single move kills the "admin template" read more effectively than any amount of styling.

Note also:
- The right half of Row 1 is a **dense list**, deliberately paired against the chart. The asymmetry
  is *chart ↔ list*, not chart ↔ chart.
- Section headers ("Money movement") are **19px / 400 with no horizontal rule** — separation is 24px
  of space alone.

**[RCRE] target composition**
```
 ┌─ 24px ──────────────────────────────────────────────────────────┐
 │  Welcome back, Jeremy                    [ Last 30 days ▾ ]     │  ← 28px/400 display
 ├──────────────────────────── 24px gap ───────────────────────────┤
 │  GCI this month                    │  Needs attention           │  ← 1fr 1fr
 │  $412,880.00                       │  · 4 leads gone quiet      │
 │  ▲ 18.2% vs. July   [ 1px chart ]  │  · 2 contracts expiring    │
 ├─────────────────────────────────────────────────────────────────┤
 │  Recruiting     │  Listings        │  Transactions              │  ← 3-up
 ├─────────────────────────────────────────────────────────────────┤
 │  PIPELINE — full-bleed table, 36px rows, sticky header          │  ← full-bleed
 └─────────────────────────────────────────────────────────────────┘
```
Zero shadows. One chart. One hero number at 32px. ≤5% of text carrying color.

### 12.6 Zero / loading states

Mercury ships `react-loading-skeleton` with these exact values:
```css
--base-color:      #ebebeb;
--highlight-color: #f5f5f5;          /* only a ~4% delta — barely-there shimmer */
--animation-duration: 1.5s;
animation-timing-function: ease-in-out; animation-iteration-count: infinite;
border-radius: .25rem;               /* 4px */
background-image: linear-gradient(90deg, var(--base-color), var(--highlight-color), var(--base-color));
/* transform: translateX(-100%) → translateX(100%) */
```
The low contrast is the point — a high-contrast pulsing gray block reads as broken.

Skeletons must be **shaped like the final chart/table** so nothing jumps. Past a few seconds, swap
the shimmer for a progress message; a skeleton that shimmers too long reads as a hang. A zero-data
dashboard shows the **panel chrome with `–` in place of numbers** plus one clear primary action —
never a centered illustration. If a chart can be emptied by a filter, give it an explicit empty
state and a one-click reset.

## 13. Microinteractions worth building

Motion is the cheapest perceived-quality multiplier and the easiest thing to get embarrassingly
wrong. The governing rule: **premium motion is fast, decelerating, and almost unnoticed.**

### 13.1 Duration and easing budget

| Interaction | Duration | Easing |
|---|---|---|
| Hover / focus color change | `80–120ms` | `ease-out` (`cubic-bezier(.25,.46,.45,.94)`) |
| Button press | `60ms` down, `120ms` up | `ease-out` |
| Dropdown / popover open | `140ms` | `cubic-bezier(.165,.84,.44,1)` (quart-out) |
| Side panel slide | `220ms` | `cubic-bezier(.165,.84,.44,1)` |
| Modal | `180ms` scale `0.98→1` + fade | `cubic-bezier(.19,1,.22,1)` (expo-out) |
| Row expand / collapse | `200ms` height + `140ms` opacity, opacity trailing | quart-out |
| Toast in / out | `200ms` / `160ms` | quart-out |
| Photography reveal | `400–600ms` | `cubic-bezier(.19,1,.22,1)` |
| Page/route transition | **`0ms`** — do not animate route changes in a product | — |

Nothing exceeds `260ms` in Register B. Nothing uses `ease-in` (it feels sticky). Nothing uses
`linear` except spinners. Nothing bounces, springs, or overshoots — `cubic-bezier` with a `>1`
overshoot is a consumer-app cue.

### 13.2 The specific ten worth implementing

1. **`⌘K` command palette** — fade + `scale(0.98→1)` over 140ms, results filter with no animation.
   Highest perceived-quality-per-hour item in the entire product.
2. **Keyboard hint on hover.** Every actionable control shows its shortcut in a `16×16px` `4px`-radius
   key chip after a `500ms` hover delay. Linear's exact model: discoverable, single-letter, composable.
3. **`J`/`K` row navigation with the detail panel open**, panel content cross-fading over `120ms`
   while the panel itself never moves. This is the Superhuman feel.
4. **Optimistic writes.** Status changes, assignments and stage moves apply instantly at the UI layer
   with a `10s` undo toast. Never a spinner on a control the user just clicked.
5. **Hover-revealed row actions** — `opacity 0→1` over `100ms`, no layout shift (reserve the space).
6. **Focus ring, done properly:** `box-shadow: 0 0 0 1px var(--canvas-0), 0 0 0 3px var(--accent-40)`
   with `:focus-visible` only. Never `outline: none` with no replacement.
7. **Number roll on change.** When a metric updates live, animate the digits over `400ms` with
   `tnum` preventing width jitter. Used once per screen, on the hero number only.
8. **Sticky header shadow on scroll** — the table header gains `0 1px 0 rgba(0,0,0,.09)` only once
   `scrollTop > 0`. A permanent divider under a header that has nothing above it is noise.
9. **Image scale-in-frame on hover** — `scale(1.03)` over `600ms` expo-out inside
   `overflow:hidden`. Only in Register A, only on listing media.
10. **Copy-to-clipboard on click** for IDs, addresses and phone numbers, with the icon
    cross-fading to a check for `1.2s`. Small, but it is the kind of detail that reads as "someone
    used this."

### 13.3 Always
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; scroll-behavior: auto !important;
  }
}
```

---

## 14. Anti-patterns — the explicit "do not ship" list

### 14.1 The generic-SaaS tells
1. `border-radius: 12px` **and** `box-shadow: 0 4px 6px -1px rgb(0 0 0/.1)` on the same card.
   (Tailwind `rounded-xl shadow-md`. The most common signature of unconsidered UI.)
2. A row of **4 equal-width KPI cards** with an icon in a tinted circle in the corner.
3. **16px base font size** in a data-dense product.
4. `#6B7280` / `#9CA3AF` / `#E5E7EB` used verbatim — the untouched Tailwind gray ramp. It is
   noticeably blue and everyone recognises it.
5. **Indigo-to-purple gradients** (`#6366F1 → #A855F7`) anywhere.
6. A **purple/blue "✨ sparkle" icon** to indicate AI. Also: robot avatars, brain icons, orbs,
   "Powered by AI" badges, and the word "magic."
7. `Inter` alone at `400/600` with no second family.
8. **Emoji as UI iconography** in headings, empty states, or buttons.
9. Centered empty states with a large gray line-art illustration.
10. `box-shadow` on a table row, a table header, or a nav item.
11. Zebra-striped tables.
12. Progress rings and gauge charts for a single percentage.
13. Pie charts.
14. **Glassmorphism** — `backdrop-filter: blur()` with a white 60% overlay on a card.
15. Full-width colored alert banners for non-blocking information.
16. `text-transform: uppercase` with **no letter-spacing** (looks like a bug).
17. Every heading a different color.
18. Hover states that change size and cause reflow.
19. `cursor: pointer` on non-interactive elements; missing on interactive ones.
20. A "Dashboard" that is a grid of shortcuts to other pages.

### 14.1b The measured dashboard tells (each is the inverse of something in §12)
21. **A 48–72px hero number.** Mercury's is 28px — the same size as its `<h1>`. Oversizing is the
    AI-dashboard signature.
22. **A bold hero number** (600–700). Measured: **380**. Premium products go *lighter* at display size.
23. **`letter-spacing: normal` on large numerals.** Should be `-0.03em`.
24. **Proportional figures** — no `tabular-nums` → digits shift on every re-render.
25. **Filled green/red delta pills.** Bare neutral text + a 10×13px colored arrow.
26. **Bright `#22c55e` / `#ef4444`.** Real values are dark and desaturated: `#036e43`, `#00b261`,
    `#006f3a`, `#d8351e`.
27. **Red negative numbers in a table.** Both signs are the same ink; the `−` does the work.
28. **A hyphen instead of `−` U+2212.**
29. **Uniform ink inside a figure** — commas and decimal points should drop to `#70707d`.
30. **Every number abbreviated, or none.** Balance exact, axis abbreviated.
31. **Gridlines and a full y-axis on a summary chart.** Zero gridlines; label the endpoints in HTML.
32. **A sparkline in every tile.** Mercury ships zero.
33. **Section headers with a heavy `<hr>`.** Separation is 24px of space.
34. **The same column count on every row.** Vary it: 2-up → 3-up → full-bleed.
35. **A wall of every possible chart.** Lead with the "am I okay?" number, then money-in-motion,
    then detail.
36. **A high-contrast pulsing grey skeleton.** Mercury's is `#ebebeb → #f5f5f5` — a ~4% delta.

### 14.2 The AI-generated-website tells
37. A hero headline in a gradient text fill.
38. Three-column "Feature / Feature / Feature" section with matching outline icons at 48px.
39. A dark section with a faint dot-grid or noise background between two light sections.
40. Bento grids with mixed radii.
41. Floating 3D shapes, blurred color blobs, "aurora" backgrounds.
42. `animate-pulse` on decorative elements.
43. Testimonial cards with 5 gold stars and an avatar from a placeholder service.
44. Copy that names the technology instead of the outcome ("Leveraging AI to supercharge...").
45. Every section at exactly the same vertical padding.
46. Stock photography of handshakes, skylines, or laptops on desks.

### 14.2b The "AI aesthetic" tells — the newest and most dangerous category

Jim Nielsen's *The AI Aesthetic* (July 2026) named a set of visual signals that now read as
"made by AI" precisely **because** they were the good ideas of 2024–25 and got copied everywhere:

47. **Shimmering async-state text.** The very thing everyone ships. It is now a tell, not a
    delighter. Restraint is the fix: one shimmering element, never simultaneously with a spinner,
    never on something that completes in under 500ms.
48. **The sparkle ✨ as the universal AI signifier.**
49. **Tiny sidebar icons** that clash with native OS sizing.
50. **Beige / cream palettes with orange accents.**
51. **Serif type bundled with that palette.**
52. **Streaming text used as decoration** rather than because generation is genuinely incremental.
53. **Whack-a-mole toggles** that repaint the whole screen per interaction.

Plus the wider banned list: purple/indigo→cyan gradients (traceable to `bg-indigo-500` saturating
training data) · gradient text on metrics · glassmorphism · identical three-up rounded card grids
with little outline icons · bounce/elastic easing · cards nested inside cards · Inter + centred hero
+ one CTA · animated glows on every AI-touched element.

> **⚠ Direct risk for RCRE.** Tells 50 and 51 sit uncomfortably close to RCRE's measured brand —
> gold `#CFB077`, warm off-white `#E3DFDB` — and to §18's optional serif. RCRE's palette is saved by
> being **gold-on-near-black `#121212`, metallic and high-contrast**, rather than cream-on-cream with
> a soft orange. **Hold that distinction deliberately:** keep the dark ground, keep the gold as a
> thin high-contrast accent rather than a large tinted fill, and if a serif is introduced, do not
> also drift the canvas toward cream. Beige + orange + serif *together* is the tell; any one of them
> alone is not.

### 14.3 The real-estate-specific tells
54. Property cards with `12px` radius and a shadow. (Every premium brokerage ships `0`.)
55. Price displayed smaller than the address.
56. Listing photos cropped to inconsistent aspect ratios in the same grid.
57. A carousel that auto-advances.
58. A full-screen modal lead-capture form on load.
59. Agent headshots in circles on a public page, at inconsistent crops.
60. MLS attribution and disclaimer text styled as an afterthought — in a brokerage product,
    compliance text set carefully is itself a premium signal.
61. Map pins in the brand color at full saturation, all the same size.

---

## 15. Reference token file **[RCRE]**

Drop-in starting point. Values are the synthesis of §2–§7.

```css
:root {
  /* ── Type ─────────────────────────────────────────────────────── */
  --font-display:"Tiempos Headline","Instrument Serif",Georgia,serif;
  --font-ui:"Inter Variable",Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --font-mono:"Berkeley Mono",ui-monospace,"SF Mono",Menlo,monospace;
  --fw-regular:400; --fw-medium:510; --fw-semibold:590;

  --ed-display-1:400 64px/1.02 var(--font-display);
  --ed-display-2:400 48px/1.08 var(--font-display);
  --ed-display-3:400 34px/1.15 var(--font-display);
  --ed-display-4:400 24px/1.25 var(--font-display);
  --ed-lead:400 20px/1.55 var(--font-ui);
  --ed-body:400 17px/1.65 var(--font-ui);

  --ui-micro:510 10px/1.5 var(--font-ui);
  --ui-label:510 11px/1.4 var(--font-ui);   --ui-label-ls:.08em;
  --ui-xs:400 12px/1.4 var(--font-ui);
  --ui-sm:400 13px/1.5 var(--font-ui);      --ui-sm-ls:-.01em;
  --ui-base:400 14px/1.5 var(--font-ui);    --ui-base-ls:-.013em;
  --ui-md:400 15px/1.6 var(--font-ui);      --ui-md-ls:-.011em;
  --ui-title-1:590 17px/1.4 var(--font-ui); --ui-title-ls:-.012em;
  --ui-title-2:590 20px/1.33 var(--font-ui);
  --ui-title-3:590 24px/1.33 var(--font-ui);
  --ui-metric:400 32px/1.2 var(--font-display);   /* Mercury measures 28px @380 — do not oversize */
  --ui-metric-sm:400 19px/1.45 var(--font-ui);
  --num-ls:-.03em;                               /* Mercury + Stripe both converge here */

  /* ── Space (4px grid) ─────────────────────────────────────────── */
  --space-1:2px;  --space-2:4px;  --space-3:8px;  --space-4:12px;
  --space-5:16px; --space-6:24px; --space-7:32px; --space-8:48px;
  --space-9:64px; --space-10:96px; --space-11:128px; --space-12:160px;

  --section-y:96px; --section-y-md:72px; --section-y-sm:56px;
  --gutter:48px; --gutter-md:32px; --gutter-sm:20px;
  --content-max:1344px; --prose-max:624px;
  --row-h:36px; --row-h-compact:32px; --row-h-comfy:44px;
  --sidebar-w:240px; --panel-w:420px; --topbar-h:56px;

  /* ── Radius ───────────────────────────────────────────────────── */
  --r-none:0; --r-control:6px; --r-container:10px; --r-overlay:12px;
  --r-pill:9999px; --r-circle:50%;

  /* ── Line / edge (TINTED alpha, never solid grey) ─────────────── */
  --hairline:rgba(112,115,147,.10);
  --hairline-strong:rgba(112,115,147,.16);
  --hairline-max:rgba(112,115,147,.22);
  --ring:0 0 0 1px rgba(0,0,0,.08);

  /* ── Elevation (floating only) ────────────────────────────────── */
  --shadow-menu:0 0 0 1px rgba(0,0,0,.08),0 1px 1px rgba(0,0,0,.02),
                0 4px 8px -4px rgba(0,0,0,.04),0 16px 24px -8px rgba(0,0,0,.06);
  --shadow-modal:0 0 0 1px rgba(0,0,0,.08),0 8px 32px -12px rgba(0,0,0,.08),
                 0 32px 72px -12px rgba(0,0,0,.06);

  /* ── Ink & canvas ─────────────────────────────────────────────── */
  --ink-1:#1a1a1a; --ink-2:#4a4a4f; --ink-3:#737278; --ink-4:#a3a2a8;
  --canvas-0:#ffffff; --canvas-1:#fafaf9; --canvas-2:#f5f4f2; --canvas-3:#f0efec;

  /* ── Color, rationed ──────────────────────────────────────────── */
  --accent:#cfb077;                 /* RCRE gold — measured from the live site, see BRAND-IDENTITY */
  --accent-deep:#988642;            /* RCRE muted gold, for text-on-light where #cfb077 fails contrast */
  --accent-quiet:rgba(207,176,119,.12);
  --ink-brand:#121212;              /* RCRE near-black */
  --canvas-warm:#e3dfdb;            /* RCRE warm off-white band */
  --pos:#036e43; --pos-icon:#188554;   /* deep forest — money, not "success"     */
  --neg:#d03275;                       /* magenta — money out                    */
  --error:#d8351e; --warn:#f0bf00;     /* red is reserved for actual failures    */
  --sep:#70707d;                       /* commas & decimal points inside figures */

  /* ── Motion ───────────────────────────────────────────────────── */
  --ease-out:cubic-bezier(.25,.46,.45,.94);
  --ease-quart:cubic-bezier(.165,.84,.44,1);
  --ease-expo:cubic-bezier(.19,1,.22,1);
  --t-fast:100ms; --t-base:140ms; --t-panel:220ms; --t-image:520ms;
}

:root[data-theme="dark"], @media (prefers-color-scheme: dark) {
  --ink-1:#f7f8f8; --ink-2:#d0d6e0; --ink-3:#8a8f98; --ink-4:#62666d;
  --canvas-0:#08090a; --canvas-1:#0f1011; --canvas-2:#141516; --canvas-3:#191a1b;
  --hairline:rgba(255,255,255,.07); --hairline-strong:rgba(255,255,255,.11);
}

/* Numerals: apply everywhere a number can be compared */
table, .metric, .money, td, .tabular {
  font-variant-numeric: tabular-nums lining-nums slashed-zero;
  font-feature-settings: "tnum";
  letter-spacing: var(--num-ls);
}
.money__sep { color: var(--sep); }                       /* commas, decimal point */
.money__cents { font-size: .73em; position: relative; top: -.19em; font-weight: 470; }

/* Skeletons — barely-there, matching final geometry */
.skeleton {
  border-radius: 4px;
  background-image: linear-gradient(90deg,#ebebeb,#f5f5f5,#ebebeb);
  animation: skeleton 1.5s ease-in-out infinite;
}
@keyframes skeleton { from { transform: translateX(-100%);} to { transform: translateX(100%);} }
```

---

## 16. Pre-demo QA checklist

Run this against every screen before showing it.

- [ ] Count the border-radius values used on the screen. **More than three → fix it.**
- [ ] Count elements with a `box-shadow`. **More than one non-floating element → remove them.**
- [ ] Count colored elements. **More than three → remove them.**
- [ ] Is there exactly one hero number, and is it **≤32px at weight ≤400**? (Ratio to secondaries ≈1.5×, not 2.5×.)
- [ ] Are all numerals `tabular-nums` + `"tnum"` **and** `letter-spacing: -0.03em`?
- [ ] Is the hero number **≤32px**? Is its weight ≤400? (If it's 48px+ and bold, it's wrong.)
- [ ] Is the delta **neutral text with a colored arrow**, not a filled pill?
- [ ] Are negatives written with `−` U+2212, and left un-reddened in tables?
- [ ] Do any two adjacent rows use the same column count? (They shouldn't.)
- [ ] Is any border a solid `#e5e7eb`-class grey? (Should be a tinted 10% alpha.)
- [ ] Is there any 16px text in a data table? (Should be 13px.)
- [ ] Is every uppercase string letter-spaced ≥ `0.08em`?
- [ ] Is the serif used, and used in **only** 1–2 places on the screen?
- [ ] Are there four equal cards anywhere? (Convert to a stat rail.)
- [ ] Is section spacing asymmetric (more above a heading than below)?
- [ ] Does `⌘K` work? Does `Esc` close every overlay? Does `J`/`K` move through the list?
- [ ] Does every empty state name the next action **and** its keyboard shortcut?
- [ ] Do skeletons match the final geometry exactly?
- [ ] Do the photographs have `border-radius: 0`?
- [ ] Does any label say "AI-powered", "supercharge", "seamless", or contain a sparkle?
- [ ] Tab through the screen: is the focus ring visible on every stop?
- [ ] Toggle dark mode: does any hard-coded hex break?
- [ ] At 1280px, 1440px and 1920px: does the content max-width hold, or does the table stretch to
      an unreadable width?

---

## 17. Sources

Primary (measured directly, 2026-08-19):
`static.linear.app/web/_next/static/css/index.*.css` · `stripe.com` + Stripe HDS stylesheets ·
`vercel.com` Geist token stylesheets · **`demo.mercury.com/dashboard` — live computed styles on
production dashboard code, the source of every value in §12** · `mercury.com` stylesheets ·
Brex shipped CSS · `attio.com` · `raycast.com` ·
`compass.com` (computed styles + `--cx-*` tokens) · `sothebysrealty.com` (computed styles) ·
`elliman.com` (computed styles) · `theagencyre.com` (computed styles) ·
`perplexity.ai` (computed styles — composer and chip geometry in §11) ·
`christiesrealestate.com` (`--global-*` / `--c-*` tokens)

Primary, AI surfaces (§11): **`claude.ai` CDS — 2,087 CSS custom properties read live via
`getComputedStyle`/`cssRules`, the source of §11.1 in full** · `perplexity.ai` composer and chip
geometry, measured live. Vendor documentation: Vercel AI Elements and Streamdown (open source),
shadcn `MessageScroller`, Linear Agent Interaction / AIG, Claude Code permission modes, Anthropic's
auto-mode engineering post, Attio help documentation.

**§11 verification note.** A first research pass produced a large body of precise-looking figures
for Zed, VS Code, Perplexity, Windsurf, Attio, Superhuman, Notion and Cursor that the researcher
subsequently retracted as unverified. **Those figures were removed from this document, not
corrected.** §11 now contains only values I measured myself, values from vendor documentation, and
clearly-labelled **[RCRE]** recommendations. Anywhere §11 describes a mechanism without a number,
that gap is deliberate — measure it or choose it from §3–§7; do not fill it from memory.

Secondary:
DesignMD / `VoltAgent/awesome-design-md` DESIGN.md benchmarks (Linear, Stripe, Notion, Superhuman,
Raycast, Vercel, Claude) — *AI-generated analyses of marketing sites; used only for corroboration,
never as a sole source for a number* · SaaSUI pattern library (Attio tables, Linear empty states) ·
Jim Nielsen, *The AI Aesthetic* (July 2026) — the source of §14.2b ·
925studios Stripe and Linear design breakdowns · Pentagram / Fonts In Use on the Sotheby's identity
(Mercury + Benton Sans + Freight) · Luxury Presence and Agent Image commentary on luxury real estate
web conventions.

**Coverage caveats.** Mercury, Stripe, Vercel, Linear and Brex values are measured from shipped
code. Equivalent primary-source numbers were *not* obtained for Ramp, Plaid, Modern Treasury,
Retool or Attio's in-app tables — treat any claim about those as unverified. Mercury's dashboard was
measured at a single viewport (1512px); the layout proportions are real but breakpoint behaviour was
not verified. Sotheby's, Compass, Elliman and The Agency were measured at 1440×900.

Related in this repo:
[`RCRE-WEBSITE-AUDIT.md`](RCRE-WEBSITE-AUDIT.md) — the current rcregroup.com (Luxury Presence)
baseline these principles are meant to exceed ·
[`RCRE-BRAND-IDENTITY.md`](RCRE-BRAND-IDENTITY.md) — RCRE's measured live palette, typefaces and
spacing. **Read it alongside this document; §18 reconciles the two.** Where they differ, the brand
document governs identity and this one governs mechanics.

---

## 18. Applying this to RCRE's actual surfaces **[RCRE]**

Mapping the two registers onto the surfaces named in `CLAUDE.md`. This is a design mapping only —
it does not authorise building anything, and the discovery gate still governs.

| Surface | Register | The one thing that makes it read premium |
|---|---|---|
| Public site / listing presentation | **A** | Full-bleed listing photography at `0` radius, serif display at 400 weight, uppercase `+0.1em` nav with a `3px` accent underline, a serif search field with no box |
| **Recruiting / agent value proposition** | **A**, with a Register-B inset | A single deep brand band, one editorial serif claim, and one *screenshot of the actual product* shown large and uncropped. The product screenshot is the recruiting pitch — do not illustrate it |
| AI Academy | A for the front door, B for the course shell | Course list as a table with `36px` rows and a progress column, not a grid of thumbnail cards |
| **CRM intelligence layer (over Follow Up Boss)** | **B** | The table is the page. `36px` rows, sticky 11px uppercase header, `420px` side panel, `J`/`K` navigation, `⌘K`. Priority as a `6px` dot column |
| **Hermes / AI assistant** | **B** | No bubbles, no sparkle, no avatar. Collapsing tool-activity rows, inline approval blocks showing the exact payload, citations back to FUB records with hover previews |
| Transaction workflow | **B** | Stages as a horizontal rail with a `2px` progress rule, not as a row of coloured cards |
| Management dashboard | **B** | One hero number (GCI or recruiting pipeline) at `32px`/400 in the serif with `tnum` at `-0.03em`, then 2-up → 3-up → full-bleed table. Zero cards, zero shadows, one chart |
| Agent marketing asset output (PDF/social) | **A** | Inherits the editorial scale exactly, so exported collateral and the website are visibly the same system |

### Reconciling this document with RCRE's measured brand

A parallel audit — [`RCRE-BRAND-IDENTITY.md`](RCRE-BRAND-IDENTITY.md) — measured the live
rcregroup.com identity. **Where the two documents differ, the brand document wins on identity and
this document wins on mechanics.** The overlap is unusually good:

| RCRE ships (measured) | This document prescribes | Verdict |
|---|---|---|
| `--global-section-padding: 96px`, 64px narrow | §4: 96px desktop / 56px mobile | **Already aligned.** Keep 96/64 |
| `border-radius: 0` on buttons; "the design language is square-cornered" | §6.1 Register A: `0` | **Already aligned**, and it validates the whole editorial register |
| Eyebrows at `letter-spacing: 0.2em` / `3px` / `5px`, uppercase | §3.2: `+0.1em` uppercase | RCRE tracks *harder* than the luxury benchmark. Keep RCRE's — it is their signature |
| Buttons uppercase, `0.15–0.2em`, `padding: 15px 30px` / `20px 46px` | §9 | Keep RCRE's |
| `transition: all .5s cubic-bezier(.23,1,.32,1)` | §13: expo-out, `520ms` for imagery | **Same curve, same duration.** Keep for Register A; §13's shorter budget governs Register B |
| Gold `#CFB077` · near-black `#121212` · warm off-white `#E3DFDB` | §7.2 one accent + neutral ramp | **Adopt directly.** Gold is the single accent; §7.1's ≤5% budget applies to it |
| H1 70px → 40px narrow, weight 400, uppercase | §3.2 `ed-display-1` 64→36px | Close enough. Keep 70/40 |

**The one real conflict — the serif.** §2.3 shows that every premium product measured pairs a
grotesque with an editorial serif, and §3.1 prescribes one. **RCRE has no serif.** Its identity is
`Syne` (display, all headings h1–h5 uppercase) + `Nunito Sans` (body), both from Google Fonts. The
brand audit further warns that the `class="serif"` appearing on several headings *does not change
the font* — it only sets `flex-order` — so it is not latent evidence of a serif in the system.

Three options, in order of preference:

1. **[Recommended] No new serif. Let `Syne` be the display voice** and use `Nunito Sans` for
   everything in Register B, dropped to 13–15px per §3.3. Syne at 400 uppercase already does the job
   an editorial serif would do, and it is *recognisably RCRE*. Take everything else in this
   document — the density, the tinted hairlines, the `-0.03em` figures, the no-shadow rule, the
   rhythm change — and skip §2.3.
2. **Serif for numerals only.** Introduce one serif (Instrument Serif or Newsreader, both free)
   used *nowhere except the dashboard hero number and large listing prices*, exactly as Sotheby's
   uses `MercuryDisplay-Roman` for its "1,100" stat. Lowest-risk way to get the §2.3 effect without
   touching the brand.
3. **Full serif display pairing.** A genuine identity change. Do not do this inside a demo — raise
   it as a branding question with Jeremy first.

**A caution about Syne in Register B.** Syne is a *display* face with idiosyncratic letterforms; it
is not designed for 13px table rows. Use it for headings and page titles only. The product's working
text should be `Nunito Sans` — or, if a dense-UI face is permitted, an Inter-class grotesque with
`tabular-nums`, keeping Syne for every heading so the product still reads as RCRE.

### Two RCRE-specific opportunities

1. **Compliance text as a premium signal.** RCRE aggregates four-ish MLS feeds, each with its own
   attribution and display rules (see `RCRE-WEBSITE-AUDIT.md` §2). Most brokerage sites treat that
   text as legal debris. Setting MLS attribution, fair-housing and disclosure text *carefully* — 11px,
   `--ink-3`, `+0.02em`, on its own hairline-separated band — is a cheap, distinctive, and
   genuinely brand-appropriate detail for a brokerage product.

2. **The approval surface is the differentiator.** RCRE's governance posture (no production FUB
   writes, no outbound sends without approval) forces a human-in-the-loop UX that most AI CRM demos
   don't have. Designed well — §11.4's inline payload block with `Approve` / `Discard` / 10-second
   `Undo` — it stops reading as a restriction and starts reading as the product's core claim:
   *the AI does the work, the agent stays in command.* Lead with it in the demo.

### Sequence for the demo build

1. Ship the token file (§15) and the two registers before any screen.
2. Build the CRM table screen first — it is the hardest and it sets density for everything else.
3. Add `⌘K`, the `420px` side panel, and `J`/`K`. Stop. Look at it. It should already feel premium.
4. Add the dashboard as one hero number + stat rail + the same table component.
5. Add the AI panel last, reusing the side panel geometry exactly.
6. Only then build the Register-A recruiting page, and put the real screenshots in it.
