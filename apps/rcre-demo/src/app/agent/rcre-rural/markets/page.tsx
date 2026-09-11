/**
 * RCRE Rural & Land — Markets Page
 * Route: /agent/alabama-rural/markets
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildMarketSEO } from '@/lib/agent-website/seo'
import { RuralLayout } from '../RuralLayout'
import { RuralSEO } from '../RuralSEO'
import '../rural.css'

export const metadata: Metadata = {
  title: 'Alabama Land Markets | Coleman Reid | RCRE Rural & Land',
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

const MARKET_DETAILS = [
  {
    name: 'Birmingham Exurbs',
    image: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600&q=80',
    landCharacter: 'Growing communities outside Birmingham — acreage lots, equestrian properties, small working farms within 30 miles of the metro. Mix of newer development and established rural homesteads.',
    typicalUse: 'Residential on acreage, equestrian, small-scale farming, investment',
    priceRange: '$250K – $1.2M',
    usdaNote: 'Some areas eligible for USDA financing. Verify address-level eligibility.',
  },
  {
    name: 'Wiregrass Alabama',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
    landCharacter: 'Southeastern Alabama flatwoods and prairie — sandy soils, long growing seasons, and working farms. Strong timber and cattle country. The kind of land that has been farmed for generations.',
    typicalUse: 'Timber, cattle, row crop, USDA rural eligible',
    priceRange: '$150K – $700K',
    usdaNote: 'Large portion of Wiregrass qualifies for USDA Rural Development financing. Confirm before making offers.',
  },
  {
    name: 'Black Belt',
    image: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=600&q=80',
    landCharacter: 'Alabama\'s dark-soil prairie region from Selma to Troy. Rich agricultural land, large intact landholdings, and a deep ranching culture. Historic properties and generational farms change hands here.',
    typicalUse: 'Working farms, managed timber, conservation, legacy holdings',
    priceRange: '$300K – $2M+',
    usdaNote: 'Prime USDA territory. Many properties qualify. Black Belt clay requires proper drainage review.',
  },
  {
    name: 'Lake Martin',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    landCharacter: 'Alabama\'s largest reservoir — waterfront acreage, ranch-style compounds, and family compounds within reach of Alexander City and Auburn. A weekend land market with strong permanent-use demand.',
    typicalUse: 'Lakefront compounds, recreational land, residential on acreage',
    priceRange: '$400K – $3M+',
    usdaNote: 'USDA eligibility limited near the lake. Most buyers finance conventionally.',
  },
  {
    name: 'Tuscaloosa County',
    image: 'https://images.unsplash.com/photo-1470087161017-750b9c9e0c0b?w=600&q=80',
    landCharacter: 'University of Alabama proximity with expanding rural land use. Investment buyers, owner-operators, and 1031 exchange buyers all active here. Mix of open farmland, timber, and acreage near the university corridor.',
    typicalUse: 'Investment, small farms, timber, USDA eligible',
    priceRange: '$200K – $900K',
    usdaNote: 'Eastern Tuscaloosa County mostly eligible for USDA. Western areas near the river vary.',
  },
]

export default function RuralMarketsPage() {
  const agent = getExampleAgent('alabama-rural')!
  const seo = buildMarketSEO(agent, RURAL_CONFIG, agent.market)

  return (
    <>
      <head>
        <RuralSEO seo={seo} />
      </head>
      <RuralLayout agent={agent}>
        {/* Page hero */}
        <section className="rural-page-hero">
          <h1>Alabama Land Markets</h1>
          <p>
            Five Alabama markets with working-land character —
            each with its own land type, price range, and typical buyer.
          </p>
        </section>

        {/* Markets */}
        <section className="rural-section">
          <div className="rural-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {MARKET_DETAILS.map((market) => (
                <article key={market.name} className="rural-market-card">
                  <img
                    src={market.image}
                    alt={market.name}
                    style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block', marginBottom: '1.5rem', borderRadius: 'var(--rural-radius)', backgroundColor: 'var(--rural-border)' }}
                    loading="lazy"
                  />
                  <h2>{market.name}</h2>
                  <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--rural-muted)', lineHeight: 1.75, fontStyle: 'italic' }}>
                    {market.landCharacter}
                  </p>
                  <div style={{ borderTop: '1px solid var(--rural-border)', paddingTop: '1rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--rural-accent)', marginBottom: '0.25rem' }}>Typical Use</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--rural-muted)' }}>{market.typicalUse}</p>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--rural-accent)', marginBottom: '0.25rem' }}>Price Range</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--rural-muted)' }}>{market.priceRange}</p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(125,140,106,0.08)', border: '1px solid rgba(125,140,106,0.2)', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--rural-muted)', lineHeight: 1.6 }}>{market.usdaNote}</p>
                  </div>
                  <Link href={`/agent/alabama-rural/listings`} className="rural-card-link">
                    View listings in {market.name.split(' ')[0]} →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rural-cta-section">
          <h2>Looking for Land in Another Market?</h2>
          <p>
            Active relationships extend beyond these five markets.
            Ask about Wiregrass, Central Alabama, or North Florida rural markets.
          </p>
          <Link href={`/agent/alabama-rural/contact`} className="rural-hero-cta">
            Schedule a Land Tour
          </Link>
        </div>
      </RuralLayout>
    </>
  )
}
