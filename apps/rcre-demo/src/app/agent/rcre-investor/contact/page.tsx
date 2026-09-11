/**
 * RCRE Investor — Contact Page
 * Route: /agent/investor/contact
 */
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildContactSEO } from '@/lib/agent-website/seo'
import { InvestorLayout } from '../InvestorLayout'
import { InvestorSEO } from '../InvestorSEO'
import { InvestorContactForm } from '../InvestorContactForm'
import '../rcre-investor.css'

export const metadata: Metadata = {
  title: 'Pre-Qualify for Deals | Jordan Mercer | RCRE Investment',
}

const INVESTOR_CONFIG = {
  theme: 'rcre-investor' as const,
  markets: ['Jacksonville', 'Birmingham', 'Florida Panhandle'],
  specialties: ['Rental Investment', 'BRRRR', 'Short-Term Rental', 'Multi-Family'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'Pre-Qualify for Deals | Jordan Mercer | RCRE Investment',
  seoDescription: 'Pre-qualify for investment property deals in Jacksonville, Birmingham, and the Florida panhandle.',
}

export default function InvestorContactPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildContactSEO(agent, INVESTOR_CONFIG)

  return (
    <>
      <head><InvestorSEO seo={seo} /></head>
      <InvestorLayout agent={agent}>
        <section className="inv-section">
          <div className="inv-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 520px', gap: '4rem', alignItems: 'start' }}>
              {/* Left */}
              <div>
                <p className="inv-section-label">Pre-Qualify</p>
                <h1 className="inv-section-title">Run the Numbers</h1>
                <p className="inv-section-sub" style={{ marginBottom: '2rem' }}>
                  I share current deals with pre-qualified investors first. Share your budget, strategy,
                  and timeline. I follow up with relevant opportunities — not a sales pitch.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                  }}
                >
                  {[
                    { label: 'Phone', value: agent.phone },
                    { label: 'Email', value: agent.email },
                    { label: 'Markets', value: 'Jacksonville · Birmingham · FL Panhandle' },
                    { label: 'License', value: agent.license },
                  ].map((r) => (
                    <div key={r.label}>
                      <p style={{ fontFamily: 'var(--inv-font-mono)', fontSize: '0.65rem', color: 'var(--inv-accent)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{r.label}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--inv-text)', fontWeight: 500 }}>{r.value}</p>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--inv-bg)',
                    border: '1px solid var(--inv-border)',
                    borderRadius: 'var(--inv-radius)',
                    padding: '1rem',
                    fontSize: '0.78rem',
                    color: 'var(--inv-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: 'var(--inv-text)' }}>What happens next:</strong> After you submit, I review
                  your criteria and follow up within one to two business days with deals that match. No automated
                  sequences. No call centers.
                </div>

                <p className="inv-license-note" style={{ marginTop: '2rem' }}>
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.{' '}
                  Equal Housing Opportunity.
                </p>
                <div className="inv-investment-disclaimer" style={{ marginTop: '1rem' }}>
                  All cap rate, cash-on-cash, and IRR figures are estimates only. Past performance is not
                  indicative of future results. Verify all numbers independently.
                </div>
              </div>

              {/* Right: form */}
              <div>
                <div
                  style={{
                    backgroundColor: 'var(--inv-surface)',
                    border: '1px solid var(--inv-border)',
                    borderRadius: 'var(--inv-radius)',
                    padding: '2rem',
                  }}
                >
                  <InvestorContactForm agent={agent} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </InvestorLayout>
    </>
  )
}
