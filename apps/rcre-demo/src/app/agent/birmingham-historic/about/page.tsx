/**
 * RCRE Historic Heritage — About Page
 * Route: /agent/birmingham-historic/about
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildAboutSEO } from '@/lib/agent-website/seo'
import { HistoricLayout } from '../HistoricLayout'
import { HistoricSEO } from '../HistoricSEO'
import '../historic.css'

export const metadata: Metadata = {
  title: 'About Eleanor Whitmore | RCRE Historic Heritage, Birmingham',
  description: 'Eleanor Whitmore — Historic & Heritage Property Specialist with RCRE Group. Birmingham, Alabama. 12 years specializing in period properties.',
}

const HH_CONFIG = {
  theme: 'rcre-historic' as const,
  markets: ['Highland Park', 'Mountain Brook', 'English Village', 'Cahaba Heights', 'Birmingham Historic Districts'],
  specialties: ['Historic Homes', 'Period Properties', 'Preservation', 'Estate Sales', 'Character Homes'],
  heroImage: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const CREDENTIALS = [
  { label: 'Years in Practice', value: '12 years' },
  { label: 'Historic Transactions', value: '80+' },
  { label: 'Architectural Eras', value: '5 (Tudor, Craftsman, Colonial Revival, Victorian, Mid-Century)' },
  { label: 'Historic Districts Covered', value: '4 Birmingham historic districts + Cahaba Heights' },
]

const VALUES = [
  {
    title: 'Preservation First',
    desc: 'The character of a period home is irreplaceable. I work to ensure that what makes a historic property worth buying is still there when you close — and still there when you eventually sell.',
  },
  {
    title: 'Informed Stewardship',
    desc: 'Historic homes require different maintenance, different renovation approaches, and different financing. I connect buyers with preservation architects, contractors who understand old houses, and lenders experienced with historic properties.',
  },
  {
    title: 'Estate and Family Transactions',
    desc: 'Settling a historic family property requires patience, sensitivity, and a clear understanding of what the property is worth in its current condition versus its renovated condition. I have handled these transactions for eleven years.',
  },
]

export default function AboutPage() {
  const agent = getExampleAgent('birmingham-historic')!
  const seo = buildAboutSEO(agent, HH_CONFIG)

  return (
    <>
      <head><HistoricSEO seo={seo} /></head>
      <HistoricLayout agent={agent}>
        {/* Page header */}
        <section style={{ backgroundColor: 'var(--hh-primary)', padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.5rem' }}>
            About
          </p>
          <h1 style={{ fontFamily: 'var(--hh-font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 400, fontStyle: 'italic', color: '#ffffff', marginBottom: '0.5rem' }}>
            {agent.name}
          </h1>
          <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.875rem', color: 'rgba(240,232,220,0.6)', fontWeight: 300, letterSpacing: '0.04em' }}>
            {agent.title} · {agent.market}
          </p>
        </section>

        {/* Bio */}
        <section className="hh-section">
          <div className="hh-wrap">
            <div className="hh-about-grid">
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80'}
                  alt={agent.name}
                  className="hh-about-headshot"
                  loading="lazy"
                />
                <div style={{ marginTop: '1.5rem' }}>
                  <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.78rem', color: 'var(--hh-muted)', marginBottom: '0.25rem', fontWeight: 300 }}>{agent.phone}</p>
                  <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.78rem', color: 'var(--hh-muted)', marginBottom: '0.25rem', fontWeight: 300 }}>{agent.email}</p>
                  <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.78rem', color: 'var(--hh-muted)', fontWeight: 300 }}>License: {agent.license}</p>
                </div>
              </div>
              <div className="hh-about-bio">
                <p style={{ fontFamily: 'var(--hh-font-display)', fontSize: '1.25rem', fontWeight: 400, fontStyle: 'italic', color: 'var(--hh-text)', marginBottom: '1.5rem' }}>
                  {agent.tagline}
                </p>
                <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.95rem', color: 'var(--hh-text)', lineHeight: 1.85, fontWeight: 300, marginBottom: '1rem' }}>
                  {agent.bio}
                </p>
                <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.95rem', color: 'var(--hh-muted)', lineHeight: 1.85, fontWeight: 300, marginBottom: '2rem' }}>
                  Eleanor takes a limited number of clients at a time. She does not list properties she
                  cannot genuinely represent, and she does not take listings in neighborhoods she does
                  not know well. Her practice is built on repeat clients and referrals from families
                  who have worked with her across multiple generations of a property.
                </p>

                <div style={{ borderTop: '1px solid var(--hh-border)', paddingTop: '1.5rem' }}>
                  <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.82rem', fontWeight: 500, color: 'var(--hh-text)', marginBottom: '0.75rem' }}>
                    Markets served
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {agent.markets?.map((m) => (
                      <span key={m} className="hh-card-style">{m}</span>
                    ))}
                  </div>
                </div>

                <p className="hh-license-note">
                  {agent.name}, {agent.title}, is a licensed real estate professional with River City Real Estate Group.
                  License: {agent.license}. Member, National Association of REALTORS®. Equal Housing Opportunity.
                  Historic designations subject to verification through the Alabama Historical Commission.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials */}
        <section className="hh-section" style={{ backgroundColor: 'var(--hh-surface)', borderTop: '1px solid var(--hh-border)' }}>
          <div className="hh-wrap">
            <p className="hh-section-label">Track Record</p>
            <h2 className="hh-section-title">Practice Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
              {CREDENTIALS.map((c) => (
                <div key={c.label} style={{ borderTop: '2px solid var(--hh-accent)', paddingTop: '1rem' }}>
                  <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.5rem' }}>
                    {c.label}
                  </p>
                  <p style={{ fontFamily: 'var(--hh-font-display)', fontSize: '1.1rem', fontWeight: 400, fontStyle: 'italic', color: 'var(--hh-text)' }}>
                    {c.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="hh-section">
          <div className="hh-wrap">
            <p className="hh-section-label">The Practice</p>
            <h2 className="hh-section-title">How I Work</h2>
            <div className="hh-approach-grid" style={{ marginTop: '2rem' }}>
              {VALUES.map((v) => (
                <div key={v.title} className="hh-approach-item">
                  <h3 className="hh-approach-title">{v.title}</h3>
                  <p className="hh-approach-desc">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="hh-cta-section">
          <h2>Historic homes, preservation-minded guidance.</h2>
          <p>If you are considering a period property in Birmingham, let&apos;s talk before you make an offer.</p>
          <Link href={`/agent/birmingham-historic/contact`} className="hh-hero-cta">
            Schedule a Consultation
          </Link>
        </div>
      </HistoricLayout>
    </>
  )
}
