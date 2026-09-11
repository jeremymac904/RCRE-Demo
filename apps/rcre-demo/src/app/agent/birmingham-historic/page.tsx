/**
 * RCRE Historic Heritage — Home Page
 * Route: /agent/birmingham-historic
 *
 * Eleanor Whitmore · Historic & Heritage Property Specialist · Birmingham, Alabama
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { HistoricLayout } from './HistoricLayout'
import { HistoricSEO } from './HistoricSEO'
import { HistoricContactForm } from './HistoricContactForm'
import './historic.css'

export const metadata: Metadata = {
  title: 'Eleanor Whitmore | RCRE Historic Heritage, Birmingham Alabama',
  description:
    'Eleanor Whitmore — Historic & Heritage Property Specialist with RCRE Group, serving Highland Park, Mountain Brook, English Village, and Birmingham\'s historic districts.',
}

const HH_CONFIG = {
  theme: 'rcre-historic' as const,
  markets: ['Highland Park', 'Mountain Brook', 'English Village', 'Cahaba Heights', 'Birmingham Historic Districts'],
  specialties: ['Historic Homes', 'Period Properties', 'Preservation', 'Estate Sales', 'Character Homes'],
  heroImage: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

// Featured historic properties
const FEATURED_PROPERTIES = [
  {
    id: 'h1',
    address: '2701 Highland Ave, Birmingham, AL 35205',
    yearBuilt: 1924,
    style: 'Tudor Revival',
    price: 1275000,
    image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=700&q=80',
  },
  {
    id: 'h2',
    address: '3421 Mountain Brook Village, Birmingham, AL 35213',
    yearBuilt: 1936,
    style: 'Colonial Revival',
    price: 985000,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
  },
  {
    id: 'h3',
    address: '418 Canterbury Road, Mountain Brook, AL 35213',
    yearBuilt: 1929,
    style: 'English Cottage',
    price: 1650000,
    image: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589a7c?w=700&q=80',
  },
]

// Birmingham historic neighborhoods
const MARKETS = [
  {
    name: 'Highland Park',
    arch: 'Tudor Revival · Craftsman · Colonial Revival',
    desc: 'Birmingham\'s oldest residential neighborhood, platted in the 1890s. The street grid follows the original topographic contours, giving the neighborhood its characteristic rolling quality. Tudor Revival architecture dominates the higher elevations; the lower terraces show Craftsman and Queen Anne influence. The Highland Avenue corridor is listed on the National Register.',
  },
  {
    name: 'Mountain Brook',
    arch: 'Colonial Revival · English Cottage · Tudor',
    desc: 'Incorporated as a planned residential community in 1932, Mountain Brook was designed as an escape from Birmingham\'s industrial core. The architectural standards enforced from its founding mean that original structures have largely remained intact. The Village is the commercial heart — residential streets radiate outward with mature canopy.',
  },
  {
    name: 'English Village',
    arch: 'English Cottage · Tudor Revival',
    desc: 'A small, highly intact enclave within Mountain Brook developed in the 1920s and 1930s. The architectural character is almost exclusively English-period vernacular — steeply pitched roofs, half-timbering, leaded glass. Homes here rarely come to market; when they do, they tend to attract preservation-minded buyers specifically.',
  },
  {
    name: 'Cahaba Heights',
    arch: 'Craftsman · Period Revival · Mid-Century',
    desc: 'The former Cahaba Heights community, now absorbed into Birmingham\'s urban footprint, retains a heterogeneous character that makes it one of the city\'s most architecturally interesting neighborhoods. Craftsman bungalows from the 1920s sit alongside Mid-Century updates and sympathetic new construction. The Cahaba River corridor adds a natural amenity layer.',
  },
]

// The Preservation Approach
const APPROACH = [
  {
    title: 'Understanding the Structure',
    desc: 'Before making an offer on a historic property, I spend time understanding what it was built to do — its structural system, its original mechanical configuration, and the materials available to its original builders. A 1920s Tudor in Highland Park was built for a world without central air conditioning; that shapes what you can reasonably do with it today.',
  },
  {
    title: 'The Character Assessment',
    desc: 'Every period home has a set of features that are architecturally significant and expensive to replicate if lost. I identify these before a client makes an offer — original millwork, period light fixtures, plaster detailing, porch conditions, original windows — so the purchase price reflects the actual condition of the structure.',
  },
  {
    title: 'Stewardship Planning',
    desc: 'Historic homes are long-term commitments. Before you close, I work with you to develop a rough renovation sequence — what needs to happen in year one, what can wait, what requires a historic preservation professional, and what the permit requirements look like in the relevant historic district.',
  },
]

// Resources
const RESOURCES = [
  {
    title: 'Historic Home Buyer Guide',
    desc: 'What to look for in a period property — structural systems, renovation scope, and preservation priorities.',
    icon: '🏚',
  },
  {
    title: 'Birmingham Historic District Requirements',
    desc: 'What the Birmingham Historic Preservation District requires before exterior changes, demolitions, and significant renovations.',
    icon: '📜',
  },
  {
    title: 'Renovation Permit Checklist',
    desc: 'Step-by-step permit requirements for historic properties in the Birmingham metro area — city and county.',
    icon: '✅',
  },
]

// Legacy story
const LEGACY_STORY = {
  title: 'On the sale of a 1924 Tudor in Highland Park — an estate settlement',
  body: `The property came to me through a Birmingham estate attorney — the family had held the house for three generations, and the youngest heir lived out of state. The structure had been maintained without significant renovation since 1968: the original slate roof was intact, the plaster walls were sound, the heart pine floors had been covered with carpet but not refinished in decades.

The challenge was not the property — it was the family. Four siblings, three states, and divergent visions for what the house should become. Two wanted to sell immediately; one wanted to renovate and hold; one was not certain they wanted anything to do with it.

Over eight weeks, I facilitated four separate conversations. The estate attorney handled the legal structure. I provided the market analysis — what a properly renovated 1924 Highland Park Tudor was worth, and what the renovation would cost, scoped by a preservation architect I have worked with for six years.

We closed at 97% of asking. The buyer was a couple relocating from Atlanta who had been looking for a Highland Park Tudor for two years. They understood what they were buying. The family received a fair price and a letter from the buyer describing why this particular house mattered to them.

This is what the work looks like when it goes well: everyone leaves with something they can live with.`,
  sig: '— Eleanor Whitmore · Highland Park, Birmingham · 2026',
}

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function HistoricHomePage() {
  const agent = getExampleAgent('birmingham-historic')!
  const seo = buildHomeSEO(agent, HH_CONFIG)

  return (
    <>
      <head>
        <HistoricSEO seo={seo} />
      </head>
      <HistoricLayout agent={agent}>
        {/* ── 1. Hero ────────────────────────────────────────────────────────── */}
        <section className="hh-hero">
          <img
            src={agent.heroImage || HH_CONFIG.heroImage}
            alt="Historic Birmingham home exterior"
            className="hh-hero-img"
            loading="eager"
          />
          <div className="hh-hero-overlay" />
          <div className="hh-hero-content">
            <p className="hh-hero-kicker">{agent.market}</p>
            <h1 className="hh-hero-title">Birmingham&apos;s Historic Neighborhoods. Represented with Care.</h1>
            <p className="hh-hero-sub">Highland Park · Mountain Brook · English Village · Cahaba Heights</p>
            <Link href={`/agent/birmingham-historic/contact`} className="hh-hero-cta">
              Schedule a Preservation Consultation
            </Link>
          </div>
        </section>

        {/* ── 2. Featured Historic Properties ────────────────────────────────── */}
        <section className="hh-section">
          <div className="hh-wrap">
            <p className="hh-section-label">Current Roster</p>
            <h2 className="hh-section-title">Featured Historic Properties</h2>
            <p className="hh-section-sub">
              A selection of period properties represented by Eleanor Whitmore in Birmingham&apos;s historic neighborhoods.
              Year built and architectural style noted — all subject to independent verification.
            </p>

            <div className="hh-grid-3">
              {FEATURED_PROPERTIES.map((prop) => (
                <article key={prop.id} className="hh-card">
                  <img
                    src={prop.image}
                    alt={prop.address}
                    className="hh-card-img"
                    loading="lazy"
                  />
                  <div className="hh-card-body">
                    <p className="hh-card-price">{formatPrice(prop.price)}</p>
                    <p className="hh-card-address">{prop.address}</p>
                    <p className="hh-card-year">Built {prop.yearBuilt}</p>
                    <span className="hh-card-style">{prop.style}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. The Preservation Approach ──────────────────────────────────── */}
        <section className="hh-section" style={{ backgroundColor: 'var(--hh-surface)', borderTop: '1px solid var(--hh-border)', borderBottom: '1px solid var(--hh-border)' }}>
          <div className="hh-wrap">
            <p className="hh-section-label">The Approach</p>
            <h2 className="hh-section-title">How I Work with Historic Properties</h2>

            <div className="hh-approach-grid">
              {APPROACH.map((block) => (
                <div key={block.title} className="hh-approach-item">
                  <h3 className="hh-approach-title">{block.title}</h3>
                  <p className="hh-approach-desc">{block.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Markets ─────────────────────────────────────────────────────── */}
        <section className="hh-section">
          <div className="hh-wrap">
            <p className="hh-section-label">Service Area</p>
            <h2 className="hh-section-title">Birmingham Historic Neighborhoods</h2>
            <p className="hh-section-sub">
              Each neighborhood carries its own architectural character, its own history,
              and its own set of preservation considerations.
            </p>

            <ul className="hh-markets">
              {MARKETS.map((m) => (
                <li key={m.name}>
                  <div>
                    <span className="hh-market-arch">{m.arch}</span>
                    <p className="hh-market-name">{m.name}</p>
                  </div>
                  <p className="hh-market-desc">{m.desc}</p>
                </li>
              ))}
            </ul>

            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                href={`/agent/birmingham-historic/markets`}
                style={{ fontFamily: 'var(--hh-font-display)', fontSize: '0.82rem', fontWeight: 500, fontStyle: 'italic', color: 'var(--hh-accent)', textDecoration: 'none', borderBottom: '1px solid var(--hh-border)', paddingBottom: '1px' }}
              >
                Detailed neighborhood guides →
              </Link>
            </p>
          </div>
        </section>

        {/* ── 5. Legacy Story ─────────────────────────────────────────────────── */}
        <section className="hh-section" style={{ backgroundColor: 'var(--hh-surface)', borderTop: '1px solid var(--hh-border)', borderBottom: '1px solid var(--hh-border)' }}>
          <div className="hh-wrap">
            <p className="hh-section-label">Recent Transaction</p>
            <div className="hh-legacy">
              <h2 className="hh-legacy-title">{LEGACY_STORY.title}</h2>
              <div className="hh-legacy-body">
                {LEGACY_STORY.body.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <p className="hh-legacy-sig">{LEGACY_STORY.sig}</p>
            </div>
          </div>
        </section>

        {/* ── 6. Resources ───────────────────────────────────────────────────── */}
        <section className="hh-section">
          <div className="hh-wrap">
            <p className="hh-section-label">Resources</p>
            <h2 className="hh-section-title">Buyer Resources</h2>
            <p className="hh-section-sub">
              Guides and checklists built from twelve years of historic property transactions in Birmingham.
            </p>

            <div className="hh-resource-list">
              {RESOURCES.map((r) => (
                <div key={r.title} className="hh-resource-item" role="link" aria-label={r.title}>
                  <div className="hh-resource-icon">
                    <span style={{ fontSize: '1.1rem' }}>{r.icon}</span>
                  </div>
                  <div>
                    <p className="hh-resource-title">{r.title}</p>
                    <p className="hh-resource-desc">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. About ───────────────────────────────────────────────────────── */}
        <section className="hh-section" style={{ backgroundColor: 'var(--hh-surface)', borderTop: '1px solid var(--hh-border)', borderBottom: '1px solid var(--hh-border)' }}>
          <div className="hh-wrap">
            <div className="hh-about-grid">
              {/* Headshot */}
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80'}
                  alt={agent.name}
                  className="hh-about-headshot"
                  loading="lazy"
                />
              </div>
              {/* Bio */}
              <div className="hh-about-bio">
                <p className="hh-section-label">About</p>
                <h2 style={{ fontFamily: 'var(--hh-font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 400, fontStyle: 'italic', color: 'var(--hh-text)', marginBottom: '0.5rem' }}>
                  {agent.name}
                </h2>
                <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.8rem', color: 'var(--hh-accent)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                  {agent.title}
                </p>

                <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.95rem', color: 'var(--hh-text)', lineHeight: 1.85, fontWeight: 300, marginBottom: '1rem' }}>
                  Eleanor Whitmore has spent twelve years specializing in Birmingham&apos;s most storied
                  residential neighborhoods — Highland Park, Mountain Brook, English Village, and the
                  historic Cahaba Heights corridor.
                </p>
                <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.95rem', color: 'var(--hh-muted)', lineHeight: 1.85, fontWeight: 300, marginBottom: '1rem' }}>
                  She approaches historic properties with the understanding that a 1920s Tudor is not
                  just a house — it is a structure with stories, materials, and mechanical systems that
                  require informed stewardship. Her clients are buyers who understand that character
                  costs more upfront and pays dividends in the long run.
                </p>
                <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.95rem', color: 'var(--hh-muted)', lineHeight: 1.85, fontWeight: 300 }}>
                  She works with preservation-minded buyers, estate sales, and families settling historic
                  properties. She takes a small number of clients at a time.
                </p>

                <p className="hh-license-note">
                  {agent.name}, {agent.title}, is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity. Historic property designations and preservation requirements
                  are subject to verification through the Alabama Historical Commission and local preservation offices.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. Contact ─────────────────────────────────────────────────────── */}
        <section className="hh-section" style={{ backgroundColor: 'var(--hh-bg)' }}>
          <div className="hh-wrap">
            <HistoricContactForm agent={agent} />
          </div>
        </section>

        {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
        <div className="hh-cta-section">
          <h2>Historic homes, preservation-minded guidance.</h2>
          <p>
            Whether you are buying your first period property or adding a historic estate to your portfolio —
            the approach is the same: understand the structure before you commit to it.
          </p>
          <Link href={`/agent/birmingham-historic/contact`} className="hh-hero-cta">
            Schedule a Preservation Consultation
          </Link>
        </div>
      </HistoricLayout>
    </>
  )
}
