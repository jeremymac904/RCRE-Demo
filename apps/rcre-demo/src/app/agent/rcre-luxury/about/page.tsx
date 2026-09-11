/**
 * RCRE Luxury — About Page
 * Route: /agent/jacksonville-luxury/about
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildAboutSEO } from '@/lib/agent-website/seo'
import { LuxuryLayout } from '../LuxuryLayout'
import { LuxurySEO } from '../LuxurySEO'
import '../luxury.css'

export const metadata: Metadata = {
  title: 'About Alexandra Whitfield | RCRE Luxury, Northeast Florida',
}

const LUXURY_CONFIG = {
  theme: 'rcre-luxury' as const,
  markets: ['Ponte Vedra', 'Nocatee', 'Southbank', 'Mandarin', 'Intracoastal Waterway'],
  specialties: ['Waterfront', 'Luxury Estates', 'Relocation', 'Intracoastal', 'New Construction'],
  heroImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

export default function LuxuryAboutPage() {
  const agent = getExampleAgent('jacksonville-luxury')!
  const seo = buildAboutSEO(agent, LUXURY_CONFIG)

  return (
    <>
      <head>
        <LuxurySEO seo={seo} />
      </head>
      <LuxuryLayout agent={agent}>
        {/* Page hero */}
        <section className="lux-page-hero">
          <h1>{agent.name}</h1>
          <p>{agent.title} · {agent.market}</p>
        </section>

        {/* Main bio */}
        <section className="lux-section">
          <div className="lux-wrap">
            <div className="lux-about-grid">
              {/* Portrait */}
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=80'}
                  alt={agent.name}
                  className="lux-about-headshot"
                  loading="eager"
                />
              </div>

              {/* Bio */}
              <div className="lux-about-bio">
                <p className="lux-section-label">Biography</p>
                <h2 style={{ fontFamily: 'var(--lux-font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 400, color: 'var(--lux-text)', marginBottom: '0.75rem' }}>
                  {agent.name}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--lux-accent)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2rem' }}>
                  {agent.title}
                </p>

                <p>
                  Alexandra Whitfield has spent fifteen years navigating the nuances of Northeast Florida&apos;s
                  most coveted waterfront and estate communities. Her practice centers on discretion,
                  architectural literacy, and the understanding that a significant property transaction
                  is rarely just about real estate.
                </p>
                <p>
                  She has represented buyers and sellers in Ponte Vedra, Nocatee, and the Southbank
                  corridor, with transactions ranging from primary residences to legacy estate acquisitions.
                  Her clients are buyers who already own property in this market — or buyers who are
                  entering it for the first time with a clear sense of what they are looking for.
                </p>
                <p>
                  Architectural education matters in this work. She reads floor plans the way she reads
                  title — carefully, with attention to what is implied but not stated. She works with a
                  small number of clients at a time.
                </p>
                <p>
                  Before entering real estate, she spent five years in urban planning and design review,
                  giving her an unusual perspective on how communities hold their character — and how
                  individual properties contribute to or detract from that.
                </p>
                <p>
                  She is a member of the National Association of REALTORS®, the Florida Association of
                  REALTORS®, and the Architectural Review Board of two Ponte Vedra communities.
                </p>

                <p className="lux-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity. Licensed in Alabama (#REB-XXXX) and Florida (#SLXXXXXXX).
                </p>
              </div>
            </div>

            {/* Markets + Specialties */}
            <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
              <div>
                <p className="lux-section-label">Markets</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {LUXURY_CONFIG.markets.map((m) => (
                    <li key={m} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--lux-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--lux-accent)', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--lux-font-display)', fontSize: '1.05rem', color: 'var(--lux-text)' }}>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="lux-section-label">Specialties</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {LUXURY_CONFIG.specialties.map((s) => (
                    <li key={s} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--lux-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--lux-accent)', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--lux-font-display)', fontSize: '1.05rem', color: 'var(--lux-text)' }}>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact CTA */}
            <div style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', border: '1px solid var(--lux-border)', backgroundColor: 'var(--lux-surface)' }}>
              <h3 style={{ fontFamily: 'var(--lux-font-display)', fontSize: '1.5rem', fontWeight: 300, color: 'var(--lux-text)', marginBottom: '0.75rem' }}>
                Ready to begin a quiet conversation?
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--lux-muted)', marginBottom: '1.25rem' }}>
                Reach out directly, or schedule a showing through the contact form.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href={`tel:${agent.phone.replace(/\D/g, '')}`}
                  style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--lux-text)', textDecoration: 'none', borderBottom: '1px solid var(--lux-border)' }}
                >
                  {agent.phone}
                </a>
                <Link href={`/agent/jacksonville-luxury/contact`} className="lux-cta-btn">
                  Contact Alexandra
                </Link>
              </div>
            </div>
          </div>
        </section>
      </LuxuryLayout>
    </>
  )
}
