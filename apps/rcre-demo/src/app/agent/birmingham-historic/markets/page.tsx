/**
 * RCRE Historic Heritage — Markets Page
 * Route: /agent/birmingham-historic/markets
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildMarketSEO } from '@/lib/agent-website/seo'
import { HistoricLayout } from '../HistoricLayout'
import { HistoricSEO } from '../HistoricSEO'
import '../historic.css'

export const metadata: Metadata = {
  title: 'Birmingham Historic Neighborhoods | Eleanor Whitmore | RCRE',
  description: 'Historic neighborhoods served by Eleanor Whitmore — Highland Park, Mountain Brook, English Village, Cahaba Heights. Birmingham, Alabama.',
}

const HH_CONFIG = {
  theme: 'rcre-historic' as const,
  markets: ['Highland Park', 'Mountain Brook', 'English Village', 'Cahaba Heights', 'Birmingham Historic Districts'],
  specialties: ['Historic Homes', 'Period Properties', 'Preservation', 'Estate Sales', 'Character Homes'],
  heroImage: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=1600&q=80',
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
}

const MARKETS = [
  {
    name: 'Highland Park',
    archTypes: 'Tudor Revival · Craftsman · Queen Anne · Colonial Revival',
    yearFounded: 'Platted 1890s; National Register 1978',
    image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=700&q=80',
    desc1: `Highland Park is Birmingham's oldest residential neighborhood, developed on a series of terraces that rise from the valley floor to the crest of Red Mountain. The original plat followed the topographic contours rather than imposing a rigid grid — a decision that gave the neighborhood its characteristic rolling streets and variety of lot sizes.`,
    desc2: `Tudor Revival architecture dominates the upper terraces; the lower elevations show more Craftsman and Queen Anne influence. Highland Avenue itself, running along the ridge, is listed on the National Register of Historic Places. The neighborhood has maintained strong architectural standards through an active civic association, and original fabric is largely intact.`,
    preservationNote: 'Exterior changes to contributing structures in the Highland Avenue National Register district require review. Verify requirements with the Birmingham Historic Preservation Commission.',
    whatToLookFor: ['Original slate or clay tile roofing', 'Lead and beveled glass window sash', 'Interior plaster detail and original millwork', 'Porch conditions — posts, columns, railings'],
    whatToKnow: ['Avg. lot size: 0.25 – 0.6 acres', 'Two-car garage typical; carriage houses exist', 'Some properties have mountain views; others are heavily wooded', 'Most homes had no central AC originally; ducting retrofits vary'],
  },
  {
    name: 'Mountain Brook',
    archTypes: 'Colonial Revival · English Cottage · Tudor Revival',
    yearFounded: 'Incorporated 1932; developed 1930s–1950s',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
    desc1: `Mountain Brook was conceived as a planned residential community — an escape from Birmingham's industrial core for families who could afford it. The architectural standards were established at founding and have been maintained since. Colonial Revival is the dominant style, but the English Cottage and Tudor Revival variants give the neighborhood more variety than its planned origins might suggest.`,
    desc2: `The Mountain Brook Village commercial district is the neighborhood's social center. Residential streets radiate outward from it, and nearly every block has mature canopy. Because the neighborhood was planned after the automobile was established, lots tend to be well-proportioned for today’s standards.`,
    preservationNote: 'Mountain Brook Village and the original residential plat fall under Mountain Brook municipal historic review for significant exterior changes. Verify with Mountain Brook city planning.',
    whatToLookFor: ['Brick versus frame construction — brick is more common', 'Original hardwoods under any carpet or refinished floors', 'Dormers and roof conditions on two-story structures', 'Original iron work and garden walls'],
    whatToKnow: ['Avg. lot size: 0.4 – 0.8 acres', 'Excellent school district; property values are the highest in Birmingham', 'Village walkability is a significant lifestyle amenity', 'Rennie Park and the Mountain Brook High School campus anchor the community'],
  },
  {
    name: 'English Village',
    archTypes: 'English Cottage · Tudor Revival · Arts & Crafts',
    yearFounded: 'Developed 1924–1938',
    image: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589a7c?w=700&q=80',
    desc1: `English Village is the most architecturally cohesive enclave in Birmingham — a small, highly intact neighborhood of English-period vernacular houses developed between 1924 and 1938. The houses here were built by a small number of builders working from the same aesthetic vocabulary: steeply pitched roofs, half-timbering in the gables, leaded glass, stucco, and dark brick.`,
    desc2: `English Village rarely sees inventory. When a property comes to market, it attracts a specific type of buyer — someone who has been looking for this particular neighborhood for a long time. The market is thin and prices reflect both the scarcity and the depth of interest.`,
    preservationNote: 'English Village is within Mountain Brook\'s planning jurisdiction. The Birmingham Historical Commission has noted this area\'s significance. Verify specific requirements with Mountain Brook city planning.',
    whatToLookFor: ['Original leaded glass and iron hardware', 'Steeply pitched original roofs — slate or simulated slate', 'Damp course conditions in stucco foundations', 'Garden walls and original landscape features'],
    whatToKnow: ['Avg. lot size: 0.35 – 0.65 acres', 'Properties rarely come to market — follow Eleanor for pre-market access', 'Highly sought by preservation-minded buyers nationally', 'HOA: none; Mountain Brook city standards apply'],
  },
  {
    name: 'Cahaba Heights',
    archTypes: 'Craftsman Bungalow · Period Revival · Mid-Century Modern',
    yearFounded: 'Developed 1920s–1960s; annexed 1950s',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80',
    desc1: `Cahaba Heights is Birmingham's most architecturally heterogeneous historic neighborhood — a former independent community that retained its eclectic character through annexation into Birmingham proper. Craftsman bungalows from the 1920s sit alongside period revival houses and mid-century modern structures, all within a walkable urban fabric.`,
    desc2: `The Cahaba River forms the southern boundary, adding a significant natural amenity. The neighborhood's heterogeneity is its strength: buyers who want period character without the formal standards of Highland Park or Mountain Brook find Cahaba Heights an attractive middle ground.`,
    preservationNote: 'Cahaba Heights falls under Birmingham Historic Preservation Commission review for contributing structures. Verify which blocks and structures carry designation.',
    whatToLookFor: ['Original Craftsman features vs. Mid-Century updates — understand what you are buying', 'Cahaba River flood plain conditions for southern properties', 'Bungalow porch conditions — columns, foundations', 'Window replacement history — original wood sash vs. vinyl replacement'],
    whatToKnow: ['Avg. lot size: 0.2 – 0.5 acres', 'Most affordable of Birmingham\'s historic neighborhoods', 'Strong rental market — investment buyers are active', 'The Cahaba River corridor adds significant long-term value'],
  },
]

export default function MarketsPage() {
  const agent = getExampleAgent('birmingham-historic')!
  const seo = buildMarketSEO(agent, HH_CONFIG, 'Birmingham Historic Neighborhoods')

  return (
    <>
      <head><HistoricSEO seo={seo} /></head>
      <HistoricLayout agent={agent}>
        {/* Hero */}
        <section style={{ backgroundColor: 'var(--hh-primary)', padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--hh-accent)', marginBottom: '0.5rem' }}>
            Markets
          </p>
          <h1 style={{ fontFamily: 'var(--hh-font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 400, fontStyle: 'italic', color: '#ffffff', marginBottom: '1rem' }}>
            Birmingham&apos;s Historic Neighborhoods
          </h1>
          <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.9rem', color: 'rgba(240,232,220,0.6)', fontWeight: 300, maxWidth: '560px', margin: '0 auto', lineHeight: 1.65 }}>
            Architectural character, preservation considerations, and what to look for in each community.
          </p>
        </section>

        {/* Markets */}
        {MARKETS.map((market, idx) => (
          <section
            key={market.name}
            className="hh-section"
            style={{ borderTop: '1px solid var(--hh-border)', ...(idx % 2 === 1 ? { backgroundColor: 'var(--hh-surface)' } : {}) }}
          >
            <div className="hh-wrap">
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '3rem', alignItems: 'start', marginBottom: '2.5rem' }}>
                <div>
                  <span style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hh-accent)', display: 'block', marginBottom: '0.5rem' }}>
                    {market.archTypes}
                  </span>
                  <h2 style={{ fontFamily: 'var(--hh-font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 400, fontStyle: 'italic', color: 'var(--hh-text)', marginBottom: '0.5rem' }}>
                    {market.name}
                  </h2>
                  <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.78rem', color: 'var(--hh-muted)', fontWeight: 300, fontStyle: 'italic' }}>
                    {market.yearFounded}
                  </p>
                </div>
                <img
                  src={market.image}
                  alt={market.name}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
              </div>

              {/* Editorial */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
                <div>
                  <div className="hh-editorial-text">
                    <p>{market.desc1}</p>
                    <p>{market.desc2}</p>
                  </div>

                  <div style={{ marginTop: '2rem', padding: '1.25rem', borderLeft: '3px solid var(--hh-accent)', background: 'var(--hh-bg)' }}>
                    <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.78rem', fontWeight: 500, color: 'var(--hh-accent)', marginBottom: '0.5rem' }}>Preservation Note</p>
                    <p style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.82rem', color: 'var(--hh-muted)', lineHeight: 1.7, fontWeight: 300 }}>
                      {market.preservationNote}
                    </p>
                  </div>
                </div>

                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontFamily: 'var(--hh-font-display)', fontSize: '0.9rem', fontWeight: 400, fontStyle: 'italic', color: 'var(--hh-text)', marginBottom: '0.75rem' }}>
                      What to look for
                    </p>
                    <ul style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.82rem', color: 'var(--hh-muted)', lineHeight: 1.75, fontWeight: 300, listStyle: 'none', padding: 0, margin: 0 }}>
                      {market.whatToLookFor.map((item) => (
                        <li key={item} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--hh-border)', marginBottom: '0.5rem' }}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p style={{ fontFamily: 'var(--hh-font-display)', fontSize: '0.9rem', fontWeight: 400, fontStyle: 'italic', color: 'var(--hh-text)', marginBottom: '0.75rem' }}>
                      What to know
                    </p>
                    <ul style={{ fontFamily: 'var(--hh-font-body)', fontSize: '0.82rem', color: 'var(--hh-muted)', lineHeight: 1.75, fontWeight: 300, listStyle: 'none', padding: 0, margin: 0 }}>
                      {market.whatToKnow.map((item) => (
                        <li key={item} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--hh-border)', marginBottom: '0.5rem' }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Contact CTA */}
        <div className="hh-cta-section">
          <h2>Interested in a specific neighborhood?</h2>
          <p>Tell us the community, the type of property you are looking for, and your timeline.</p>
          <Link href={`/agent/birmingham-historic/contact`} className="hh-hero-cta">
            Schedule a Consultation
          </Link>
        </div>
      </HistoricLayout>
    </>
  )
}
