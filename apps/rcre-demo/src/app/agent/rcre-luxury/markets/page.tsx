/**
 * RCRE Luxury — Markets Page
 * Route: /agent/jacksonville-luxury/markets
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildMarketSEO } from '@/lib/agent-website/seo'
import { LuxuryLayout } from '../LuxuryLayout'
import { LuxurySEO } from '../LuxurySEO'
import '../luxury.css'

export const metadata: Metadata = {
  title: 'Markets Served | Alexandra Whitfield | RCRE Luxury',
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

const MARKET_DETAILS = [
  {
    name: 'Ponte Vedra',
    image: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589a7c?w=600&q=80',
    paragraph: 'Gated coastal enclave known for TPC Sawgrass and executive waterfront estates. Architectural variety spans mid-century modern, custom Mediterranean, and contemporary coastal design. The corridor is defined by the Intracoastal Waterway to its west and the Atlantic to its east — a narrow strip of some of the most consistently valuable residential real estate in Northeast Florida.',
    propertyType: 'Waterfront estates, golf course homes, custom Mediterranean',
    priceRange: '$1.5M – $10M+',
  },
  {
    name: 'Nocatee',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
    paragraph: 'Master-planned community in St. Johns County — top-rated schools, family amenities, and new construction options. Nocatee\'s growth has been deliberate, with an architectural review board maintaining standards across builders. The market here skews newer and more family-oriented than Ponte Vedra, with a strong base of dual-income households seeking long-term primary residences.',
    propertyType: 'New construction, family homes, amenity-rich communities',
    priceRange: '$700K – $4M',
  },
  {
    name: 'Southbank',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
    paragraph: 'High-rise and townhome corridor along the St. Johns River south of downtown Jacksonville. Water views, walkable dining, and established residential towers define this market. The residential towers are largely pre-2000 construction — well-maintained buildings with larger floor plans than new construction typically offers at similar price points.',
    propertyType: 'Riverfront high-rises, townhomes, established residential towers',
    priceRange: '$500K – $3M',
  },
  {
    name: 'Mandarin',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
    paragraph: 'Historic riverside neighborhood with established oak canopy, waterfront parcels, and a mix of mid-century and updated traditional architecture. Mandarin retains its character in a way few Jacksonville neighborhoods do — the trees are the defining feature. Waterfront parcels along the St. Johns are rare and priced accordingly; inland homes offer value relative to newer construction.',
    propertyType: 'Historic homes, waterfront parcels, updated traditional',
    priceRange: '$600K – $3.5M',
  },
  {
    name: 'Intracoastal Waterway',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
    paragraph: 'Deep-water properties along the ICWW between Jacksonville and St. Augustine. Boat docks, privacy, and long water views are the primary assets. This is an off-market and private-listing market — most significant ICWW transactions do not appear on the public MLS. Relationships and discretion matter more here than anywhere else in the region.',
    propertyType: 'Deep-water estates, ICWW frontage, private compounds',
    priceRange: '$2M – $12M+',
  },
]

export default function LuxuryMarketsPage() {
  const agent = getExampleAgent('jacksonville-luxury')!
  const seo = buildMarketSEO(agent, LUXURY_CONFIG, agent.market)

  return (
    <>
      <head>
        <LuxurySEO seo={seo} />
      </head>
      <LuxuryLayout agent={agent}>
        {/* Page hero */}
        <section className="lux-page-hero">
          <h1>Markets Served</h1>
          <p>
            Northeast Florida waterfront and estate communities —
            architectural knowledge across each.
          </p>
        </section>

        {/* Markets */}
        <section className="lux-section">
          <div className="lux-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {MARKET_DETAILS.map((market) => (
                <article key={market.name} className="lux-market-card">
                  <img
                    src={market.image}
                    alt={market.name}
                    style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block', marginBottom: '1.5rem', backgroundColor: 'var(--lux-border)' }}
                    loading="lazy"
                  />
                  <h2>{market.name}</h2>
                  <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--lux-muted)', lineHeight: 1.75 }}>
                    {market.paragraph}
                  </p>
                  <div style={{ borderTop: '1px solid var(--lux-border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lux-accent)', marginBottom: '0.25rem' }}>Property Type</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--lux-muted)' }}>{market.propertyType}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lux-accent)', marginBottom: '0.25rem' }}>Price Range</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--lux-muted)' }}>{market.priceRange}</p>
                  </div>
                  <div style={{ marginTop: '1.25rem' }}>
                    <Link href={`/agent/jacksonville-luxury/listings`} className="lux-card-link">
                      View properties in {market.name.split(' ')[0]} →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="lux-cta-section">
          <h2>Begin a Quiet Conversation</h2>
          <p>
            If your target market is not on this list, ask — active relationships across
            Northeast Florida extend beyond these five markets.
          </p>
          <Link href={`/agent/jacksonville-luxury/contact`} className="lux-hero-cta">
            Schedule a Private Showing
          </Link>
        </div>
      </LuxuryLayout>
    </>
  )
}
