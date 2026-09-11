/**
 * RCRE Rural & Land — Listings Page
 * Route: /agent/alabama-rural/listings
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildListingsSEO } from '@/lib/agent-website/seo'
import { RuralLayout } from '../RuralLayout'
import { RuralSEO } from '../RuralSEO'
import '../rural.css'

export const metadata: Metadata = {
  title: 'Land Listings for Sale | Coleman Reid | RCRE Rural & Land',
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

const ALL_LAND = [
  {
    id: 'rl1',
    address: 'County Road 22, Marion Junction, AL 36759',
    county: 'Dallas County — Black Belt',
    market: 'Black Belt',
    price: 385000,
    acres: 124,
    pricePerAcre: 3105,
    waterRights: 'Two stocked ponds; drilled well; permitted irrigation pivot',
    agClass: 'Class III & IV row crop; fenced pasture',
    usdaEligible: true,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80',
  },
  {
    id: 'rl2',
    address: 'Smith Lake Rd, Crane Hill, AL 35581',
    county: 'Cullman County — Smith Lake',
    market: 'Lake Martin',
    price: 695000,
    acres: 87,
    pricePerAcre: 7988,
    waterRights: '1,400 ft of Smith Lake frontage; community water available',
    agClass: 'Mixed timber; established food plots',
    usdaEligible: false,
    image: 'https://images.unsplash.com/photo-1470087161017-750b9c9e0c0b?w=700&q=80',
  },
  {
    id: 'rl3',
    address: 'Bates Lake Rd, Frankville, AL 36538',
    county: 'Washington County — Wiregrass',
    market: 'Wiregrass Alabama',
    price: 215000,
    acres: 62,
    pricePerAcre: 3468,
    waterRights: 'Bates Lake access; drilled well; no irrigation infrastructure',
    agClass: 'Open pasture; fenced; cross-fenced',
    usdaEligible: true,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80',
  },
  {
    id: 'rl4',
    address: 'Ch和工作 Rd, Pelham, AL 35124',
    county: 'Shelby County — Birmingham Exurbs',
    market: 'Birmingham exurbs',
    price: 549000,
    acres: 32,
    pricePerAcre: 17156,
    waterRights: 'County water; septic; two small ponds',
    agClass: 'Open pasture; equestrian-fenced',
    usdaEligible: false,
    image: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=700&q=80',
  },
  {
    id: 'rl5',
    address: 'Tuscaloosa County Rd 100, Northport, AL',
    county: 'Tuscaloosa County',
    market: 'Tuscaloosa County',
    price: 425000,
    acres: 158,
    pricePerAcre: 2690,
    waterRights: 'Drilled well; active spring; no irrigation',
    agClass: 'Timber; food plots; one cleared pasture field',
    usdaEligible: true,
    image: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=700&q=80',
  },
  {
    id: 'rl6',
    address: 'Lake Martin Dr, Jackson\'s Gap, AL 36861',
    county: 'Tallapoosa County — Lake Martin',
    market: 'Lake Martin',
    price: 890000,
    acres: 45,
    pricePerAcre: 19778,
    waterRights: 'Lake frontage 400 ft; well',
    agClass: 'Managed timber; cleared building site',
    usdaEligible: false,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80',
  },
]

const MARKETS = ['All Markets', 'Black Belt', 'Wiregrass Alabama', 'Lake Martin', 'Birmingham exurbs', 'Tuscaloosa County']
const ACREAGE_RANGES = ['Any Size', 'Under 50 acres', '50 – 100 acres', '100 – 200 acres', '200+ acres']
const WATER_RIGHTS = ['Any', 'With water', 'With irrigation', 'Lake frontage']

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function RuralListingsPage() {
  const agent = getExampleAgent('alabama-rural')!
  const seo = buildListingsSEO(agent, RURAL_CONFIG)

  return (
    <>
      <head>
        <RuralSEO seo={seo} />
      </head>
      <RuralLayout agent={agent}>
        {/* Page hero */}
        <section className="rural-page-hero">
          <h1>Land for Sale</h1>
          <p>
            Active rural acreage listings across Alabama.
            USDA eligibility, water rights, and ag classification noted — verify independently.
          </p>
        </section>

        {/* Listings */}
        <section className="rural-section">
          <div className="rural-wrap">
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--rural-border)' }}>
              <select className="rural-select" style={{ minWidth: '160px' }}>
                {MARKETS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <select className="rural-select" style={{ minWidth: '140px' }}>
                {ACREAGE_RANGES.map((a) => <option key={a}>{a}</option>)}
              </select>
              <select className="rural-select" style={{ minWidth: '140px' }}>
                {WATER_RIGHTS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--rural-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
              {ALL_LAND.length} listings · Synthetic property data for review purposes
            </p>

            <div className="rural-grid-3">
              {ALL_LAND.map((listing) => (
                <article key={listing.id} className="rural-card">
                  <div style={{ position: 'relative' }}>
                    <img
                      src={listing.image}
                      alt={listing.address}
                      className="rural-card-img"
                      loading="lazy"
                    />
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {listing.usdaEligible && (
                        <span className="rural-tag">USDA Eligible</span>
                      )}
                      <span className="rural-tag">{listing.acres} acres</span>
                    </div>
                  </div>
                  <div className="rural-card-body">
                    <p className="rural-card-price">{formatPrice(listing.price)}</p>
                    <p className="rural-card-address">{listing.address}</p>
                    <p className="rural-card-meta">{listing.county}</p>
                    <span className="rural-tag">${listing.pricePerAcre.toLocaleString()}/acre</span>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className="rural-tag-warn">Water: {listing.waterRights.slice(0, 40)}…</span>
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <Link href={`/agent/alabama-rural/contact`} className="rural-card-link">
                        Inquire about this property →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Custom search CTA */}
            <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: 'var(--rural-surface)', border: '1px solid var(--rural-border)', borderRadius: 'var(--rural-radius)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--rural-muted)', marginBottom: '1rem', lineHeight: 1.65 }}>
                Do not see the right acreage? I source off-market land regularly —
                tell me what you are looking for and I will follow up with what I find.
              </p>
              <Link href={`/agent/alabama-rural/contact`} className="rural-cta-btn">
                Tell Us About Your Land Search
              </Link>
            </div>
          </div>
        </section>
      </RuralLayout>
    </>
  )
}
