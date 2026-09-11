/**
 * RCRE Historic Heritage — Contact Page
 * Route: /agent/birmingham-historic/contact
 */

import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildContactSEO } from '@/lib/agent-website/seo'
import { HistoricLayout } from '../HistoricLayout'
import { HistoricSEO } from '../HistoricSEO'
import { HistoricContactForm } from '../HistoricContactForm'
import '../historic.css'

export const metadata: Metadata = {
  title: 'Contact Eleanor Whitmore | RCRE Historic Heritage',
  description: 'Reach Eleanor Whitmore — Historic & Heritage Property Specialist with RCRE Group. (205) 555-0391.',
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

export default function ContactPage() {
  const agent = getExampleAgent('birmingham-historic')!
  const seo = buildContactSEO(agent, HH_CONFIG)

  return (
    <>
      <head><HistoricSEO seo={seo} /></head>
      <HistoricLayout agent={agent}>
        {/* Page header */}
        <section style={{ backgroundColor: 'var(--hh-primary)', padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.5rem' }}>
            Contact
          </p>
          <h1 style={{ fontFamily: 'var(--hh-font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 400, fontStyle: 'italic', color: '#ffffff', marginBottom: '0.5rem' }}>
            Tell us about the property you&apos;re considering.
          </h1>
          <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.95rem', color: 'rgba(240,232,220,0.6)', fontWeight: 300 }}>
            {agent.name} · {agent.phone} · {agent.email}
          </p>
        </section>

        {/* Contact details + form */}
        <section className="hh-section">
          <div className="hh-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '4rem', alignItems: 'start' }}>
              {/* Contact info */}
              <div>
                <h2 style={{ fontFamily: 'var(--hh-font-display)', fontSize: '1.25rem', fontWeight: 400, fontStyle: 'italic', color: 'var(--hh-text)', marginBottom: '1.5rem' }}>
                  Direct contact
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.25rem' }}>Phone</p>
                    <a href={`tel:${agent.phone.replace(/\D/g, '')}`} style={{ fontFamily: 'var(--hh-font-display)', fontSize: '1rem', fontWeight: 500, fontStyle: 'italic', color: 'var(--hh-text)', textDecoration: 'none' }}>
                      {agent.phone}
                    </a>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.25rem' }}>Email</p>
                    <a href={`mailto:${agent.email}`} style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.9rem', color: 'var(--hh-text)', textDecoration: 'none', fontWeight: 300 }}>
                      {agent.email}
                    </a>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.25rem' }}>Market</p>
                    <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.9rem', color: 'var(--hh-muted)', fontWeight: 300 }}>{agent.market}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.25rem' }}>License</p>
                    <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.85rem', color: 'var(--hh-muted)', fontWeight: 300 }}>{agent.license}</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--hh-border)', paddingTop: '1.5rem' }}>
                  <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.5rem' }}>Preferred Lender</p>
                  <p style={{ fontFamily: 'var(--hh-font-display)', fontSize: '0.875rem', fontWeight: 400, fontStyle: 'italic', color: 'var(--hh-text)', marginBottom: '0.25rem' }}>Jeremy McDonald</p>
                  <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.82rem', color: 'var(--hh-muted)', marginBottom: '0.25rem', fontWeight: 300 }}>RCRE Financial Services</p>
                  <a href="tel:+19045320068" style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.85rem', color: 'var(--hh-cta)', textDecoration: 'none' }}>(904) 532-0068</a>
                </div>
              </div>

              {/* Form */}
              <HistoricContactForm agent={agent} />
            </div>
          </div>
        </section>
      </HistoricLayout>
    </>
  )
}
