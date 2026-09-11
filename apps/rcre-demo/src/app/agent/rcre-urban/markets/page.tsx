/**
 * RCRE Urban Modern — Markets Page
 * Route: /agent/jacksonville-urban/markets
 */
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { UrbanLayout } from '../UrbanLayout'
import { UrbanSEO } from '../UrbanSEO'
import '../rcre-urban.css'

export const metadata: Metadata = {
  title: 'Neighborhoods | Priya Nair | RCRE Urban Modern',
}

const URBAN_CONFIG = {
  theme: 'rcre-urban' as const,
  markets: ['Riverside', 'Avondale', 'San Marco', 'Downtown Jacksonville', 'Brooklyn'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const MARKETS = [
  {
    name: 'Riverside',
    walkScore: 88,
    housingTypes: 'Condo, townhouse, bungalow, Victorian',
    priceRange: '$280K – $750K',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
    desc: 'The walkable heartbeat of Jacksonville. Tree-lined streets, King Street dining, the Cummer Museum, and Riverside Park — all within easy reach. The housing stock runs from 1920s bungalows to modern condos. The neighborhood skews toward buyers who want walkability and character over new construction.',
  },
  {
    name: 'Avondale',
    walkScore: 82,
    housingTypes: 'Tudor, craftsman, updated mid-century',
    priceRange: '$320K – $680K',
    image: 'https://images.unsplash.com/photo-1464082354059-27db6ce50048?w=800&q=80',
    desc: 'Immediately west of Riverside, Avondale skews slightly more residential with some of the city\'s best neighborhood restaurants along St. John\'s Avenue. Tudor, craftsman, and updated mid-century mix. Quieter than Riverside, still very walkable.',
  },
  {
    name: 'San Marco',
    walkScore: 79,
    housingTypes: 'Condo, townhouse, single-family',
    priceRange: '$290K – $900K',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    desc: 'Jacksonville\'s most walkable mixed-use neighborhood. The square, Marco Luther, and the Library are within a five-minute walk from most properties. Strong condo market with newer construction. Quieter than downtown, still very much a city neighborhood.',
  },
  {
    name: 'Downtown Jacksonville',
    walkScore: 91,
    housingTypes: 'High-rise condo, loft, townhouse',
    priceRange: '$200K – $1.2M',
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
    desc: 'Southbank and the core have seen significant investment since 2020. Riverfront towers, the sports complex corridor, and emerging Brooklyn neighborhood offer different price points and building types. The most urban of Jacksonville\'s neighborhoods.',
  },
  {
    name: 'Brooklyn',
    walkScore: 85,
    housingTypes: 'Loft conversion, new townhouse',
    priceRange: '$310K – $620K',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
    desc: 'The newest urban neighborhood in Jacksonville — a mix of warehouse loft conversions, new townhouse developments, and planned retail. Walkable between downtown and Riverside. Still developing — prices reflect both the location premium and the ongoing maturation of the neighborhood.',
  },
]

export default function UrbanMarketsPage() {
  const agent = getExampleAgent('jacksonville-urban')!
  const seo = {
    title: `Neighborhoods | ${agent.name} | RCRE Urban`,
    description: `${agent.name} knows Riverside, Avondale, San Marco, Downtown, and Brooklyn — Jacksonville urban core neighborhoods.`,
    canonical: 'https://rcregroup.com/agent/jacksonville-urban/markets',
    ogTitle: `Neighborhoods | ${agent.name} | RCRE Urban`,
    ogDescription: 'Jacksonville urban core neighborhoods — Riverside, Avondale, San Marco, Downtown, Brooklyn.',
    ogType: 'website' as const,
    ogImage: agent.heroImage,
    twitterCard: 'summary_large_image' as const,
    structuredData: [],
  }

  return (
    <>
      <head><UrbanSEO seo={seo} /></head>
      <UrbanLayout agent={agent}>
        <section className="urban-section">
          <div className="urban-wrap">
            <p className="urban-section-label">Neighborhoods</p>
            <h1 className="urban-section-title">Jacksonville Urban Core</h1>
            <p className="urban-section-sub" style={{ marginBottom: '2.5rem' }}>
              Five neighborhoods. No suburbs, no beach — just the city. Each has a distinct character,
              price point, and type of resident it attracts.
            </p>

            {MARKETS.map((m, i) => (
              <div
                key={m.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: i % 2 === 0 ? '300px 1fr' : '1fr 300px',
                  gap: '2.5rem',
                  alignItems: 'start',
                  marginBottom: '3rem',
                  paddingBottom: '3rem',
                  borderBottom: '1px solid var(--urban-border)',
                  direction: i % 2 === 0 ? 'ltr' : 'rtl',
                }}
              >
                <img
                  src={m.image}
                  alt={m.name}
                  style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--urban-radius)' }}
                  loading="lazy"
                />
                <div style={{ direction: 'ltr' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="urban-card-badge">Walk {m.walkScore}</span>
                    <span className="urban-card-badge">{m.priceRange}</span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--urban-font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--urban-primary)', letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>
                    {m.name}
                  </h2>
                  <p style={{ fontFamily: 'var(--urban-font-mono)', fontSize: '0.7rem', color: 'var(--urban-muted)', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                    {m.housingTypes}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--urban-text)', lineHeight: 1.7 }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </UrbanLayout>
    </>
  )
}
