/**
 * Agent Markets Page
 * Route: /agent/[slug]/markets
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAgentProfile, getWebsiteConfig, getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildMarketSEO } from '@/lib/agent-website/seo'
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
  const seo = buildMarketSEO(agent as Parameters<typeof buildMarketSEO>[0], config, agent.market)
  return { title: seo.title, description: seo.description }
}

const MARKET_DESCRIPTIONS: Record<string, string> = {
  Jacksonville: 'Florida\'s largest city by area — diverse neighborhoods, strong employment base, and growing residential markets from the beaches to the inland communities.',
  'Ponte Vedra': 'Premium coastal community known for TPC Sawgrass, gated neighborhoods, and executive waterfront properties.',
  Nocatee: 'Master-planned community in St. Johns County — top-rated schools, family amenities, and new construction options.',
  Birmingham: 'Alabama\'s largest city with a revitalized urban core, diverse neighborhoods, and strong healthcare and finance employment.',
  'St. Johns County': 'Fastest-growing county in Florida —Known for A-rated schools, coastal communities, and a balance of new construction and established neighborhoods.',
  'Central Alabama': 'From Birmingham\'s suburbs to rural communities, Central Alabama offers diverse housing options and emerging markets.',
  Riverside: 'Historic Jacksonville neighborhood with walkable streets, local restaurants, and craftsman architecture.',
  Avondale: 'Jacksonville\'s most walkable urban neighborhood —Known for its bungalow architecture and growing commercial district.',
  'Mandarin': 'Historic Jacksonville neighborhood along the St. Johns River with established homes, top schools, and waterfront properties.',
  'Downtown Jacksonville': 'Urban residential living in Florida\'s largest city — condos, lofts, and new development along the riverfront.',
  'Birmingham exurbs': 'Growing communities outside Birmingham\'s core — newer construction, larger lots, and family-oriented neighborhoods.',
  'Florida': 'The RCRE market spans Florida\'s Atlantic coast from Jacksonville to Miami, with active communities throughout the state.',
  'Alabama': 'RCRE serves Alabama from Birmingham to the Gulf Coast, covering both metropolitan and rural markets.',
  'Alabama & Florida': 'Serving clients across both Alabama and Florida — wherever your real estate goals take you.',
  'Jacksonville & Alabama': 'Dual-state service from Jacksonville\'s urban core to Alabama communities — one agent, two markets.',
  'Jacksonville Urban Core': 'Jacksonville\'s walkable urban neighborhoods: Riverside, Avondale, San Marco, and the downtown residential towers.',
  'Northeast Florida': 'From Jacksonville\'s beaches to St. Augustine and inland communities — a diverse coastal market with something for every buyer.',
}

export default async function AgentMarketsPage({
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

  const markets = config.markets?.length ? config.markets : agent.markets || [agent.market]
  const seo = buildMarketSEO(agent, config, agent.market)

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
            <p className="agent-hero-kicker">Markets</p>
            <h1>Areas I Serve</h1>
            <p>Local market knowledge across {agent.market}. Each community has its own character — let me help you find the right fit.</p>
          </div>
        </section>

        {/* Markets grid */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {markets.map((market) => (
                <article key={market} className="agent-market-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: 'rgba(201,168,76,0.1)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #c9a84c)" strokeWidth="1.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-primary, #1a2e4a)', marginBottom: '0.25rem' }}>
                        {market}
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-accent, #c9a84c)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {agent.market.includes(market) || agent.market === market ? 'Primary Market' : 'Service Area'}
                      </p>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.7, marginBottom: '1rem' }}>
                    {MARKET_DESCRIPTIONS[market] || `Local market expertise in ${market} — covering residential sales, buyer representation, and investment properties.`}
                  </p>

                  <Link
                    href={`/agent/${agent.slug}/listings`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--color-accent, #c9a84c)',
                      textDecoration: 'none',
                    }}
                  >
                    View listings in {market.split(' ')[0]} →
                  </Link>
                </article>
              ))}
            </div>

            {/* CTA */}
            <div
              style={{
                marginTop: '3rem',
                textAlign: 'center',
                padding: '2rem',
                backgroundColor: 'var(--color-surface, #ffffff)',
                border: '1px solid var(--color-border, #e5e0d8)',
                borderRadius: '4px',
              }}
            >
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: '1rem' }}>
                Don&apos;t see your target area? {agent.name.split(' ')[0]} may still be able to help — reach out to ask.
              </p>
              <Link href={`/agent/${agent.slug}/contact`} className="agent-btn-primary">
                Ask About a Market
              </Link>
            </div>
          </div>
        </section>
      </AgentWebsiteLayout>
    </AgentWebsiteThemeProvider>
  )
}
