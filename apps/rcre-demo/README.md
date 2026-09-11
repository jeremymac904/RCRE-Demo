# RCRE Demo

A premium, clickable demonstration of the RCRE platform. **Separate from `apps/rcre`** — that
MVP proved the backend logic; this proves the experience. Neither depends on the other.

## Run

```bash
cd apps/rcre-demo && npm install && npm run dev   # http://localhost:3200
```

## Themes

**Light is the default.** Dark is a stored preference — the OS setting is deliberately not
consulted, because a demo that opens dark on one machine and light on another is one you
have to apologise for before you start.

The toggle sits at the **bottom of the sidebar**, above the demo badge.

Light is not an inversion. Two things change substantively:

- **Brass splits.** `#cfb077` sits at roughly 2:1 on white — unusable as text. So
  `--brass-fill` stays `#cfb077` for fills and borders, and `--brass-ink` drops to `#8a6a2e`
  for text. In dark they converge.
- **Semantic colours get darker, not brighter.** `#a8401a` urgent on light,
  `#dd8464` on dark — the opposite of the instinct, and what Brex and Stripe both ship.

Depth also changes hands: dark uses surface lightness, light uses a hairline plus one very
shallow shadow, because light has no darker-surface trick available.

The public pages mix both on purpose — dark hero, light content, dark showcase, light
sections, dark footer — which is how rcregroup.com itself is built. `.on-dark` forces a
subtree dark by redeclaring the tokens.

## Brand basis

Every visual decision traces to rcregroup.com, inspected 2026-08-19:

| | Source |
|---|---|
| `#121212` ink, `#cfb077` brass, `#848484` muted | extracted from the live compiled CSS (brass appears 37×, and is the site's only chromatic colour) |
| Syne (display) + Nunito Sans (body) | the two Google families the live site loads |
| Square, letter-spaced, outlined buttons that fill on hover | RCRE's actual button treatment |
| Brass uppercase eyebrows with wide tracking | the site's signature detail (16px / 5px tracking there) |
| Logo | downloaded from RCRE's CDN, resized to 480px |

**One deliberate departure:** rcregroup.com is a light site with a dark hero. This is dark
throughout, because it is a tool an agent works in all day rather than a marketing page —
and because the dark hero is the most brand-forward surface RCRE has.

## Honest notes

- **All data is synthetic.** Real RCRE people appear by name and role only (public
  information). Every performance figure attached to them is invented and labelled.
- **The assistant is scripted** (`src/data/conversations.ts`). No model is called. RCRE's AI
  provider is per-agent and provider-agnostic (ADR-0011), so there is no single model this
  demo could honestly speak for. What it demonstrates is the shape of the interaction.
- **Listing visuals are generated, not photographs.** RCRE's photo CDN rate-limits and then
  403s after a few requests — depending on it would risk broken images mid-screen-share, and
  the same block prevented bundling the photos. `ListingVisual` is the only file to change
  when RCRE supplies its own photography.
- **No commission figures, fees, or testimonials** appear anywhere. RCRE has not supplied
  them and none are invented.

## Structure

```
src/app/          landing · login · today · assistant · crm · pipeline
                  listings · marketing · training · command · recruiting · agents · join
src/components/   AppShell · Assistant · PriorityCard · AttentionRow
                  ListingVisual · StageChip · Avatar · Logo · PageHeader
src/data/         demo.ts (dataset) · conversations.ts (scripted assistant)
```

## Not connected to anything

No Follow Up Boss, no Supabase, no Meta, no Google, no email, no SMS. Nothing leaves the
machine.
