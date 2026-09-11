/**
 * RCRE Urban Modern — Home Page
 * Route: /agent/jacksonville-urban
 *
 * Priya Nair · Urban REALTOR® · Jacksonville urban core
 * Theme: rcre-urban
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { UrbanLayout } from './UrbanLayout'
import { UrbanSEO } from './UrbanSEO'
import { UrbanContactForm } from './UrbanContactForm'
import './rcre-urban.css'

export const metadata: Metadata = {
  title: 'Priya Nair | RCRE Urban Modern, Jacksonville Urban Core',
  description:
    'Priya Nair — Urban REALTOR® with RCRE Group, specializing in Jacksonville urban core: Riverside, Avondale, San Marco, Downtown, and Brooklyn.',
}

const URBAN_CONFIG = {
  theme: 'rcre-urban' as const,
  markets: ['Riverside', 'Avondale', 'San Marco', 'Downtown Jacksonville', 'Brooklyn'],
  specialties: ['Urban Condo', 'Loft', 'Townhouse', 'Walkability', 'New Development', 'HOA Evaluation'],
  heroImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const FEATURED_BUILDINGS = [
  {
    id: 'b1',
    address: '1 W. Bay St, Jacksonville, FL 32202',
    priceRange: '$285K – $520K',
    beds: '1–3 bd',
    baths: '1–2 ba',
    keyAmenity: 'Rooftop terrace · Doorman · Fitness center',
    walkScore: 91,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80',
  },
  {
    id: 'b2',
    address: '1423 King St, Jacksonville, FL 32204',
    priceRange: '$395K – $675K',
    beds: '2–3 bd',
    baths: '2–2.5 ba',
    keyAmenity: 'Attached garage · Private courtyard · Walk to Five Points',
    walkScore: 88,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=700&q=80',
  },
  {
    id: 'b3',
    address: '2044 Miriam St, Jacksonville, FL 32207',
    priceRange: '$310K – $480K',
    beds: '1–2 bd',
    baths: '1–2 ba',
    keyAmenity: 'Pool · River views · Walking distance to Dog River',
    walkScore: 72,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80',
  },
]

const NEIGHBORHOODS = [
  {
    name: 'Riverside',
    desc: 'The walkable heartbeat of Jacksonville. Tree-lined streets, King Street dining, the Cummer Museum, and Riverside Park — all within easy reach. The housing stock runs from 1920s bungalows to modern condos.',
  },
  {
    name: 'Avondale',
    desc: 'Immediately west of Riverside, Avondale skews slightly more residential with some of the city\'s best neighborhood restaurants along St. John\'s Avenue. Tudor, craftsman, and updated mid-century mix.',
  },
  {
    name: 'San Marco',
    desc: 'Jacksonville\'s most walkable mixed-use neighborhood. The square, Marco Luther, and the Library are within a five-minute walk from most properties. Strong condo market with newer construction.',
  },
  {
    name: 'Downtown Jacksonville',
    desc: 'Southbank and the core have seen significant investment since 2020. Riverfront towers, the sports complex corridor, and emerging Brooklyn neighborhood offer different price points and building types.',
  },
  {
    name: 'Brooklyn',
    desc: 'The newest urban neighborhood in Jacksonville — a mix of warehouse loft conversions, new townhouse developments, and planned retail. Walkable between downtown and Riverside.',
  },
]

const KNOWLEDGE_BLOCKS = [
  {
    title: 'Building Types',
    desc: 'Condo, loft, townhouse, and mixed-use. Each has a different HOA structure, financing profile, and resale pattern. I know the differences.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: 'HOA Evaluation',
    desc: 'I read HOA meeting minutes, reserve studies, and insurance claims before recommending a building. Bad HOAs are the most common surprise in urban condo purchases.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.9 0 3.63.6 5.05 1.61" />
      </svg>
    ),
  },
  {
    title: 'Walkability',
    desc: 'Walk Score, Bike Score, and transit access — I use them, cite them, and tell you what they actually mean for your daily routine. Not inflated claims.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="5" r="2" />
        <path d="M15 9l-3 3-3-3M12 8v4M7 21l5-9 5 9" />
      </svg>
    ),
  },
  {
    title: 'Market Timing',
    desc: 'Urban Jacksonville moves in cycles. Pre-construction, resale, off-market — timing matters. I share what I see, not what the listing says.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
    ),
  },
]

const TESTIMONIAL = {
  quote:
    "Priya walked us through six buildings before we found the right one. She knew which HOAs were well-managed, which were deferred maintenance, and which had the right mix of owner-occupancy. That context is what you hire for.",
  attr: '— Marcus D., Buyer, San Marco · 2025',
}

export default function UrbanHomePage() {
  const agent = getExampleAgent('jacksonville-urban')!
  const seo = buildHomeSEO(agent, URBAN_CONFIG)

  return (
    <>
      <head>
        <UrbanSEO seo={seo} />
      </head>
      <UrbanLayout agent={agent}>
        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <section className="urban-hero">
          <img
            src={agent.heroImage || URBAN_CONFIG.heroImage}
            alt="Jacksonville urban skyline at dusk"
            className="urban-hero-img"
            loading="eager"
          />
          <div className="urban-hero-overlay" />
          <div className="urban-hero-content">
            <p className="urban-hero-kicker">
              Jacksonville Urban Core · RCRE Group
            </p>
            <h1 className="urban-hero-title">
              Jacksonville Urban. From Someone Who Knows It.
            </h1>
            <p className="urban-hero-sub">
              Riverside · Avondale · San Marco · Downtown · Brooklyn
            </p>
            <Link href={`/agent/${agent.slug}/contact`} className="urban-hero-cta">
              Schedule a Tour
            </Link>
          </div>
        </section>

        {/* ── 2. Featured Buildings ─────────────────────────────────────────── */}
        <section className="urban-section">
          <div className="urban-wrap">
            <p className="urban-section-label">Current Roster</p>
            <h2 className="urban-section-title">Featured Buildings</h2>
            <p className="urban-section-sub">
              A selection of active and recent buildings in Jacksonville urban core.
            </p>

            <div className="urban-grid-3">
              {FEATURED_BUILDINGS.map((b) => (
                <article key={b.id} className="urban-card">
                  <div style={{ position: 'relative' }}>
                    <img
                      src={b.image}
                      alt={b.address}
                      className="urban-card-img"
                      loading="lazy"
                    />
                    <span className="urban-card-badge" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                      Walk {b.walkScore}
                    </span>
                  </div>
                  <div className="urban-card-body">
                    <p className="urban-card-price">{b.priceRange}</p>
                    <p className="urban-card-address">{b.address}</p>
                    <p className="urban-card-meta">
                      {b.beds} · {b.baths}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--urban-muted)', lineHeight: 1.5 }}>
                      {b.keyAmenity}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                href={`/agent/${agent.slug}/listings`}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--urban-accent)',
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                View All Listings →
              </Link>
            </p>
          </div>
        </section>

        <hr className="urban-hairline" />

        {/* ── 3. Neighborhoods Served ─────────────────────────────────────── */}
        <section className="urban-section">
          <div className="urban-wrap">
            <p className="urban-section-label">Service Area</p>
            <h2 className="urban-section-title">Neighborhoods I Know</h2>
            <p className="urban-section-sub">
              I work the Jacksonville urban core — not the suburbs, not the beach. These are my markets.
            </p>

            <div className="urban-neighborhoods">
              {NEIGHBORHOODS.map((n) => (
                <div key={n.name} className="urban-neighborhood-item">
                  <p className="urban-neighborhood-name">{n.name}</p>
                  <p className="urban-neighborhood-desc">{n.desc}</p>
                </div>
              ))}
            </div>

            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                href={`/agent/${agent.slug}/markets`}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--urban-accent)',
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                Neighborhood Guides →
              </Link>
            </p>
          </div>
        </section>

        <hr className="urban-hairline" />

        {/* ── 4. What I Know ────────────────────────────────────────────────── */}
        <section className="urban-section" style={{ backgroundColor: 'var(--urban-surface)' }}>
          <div className="urban-wrap">
            <p className="urban-section-label">Expertise</p>
            <h2 className="urban-section-title">What I Know</h2>

            <div className="urban-grid-4">
              {KNOWLEDGE_BLOCKS.map((k) => (
                <div key={k.title} className="urban-feature">
                  <div className="urban-feature-icon">{k.icon}</div>
                  <div>
                    <p className="urban-feature-title">{k.title}</p>
                    <p className="urban-feature-desc">{k.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="urban-hairline" />

        {/* ── 5. About ────────────────────────────────────────────────────── */}
        <section className="urban-section">
          <div className="urban-wrap">
            <div className="urban-about-grid">
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80'}
                  alt={agent.name}
                  className="urban-about-headshot"
                  loading="lazy"
                />
              </div>
              <div>
                <p className="urban-section-label">About</p>
                <h2
                  style={{
                    fontFamily: 'var(--urban-font-display)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: 700,
                    color: 'var(--urban-primary)',
                    letterSpacing: '-0.015em',
                    marginBottom: '0.5rem',
                  }}
                >
                  {agent.name}
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--urban-font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--urban-accent)',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '1.5rem',
                  }}
                >
                  {agent.title} · {agent.market}
                </p>
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: 'var(--urban-text)',
                    lineHeight: 1.8,
                    marginBottom: '1rem',
                  }}
                >
                  {agent.bio.slice(0, 420)}
                  {agent.bio.length > 420 ? '…' : ''}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {agent.markets?.map((m) => (
                    <span
                      key={m}
                      style={{
                        fontFamily: 'var(--urban-font-mono)',
                        fontSize: '0.65rem',
                        color: 'var(--urban-accent)',
                        backgroundColor: 'rgba(26,74,110,0.07)',
                        border: '1px solid rgba(26,74,110,0.2)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '2px',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/agent/${agent.slug}/about`}
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--urban-accent)',
                    textDecoration: 'none',
                    letterSpacing: '0.02em',
                  }}
                >
                  Full bio →
                </Link>
                <p className="urban-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="urban-hairline" />

        {/* ── 6. Testimonial ───────────────────────────────────────────────── */}
        <section className="urban-section" style={{ backgroundColor: 'var(--urban-surface)' }}>
          <div className="urban-wrap">
            <div className="urban-testimonial">
              <p className="urban-quote">{TESTIMONIAL.quote}</p>
              <p className="urban-quote-attr">{TESTIMONIAL.attr}</p>
            </div>
          </div>
        </section>

        <hr className="urban-hairline" />

        {/* ── 7. Contact ──────────────────────────────────────────────────── */}
        <section className="urban-section">
          <div className="urban-wrap">
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <UrbanContactForm agent={agent} />
            </div>
          </div>
        </section>

        {/* ── Footer CTA ─────────────────────────────────────────────────── */}
        <div className="urban-cta-section">
          <h2>Ready to see the city?</h2>
          <p>
            {agent.name.split(' ')[0]} specializes in Jacksonville urban core — Riverside, Avondale, San Marco, Downtown, and Brooklyn.
          </p>
          <Link href={`/agent/${agent.slug}/contact`} className="urban-hero-cta">
            Schedule a Tour
          </Link>
        </div>
      </UrbanLayout>
    </>
  )
}
