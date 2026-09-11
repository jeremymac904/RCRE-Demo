/**
 * RCRE Suburban Family — About Page
 * Route: /agent/family/about
 */
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildAboutSEO } from '@/lib/agent-website/seo'
import { SuburbanLayout } from '../SuburbanLayout'
import { SuburbanSEO } from '../SuburbanSEO'
import '../rcre-suburban.css'

export const metadata: Metadata = {
  title: 'About Jordan Mercer | RCRE Suburban Family',
}

const SUBURBAN_CONFIG = {
  theme: 'rcre-suburban' as const,
  markets: ['St. Johns County', 'Jacksonville Suburbs', 'Birmingham Suburbs', 'Mandarin', 'Nocatee'],
  specialties: ['Families', 'School Districts', 'First-Time Buyers', 'Move-Up Buyers', 'HOA Communities'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'About Jordan Mercer | RCRE Suburban Family',
  seoDescription: 'Jordan Mercer — Suburban Family specialist with RCRE Group, serving families in St. Johns County and Jacksonville suburbs.',
}

export default function SuburbanAboutPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildAboutSEO(agent, SUBURBAN_CONFIG)

  return (
    <>
      <head><SuburbanSEO seo={seo} /></head>
      <SuburbanLayout agent={agent}>
        <section className="sub-section">
          <div className="sub-wrap">
            <p className="sub-section-label">About</p>
            <h1 className="sub-section-title">{agent.name}</h1>

            <div className="sub-about-grid" style={{ marginTop: '2.5rem' }}>
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'}
                  alt={agent.name}
                  className="sub-about-headshot"
                />
              </div>
              <div>
                <p
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--sub-accent)',
                    letterSpacing: '0.04em',
                    marginBottom: '1rem',
                  }}
                >
                  {agent.title} · Suburban Family Division
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--sub-text)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  {agent.bio}
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--sub-text)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  In the Suburban Family division of RCRE, I focus specifically on family buyers and sellers in
                  communities where schools, commute, and neighborhood amenities are primary criteria. This isn&apos;t a
                  secondary specialty — it&apos;s the practice.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sub-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Phone</p>
                    <a href={`tel:${agent.phone.replace(/[^0-9]/g, '')}`} style={{ fontSize: '0.9rem', color: 'var(--sub-primary)', textDecoration: 'none', fontWeight: 700 }}>{agent.phone}</a>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sub-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Email</p>
                    <a href={`mailto:${agent.email}`} style={{ fontSize: '0.9rem', color: 'var(--sub-primary)', textDecoration: 'none', fontWeight: 700 }}>{agent.email}</a>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sub-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>License</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--sub-text)' }}>{agent.license}</p>
                  </div>
                </div>

                <p className="sub-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.{' '}
                  Member, National Association of REALTORS®. Equal Housing Opportunity.
                </p>
              </div>
            </div>

            {/* Community focus */}
            <div style={{ marginTop: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--sub-font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--sub-primary)', marginBottom: '1rem' }}>
                Communities I Know
              </h2>
              <div className="sub-districts">
                {[
                  { name: 'St. Johns County', desc: 'Top-rated district in Florida. Nocatee, Durbin Creek, St. Johns Forest. Newer communities, strong resale.' },
                  { name: 'Mandarin', desc: 'Established neighborhood with mature trees, good schools, mix of original and updated homes from the 70s and 80s.' },
                  { name: 'Julington Creek', desc: 'Master-planned community. Highly rated schools, planned amenities, townhomes to estate homes.' },
                  { name: 'Nocatee', desc: 'Florida\'s largest master-planned community. Families for schools, amenities, and relative affordability vs. coastal.' },
                ].map((d) => (
                  <div key={d.name} className="sub-district-card">
                    <p className="sub-district-name">{d.name}</p>
                    <p className="sub-district-desc">{d.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SuburbanLayout>
    </>
  )
}
