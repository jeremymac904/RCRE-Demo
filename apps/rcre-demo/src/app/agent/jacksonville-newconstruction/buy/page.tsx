/**
 * RCRE New Construction — Buy / Find a New Home Page
 * Route: /agent/jacksonville-newconstruction/buy
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildListingsSEO } from '@/lib/agent-website/seo'
import { NewConstructionLayout } from '../NewConstructionLayout'
import { NewConstructionSEO } from '../NewConstructionSEO'
import '../newconstruction.css'

export const metadata: Metadata = {
  title: 'Find a New Home | Marcus Webb | RCRE New Construction',
  description: 'Browse new construction communities in Northeast Florida with Marcus Webb — Nocatee, Silverleaf, Durbin Creek.',
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

const COMMUNITIES = [
  {
    name: 'Nocatee',
    tagline: 'Master-planned community, St. Johns County',
    desc: 'Florida\'s fastest-growing master-planned community. Mattamy Homes, D.R. Horton, and Pulte are the primary volume builders. Amenities include the Nocatee Preserve, Splash water park, and top-rated St. Johns County schools.',
    builders: ['Mattamy Homes', 'D.R. Horton', 'PulteGroup'],
    priceRange: '$420K – $850K',
    status: 'Active — multiple phases',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80',
  },
  {
    name: 'Silverleaf',
    tagline: 'Custom & semi-custom, St. Johns County',
    desc: 'Larger lots and a more custom construction environment than Nocatee. Semi-custom builders operate alongside individual custom builders. Ideal for buyers who know what they want and want to build it to spec.',
    builders: ['Standard Pacific', 'Pulte — Custom Division', 'Independent custom builders'],
    priceRange: '$550K – $1.4M+',
    status: 'Active — custom lot releases ongoing',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
  },
  {
    name: 'Communities at Durbin Creek',
    tagline: 'Volume builder community, Jacksonville',
    desc: 'Southeast Jacksonville\'s primary volume-builder corridor. Lennar, D.R. Horton, and Pulte release new phases regularly. Convenient to I-95 and the St. Johns Town Center. Good inventory of move-in-ready spec homes.',
    builders: ['Lennar', 'D.R. Horton', 'PulteGroup'],
    priceRange: '$380K – $620K',
    status: 'Active — spec homes available',
    image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=700&q=80',
  },
  {
    name: 'Jacksonville New Development',
    tagline: 'Urban infill & waterfront new build, Jacksonville',
    desc: 'Downtown Jacksonville and the Southbank corridor have an active new development market — condos, townhomes, and mixed-use. Distinct from the suburban volume builder communities.',
    builders: ['Developer-specific', 'Custom boutique builders'],
    priceRange: '$300K – $1.2M',
    status: 'Variable — project-specific',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80',
  },
]

export default function BuyPage() {
  const agent = getExampleAgent('jacksonville-newconstruction')!
  const seo = buildListingsSEO(agent, NC_CONFIG)

  return (
    <>
      <head><NewConstructionSEO seo={seo} /></head>
      <NewConstructionLayout agent={agent}>
        {/* Hero */}
        <section style={{ backgroundColor: 'var(--nc-primary)', padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.5rem' }}>
            Find a New Home
          </p>
          <h1 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
            Builder Communities in Northeast Florida
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', maxWidth: '560px', margin: '0 auto 1.5rem', lineHeight: 1.65 }}>
            Active communities where I represent buyers. Lot availability and pricing subject to builder records.
          </p>
          <Link href={`/agent/jacksonville-newconstruction/contact`} style={{ display: 'inline-block', background: 'var(--nc-cta)', color: '#fff', padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', borderRadius: 'var(--nc-radius)' }}>
            Start My Search
          </Link>
        </section>

        {/* Communities */}
        <section className="nc-section">
          <div className="nc-wrap">
            <p className="nc-section-label">Communities</p>
            <h2 className="nc-section-title">Active Builder Communities</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2.5rem' }}>
              {COMMUNITIES.map((c, i) => (
                <article key={c.name} className="nc-card" style={{ display: 'grid', gridTemplateColumns: '340px 1fr' }}>
                  <img src={c.image} alt={c.name} style={{ width: '100%', height: '240px', objectFit: 'cover' }} loading="lazy" />
                  <div className="nc-card-body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div>
                        <p className="nc-card-name">{c.name}</p>
                        <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--nc-muted)', marginTop: '0.125rem' }}>{c.tagline}</p>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--nc-accent)', background: 'rgba(79,142,247,0.08)', padding: '0.25rem 0.625rem', borderRadius: 'var(--nc-radius)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {c.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--nc-muted)', lineHeight: 1.7, marginBottom: '1rem' }}>{c.desc}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      {c.builders.map((b) => <span key={b} className="nc-card-tag">{b}</span>)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--nc-text)' }}>{c.priceRange}</p>
                      <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-card-link">Inquire →</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="nc-cta-section">
          <h2>Ready to explore communities?</h2>
          <p>Tell us your budget, timeline, and community preferences — we&apos;ll set up site visits.</p>
          <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-hero-cta">
            Start My Search
          </Link>
        </div>
      </NewConstructionLayout>
    </>
  )
}
