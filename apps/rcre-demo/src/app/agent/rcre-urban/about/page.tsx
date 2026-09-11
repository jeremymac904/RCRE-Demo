/**
 * RCRE Urban Modern — About Page
 * Route: /agent/jacksonville-urban/about
 */
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildAboutSEO } from '@/lib/agent-website/seo'
import { UrbanLayout } from '../UrbanLayout'
import { UrbanSEO } from '../UrbanSEO'
import '../rcre-urban.css'

export const metadata: Metadata = {
  title: 'About Priya Nair | RCRE Urban Modern, Jacksonville',
}

const URBAN_CONFIG = {
  theme: 'rcre-urban' as const,
  markets: ['Riverside', 'Avondale', 'San Marco', 'Downtown Jacksonville', 'Brooklyn'],
  specialties: ['Urban Condo', 'Loft', 'Townhouse', 'Walkability', 'New Development', 'HOA Evaluation'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'About Priya Nair | RCRE Urban Modern, Jacksonville',
  seoDescription: 'Priya Nair — Urban REALTOR® with RCRE Group, specializing in Jacksonville urban core real estate.',
}

export default function UrbanAboutPage() {
  const agent = getExampleAgent('jacksonville-urban')!
  const seo = buildAboutSEO(agent, URBAN_CONFIG)

  return (
    <>
      <head><UrbanSEO seo={seo} /></head>
      <UrbanLayout agent={agent}>
        <section className="urban-section">
          <div className="urban-wrap">
            <p className="urban-section-label">About</p>
            <h1 className="urban-section-title">{agent.name}</h1>
            <div className="urban-about-grid" style={{ marginTop: '2.5rem' }}>
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80'}
                  alt={agent.name}
                  className="urban-about-headshot"
                />
              </div>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--urban-font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--urban-accent)',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '1rem',
                  }}
                >
                  {agent.title} · {agent.market}
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--urban-text)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  {agent.bio}
                </p>
                <p className="urban-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity.
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <a href={`tel:${agent.phone.replace(/[^0-9]/g, '')}`} style={{ fontSize: '0.9rem', color: 'var(--urban-accent)', textDecoration: 'none', fontWeight: 600 }}>
                    {agent.phone}
                  </a>
                  <a href={`mailto:${agent.email}`} style={{ fontSize: '0.9rem', color: 'var(--urban-accent)', textDecoration: 'none', fontWeight: 600 }}>
                    {agent.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Markets list */}
            <div style={{ marginTop: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--urban-font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--urban-primary)', letterSpacing: '-0.01em', marginBottom: '1rem' }}>
                Neighborhoods I Know
              </h2>
              <div className="urban-neighborhoods">
                {[
                  { name: 'Riverside', desc: 'Walkable, tree-lined, King Street dining, Cummer Museum, Riverside Park. Mix of 1920s bungalows to modern condos.' },
                  { name: 'Avondale', desc: 'West of Riverside. Strong neighborhood restaurants on St. John\'s Ave. Tudor, craftsman, updated mid-century.' },
                  { name: 'San Marco', desc: 'Jacksonville\'s most walkable mixed-use neighborhood. The Square, Marco Luther, Library — all within a few blocks.' },
                  { name: 'Downtown Jacksonville', desc: 'Southbank and core have seen significant investment since 2020. Riverfront towers, sports complex, emerging Brooklyn.' },
                  { name: 'Brooklyn', desc: 'Jacksonville\'s newest urban neighborhood. Warehouse loft conversions, new townhouse developments, planned retail.' },
                ].map((n) => (
                  <div key={n.name} className="urban-neighborhood-item">
                    <p className="urban-neighborhood-name">{n.name}</p>
                    <p className="urban-neighborhood-desc">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </UrbanLayout>
    </>
  )
}
