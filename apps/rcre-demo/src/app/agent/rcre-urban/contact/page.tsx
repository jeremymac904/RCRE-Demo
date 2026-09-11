/**
 * RCRE Urban Modern — Contact Page
 * Route: /agent/jacksonville-urban/contact
 */
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { buildContactSEO } from '@/lib/agent-website/seo'
import { UrbanLayout } from '../UrbanLayout'
import { UrbanSEO } from '../UrbanSEO'
import { UrbanContactForm } from '../UrbanContactForm'
import '../rcre-urban.css'

export const metadata: Metadata = {
  title: 'Contact Priya Nair | RCRE Urban Modern',
}

const URBAN_CONFIG = {
  theme: 'rcre-urban' as const,
  markets: ['Riverside', 'Avondale', 'San Marco', 'Downtown Jacksonville', 'Brooklyn'],
  specialties: ['Urban Condo', 'Loft', 'Townhouse', 'Walkability', 'New Development'],
  published: true,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  completenessScore: 100,
  seoTitle: 'Contact Priya Nair | RCRE Urban Modern',
  seoDescription: 'Contact Priya Nair — Jacksonville urban core real estate. Schedule a tour or inquiry.',
}

export default function UrbanContactPage() {
  const agent = getExampleAgent('jacksonville-urban')!
  const seo = buildContactSEO(agent, URBAN_CONFIG)

  return (
    <>
      <head><UrbanSEO seo={seo} /></head>
      <UrbanLayout agent={agent}>
        <section className="urban-section">
          <div className="urban-wrap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 480px', gap: '4rem', alignItems: 'start' }}>
              {/* Left: context */}
              <div>
                <p className="urban-section-label">Contact</p>
                <h1 className="urban-section-title">Get in Touch</h1>
                <p className="urban-section-sub" style={{ marginBottom: '2rem' }}>
                  {agent.name} works Jacksonville urban core — Riverside, Avondale, San Marco, Downtown, and Brooklyn.
                  Direct contact preferred. I respond personally within one business day.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--urban-font-mono)', fontSize: '0.65rem', color: 'var(--urban-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Phone</p>
                    <a href={`tel:${agent.phone.replace(/[^0-9]/g, '')}`} style={{ fontSize: '1rem', color: 'var(--urban-primary)', textDecoration: 'none', fontWeight: 600 }}>{agent.phone}</a>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--urban-font-mono)', fontSize: '0.65rem', color: 'var(--urban-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email</p>
                    <a href={`mailto:${agent.email}`} style={{ fontSize: '1rem', color: 'var(--urban-primary)', textDecoration: 'none', fontWeight: 600 }}>{agent.email}</a>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--urban-font-mono)', fontSize: '0.65rem', color: 'var(--urban-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Markets</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--urban-muted)' }}>Riverside · Avondale · San Marco · Downtown · Brooklyn</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--urban-font-mono)', fontSize: '0.65rem', color: 'var(--urban-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>License</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--urban-muted)' }}>{agent.license}</p>
                  </div>
                </div>

                <p className="urban-license-note" style={{ marginTop: '2rem' }}>
                  {agent.name} is a licensed real estate professional with River City Real Estate Group.{' '}
                  Equal Housing Opportunity.
                </p>
              </div>

              {/* Right: form */}
              <div>
                <div style={{ backgroundColor: 'var(--urban-surface)', border: '1px solid var(--urban-border)', borderRadius: 'var(--urban-radius)', padding: '2rem' }}>
                  <UrbanContactForm agent={agent} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </UrbanLayout>
    </>
  )
}
