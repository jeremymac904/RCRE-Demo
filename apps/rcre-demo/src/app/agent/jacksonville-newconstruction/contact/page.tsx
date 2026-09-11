/**
 * RCRE New Construction — Contact Page
 * Route: /agent/jacksonville-newconstruction/contact
 */

import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildContactSEO } from '@/lib/agent-website/seo'
import { NewConstructionLayout } from '../NewConstructionLayout'
import { NewConstructionSEO } from '../NewConstructionSEO'
import { NewConstructionContactForm } from '../NewConstructionContactForm'
import '../newconstruction.css'

export const metadata: Metadata = {
  title: 'Contact Marcus Webb | RCRE New Construction',
  description: 'Reach Marcus Webb — New Construction REALTOR® with RCRE Group. (904) 555-0287.',
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

export default function ContactPage() {
  const agent = getExampleAgent('jacksonville-newconstruction')!
  const seo = buildContactSEO(agent, NC_CONFIG)

  return (
    <>
      <head><NewConstructionSEO seo={seo} /></head>
      <NewConstructionLayout agent={agent}>
        {/* Page header */}
        <section style={{ backgroundColor: 'var(--nc-primary)', padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.5rem' }}>
            Contact
          </p>
          <h1 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
            Start Your New Construction Search
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>
            {agent.name} · {agent.phone} · {agent.email}
          </p>
        </section>

        {/* Contact details + form */}
        <section className="nc-section">
          <div className="nc-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '4rem', alignItems: 'start' }}>
              {/* Contact info */}
              <div>
                <h2 style={{ fontFamily: 'var(--nc-font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--nc-text)', marginBottom: '1.5rem' }}>
                  Direct contact
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.25rem' }}>Phone</p>
                    <a href={`tel:${agent.phone.replace(/\D/g, '')}`} style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--nc-text)', textDecoration: 'none' }}>
                      {agent.phone}
                    </a>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.25rem' }}>Email</p>
                    <a href={`mailto:${agent.email}`} style={{ fontSize: '0.9rem', color: 'var(--nc-text)', textDecoration: 'none' }}>
                      {agent.email}
                    </a>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.25rem' }}>Market</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--nc-muted)' }}>{agent.market}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.25rem' }}>License</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--nc-muted)' }}>{agent.license}</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--nc-border)', paddingTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.5rem' }}>Preferred Lender</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--nc-text)', fontWeight: 600, marginBottom: '0.25rem' }}>Jeremy McDonald</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--nc-muted)', marginBottom: '0.25rem' }}>RCRE Financial Services</p>
                  <a href="tel:+19045320068" style={{ fontSize: '0.85rem', color: 'var(--nc-cta)', textDecoration: 'none' }}>(904) 532-0068</a>
                </div>
              </div>

              {/* Form */}
              <NewConstructionContactForm agent={agent} />
            </div>
          </div>
        </section>
      </NewConstructionLayout>
    </>
  )
}
