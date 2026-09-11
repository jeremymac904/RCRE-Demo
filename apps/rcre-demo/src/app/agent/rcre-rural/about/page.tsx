/**
 * RCRE Rural & Land — About Page
 * Route: /agent/alabama-rural/about
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildAboutSEO } from '@/lib/agent-website/seo'
import { RuralLayout } from '../RuralLayout'
import { RuralSEO } from '../RuralSEO'
import '../rural.css'

export const metadata: Metadata = {
  title: 'About Coleman Reid | RCRE Rural & Land, Alabama',
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

export default function RuralAboutPage() {
  const agent = getExampleAgent('alabama-rural')!
  const seo = buildAboutSEO(agent, RURAL_CONFIG)

  return (
    <>
      <head>
        <RuralSEO seo={seo} />
      </head>
      <RuralLayout agent={agent}>
        {/* Page hero */}
        <section className="rural-page-hero">
          <h1>{agent.name}</h1>
          <p>{agent.title} · {agent.market}</p>
        </section>

        {/* Main bio */}
        <section className="rural-section">
          <div className="rural-wrap">
            <div className="rural-about-grid">
              {/* Portrait */}
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80'}
                  alt={agent.name}
                  className="rural-about-headshot"
                  loading="eager"
                />
              </div>

              {/* Bio */}
              <div className="rural-about-bio">
                <p className="rural-section-label">Biography</p>
                <h2 style={{ fontFamily: 'var(--rural-font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 500, fontStyle: 'italic', color: 'var(--rural-text)', marginBottom: '0.75rem' }}>
                  {agent.name}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--rural-accent)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2rem' }}>
                  {agent.title}
                </p>

                <p>
                  Coleman Reid was born on a working farm in the Alabama Wiregrass. He understands
                  what it means to walk a fence line at dawn and why a reliable water source matters
                  more than square footage.
                </p>
                <p>
                  After a decade in agricultural finance, he transitioned to rural real estate,
                  specializing in acreage, timberland, equestrian properties, and the unique USDA
                  and farm-service financing that comes with them. His clients are buyers who want
                  space — to work, to raise animals, to hunt, to breathe.
                </p>
                <p>
                  Before entering real estate, he spent ten years in agricultural lending with
                  Alabama Farm Credit, reviewing land appraisals, evaluating water rights, and
                  understanding how lenders assess rural property. That background gives him a
                  perspective that most rural agents do not have: he knows how a bank looks at
                  land, and he can tell a buyer the same thing.
                </p>
                <p>
                  He continues to maintain a working relationship with his family&apos;s Wiregrass farm.
                  He is not a full-time farmer, but he knows what a working farm looks like from
                  both sides of the transaction.
                </p>

                <div className="rural-land-note">
                  Coleman grew up on a working farm in the Wiregrass. He knows the difference between
                  100 acres of open pasture and 100 acres that includes 40 acres of rough timber,
                  a creek crossing, and three functioning ponds. That distinction matters at closing.
                </div>

                <p className="rural-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity. Acreage, carrying capacity, and water rights are subject
                  to independent verification. Licensed in Alabama (#REB-XXXX) and Florida (#SLXXXXXXX).
                </p>
              </div>
            </div>

            {/* Markets + Specialties */}
            <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
              <div>
                <p className="rural-section-label">Markets</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {RURAL_CONFIG.markets.map((m) => (
                    <li key={m} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--rural-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--rural-accent)', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--rural-font-display)', fontSize: '1.05rem', fontStyle: 'italic', color: 'var(--rural-text)' }}>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="rural-section-label">Specialties</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {RURAL_CONFIG.specialties.map((s) => (
                    <li key={s} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--rural-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--rural-accent)', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--rural-font-display)', fontSize: '1.05rem', fontStyle: 'italic', color: 'var(--rural-text)' }}>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact CTA */}
            <div style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', border: '1px solid var(--rural-border)', borderRadius: 'var(--rural-radius)', backgroundColor: 'var(--rural-surface)' }}>
              <h3 style={{ fontFamily: 'var(--rural-font-display)', fontSize: '1.5rem', fontWeight: 500, fontStyle: 'italic', color: 'var(--rural-text)', marginBottom: '0.75rem' }}>
                Ready to start looking?
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--rural-muted)', marginBottom: '1.25rem' }}>
                Tell us about your land search — acreage, livestock, equestrian use, farming intent.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href={`tel:${agent.phone.replace(/\D/g, '')}`}
                  style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--rural-text)', textDecoration: 'none', borderBottom: '1px solid var(--rural-border)' }}
                >
                  {agent.phone}
                </a>
                <Link href={`/agent/alabama-rural/contact`} className="rural-cta-btn">
                  Contact Coleman
                </Link>
              </div>
            </div>
          </div>
        </section>
      </RuralLayout>
    </>
  )
}
