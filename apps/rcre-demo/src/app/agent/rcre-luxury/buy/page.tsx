/**
 * RCRE Luxury — Buy Page
 * Route: /agent/jacksonville-luxury/buy
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { LuxuryLayout } from '../LuxuryLayout'
import { LuxurySEO } from '../LuxurySEO'
import '../luxury.css'

export const metadata: Metadata = {
  title: 'Find a Residence of Distinction | Alexandra Whitfield | RCRE Luxury',
}

const LUXURY_CONFIG = {
  theme: 'rcre-luxury' as const,
  markets: ['Ponte Vedra', 'Nocatee', 'Southbank', 'Mandarin', 'Intracoastal Waterway'],
  specialties: ['Waterfront', 'Luxury Estates', 'Relocation', 'Intracoastal', 'New Construction'],
  heroImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const BUY_LISTINGS = [
  {
    id: 'b1',
    address: '1200 Ponte Vedra Blvd, Ponte Vedra Beach, FL 32082',
    price: 4850000,
    beds: 6,
    baths: 5.5,
    sqft: 7420,
    architect: 'Merritt & Pappas Architecture',
    year: 2018,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
  },
  {
    id: 'b2',
    address: '445 Nocatee Pkwy, St. Johns, FL 32081',
    price: 2975000,
    beds: 5,
    baths: 4,
    sqft: 5880,
    architect: 'Pulte Homes',
    year: 2021,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80',
  },
  {
    id: 'b3',
    address: '3333 Southbank Dr, Jacksonville, FL 32207',
    price: 1850000,
    beds: 4,
    baths: 3.5,
    sqft: 4210,
    architect: 'Local custom',
    year: 2014,
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80',
  },
]

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function LuxuryBuyPage() {
  const agent = getExampleAgent('jacksonville-luxury')!
  const seo = buildHomeSEO(agent, LUXURY_CONFIG)

  return (
    <>
      <head>
        <LuxurySEO seo={seo} />
      </head>
      <LuxuryLayout agent={agent}>
        {/* Page hero */}
        <section className="lux-page-hero">
          <h1>Find a Residence of Distinction</h1>
          <p>
            Architectural properties in Northeast Florida — waterfront, estate, and executive relocation.
            Buyer representation with discretion at every stage.
          </p>
        </section>

        {/* Listings */}
        <section className="lux-section">
          <div className="lux-wrap">
            <p className="lux-section-label">Active Listings</p>
            <h2 className="lux-section-title">Current Inventory</h2>

            <div className="lux-grid-3">
              {BUY_LISTINGS.map((listing) => (
                <article key={listing.id} className="lux-card">
                  <img
                    src={listing.image}
                    alt={listing.address}
                    className="lux-card-img"
                    loading="lazy"
                  />
                  <div className="lux-card-body">
                    <p className="lux-card-price">{formatPrice(listing.price)}</p>
                    <p className="lux-card-address">{listing.address}</p>
                    <p className="lux-card-meta">
                      {listing.beds} bd · {listing.baths} ba · {listing.sqft.toLocaleString()} sqft
                    </p>
                    <span className="lux-card-tag">{listing.architect}, {listing.year}</span>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href={`/agent/jacksonville-luxury/listings`} className="lux-cta-btn" style={{ marginRight: '1rem' }}>
                View Full Roster
              </Link>
              <Link href={`/agent/jacksonville-luxury/contact`} style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--lux-accent)', textDecoration: 'none', borderBottom: '1px solid var(--lux-border)', paddingBottom: '1px' }}>
                Request Disclosures →
              </Link>
            </div>
          </div>
        </section>

        {/* Buyer representation */}
        <hr className="lux-hairline" />
        <section className="lux-section" style={{ backgroundColor: 'var(--lux-surface)' }}>
          <div className="lux-wrap" style={{ maxWidth: '800px' }}>
            <p className="lux-section-label">Representation</p>
            <h2 className="lux-section-title">Buyer Representation That Holds Its Standards</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginTop: '2.5rem' }}>
              {[
                {
                  title: 'Search & Analysis',
                  desc: 'A custom property search across MLS and off-market channels, filtered to your specifications. Comparative market analysis for every property of interest.',
                },
                {
                  title: 'Negotiation & Contracts',
                  desc: 'Contract negotiation, inspection management, and due diligence oversight. Every term written to protect your position.',
                },
                {
                  title: 'Architectural Review',
                  desc: 'Floor plan assessment, deed restriction review, and HOA evaluation. Architectural context for every property.',
                },
                {
                  title: 'Relocation Support',
                  desc: 'Coordinate with mortgage, title, and any relocation company. A clean process from accepted offer to recorded title.',
                },
              ].map((item) => (
                <div key={item.title}>
                  <h3 style={{ fontFamily: 'var(--lux-font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--lux-text)', marginBottom: '0.625rem' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--lux-muted)', lineHeight: 1.75, fontWeight: 300 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <Link href={`/agent/jacksonville-luxury/contact`} className="lux-hero-cta">
                Request Disclosures
              </Link>
            </div>
          </div>
        </section>
      </LuxuryLayout>
    </>
  )
}
