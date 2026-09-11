/**
 * Agent Listings Page
 * Route: /agent/[slug]/listings
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAgentProfile, getWebsiteConfig, getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildListingsSEO } from '@/lib/agent-website/seo'
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
  const seo = buildListingsSEO(agent as Parameters<typeof buildListingsSEO>[0], config)
  return { title: seo.title, description: seo.description }
}

// Realistic placeholder listings for FL/AL markets
const PLACEHOLDER_LISTINGS = [
  {
    id: 'l1',
    address: '4821 Colonial Ave, Jacksonville, FL 32210',
    city: 'Jacksonville',
    price: 485000,
    beds: 4,
    baths: 3,
    sqft: 2410,
    lotSize: '0.28 acres',
    yearBuilt: 1998,
    status: 'Active' as const,
    type: 'Single Family',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
    description: 'Well-maintained colonial on a quiet street in Mandarin. Updated kitchen, hardwood floors throughout, and a private backyard with mature trees.',
  },
  {
    id: 'l2',
    address: '1204 Magnolia St, Birmingham, AL 35216',
    city: 'Birmingham',
    price: 395000,
    beds: 3,
    baths: 2,
    sqft: 1920,
    lotSize: '0.22 acres',
    yearBuilt: 1978,
    status: 'Active' as const,
    type: 'Single Family',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
    description: 'Charming cottage in Mountain Brook with updated systems, open floor plan, and a private garden. Walking distance to Mountain Brook Village.',
  },
  {
    id: 'l3',
    address: '8703 Shore Dr, Ponte Vedra Beach, FL 32082',
    city: 'Ponte Vedra Beach',
    price: 725000,
    beds: 5,
    baths: 3.5,
    sqft: 3180,
    lotSize: '0.41 acres',
    yearBuilt: 2004,
    status: 'Pending' as const,
    type: 'Single Family',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
    description: 'Intracoastal community home with a pool, chef\'s kitchen, and guest suite. Community dock access and a short drive to the beach.',
  },
  {
    id: 'l4',
    address: '3312 Hendricks Ave, Jacksonville, FL 32207',
    city: 'San Marco',
    price: 549000,
    beds: 3,
    baths: 2,
    sqft: 2140,
    lotSize: '0.18 acres',
    yearBuilt: 1948,
    status: 'Active' as const,
    type: 'Single Family',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
    description: 'San Marco bungalow with original hardwoods, a renovated kitchen and baths, and a private courtyard. Steps from the square.',
  },
  {
    id: 'l5',
    address: '5560 Lakewood Blvd, Jacksonville, FL 32205',
    city: 'Jacksonville',
    price: 319000,
    beds: 3,
    baths: 1.5,
    sqft: 1560,
    lotSize: '0.24 acres',
    yearBuilt: 1962,
    status: 'Active' as const,
    type: 'Single Family',
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80',
    description: 'Solid brick ranch in Fairfax with updated electrical and HVAC. Original hardwoods under carpet. Detached garage with workshop potential.',
  },
  {
    id: 'l6',
    address: '8902 Perimeter Park Blvd, Unit 14, Jacksonville, FL 32216',
    city: 'Jacksonville',
    price: 215000,
    beds: 2,
    baths: 2,
    sqft: 1180,
    lotSize: 'n/a',
    yearBuilt: 1985,
    status: 'Active' as const,
    type: 'Condo',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
    description: 'Ground-floor condo in Perimeter Park with vaulted ceilings, updated kitchen, and private patio. Community pool and fitness center.',
  },
]

const STATUS_LABELS: Record<string, string> = {
  Active: 'Active',
  Pending: 'Sale Pending',
  Sold: 'Sold',
}

export default async function AgentListingsPage({
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

  const seo = buildListingsSEO(agent, config)

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
        <section className="agent-page-hero">
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <p className="agent-hero-kicker">Listings</p>
            <h1>Properties for Sale</h1>
            <p>Active listings represented by {agent.name} in {agent.market}. Contact directly for showing requests.</p>
          </div>
        </section>

        {/* Listings */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            {/* Filter bar (placeholder) */}
            <div className="agent-filter-bar">
              <select className="agent-filter-select" defaultValue="">
                <option value="">All Markets</option>
                <option>Jacksonville</option>
                <option>Birmingham</option>
                <option>Ponte Vedra</option>
              </select>
              <select className="agent-filter-select" defaultValue="">
                <option value="">Price Range</option>
                <option>Under $300K</option>
                <option>$300K – $500K</option>
                <option>$500K – $750K</option>
                <option>$750K+</option>
              </select>
              <select className="agent-filter-select" defaultValue="">
                <option value="">Beds / Baths</option>
                <option>3+ bed</option>
                <option>4+ bed</option>
                <option>5+ bed</option>
              </select>
              <select className="agent-filter-select" defaultValue="">
                <option value="">Property Type</option>
                <option>Single Family</option>
                <option>Condo</option>
                <option>Townhouse</option>
              </select>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: '1.5rem' }}>
              {PLACEHOLDER_LISTINGS.length} listings · Synthetic property data for review purposes
            </p>

            {/* Listings grid */}
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
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <span
                        style={{
                          backgroundColor: listing.status === 'Active' ? 'rgba(22,101,52,0.9)' : 'rgba(234,179,8,0.9)',
                          color: '#ffffff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '99px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {STATUS_LABELS[listing.status]}
                      </span>
                      <span
                        style={{
                          backgroundColor: 'rgba(26,46,74,0.8)',
                          color: '#ffffff',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '99px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {listing.type}
                      </span>
                    </div>
                  </div>
                  <div className="agent-listing-card-body">
                    <p className="agent-listing-price">
                      ${listing.price.toLocaleString()}
                    </p>
                    <p className="agent-listing-address">{listing.address}</p>
                    <p className="agent-listing-meta">
                      {listing.beds} bd · {listing.baths} ba · {listing.sqft.toLocaleString()} sqft
                      {listing.lotSize !== 'n/a' ? ` · ${listing.lotSize} lot` : ''}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #6b7280)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                      {listing.description}
                    </p>
                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)' }}>
                        Built {listing.yearBuilt}
                      </span>
                      <Link
                        href={`/agent/${agent.slug}/contact`}
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--color-accent, #c9a84c)',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Inquire →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Contact CTA */}
            <div
              style={{
                marginTop: '3rem',
                padding: '2rem',
                backgroundColor: 'var(--color-surface, #ffffff)',
                border: '1px solid var(--color-border, #e5e0d8)',
                borderRadius: '4px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: '0.75rem' }}>
                Don&apos;t see the right property? {agent.name.split(' ')[0]} can search the full MLS and bring you listings before they hit the public market.
              </p>
              <Link href={`/agent/${agent.slug}/contact`} className="agent-btn-primary">
                Set Up a Custom Search
              </Link>
            </div>
          </div>
        </section>
      </AgentWebsiteLayout>
    </AgentWebsiteThemeProvider>
  )
}
