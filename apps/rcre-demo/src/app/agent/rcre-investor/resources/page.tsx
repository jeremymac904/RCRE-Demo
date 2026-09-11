/**
 * RCRE Investor — Resources Page
 * Route: /agent/investor/resources
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildResourcesSEO } from '@/lib/agent-website/seo'
import { InvestorLayout } from '../InvestorLayout'
import { InvestorSEO } from '../InvestorSEO'
import '../rcre-investor.css'

export const metadata: Metadata = {
  title: 'Investor Resources | Jordan Mercer | RCRE Investment',
}

const INVESTOR_CONFIG = {
  theme: 'rcre-investor' as const,
  markets: ['Jacksonville', 'Birmingham', 'Florida Panhandle'],
  specialties: ['Rental Investment', 'BRRRR', 'Short-Term Rental', 'Multi-Family'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'Investor Resources | Jordan Mercer | RCRE Investment',
  seoDescription: 'Cap rate analysis, BRRRR guides, and market selection criteria for income property investors.',
}

const RESOURCES = [
  {
    title: 'Cap Rate vs. Cash-on-Cash Return',
    category: 'Analysis',
    desc: 'Cap rate is a property-level metric. Cash-on-cash is a deal-level metric. Conflating them leads to bad decisions — here\'s the distinction, with examples.',
    readTime: '8 min read',
    slug: 'cap-rate-vs-cash-on-cash',
  },
  {
    title: 'BRRRR Step-by-Step: From Purchase to Repeat',
    category: 'Strategy',
    desc: 'A walkthrough of the BRRRR strategy with actual numbers from a Jacksonville deal — purchase price, rehab estimate, ARV, rent comps, refi, and the equity created.',
    readTime: '12 min read',
    slug: 'brrrr-step-by-step',
  },
  {
    title: 'Market Selection Criteria for Rental Investment',
    category: 'Markets',
    desc: 'Landlord-tenant law, flood risk, school quality, employment diversity, and cap rate trends — the checklist I use before recommending a market.',
    readTime: '10 min read',
    slug: 'market-selection-criteria',
  },
  {
    title: 'HOA Restrictions and Investment Properties',
    category: 'Due Diligence',
    desc: 'Many HOA communities restrict or prohibit short-term rentals and investor-owned units. How to find out before you close.',
    readTime: '6 min read',
    slug: 'hoa-investor-restrictions',
  },
  {
    title: 'Rehab Estimating for BRRRR Deals',
    category: 'Strategy',
    desc: 'How to estimate rehab costs without getting burned — room-by-room scope, contractor bids vs. rule-of-thumb estimates, contingency.',
    readTime: '9 min read',
    slug: 'rehab-estimating-brrr',
  },
  {
    title: 'Vacancy, Cap Rates, and Why They Matter',
    category: 'Analysis',
    desc: 'Vacancy is the most underestimated variable in rental investment projections. How to model it honestly and what the data shows across markets.',
    readTime: '7 min read',
    slug: 'vacancy-cap-rates',
  },
]

export default function InvestorResourcesPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildResourcesSEO(agent, INVESTOR_CONFIG)

  return (
    <>
      <head><InvestorSEO seo={seo} /></head>
      <InvestorLayout agent={agent}>
        <section className="inv-section">
          <div className="inv-wrap">
            <p className="inv-section-label">Resources</p>
            <h1 className="inv-section-title">Investor Education</h1>
            <p className="inv-section-sub" style={{ marginBottom: '2.5rem' }}>
              Long-form articles on analysis, market selection, and deal structure.
              No promised returns. No hype. Just the numbers and the reasoning behind them.
            </p>

            {/* Cap rate calculator placeholder */}
            <div className="inv-calc-block" style={{ marginBottom: '3rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--inv-font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--inv-primary)',
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.01em',
                }}
              >
                Cap Rate Calculator
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--inv-muted)', marginBottom: '1.5rem' }}>
                Enter NOI and purchase price to calculate cap rate. For illustrative purposes only.
              </p>
              <div className="inv-calc-placeholder">
                <div className="inv-calc-placeholder-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="8" y1="10" x2="16" y2="10" />
                    <line x1="8" y1="14" x2="12" y2="14" />
                  </svg>
                </div>
                <p style={{ fontFamily: 'var(--inv-font-mono)', fontSize: '0.75rem', color: 'var(--inv-muted)', letterSpacing: '0.06em' }}>
                  CALCULATOR PLACEHOLDER
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--inv-muted)', maxWidth: '320px' }}>
                  Full cap rate calculator — NOI, purchase price, cap rate, and CoC return — coming to the RCRE agent portal.
                </p>
              </div>
            </div>

            {/* Articles grid */}
            <h2
              style={{
                fontFamily: 'var(--inv-font-display)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--inv-primary)',
                letterSpacing: '-0.01em',
                marginBottom: '1.5rem',
              }}
            >
              Articles
            </h2>
            <div className="inv-grid-3">
              {RESOURCES.map((r) => (
                <div
                  key={r.slug}
                  style={{
                    backgroundColor: 'var(--inv-surface)',
                    border: '1px solid var(--inv-border)',
                    borderRadius: 'var(--inv-radius)',
                    padding: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--inv-font-mono)',
                        fontSize: '0.62rem',
                        color: 'var(--inv-accent)',
                        fontWeight: 500,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {r.category}
                    </span>
                    <span style={{ fontFamily: 'var(--inv-font-mono)', fontSize: '0.62rem', color: 'var(--inv-muted)' }}>
                      {r.readTime}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--inv-font-display)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--inv-primary)',
                      marginBottom: '0.5rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {r.title}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--inv-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                    {r.desc}
                  </p>
                  <Link
                    href="/agent/investor/contact"
                    style={{
                      fontFamily: 'var(--inv-font-mono)',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      color: 'var(--inv-accent)',
                      textDecoration: 'none',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Read more →
                  </Link>
                </div>
              ))}
            </div>

            <p style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href="/agent/investor/contact" className="inv-cta-btn">
                Pre-Qualify for Deal Access
              </Link>
            </p>
          </div>
        </section>
      </InvestorLayout>
    </>
  )
}
