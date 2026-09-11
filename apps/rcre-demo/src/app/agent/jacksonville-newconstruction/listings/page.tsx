/**
 * RCRE New Construction — Listings Page
 * Route: /agent/jacksonville-newconstruction/listings
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildListingsSEO } from '@/lib/agent-website/seo'
import { NewConstructionLayout } from '../NewConstructionLayout'
import { NewConstructionSEO } from '../NewConstructionSEO'
import '../newconstruction.css'

export const metadata: Metadata = {
  title: 'New Home Communities | Marcus Webb | RCRE New Construction',
  description: 'Active new construction communities in Northeast Florida — Nocatee, Silverleaf, Durbin Creek. Listings by Marcus Webb, RCRE Group.',
}

const NC_CONFIG = {
  theme: 'rcre-new-construction' as const,
  markets: ['Nocatee', 'Silverleaf', 'Durbin Creek', 'Jacksonville New Development', 'St. Johns County'],
  specialties: ['New Construction', 'Builder Representation', 'Pre-Construction', 'Design Center', 'Warranty Review'],
  heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

// Simulated active new home listings
const LISTINGS = [
  {
    id: 'l1',
    community: 'Nocatee — Phase 17',
    address: 'Lot 247, Nocatee Crossing, St. Johns, FL 32081',
    builder: 'Mattamy Homes',
    price: 524900,
    sqft: 2480,
    beds: 4,
    baths: 3,
    garage: 2,
    lotSize: '0.18 acres',
    status: 'Under Construction',
    estCompletion: 'Q1 2027',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
  },
  {
    id: 'l2',
    community: 'Silverleaf — Custom Lot 51',
    address: 'Silverleaf Ave, St. Johns, FL 32081',
    builder: 'Standard Pacific',
    price: 789000,
    sqft: 3120,
    beds: 5,
    baths: 4,
    garage: 3,
    lotSize: '0.42 acres',
    status: 'Pre-Construction',
    estCompletion: 'Q3 2027',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80',
  },
  {
    id: 'l3',
    community: 'Durbin Creek — Lennar Release 12',
    address: 'Durbin Bluff Trail, Jacksonville, FL 32259',
    builder: 'Lennar',
    price: 462500,
    sqft: 2210,
    beds: 3,
    baths: 2.5,
    garage: 2,
    lotSize: '0.12 acres',
    status: 'Move-In Ready',
    estCompletion: 'Available Now',
    image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=700&q=80',
  },
  {
    id: 'l4',
    community: 'Nocatee — Pulte Phase 9',
    address: 'Del Webb Pkwy, St. Johns, FL 32081',
    builder: 'PulteGroup',
    price: 589000,
    sqft: 2750,
    beds: 4,
    baths: 3.5,
    garage: 3,
    lotSize: '0.22 acres',
    status: 'Under Construction',
    estCompletion: 'Q2 2027',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80',
  },
]

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function ListingsPage() {
  const agent = getExampleAgent('jacksonville-newconstruction')!
  const seo = buildListingsSEO(agent, NC_CONFIG)

  return (
    <>
      <head><NewConstructionSEO seo={seo} /></head>
      <NewConstructionLayout agent={agent}>
        {/* Hero */}
        <section style={{ backgroundColor: 'var(--nc-primary)', padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.5rem' }}>
            Listings
          </p>
          <h1 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
            New Construction Listings
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.65 }}>
            Active new home listings in Northeast Florida. Pricing, availability, and completion dates
            are subject to builder confirmation.
          </p>
        </section>

        {/* Listings grid */}
        <section className="nc-section">
          <div className="nc-wrap">
            <div className="nc-grid-3">
              {LISTINGS.map((listing) => (
                <article key={listing.id} className="nc-card">
                  <div style={{ position: 'relative' }}>
                    <img src={listing.image} alt={listing.community} className="nc-card-img" loading="lazy" />
                    <span style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'var(--nc-cta)', color: '#fff', fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: 'var(--nc-radius)' }}>
                      {listing.status}
                    </span>
                  </div>
                  <div className="nc-card-body">
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--nc-accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                      {listing.community}
                    </p>
                    <p className="nc-card-price">{formatPrice(listing.price)}</p>
                    <p className="nc-card-meta">{listing.address}</p>
                    <p className="nc-card-meta">Builder: {listing.builder}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                      <span className="nc-card-tag">{listing.beds} bd</span>
                      <span className="nc-card-tag">{listing.baths} ba</span>
                      <span className="nc-card-tag">{listing.sqft.toLocaleString()} sqft</span>
                      <span className="nc-card-tag">{listing.garage} gar</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--nc-muted)', marginBottom: '1rem' }}>
                      Lot: {listing.lotSize} · Est. completion: {listing.estCompletion}
                    </p>
                    <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-card-link">
                      Inquire about this home →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--nc-muted)' }}>
              Don&apos;t see the right community or floor plan?{' '}
              <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-card-link">
                Let&apos;s build a search together →
              </Link>
            </p>
          </div>
        </section>

        <div className="nc-cta-section">
          <h2>Looking for something specific?</h2>
          <p>Tell us the community, budget, and floor plan you want — we&apos;ll track the next release.</p>
          <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-hero-cta">
            Build My Search
          </Link>
        </div>
      </NewConstructionLayout>
    </>
  )
}
