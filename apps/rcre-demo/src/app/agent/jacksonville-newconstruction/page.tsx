/**
 * RCRE New Construction — Home Page
 * Route: /agent/jacksonville-newconstruction
 *
 * Marcus Webb · New Construction REALTOR® · Northeast Florida
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { NewConstructionLayout } from './NewConstructionLayout'
import { NewConstructionSEO } from './NewConstructionSEO'
import { NewConstructionContactForm } from './NewConstructionContactForm'
import './newconstruction.css'

export const metadata: Metadata = {
  title: 'Marcus Webb | RCRE New Construction, Northeast Florida',
  description:
    'Marcus Webb — New Construction REALTOR® with RCRE Group, specializing in builder representation, Nocatee, Silverleaf, and Durbin Creek communities in Northeast Florida.',
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

// Featured communities
const FEATURED_COMMUNITIES = [
  {
    id: 'c1',
    name: 'Nocatee',
    location: 'St. Johns County, FL',
    lots: 'Phase 17 lots available',
    priceRange: '$420K – $850K',
    builder: 'Mattamy Homes, D.R. Horton, Pulte',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80',
    type: 'Master-planned community',
  },
  {
    id: 'c2',
    name: 'Silverleaf',
    location: 'St. Johns County, FL',
    lots: 'Custom homesite selections open',
    priceRange: '$550K – $1.2M',
    builder: 'Standard Pacific, custom builders',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
    type: 'Custom & semi-custom',
  },
  {
    id: 'c3',
    name: 'Communities at Durbin Creek',
    location: 'Jacksonville, FL',
    lots: 'Pre-construction releases available',
    priceRange: '$380K – $620K',
    builder: 'D.R. Horton, Lennar, Pulte',
    image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=700&q=80',
    type: 'Volume builder community',
  },
]

// Builder relationships
const BUILDERS = [
  { name: 'Mattamy Homes', type: 'Master-planned, Gulf Coast active builder', logo: 'Mattamy' },
  { name: 'D.R. Horton', type: 'America\'s largest volume builder', logo: 'D.R. Horton' },
  { name: 'PulteGroup', type: 'Active in Nocatee and St. Johns County', logo: 'Pulte' },
  { name: 'Lennar', type: 'Southeast division, Jacksonville active', logo: 'Lennar' },
]

// Phases of the build process
const PHASES = [
  {
    number: 1,
    title: 'Pre-Construction',
    desc: 'Lot selection, builder evaluation, contract review, and timeline planning before the first shovel breaks ground.',
  },
  {
    number: 2,
    title: 'Design Center',
    desc: 'Upgrade guidance, structural options, and finish selections — knowing what is worth the cost before you commit.',
  },
  {
    number: 3,
    title: 'Construction',
    desc: 'Inspector-coordinated site visits, progress milestone tracking, and builder communication at each phase.',
  },
  {
    number: 4,
    title: 'Closing',
    desc: 'Final walk-through coordination, punch-list management, and builder warranty registration before you sign.',
  },
  {
    number: 5,
    title: 'Warranty Review',
    desc: '90-day and 11-month builder warranty reviews — documenting items and managing the builder\'s response.',
  },
]

// Resources
const RESOURCES = [
  {
    title: 'New Construction Buyer Guide',
    desc: 'The 5 phases of new construction, key contract terms, and what to expect from design center to closing.',
    icon: '📋',
  },
  {
    title: 'Builder Contract Checklist',
    desc: 'The non-negotiable contract terms to review before signing with any builder in Florida.',
    icon: '✅',
  },
  {
    title: 'Design Center Upgrade Matrix',
    desc: 'Common upgrades evaluated — what holds value, what does not, and where to spend.',
    icon: '🎨',
  },
]

export default function NewConstructionHomePage() {
  const agent = getExampleAgent('jacksonville-newconstruction')!
  const seo = buildHomeSEO(agent, NC_CONFIG)

  return (
    <>
      <head>
        <NewConstructionSEO seo={seo} />
      </head>
      <NewConstructionLayout agent={agent}>
        {/* ── 1. Hero ────────────────────────────────────────────────────────── */}
        <section className="nc-hero">
          <img
            src={agent.heroImage || NC_CONFIG.heroImage}
            alt="New construction home in Northeast Florida"
            className="nc-hero-img"
            loading="eager"
          />
          <div className="nc-hero-overlay" />
          <div className="nc-hero-content">
            <p className="nc-hero-kicker">{agent.market}</p>
            <h1 className="nc-hero-title">Nocatee to Downtown. Built with a Broker Who Knows the Builders.</h1>
            <p className="nc-hero-sub">Over 40 new construction closings in Northeast Florida.</p>
            <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-hero-cta">
              Explore New Homes
            </Link>
            <div className="nc-timeline">
              <span className="nc-timeline-badge"><span className="nc-timeline-dot" />Pre-Construction</span>
              <span className="nc-timeline-badge"><span className="nc-timeline-dot" />Under Construction</span>
              <span className="nc-timeline-badge"><span className="nc-timeline-dot" />Move-In Ready</span>
            </div>
          </div>
        </section>

        {/* ── 2. Featured Communities ─────────────────────────────────────────── */}
        <section className="nc-section">
          <div className="nc-wrap">
            <p className="nc-section-label">Featured Communities</p>
            <h2 className="nc-section-title">Builder Communities in Northeast Florida</h2>
            <p className="nc-section-sub">
              Active communities where I represent buyers. Lot availability and pricing subject to
              builder records — verify all details independently.
            </p>

            <div className="nc-grid-3">
              {FEATURED_COMMUNITIES.map((community) => (
                <article key={community.id} className="nc-card">
                  <img
                    src={community.image}
                    alt={community.name}
                    className="nc-card-img"
                    loading="lazy"
                  />
                  <div className="nc-card-body">
                    <span className="nc-card-tag">{community.type}</span>
                    <p className="nc-card-name">{community.name}</p>
                    <p className="nc-card-meta">{community.location}</p>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span className="nc-card-tag">{community.lots}</span>
                      <span className="nc-card-tag">{community.priceRange}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--nc-muted)', marginBottom: '0.875rem' }}>
                      Builders: {community.builder}
                    </p>
                    <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-card-link">
                      Inquire about this community →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link
                href={`/agent/jacksonville-newconstruction/listings`}
                style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--nc-cta)', textDecoration: 'none', borderBottom: '1px solid var(--nc-border)', paddingBottom: '1px' }}
              >
                View all communities →
              </Link>
            </p>
          </div>
        </section>

        {/* ── 3. How I Help ───────────────────────────────────────────────────── */}
        <section className="nc-section" id="how-i-help" style={{ backgroundColor: 'var(--nc-surface)', borderTop: '1px solid var(--nc-border)', borderBottom: '1px solid var(--nc-border)' }}>
          <div className="nc-wrap">
            <p className="nc-section-label">How I Help</p>
            <h2 className="nc-section-title">Five Phases of New Construction Representation</h2>
            <p className="nc-section-sub">
              Most buyers make their most expensive decisions — lot, floor plan, upgrades — without a
              broker. I stay in every phase.
            </p>

            <div className="nc-phases">
              {PHASES.map((phase) => (
                <div key={phase.number} className="nc-phase">
                  <div className="nc-phase-number">{phase.number}</div>
                  <p className="nc-phase-title">{phase.title}</p>
                  <p className="nc-phase-desc">{phase.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Builder Relationships ───────────────────────────────────────── */}
        <section className="nc-section">
          <div className="nc-wrap">
            <p className="nc-section-label">Builder Relationships</p>
            <h2 className="nc-section-title">Builders I Work With Most Often</h2>
            <p className="nc-section-sub">
              I work with the builders most active in the Northeast Florida market — here are the ones
              I represent buyers with most often. Each relationship is built on transaction history,
              not marketing agreements.
            </p>

            <div className="nc-builder-grid">
              {BUILDERS.map((b) => (
                <div key={b.name} className="nc-builder-card">
                  <div className="nc-builder-logo">{b.logo}</div>
                  <p className="nc-builder-name">{b.name}</p>
                  <p className="nc-builder-type">{b.type}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--nc-muted)', marginTop: '1.25rem', textAlign: 'center' }}>
              Builder relationships are established through buyer representation history.
              No builder pays a marketing fee to appear on this site.
            </p>
          </div>
        </section>

        {/* ── 5. Resources ─────────────────────────────────────────────────────── */}
        <section className="nc-section" style={{ backgroundColor: 'var(--nc-surface)', borderTop: '1px solid var(--nc-border)', borderBottom: '1px solid var(--nc-border)' }}>
          <div className="nc-wrap">
            <p className="nc-section-label">Resources</p>
            <h2 className="nc-section-title">Buyer Resources</h2>
            <p className="nc-section-sub">
              Downloadable guides built from forty-plus new construction transactions in the Jacksonville market.
            </p>

            <div className="nc-resource-list">
              {RESOURCES.map((r) => (
                <div key={r.title} className="nc-resource-item" role="link" aria-label={r.title}>
                  <div className="nc-resource-icon">
                    <span style={{ fontSize: '1.2rem' }}>{r.icon}</span>
                  </div>
                  <div>
                    <p className="nc-resource-title">{r.title}</p>
                    <p className="nc-resource-desc">{r.desc}</p>
                  </div>
                  <span className="nc-resource-arrow">→</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. About ───────────────────────────────────────────────────────── */}
        <section className="nc-section">
          <div className="nc-wrap">
            <div className="nc-about-grid">
              {/* Headshot */}
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80'}
                  alt={agent.name}
                  className="nc-about-headshot"
                  loading="lazy"
                />
              </div>
              {/* Bio */}
              <div className="nc-about-bio">
                <p className="nc-section-label">About</p>
                <h2 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, color: 'var(--nc-text)', marginBottom: '0.5rem' }}>
                  {agent.name}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--nc-accent)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                  {agent.title}
                </p>

                <p style={{ fontSize: '0.95rem', color: 'var(--nc-text)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  Marcus Webb has closed over forty new construction transactions in the Jacksonville
                  market, representing buyers in Nocatee, Silverleaf, the Communities at Durbin Creek,
                  and Jacksonville&apos;s newest waterfront developments.
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--nc-muted)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  He knows the difference between a spec home and a custom build, understands the builder
                  contract negotiation points that matter, and has relationships with the regional builders
                  most active in Northeast Florida.
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--nc-muted)', lineHeight: 1.8 }}>
                  His clients avoid the five most common new construction mistakes because he walks them
                  through every phase: pre-construction, design center, construction, closing, and warranty.
                </p>

                <p className="nc-license-note">
                  {agent.name}, {agent.title}, is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Contact ─────────────────────────────────────────────────────── */}
        <section className="nc-section" style={{ backgroundColor: 'var(--nc-bg)' }}>
          <div className="nc-wrap">
            <NewConstructionContactForm agent={agent} />
          </div>
        </section>

        {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
        <div className="nc-cta-section">
          <h2>New construction, without the surprises.</h2>
          <p>
            Whether you are buying your first new home or your fifth, Marcus brings the same
            process: know the builder, know the contract, know the timeline.
          </p>
          <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-hero-cta">
            Explore New Homes
          </Link>
        </div>
      </NewConstructionLayout>
    </>
  )
}
