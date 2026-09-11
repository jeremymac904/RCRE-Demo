/**
 * RCRE New Construction — About Page
 * Route: /agent/jacksonville-newconstruction/about
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildAboutSEO } from '@/lib/agent-website/seo'
import { NewConstructionLayout } from '../NewConstructionLayout'
import { NewConstructionSEO } from '../NewConstructionSEO'
import '../newconstruction.css'

export const metadata: Metadata = {
  title: 'About Marcus Webb | RCRE New Construction',
  description: 'Marcus Webb — New Construction REALTOR® with RCRE Group. 40+ new construction closings in Northeast Florida. Nocatee, Silverleaf, Durbin Creek.',
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

const TRANSACTION_HIGHLIGHTS = [
  { community: 'Nocatee — Phase 14', detail: 'Buyer representation, lot selection + design center, closed in 87 days', year: '2024' },
  { community: 'Silverleaf — Custom Lot 47', detail: 'Custom builder representation, pre-construction contract review, 11-month build', year: '2023' },
  { community: 'Durbin Creek — Lennar release', detail: 'Bulk buyer representation, 6 units across two phases', year: '2024' },
  { community: 'Ponte Vedra Waterfront — New Build', detail: 'Custom waterfront construction, Mattamy Homes, 14-month project', year: '2023' },
]

export default function AboutPage() {
  const agent = getExampleAgent('jacksonville-newconstruction')!
  const seo = buildAboutSEO(agent, NC_CONFIG)

  return (
    <>
      <head><NewConstructionSEO seo={seo} /></head>
      <NewConstructionLayout agent={agent}>
        {/* Page header */}
        <section style={{ backgroundColor: 'var(--nc-primary)', padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--nc-accent)', marginBottom: '0.5rem' }}>
            About
          </p>
          <h1 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
            {agent.name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {agent.title} · {agent.market}
          </p>
        </section>

        {/* Bio + headshot */}
        <section className="nc-section">
          <div className="nc-wrap">
            <div className="nc-about-grid">
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80'}
                  alt={agent.name}
                  className="nc-about-headshot"
                  loading="lazy"
                />
                <div style={{ marginTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--nc-muted)', marginBottom: '0.25rem' }}>{agent.phone}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--nc-muted)', marginBottom: '0.25rem' }}>{agent.email}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--nc-muted)' }}>License: {agent.license}</p>
                </div>
              </div>
              <div className="nc-about-bio">
                <p style={{ fontFamily: 'var(--nc-font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--nc-text)', marginBottom: '1.5rem' }}>
                  {agent.tagline}
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--nc-text)', lineHeight: 1.85, marginBottom: '1rem' }}>
                  {agent.bio}
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--nc-muted)', lineHeight: 1.85, marginBottom: '1rem' }}>
                  Marcus works exclusively with buyers — never dual agency, never listing-side representation in new construction.
                  He believes the builder has their own agent and their own interests; the buyer deserves the same.
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--nc-muted)', lineHeight: 1.85, marginBottom: '2rem' }}>
                  His builder relationships are built on transaction history, not marketing agreements.
                  He does not accept builder marketing fees, referral arrangements, or co-branded promotion agreements.
                </p>

                <div style={{ borderTop: '1px solid var(--nc-border)', paddingTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--nc-text)', marginBottom: '0.75rem' }}>
                    Markets served
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {agent.markets?.map((m) => (
                      <span key={m} className="nc-card-tag">{m}</span>
                    ))}
                  </div>
                </div>

                <p className="nc-license-note">
                  {agent.name}, {agent.title}, is a licensed real estate professional with River City Real Estate Group.
                  License: {agent.license}. Member, National Association of REALTORS®. Equal Housing Opportunity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Transaction highlights */}
        <section className="nc-section" style={{ backgroundColor: 'var(--nc-surface)', borderTop: '1px solid var(--nc-border)' }}>
          <div className="nc-wrap">
            <p className="nc-section-label">Track Record</p>
            <h2 className="nc-section-title">Representative Transactions</h2>
            <p className="nc-section-sub">
              A selection of new construction representations — builder, community, and buyer outcome.
              All subject to client privacy; details verified from closing records.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '680px' }}>
              {TRANSACTION_HIGHLIGHTS.map((t) => (
                <div key={t.community} style={{ background: 'var(--nc-bg)', border: '1px solid var(--nc-border)', padding: '1rem 1.25rem', borderRadius: 'var(--nc-radius)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--nc-text)' }}>{t.community}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--nc-muted)', marginTop: '0.25rem' }}>{t.detail}</p>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--nc-accent)', fontWeight: 600, flexShrink: 0 }}>{t.year}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="nc-cta-section">
          <h2>Ready to start your new construction search?</h2>
          <p>Let&apos;s talk about which community fits your timeline, budget, and build goals.</p>
          <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-hero-cta">
            Schedule a Consultation
          </Link>
        </div>
      </NewConstructionLayout>
    </>
  )
}
