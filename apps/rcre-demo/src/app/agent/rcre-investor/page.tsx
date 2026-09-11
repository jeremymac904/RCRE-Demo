/**
 * RCRE Investor — Home Page
 * Route: /agent/investor
 *
 * Jordan Mercer · REALTOR® · RCRE Investment Division
 * Theme: rcre-investor
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { InvestorLayout } from './InvestorLayout'
import { InvestorSEO } from './InvestorSEO'
import { InvestorContactForm } from './InvestorContactForm'
import './rcre-investor.css'

export const metadata: Metadata = {
  title: 'Jordan Mercer | RCRE Investment Division, Income Properties',
  description:
    'Jordan Mercer — Investment specialist with RCRE Group, serving rental investors, BRRRR buyers, and portfolio builders in Jacksonville, Birmingham, and the Florida panhandle.',
}

const INVESTOR_CONFIG = {
  theme: 'rcre-investor' as const,
  markets: ['Jacksonville', 'Birmingham', 'Florida Panhandle'],
  specialties: ['Rental Investment', 'BRRRR', 'Short-Term Rental', 'Multi-Family', 'Fix-and-Flip'],
  heroImage: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const FEATURED_DEALS = [
  {
    id: 'd1',
    address: '1847 W. 9th St, Jacksonville, FL 32209',
    price: 48500,
    capRate: 8.4,
    cashOnCash: 12.1,
    beds: 2,
    baths: 1,
    type: 'Single-family',
    sqft: 980,
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=700&q=80',
  },
  {
    id: 'd2',
    address: '2204 3rd Ave N, Birmingham, AL 35203',
    price: 78500,
    capRate: 7.9,
    cashOnCash: 10.5,
    beds: 3,
    baths: 2,
    type: 'Single-family',
    sqft: 1420,
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=700&q=80',
  },
  {
    id: 'd3',
    address: '408 Magnolia Dr, Pensacola, FL 32503',
    price: 125000,
    capRate: 8.1,
    cashOnCash: 11.3,
    beds: 4,
    baths: 2,
    type: 'Single-family',
    sqft: 1850,
    image: 'https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?w=700&q=80',
  },
]

const STRATEGIES = [
  {
    name: 'BRRRR',
    desc: 'Buy below market, rehab to standard, rent at market, refinance to pull capital out, repeat. The core of most scalable portfolio strategies.',
    metricRange: 'Cap Rate 7–10% · CoC 10–18%',
  },
  {
    name: 'Long-Term Rental',
    desc: 'Traditional tenant placement in B–C class neighborhoods. Lower volatility, simpler operations, consistent cash flow.',
    metricRange: 'Cap Rate 6–9% · CoC 8–14%',
  },
  {
    name: 'Short-Term Rental',
    desc: 'Furnished units in approved STR markets or grandfathered zones. Higher gross income, seasonal variation, more management overhead.',
    metricRange: 'Cap Rate 5–8% · GOP 18–30%',
  },
]

const METHODOLOGY = [
  {
    step: 1,
    title: 'Underwrite the Deal',
    desc: 'Every deal starts with a full pro forma: purchase price, rehab estimate, ARV, rent comps, vacancy, cap rate, cash-on-cash, and IRR — no exceptions.',
  },
  {
    step: 2,
    title: 'Verify the Market',
    desc: 'Rent comps, vacancy trends, landlord-tenant law, HOA restrictions, flood zone, and school district — all verified before sharing a deal.',
  },
  {
    step: 3,
    title: 'Structure and Close',
    desc: 'I coordinate with lenders, title, and contractors. My role doesn\'t end at contract — it ends at closing with keys in your hand.',
  },
]

const MARKET_TABLE = [
  { market: 'Jacksonville, FL', medianPrice: '$285K', avgCapRate: '7.8%', vacRate: '4.2%', trend: 'Rising' },
  { market: 'Birmingham, AL', medianPrice: '$165K', avgCapRate: '8.4%', vacRate: '3.8%', trend: 'Stable' },
  { market: 'Pensacola, FL', medianPrice: '$310K', avgCapRate: '6.9%', vacRate: '5.1%', trend: 'Rising' },
  { market: 'Mobile, AL', medianPrice: '$145K', avgCapRate: '9.1%', vacRate: '5.8%', trend: 'Stable' },
]

const ARTICLES = [
  {
    title: 'Cap Rate vs. Cash-on-Cash Return: What Actually Matters',
    excerpt: 'Cap rate is a property-level metric. Cash-on-cash is a deal-level metric. Conflating them leads to bad decisions — here\'s the distinction.',
    slug: 'cap-rate-vs-cash-on-cash',
  },
  {
    title: 'BRRRR Step-by-Step: From Purchase to Repeat',
    excerpt: 'A walkthrough of the BRRRR strategy with actual numbers from a Jacksonville deal — purchase, rehab, refi, and the equity created.',
    slug: 'brrrr-step-by-step',
  },
  {
    title: 'Market Selection Criteria for Rental Investment',
    excerpt: 'Landlord-tenant law, flood risk, school quality, employment diversity, and cap rate trends — the checklist I use before recommending a market.',
    slug: 'market-selection-criteria',
  },
]

function formatPrice(p: number) {
  return '$' + p.toLocaleString('en-US')
}

export default function InvestorHomePage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildHomeSEO(agent, INVESTOR_CONFIG)

  return (
    <>
      <head>
        <InvestorSEO seo={seo} />
      </head>
      <InvestorLayout agent={agent}>
        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <section className="inv-hero">
          <div className="inv-hero-content">
            <p className="inv-hero-kicker">
              RCRE Investment Division · {agent.market}
            </p>
            <h1 className="inv-hero-title">
              Income Properties. Underwritten Properly.
            </h1>
            <p className="inv-hero-sub">
              BRRRR · Long-Term Rental · Short-Term Rental. Every deal gets a full pro forma before it
              reaches you.
            </p>
            <Link href="/agent/investor/contact" className="inv-hero-cta">
              Run the Numbers
            </Link>
          </div>
        </section>

        {/* ── 1b. Stats bar ─────────────────────────────────────────────────── */}
        <div className="inv-stats-bar">
          <div className="inv-stats-bar-inner">
            {[
              { label: 'Avg. Cap Rate', value: '8.1%' },
              { label: 'Avg. Cash-on-Cash', value: '11.4%' },
              { label: 'Markets Covered', value: '3' },
              { label: 'Deals Sourced YTD', value: '47' },
            ].map((s) => (
              <div key={s.label} className="inv-stat-item">
                <span className="inv-stat-label">{s.label}</span>
                <span className="inv-stat-value">{s.value}</span>
              </div>
            ))}
            <p
              style={{
                fontFamily: 'var(--inv-font-mono)',
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: '0.06em',
                marginLeft: 'auto',
                alignSelf: 'center',
              }}
            >
              Source: RCRE internal data · FRED HPI · CoStar — as of available reporting period
            </p>
          </div>
        </div>

        {/* ── 2. Strategy ─────────────────────────────────────────────────── */}
        <section className="inv-section">
          <div className="inv-wrap">
            <p className="inv-section-label">Investment Strategies</p>
            <h2 className="inv-section-title">How Investors Use This Market</h2>
            <p className="inv-section-sub">
              Three strategies I work regularly in this market. Each has a different risk profile,
              financing path, and operational demand.
            </p>

            <div className="inv-strategy-cols">
              {STRATEGIES.map((s) => (
                <div key={s.name} className="inv-strategy-col">
                  <p className="inv-strategy-name">{s.name}</p>
                  <p className="inv-strategy-desc">{s.desc}</p>
                  <p className="inv-strategy-metric">{s.metricRange}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="inv-hairline" />

        {/* ── 3. Featured Deals ───────────────────────────────────────────── */}
        <section className="inv-section">
          <div className="inv-wrap">
            <p className="inv-section-label">Current Deals</p>
            <h2 className="inv-section-title">Featured Investment Properties</h2>
            <p className="inv-section-sub">
              A selection of active and recently underwritten deals. All numbers are pre-calculated.
              Verify independently before making any investment decision.
            </p>

            <div className="inv-grid-3">
              {FEATURED_DEALS.map((d) => (
                <article key={d.id} className="inv-card">
                  <img
                    src={d.image}
                    alt={d.address}
                    className="inv-card-img"
                    loading="lazy"
                  />
                  <div className="inv-card-body">
                    <p className="inv-card-price">{formatPrice(d.price)}</p>
                    <p className="inv-card-address">{d.address}</p>

                    <div className="inv-card-metrics">
                      <div className="inv-metric">
                        <span className="inv-metric-label">Cap Rate</span>
                        <span className="inv-metric-value">{d.capRate}%</span>
                      </div>
                      <div className="inv-metric">
                        <span className="inv-metric-label">CoC Return</span>
                        <span className="inv-metric-value">{d.cashOnCash}%</span>
                      </div>
                      <div className="inv-metric">
                        <span className="inv-metric-label">Beds/Baths</span>
                        <span className="inv-metric-value" style={{ color: 'var(--inv-muted)', fontSize: '0.8rem' }}>
                          {d.beds} bd · {d.baths} ba
                        </span>
                      </div>
                      <div className="inv-metric">
                        <span className="inv-metric-label">Sq Ft</span>
                        <span className="inv-metric-value" style={{ color: 'var(--inv-muted)', fontSize: '0.8rem' }}>
                          {d.sqft.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="inv-card-tag">{d.type}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                href="/agent/investor/listings"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--inv-accent)',
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                View All Deals →
              </Link>
            </p>
          </div>
        </section>

        <hr className="inv-hairline" />

        {/* ── 4. Markets ─────────────────────────────────────────────────── */}
        <section className="inv-section" style={{ backgroundColor: 'var(--inv-surface)' }}>
          <div className="inv-wrap">
            <p className="inv-section-label">Investment-Grade Markets</p>
            <h2 className="inv-section-title">Markets I Track</h2>
            <p className="inv-section-sub">
              Data from publicly available sources — MLS, county assessor, CoStar, FRED HPI.
              All figures as of the most recent available reporting period.
            </p>

            <table className="inv-markets-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Median Price</th>
                  <th>Avg. Cap Rate</th>
                  <th>Vacancy Rate</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {MARKET_TABLE.map((row) => (
                  <tr key={row.market}>
                    <td style={{ fontWeight: 500 }}>{row.market}</td>
                    <td style={{ fontFamily: 'var(--inv-font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.medianPrice}
                    </td>
                    <td style={{ fontFamily: 'var(--inv-font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--inv-accent)' }}>
                      {row.avgCapRate}
                    </td>
                    <td style={{ fontFamily: 'var(--inv-font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.vacRate}
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--inv-font-mono)',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          color: row.trend === 'Rising' ? 'var(--inv-accent)' : 'var(--inv-muted)',
                        }}
                      >
                        {row.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontFamily: 'var(--inv-font-mono)', fontSize: '0.62rem', color: 'var(--inv-muted)', marginTop: '0.75rem', letterSpacing: '0.04em' }}>
              Sources: CoStar, FRED HPI, Zillow Research — data as of available reporting period. Figures are indicators only, not guarantees.
            </p>
          </div>
        </section>

        <hr className="inv-hairline" />

        {/* ── 5. Methodology ──────────────────────────────────────────────── */}
        <section className="inv-section">
          <div className="inv-wrap">
            <p className="inv-section-label">How I Work</p>
            <h2 className="inv-section-title">Analysis Before Access</h2>
            <p className="inv-section-sub">
              Every deal shared on this site has been through a full underwriting process first.
              No blind referrals, no unverified numbers.
            </p>

            <div className="inv-steps">
              {METHODOLOGY.map((m) => (
                <div key={m.step} className="inv-step">
                  <p className="inv-step-title">{m.title}</p>
                  <p className="inv-step-desc">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="inv-hairline" />

        {/* ── 6. Education / Blog ─────────────────────────────────────────── */}
        <section className="inv-section" style={{ backgroundColor: 'var(--inv-surface)' }}>
          <div className="inv-wrap">
            <p className="inv-section-label">Education</p>
            <h2 className="inv-section-title">Long-Form Resources</h2>
            <p className="inv-section-sub">
              Unbiased articles on investment analysis, market selection, and deal structure.
              No promised returns. No hype.
            </p>

            <div className="inv-grid-3">
              {ARTICLES.map((a) => (
                <Link
                  key={a.slug}
                  href={`/agent/investor/resources`}
                  className="inv-resource-card"
                >
                  <p className="inv-resource-title">{a.title}</p>
                  <p className="inv-resource-desc">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <hr className="inv-hairline" />

        {/* ── 7. About ────────────────────────────────────────────────────── */}
        <section className="inv-section">
          <div className="inv-wrap">
            <div className="inv-about-grid">
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'}
                  alt={agent.name}
                  className="inv-about-headshot"
                  loading="lazy"
                />
              </div>
              <div>
                <p className="inv-section-label">About</p>
                <h2
                  style={{
                    fontFamily: 'var(--inv-font-display)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: 700,
                    color: 'var(--inv-primary)',
                    letterSpacing: '-0.015em',
                    marginBottom: '0.5rem',
                  }}
                >
                  {agent.name}
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--inv-font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--inv-accent)',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '1.5rem',
                  }}
                >
                  {agent.title} · Investment Division
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--inv-text)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  {agent.bio.slice(0, 380)}
                  {agent.bio.length > 380 ? '…' : ''}
                </p>
                <p className="inv-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.
                  {agent.license ? ` License: ${agent.license}.` : ''} Member, National Association of REALTORS®.{' '}
                  Equal Housing Opportunity.
                </p>
                <div className="inv-investment-disclaimer">
                  <strong>Investment disclaimer:</strong> Nothing on this site constitutes investment advice.
                  All cap rate, cash-on-cash, and IRR figures are estimates based on available data and
                  stated assumptions. Actual results will vary. Past performance is not indicative of future
                  results. Verify all numbers independently before making any investment decision.
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="inv-hairline" />

        {/* ── 8. Contact ──────────────────────────────────────────────────── */}
        <section className="inv-section">
          <div className="inv-wrap">
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <InvestorContactForm agent={agent} />
            </div>
          </div>
        </section>

        {/* ── Footer CTA ─────────────────────────────────────────────────── */}
        <div className="inv-cta-section">
          <h2>Ready to Underwrite a Deal?</h2>
          <p>
            Share your budget, strategy, and timeline. I follow up with relevant deals — not a sales pitch.
          </p>
          <Link href="/agent/investor/contact" className="inv-hero-cta">
            Run the Numbers
          </Link>
        </div>
      </InvestorLayout>
    </>
  )
}
