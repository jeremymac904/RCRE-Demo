/**
 * RCRE Luxury — Contact Page
 * Route: /agent/jacksonville-luxury/contact
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildContactSEO } from '@/lib/agent-website/seo'
import { LuxuryLayout } from '../LuxuryLayout'
import { LuxurySEO } from '../LuxurySEO'
import { LuxuryContactForm } from '../LuxuryContactForm'
import '../luxury.css'

export const metadata: Metadata = {
  title: 'Contact Alexandra Whitfield | RCRE Luxury',
}

const LUXURY_CONFIG = {
  theme: 'rcre-luxury' as const,
  markets: ['Ponte Vedra', 'Nocatee', 'Southbank', 'Mandarin', 'Intracoastal Waterway'],
  specialties: ['Waterfront', 'Luxury Estates', 'Relocation', 'Intracoastal', 'New Construction'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

export default function LuxuryContactPage() {
  const agent = getExampleAgent('jacksonville-luxury')!
  const seo = buildContactSEO(agent, LUXURY_CONFIG)

  return (
    <>
      <head>
        <LuxurySEO seo={seo} />
      </head>
      <LuxuryLayout agent={agent}>
        {/* Page hero */}
        <section className="lux-page-hero">
          <h1>Contact</h1>
          <p>
            For buyers entering the waterfront market — or sellers who have held a property long
            enough to know its worth.
          </p>
        </section>

        {/* Contact layout */}
        <section className="lux-section">
          <div className="lux-wrap">
            {/* Left: form */}
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <LuxuryContactForm agent={agent} />
            </div>

            {/* Right: direct info */}
            <aside style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid var(--lux-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                <div>
                  <p className="lux-section-label">Direct</p>
                  <p style={{ fontFamily: 'var(--lux-font-display)', fontSize: '1.1rem', color: 'var(--lux-text)', marginBottom: '0.5rem' }}>
                    {agent.name}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--lux-muted)' }}>{agent.phone}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--lux-muted)' }}>{agent.email}</p>
                </div>
                <div>
                  <p className="lux-section-label">Office Hours</p>
                  {[
                    ['Monday – Friday', '9:00 AM – 6:00 PM'],
                    ['Saturday', 'By appointment'],
                    ['Sunday', 'By appointment'],
                  ].map(([day, hrs]) => (
                    <div key={day} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.875rem', padding: '0.25rem 0', borderBottom: '1px solid var(--lux-border)' }}>
                      <span style={{ color: 'var(--lux-muted)' }}>{day}</span>
                      <span style={{ color: 'var(--lux-text)', fontWeight: 500 }}>{hrs}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="lux-section-label">Preferred Lender</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--lux-muted)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                    Jeremy McDonald<br />RCRE Financial Services
                  </p>
                  <a href="tel:+19045320068" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--lux-accent)', textDecoration: 'none' }}>
                    (904) 532-0068
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </LuxuryLayout>
    </>
  )
}
