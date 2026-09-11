/**
 * RCRE Rural & Land — Buy Page
 * Route: /agent/alabama-rural/buy
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { RuralLayout } from '../RuralLayout'
import { RuralSEO } from '../RuralSEO'
import '../rural.css'

export const metadata: Metadata = {
  title: 'Find Your Land | Coleman Reid | RCRE Rural & Land, Alabama',
}

const RURAL_CONFIG = {
  theme: 'rcre-rural' as const,
  markets: ['Birmingham exurbs', 'Wiregrass Alabama', 'Black Belt', 'Lake Martin', 'Tuscaloosa County'],
  specialties: ['Land', 'Acreage', 'Equestrian', 'Timber', 'USDA Rural', 'Farm & Ranch'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const BUY_LISTINGS = [
  {
    id: 'rb1',
    address: 'County Road 22, Marion Junction, AL 36759',
    county: 'Dallas County — Black Belt',
    price: 385000,
    acres: 124,
    waterRights: 'Two stocked ponds; drilled well; permitted irrigation pivot',
    agClass: 'Class III & IV row crop; fenced pasture',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80',
  },
  {
    id: 'rb2',
    address: 'Smith Lake Rd, Crane Hill, AL 35581',
    county: 'Cullman County — Smith Lake',
    price: 695000,
    acres: 87,
    waterRights: '1,400 ft of Smith Lake frontage; community water available',
    agClass: 'Mixed timber; established food plots',
    image: 'https://images.unsplash.com/photo-1470087161017-750b9c9e0c0b?w=700&q=80',
  },
  {
    id: 'rb3',
    address: 'Bates Lake Rd, Frankville, AL 36538',
    county: 'Washington County — Wiregrass',
    price: 215000,
    acres: 62,
    waterRights: 'Bates Lake access; drilled well; no irrigation infrastructure',
    agClass: 'Open pasture; fenced; cross-fenced',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80',
  },
]

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function RuralBuyPage() {
  const agent = getExampleAgent('alabama-rural')!
  const seo = buildHomeSEO(agent, RURAL_CONFIG)

  return (
    <>
      <head>
        <RuralSEO seo={seo} />
      </head>
      <RuralLayout agent={agent}>
        {/* Page hero */}
        <section className="rural-page-hero">
          <h1>Find Your Land</h1>
          <p>
            Acreage, timberland, equestrian properties, and working farms across Alabama.
            USDA rural financing guidance included.
          </p>
        </section>

        {/* Listings */}
        <section className="rural-section">
          <div className="rural-wrap">
            <p className="rural-section-label">Current Listings</p>
            <h2 className="rural-section-title">Featured Land</h2>

            <div className="rural-grid-3">
              {BUY_LISTINGS.map((listing) => (
                <article key={listing.id} className="rural-card">
                  <img
                    src={listing.image}
                    alt={listing.address}
                    className="rural-card-img"
                    loading="lazy"
                  />
                  <div className="rural-card-body">
                    <p className="rural-card-price">{formatPrice(listing.price)}</p>
                    <p className="rural-card-address">{listing.address}</p>
                    <p className="rural-card-meta">{listing.county}</p>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span className="rural-tag">{listing.acres} acres</span>
                    </div>
                    <span className="rural-tag-warn">Water: {listing.waterRights.slice(0, 45)}…</span>
                    <div style={{ marginTop: '0.75rem' }}>
                      <Link href={`/agent/alabama-rural/contact`} className="rural-card-link">
                        Inquire About This Property →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href={`/agent/alabama-rural/listings`} className="rural-cta-btn" style={{ marginRight: '1rem' }}>
                View All Land Listings
              </Link>
            </div>
          </div>
        </section>

        {/* USDA note */}
        <section className="rural-section-sm" style={{ backgroundColor: 'var(--rural-surface)' }}>
          <div className="rural-wrap" style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: '48px', height: '48px', backgroundColor: 'rgba(125,140,106,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--rural-accent)" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <polyline points="9,22 9,12 15,12 15,22" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--rural-font-display)', fontSize: '1.25rem', fontWeight: 500, fontStyle: 'italic', color: 'var(--rural-text)', marginBottom: '0.625rem' }}>
                  USDA Rural Financing
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--rural-muted)', lineHeight: 1.75 }}>
                  Properties in eligible rural areas may qualify for USDA Rural Development financing —
                  0% down payment, competitive fixed rates, and no private mortgage insurance requirement.
                  Eligibility is based on population and address, not buyer income. I work with lenders
                  who know USDA financing and can tell you whether a property qualifies before you make
                  an offer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Buyer services */}
        <section className="rural-section">
          <div className="rural-wrap" style={{ maxWidth: '900px' }}>
            <p className="rural-section-label">How I Work</p>
            <h2 className="rural-section-title">Land Representation</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginTop: '2.5rem' }}>
              {[
                { title: 'Acreage Search', desc: 'Custom search across MLS and off-market channels — rural land does not always list publicly.' },
                { title: 'Water & Title Review', desc: 'Well depth records, pond permits, deed restrictions, and mineral conveyances reviewed before you sign.' },
                { title: 'USDA Qualification', desc: 'Address-level eligibility check and lender coordination for USDA Rural Development financing.' },
                { title: 'Inspection Management', desc: 'Timber cruise, Phase I environmental, boundary survey, and soil evaluation — coordinated and reviewed.' },
                { title: 'Ag & Tax Guidance', desc: 'Working knowledge of Alabama ag exemptions, timber taxation, and conservation programs.' },
                { title: 'Closing Coordination', desc: 'Title, abstract, closing attorney, and loan coordination for a clean transfer.' },
              ].map((item) => (
                <div key={item.title}>
                  <h3 style={{ fontFamily: 'var(--rural-font-display)', fontSize: '1.1rem', fontWeight: 500, fontStyle: 'italic', color: 'var(--rural-text)', marginBottom: '0.5rem' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--rural-muted)', lineHeight: 1.75 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <Link href={`/agent/alabama-rural/contact`} className="rural-hero-cta">
                Inquire About a Property
              </Link>
            </div>
          </div>
        </section>
      </RuralLayout>
    </>
  )
}
