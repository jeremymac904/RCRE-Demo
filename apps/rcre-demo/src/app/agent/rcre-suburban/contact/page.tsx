/**
 * RCRE Suburban Family — Contact Page
 * Route: /agent/family/contact
 */
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildContactSEO } from '@/lib/agent-website/seo'
import { SuburbanLayout } from '../SuburbanLayout'
import { SuburbanSEO } from '../SuburbanSEO'
import { SuburbanContactForm } from '../SuburbanContactForm'
import '../rcre-suburban.css'

export const metadata: Metadata = {
  title: 'Contact Jordan Mercer | RCRE Suburban Family',
}

const SUBURBAN_CONFIG = {
  theme: 'rcre-suburban' as const,
  markets: ['St. Johns County', 'Jacksonville Suburbs', 'Birmingham Suburbs'],
  specialties: ['Families', 'School Districts', 'First-Time Buyers', 'Move-Up Buyers'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'Contact Jordan Mercer | RCRE Suburban Family',
  seoDescription: 'Contact Jordan Mercer — Suburban Family specialist serving families in St. Johns County and Jacksonville suburbs.',
}

export default function SuburbanContactPage() {
  const agent = getExampleAgent('rcre-signature-demo')!
  const seo = buildContactSEO(agent, SUBURBAN_CONFIG)

  return (
    <>
      <head><SuburbanSEO seo={seo} /></head>
      <SuburbanLayout agent={agent}>
        <section className="sub-section">
          <div className="sub-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 500px', gap: '4rem', alignItems: 'start' }}>
              {/* Left */}
              <div>
                <p className="sub-section-label">Contact</p>
                <h1 className="sub-section-title">Tell Us About Your Family</h1>
                <p className="sub-section-sub" style={{ marginBottom: '2rem' }}>
                  {agent.name.split(' ')[0]} works with families in St. Johns County, Jacksonville suburbs,
                  and Birmingham. Share what you&apos;re looking for and we&apos;ll follow up with the right information.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sub-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Phone</p>
                    <a href={`tel:${agent.phone.replace(/[^0-9]/g, '')}`} style={{ fontSize: '1rem', color: 'var(--sub-primary)', textDecoration: 'none', fontWeight: 700 }}>{agent.phone}</a>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sub-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email</p>
                    <a href={`mailto:${agent.email}`} style={{ fontSize: '1rem', color: 'var(--sub-primary)', textDecoration: 'none', fontWeight: 700 }}>{agent.email}</a>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sub-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Areas</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--sub-muted)' }}>St. Johns County · Mandarin · Julington Creek · Nocatee</p>
                  </div>
                </div>

                <p className="sub-license-note">
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.{' '}
                  Equal Housing Opportunity.
                </p>
              </div>

              {/* Right: form */}
              <div>
                <div
                  style={{
                    backgroundColor: 'var(--sub-surface)',
                    border: '1px solid var(--sub-border)',
                    borderRadius: 'var(--sub-radius)',
                    padding: '2rem',
                  }}
                >
                  <SuburbanContactForm agent={agent} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </SuburbanLayout>
    </>
  )
}
