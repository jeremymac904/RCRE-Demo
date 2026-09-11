/**
 * RCRE Luxury — Listings Page
 * Route: /agent/jacksonville-luxury/listings
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildListingsSEO } from '@/lib/agent-website/seo'
import { LuxuryLayout } from '../LuxuryLayout'
import { LuxurySEO } from '../LuxurySEO'
import '../luxury.css'

export const metadata: Metadata = {
  title: 'Properties for Sale | Alexandra Whitfield | RCRE Luxury',
}

const LUXURY_CONFIG = {
  theme: 'rcre-luxury' as const,
  markets: ['Ponte Vedra', 'Nocatee', 'Southbank', 'Mandarin', 'Intracoastal Waterway'],
  specialties: ['Waterfront', 'Luxury Estates', 'Relocation', 'Intracoastal', 'New Construction'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const ALL_LISTINGS = [
  {
    id: 'l1',
    address: '1200 Ponte Vedra Blvd, Ponte Vedra Beach, FL 32082',
    market: 'Ponte Vedra',
    price: 4850000,
    beds: 6,
    baths: 5.5,
    sqft: 7420,
    architect: 'Merritt & Pappas Architecture',
    year: 2018,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
  },
  {
    id: 'l2',
    address: '445 Nocatee Pkwy, St. Johns, FL 32081',
    market: 'Nocatee',
    price: 2975000,
    beds: 5,
    baths: 4,
    sqft: 5880,
    architect: 'Pulte Homes',
    year: 2021,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80',
  },
  {
    id: 'l3',
    address: 'Private address — Intracoastal Waterway, Jacksonville, FL',
    market: 'Intracoastal Waterway',
    price: 6200000,
    beds: 7,
    baths: 6,
    sqft: 9100,
    architect: 'Confidential',
    year: 2020,
    status: 'private' as const,
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80',
  },
  {
    id: 'l4',
    address: '3333 Southbank Dr, Jacksonville, FL 32207',
    market: 'Southbank',
    price: 1850000,
    beds: 4,
    baths: 3.5,
    sqft: 4210,
    architect: 'Local custom',
    year: 2014,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589a7c?w=700&q=80',
  },
  {
    id: 'l5',
    address: '7820 Mandarin Rd, Jacksonville, FL 32223',
    market: 'Mandarin',
    price: 2350000,
    beds: 5,
    baths: 4,
    sqft: 5120,
    architect: 'Dee Dot Homes',
    year: 2010,
    status: 'Active' as const,
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=700&q=80',
  },
  {
    id: 'l6',
    address: '2100 Marsh Landing Blvd, Ponte Vedra Beach, FL 32082',
    market: 'Ponte Vedra',
    price: 1650000,
    beds: 4,
    baths: 3,
    sqft: 3650,
    architect: 'Nocatee Custom',
    year: 2019,
    status: 'Pending' as const,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80',
  },
]

const MARKETS = ['All Markets', 'Ponte Vedra', 'Nocatee', 'Southbank', 'Mandarin', 'Intracoastal Waterway']
const PRICE_BANDS = ['Any Price', 'Under $2M', '$2M – $4M', '$4M – $6M', '$6M+']
const ERAS = ['Any Era', 'Pre-2000', '2000–2015', '2015+']

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function LuxuryListingsPage() {
  const agent = getExampleAgent('jacksonville-luxury')!
  const seo = buildListingsSEO(agent, LUXURY_CONFIG)

  return (
    <>
      <head>
        <LuxurySEO seo={seo} />
      </head>
      <LuxuryLayout agent={agent}>
        {/* Page hero */}
        <section className="lux-page-hero">
          <h1>Properties for Sale</h1>
          <p>
            Active and off-market properties represented by {agent.name}.
            Private listings are marked — access by inquiry.
          </p>
        </section>

        {/* Listings */}
        <section className="lux-section">
          <div className="lux-wrap">
            {/* Filters */}
            <div className="lux-filter-bar">
              <select className="lux-select" style={{ minWidth: '160px' }}>
                {MARKETS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <select className="lux-select" style={{ minWidth: '140px' }}>
                {PRICE_BANDS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select className="lux-select" style={{ minWidth: '120px' }}>
                {ERAS.map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--lux-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
              {ALL_LISTINGS.length} properties · Synthetic property data for review purposes
            </p>

            <div className="lux-grid-3">
              {ALL_LISTINGS.map((listing) => (
                <article key={listing.id} className="lux-card">
                  <div style={{ position: 'relative' }}>
                    <img
                      src={listing.image}
                      alt={listing.address}
                      className="lux-card-img"
                      loading="lazy"
                    />
                    {listing.status === 'private' && (
                      <span
                        style={{
                          position: 'absolute', top: '0.75rem', left: '0.75rem',
                          backgroundColor: 'rgba(28,28,28,0.85)', color: '#faf7f0',
                          fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.1em',
                          textTransform: 'uppercase', padding: '0.2rem 0.6rem',
                        }}
                      >
                        Private — Access by Inquiry
                      </span>
                    )}
                    {listing.status === 'Pending' && (
                      <span
                        style={{
                          position: 'absolute', top: '0.75rem', left: '0.75rem',
                          backgroundColor: 'rgba(201,168,76,0.9)', color: '#1c1c1c',
                          fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em',
                          textTransform: 'uppercase', padding: '0.2rem 0.6rem',
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="lux-card-body">
                    <p className="lux-card-price">{formatPrice(listing.price)}</p>
                    <p className="lux-card-address">{listing.address}</p>
                    <p className="lux-card-meta">
                      {listing.beds} bd · {listing.baths} ba · {listing.sqft.toLocaleString()} sqft
                    </p>
                    <span className="lux-card-tag">
                      {listing.architect !== 'Confidential' ? `${listing.architect}, ` : ''}{listing.year}
                    </span>
                    <div style={{ marginTop: '0.75rem' }}>
                      <Link href={`/agent/jacksonville-luxury/contact`} className="lux-card-link">
                        Inquire →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Custom search CTA */}
            <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: 'var(--lux-surface)', border: '1px solid var(--lux-border)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--lux-muted)', marginBottom: '1rem', lineHeight: 1.65, fontWeight: 300 }}>
                Do not see the right property? I actively source off-market opportunities in the Ponte Vedra
                and Intracoastal corridor — contact me to discuss your criteria.
              </p>
              <Link href={`/agent/jacksonville-luxury/contact`} className="lux-cta-btn">
                Request a Custom Search
              </Link>
            </div>
          </div>
        </section>
      </LuxuryLayout>
    </>
  )
}
