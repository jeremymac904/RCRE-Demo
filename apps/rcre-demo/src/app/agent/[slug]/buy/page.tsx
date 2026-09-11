/**
 * Agent Buy Page
 * Route: /agent/[slug]/buy
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
  return { title: `Find Your Next Home | ${agent.name} | RCRE`, description: seo.description }
}

const FEATURED_BUY_LISTINGS = [
  {
    id: 'b1',
    address: '4821 Colonial Ave, Jacksonville, FL 32210',
    price: 485000,
    beds: 4,
    baths: 3,
    sqft: 2410,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
  },
  {
    id: 'b2',
    address: '1204 Magnolia St, Birmingham, AL 35216',
    price: 395000,
    beds: 3,
    baths: 2,
    sqft: 1920,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
  },
  {
    id: 'b3',
    address: '3312 Hendricks Ave, Jacksonville, FL 32207',
    price: 549000,
    beds: 3,
    baths: 2,
    sqft: 2140,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
  },
]

export default async function AgentBuyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let agent = getAgentProfile(slug)
  if (!agent) {
    // @ts-expect-error - dynamic key
    agent = getExampleAgent(slug) || null
  }
  if (!agent) notFound()

  const config = getWebsiteConfig(slug)
  if (!config) notFound()

  const seo = buildHomeSEO(agent, config)

  return (
    <AgentWebsiteThemeProvider
      theme={config.theme || 'rcre-signature'}
      profile={agent}
      config={config}
    >
      <head>
        <SEOMetadata seo={seo} />
      </head>

      <AgentWebsiteLayout agent={agent}>
        {/* Page Hero */}
        <section className="agent-hero" style={{ minHeight: '480px' }}>
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80"
            alt="Find your next home"
            className="agent-hero-bg"
            loading="eager"
          />
          <div className="agent-hero-overlay" />
          <div className="agent-hero-content">
            <p className="agent-hero-kicker">Buyer Services</p>
            <h1 className="agent-hero-title">Find Your Next Home</h1>
            <p className="agent-hero-sub">
              {agent.name.split(' ')[0]} provides structured buyer representation — search, analysis, negotiation, and closing support — with your interests at the center.
            </p>
            <div className="agent-hero-ctas">
              <Link href={`/agent/${agent.slug}/contact`} className="agent-btn-primary">
                Start the Search
              </Link>
              <Link href={`/agent/${agent.slug}/listings`} className="agent-btn-outline" style={{ borderColor: '#ffffff', color: '#ffffff' }}>
                Browse Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Quick search placeholder */}
        <section
          className="agent-section-sm"
          style={{ backgroundColor: 'var(--color-surface, #ffffff)', borderBottom: '1px solid var(--color-border, #e5e0d8)' }}
        >
          <div className="agent-wrap">
            <div
              style={{
                backgroundColor: 'var(--color-bg, #faf8f5)',
                border: '1px solid var(--color-border, #e5e0d8)',
                borderRadius: '4px',
                padding: '1.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
                alignItems: 'end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Market
                </label>
                <select className="agent-filter-select" style={{ width: '100%' }}>
                  <option value="">Select market</option>
                  <option>Jacksonville</option>
                  <option>Birmingham</option>
                  <option>Ponte Vedra</option>
                  <option>St. Johns County</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Price Range
                </label>
                <select className="agent-filter-select" style={{ width: '100%' }}>
                  <option value="">Any price</option>
                  <option>Under $300K</option>
                  <option>$300K – $500K</option>
                  <option>$500K – $750K</option>
                  <option>$750K+</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bedrooms
                </label>
                <select className="agent-filter-select" style={{ width: '100%' }}>
                  <option value="">Any</option>
                  <option>2+</option>
                  <option>3+</option>
                  <option>4+</option>
                  <option>5+</option>
                </select>
              </div>
              <div>
                <Link href={`/agent/${agent.slug}/listings`} className="agent-btn-primary" style={{ display: 'block', textAlign: 'center', width: '100%' }}>
                  Search Listings
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured listings */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            <p className="agent-section-label">Active Listings</p>
            <h2 className="agent-section-title">Featured Properties</h2>
            <p className="agent-section-sub" style={{ marginBottom: '2.5rem' }}>
              A selection of active listings in {agent.market}. Request a showing through the contact form.
            </p>

            <div className="agent-grid-3">
              {FEATURED_BUY_LISTINGS.map((listing) => (
                <article key={listing.id} className="agent-card">
                  <div style={{ position: 'relative' }}>
                    <img src={listing.image} alt={listing.address} className="agent-listing-card-image" loading="lazy" />
                  </div>
                  <div className="agent-listing-card-body">
                    <p className="agent-listing-price">${listing.price.toLocaleString()}</p>
                    <p className="agent-listing-address">{listing.address}</p>
                    <p className="agent-listing-meta">
                      {listing.beds} bd · {listing.baths} ba · {listing.sqft.toLocaleString()} sqft
                    </p>
                    <Link
                      href={`/agent/${agent.slug}/contact`}
                      style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-accent, #c9a84c)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Request showing →
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

        {/* Buyer resources */}
        <section
          className="agent-section"
          style={{ backgroundColor: 'var(--color-surface, #ffffff)', borderTop: '1px solid var(--color-border, #e5e0d8)' }}
        >
          <div className="agent-wrap">
            <p className="agent-section-label">For Buyers</p>
            <h2 className="agent-section-title">Buyer Resources</h2>

            <div className="agent-grid-3" style={{ marginTop: '2rem' }}>
              {[
                {
                  title: 'First-Time Buyer Guide',
                  desc: 'A practical overview of the entire purchase process — from mortgage pre-approval to closing.',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <polyline points="9,22 9,12 15,12 15,22" />
                    </svg>
                  ),
                },
                {
                  title: 'Mortgage Financing Overview',
                  desc: 'Understand loan programs, down payments, and what to expect from the lending process.',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="4" width="22" height="16" rx="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  ),
                },
                {
                  title: 'Neighborhood Market Guide',
                  desc: `Current conditions in ${agent.market}. A starting point for understanding supply, demand, and pricing trends.`,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  ),
                },
              ].map((r) => (
                <article key={r.title} className="agent-card">
                  <div className="agent-card-body">
                    <div className="agent-resource-icon">{r.icon}</div>
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

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href={`/agent/${agent.slug}/resources`} className="agent-btn-outline">
                View All Buyer Resources
              </Link>
            </div>
          </div>
        </section>

        {/* Preferred lender */}
        <section
          className="agent-section-sm"
          style={{ backgroundColor: 'var(--color-bg, #faf8f5)', borderTop: '1px solid var(--color-border, #e5e0d8)' }}
        >
          <div className="agent-wrap">
            <div className="agent-lender-card">
              <div style={{ flexShrink: 0 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #c9a84c)" strokeWidth="1.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-primary, #1a2e4a)' }}>
                  RCRE Preferred Lender: Jeremy McDonald
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  Get pre-approved before you shop. Jeremy McDonald, RCRE&apos;s preferred lender, can walk you through your options. You may choose any lender.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <a href="tel:+19045320068" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent, #c9a84c)', textDecoration: 'none' }}>
                    (904) 532-0068
                  </a>
                  <Link href="/financing" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary, #1a2e4a)', textDecoration: 'none' }}>
                    Financing overview →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="agent-cta-section">
          <div className="agent-wrap">
            <h2>Looking for the right property?</h2>
            <p>Share your criteria and {agent.name.split(' ')[0]} will set up a custom search and follow up with matching listings.</p>
            <Link href={`/agent/${agent.slug}/contact`} className="agent-btn-primary" style={{ fontSize: '1rem', padding: '0.875rem 2.5rem' }}>
              Start a Search
            </Link>
          </div>
        </section>
      </AgentWebsiteLayout>
    </AgentWebsiteThemeProvider>
  )
}
