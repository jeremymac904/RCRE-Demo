/**
 * RCRE Urban Modern — Buy Page
 * Route: /agent/jacksonville-urban/buy
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { UrbanLayout } from '../UrbanLayout'
import { UrbanSEO } from '../UrbanSEO'
import '../rcre-urban.css'

export const metadata: Metadata = {
  title: 'Find a Home | Priya Nair | RCRE Urban Modern',
}

const URBAN_CONFIG = {
  theme: 'rcre-urban' as const,
  markets: ['Riverside', 'Avondale', 'San Marco', 'Downtown Jacksonville', 'Brooklyn'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

export default function UrbanBuyPage() {
  const agent = getExampleAgent('jacksonville-urban')!
  const seo = {
    title: `Find Your City Home | ${agent.name} | RCRE`,
    description: `Search active listings in Jacksonville urban core — condo, loft, townhouse. ${agent.name} represents buyers in Riverside, Avondale, San Marco, Downtown, and Brooklyn.`,
    canonical: 'https://rcregroup.com/agent/jacksonville-urban/buy',
    ogTitle: `Find Your City Home | ${agent.name} | RCRE`,
    ogDescription: `Urban real estate in Jacksonville — ${agent.name} knows Riverside, Avondale, San Marco, Downtown, and Brooklyn.`,
    ogType: 'website' as const,
    ogImage: agent.heroImage,
    twitterCard: 'summary_large_image' as const,
    structuredData: [],
  }

  return (
    <>
      <head><UrbanSEO seo={seo} /></head>
      <UrbanLayout agent={agent}>
        <section className="urban-section">
          <div className="urban-wrap">
            <p className="urban-section-label">Buy</p>
            <h1 className="urban-section-title">Find Your City Home</h1>
            <p className="urban-section-sub" style={{ marginBottom: '2.5rem' }}>
              I work the Jacksonville urban core — condo, loft, and townhouse. No suburban listings, no beach properties,
              no distractions. Just the city, and the buildings that make it livable.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'Riverside', desc: 'Tree-lined streets, King Street dining, 1920s bungalows to modern condos.', href: '/agent/jacksonville-urban/markets' },
                { label: 'Avondale', desc: 'West of Riverside. Tudor, craftsman, updated mid-century. Great restaurants.', href: '/agent/jacksonville-urban/markets' },
                { label: 'San Marco', desc: 'Jacksonville\'s most walkable neighborhood. The Square, Library, Marco Luther.', href: '/agent/jacksonville-urban/markets' },
                { label: 'Downtown', desc: 'Southbank towers, emerging Brooklyn, sports complex corridor. Riverfront living.', href: '/agent/jacksonville-urban/markets' },
              ].map((n) => (
                <Link
                  key={n.label}
                  href={n.href}
                  style={{
                    display: 'block',
                    backgroundColor: 'var(--urban-surface)',
                    border: '1px solid var(--urban-border)',
                    borderRadius: 'var(--urban-radius)',
                    padding: '1.5rem',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <p style={{ fontFamily: 'var(--urban-font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--urban-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    {n.label}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--urban-muted)', lineHeight: 1.6 }}>{n.desc}</p>
                </Link>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link href={`/agent/${agent.slug}/contact`} className="urban-hero-cta">
                Schedule a Tour
              </Link>
              <p style={{ marginTop: '1rem' }}>
                <Link href={`/agent/${agent.slug}/listings`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--urban-accent)', textDecoration: 'none' }}>
                  Browse active listings →
                </Link>
              </p>
            </div>
          </div>
        </section>
      </UrbanLayout>
    </>
  )
}
