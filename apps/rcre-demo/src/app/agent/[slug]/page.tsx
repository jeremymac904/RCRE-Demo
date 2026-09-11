/**
 * Agent Home Page
 * Route: /agent/[slug]
 *
 * The main published agent website home page.
 * Uses the RCRE Signature theme layout with all standard sections.
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAgentProfile, getWebsiteConfig, getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { AgentWebsiteThemeProvider } from '@/components/agent-website/theme-context'
import { AgentWebsiteLayout } from '@/components/agent-website/AgentWebsiteLayout'
import { SEOMetadata } from '@/components/agent-website/SEOMetadata'
import '@/components/agent-website/agent-website.css'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const agent = getAgentProfile(slug) || getExampleAgent(slug as keyof typeof import('@/lib/agent-website/agent-service').EXAMPLE_AGENTS)
  if (!agent) return { title: 'Agent Not Found' }
  const config = getWebsiteConfig(slug)
  if (!config) return { title: 'Agent Not Found' }
  const seo = buildHomeSEO(agent as Parameters<typeof buildHomeSEO>[0], config)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: seo.ogImage ? [{ url: seo.ogImage }] : [],
    },
  }
}

// ---------------------------------------------------------------------------
// Placeholder listings
// ---------------------------------------------------------------------------

const PLACEHOLDER_LISTINGS = [
  {
    id: 'l1',
    address: '4821 Colonial Ave, Jacksonville, FL 32210',
    price: 485000,
    beds: 4,
    baths: 3,
    sqft: 2410,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
  },
  {
    id: 'l2',
    address: '1204 Magnolia St, Birmingham, AL 35216',
    price: 395000,
    beds: 3,
    baths: 2,
    sqft: 1920,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
  },
  {
    id: 'l3',
    address: '8703 Shore Dr, Ponte Vedra Beach, FL 32082',
    price: 725000,
    beds: 5,
    baths: 3.5,
    sqft: 3180,
    status: 'Pending' as const,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
  },
]

// ---------------------------------------------------------------------------
// Derived stats (deterministic from slug)
// ---------------------------------------------------------------------------

function getAgentStats(slug: string) {
  const hash = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return {
    years: 5 + (hash % 15),
    transactions: 35 + (hash % 120),
    clients: 60 + (hash % 200),
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AgentHomePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Try profile first, fall back to example agents
  let agent = getAgentProfile(slug)
  if (!agent) {
    // @ts-expect-error - dynamic key lookup on EXAMPLE_AGENTS
    agent = getExampleAgent(slug) || null
  }

  if (!agent) notFound()

  const config = getWebsiteConfig(slug)
  if (!config) notFound()

  const seo = buildHomeSEO(agent, config)
  const stats = getAgentStats(slug)
  const heroImage = config.heroImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80'
  const markets = config.markets?.length ? config.markets : agent.markets || [agent.market]

  return (
    <AgentWebsiteThemeProvider
      theme={config.theme || 'rcre-signature'}
      profile={agent}
      config={config}
    >
      {/* SEO */}
      <head>
        <SEOMetadata seo={seo} />
      </head>

      <AgentWebsiteLayout agent={agent}>
        {/* 1. Hero */}
        <section className="agent-hero" style={{ minHeight: '580px' }}>
          <img
            src={heroImage}
            alt={`${agent.name} — ${agent.market} real estate`}
            className="agent-hero-bg"
            loading="eager"
          />
          <div className="agent-hero-overlay" />
          <div className="agent-hero-content">
            <p className="agent-hero-kicker">{agent.market}</p>
            <h1 className="agent-hero-title">
              {config.headline || agent.tagline || agent.bio.slice(0, 60)}
            </h1>
            <p className="agent-hero-sub">{agent.tagline}</p>
            <div className="agent-hero-ctas">
              <Link
                href={`/agent/${agent.slug}/contact`}
                className="agent-btn-primary"
              >
                Schedule a Consultation
              </Link>
              <Link
                href={`/agent/${agent.slug}/listings`}
                className="agent-btn-outline"
                style={{ borderColor: '#ffffff', color: '#ffffff' }}
              >
                Browse Listings
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Quick Stats */}
        <section className="agent-stats">
          <div className="agent-stats-inner">
            <div>
              <p className="agent-stat-number">{stats.years}+</p>
              <p className="agent-stat-label">Years Experience</p>
            </div>
            <div>
              <p className="agent-stat-number">{stats.transactions}+</p>
              <p className="agent-stat-label">Transactions Closed</p>
            </div>
            <div>
              <p className="agent-stat-number">{stats.clients}+</p>
              <p className="agent-stat-label">Clients Served</p>
            </div>
          </div>
        </section>

        {/* 3. Featured Listings */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            <p className="agent-section-label">Active Listings</p>
            <h2 className="agent-section-title">Featured Properties</h2>
            <p className="agent-section-sub" style={{ marginBottom: '2.5rem' }}>
              A selection of current listings represented by {agent.name}.
            </p>

            <div className="agent-grid-3">
              {PLACEHOLDER_LISTINGS.map((listing) => (
                <article key={listing.id} className="agent-card">
                  <div style={{ position: 'relative' }}>
                    <img
                      src={listing.image}
                      alt={listing.address}
                      className="agent-listing-card-image"
                      loading="lazy"
                    />
                    {listing.status === 'Pending' && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '0.75rem',
                          left: '0.75rem',
                          backgroundColor: 'rgba(234,179,8,0.9)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '99px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="agent-listing-card-body">
                    <p className="agent-listing-price">
                      ${listing.price.toLocaleString()}
                    </p>
                    <p className="agent-listing-address">{listing.address}</p>
                    <p className="agent-listing-meta">
                      {listing.beds} bd · {listing.baths} ba · {listing.sqft.toLocaleString()} sqft
                    </p>
                    <Link
                      href={`/agent/${agent.slug}/listings`}
                      style={{
                        display: 'inline-block',
                        marginTop: '0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-accent, #c9a84c)',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      View details →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Link href={`/agent/${agent.slug}/listings`} className="agent-btn-outline">
                View All Listings
              </Link>
            </div>
          </div>
        </section>

        {/* 4. Markets Served */}
        <section
          className="agent-section-sm"
          style={{ backgroundColor: 'var(--color-surface, #ffffff)', borderTop: '1px solid var(--color-border, #e5e0d8)', borderBottom: '1px solid var(--color-border, #e5e0d8)' }}
        >
          <div className="agent-wrap">
            <p className="agent-section-label">Service Areas</p>
            <h2 className="agent-section-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
              Markets I Serve
            </h2>
            <p className="agent-section-sub" style={{ marginBottom: '1.5rem' }}>
              Local knowledge across {markets.length > 1 ? `${markets.length} markets` : 'the region'}.
            </p>
            <div className="agent-markets-scroll">
              {markets.map((m) => (
                <Link key={m} href={`/agent/${agent.slug}/markets`} className="agent-market-pill">
                  {m}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 5. How I Work */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            <p className="agent-section-label">How I Work</p>
            <h2 className="agent-section-title">Representation That Works for You</h2>

            <div className="agent-grid-3" style={{ marginTop: '2.5rem' }}>
              {[
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <polyline points="9,22 9,12 15,12 15,22" />
                    </svg>
                  ),
                  title: 'Buyer Representation',
                  desc: 'Search, analyze, negotiate, and close — with your interests at the center of every decision. No pressure, no shortcuts.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  ),
                  title: 'Seller Representation',
                  desc: 'From pricing strategy through closing, I manage the process so your sale moves smoothly and you understand every step.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  ),
                  title: 'Investment Analysis',
                  desc: 'For buyers looking at income properties, I provide the data and context to evaluate returns and make an informed decision.',
                },
              ].map((f) => (
                <div key={f.title}>
                  <div className="agent-feature-icon">{f.icon}</div>
                  <h3 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary, #1a2e4a)' }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.7 }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. About Preview */}
        <section
          className="agent-section"
          style={{ backgroundColor: 'var(--color-surface, #ffffff)', borderTop: '1px solid var(--color-border, #e5e0d8)' }}
        >
          <div className="agent-wrap">
            <div className="agent-about-split">
              {/* Headshot */}
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'}
                  alt={agent.name}
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    aspectRatio: '4/5',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    display: 'block',
                  }}
                />
              </div>

              {/* Bio */}
              <div>
                <p className="agent-section-label">About</p>
                <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, color: 'var(--color-primary, #1a2e4a)', marginBottom: '0.5rem' }}>
                  {agent.name}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-accent, #c9a84c)', fontWeight: 600, marginBottom: '1.25rem' }}>
                  {agent.title} · {agent.market}
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--color-text, #1a1a1a)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  {agent.bio.slice(0, 320)}
                  {agent.bio.length > 320 ? '…' : ''}
                </p>
                <Link href={`/agent/${agent.slug}/about`} className="agent-btn-outline" style={{ display: 'inline-block' }}>
                  Read More About {agent.name.split(' ')[0]} →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Resources */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            <p className="agent-section-label">Guides & Tools</p>
            <h2 className="agent-section-title">Resources for Buyers & Sellers</h2>
            <p className="agent-section-sub" style={{ marginBottom: '2.5rem' }}>
              Free guides to help you make informed decisions at every stage.
            </p>

            <div className="agent-grid-3">
              {[
                {
                  title: 'First-Time Buyer Guide',
                  desc: 'Everything you need to know about financing, agent selection, and the purchase process in one place.',
                  href: `#`,
                },
                {
                  title: 'Seller Checklist',
                  desc: 'A practical pre-listing checklist covering repairs, disclosures, pricing strategy, and show-ready preparation.',
                  href: `#`,
                },
                {
                  title: 'Market Update',
                  desc: `Current conditions and trends in ${agent.market}. Updated regularly — a starting point, not a prediction.`,
                  href: `#`,
                },
              ].map((r) => (
                <article key={r.title} className="agent-card">
                  <div className="agent-card-body">
                    <div className="agent-resource-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary, #1a2e4a)' }}>
                      {r.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.6 }}>
                      {r.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Link href={`/agent/${agent.slug}/resources`} className="agent-btn-outline">
                View All Resources
              </Link>
            </div>
          </div>
        </section>

        {/* 8. Preferred Lender */}
        <section
          className="agent-section-sm"
          style={{ backgroundColor: 'var(--color-surface, #ffffff)', borderTop: '1px solid var(--color-border, #e5e0d8)' }}
        >
          <div className="agent-wrap">
            <div className="agent-lender-card">
              <div style={{ flexShrink: 0 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #c9a84c)" strokeWidth="1.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-primary, #1a2e4a)' }}>
                  RCRE Preferred Lender: Jeremy McDonald
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  Financing is available through Jeremy McDonald, RCRE&apos;s preferred lender partner. A trusted lender referral
                  is provided as a convenience — you may choose any lender.
                </p>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <a
                    href="tel:+19045320068"
                    style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent, #c9a84c)', textDecoration: 'none' }}
                  >
                    (904) 532-0068
                  </a>
                  <Link
                    href="/financing"
                    style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary, #1a2e4a)', textDecoration: 'none' }}
                  >
                    Financing overview →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Contact CTA */}
        <section className="agent-cta-section">
          <div className="agent-wrap">
            <h2>Ready to start? Let&apos;s talk.</h2>
            <p>
              {agent.name.split(' ')[0]} is available for consultations in {agent.market}.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href={`/agent/${agent.slug}/contact`}
                className="agent-btn-primary"
                style={{ fontSize: '1rem', padding: '0.875rem 2.5rem' }}
              >
                Schedule a Consultation
              </Link>
              <a
                href={`tel:${agent.phone.replace(/\D/g, '')}`}
                style={{
                  display: 'inline-block',
                  padding: '0.875rem 2rem',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                {agent.phone}
              </a>
            </div>
          </div>
        </section>
      </AgentWebsiteLayout>
    </AgentWebsiteThemeProvider>
  )
}
