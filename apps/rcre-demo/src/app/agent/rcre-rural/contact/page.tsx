/**
 * RCRE Rural & Land — Contact Page
 * Route: /agent/alabama-rural/contact
 */

import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildContactSEO } from '@/lib/agent-website/seo'
import { RuralLayout } from '../RuralLayout'
import { RuralSEO } from '../RuralSEO'
import { RuralContactForm } from '../RuralContactForm'
import '../rural.css'

export const metadata: Metadata = {
  title: 'Contact Coleman Reid | RCRE Rural & Land, Alabama',
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

export default function RuralContactPage() {
  const agent = getExampleAgent('alabama-rural')!
  const seo = buildContactSEO(agent, RURAL_CONFIG)

  return (
    <>
      <head>
        <RuralSEO seo={seo} />
      </head>
      <RuralLayout agent={agent}>
        {/* Page hero */}
        <section className="rural-page-hero">
          <h1>Contact</h1>
          <p>
            Tell us about your land search — acreage, livestock, equestrian use, farming intent.
            I follow up personally.
          </p>
        </section>

        {/* Contact layout */}
        <section className="rural-section">
          <div className="rural-wrap">
            {/* Form */}
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <RuralContactForm agent={agent} />
            </div>

            {/* Direct info */}
            <aside style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid var(--rural-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                <div>
                  <p className="rural-section-label">Direct</p>
                  <p style={{ fontFamily: 'var(--rural-font-display)', fontSize: '1.1rem', fontWeight: 500, fontStyle: 'italic', color: 'var(--rural-text)', marginBottom: '0.5rem' }}>
                    {agent.name}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--rural-muted)' }}>{agent.phone}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--rural-muted)' }}>{agent.email}</p>
                </div>
                <div>
                  <p className="rural-section-label">Hours</p>
                  {[
                    ['Monday – Friday', '7:30 AM – 5:00 PM'],
                    ['Saturday', 'By appointment'],
                    ['Sunday', 'Rare — but not impossible'],
                  ].map(([day, hrs]) => (
                    <div key={day} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.875rem', padding: '0.25rem 0', borderBottom: '1px solid var(--rural-border)' }}>
                      <span style={{ color: 'var(--rural-muted)' }}>{day}</span>
                      <span style={{ color: 'var(--rural-text)', fontWeight: 500 }}>{hrs}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="rural-section-label">Preferred Lender</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--rural-muted)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                    Jeremy McDonald<br />RCRE Financial Services
                  </p>
                  <a href="tel:+19045320068" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--rural-accent)', textDecoration: 'none' }}>
                    (904) 532-0068
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </RuralLayout>
    </>
  )
}
