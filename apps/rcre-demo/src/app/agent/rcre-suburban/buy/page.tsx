/**
 * RCRE Suburban Family — Buy Page
 * Route: /agent/family/buy
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { SuburbanLayout } from '../SuburbanLayout'
import { SuburbanSEO } from '../SuburbanSEO'
import '../rcre-suburban.css'

export const metadata: Metadata = {
  title: 'Find Your Home | Jordan Mercer | RCRE Suburban Family',
}

const SUBURBAN_CONFIG = {
  theme: 'rcre-suburban' as const,
  markets: ['St. Johns County', 'Jacksonville Suburbs', 'Birmingham Suburbs'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const SCHOOL_NOTE = 'School ratings sourced from GreatSchools.org. Verify independently with the school district.'

export default function SuburbanBuyPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = {
    title: `Find Your Home | ${agent.name} | RCRE Suburban`,
    description: `Search active listings in St. Johns County and Jacksonville suburbs. ${agent.name} represents buyers in family communities with school-district expertise.`,
    canonical: 'https://rcregroup.com/agent/family/buy',
    ogTitle: `Find Your Home | ${agent.name} | RCRE Suburban`,
    ogDescription: 'Family homes in St. Johns County, Mandarin, Julington Creek, Nocatee.',
    ogType: 'website' as const,
    ogImage: agent.heroImage,
    twitterCard: 'summary_large_image' as const,
    structuredData: [],
  }

  return (
    <>
      <head><SuburbanSEO seo={seo} /></head>
      <SuburbanLayout agent={agent}>
        <section className="sub-section">
          <div className="sub-wrap">
            <p className="sub-section-label">Buy</p>
            <h1 className="sub-section-title">Find Your Neighborhood, Not Just a House</h1>
            <p className="sub-section-sub" style={{ marginBottom: '2.5rem' }}>
              I work with families in St. Johns County and Jacksonville suburbs — communities where schools,
              commute, and neighborhood amenities are primary criteria. {agent.name.split(' ')[0]} helps you
              find the right fit for your family.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {[
                { name: 'St. Johns County', desc: 'Top-rated district. Nocatee, Durbin Creek, St. Johns Forest.', rating: 'GreatSchools 8–10/10', href: '/agent/family/markets' },
                { name: 'Mandarin', desc: 'Established neighborhood, mature trees, good schools, original and updated homes.', rating: 'GreatSchools 7–9/10', href: '/agent/family/markets' },
                { name: 'Julington Creek', desc: 'Master-planned community with highly rated schools and planned amenities.', rating: 'GreatSchools 9–10/10', href: '/agent/family/markets' },
                { name: 'Nocatee', desc: 'Florida\'s largest master-planned community. Schools, splash parks, trails.', rating: 'GreatSchools 8–9/10', href: '/agent/family/markets' },
              ].map((n) => (
                <Link
                  key={n.name}
                  href={n.href}
                  style={{
                    display: 'block',
                    backgroundColor: 'var(--sub-surface)',
                    border: '1px solid var(--sub-border)',
                    borderRadius: 'var(--sub-radius)',
                    padding: '1.5rem',
                    textDecoration: 'none',
                  }}
                >
                  <p className="sub-district-name">{n.name}</p>
                  <p className="sub-district-desc" style={{ marginBottom: '0.75rem' }}>{n.desc}</p>
                  <span className="sub-school-rating">{n.rating}</span>
                </Link>
              ))}
            </div>

            <p style={{ fontSize: '0.68rem', color: 'var(--sub-muted)', marginBottom: '1.5rem' }}>
              {SCHOOL_NOTE}
            </p>

            <div style={{ textAlign: 'center' }}>
              <Link href={`/agent/family/contact`} className="sub-hero-cta">
                Start Your Search
              </Link>
              <p style={{ marginTop: '1rem' }}>
                <Link href={`/agent/family/listings`} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sub-primary)', textDecoration: 'none' }}>
                  Browse active listings →
                </Link>
              </p>
            </div>
          </div>
        </section>
      </SuburbanLayout>
    </>
  )
}
