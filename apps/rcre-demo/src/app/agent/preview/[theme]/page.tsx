/**
 * Agent Website Theme Preview
 * Route: /agent/preview/[theme]
 *
 * Shows a demo agent home page with the selected theme.
 * This is a preview mode — not a published agent site.
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { THEME_CATALOG, type AgentWebsiteTheme } from '@/lib/agent-website/types'
import { getExampleAgent, EXAMPLE_AGENTS, getWebsiteConfig } from '@/lib/agent-website/agent-service'
import { buildHomeSEO } from '@/lib/agent-website/seo'
import { AgentWebsiteThemeProvider } from '@/components/agent-website/theme-context'
import { AgentWebsiteLayout } from '@/components/agent-website/AgentWebsiteLayout'
import { SEOMetadata } from '@/components/agent-website/SEOMetadata'
import '@/components/agent-website/agent-website.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ theme: string }>
}): Promise<Metadata> {
  const { theme } = await params
  if (!THEME_CATALOG[theme as AgentWebsiteTheme]) return { title: 'Theme Not Found' }
  const meta = THEME_CATALOG[theme as AgentWebsiteTheme]
  return {
    title: `${meta.name} — Theme Preview | RCRE`,
    description: meta.description,
    robots: { index: false, follow: false },
  }
}

// Use the Signature demo agent for all theme previews
const PREVIEW_AGENT_SLUG = 'rcre-signature-demo'
const PREVIEW_AGENT = EXAMPLE_AGENTS[PREVIEW_AGENT_SLUG]

export default async function ThemePreviewPage({
  params,
}: {
  params: Promise<{ theme: string }>
}) {
  const { theme } = await params

  const validTheme = THEME_CATALOG[theme as AgentWebsiteTheme]
  if (!validTheme) notFound()

  if (!PREVIEW_AGENT) notFound()

  // Build a preview config using the selected theme
  const previewConfig = {
    theme: theme as AgentWebsiteTheme,
    markets: PREVIEW_AGENT.markets,
    specialties: PREVIEW_AGENT.specialties || [],
    published: false,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    completenessScore: 85,
    tagline: PREVIEW_AGENT.tagline,
    headline: PREVIEW_AGENT.headline,
    heroImage: PREVIEW_AGENT.heroImage,
    seoTitle: `${PREVIEW_AGENT.name} | ${validTheme.name} Theme | RCRE`,
    seoDescription: validTheme.description,
  }

  const seo = buildHomeSEO(PREVIEW_AGENT, previewConfig)

  return (
    <AgentWebsiteThemeProvider
      theme={theme as AgentWebsiteTheme}
      profile={PREVIEW_AGENT}
      config={previewConfig}
    >
      <head>
        <SEOMetadata seo={seo} />
      </head>

      {/* Preview banner */}
      <div
        style={{
          backgroundColor: '#1a2e4a',
          color: '#ffffff',
          padding: '0.625rem 1.5rem',
          fontSize: '0.8rem',
          textAlign: 'center',
        }}
      >
        <strong>Theme Preview:</strong> {validTheme.name} · {validTheme.tagline} ·{' '}
        <Link
          href="/admin/website"
          style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 600 }}
        >
          Back to theme selection →
        </Link>
      </div>

      <AgentWebsiteLayout agent={PREVIEW_AGENT}>
        {/* Hero */}
        <section className="agent-hero" style={{ minHeight: '580px' }}>
          <img
            src={previewConfig.heroImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80'}
            alt={`${PREVIEW_AGENT.name} — ${PREVIEW_AGENT.market} real estate`}
            className="agent-hero-bg"
            loading="eager"
          />
          <div className="agent-hero-overlay" />
          <div className="agent-hero-content">
            <p className="agent-hero-kicker">{PREVIEW_AGENT.market}</p>
            <h1 className="agent-hero-title">
              {previewConfig.headline || PREVIEW_AGENT.tagline}
            </h1>
            <p className="agent-hero-sub">{PREVIEW_AGENT.tagline}</p>
            <div className="agent-hero-ctas">
              <Link href={`/agent/preview/${theme}/contact`} className="agent-btn-primary">
                Schedule a Consultation
              </Link>
              <Link href={`/agent/preview/${theme}/listings`} className="agent-btn-outline" style={{ borderColor: '#ffffff', color: '#ffffff' }}>
                Browse Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="agent-stats">
          <div className="agent-stats-inner">
            {[
              { number: '12+', label: 'Years Experience' },
              { number: '185+', label: 'Transactions Closed' },
              { number: '260+', label: 'Clients Served' },
            ].map((s) => (
              <div key={s.label}>
                <p className="agent-stat-number">{s.number}</p>
                <p className="agent-stat-label">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Markets */}
        <section
          className="agent-section-sm"
          style={{ backgroundColor: 'var(--color-surface, #ffffff)', borderTop: '1px solid var(--color-border, #e5e0d8)', borderBottom: '1px solid var(--color-border, #e5e0d8)' }}
        >
          <div className="agent-wrap">
            <p className="agent-section-label">Service Areas</p>
            <h2 className="agent-section-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
              Markets I Serve
            </h2>
            <div className="agent-markets-scroll" style={{ marginTop: '1rem' }}>
              {PREVIEW_AGENT.markets.map((m) => (
                <span key={m} className="agent-market-pill" style={{ cursor: 'default' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* About Preview */}
        <section
          className="agent-section"
          style={{ backgroundColor: 'var(--color-surface, #ffffff)', borderTop: '1px solid var(--color-border, #e5e0d8)' }}
        >
          <div className="agent-wrap">
            <div className="agent-about-split">
              <div>
                <img
                  src={PREVIEW_AGENT.headshot || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'}
                  alt={PREVIEW_AGENT.name}
                  style={{ width: '100%', maxWidth: '280px', aspectRatio: '4/5', objectFit: 'cover', borderRadius: '4px', display: 'block' }}
                />
              </div>
              <div>
                <p className="agent-section-label">About</p>
                <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, color: 'var(--color-primary, #1a2e4a)', marginBottom: '0.5rem' }}>
                  {PREVIEW_AGENT.name}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-accent, #c9a84c)', fontWeight: 600, marginBottom: '1.25rem' }}>
                  {PREVIEW_AGENT.title} · {PREVIEW_AGENT.market}
                </p>
                <p style={{ fontSize: '0.95rem', color: 'var(--color-text, #1a1a1a)', lineHeight: 1.8 }}>
                  {PREVIEW_AGENT.bio.slice(0, 320)}…
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="agent-cta-section">
          <div className="agent-wrap">
            <h2>Ready to start? Let&apos;s talk.</h2>
            <p>
              {PREVIEW_AGENT.name.split(' ')[0]} is available for consultations in {PREVIEW_AGENT.market}.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href={`/agent/preview/${theme}/contact`}
                className="agent-btn-primary"
                style={{ fontSize: '1rem', padding: '0.875rem 2.5rem' }}
              >
                Schedule a Consultation
              </Link>
              <a
                href={`tel:${PREVIEW_AGENT.phone.replace(/\D/g, '')}`}
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
                {PREVIEW_AGENT.phone}
              </a>
            </div>
          </div>
        </section>
      </AgentWebsiteLayout>
    </AgentWebsiteThemeProvider>
  )
}
