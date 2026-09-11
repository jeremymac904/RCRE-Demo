/**
 * Agent About Page
 * Route: /agent/[slug]/about
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAgentProfile, getWebsiteConfig, getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildAboutSEO } from '@/lib/agent-website/seo'
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
  const seo = buildAboutSEO(agent as Parameters<typeof buildAboutSEO>[0], config)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
  }
}

export default async function AgentAboutPage({
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

  const seo = buildAboutSEO(agent, config)
  const markets = config.markets?.length ? config.markets : agent.markets || [agent.market]
  const specialties = config.specialties?.length ? config.specialties : agent.specialties || []

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
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <p className="agent-hero-kicker">About</p>
            <h1>{agent.name}</h1>
            <p style={{ fontSize: '1rem', opacity: 0.75, marginTop: '0.5rem' }}>
              {agent.title} · {agent.market}
            </p>
          </div>
        </section>

        {/* Main content */}
        <section className="agent-section" style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}>
          <div className="agent-wrap">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '320px 1fr',
                gap: '4rem',
                alignItems: 'start',
              }}
              className="about-grid"
            >
              {/* Left: headshot + quick facts */}
              <div>
                <img
                  src={agent.headshot || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'}
                  alt={agent.name}
                  style={{
                    width: '100%',
                    maxWidth: '320px',
                    aspectRatio: '4/5',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    display: 'block',
                    marginBottom: '1.5rem',
                  }}
                />

                {/* Quick facts */}
                <div
                  style={{
                    backgroundColor: 'var(--color-surface, #ffffff)',
                    border: '1px solid var(--color-border, #e5e0d8)',
                    borderRadius: '4px',
                    padding: '1.25rem',
                  }}
                >
                  <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary, #1a2e4a)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Contact
                  </h2>
                  <dl style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {[
                      ['Phone', agent.phone],
                      ['Email', agent.email],
                      ['License', agent.license || 'Available upon request'],
                      ['Market', agent.market],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt style={{ fontWeight: 600, color: 'var(--color-text-muted, #6b7280)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.125rem' }}>
                          {label}
                        </dt>
                        <dd style={{ color: 'var(--color-text, #1a1a1a)' }}>
                          <a
                            href={label === 'Email' ? `mailto:${value}` : label === 'Phone' ? `tel:${(value as string).replace(/\D/g, '')}` : undefined}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {value}
                          </a>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              {/* Right: full bio */}
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display, Georgia, serif)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: 600,
                    color: 'var(--color-primary, #1a2e4a)',
                    marginBottom: '1.5rem',
                  }}
                >
                  Biography
                </h2>

                {/* Split bio into paragraphs */}
                <div style={{ fontSize: '0.95rem', color: 'var(--color-text, #1a1a1a)', lineHeight: 1.8 }}>
                  {agent.bio.split('. ').reduce<(string | { para: string })[]>((acc, sentence, i, arr) => {
                    const paraIndex = Math.floor(i / 3)
                    if (i % 3 === 0) {
                      acc.push({ para: arr.slice(i, i + 3).join('. ') + (i + 3 < arr.length ? '.' : '') })
                    }
                    return acc
                  }, []).map((block, i) => (
                    <p key={i} style={{ marginBottom: '1.25rem' }}>
                      {typeof block === 'string' ? block : block.para}
                    </p>
                  ))}
                </div>

                {/* Specialties */}
                {specialties.length > 0 && (
                  <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border, #e5e0d8)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted, #6b7280)', marginBottom: '0.75rem' }}>
                      Specialties
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {specialties.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: '0.375rem 0.875rem',
                            backgroundColor: 'rgba(201,168,76,0.1)',
                            border: '1px solid rgba(201,168,76,0.3)',
                            borderRadius: '99px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            color: 'var(--color-primary, #1a2e4a)',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Markets */}
                {markets.length > 0 && (
                  <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border, #e5e0d8)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted, #6b7280)', marginBottom: '0.75rem' }}>
                      Markets Served
                    </h3>
                    <div className="agent-markets-scroll">
                      {markets.map((m) => (
                        <Link key={m} href={`/agent/${agent.slug}/markets`} className="agent-market-pill">
                          {m}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social links */}
                {agent.socialLinks && (
                  <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border, #e5e0d8)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted, #6b7280)', marginBottom: '0.75rem' }}>
                      Connect
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {agent.socialLinks.linkedin && (
                        <a
                          href={agent.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--color-primary, #1a2e4a)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}
                        >
                          LinkedIn ↗
                        </a>
                      )}
                      {agent.socialLinks.instagram && (
                        <a
                          href={agent.socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--color-primary, #1a2e4a)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}
                        >
                          Instagram ↗
                        </a>
                      )}
                      {agent.socialLinks.facebook && (
                        <a
                          href={agent.socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--color-primary, #1a2e4a)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}
                        >
                          Facebook ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact CTA */}
                <div
                  style={{
                    marginTop: '2.5rem',
                    padding: '1.5rem',
                    backgroundColor: 'var(--color-surface, #ffffff)',
                    border: '1px solid var(--color-border, #e5e0d8)',
                    borderRadius: '4px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: '1rem' }}>
                    Ready to work with {agent.name.split(' ')[0]}?
                  </p>
                  <Link href={`/agent/${agent.slug}/contact`} className="agent-btn-primary">
                    Get in Touch
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AgentWebsiteLayout>
    </AgentWebsiteThemeProvider>
  )
}
