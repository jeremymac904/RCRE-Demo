/**
 * RCRE Luxury — Home Page
 * Route: /agent/jacksonville-luxury
 *
 * Alexandra Whitfield · Luxury REALTOR® · Jacksonville waterfront/Nocatee/Ponte Vedra
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { LuxuryLayout } from './LuxuryLayout'
import { LuxurySEO } from './LuxurySEO'
import { LuxuryContactForm } from './LuxuryContactForm'
import './luxury.css'

export const metadata: Metadata = {
  title: 'Alexandra Whitfield | RCRE Luxury, Northeast Florida',
  description:
    'Alexandra Whitfield — Luxury REALTOR® with RCRE Group, specializing in waterfront, estate, and executive relocation in Ponte Vedra, Nocatee, and the Southbank corridor.',
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

// Featured estates data
const FEATURED_ESTATES = [
  {
    id: 'e1',
    address: '1200 Ponte Vedra Blvd, Ponte Vedra Beach, FL 32082',
    price: 4850000,
    beds: 6,
    baths: 5.5,
    sqft: 7420,
    architect: 'Merritt & Pappas Architecture',
    year: 2018,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
  },
  {
    id: 'e2',
    address: '445 Nocatee Pkwy, St. Johns, FL 32081',
    price: 2975000,
    beds: 5,
    baths: 4,
    sqft: 5880,
    architect: 'Pulte Homes',
    year: 2021,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80',
  },
  {
    id: 'e3',
    address: 'Private address — Intracoastal Waterway, Jacksonville, FL',
    price: 6200000,
    beds: 7,
    baths: 6,
    sqft: 9100,
    architect: 'Confidential',
    year: 2020,
    status: 'private' as const,
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80',
  },
]

const MARKETS = [
  {
    name: 'Ponte Vedra',
    desc: 'Gated coastal enclave known for TPC Sawgrass and executive waterfront estates. Architectural variety from mid-century modern to custom Mediterranean.',
  },
  {
    name: 'Nocatee',
    desc: 'Master-planned community in St. Johns County. New luxury construction, top-rated schools, and family amenities in a planned-growth setting.',
  },
  {
    name: 'Southbank',
    desc: 'High-rise and townhome corridor along the St. Johns River south of downtown. Water views, walkable dining, and established residential towers.',
  },
  {
    name: 'Mandarin',
    desc: 'Historic riverside neighborhood with established oak canopy, waterfront parcels, and a mix of mid-century and updated traditional architecture.',
  },
  {
    name: 'Intracoastal Waterway',
    desc: 'Deep-water properties along the ICWW between Jacksonville and St. Augustine. Boat docks, privacy, and long water views are the primary assets.',
  },
]

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function LuxuryHomePage() {
  const agent = getExampleAgent('jacksonville-luxury')!
  const seo = buildHomeSEO(agent, LUXURY_CONFIG)

  return (
    <>
      <head>
        <LuxurySEO seo={seo} />
      </head>
      <LuxuryLayout agent={agent}>
        {/* ── 1. Hero ────────────────────────────────────────────────────────── */}
        <section className="lux-hero">
          <img
            src={agent.heroImage || LUXURY_CONFIG.heroImage}
            alt={`${agent.market} waterfront estate`}
            className="lux-hero-img"
            loading="eager"
          />
          <div className="lux-hero-overlay" />
          <div className="lux-hero-content">
            <p className="lux-hero-kicker">{agent.market}</p>
            <h1 className="lux-hero-title">Properties of Provenance in Northeast Florida</h1>
            <p className="lux-hero-sub">{agent.tagline}</p>
            <Link href={`/agent/jacksonville-luxury/contact`} className="lux-hero-cta">
              Schedule a Private Showing
            </Link>
          </div>
        </section>

        {/* ── 2. Featured Estates ────────────────────────────────────────────── */}
        <section className="lux-section">
          <div className="lux-wrap">
            <p className="lux-section-label">Current Roster</p>
            <h2 className="lux-section-title">Featured Estates</h2>
            <p className="lux-section-sub">
              A selection of active and off-market properties in Northeast Florida.
            </p>

            <div className="lux-grid-3">
              {FEATURED_ESTATES.map((estate) => (
                <article key={estate.id} className="lux-card">
                  <img
                    src={estate.image}
                    alt={estate.address}
                    className="lux-card-img"
                    loading="lazy"
                  />
                  <div className="lux-card-body">
                    {estate.status === 'private' && (
                      <span className="lux-card-tag">Private — Access by Inquiry</span>
                    )}
                    <p className="lux-card-price">{formatPrice(estate.price)}</p>
                    <p className="lux-card-address">{estate.address}</p>
                    <p className="lux-card-meta">
                      {estate.beds} bd · {estate.baths} ba · {estate.sqft.toLocaleString()} sqft
                    </p>
                    <span className="lux-card-tag">
                      {estate.architect}, {estate.year}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link
                href={`/agent/jacksonville-luxury/listings`}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: 'var(--lux-accent)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--lux-border)',
                  paddingBottom: '1px',
                }}
              >
                View the Current Roster →
              </Link>
            </p>
          </div>
        </section>

        {/* ── 3. Provenance Note ────────────────────────────────────────────── */}
        <hr className="lux-hairline" />
        <section className="lux-section">
          <div className="lux-wrap">
            <div className="lux-split">
              {/* Image: Jacksonville waterfront */}
              <img
                src="https://images.unsplash.com/photo-1572453800999-e8d2d1589a7c?w=700&q=80"
                alt="Ponte Vedra Beach — Intracoastal Waterway at dusk"
                className="lux-split-img"
                loading="lazy"
              />
              {/* Editorial copy */}
              <div>
                <p className="lux-section-label">Provenance Note</p>
                <h2 className="lux-section-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
                  The Ponte Vedra corridor carries a particular kind of quiet.
                </h2>
                <div className="lux-editorial-text">
                  <p>
                    The market here does not move quickly, and that is by design. Properties along the ICWW
                    and the Ponte Vedra shoreline trade between a small circle of buyers who understand what
                    long water views, private docks, and mature coastal oak canopy represent — not as
                    amenities, but as irreplaceable conditions.
                  </p>
                  <p>
                    <em>In fifteen years of practice in this corridor, I have represented buyers who were
                    acquiring their second or third property here. They already knew the difference between
                    a property with good bones and one that will outlast them.</em>
                  </p>
                  <p>
                    My role is to make that acquisition as quiet and as well-documented as the property itself
                    deserves. Discretion is not a feature — it is the baseline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Markets Served ─────────────────────────────────────────────── */}
        <hr className="lux-hairline" />
        <section className="lux-section" style={{ backgroundColor: 'var(--lux-surface)', padding: '5rem 2rem' }}>
          <div className="lux-wrap" style={{ maxWidth: '900px' }}>
            <p className="lux-section-label">Service Area</p>
            <h2 className="lux-section-title">Markets Served</h2>

            <ul className="lux-markets">
              {MARKETS.map((m) => (
                <li key={m.name}>
                  <span className="lux-market-name">{m.name}</span>
                  <span className="lux-market-desc">{m.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 5. Journal ─────────────────────────────────────────────────────── */}
        <section className="lux-section">
          <div className="lux-wrap">
            <p className="lux-section-label">The Letter</p>
            <div className="lux-journal">
              <h2 className="lux-journal-title">
                On the closing of a 1929 Mediterranean in Southbank
              </h2>
              <div className="lux-journal-body">
                <p>
                  The property came to me as an off-market inquiry — a family trust seeking a broker who
                  understood the difference between a house with a provenance and one without. The structure
                  had been maintained but not updated in forty years; the original plaster covework was
                  intact, the hardwoods beneath three layers of carpet were heart pine.
                </p>
                <p>
                  The buyer was a relocated executive from Atlanta, someone who had spent a career in
                  architecture and who recognized what most buyers would have walked away from. The
                  condition was not damage — it was preservation. The wrong kind of renovation would have
                  been the loss.
                </p>
                <p>
                  We closed in forty-three days. The inspection found nothing material. The financing
                  closed on schedule. The family received their ask. The buyer has since told me the
                  house is the best decision they have made since moving to Florida.
                </p>
                <p>
                  This is what the work looks like when it goes well: no drama, no competition, and a
                  property that ends up in the right hands.
                </p>
              </div>
              <p className="lux-journal-sig">— Alexandra Whitfield · Ponte Vedra, September 2026</p>
            </div>
          </div>
        </section>

        {/* ── 6. About ───────────────────────────────────────────────────────── */}
        <hr className="lux-hairline" />
        <section className="lux-section" style={{ backgroundColor: 'var(--lux-surface)', padding: '5rem 2rem' }}>
          <div className="lux-wrap">
            <div className="lux-about-grid">
              {/* Portrait */}
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80'}
                  alt={agent.name}
                  className="lux-about-headshot"
                  loading="lazy"
                />
              </div>
              {/* Bio */}
              <div className="lux-about-bio">
                <p className="lux-section-label">About</p>
                <h2 style={{ fontFamily: 'var(--lux-font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 400, marginBottom: '0.75rem', color: 'var(--lux-text)' }}>
                  {agent.name}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--lux-accent)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                  {agent.title}
                </p>

                <p>
                  Alexandra Whitfield has spent fifteen years navigating the nuances of Northeast Florida&apos;s
                  most coveted waterfront and estate communities. Her practice centers on discretion,
                  architectural literacy, and the understanding that a significant property transaction is
                  rarely just about real estate.
                </p>
                <p>
                  She has represented buyers and sellers in Ponte Vedra, Nocatee, and the Southbank
                  corridor, with transactions ranging from primary residences to legacy estate acquisitions.
                  Her clients are buyers who already own property in this market, or buyers who are
                  entering it for the first time with a clear sense of what they are looking for.
                </p>
                <p>
                  Architectural education matters in this work. She reads floor plans the way she reads
                  title — carefully, with attention to what is implied but not stated. She works with a
                  small number of clients at a time.
                </p>

                <p className="lux-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Contact ────────────────────────────────────────────────────── */}
        <section className="lux-section" style={{ backgroundColor: 'var(--lux-bg)' }}>
          <div className="lux-wrap">
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <LuxuryContactForm agent={agent} />
            </div>
          </div>
        </section>

        {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
        <div className="lux-cta-section">
          <h2>Begin a Quiet Conversation</h2>
          <p>
            For buyers entering the Northeast Florida waterfront market — or sellers who have held a
            property long enough to know its worth — the conversation starts here.
          </p>
          <Link href={`/agent/jacksonville-luxury/contact`} className="lux-hero-cta">
            Schedule a Private Showing
          </Link>
        </div>
      </LuxuryLayout>
    </>
  )
}
