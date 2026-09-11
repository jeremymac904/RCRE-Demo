/**
 * Agent Sell Page
 * Route: /agent/[slug]/sell
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAgentProfile, getWebsiteConfig, getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { AgentWebsiteThemeProvider } from '@/components/agent-website/theme-context'
import { AgentWebsiteLayout } from '@/components/agent-website/AgentWebsiteLayout'
import { SEOMetadata } from '@/components/agent-website/SEOMetadata'
import '@/components/agent-website/agent-website.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const agent = getAgentProfile(slug) || getExampleAgent(slug as keyof typeof import('@/lib/agent-website/agent-service').EXAMPLE_AGENTS)
  if (!agent) return { title: 'Agent Not Found' }
  const config = getWebsiteConfig(slug)
  if (!config) return { title: 'Agent Not Found' }
  const seo = buildHomeSEO(agent as Parameters<typeof buildHomeSEO>[0], config)
  return { title: `Sell with Confidence | ${agent.name} | RCRE`, description: seo.description }
}

export default async function AgentSellPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let agent = getAgentProfile(slug)
  if (!agent) {
    // @ts-expect-error - dynamic key
    agent = getExampleAgent(slug) || null
  }
  if (!agent) notFound()

  const config = getWebsiteConfig(slug)
  if (!config) notFound()

  const seo = buildHomeSEO(agent, config)

  return (
    <AgentWebsiteThemeProvider
      theme={config.theme || 'rcre-signature'}
      profile={agent}
      config={config}
    >
      <head>
        <SEOMetadata seo={seo} />
      </head>

      <AgentWebsiteLayout agent={agent}>
        {/* Page Hero */}
        <section className="agent-hero" style={{ minHeight: '480px' }}>
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80"
            alt="Sell your home"
            className="agent-hero-bg"
            loading="eager"
          />
          <div className="agent-hero-overlay" />
          <div className="agent-hero-content">
            <p className="agent-hero-kicker">Seller Services</p>
            <h1 className="agent-hero-title">Sell with Confidence</h1>
            <p className="agent-hero-sub">
              {agent.name.split(' ')[0]} provides full seller representation — from pricing strategy and preparation through marketing, negotiation, and closing.
            </p>
            <div className="agent-hero-ctas">
              <Link href={`/agent/${agent.slug}/contact`} className="agent-btn-primary">
                Request a Consultation
              </Link>
              <Link href={`/agent/${agent.slug}/about`} className="agent-btn-outline" style={{ borderColor: '#ffffff', color: '#ffffff' }}>
                About {agent.name.split(' ')[0]}
              </Link>
            </div>
          </div>
        </section>

        {/* Seller value prop */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            <p className="agent-section-label">How I Work with Sellers</p>
            <h2 className="agent-section-title">Representation Built Around Your Goals</h2>

            <div className="agent-grid-3" style={{ marginTop: '2.5rem' }}>
              {[
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #c9a84c)" strokeWidth="1.5">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  ),
                  title: 'Pricing Strategy',
                  desc: 'A data-informed pricing discussion — not a computer estimate. Recent comparables, current inventory, and your timeline all factor in.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #c9a84c)" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ),
                  title: 'Honest Condition Review',
                  desc: 'A practical walk-through of your home before listing. Focus on the repairs and improvements that affect price and timeline.',
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #c9a84c)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                  ),
                  title: 'Deadline Management',
                  desc: 'Inspection, appraisal, financing, and closing deadlines tracked through the RCRE transaction OS. You always know where things stand.',
                },
              ].map((item) => (
                <div key={item.title}>
                  <div className="agent-feature-icon">{item.icon}</div>
                  <h3 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary, #1a2e4a)' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.7 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Home valuation CTA */}
        <section
          className="agent-section-sm"
          style={{ backgroundColor: 'var(--color-primary, #1a2e4a)', color: '#ffffff' }}
        >
          <div className="agent-wrap" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent, #c9a84c)', marginBottom: '0.75rem' }}>
              Start with Data
            </p>
            <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, color: '#ffffff', marginBottom: '0.75rem' }}>
              What is your home worth?
            </h2>
            <p style={{ fontSize: '1rem', opacity: 0.85, marginBottom: '1.75rem', maxWidth: '500px', margin: '0 auto 1.75rem' }}>
              Share a few details about your property and {agent.name.split(' ')[0]} will provide a realistic estimate based on current market conditions.
            </p>
            <Link
              href={`/agent/${agent.slug}/contact`}
              className="agent-btn-primary"
              style={{ fontSize: '1rem', padding: '0.875rem 2.5rem' }}
            >
              Request a Home Valuation
            </Link>
          </div>
        </section>

        {/* Seller resources */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            <p className="agent-section-label">For Sellers</p>
            <h2 className="agent-section-title">Seller Resources</h2>

            <div className="agent-grid-2" style={{ marginTop: '2rem' }}>
              {[
                {
                  title: 'Pre-Listing Checklist',
                  desc: 'A practical checklist covering repairs, disclosures, staging priorities, and show-ready preparation before your first showing.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                  ),
                },
                {
                  title: 'Pricing Strategy Guide',
                  desc: 'How pricing works, what affects value, and why the right price matters more than a fast start. Includes a discussion of competing listings.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  ),
                },
                {
                  title: 'Marketing Plan',
                  desc: 'How your listing will be presented — photography, listing description, MLS exposure, and targeted buyer outreach in your market.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                  ),
                },
                {
                  title: 'Market Update',
                  desc: `Current supply, demand, and pricing trends in ${agent.market}. Updated regularly as a reference tool.`,
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                    </svg>
                  ),
                },
              ].map((r) => (
                <article key={r.title} className="agent-card">
                  <div className="agent-card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: 'rgba(201,168,76,0.1)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--color-accent, #c9a84c)',
                      }}
                    >
                      {r.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-primary, #1a2e4a)' }}>
                        {r.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.6 }}>
                        {r.desc}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href={`/agent/${agent.slug}/resources`} className="agent-btn-outline">
                View All Seller Resources
              </Link>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="agent-cta-section">
          <div className="agent-wrap">
            <h2>Ready to sell?</h2>
            <p>
              {agent.name.split(' ')[0]} is available for seller consultations in {agent.market}. Initial conversations are obligation-free.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href={`/agent/${agent.slug}/contact`}
                className="agent-btn-primary"
                style={{ fontSize: '1rem', padding: '0.875rem 2.5rem' }}
              >
                Schedule a Consultation
              </Link>
              <a
                href={`tel:${agent.phone.replace(/\D/g, '')}`}
                style={{
                  display: 'inline-block',
                  padding: '0.875rem 2rem',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                {agent.phone}
              </a>
            </div>
          </div>
        </section>
      </AgentWebsiteLayout>
    </AgentWebsiteThemeProvider>
  )
}
