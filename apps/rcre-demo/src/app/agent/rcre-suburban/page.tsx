/**
 * RCRE Suburban Family — Home Page
 * Route: /agent/family
 *
 * Jordan Mercer · REALTOR® · RCRE Suburban Family Division
 * Theme: rcre-suburban
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { SuburbanLayout } from './SuburbanLayout'
import { SuburbanSEO } from './SuburbanSEO'
import { SuburbanContactForm } from './SuburbanContactForm'
import './rcre-suburban.css'

export const metadata: Metadata = {
  title: 'Jordan Mercer | RCRE Suburban Family, St. Johns County & Jacksonville Suburbs',
  description:
    'Jordan Mercer — Suburban Family specialist with RCRE Group, serving families in St. Johns County, Jacksonville suburbs, and Birmingham with school-district expertise.',
}

const SUBURBAN_CONFIG = {
  theme: 'rcre-suburban' as const,
  markets: ['St. Johns County', 'Jacksonville Suburbs', 'Birmingham Suburbs', 'Mandarin', 'Nocatee'],
  specialties: ['Families', 'School Districts', 'First-Time Buyers', 'Move-Up Buyers', 'HOA Communities'],
  heroImage: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const FEATURED_HOMES = [
  {
    id: 'h1',
    address: '234 St. Johns Ave, St. Johns, FL 32259',
    price: 525000,
    beds: 4,
    baths: 3,
    sqft: 2840,
    schoolDistrict: 'St. Johns County — rated 9/10',
    community: 'St. Johns Golf & Country Club',
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=700&q=80',
  },
  {
    id: 'h2',
    address: '11840 Mandarin Rd, Jacksonville, FL 32223',
    price: 445000,
    beds: 3,
    baths: 2.5,
    sqft: 2380,
    schoolDistrict: 'Mandarin Middle / Mandarin High — rated 8/10',
    community: 'Woodstock Commons',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
  },
  {
    id: 'h3',
    address: '567 Julington Creek Dr, Jacksonville, FL 32259',
    price: 615000,
    beds: 5,
    baths: 3,
    sqft: 3420,
    schoolDistrict: 'Julington Creek Elementary — rated 10/10',
    community: 'Julington Creek Plantation',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80',
  },
]

const DISTRICTS = [
  {
    name: 'St. Johns County',
    desc: 'Consistently top-rated district in Florida. Newer communities, strong resale, and a steady stream of buyers who prioritize school quality. Nocatee, Durbin Creek, and St. Johns Forest are the core neighborhoods.',
    hoa: '$65–$150/mo · amenity-based',
    rating: 'GreatSchools 8–10/10',
    note: 'Source: GreatSchools.org — data as of available reporting period',
  },
  {
    name: 'Mandarin',
    desc: 'Established neighborhood with mature trees, waterfront parcels, and good school options. Mandarin Middle and Mandarin High serve most of the area. Mix of original and updated homes from the 70s and 80s.',
    hoa: '$0–$85/mo depending on community',
    rating: 'GreatSchools 7–9/10',
    note: 'Source: GreatSchools.org — data as of available reporting period',
  },
  {
    name: 'Julington Creek',
    desc: 'Master-planned community in the northwest corner of St. Johns County. Highly rated schools, planned amenities, and a mix of townhomes, single-family, and estate homes. Strong community identity.',
    hoa: '$75–$120/mo · HOA-managed',
    rating: 'GreatSchools 9–10/10',
    note: 'Source: GreatSchools.org — data as of available reporting period',
  },
  {
    name: 'Nocatee',
    desc: 'Florida\'s largest master-planned community. Continues to expand with new phases and builders. Families move here for the schools, the amenities (splash parks, trails, sports complexes), and the relative affordability vs. coastal markets.',
    hoa: '$55–$105/mo · community-managed',
    rating: 'GreatSchools 8–9/10',
    note: 'Source: GreatSchools.org — data as of available reporting period',
  },
]

const JOURNEY = [
  { step: 1, title: 'Search', desc: 'We identify neighborhoods and homes that match your family\'s needs — including school district, commute, and community.' },
  { step: 2, title: 'Tour', desc: 'In-person or virtual tours of homes that meet your criteria. I\'ll point out what you won\'t catch from the listing photos.' },
  { step: 3, title: 'Offer', desc: 'When you find the right home, we structure and submit an offer — backed by market data, not guesswork.' },
  { step: 4, title: 'Close', desc: 'Inspection, appraisal, financing, and closing coordination. I track every deadline and communicate every step.' },
]

const SELLER_RESOURCES = [
  {
    title: 'Home Prep Guide',
    desc: 'A room-by-room checklist for getting your home show-ready before listing. Includes contractor recommendations and staging basics.',
    slug: 'home-prep-guide',
  },
  {
    title: 'Pricing Strategy',
    desc: 'How I use current market data, comparable sales, and buyer demand to arrive at the right asking price — not an inflated one.',
    slug: 'pricing-strategy',
  },
  {
    title: 'Marketing Plan',
    desc: 'Professional photography, MLS exposure, social media, and targeted outreach — a complete plan before we go live.',
    slug: 'marketing-plan',
  },
]

const TESTIMONIAL = {
  quote:
    "We moved here from Atlanta with two kids and no idea where to start. Jordan knew which neighborhoods matched our school preferences, which communities had the amenities our kids actually wanted, and where we could get the most house for our budget. The whole process took about six weeks.",
  attr: '— Sarah M., Buyer, St. Johns County · 2025',
}

export default function SuburbanHomePage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildHomeSEO(agent, SUBURBAN_CONFIG)

  return (
    <>
      <head>
        <SuburbanSEO seo={seo} />
      </head>
      <SuburbanLayout agent={agent}>
        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <section className="sub-hero">
          <img
            src={agent.heroImage || SUBURBAN_CONFIG.heroImage}
            alt="Suburban neighborhood with tree-lined street"
            className="sub-hero-img"
            loading="eager"
          />
          <div className="sub-hero-overlay" />
          <div className="sub-hero-content">
            <p className="sub-hero-kicker">
              St. Johns County · Jacksonville Suburbs · Great Schools Nearby
            </p>
            <h1 className="sub-hero-title">
              Find Your Neighborhood, Not Just a House.
            </h1>
            <p className="sub-hero-sub">
              School-district expertise, community knowledge, and the patience it takes to find the right fit for your family.
            </p>
            <Link href="/agent/family/contact" className="sub-hero-cta">
              Start Your Search
            </Link>
          </div>
        </section>

        {/* ── 2. Featured Homes ────────────────────────────────────────────── */}
        <section className="sub-section">
          <div className="sub-wrap">
            <p className="sub-section-label">Current Listings</p>
            <h2 className="sub-section-title">Featured Homes</h2>
            <p className="sub-section-sub">
              A selection of homes in St. Johns County and Jacksonville suburbs.
            </p>

            <div className="sub-grid-3">
              {FEATURED_HOMES.map((h) => (
                <article key={h.id} className="sub-card">
                  <img
                    src={h.image}
                    alt={h.address}
                    className="sub-card-img"
                    loading="lazy"
                  />
                  <div className="sub-card-body">
                    <p className="sub-card-price">${h.price.toLocaleString()}</p>
                    <p className="sub-card-address">{h.address}</p>
                    <p className="sub-card-meta">
                      {h.beds} bd · {h.baths} ba · {h.sqft.toLocaleString()} sqft
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span className="sub-school-badge">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                        </svg>
                        {h.schoolDistrict}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--sub-muted)' }}>
                        {h.community}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                href="/agent/family/listings"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--sub-primary)',
                  textDecoration: 'none',
                }}
              >
                View All Listings →
              </Link>
            </p>
          </div>
        </section>

        <hr className="sub-hairline" />

        {/* ── 3. Schools & Communities ─────────────────────────────────────── */}
        <section className="sub-section" style={{ backgroundColor: 'var(--sub-surface)' }}>
          <div className="sub-wrap">
            <p className="sub-section-label">School Districts & Communities</p>
            <h2 className="sub-section-title">Where Families Put Down Roots</h2>
            <p className="sub-section-sub">
              School ratings referenced are sourced from GreatSchools.org and are provided for
              informational purposes only. Verify independently with the school district.
            </p>

            <div className="sub-districts">
              {DISTRICTS.map((d) => (
                <div key={d.name} className="sub-district-card">
                  <p className="sub-district-name">{d.name}</p>
                  <p className="sub-district-desc">{d.desc}</p>
                  <div className="sub-district-meta">
                    <span className="sub-school-rating">{d.rating}</span>
                    <span className="sub-district-tag">HOA {d.hoa}</span>
                  </div>
                  <p style={{ fontSize: '0.65rem', color: 'var(--sub-muted)', marginTop: '0.5rem' }}>
                    {d.note}
                  </p>
                </div>
              ))}
            </div>

            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                href="/agent/family/markets"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--sub-primary)',
                  textDecoration: 'none',
                }}
              >
                School & Community Guides →
              </Link>
            </p>
          </div>
        </section>

        <hr className="sub-hairline" />

        {/* ── 4. Buyer's Journey ───────────────────────────────────────────── */}
        <section className="sub-section">
          <div className="sub-wrap">
            <p className="sub-section-label">How I Work</p>
            <h2 className="sub-section-title">Your Journey to the Right Home</h2>
            <p className="sub-section-sub">
              Buying a home for your family isn&apos;t just a transaction — it&apos;s a decision that shapes your daily life for years. I help you make it with confidence.
            </p>

            <div className="sub-journey-steps">
              {JOURNEY.map((j) => (
                <div key={j.step} className="sub-journey-step">
                  <div className="sub-step-number">{j.step}</div>
                  <p className="sub-step-title">{j.title}</p>
                  <p className="sub-step-desc">{j.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="sub-hairline" />

        {/* ── 5. Seller Resources ──────────────────────────────────────────── */}
        <section className="sub-section" style={{ backgroundColor: 'var(--sub-surface)' }}>
          <div className="sub-wrap">
            <p className="sub-section-label">Seller Resources</p>
            <h2 className="sub-section-title">When It&apos;s Time to Move</h2>
            <p className="sub-section-sub">
              Thinking about selling? These guides cover what you need to know before you list.
            </p>

            <div className="sub-grid-3">
              {SELLER_RESOURCES.map((r) => (
                <Link
                  key={r.slug}
                  href={`/agent/family/contact`}
                  className="sub-resource-card"
                >
                  <p className="sub-resource-title">{r.title}</p>
                  <p className="sub-resource-desc">{r.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <hr className="sub-hairline" />

        {/* ── 6. Testimonial ───────────────────────────────────────────────── */}
        <section className="sub-section">
          <div className="sub-wrap">
            <div className="sub-testimonial">
              <p className="sub-quote">{TESTIMONIAL.quote}</p>
              <p className="sub-quote-attr">{TESTIMONIAL.attr}</p>
            </div>
          </div>
        </section>

        <hr className="sub-hairline" />

        {/* ── 7. About ─────────────────────────────────────────────────────── */}
        <section className="sub-section" style={{ backgroundColor: 'var(--sub-surface)' }}>
          <div className="sub-wrap">
            <div className="sub-about-grid">
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'}
                  alt={agent.name}
                  className="sub-about-headshot"
                  loading="lazy"
                />
              </div>
              <div>
                <p className="sub-section-label">About</p>
                <h2
                  style={{
                    fontFamily: 'var(--sub-font-display)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: 800,
                    color: 'var(--sub-primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {agent.name}
                </h2>
                <p
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--sub-accent)',
                    letterSpacing: '0.04em',
                    marginBottom: '1.5rem',
                  }}
                >
                  {agent.title} · Suburban Family Division
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--sub-text)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  {agent.bio.slice(0, 360)}
                  {agent.bio.length > 360 ? '…' : ''}
                </p>
                <Link
                  href="/agent/family/about"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--sub-primary)',
                    textDecoration: 'none',
                  }}
                >
                  More about {agent.name.split(' ')[0]} →
                </Link>
                <p className="sub-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="sub-hairline" />

        {/* ── 8. Contact ──────────────────────────────────────────────────── */}
        <section className="sub-section">
          <div className="sub-wrap">
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <SuburbanContactForm agent={agent} />
            </div>
          </div>
        </section>

        {/* ── Footer CTA ─────────────────────────────────────────────────── */}
        <div className="sub-cta-section">
          <h2>Ready to Find Your Neighborhood?</h2>
          <p>
            {agent.name.split(' ')[0]} works with families in St. Johns County, Jacksonville suburbs, and Birmingham — matching buyers with the right schools, communities, and homes.
          </p>
          <Link href="/agent/family/contact" className="sub-hero-cta">
            Start Your Search
          </Link>
        </div>
      </SuburbanLayout>
    </>
  )
}
