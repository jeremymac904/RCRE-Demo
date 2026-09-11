# RCRE Group — Authentic Brand Identity (from the live public website)

**Researched:** 2026-08-19
**Source of truth:** `https://rcregroup.com/` — live production HTML + compiled inline CSS, fetched
via `curl` on 2026-08-19.
**Purpose:** ground the internal demo UI in RCRE's real brand rather than an impression of it.

**Method note.** Every hex value, font name, URL, and quotation below was extracted from the
site's served HTML/CSS. Where a fact could not be determined from the live site, this document says
so explicitly instead of guessing. A small number of images were fetched *temporarily* to describe
photography and logo artwork accurately; **no brand assets were retained** in this repository.

**Platform.** The site runs on **Luxury Presence** (`styles.luxurypresence.com/producer/index.css`,
`media-production.lp-cdn.com`, footer credit "Real Estate Website Design by Luxury Presence"). The
brand colors are applied as per-site theme overrides in a large inline `<style>` payload
(~231 KB across 8 style blocks), **not** in an external brand stylesheet. Listing photos come from
an MLS pipeline on `dlajgvw9htjpb.cloudfront.net`.

---

## 1. Exact brand colors

Extracted from the compiled inline CSS on `https://rcregroup.com/`. Counts are literal occurrences
in that CSS. This is the actual palette, not an interpretation.

### Core palette

| Role | Hex | Evidence / where it is used |
|---|---|---|
| **Brand accent (gold/champagne)** | `#CFB077` | 37 occurrences. The single distinguishing brand color. Nav link hover, nav underline, footer link hover, footer contact SVG `fill`, footer hairline rules, all section eyebrow/kicker labels, button hover text, pagination active/hover text, stat values, carousel arrow hover. Written in CSS as both `#cfb077` and `#CFB077`. |
| **Primary ink / near-black** | `#121212` | 65 occurrences. `--fontColor:#121212` on light sections. Button border + text, button hover fill, dropdown hover fill, eyebrow text on white sections. |
| **Page background / white** | `#FFFFFF` | `--global-background-color:#fff`; `--bgColor:#FFFFFF`. Body background, scrolled nav background, sub-nav items, card interiors. Also written `#fff` (79x) and `#ffffff` (39x). |
| **True black** | `#000000` | 44x as `#000`, 5x as `#000000`. Scrolled-nav link color, sub-nav link color, listing status chip background (`background:#000;color:#fff`), the dark "Areas of Expertise" tile (`background-color: rgba(0, 0, 0, 1)`). |

### Secondary / supporting

| Role | Hex | Evidence |
|---|---|---|
| Deep gold (scrolled-nav hover, later override) | `#988642` | `nav#global-navbar.scroll ... a.navigation__link:hover{color:#988642}` and the underline `:after`. Overrides the earlier `#cfb077` rule for the scrolled nav. |
| Warm taupe (stat-block eyebrow) | `#948671` | `.pre-title{... color:#948671!important}` in the "What Sets Us Apart" stats section. |
| Warm stone / sand (section background) | `#E3DFDB` | `--bgColor:#E3DFDB` on the "Building Dreams One Home at a Time" section (`--bgColor_H:30; --bgColor_S:12%; --bgColor_L:87%`), and `featured-team__info` card background in the agent carousel. Also `--infoBgColor: rgba(227, 223, 219, 0.9)` / `--infoBgHover: rgba(227, 223, 219, 1)` on map info cards. |
| Neutral grey text | `#848484` | `--textNeutralColor:#848484`; `.text-neutral` on the home-valuation module. |
| Near-black variant | `#171819` | Outline button on the "Neighborhood Guides" tile grid: `color:#171819; border:2px solid #171819`; hover fills `#171819` with `#fff`. |
| Dark ink variant | `#1A1A1A` / `rgba(26,26,26,1)` | `--textColor: rgba(26, 26, 26, 1)` on the mobile contact pill; footer contact icon `fill="#1A1A1A"`. |
| Muted highlight | `rgba(153,153,153,1)` (`#999999`) | `--highlightColor`. |
| Hairlines / dividers | `#DCDCDC`, `#E7E7E7`, `#CCCCCC` | Stat card bottom border `#dcdcdc`; valuation modal dividers `#e7e7e7`; footer underline base `#ccc`. |
| Light surface / scrollbar track | `#F3F3F3` (thumb `#C4C4C4`) | `scrollbar-color:#C4C4C4 #f3f3f3` on `body`; valuation results dividers. |
| Input focus border | `#5E5E5E` | `.lp-input:focus{border-color:#5e5e5e}` |
| Media overlay | `rgba(0,0,0,0.4)` | `--section-overlay: rgba(0, 0, 0, 0.4)` over the hero video. `rgba(0,0,0,0.5)` used on some gradient overlays. |

### Two other gold-family values present (low usage — likely inherited platform defaults)

`#CCB091` (1x) and a `#C0C0C0` / `#C6C6C6` grey pair (2x each). These are not load-bearing; do not
build the demo palette around them.

### Practical token set for the demo

```
--rcre-gold:        #CFB077   /* brand accent — eyebrows, hovers, active states, rules */
--rcre-gold-deep:   #988642   /* darker gold for hover on white backgrounds */
--rcre-taupe:       #948671   /* warm eyebrow variant */
--rcre-ink:         #121212   /* primary text + button borders */
--rcre-black:       #000000   /* status chips, dark tiles */
--rcre-white:       #FFFFFF   /* page background */
--rcre-stone:       #E3DFDB   /* warm section background */
--rcre-grey:        #848484   /* secondary / neutral text */
--rcre-hairline:    #DCDCDC   /* dividers */
--rcre-overlay:     rgba(0,0,0,0.4)  /* image/video scrim */
```

**Character of the palette:** essentially monochrome (white / near-black) with **one** warm
champagne-gold accent used sparingly — almost exclusively on eyebrow labels, hovers, and hairlines,
never as a large fill. There is no blue, green, or red anywhere in the brand layer.

---

## 2. Typography

Two families, both from Google Fonts. Declared in `<head>`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Syne:400,500,600,700,800">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Nunito%20Sans:200,300,400,500,600,700,800,900,200i,300i,400i,500i,600i,700i,800i,900i">
```

Verified against the served Google Fonts CSS (Syne v24; Nunito Sans with the full italic set).
There are **no self-hosted `@font-face` declarations** for brand fonts on the page.

### Root variables (`:root` in the inline CSS)

```css
--global-primary-font-family:   Syne, sans-serif;
--global-primary-font-family-short: Syne;
--global-secondary-font-family: 'Nunito Sans', sans-serif;
--global-secondary-font-family-short: Nunito Sans;
--global-background-color: #fff;
--global-body-font-size: 16px;
--global-h1-font-size: 70px;
--global-h2-font-size: 43px;
--global-h3-font-size: 30px;
--global-h4-font-size: 21px;
--global-h5-font-size: 17px;
--global-h6-font-size: 16px;
--global-section-padding: 96px;   /* 64px at narrow widths */
--global-body-padding: 0px;
```

### Applied rules

| Element | Rule (verbatim from the CSS) |
|---|---|
| Body | `body{padding:0px;background-color:#fff;font-family:'Nunito Sans',sans-serif;font-size:16px;}` |
| All headings + buttons | `h1,h2,h3,h4,h5,h6,button{font-family:Syne,sans-serif;}` |
| **Heading case** | `.lp-h1,h2,.lp-h2,h3,.lp-h3,h4,.lp-h4,h5,.lp-h5{text-transform:uppercase!important;}` — **every heading level h1–h5 is uppercase.** |
| H1 | `.lp-h1{font-family:var(--global-primary-font-family);font-weight:400;letter-spacing:0;white-space:pre-line;}` · `h1{font-size:70px}` desktop · `.lp-h1{font-size:40px}` at narrow widths |
| H2 | `.lp-h2{font-size:40px!important}` and `30px!important` in some sections; base `43px` |
| H5 override | `.lp-h5{text-transform:none;font-weight:400;font-family:var(--global-primary-font-family);font-size:24px;}` — the agent-name H5 keeps mixed case |
| **Eyebrow / kicker** (`.pre-title`) | `font-family:var(--global-secondary-font-family); font-size:12px; font-weight:700; letter-spacing:0.2em; line-height:1.8; text-transform:uppercase;` — overridden in the hero/stat sections to `font-size:18px; letter-spacing:3px; color:#948671` |
| **Section eyebrows via `::before`** | `font-size:16px; letter-spacing:5px; margin-bottom:10px;` (13px on mobile) — the signature RCRE detail |
| Buttons (`.btn`) | `color:#FFF; text-transform:uppercase; letter-spacing:0.15em; padding:15px 30px; font-size:10px; line-height:1.6; border-radius:0; transition:all 0.5s cubic-bezier(0.23,1,0.32,1);` |
| Hero buttons (`.btn-wrapper .btn`) | `font-family:var(--global-secondary-font-family); border:2px solid white; font-size:13px; padding:1.2em 3.5em; font-weight:700; text-transform:uppercase; letter-spacing:.2em; line-height:1.8;` |
| `.lp-btn` | `padding:20px 46px!important; background-color:transparent; border-color:#121212; color:#121212;` — hover: `background-color:#121212; color:#cfb077;` |

**Note on `class="serif"`:** several headings carry `class="serif"` (Blog, "Get In Touch With The
Team", footer "Contact Us"/"RCRE Group", agent-name H5s), but `.serif` in the compiled CSS only sets
flex `order:1` — **it does not change the font**. Those headings still render in Syne. Do not add a
serif face to the demo on the strength of that class name.

**Border radius:** `border-radius:0` on buttons. The design language is square-cornered.

---

## 3. Logo

Two variants, both PNG, both served from the Luxury Presence media CDN. The nav swaps them on
scroll.

| Variant | Canonical URL | Notes |
|---|---|---|
| **Light (white) — used over the hero video / transparent nav** | `https://media-production.lp-cdn.com/media/93b25fea-75d5-4bc0-8f1a-f9264c43d18b` | `class="logo__img light"`, first `<img>` in `.logo__link`. `image/png`, 112,339 bytes, `Last-Modified: Mon, 13 Oct 2025 19:13:26 GMT`. Renders as white artwork on transparency. |
| **Dark (black) — used on the scrolled white nav and in the footer** | `https://media-production.lp-cdn.com/media/7807bff8-e17d-427a-a94c-4d5f2b0fa264` | `class="logo__img dark"`, second `<img>`. `image/png`, 112,339 bytes, `Last-Modified: Mon, 13 Oct 2025 23:52:59 GMT`. Also referenced with `alt="Footer Image"` in the footer. |

The site requests them through Cloudflare Image Resizing, e.g.
`https://media-production.lp-cdn.com/cdn-cgi/image/format=auto,quality=85,fit=scale-down,width=1280/https://media-production.lp-cdn.com/media/93b25fea-75d5-4bc0-8f1a-f9264c43d18b`
with a `srcset` at 320 / 960 / 1280 / 1920 w.

**Swap logic (verbatim):**

```css
nav#global-navbar.scroll .header a.logo__link img:first-child{display:none!important;}
nav#global-navbar.scroll .header a.logo__link img:last-child{display:block!important;}
```

**Sizing:** `nav#global-navbar .header .logo{max-height:70px}` desktop;
`nav .header .logo img{max-height:60px!important}` at ≤768px. Artwork aspect ratio is **3:1**
(600×200 at the 600w derivative).

**Artwork description (from a temporary render, not retained):** a line-drawn house roofline/gable
outline sitting above a stylized interlocking **R / C** monogram at left; to the right, the wordmark
**RIVER CITY** in wide-tracked classical roman serif capitals, then **REAL ESTATE GROUP LLC** in
letterspaced sans capitals set between two thin rules, then **R C R E G R O U P** in very widely
letterspaced serif capitals as a baseline. Single-color artwork — pure black in the dark variant,
pure white in the light variant. No gold appears in the logo itself.

**Additional marks on the site**
- Realtor® / Equal Housing Opportunity lockup (footer):
  `https://res.cloudinary.com/luxuryp/images/f_auto,q_auto/tguwivacqib9bgbmkkgy/realtor-eho-logo-07232021-update-light`
  (rendered at `width:100px`).
- An inline SVG wordmark appears in the "Building Dreams" section header, plus a small raster mark at
  `https://media-production.lp-cdn.com/media/58512070-02ab-48f5-987e-3419dd18add7` (rendered 170×59).

**"Our Certifications" badges** (homepage carousel, `sizes="125px"`, greyscale-free, on white):
- `.../media/e88690ac-c344-4913-a23c-fe5454212b1e` — **AHWD** (At Home With Diversity)
- `.../media/fb4b5e45-3bea-4939-b991-148cc23b0afd` — **MRP** (Military Relocation Professional)
- `.../media/b322e7ee-001d-4714-9626-ccbbd87263d9` — **RENE** (Real Estate Negotiation Expert)

---

## 4. Photography style

### Hero — motion, not a still

The homepage hero is a **full-screen autoplay looping muted video**, not a photograph:

- `https://res.cloudinary.com/luxuryp/videos/f_mp4,vc_h264,w_1920,c_limit/kcmv1bzsruxv0c39fgx6/hov-gulf-shores-alabama-skyline-and-beach-with-drone-video-moving-close-up.mp4`
  (plus WebM/VP9 and H.265 sources)
- Poster: `.../so_0,eo_0/kcmv1bzsruxv0c39fgx6/hov-gulf-shores-alabama-skyline-and-beach-with-drone-video-moving-close-up.jpg`
- Fallback poster image: `https://media-production.lp-cdn.com/media/575b149f-94fc-46fc-85cd-a563fb343afd`
- Scrim: `--section-overlay: rgba(0, 0, 0, 0.4)`

Subject: aerial drone footage of the **Gulf Shores, Alabama** skyline and beach, moving close-up.
Section class is `is-font-color-light is-background-color-light`; all hero type is white over the
40% black scrim.

### Agent headshots — **not** a unified system

This is the most important honest finding for the demo. The headshots are **inconsistent**: they
were clearly sourced individually rather than shot in one session. Verified by rendering four:

- **Taquilla Allen** — 640×640 studio portrait. Mottled charcoal/grey studio backdrop, chest-up
  framing, arms crossed, grey blazer over a pale shirt, direct eye contact, broad smile, even
  studio lighting. The most formal and highest-resolution of the set.
- **Julio Arango** — 331×331. Outdoor/environmental, shallow depth of field, blurred warm
  architectural background, navy blazer over open white shirt, chest-up, seated lean, smiling.
- **Vito Lombardo** — 240×240. Studio grey swirl/vignette backdrop, black polo (no jacket), arms
  crossed, chest-up.
- **Molly Plude** — 240×240. Soft indoor/natural setting with light florals behind, head-and-
  shoulders, casual, warmly lit.

**Common denominators to replicate in the demo:** square **1:1** crop (`class="portrait"`), subject
centered, chest-up or head-and-shoulders, direct camera gaze, smiling, neutral/blurred background.
**Variation to expect:** resolution ranges 240px → 640px; backgrounds swing between grey studio and
warm environmental; formality swings between full business suit and polo. The CSS applies **no**
grayscale, duotone, or filter — the images render as-is.

Alt text follows two patterns, applied inconsistently:
`"{Name} {City}, {ST} Real Estate Agent Headshot"` (e.g. `"Molly Plude Jacksonville, FL Real Estate
Agent Headshot"`) or bare `"{Name}"`. One is stale: Johann Velez's headshot carries
`alt="Johann Suarez Jacksonville, FL Real Estate Agent Headshot"`.

Hover behavior on the team grid: image dims and a `LEARN MORE` outline button fades in over it.

### Property photography — MLS-sourced

Listing photos are standard MLS media, **not** brand-commissioned. Served from
`https://dlajgvw9htjpb.cloudfront.net/cms/f323ee62-121e-4828-9d99-6a87d5a410d2/{mlsId}/{signedInt}.jpg`
(the account UUID `f323ee62-…` is constant; `{mlsId}` matches the listing). Typical size 2500×1666
(3:2 landscape), full color, MLS copyright burned into the lower-left of the frame
(e.g. `©2026 NEFMLS, Inc`). Content is conventional wide-angle interior/exterior real estate
photography — bright, high key, wide lens, staged.

Presentation rules from the CSS:
`.featured-properties__img{height:315px; background-color:gray}` (200px ≤768px),
`img{width:100%;height:100%;object-fit:cover}`. Status chip: `position:absolute; top:0; right:0;
background:#000; color:#fff; padding:4px 35px`.

**Lifestyle / section imagery** is generic warm-neutral interior and coastal/architectural
photography from the LP media CDN (e.g. `.../media/483a1a02-df78-4306-8d12-faf47473e9dd`,
`.../media/85d29b36-c24b-4021-b31a-100165358ea2` "Explore Alabama Neighborhoods",
`.../media/b1061ea5-0959-4a98-8ba6-4277d6cde8a1` "Explore Florida Neighborhoods"). All neighborhood
county cards use LP CDN images, listed in §10.

---

## 5. Voice and copy (verbatim)

All quotations below are copied exactly from the live pages.

### Homepage — `https://rcregroup.com/`

- Page title: **"RCRE Group | Premier Birmingham, AL Real Estate Agents"**
- Meta description: *"Looking for premier real estate agents in Birmingham, AL? Look no further than RCRE Group! Our dedicated team is here to help you find your dream home."*
- Hero eyebrow (`h5.pre-title`): **"DISCOVER THE PERFECT PROPERTY WITH EXPERT GUIDANCE"**
- Hero H1: **"RCRE Group"**
- Hero subtitle: **"Servicing All Price Ranges in Alabama and Florida"**
- Hero CTAs: **"Explore Alabama Homes"** · **"Explore Florida Homes"**
- Section H2: **"Building Dreams One Home at a Time"**
  > "At River City Real Estate Group, we are dedicated to providing unparalleled service and expertise to our clients in Alabama & Florida area."
- Three-up tiles: **"Buy Properties"** · **"List Your Home"** · **"Get Cash Offer"**
- Agents section — eyebrow **"Trusted Agents"** (CSS `::before`, `#CFB077`), H2 **"MEET OUR AGENTS"**
  > "At River City Real Estate Group, we pride ourselves on having a dedicated team of real estate professionals ready to assist you. Each member brings a unique set of skills and expertise to help you navigate the market, whether you're looking to rent or buy. Meet our committed team that is passionate about finding the perfect home for you."
- **"Our Certifications"**
- **"Our Promise to you"**
  > "At River City Real Estate Group, we're dedicated to providing exceptional real estate services, whether you're looking to rent, buy, or sell a property. Now proudly operating in Florida, Georgia and Alabama, our experienced team is committed to helping you navigate the real estate market with ease and confidence. We are eager to assist clients in finding their dream homes and making seamless transactions. Reach out today to see how we can help you achieve your real estate goals!"
- **"What Sets Us Apart"**
  > "We believe in building lasting relationships with our clients, driven by transparency and integrity. When you choose River City Real Estate Group, you're not just another transaction; you become part of our family. Every client has unique needs and preferences, and we take pride in offering personalized services tailored to each individual. Together, let's build a future filled with possibilities and success. Let us help you find your next home or investment opportunity today!"
- Stats: **84** "Properties Sold This Year" · **22** "Average Days on Market"
- Testimonials — eyebrow **"Success Stories"**, H2 **"Testimonials"**
- Listings — eyebrow **"Presenting a collection of fine homes"** (`#CFB077`), H2 **"Featured Properties"**
- Tile grid — eyebrow **"Neighborhood Guides"**, H4 **"Areas of Expertise"**, then
  **"Explore Alabama Neighborhoods"** / **"Explore Florida Neighborhoods"**
- Valuation — eyebrow **"Know Your Home's Worth"**, H2 **"How Much is Your Home Worth?"**;
  supporting: "Instant property valuation" · "Expert advice" · "Sell for more" ·
  CTA **"Get a Free Home Valuation"**; modal H3 **"Get your instant home valuation"**,
  *"Enter your details to see how much your home is worth."*, CTA **"Unlock Your Free Valuation"**;
  fallback H3 **"Get a full valuation from a local expert"** —
  *"Schedule a free consultation with River City Real Estate Group who can help you estimate and understand your home's value."*
- Newsletter — eyebrow **"Newsletter"**, H2 **"EXPLORE HOMES FIRST – SUBSCRIBE FOR UPDATES!"**
  > "Stay up-to-date with exclusive news and market updates in Alabama & Florida."
- Closing CTA H2: **"Get In Touch With The Team"**
  > "Together, let's build a future filled with possibilities and success. Let us help you find your next home or investment opportunity today!"
- Instagram block: **"Follow Me on Instagram"** / **"Follow Me"**
- Contact modal H3: **"Leave a Message"**; success: *"Thank you for your message. We will be in touch with you shortly."*
- Qualifying modal H2: *"Thanks, please provide more information to help serve you"*
- Footer legal: *"All information is deemed reliable but not guaranteed and should be independently reviewed and verified."* · *"Real Estate Website Design by Luxury Presence"* · "Copyright © 2026 | Privacy Policy"
- TCPA consent (used on every form):
  > "I agree to be contacted by RCRE Group via call, email, and text for real estate services. To opt out, you can reply 'stop' at any time or reply 'help' for assistance. You can also click the unsubscribe link in the emails. Message and data rates may apply. Message frequency may vary."

### Team page — `https://rcregroup.com/team`

- Title: **"About RCRE Group | Premier Birmingham, AL Real Estate Agents"**
- Meta: *"Discover why RCRE Group is the premier choice for your real estate needs in Birmingham, AL. Our top-rated agents are here to help you find your dream home!"*
- H1: **"Meet Our Agents"** · H2s: **"ALABAMA AGENTS"**, **"FLORIDA AGENTS"**, "Testimonials",
  "Past Transactions", "Know Your Home's Worth", "Get In Touch With The Team"
- Card hover CTA: **"LEARN MORE"**; homepage carousel CTA: **"READ BIO"**

### Agent page pattern — e.g. `https://rcregroup.com/agent/julio-arango`

- H1: **"About {Full Name}"** (dark hero band, light type)
- H2: **"{Full Name}"** then the contact list, then H2 **"Get to Know Me"**
- Contact labels used verbatim: "Primary phone" · "Secondary phone" · "Website" ·
  "License Number" · "Email" · "Address"

### Property page pattern — e.g. `https://rcregroup.com/properties/4594-farmhouse-gate-trail-jacksonville-fl-us-32226-2137644`

- H1 is the street address; subline is the full address; price sits in an `h5`
- Labels: "SEE ALL PHOTOS" · "Courtesy of {LISTING BROKERAGE}" · "Photos / Map / Street View / Share"
- Sections: **"Features & Amenities"** → "Interior", "Area & Lot", "Exterior", "Financial";
  then **"Schedule a Showing"**, **"Mortgage Calculator"**
- Showing copy: *"We would love to show you our beautiful property. Please select your preferred date and time below. An agent will be in touch shortly to confirm your appointment."*
- Calculator copy: *"Estimate your monthly mortgage payment, including the principal and interest, property taxes, and HOA. Adjust the values to generate a more accurate rate."* / *"All estimates are provided for informational purposes only. Actual amounts may vary."*

### Tone

Warm, plainspoken, relationship-first, family-framed ("you become part of our family"), and
service-oriented — noticeably *not* luxury-exclusive despite the Luxury Presence chassis and the
"collection of fine homes" eyebrow. Two motifs repeat verbatim across pages: **"Together, let's
build a future filled with possibilities and success"** and the transparency/integrity pairing.
The company is called **"RCRE Group"** in headings, titles, footer, and legal consent text, but
**"River City Real Estate Group"** in every piece of narrative body copy — that alternation is
deliberate and should be preserved in the demo. Headings are set in uppercase Syne; body in Nunito
Sans sentence case. Sentence-case section titles with a `#CFB077` letterspaced eyebrow above them
are the single most recognizable typographic signature.

---

## 6. Leadership

### Julio Arango — `https://rcregroup.com/agent/julio-arango`

| Field | Value (verbatim) |
|---|---|
| Title / role | **QUALIFYING BROKER** (from the team + homepage agent cards; the agent detail page does **not** display a title) |
| Page H1 | "About Julio Arango" |
| Primary phone | (904) 575-0970 |
| Secondary phone | 904-977-5749 |
| Website | http://rcregroup.com |
| License Number | **#000169761, 442573, 3454903** (three licenses, displayed as one string; on listing pages as `DRE # 000169761, 442573, 3454903`) |
| Email | Julio@RCREgroup.com *(Cloudflare-obfuscated in the HTML; decoded from `data-cfemail`)* |
| Address | 1st Chase Corporate Dr Ste 400, Hoover, AL 35244 |
| Headshot | `https://media-production.lp-cdn.com/media/a32db16a-1875-4369-bc36-71b50764b4e9` — `alt="Julio Arango Hoover, AL Real Estate Agent Headshot"` |
| Socials | Facebook `https://www.facebook.com/p/RCRE-GROUP-61576551687867/` · Zillow `https://www.zillow.com/profile/julio648` |
| Bio ("Get to Know Me") | "I understand life's daily challenges, and I believe buying or selling your home shouldn't be one of them. My focus is on your needs and goals, building lasting relationships. Leveraging my 20+ years of military experience and MRP accreditation, I expertly guide clients, especially military families. As the Spanish translator for the Agents of Shields team, I ensure clear communication. I'm passionate about exceptional customer service, helping with first homes, relocations, or retirement properties. My priority is making your real estate journey smooth and successful." |

**Specialties (implied by the bio, not a structured field):** military relocation (**MRP**
accreditation), military families, first-time buyers, relocations, retirement properties.
**Languages:** the site has **no languages field**. The bio states he is *"the Spanish translator
for the Agents of Shields team"*, which implies Spanish — but Spanish is never declared as a listed
language anywhere on the site. Bio is written in **first person**.

### Taquilla Allen — `https://rcregroup.com/agent/taquilla-allen`

| Field | Value (verbatim) |
|---|---|
| Title / role | **MANAGING BROKER** |
| Page H1 | "About Taquilla Allen" |
| Primary phone | (205) 883-8215 |
| Website | http://taquillaallenrealty.com |
| License Number | **#BK3522465** |
| Email | Taquilla@RCREgroup.com |
| Address | 1 Chase Corporate Dr # 400, Birmingham, **FL** 35244 — *(the live site says "FL"; this is a data error on RCRE's site, the ZIP and city are Alabama)* |
| Headshot | `https://media-production.lp-cdn.com/media/c8e4cadc-52f0-4e16-9ed2-54165d73642c` — `alt="Taquilla Allen"` |
| Socials | Facebook (company) · Instagram `https://www.instagram.com/tallenrcregroup/` · LinkedIn `https://www.linkedin.com/in/taquilla-allen-297a232b7/` · TikTok `https://www.tiktok.com/@tallenrcregroup` · Zillow `https://www.zillow.com/profile/TaquillaRAllen` |
| Bio ("Get to Know Me") | "As a top-producing agent, she brings dedication, discipline, and exceptional service. She proven track record that ensures precise market navigation, seamless experiences, and results exceeding expectations. A former University of Alabama basketball player (B.A. Criminal Justice) and international pro, she later earned a Master's in Criminal Justice and served as a police officer. This background instills service, integrity, and responsibility. Her passion is helping you navigate real estate with exceptional service, achieve outstanding results." |

**Specialties:** none declared as a structured field. Implied: top-producer / listings.
**Languages:** not stated anywhere. Bio is written in **third person** (note the inconsistency with
Julio's first-person bio — the site mixes both voices). The bio contains a grammatical error
("She proven track record") that exists on the live site.

She is the only agent with a full social set and a personal domain, and she is the only agent listed
under **both** ALABAMA AGENTS and FLORIDA AGENTS (as is Julio).

---

## 7. Full agent roster

From `https://rcregroup.com/sitemap-agent-dpages.xml` (13 slugs) cross-referenced with
`https://rcregroup.com/team` (which groups them by state) and each individual agent page.

**13 unique agents. Alabama section: 5. Florida section: 10. Julio Arango and Taquilla Allen appear
in both.**

Headshot URLs below are the canonical CDN objects; on-page they are wrapped in
`https://media-production.lp-cdn.com/cdn-cgi/image/format=auto,quality=85[,fit=scale-down,width=N]/`.

| Name | Role/title | Team section | Phone | License | Email | Office / market | Headshot (`.../media/…`) |
|---|---|---|---|---|---|---|---|
| **Julio Arango** | QUALIFYING BROKER | Alabama + Florida | (904) 575-0970 · alt 904-977-5749 | #000169761, 442573, 3454903 | Julio@RCREgroup.com | 1st Chase Corporate Dr Ste 400, Hoover, AL 35244 | `a32db16a-1875-4369-bc36-71b50764b4e9` |
| **Taquilla Allen** | MANAGING BROKER | Alabama + Florida | (205) 883-8215 | #BK3522465 | Taquilla@RCREgroup.com | 1 Chase Corporate Dr # 400, Birmingham (listed "FL" in error) 35244 | `c8e4cadc-52f0-4e16-9ed2-54165d73642c` |
| **Lekeshia Jones** | REALTOR® | Alabama | (513) 315-6432 | #000157540-1 | lekeshia@rcregroup.com | 1st Chase Corporate Dr Ste 400, Hoover, AL 35244 | `ee953f76-f4f9-494c-a2ae-ba5ab39bfb61` |
| **Regiena Brown** | REALTOR® | Alabama | (205) 218-9559 | #SL150604 | regiena@rcregroup.com | 8380 Baymeadows Rd Ste 17, Jacksonville, FL 32256 | `2e311180-d6be-4864-a9e2-4a8ddadded93` |
| **Urban Garrett** | REALTOR® | Alabama | (256) 592-9463 | #100075-2 | urban@rcregroup.com | 1st Chase Corporate Dr Ste 400, Hoover, AL 35244 | `4b499aae-14c7-46a7-8110-2f90e65701ca` |
| **Alex Verastegui** | REALTOR® | Florida | (904) 532-0068 | #SL3438292 | Alex@RCREgroup.com | 8380 Baymeadows Road, Suite 17, Jacksonville, FL 32256 | `3ff15c13-cffc-4ff6-8450-848efc5dca8f` |
| **Delonda Allen** | REALTOR® | Florida | (205) 240-0323 | #SL3405445 | delonda@rcregroup.com | 8380 Baymeadows Road, Suite 17, Jacksonville, FL 32256 | `e99750e6-45f2-4c98-a128-7408d450f4a7` |
| **Johann Velez** | REALTOR® | Florida | (904) 599-9828 | #SL3620448 | Johann@RCREgroup.com | 8380 Baymeadows Rd Ste 17, Jacksonville, FL 32256 | `2f4d0963-45a7-4c94-8831-d77f8adab024` |
| **Margie Olsen-Alvarez** | REALTOR® | Florida | (904) 891-7729 | #SL3419451 | Margie@RCREgroup.com | 8380 Baymeadows Rd Ste 17, Jacksonville, FL 32256 | `1548d856-b027-4e41-8558-024da94b3d77` |
| **Molly Plude** | REALTOR® | Florida | (904) 886-0156 | #SL3448313 | Molly@RCREgroup.com | 8380 Baymeadows Rd Ste 17, Jacksonville, FL 32256 | `83024d72-3ade-4ca3-a71a-91a412ef8444` |
| **Rodrigo Tello Sanchez** | REALTOR® | Florida | (703) 598-6357 | #SL3591729 | rodrigo@RCREgroup.com | 8380 Baymeadows Rd Ste 17, Jacksonville, FL 32256 | `a6f1f0e3-e993-4595-b962-d94b5a60626b` |
| **Sarah Brockner** | REALTOR® | Florida | (904) 422-7075 | #SL3436402 | Sarah@RCREgroup.com | 8380 Baymeadows Rd Ste 17, Jacksonville FL | `d3da3f61-bb29-419e-ac8b-918e09bb7bd6` |
| **Vito Lombardo** | REALTOR® | Florida | (904) 614-1763 | #SL3446501 | Vito@RCREgroup.com | 8380 Baymeadows Rd Ste 17, Jacksonville, FL 32256 | `2601bf71-5e3a-4a93-b605-b6471b53261a` |

### Stated specialties (verbatim signals from each bio — there is no structured "specialties" field)

- **Julio Arango** — 20+ years military experience; MRP accreditation; military families; first homes, relocations, retirement properties; Spanish translator for the "Agents of Shields" team.
- **Taquilla Allen** — top-producing agent; former University of Alabama basketball player, international pro, Master's in Criminal Justice, former police officer.
- **Alex Verastegui** — "journeyed from Peru to New York and Jacksonville"; background in sales and account development.
- **Delonda Allen** — "North Florida Real Estate Agent"; former public servant (education/government); buyers, sellers, and investment properties; MPA + MBA (Grand Canyon University).
- **Johann Velez** — sales and customer service; negotiation; family-oriented; golf/baseball.
- **Lekeshia Jones** — 18+ years professional property management/regional management (single-family, apartments, townhomes); Alabama Property Manager of the Year; Career Academy of Real Estate 2023; certified NAR member 2024.
- **Margie Olsen-Alvarez** — former Transportation & Logistics professional; long-time NE Florida resident and **Navy wife**; military relocation; compliance.
- **Molly Plude** — born in Cambodia, moved to Jacksonville at twelve; "forever home" buyers.
- **Regiena Brown** — Tifton, GA; Tift County Athletic Hall of Fame; UAB student-athlete (Sweet Sixteen); BS, MBA, Ed. degree; Fortune 500 sales & marketing leadership; published author.
- **Rodrigo Tello Sanchez** — bio not written: the page reads **"Bio Coming Soon!"**
- **Sarah Brockner** — "one of the top sales agents on the RCRE team"; buyer/seller relationship focus.
- **Urban Garrett** — Talladega, AL; 22 years in service roles; BS, MPA, and **Juris Doctor**; insurance and real estate sales.
- **Vito Lombardo** — Ponte Vedra sellers; downsizing.

**Not determinable from the site:** no agent page exposes a languages field, a years-in-business
field, a designations list, or a structured specialties taxonomy. Any such data in the demo must be
treated as invented, not sourced.

**Data-quality notes worth carrying into the demo model:**
- Regiena Brown is listed under **ALABAMA AGENTS** but her address is the Jacksonville, FL office and her license is a Florida `SL` number.
- Delonda Allen is under **FLORIDA AGENTS** with a `(205)` Alabama phone.
- Johann Velez's headshot alt text says "Johann **Suarez**".
- Taquilla Allen's address reads "Birmingham, **FL** 35244".
- Every agent shares the same company Facebook link; personal socials vary (LinkedIn: Alex, Margie, Molly, Taquilla, Vito. Instagram/TikTok: Taquilla only. Zillow: all 13).
- Bios alternate between first person (Julio, Margie, Lekeshia) and third person (everyone else), and Urban Garrett's mixes both within one paragraph.

---

## 8. Listings

Source: `https://rcregroup.com/sitemap-properties-dpages--0.xml` — **78 property URLs** as of
2026-08-19.

### URL / address format

Slug pattern (two variants coexist):
- MLS-numeric: `/properties/{street-slug}-{city}-{st}-us-{zip}-{mlsId}` — e.g.
  `/properties/4594-farmhouse-gate-trail-jacksonville-fl-us-32226-2137644`
- Hash-suffixed: `/properties/{street-slug}-{city}-{st}-{zip}-{32charHash}` — e.g.
  `/properties/337-nw-16th-ave-pompano-beach-fl-33069-26765f1c0a6e136f120d2ef3e4d66349`

Display format:
- **Card / H1 title** = street line only, in the MLS's own casing (mixed caps preserved):
  `"4594 FARMHOUSE GATE Trail"`, `"11852 PEGASUS Drive"`, `"10251 Trevor Creek DR W"`,
  `"11287 ESTANCIA VILLA Circle 1205"`, `"613 SHERIDAN ROAD"`, `"7524 2ND AVENUE S"`
- **Subline** = `"{street}, {City}, {ST} {ZIP}"` — e.g. `"4594 FARMHOUSE GATE Trail, Jacksonville, FL 32226"`
- **Attribution** = `"Courtesy of {LISTING BROKERAGE}"` — e.g. `"Courtesy of UNITED REAL ESTATE GALLERY"`

### Price

Rendered in an `h5` (`.f-properties__item-price lp-h5`), formatted `$555,000` — dollar sign,
comma-grouped, no decimals. Observed range on the live site: **$115,000 – $555,000**.

### Beds / baths / sqft

Card feature line, pipe-separated, with singular/plural not normalized:

```
4 Beds | 3 Baths | 2,252 Sq.Ft.
3 Beds | 1 Baths | 1,015 Sq.Ft.
4 Beds | 2 Baths                  (sqft omitted when unknown)
        | 528 Sq.Ft.              (beds/baths omitted when unknown — land/commercial)
```

Detail page uses a different, lowercase set: `3 beds` / `2 baths` / `2,103 Sq.Ft. LIVING AREA` /
`7,405.2 Sq.Ft. lot`.

### Status values (exact strings observed)

`For Sale` · `Pending` · `Active Under Contract` · `Sold` — plus a template string
`Open House: {{openHouseHours}}` for open-house badges. Rendered as `.f-properties__property-status`
(homepage) / `.featured-properties__label`, styled `background:#000; color:#fff; padding:4px 35px`,
top-right of the photo.

### Property detail data fields (verbatim labels)

- **Interior:** total bedrooms · Total bathrooms · full bathrooms · Laundry room · Flooring · APPLIANCES · other interior Features
- **Area & Lot:** Status · Living Area · Total Area · Lot Area · MLS® ID · Type · YEAR BUILT · Neighborhood · Architecture Styles · View Description · Elementary School · Middle School · High School
- **Exterior:** STORIES · Garage Space · water Source · utilities · roof · lot features · parking · HEAT TYPE · AIR CONDITIONING · sewer · HOA Amenities
- **Financial:** Sales Price · Real Estate Tax (`$6,004/yr`) · HOA (`$72/mo`)
- Plus `View Virtual Tour` when present.

Note the label casing is inconsistent on the live site (`total bedrooms` vs `Total bathrooms` vs
`APPLIANCES`) — that is how Luxury Presence renders it.

### Property photo URLs

`https://dlajgvw9htjpb.cloudfront.net/cms/f323ee62-121e-4828-9d99-6a87d5a410d2/{mlsId}/{signedInt}.jpg`

Real examples:
```
https://dlajgvw9htjpb.cloudfront.net/cms/f323ee62-121e-4828-9d99-6a87d5a410d2/2137644/4633441805961998422.jpg
https://dlajgvw9htjpb.cloudfront.net/cms/f323ee62-121e-4828-9d99-6a87d5a410d2/2150931/6408220366200166233.jpg
https://dlajgvw9htjpb.cloudfront.net/cms/f323ee62-121e-4828-9d99-6a87d5a410d2/A12011149/-9049484293833965720.jpg
https://dlajgvw9htjpb.cloudfront.net/cms/f323ee62-121e-4828-9d99-6a87d5a410d2/21447159/9131614146729967442.jpg
```
A single detail page carries ~40 such photos. Two MLS-id shapes appear: pure numeric (NEFMLS /
Jacksonville, e.g. `2137644`; Birmingham, e.g. `21447159`) and letter-prefixed (South Florida,
e.g. `A12011149`).

### Sample listings (homepage "Featured Properties", 2026-08-19)

| Address | Beds/Baths/SqFt | Price | Status |
|---|---|---|---|
| 11852 PEGASUS Drive, Jacksonville, FL 32223 | 4 / 3 / 2,252 | $555,000 | For Sale |
| 10251 Trevor Creek DR W, Jacksonville, FL 32257 | 4 / 2 / — | $470,000 | Pending |
| 4594 FARMHOUSE GATE Trail, Jacksonville, FL 32226 | 3 / 2 / 2,103 | $440,000 | For Sale |
| 319 NORTHSIDE Drive S, Jacksonville, FL 32218 | 4 / 3 / 2,381 | $399,000 | For Sale |
| 11532 BIRCH FOREST Circle E, Jacksonville, FL 32218 | 5 / 2 / 1,629 | $250,000 | Active Under Contract |
| 5301 MAIN STREET, Brighton, AL 35020 | 3 / 1 / 1,075 | $115,000 | For Sale |
| 1363 W 21ST Street, Jacksonville, FL 32209 | — / — / 528 | $119,000 | For Sale |

**Caveat:** `/properties/sale` and `/properties/sold` render their grids **client-side** — the
server HTML only contains `<h1>Featured Properties</h1>` / `<h1>Past Transactions</h1>` and a
Handlebars-style template. The listing data above was read from the homepage carousel and from
individual property pages, which *are* server-rendered.

---

## 9. Navigation and page structure

### Desktop top nav (`nav#global-navbar`) — exact labels and hrefs

| Label | URL |
|---|---|
| Properties *(dropdown, `href="#"`)* | — |
| ↳ Featured Properties | `/properties/sale` |
| ↳ Past transactions | `/properties/sold` |
| Home Search | `/home-search/listings` |
| Home Valuation | `/home-valuation` |
| Neighborhoods | `/neighborhoods` |
| Contact *(dropdown, `href="#"`)* | — |
| ↳ AL: (205) 851-8866 | `tel:2058518866` |
| ↳ FL: (904) 906-9038 | `tel:9049069038` |
| ↳ Contact Us | *(opens the contact modal, `data-type="CONTACT_US"`)* |

Plus a hamburger button on the right at all breakpoints (the desktop nav list is hidden ≤1024px).

**Nav behavior:** transparent over the hero with white type and the light logo; on scroll it gains
`.scroll` → `background-color:#FFF`, link color `#000`, hover `#988642` (an earlier rule sets
`#cfb077`), and swaps to the dark logo. Header height 100px, `translateY(24px)`; logo capped at 70px
(60px mobile).

### Slide-out side menu (`#global-sidemenu`) — the full IA

| Label | URL |
|---|---|
| Home | `/` |
| Meet Our Agents | `/team` |
| Properties *(group)* | — |
| ↳ Featured Properties | `/properties/sale` |
| ↳ Past Transactions | `/properties/sold` |
| Home Search | `/home-search/listings` |
| Home Valuation | `/home-valuation` |
| Neighborhoods | `/neighborhoods` |
| Testimonials | `/testimonials` |
| Blog | `/blog` |
| Contact Us | `/contact` |
| My Search Portal | `/home-search/account` |

Note "Meet Our Agents", "Testimonials", "Blog", "Contact Us", and "My Search Portal" are reachable
**only** from the side menu — they are not in the desktop bar.

### Static pages (`https://rcregroup.com/sitemap-static.xml`)

`/` · `/404` · `/blog` · `/contact` · `/home-valuation` · `/neighborhoods` · `/properties/sale` ·
`/properties/sold` · `/team` · `/terms-and-conditions` · `/testimonials` · `/home-search/listings`

Sitemap index (`/sitemap.xml`): `sitemap-static.xml`, `sitemap-agent-dpages.xml`,
`sitemap-blog-dpages.xml`, `sitemap-neighborhoods-dpages.xml`, `sitemap-properties-dpages--0.xml`.

### Footer (`footer#global-footer`) — light background, `#1A1A1A` icons

- H3 **"RCRE Group"** · H4 **"Contact Us"**
- Email: `info@rcregroup.com`
- Phone Number: **(205) 851-8866** — CSS injects the label **"ALABAMA OFFICE NUMBER"**
- Phone Number: **(904) 906-9038** — CSS injects the label **"FLORIDA OFFICE NUMBER"**
- Address: **1 Chase Corporate Dr # 400, Birmingham AL 35244**
- Realtor®/EHO lockup · disclaimer · "Real Estate Website Design by Luxury Presence" ·
  "Copyright © 2026 | Privacy Policy" (→ `/terms-and-conditions`)
- Footer link hover uses `#CFB077`; the copy/privacy divider is a `1px solid #CFB077` rule.

### Mobile

A persistent bottom-right pill button **"Contact Us"** (`#global-mobile-contact`,
`--backgroundColor: rgba(255,255,255,1); --textColor: rgba(26,26,26,1)`) opens the "Leave a Message"
form.

### Company social accounts

- Facebook: `https://www.facebook.com/p/RCRE-GROUP-61576551687867/`
- Instagram (embedded feed, "Follow Me on Instagram")

---

## 10. Neighborhoods — the 10 county pages

From `https://rcregroup.com/sitemap-neighborhoods-dpages.xml` and the `/neighborhoods` index. The
index groups them under two H2s: **"Explore Alabama"** and **"Explore Florida"**, in this order.

### Explore Alabama (4)

| Display name (exact) | URL | Card image |
|---|---|---|
| **Jefferson County** | `/neighborhoods/jefferson-county` | `.../media/5b49a873-d179-4a9b-84fa-758cce8c50b4` |
| **Blount County** | `/neighborhoods/blount-county` | `.../media/f5e5ab21-f302-4f05-a003-82245935679b` |
| **St. Clair County** | `/neighborhoods/st-clair-county` | `.../media/2353c394-edbc-4363-9406-d73ebf5e71e2` |
| **Shelby County** | `/neighborhoods/shelby-county` | `.../media/cbf4b7df-5a4e-4422-b25b-5f7b7e3efbdd` |

### Explore Florida (6)

| Display name (exact) | URL | Card image |
|---|---|---|
| **Duval County** | `/neighborhoods/duval-county` | `.../media/60f5da7c-7057-4b37-a380-21b2f439f56d` |
| **Clay County** | `/neighborhoods/clay-county` | `.../media/79253f20-ebcf-4746-adb0-8ceaf97dab97` |
| **St Johns County** | `/neighborhoods/st-johns-county` | `.../media/c4709096-26e0-43b6-9b36-5e4d852b955e` |
| **Nassau County** | `/neighborhoods/nassau-county` | `.../media/b2f135f9-95e1-42a5-99a5-4fba24772236` |
| **Miami Dade County** | `/neighborhoods/miami-dade-county` | `.../media/f657a442-c4d7-4363-b2f5-c3a893f47c5d` |
| **Broward County** | `/neighborhoods/broward-county` | `.../media/23767f90-bc3e-4de9-bdfd-b5125a14fcf9` |

**Naming is inconsistent on the live site and should be copied verbatim, not normalized:**
"**St.** Clair County" carries a period; "**St** Johns County" does not. "Miami Dade County" has no
hyphen. Every entry is "{Name} County" — no city-level neighborhood pages exist.

Card CTA on the index: **"Learn More"**. Homepage tile eyebrow: **"Neighborhood Guides"**;
tile heading: **"Areas of Expertise"**; sub-tiles **"Explore Alabama Neighborhoods"** /
**"Explore Florida Neighborhoods"** (each with a **"View All"** link).

### County page structure (verified on Jefferson and Duval)

Two different H1 formulas are in use — the SEO copy was written at different times:

- Jefferson: H1 **"Discover Jefferson County Real Estate Opportunities"**;
  title *"Explore Jefferson County Real Estate – Find Your Dream Home"*;
  meta *"Looking for Jefferson County real estate? Discover exclusive listings and vibrant communities. Start your home search today!"*
- Duval: H1 **"Duval County Real Estate Listings & Neighborhood Guide"**;
  title *"Duval County Real Estate Listings & Neighborhoods | RCRE"*;
  meta *"Searching for Duval County real estate listings in top neighborhoods? Explore market stats, lifestyle data and curated homes, then book your private tour."*

Both share the same section skeleton:
`Property Listings` → `Overview for {County}, {ST}` → `Around {County}, {ST}` →
`Demographics and Employment Data for {County}, {ST}` → `Explore Other Neighborhoods` (3 cross-links)
→ `Get In Touch With The Team`.

---

## Appendix — sources fetched (all 2026-08-19)

| URL | Notes |
|---|---|
| `https://rcregroup.com/` | 704,005 B — palette, typography, hero, roster cards, listings, nav, footer |
| `https://rcregroup.com/team` | 659,470 B — full roster grouped by state, roles |
| `https://rcregroup.com/agent/{13 slugs}` | julio-arango, taquilla-allen, alex-verastegui, delonda-allen, johann-velez, lekeshia-jones, margie-olsen-alvarez, molly-plude, regiena-brown, rodrigo-tello-sanchez, sarah-brockner, urban-garrett, vito-lombardo |
| `https://rcregroup.com/neighborhoods` + `/neighborhoods/jefferson-county` + `/neighborhoods/duval-county` | county naming and page skeleton |
| `https://rcregroup.com/properties/sale`, `/properties/sold` | client-rendered grids; status template strings |
| `https://rcregroup.com/properties/4594-farmhouse-gate-trail-jacksonville-fl-us-32226-2137644` | full detail-page field inventory |
| `https://rcregroup.com/properties/11287-estancia-villa-circle-1205-jacksonville-fl-us-32246-2140001` | FL condo comparison |
| `https://rcregroup.com/properties/5301-main-street-brighton-al-us-35020-21447159` | AL listing comparison |
| `https://rcregroup.com/sitemap.xml` and all five child sitemaps | 13 agents · 10 counties · 78 properties · 12 static pages |
| `https://fonts.googleapis.com/css?family=Syne:400,500,600,700,800` | Syne v24 weights confirmed |
| `https://fonts.googleapis.com/css?family=Nunito%20Sans:200…900i` | Nunito Sans weights + italics confirmed |
| `https://styles.luxurypresence.com/producer/index.css` | platform base stylesheet (no brand colors) |

**Retained artifacts:** none. Working copies live under `RCRE/99-scratch/rcre-audit/`; no logo,
headshot, or property image was kept anywhere in this repository.
