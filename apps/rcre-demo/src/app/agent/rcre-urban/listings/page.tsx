/**
 * RCRE Urban Modern — Listings Page
 * Route: /agent/jacksonville-urban/listings
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildListingsSEO } from '@/lib/agent-website/seo'
import { UrbanLayout } from '../UrbanLayout'
import { UrbanSEO } from '../UrbanSEO'
import '../rcre-urban.css'

export const metadata: Metadata = {
  title: 'Properties | Priya Nair | RCRE Urban Modern',
}

const URBAN_CONFIG = {
  theme: 'rcre-urban' as const,
  markets: ['Riverside', 'Avondale', 'San Marco', 'Downtown Jacksonville', 'Brooklyn'],
  specialties: ['Urban Condo', 'Loft', 'Townhouse', 'Walkability'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'Properties | Priya Nair | RCRE Urban Modern',
  seoDescription: 'Active listings in Jacksonville urban core — condo, loft, townhouse. Priya Nair represents buyers in Riverside, Avondale, San Marco, Downtown, and Brooklyn.',
}

const ALL_LISTINGS = [
  { id: 'b1', address: '1 W. Bay St, Jacksonville, FL 32202', price: 285000, beds: 1, baths: 1, sqft: 820, neighborhood: 'Downtown', type: 'Condo', walkScore: 91, image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80' },
  { id: 'b2', address: '1 W. Bay St #405, Jacksonville, FL 32202', price: 520000, beds: 3, baths: 2, sqft: 1680, neighborhood: 'Downtown', type: 'Condo', walkScore: 91, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80' },
  { id: 'b3', address: '1423 King St, Jacksonville, FL 32204', price: 395000, beds: 2, baths: 2, sqft: 1240, neighborhood: 'Riverside', type: 'Townhouse', walkScore: 88, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80' },
  { id: 'b4', address: '1423 King St #B, Jacksonville, FL 32204', price: 675000, beds: 3, baths: 2.5, sqft: 1980, neighborhood: 'Riverside', type: 'Townhouse', walkScore: 88, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80' },
  { id: 'b5', address: '2044 Miriam St, Jacksonville, FL 32207', price: 310000, beds: 1, baths: 1, sqft: 890, neighborhood: 'San Marco', type: 'Condo', walkScore: 72, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80' },
  { id: 'b6', address: '2044 Miriam St #312, Jacksonville, FL 32207', price: 480000, beds: 2, baths: 2, sqft: 1420, neighborhood: 'San Marco', type: 'Condo', walkScore: 72, image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80' },
]

export default function UrbanListingsPage() {
  const agent = getExampleAgent('jacksonville-urban')!
  const seo = buildListingsSEO(agent, URBAN_CONFIG)

  return (
    <>
      <head><UrbanSEO seo={seo} /></head>
      <UrbanLayout agent={agent}>
        <section className="urban-section">
          <div className="urban-wrap">
            <p className="urban-section-label">Listings</p>
            <h1 className="urban-section-title">Find Your City Home</h1>
            <p className="urban-section-sub" style={{ marginBottom: '2.5rem' }}>
              Active listings in Jacksonville urban core — Riverside, Avondale, San Marco, Downtown, and Brooklyn.
              Walk Score noted on each listing.
            </p>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              {['All', 'Downtown', 'Riverside', 'San Marco', 'Avondale', 'Brooklyn'].map((f) => (
                <span
                  key={f}
                  style={{
                    fontFamily: 'var(--urban-font-mono)',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    color: f === 'All' ? '#ffffff' : 'var(--urban-muted)',
                    backgroundColor: f === 'All' ? 'var(--urban-primary)' : 'var(--urban-surface)',
                    border: '1px solid var(--urban-border)',
                    padding: '0.3rem 0.75rem',
                    borderRadius: 'var(--urban-radius)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="urban-grid-3">
              {ALL_LISTINGS.map((l) => (
                <article key={l.id} className="urban-card">
                  <div style={{ position: 'relative' }}>
                    <img src={l.image} alt={l.address} className="urban-card-img" loading="lazy" />
                    <span className="urban-card-badge" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                      Walk {l.walkScore}
                    </span>
                  </div>
                  <div className="urban-card-body">
                    <p className="urban-card-price">${l.price.toLocaleString()}</p>
                    <p className="urban-card-address">{l.address}</p>
                    <p className="urban-card-meta">{l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString()} sqft · {l.type}</p>
                    <span className="urban-card-badge">{l.neighborhood}</span>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href={`/agent/${agent.slug}/contact`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--urban-accent)', textDecoration: 'none' }}>
                Looking for something off-market? →
              </Link>
            </div>
          </div>
        </section>
      </UrbanLayout>
    </>
  )
}
