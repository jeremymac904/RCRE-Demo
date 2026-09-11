/**
 * RCRE Suburban Family — Markets Page
 * Route: /agent/family/markets
 */
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { SuburbanLayout } from '../SuburbanLayout'
import { SuburbanSEO } from '../SuburbanSEO'
import '../rcre-suburban.css'

export const metadata: Metadata = {
  title: 'School Districts & Communities | Jordan Mercer | RCRE Suburban Family',
}

const SUBURBAN_CONFIG = {
  theme: 'rcre-suburban' as const,
  markets: ['St. Johns County', 'Jacksonville Suburbs', 'Birmingham Suburbs'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const SCHOOL_NOTE = 'School ratings sourced from GreatSchools.org — provided for informational purposes only. Verify independently with the school district.'

const COMMUNITIES = [
  {
    name: 'St. Johns County',
    desc: 'Consistently top-rated district in Florida. Newer communities, strong resale, and a steady stream of buyers who prioritize school quality. Nocatee, Durbin Creek, and St. Johns Forest are the core neighborhoods.',
    schools: 'GreatSchools 8–10/10 across most zones',
    hoa: '$65–$150/mo · amenity-based',
    idealFor: 'Growing families, move-up buyers, first-time buyers prioritizing schools',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=700&q=80',
  },
  {
    name: 'Mandarin',
    desc: 'Established neighborhood with mature trees, waterfront parcels, and good school options. Mandarin Middle and Mandarin High serve most of the area. Mix of original and updated homes from the 70s and 80s.',
    schools: 'GreatSchools 7–9/10 — Mandarin Middle, Mandarin High',
    hoa: '$0–$85/mo depending on community',
    idealFor: 'Buyers wanting established neighborhoods, mature trees, walkability to some amenities',
    image: 'https://images.unsplash.com/photo-1464082354059-27db6ce50048?w=700&q=80',
  },
  {
    name: 'Julington Creek',
    desc: 'Master-planned community in the northwest corner of St. Johns County. Highly rated schools, planned amenities, and a mix of townhomes, single-family, and estate homes. Strong community identity.',
    schools: 'GreatSchools 9–10/10 — Julington Creek Elementary',
    hoa: '$75–$120/mo · HOA-managed',
    idealFor: 'Families with school-age children, buyers wanting community amenities and planned growth',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80',
  },
  {
    name: 'Nocatee',
    desc: 'Florida\'s largest master-planned community. Continues to expand with new phases and builders. Families move here for the schools, the amenities (splash parks, trails, sports complexes), and relative affordability vs. coastal markets.',
    schools: 'GreatSchools 8–9/10 — Valley Ridge Academy serves K–8',
    hoa: '$55–$105/mo · community-managed',
    idealFor: 'First-time and move-up buyers, families wanting new construction with amenities',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80',
  },
]

export default function SuburbanMarketsPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = {
    title: `School Districts & Communities | ${agent.name} | RCRE Suburban`,
    description: `${agent.name} knows St. Johns County, Mandarin, Julington Creek, and Nocatee — Jacksonville suburbs with top-rated schools.`,
    canonical: 'https://rcregroup.com/agent/family/markets',
    ogTitle: `School Districts & Communities | ${agent.name} | RCRE Suburban`,
    ogDescription: 'St. Johns County, Mandarin, Julington Creek, Nocatee — Jacksonville suburbs with top-rated schools.',
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
            <p className="sub-section-label">School Districts & Communities</p>
            <h1 className="sub-section-title">Where Families Put Down Roots</h1>
            <p className="sub-section-sub" style={{ marginBottom: '2rem' }}>
              {agent.name.split(' ')[0]}&apos;s primary markets — school districts, communities, and the neighborhoods that
              serve them. All school ratings are sourced from GreatSchools.org and provided for
              informational purposes only.
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--sub-muted)', marginBottom: '2.5rem' }}>
              {SCHOOL_NOTE}
            </p>

            {COMMUNITIES.map((c) => (
              <div
                key={c.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '280px 1fr',
                  gap: '2.5rem',
                  alignItems: 'start',
                  marginBottom: '3rem',
                  paddingBottom: '3rem',
                  borderBottom: '1px solid var(--sub-border)',
                }}
              >
                <img
                  src={c.image}
                  alt={c.name}
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: 'var(--sub-radius)' }}
                  loading="lazy"
                />
                <div>
                  <h2 style={{ fontFamily: 'var(--sub-font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--sub-primary)', marginBottom: '0.5rem' }}>
                    {c.name}
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--sub-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
                    {c.desc}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="sub-school-rating">{c.schools}</span>
                    <span className="sub-district-tag">HOA {c.hoa}</span>
                    <span className="sub-district-tag">Ideal for: {c.idealFor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </SuburbanLayout>
    </>
  )
}
