/**
 * RCRE Suburban Family — Listings Page
 * Route: /agent/family/listings
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildListingsSEO } from '@/lib/agent-website/seo'
import { SuburbanLayout } from '../SuburbanLayout'
import { SuburbanSEO } from '../SuburbanSEO'
import '../rcre-suburban.css'

export const metadata: Metadata = {
  title: 'Homes for Sale | Jordan Mercer | RCRE Suburban Family',
}

const SUBURBAN_CONFIG = {
  theme: 'rcre-suburban' as const,
  markets: ['St. Johns County', 'Jacksonville Suburbs', 'Birmingham Suburbs'],
  specialties: ['Families', 'School Districts', 'First-Time Buyers', 'Move-Up Buyers'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'Homes for Sale | Jordan Mercer | RCRE Suburban Family',
  seoDescription: 'Active listings in St. Johns County and Jacksonville suburbs. School district noted on each listing.',
}

const LISTINGS = [
  { id: 'h1', address: '234 St. Johns Ave, St. Johns, FL 32259', price: 525000, beds: 4, baths: 3, sqft: 2840, district: 'St. Johns County', community: 'St. Johns Golf & Country Club', image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80' },
  { id: 'h2', address: '11840 Mandarin Rd, Jacksonville, FL 32223', price: 445000, beds: 3, baths: 2.5, sqft: 2380, district: 'Mandarin', community: 'Mandarin Woods', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80' },
  { id: 'h3', address: '567 Julington Creek Dr, Jacksonville, FL 32259', price: 615000, beds: 5, baths: 3, sqft: 3420, district: 'Julington Creek', community: 'Julington Creek Plantation', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80' },
  { id: 'h4', address: '120 Nocatee Pkwy, St. Johns, FL 32081', price: 485000, beds: 4, baths: 2.5, sqft: 2620, district: 'Nocatee', community: 'Nocatee Town Center', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80' },
  { id: 'h5', address: '8821 St. Augustine Rd, Jacksonville, FL 32244', price: 365000, beds: 3, baths: 2, sqft: 1980, district: 'Southside', community: 'Ortega Farms', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80' },
  { id: 'h6', address: '4455 CR 210, St. Johns, FL 32259', price: 725000, beds: 5, baths: 4, sqft: 4100, district: 'St. Johns County', community: 'Durbin Creek', image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80' },
]

export default function SuburbanListingsPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildListingsSEO(agent, SUBURBAN_CONFIG)

  return (
    <>
      <head><SuburbanSEO seo={seo} /></head>
      <SuburbanLayout agent={agent}>
        <section className="sub-section">
          <div className="sub-wrap">
            <p className="sub-section-label">Listings</p>
            <h1 className="sub-section-title">Homes for Families</h1>
            <p className="sub-section-sub" style={{ marginBottom: '2.5rem' }}>
              Active listings in St. Johns County and Jacksonville suburbs.
              School district noted on each listing.
            </p>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              {['All Areas', 'St. Johns County', 'Mandarin', 'Julington Creek', 'Nocatee', 'Southside'].map((f) => (
                <span
                  key={f}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: f === 'All Areas' ? '#ffffff' : 'var(--sub-muted)',
                    backgroundColor: f === 'All Areas' ? 'var(--sub-primary)' : 'var(--sub-surface)',
                    border: '1px solid var(--sub-border)',
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--sub-radius)',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="sub-grid-3">
              {LISTINGS.map((l) => (
                <article key={l.id} className="sub-card">
                  <img src={l.image} alt={l.address} className="sub-card-img" loading="lazy" />
                  <div className="sub-card-body">
                    <p className="sub-card-price">${l.price.toLocaleString()}</p>
                    <p className="sub-card-address">{l.address}</p>
                    <p className="sub-card-meta">
                      {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString()} sqft
                    </p>
                    <span className="sub-school-badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                      </svg>
                      {l.district}
                    </span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--sub-muted)', marginTop: '0.35rem' }}>{l.community}</p>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href={`/agent/family/contact`} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sub-primary)', textDecoration: 'none' }}>
                Don&apos;t see what you&apos;re looking for? →
              </Link>
            </div>
          </div>
        </section>
      </SuburbanLayout>
    </>
  )
}
