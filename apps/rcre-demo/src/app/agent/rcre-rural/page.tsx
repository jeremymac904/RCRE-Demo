/**
 * RCRE Rural & Land — Home Page
 * Route: /agent/alabama-rural
 *
 * Coleman Reid · Land & Rural Property Specialist · Alabama acreage
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { RuralLayout } from './RuralLayout'
import { RuralSEO } from './RuralSEO'
import { RuralContactForm } from './RuralContactForm'
import './rural.css'

export const metadata: Metadata = {
  title: 'Coleman Reid | RCRE Rural & Land, Alabama',
  description:
    'Coleman Reid — Land & Rural Property Specialist with RCRE Group, serving Birmingham exurbs, Wiregrass, Black Belt, Lake Martin, and Tuscaloosa County. Acreage, timberland, equestrian, and USDA rural markets.',
}

const RURAL_CONFIG = {
  theme: 'rcre-rural' as const,
  markets: ['Birmingham exurbs', 'Wiregrass Alabama', 'Black Belt', 'Lake Martin', 'Tuscaloosa County'],
  specialties: ['Land', 'Acreage', 'Equestrian', 'Timber', 'USDA Rural', 'Farm & Ranch'],
  heroImage: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

// Featured land listings
const FEATURED_LAND = [
  {
    id: 'rl1',
    address: 'County Road 22, Marion Junction, AL 36759',
    county: 'Dallas County — Black Belt',
    price: 385000,
    acres: 124,
    pricePerAcre: 3105,
    waterRights: 'Two stocked ponds; drilled well; permitted irrigation pivot',
    agClass: 'Class III & IV row crop; fenced pasture',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80',
  },
  {
    id: 'rl2',
    address: 'Smith Lake Rd, Crane Hill, AL 35581',
    county: 'Cullman County — Smith Lake',
    price: 695000,
    acres: 87,
    pricePerAcre: 7988,
    waterRights: '1,400 ft of Smith Lake frontage; community water available',
    agClass: 'Mixed timber; established food plots',
    image: 'https://images.unsplash.com/photo-1470087161017-750b9c9e0c0b?w=700&q=80',
  },
  {
    id: 'rl3',
    address: 'Bates Lake Rd, Frankville, AL 36538',
    county: 'Washington County — Wiregrass',
    price: 215000,
    acres: 62,
    pricePerAcre: 3468,
    waterRights: 'Bates Lake access; drilled well; no irrigation infrastructure',
    agClass: 'Open pasture; fenced; cross-fenced',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80',
  },
]

const MARKETS = [
  {
    name: 'Birmingham Exurbs',
    desc: 'Growing communities outside Birmingham\'s core — newer homes on acreage, equestrian properties, and family farms within 30 miles of the city. Excellent for buyers who need proximity to the metro while wanting land.',
  },
  {
    name: 'Wiregrass Alabama',
    desc: 'The southeastern Alabama flatwoods and prairie. Sandy soils, long growing seasons, and working farms. Ideal for timber, cattle, and USDA rural eligible purchases up to $700K.',
  },
  {
    name: 'Black Belt',
    desc: 'Alabama\'s famed dark-soil prairie region from Selma to Troy. Rich agricultural land, large intact landholdings, and a deep ranching culture. Historic properties and generational farms change hands here.',
  },
  {
    name: 'Lake Martin',
    desc: 'Alabama\'s largest reservoir — waterfront acreage, ranch-style compounds, and family compounds within easy reach of Alexander City and Auburn. A weekend land market with strong permanent-use demand.',
  },
  {
    name: 'Tuscaloosa County',
    desc: 'University of Alabama proximity with expanding rural land use. Investment buyers, owner-operators, and 1031 exchange buyers all active. Mix of open farmland, timber, and acreage development sites.',
  },
]

const LAND_PROFILE_TAGS = [
  'Sandy loam', 'Black Belt clay', 'Bottomland', 'Timber stand', 'Open pasture',
  'Fenced & cross-fenced', 'Pond', 'Well', 'Lake frontage', 'Irrigation pivot',
  'Road frontage', 'Gated entry', 'Wildlife food plot', 'Conservation easement eligible',
]

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function RuralHomePage() {
  const agent = getExampleAgent('alabama-rural')!
  const seo = buildHomeSEO(agent, RURAL_CONFIG)

  return (
    <>
      <head>
        <RuralSEO seo={seo} />
      </head>
      <RuralLayout agent={agent}>
        {/* ── 1. Hero ────────────────────────────────────────────────────────── */}
        <section className="rural-hero">
          <img
            src={agent.heroImage || RURAL_CONFIG.heroImage}
            alt={`Alabama pasture and fence line`}
            className="rural-hero-img"
            loading="eager"
          />
          <div className="rural-hero-grain" aria-hidden="true" />
          <div className="rural-hero-overlay" />
          <div className="rural-hero-content">
            <p className="rural-hero-kicker">{agent.market}</p>
            <h1 className="rural-hero-title">Alabama Land, Handled by Someone Who Knows It</h1>
            <p className="rural-hero-sub">{agent.tagline}</p>
            <Link href={`/agent/alabama-rural/contact`} className="rural-hero-cta">
              Schedule a Land Tour
            </Link>
          </div>
        </section>

        {/* ── 2. Featured Land ───────────────────────────────────────────────── */}
        <section className="rural-section">
          <div className="rural-wrap">
            <p className="rural-section-label">Current Listings</p>
            <h2 className="rural-section-title">Featured Land</h2>
            <p className="rural-section-sub">
              Active rural acreage listings across Alabama. Acreage, water rights, and USDA eligibility
              are noted — all subject to independent verification.
            </p>

            <div className="rural-grid-3">
              {FEATURED_LAND.map((listing) => (
                <article key={listing.id} className="rural-card">
                  <img
                    src={listing.image}
                    alt={listing.address}
                    className="rural-card-img"
                    loading="lazy"
                  />
                  <div className="rural-card-body">
                    <p className="rural-card-price">{formatPrice(listing.price)}</p>
                    <p className="rural-card-address">{listing.address}</p>
                    <p className="rural-card-meta">{listing.county}</p>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span className="rural-tag">{listing.acres} acres</span>
                      <span className="rural-tag">${listing.pricePerAcre.toLocaleString()}/acre</span>
                    </div>
                    <span className="rural-tag-warn">Water: {listing.waterRights.slice(0, 40)}…</span>
                    <div style={{ marginTop: '0.75rem' }}>
                      <Link href={`/agent/alabama-rural/contact`} className="rural-card-link">
                        Inquire about this property →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link
                href={`/agent/alabama-rural/listings`}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: 'var(--rural-accent)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--rural-border)',
                  paddingBottom: '1px',
                }}
              >
                View All Land Listings →
              </Link>
            </p>
          </div>
        </section>

        {/* ── 3. Working-Land Story ─────────────────────────────────────────── */}
        <hr className="rural-plow" />
        <section className="rural-section" style={{ backgroundColor: 'var(--rural-surface)' }}>
          <div className="rural-wrap">
            <div className="rural-split">
              {/* Copy */}
              <div>
                <p className="rural-section-label">A Working Land Story</p>
                <h2 style={{ fontFamily: 'var(--rural-font-display)', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 500, fontStyle: 'italic', color: 'var(--rural-text)', marginBottom: '1.25rem', lineHeight: 1.25 }}>
                  In the Wiregrass, the fence line runs longer than the memory.
                </h2>
                <div className="rural-story-text">
                  <p>
                    The Black Belt of Alabama is not a metaphor. It is a soil — dark, calcium-rich,
                    and among the most productive agricultural lands in the southeastern United States.
                    The farms that work it have been working it since before the Civil War, and the
                    families that hold it have held it long enough to know what it is worth.
                  </p>
                  <p>
                    <em>Coleman grew up on a working farm in the Wiregrass. He understands what it
                    means to walk a fence line at dawn and why a reliable water source matters more
                    than square footage.</em>
                  </p>
                  <p>
                    When you are buying land in Alabama — whether it is 40 acres of pasture outside
                    Birmingham or 800 acres of timber in the Wiregrass — you are not just buying a
                    property. You are buying a set of conditions that the seller knows better than
                    anyone. The best deals in rural land come from working with someone who can read
                    those conditions the same way.
                  </p>
                </div>
              </div>
              {/* Image: Wiregrass pasture */}
              <img
                src="https://images.unsplash.com/photo-1470087161017-750b9c9e0c0b?w=700&q=80"
                alt="Wiregrass Alabama — fenced pasture at dawn"
                className="rural-split-img"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* ── 4. Markets Served ─────────────────────────────────────────────── */}
        <hr className="rural-plow" />
        <section className="rural-section">
          <div className="rural-wrap" style={{ maxWidth: '900px' }}>
            <p className="rural-section-label">Service Area</p>
            <h2 className="rural-section-title">Alabama Markets</h2>

            <ul className="rural-markets">
              {MARKETS.map((m) => (
                <li key={m.name}>
                  <span className="rural-market-name">{m.name}</span>
                  <span className="rural-market-desc">{m.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 5. Land Profile ────────────────────────────────────────────────── */}
        <section className="rural-section-sm" style={{ backgroundColor: 'var(--rural-surface)' }}>
          <div className="rural-wrap">
            <p className="rural-section-label">Land Profile</p>
            <h2 className="rural-section-title">What to Look For</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
              {/* Acreage guidance */}
              <div>
                <h3 style={{ fontFamily: 'var(--rural-font-display)', fontSize: '1.1rem', fontWeight: 500, fontStyle: 'italic', color: 'var(--rural-text)', marginBottom: '0.75rem' }}>
                  Acreage ranges
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--rural-muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
                  Rural acreage pricing varies significantly by location, access, water, and improvements.
                  Typical ranges in Alabama:
                </p>
                {[
                  ['Under 50 acres', 'Pasture, small farm, equestrian'],
                  ['50 – 200 acres', 'Working farm, timber, investment'],
                  ['200 – 500 acres', 'Active ranch, managed timber, USDA eligible'],
                  ['500+ acres', 'Legacy holdings, conservation, commercial timber'],
                ].map(([range, desc]) => (
                  <div key={range} style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--rural-accent)', minWidth: '100px' }}>{range}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--rural-muted)' }}>{desc}</span>
                  </div>
                ))}
              </div>

              {/* Soil/terrain */}
              <div>
                <h3 style={{ fontFamily: 'var(--rural-font-display)', fontSize: '1.1rem', fontWeight: 500, fontStyle: 'italic', color: 'var(--rural-text)', marginBottom: '0.75rem' }}>
                  Soil &amp; terrain types
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--rural-muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
                  Common soil types across Alabama markets:
                </p>
                <div className="rural-land-tags">
                  {LAND_PROFILE_TAGS.slice(0, 8).map((tag) => (
                    <span key={tag} className="rural-land-chip">{tag}</span>
                  ))}
                </div>

                <div className="rural-acres-note">
                  <strong style={{ fontStyle: 'italic' }}>Water rights note:</strong> Alabama follows
                  the rule of reasonable use — no formal permit system for most farm wells and ponds.
                  Water rights claims should be verified through county records and the Alabama
                  Department of Environmental Management. This is a general explanation; defer to
                  official records for specific parcels.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Testimonial ─────────────────────────────────────────────────── */}
        <section className="rural-section">
          <div className="rural-wrap">
            <p className="rural-section-label" style={{ textAlign: 'center' }}>From a Client</p>
            <div className="rural-testimonial">
              <blockquote>
                &ldquo;I had been looking at land in the Black Belt for two years before I found Coleman.
                He understood what I was trying to do — run a cattle operation on land that was going
                to hold its value — and he found me 180 acres I would not have found on my own.
                The USDA financing took longer than either of us wanted, but he walked me through
                every step of it. I am on the land now, and it is exactly what he said it would be.&rdquo;
              </blockquote>
              <cite>
                Client · Purchase: 180 acres, Dallas County, AL · 2025
              </cite>
            </div>
          </div>
        </section>

        {/* ── 7. About ───────────────────────────────────────────────────────── */}
        <hr className="rural-plow" />
        <section className="rural-section" style={{ backgroundColor: 'var(--rural-surface)' }}>
          <div className="rural-wrap">
            <div className="rural-about-grid">
              {/* Portrait */}
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80'}
                  alt={agent.name}
                  className="rural-about-headshot"
                  loading="lazy"
                />
              </div>
              {/* Bio */}
              <div className="rural-about-bio">
                <p className="rural-section-label">About</p>
                <h2 style={{ fontFamily: 'var(--rural-font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 500, fontStyle: 'italic', marginBottom: '0.75rem', color: 'var(--rural-text)' }}>
                  {agent.name}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--rural-accent)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
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

                <div className="rural-land-note">
                  Coleman continues to maintain a working relationship with his family&apos;s Wiregrass farm.
                  He is not a full-time farmer, but he knows what a working farm looks like from
                  both sides of the transaction.
                </div>

                <p className="rural-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity. Acreage, carrying capacity, and water rights are subject
                  to independent verification.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. Contact ─────────────────────────────────────────────────────── */}
        <section className="rural-section">
          <div className="rural-wrap">
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <RuralContactForm agent={agent} />
            </div>
          </div>
        </section>

        {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
        <div className="rural-cta-section">
          <h2>Tell Us About Your Land Search</h2>
          <p>
            Whether you are looking for 40 acres outside Birmingham or 800 acres in the Wiregrass —
            acreage, livestock, equestrian use, or farming intent — share what you are building and
            we will follow up with what we have.
          </p>
          <Link href={`/agent/alabama-rural/contact`} className="rural-hero-cta">
            Schedule a Land Tour
          </Link>
        </div>
      </RuralLayout>
    </>
  )
}
