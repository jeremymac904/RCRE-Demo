/**
 * Agent Resources Page
 * Route: /agent/[slug]/resources
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAgentProfile, getWebsiteConfig, getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildResourcesSEO } from '@/lib/agent-website/seo'
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
  const seo = buildResourcesSEO(agent as Parameters<typeof buildResourcesSEO>[0], config)
  return { title: seo.title, description: seo.description }
}

const RESOURCES = {
  buyer: [
    {
      title: 'First-Time Buyer Guide',
      category: 'Buyer',
      desc: 'A practical overview of the purchase process from start to finish — mortgage pre-approval, agent selection, making an offer, inspections, and closing.',
      audience: 'Anyone buying their first home or returning to the market after several years.',
    },
    {
      title: 'Mortgage Financing Overview',
      category: 'Buyer',
      desc: 'Understand the main loan programs, down payment options, mortgage insurance, and what happens during the underwriting process.',
      audience: 'Buyers who want to understand their financing options before shopping.',
    },
    {
      title: 'Closing Checklist',
      category: 'Buyer',
      desc: 'A step-by-step checklist for the final 30 days before closing — documents to gather, tasks to complete, and questions to ask your lender.',
      audience: 'Buyers in the final stages of a transaction.',
    },
  ],
  seller: [
    {
      title: 'Pre-Listing Home Prep Guide',
      category: 'Seller',
      desc: 'A practical checklist covering repairs to prioritize, disclosure requirements, staging priorities, and first-impression improvements before your first showing.',
      audience: 'Homeowners preparing to list their property.',
    },
    {
      title: 'Pricing Strategy Guide',
      category: 'Seller',
      desc: 'How comparable sales and current inventory shape your pricing decision, why the right price matters more than a fast start, and how to evaluate offers.',
      audience: 'Sellers wanting to understand the pricing process.',
    },
    {
      title: 'Marketing Plan Overview',
      category: 'Seller',
      desc: 'How your listing will be presented to the market — professional photography, listing description, MLS exposure, and targeted outreach to qualified buyers.',
      audience: 'Sellers evaluating agent marketing approaches.',
    },
  ],
  market: [
    {
      title: 'Jacksonville Market Update',
      category: 'Market Report',
      desc: 'Current residential market conditions in Jacksonville — median prices, inventory levels, days on market, and buyer/seller balance. Updated quarterly.',
      audience: 'Buyers and sellers active in the Jacksonville market.',
    },
    {
      title: 'Birmingham Market Update',
      category: 'Market Report',
      desc: 'Current residential market conditions in Birmingham and Central Alabama — median prices, inventory, and trends across key neighborhoods.',
      audience: 'Buyers and sellers active in the Birmingham market.',
    },
    {
      title: 'Alabama & Florida Market Overview',
      category: 'Market Report',
      desc: 'A broad look at residential real estate conditions across RCRE\'s primary markets — Alabama and Florida — covering economic drivers, inventory trends, and outlook.',
      audience: 'Relocation buyers and investors exploring both states.',
    },
  ],
}

export default async function AgentResourcesPage({
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

  const seo = buildResourcesSEO(agent, config)

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
        <section className="agent-page-hero">
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <p className="agent-hero-kicker">Resources</p>
            <h1>Buyer & Seller Guides</h1>
            <p>
              Free guides and market reports from {agent.name}. Practical, market-specific information for every stage of your real estate journey.
            </p>
          </div>
        </section>

        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">

            {/* Buyer Resources */}
            <div style={{ marginBottom: '4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '4px', height: '28px', backgroundColor: 'var(--color-accent, #c9a84c)', borderRadius: '2px' }} />
                <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 600, color: 'var(--color-primary, #1a2e4a)' }}>
                  Buyer Resources
                </h2>
              </div>

              <div className="agent-grid-3">
                {RESOURCES.buyer.map((r) => (
                  <article key={r.title} className="agent-card">
                    <div className="agent-card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div className="agent-resource-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent, #c9a84c)' }}>
                          {r.category}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary, #1a2e4a)' }}>
                        {r.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                        {r.desc}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', fontStyle: 'italic' }}>
                        {r.audience}
                      </p>
                      <a
                        href="#"
                        style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent, #c9a84c)', textDecoration: 'none' }}
                        aria-label={`Download ${r.title} (PDF)`}
                      >
                        Download PDF →
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Seller Resources */}
            <div style={{ marginBottom: '4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '4px', height: '28px', backgroundColor: 'var(--color-accent, #c9a84c)', borderRadius: '2px' }} />
                <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 600, color: 'var(--color-primary, #1a2e4a)' }}>
                  Seller Resources
                </h2>
              </div>

              <div className="agent-grid-3">
                {RESOURCES.seller.map((r) => (
                  <article key={r.title} className="agent-card">
                    <div className="agent-card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div className="agent-resource-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent, #c9a84c)' }}>
                          {r.category}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary, #1a2e4a)' }}>
                        {r.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                        {r.desc}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', fontStyle: 'italic' }}>
                        {r.audience}
                      </p>
                      <a
                        href="#"
                        style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent, #c9a84c)', textDecoration: 'none' }}
                        aria-label={`Download ${r.title} (PDF)`}
                      >
                        Download PDF →
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Market Resources */}
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '4px', height: '28px', backgroundColor: 'var(--color-accent, #c9a84c)', borderRadius: '2px' }} />
                <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 600, color: 'var(--color-primary, #1a2e4a)' }}>
                  Market Reports
                </h2>
              </div>

              <div className="agent-grid-3">
                {RESOURCES.market.map((r) => (
                  <article key={r.title} className="agent-card">
                    <div className="agent-card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div className="agent-resource-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent, #c9a84c)' }}>
                          {r.category}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary, #1a2e4a)' }}>
                        {r.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                        {r.desc}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', fontStyle: 'italic' }}>
                        {r.audience}
                      </p>
                      <a
                        href="#"
                        style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent, #c9a84c)', textDecoration: 'none' }}
                        aria-label={`Download ${r.title} (PDF)`}
                      >
                        Download PDF →
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Contact CTA */}
            <div
              style={{
                padding: '2rem',
                backgroundColor: 'var(--color-surface, #ffffff)',
                border: '1px solid var(--color-border, #e5e0d8)',
                borderRadius: '4px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: '0.75rem' }}>
                Questions about a specific guide or market? {agent.name.split(' ')[0]} is available to walk you through anything in these resources.
              </p>
              <Link href={`/agent/${agent.slug}/contact`} className="agent-btn-primary">
                Ask a Question
              </Link>
            </div>
          </div>
        </section>
      </AgentWebsiteLayout>
    </AgentWebsiteThemeProvider>
  )
}
