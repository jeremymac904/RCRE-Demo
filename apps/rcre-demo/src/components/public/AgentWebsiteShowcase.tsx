'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import './agent-website-showcase.css'

// ---------------------------------------------------------------------------
// AgentWebsiteShowcase — interactive template gallery for the RCRE Agent
// Website engine. Template identities are derived from the eight realtor
// niche skills (luxury estate, rural/equestrian, investor, urban modern,
// suburban family, new construction, historic heritage, plus RCRE Signature).
// Each card renders a faithful preview using that theme's own CSS variables.
// Clicking opens a desktop + mobile preview modal with a link to the live
// rendered agent site. Respects prefers-reduced-motion.
// ---------------------------------------------------------------------------

interface ShowcaseTemplate {
  id: string
  name: string
  tagline: string
  description: string
  bestFor: string[]
  personality: string
  cssVars: Record<string, string>
  previewPath: string
  exampleAgent: string
  exampleMarket: string
}

const TEMPLATES: ShowcaseTemplate[] = [
  {
    id: 'rcre-signature',
    name: 'RCRE Signature',
    tagline: 'Premium Southern real estate, modern conversion design',
    description:
      'The flagship RCRE template. Premium presentation, Southern warmth, Jacksonville and Birmingham relevance. The default for agents who want a premium brand without a specialized niche.',
    bestFor: ['First-time buyers', 'Relocation', 'Residential sales', 'Jacksonville', 'Birmingham metro', 'Military moves'],
    personality: 'Confident, warm, modern, Southern-professional',
    cssVars: {
      '--color-primary': '#1a2e4a',
      '--color-accent': '#c9a84c',
      '--color-bg': '#faf8f5',
      '--color-text': '#1a1a1a',
      '--color-cta': '#c9a84c',
      '--font-display': 'Cormorant Garamond, Georgia, serif',
      '--font-body': 'DM Sans, system-ui, sans-serif',
    },
    previewPath: '/agent/rcre-signature-demo',
    exampleAgent: 'Jordan Mercer',
    exampleMarket: 'Jacksonville & Birmingham',
  },
  {
    id: 'rcre-luxury',
    name: 'RCRE Luxury',
    tagline: 'Architectural editorial, restrained and refined',
    description:
      'Inspired by the Luxury Estate skill. Architectural photography, restrained palette, provenance-first copy. For waterfront, executive relocation, and high-value property markets.',
    bestFor: ['Luxury listings', 'Executive relocation', 'Waterfront', 'Architectural properties'],
    personality: 'Editorial, restrained, material-honest, architectural',
    cssVars: {
      '--color-primary': '#f4efe6',
      '--color-accent': '#a88a4f',
      '--color-bg': '#faf7f0',
      '--color-text': '#1c1c1c',
      '--color-cta': '#5c2a2e',
      '--font-display': 'Cormorant Garamond, Georgia, serif',
      '--font-body': 'DM Sans, system-ui, sans-serif',
    },
    previewPath: '/agent/jacksonville-luxury',
    exampleAgent: 'Alexandra Whitfield',
    exampleMarket: 'Northeast Florida Waterfront',
  },
  {
    id: 'rcre-rural',
    name: 'RCRE Rural & Land',
    tagline: 'Grounded, regional, premium country property',
    description:
      'Inspired by the Rural & Equestrian skill. Premium but grounded, warm earth tones, working-land authenticity. For acreage, land, equestrian, and Alabama rural markets.',
    bestFor: ['Land', 'Acreage', 'Equestrian', 'USDA markets', 'Rural Alabama'],
    personality: 'Grounded, plain-spoken, authentic, regional, spacious',
    cssVars: {
      '--color-primary': '#5a4a3a',
      '--color-accent': '#7d8c6a',
      '--color-bg': '#f5f0e6',
      '--color-text': '#1f2a24',
      '--color-cta': '#7a2e2a',
      '--font-display': 'Playfair Display, Georgia, serif',
      '--font-body': 'Lora, Georgia, serif',
    },
    previewPath: '/agent/alabama-rural',
    exampleAgent: 'Coleman Reid',
    exampleMarket: 'Alabama Acreage',
  },
  {
    id: 'rcre-urban',
    name: 'RCRE Urban Modern',
    tagline: 'Tight, technical, neighborhood-fluent',
    description:
      'Inspired by the Urban Modern skill. Walk Score, transit, building-level depth. For Jacksonville urban core, condo, loft, and townhouse specialists.',
    bestFor: ['Urban condo', 'Loft', 'Townhouse', 'Walkability', 'New development'],
    personality: 'Tight, technical, neighborhood-fluent, restrained',
    cssVars: {
      '--color-primary': '#0f1419',
      '--color-accent': '#3a7bd5',
      '--color-bg': '#f5f5f3',
      '--color-text': '#0f1419',
      '--color-cta': '#0f1419',
      '--font-display': 'DM Sans, system-ui, sans-serif',
      '--font-body': 'IBM Plex Sans, system-ui, sans-serif',
    },
    previewPath: '/agent/jacksonville-urban',
    exampleAgent: 'Priya Nair',
    exampleMarket: 'Jacksonville Urban Core',
  },
  {
    id: 'rcre-investor',
    name: 'RCRE Investor',
    tagline: 'Numbers-forward, disciplined income-property expertise',
    description:
      'Inspired by the Investor-Focused skill. Data-driven, cap-rate literate. For rental investors, BRRRR, STR, multi-family, and portfolio builders.',
    bestFor: ['Rental investors', 'BRRRR', 'Short-term rental', 'Multi-family', 'Portfolio builders'],
    personality: 'Disciplined, analytical, transparent, data-forward',
    cssVars: {
      '--color-primary': '#0a3a2a',
      '--color-accent': '#1f8c5c',
      '--color-bg': '#f6f7f5',
      '--color-text': '#0a3a2a',
      '--color-cta': '#1f8c5c',
      '--font-display': 'IBM Plex Sans Condensed, system-ui, sans-serif',
      '--font-body': 'IBM Plex Sans, system-ui, sans-serif',
    },
    previewPath: '/agent/rcre-investor',
    exampleAgent: 'Jordan Mercer',
    exampleMarket: 'Jacksonville & Birmingham Investment',
  },
  {
    id: 'rcre-suburban',
    name: 'RCRE Suburban Family',
    tagline: 'Warm, residential, school-district first',
    description:
      'Inspired by the Suburban Family skill. Warm typography, school-district focus, family-block rhythm. For agents serving family buyers in Jacksonville suburbs and Birmingham suburbs.',
    bestFor: ['First-time buyers', 'Move-up buyers', 'Schools', 'Family residential'],
    personality: 'Warm, residential, family-block, neighborhood',
    cssVars: {
      '--color-primary': '#3a2e2a',
      '--color-accent': '#c47b4a',
      '--color-bg': '#faf6ef',
      '--color-text': '#3a2e2a',
      '--color-cta': '#c47b4a',
      '--font-display': 'Nunito, system-ui, sans-serif',
      '--font-body': 'Nunito, system-ui, sans-serif',
    },
    previewPath: '/agent/family',
    exampleAgent: 'Jordan Mercer',
    exampleMarket: 'Jacksonville Family Suburbs',
  },
  {
    id: 'rcre-new-construction',
    name: 'RCRE New Construction',
    tagline: 'Precise, architectural, builder-fluent',
    description:
      'Inspired by the New Construction Modern skill. Floorplan-first, builder relationships, design-center literate. For agents representing buyers in Nocatee, Silverleaf, and other Jacksonville new-build communities.',
    bestFor: ['Spec homes', 'Pre-construction', 'Builder representation', 'Design center'],
    personality: 'Precise, architectural, builder-fluent, floorplan-forward',
    cssVars: {
      '--color-primary': '#0c2540',
      '--color-accent': '#5a7a99',
      '--color-bg': '#f5f7fa',
      '--color-text': '#0c2540',
      '--color-cta': '#0c2540',
      '--font-display': 'Outfit, system-ui, sans-serif',
      '--font-body': 'Outfit, system-ui, sans-serif',
    },
    previewPath: '/agent/jacksonville-newconstruction',
    exampleAgent: 'Marcus Webb',
    exampleMarket: 'Northeast Florida New Build',
  },
  {
    id: 'rcre-historic',
    name: 'RCRE Historic Heritage',
    tagline: 'Editorial, period-correct, provenance-first',
    description:
      'Inspired by the Historic Heritage skill. Scholarly register, period-correct typography, architectural-era depth. For agents serving Highland Park, Mountain Brook, and other historic Birmingham neighborhoods.',
    bestFor: ['Period homes', 'Preservation properties', 'Estate sales', 'Character homes'],
    personality: 'Scholarly, period-correct, provenance-first, legacy',
    cssVars: {
      '--color-primary': '#2a2520',
      '--color-accent': '#a07a3a',
      '--color-bg': '#f5f0e6',
      '--color-text': '#2a2520',
      '--color-cta': '#a07a3a',
      '--font-display': 'Playfair Display, Georgia, serif',
      '--font-body': 'Source Serif 4, Georgia, serif',
    },
    previewPath: '/agent/birmingham-historic',
    exampleAgent: 'Eleanor Whitmore',
    exampleMarket: 'Birmingham Historic Districts',
  },
]

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(m.matches)
    const handler = () => setReduced(m.matches)
    m.addEventListener?.('change', handler)
    return () => m.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

function useReveal() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      root.querySelectorAll<HTMLElement>('[data-show-reveal]').forEach((el) => {
        el.classList.add('aws-revealed')
      })
      return
    }
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-show-reveal]'))
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('aws-revealed')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])
  return rootRef
}

function ThemedPreview({ template }: { template: ShowcaseTemplate }) {
  return (
    <div className="aws-thumb-canvas" style={template.cssVars as React.CSSProperties} aria-hidden="true">
      <div className="aws-thumb-hero" />
      <div className="aws-thumb-content">
        <div className="aws-thumb-eyebrow">{template.exampleMarket}</div>
        <div className="aws-thumb-headline">{template.exampleAgent}</div>
        <div className="aws-thumb-line" />
        <div className="aws-thumb-line short" />
        <div className="aws-thumb-cta">Schedule a conversation</div>
      </div>
    </div>
  )
}

function PreviewModal({
  template,
  onClose,
}: {
  template: ShowcaseTemplate | null
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!template) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('.aws-modal-close')?.focus()
    }, 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [template, onClose])

  if (!template) return null
  return (
    <div
      className="aws-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aws-modal-title"
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="aws-modal">
        <header className="aws-modal-head">
          <div>
            <p className="aws-modal-eyebrow">{template.personality}</p>
            <h3 id="aws-modal-title">{template.name}</h3>
            <p className="aws-modal-tag">{template.tagline}</p>
          </div>
          <button className="aws-modal-close" aria-label="Close preview" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="aws-modal-body">
          <div className="aws-modal-preview" style={template.cssVars as React.CSSProperties}>
            <div className="aws-modal-preview-inner">
              <div className="aws-modal-preview-topbar">
                <span className="aws-modal-dot" />
                <span className="aws-modal-dot" />
                <span className="aws-modal-dot" />
                <span className="aws-modal-url">{template.previewPath.replace(/^\//, '') + ' · RCRE Group'}</span>
              </div>
              <div className="aws-modal-preview-content">
                <div className="aws-modal-preview-eyebrow">{template.exampleMarket}</div>
                <h4>{template.exampleAgent}</h4>
                <p className="aws-modal-preview-tag">{template.tagline}</p>
                <div className="aws-modal-preview-list">
                  {template.bestFor.slice(0, 4).map((b) => (
                    <span key={b}>{b}</span>
                  ))}
                </div>
                <button className="aws-modal-preview-cta">Begin a conversation</button>
              </div>
            </div>
          </div>
          <div className="aws-modal-mobile" style={template.cssVars as React.CSSProperties}>
            <div className="aws-modal-mobile-frame">
              <div className="aws-modal-mobile-notch" />
              <div className="aws-modal-mobile-hero" />
              <div className="aws-modal-mobile-content">
                <div className="aws-modal-mobile-eyebrow">{template.exampleMarket}</div>
                <h5>{template.exampleAgent}</h5>
                <div className="aws-modal-mobile-line" />
                <div className="aws-modal-mobile-line short" />
                <button className="aws-modal-mobile-cta">Schedule</button>
              </div>
            </div>
          </div>
        </div>
        <div className="aws-modal-aside">
          <p>{template.description}</p>
          <ul className="aws-modal-bestfor">
            {template.bestFor.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <div className="aws-modal-actions">
            <Link href={template.previewPath} className="aws-modal-primary">
              Open live preview
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/join#personal-website" className="aws-modal-secondary">
              Join RCRE
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgentWebsiteShowcase({
  heading = 'Your brand deserves more than a profile page.',
  intro = 'Every RCRE agent gets a professionally designed personal website, built around their market and their specialty. Choose the template that fits how you actually work — and bring your own URL when you’re ready.',
  ctaLabel = 'Explore Agent Websites',
  joinLabel = 'Join RCRE',
  compact = false,
}: {
  heading?: string
  intro?: string
  ctaLabel?: string
  joinLabel?: string
  compact?: boolean
}) {
  const rootRef = useReveal()
  const [open, setOpen] = useState<ShowcaseTemplate | null>(null)
  const reduced = useReducedMotion()

  const featured = ['rcre-signature', 'rcre-luxury', 'rcre-rural', 'rcre-urban']
  const visible = compact ? TEMPLATES.filter((t) => featured.includes(t.id)) : TEMPLATES

  return (
    <section className="aws-root" aria-label="Agent website templates" ref={rootRef}>
      <div className="public-wrap aws-header" data-show-reveal>
        <p className="aws-kicker">A website, not a profile page</p>
        <h2 className="aws-title">{heading}</h2>
        <p className="aws-lead">{intro}</p>
        <div className="aws-actions">
          <button type="button" className="aws-cta-primary" onClick={() => setOpen(TEMPLATES[0])}>
            {ctaLabel}
            <span aria-hidden="true">→</span>
          </button>
          <Link href="/join#personal-website" className="aws-cta-secondary">
            {joinLabel}
          </Link>
        </div>
      </div>

      <div className={`aws-grid${reduced ? ' aws-reduced' : ''}`}>
        {visible.map((t) => (
          <button
            key={t.id}
            type="button"
            className="aws-card"
            onClick={() => setOpen(t)}
            data-show-reveal
            aria-label={`Open preview of ${t.name} template`}
          >
            <ThemedPreview template={t} />
            <div className="aws-card-meta">
              <div className="aws-card-meta-row">
                <h3>{t.name}</h3>
                <span className="aws-card-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
              <p className="aws-card-tag">{t.tagline}</p>
              <ul className="aws-card-bestfor">
                {t.bestFor.slice(0, 3).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="aws-card-example">
                <span aria-hidden="true">●</span>
                {t.exampleAgent} · {t.exampleMarket}
              </p>
            </div>
          </button>
        ))}
      </div>

      {!compact && (
        <div className="aws-grid-after">
          <div className="public-wrap aws-capabilities" data-show-reveal>
            <div className="aws-cap">
              <p className="aws-cap-kicker">Your own URL</p>
              <p>
                Designed to support your own custom domain. RCRE hosted URL, branded path, or your own domain — the
                routing is in place.
              </p>
            </div>
            <div className="aws-cap">
              <p className="aws-cap-kicker">Connected</p>
              <p>
                Integrated with RCRE CRM, lead capture, RCRE Today, and Preferred Lender resources. Your site talks
                to your work.
              </p>
            </div>
            <div className="aws-cap">
              <p className="aws-cap-kicker">Mobile-first</p>
              <p>
                Every template is designed for the phone first. Real estate conversion happens on mobile — and
                your site will be ready.
              </p>
            </div>
            <div className="aws-cap">
              <p className="aws-cap-kicker">SEO + AEO ready</p>
              <p>
                Unique titles, schema, sitemap, and structured data for every page. Market-level and listing-level
                depth, not generic copy.
              </p>
            </div>
          </div>
        </div>
      )}

      <PreviewModal template={open} onClose={() => setOpen(null)} />
    </section>
  )
}