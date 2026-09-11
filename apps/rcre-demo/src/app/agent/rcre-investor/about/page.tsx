/**
 * RCRE Investor — About Page
 * Route: /agent/investor/about
 */
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildAboutSEO } from '@/lib/agent-website/seo'
import { InvestorLayout } from '../InvestorLayout'
import { InvestorSEO } from '../InvestorSEO'
import '../rcre-investor.css'

export const metadata: Metadata = {
  title: 'About Jordan Mercer | RCRE Investment Division',
}

const INVESTOR_CONFIG = {
  theme: 'rcre-investor' as const,
  markets: ['Jacksonville', 'Birmingham', 'Florida Panhandle'],
  specialties: ['Rental Investment', 'BRRRR', 'Short-Term Rental', 'Multi-Family', 'Fix-and-Flip'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'About Jordan Mercer | RCRE Investment Division',
  seoDescription: 'Jordan Mercer — Investment specialist with RCRE Group, serving rental investors in Jacksonville, Birmingham, and the Florida panhandle.',
}

export default function InvestorAboutPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildAboutSEO(agent, INVESTOR_CONFIG)

  return (
    <>
      <head><InvestorSEO seo={seo} /></head>
      <InvestorLayout agent={agent}>
        <section className="inv-section">
          <div className="inv-wrap">
            <p className="inv-section-label">About</p>
            <h1 className="inv-section-title">{agent.name}</h1>

            <div className="inv-about-grid" style={{ marginTop: '2.5rem' }}>
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'}
                  alt={agent.name}
                  className="inv-about-headshot"
                />
              </div>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--inv-font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--inv-accent)',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '1rem',
                  }}
                >
                  {agent.title} · Investment Division
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--inv-text)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  {agent.bio}
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--inv-text)', lineHeight: 1.8, marginBottom: '1rem' }}>
                  In the investment division of RCRE, my role is specifically to source, underwrite, and close
                  income-producing properties. I don&apos;t do this as a side interest — it&apos;s the practice.
                </p>

                <div
                  style={{
                    fontFamily: 'var(--inv-font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--inv-muted)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  {[
                    { label: 'Phone', value: agent.phone },
                    { label: 'Email', value: agent.email },
                    { label: 'License', value: agent.license },
                    { label: 'Markets', value: 'Jacksonville · Birmingham · FL Panhandle' },
                  ].map((r) => (
                    <div key={r.label}>
                      <p style={{ color: 'var(--inv-accent)', fontWeight: 500, marginBottom: '0.15rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{r.label}</p>
                      <p style={{ color: 'var(--inv-text)' }}>{r.value}</p>
                    </div>
                  ))}
                </div>

                <p className="inv-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.{' '}
                  Member, National Association of REALTORS®. Equal Housing Opportunity.
                </p>
                <div className="inv-investment-disclaimer" style={{ marginTop: '1rem' }}>
                  <strong>Investment disclaimer:</strong> All cap rate, cash-on-cash, and IRR figures on this site are
                  estimates only, based on stated assumptions and available market data. Actual results will vary.
                  Past performance is not indicative of future results. Nothing here constitutes investment advice.
                </div>
              </div>
            </div>

            {/* Strategy focus */}
            <div style={{ marginTop: '3rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--inv-font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--inv-primary)',
                  letterSpacing: '-0.01em',
                  marginBottom: '1rem',
                }}
              >
                Investment Focus
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                {[
                  { name: 'BRRRR', desc: 'Full BRRRR cycle — buy, rehab, rent, refinance, repeat. I track deals through the entire process.' },
                  { name: 'Long-Term Rental', desc: 'B–C class single-family and small multi-family. Stable, lower-management, consistent cash flow.' },
                  { name: 'Short-Term Rental', desc: 'Furnished units in approved STR zones. Higher gross income, seasonal variation, operational complexity.' },
                ].map((s) => (
                  <div
                    key={s.name}
                    style={{
                      backgroundColor: 'var(--inv-surface)',
                      border: '1px solid var(--inv-border)',
                      borderRadius: 'var(--inv-radius)',
                      padding: '1.25rem',
                    }}
                  >
                    <p className="inv-strategy-name">{s.name}</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--inv-muted)', lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </InvestorLayout>
    </>
  )
}
