'use client'
/**
 * Agent Contact Page (Client)
 *
 * Contact form + office info + map placeholder.
 * LeadForm handles submission via captureLead().
 */

import type { AgentProfile, AgentWebsiteConfig } from '@/lib/agent-website/types'
import { AgentWebsiteLayout } from '@/components/agent-website/AgentWebsiteLayout'
import { LeadForm } from '@/components/agent-website/LeadForm'
import '@/components/agent-website/agent-website.css'

interface Props {
  agent: AgentProfile
  config: AgentWebsiteConfig
}

export default function AgentContactClient({ agent }: Props) {
  return (
    <AgentWebsiteLayout agent={agent}>
      {/* Page Hero */}
      <section className="agent-page-hero">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p className="agent-hero-kicker">Contact</p>
          <h1>Get in Touch</h1>
          <p>
            Questions about buying, selling, or the market? Share a few details and {agent.name.split(' ')[0]} will follow up.
          </p>
        </div>
      </section>

      {/* Contact layout */}
      <section
        className="agent-section"
        style={{ backgroundColor: 'var(--color-bg, #faf8f5)' }}
      >
        <div className="agent-wrap">
          <div className="agent-contact-layout">
            {/* Left: form */}
            <div>
              <LeadForm
                agentSlug={agent.slug}
                type="general"
                title={`Message ${agent.name.split(' ')[0]}`}
                subtitle="Share your timeline and what you're looking for. Use synthetic contact details in this review environment."
                showTypeSelect
              />
            </div>

            {/* Right: info sidebar */}
            <aside>
              {/* Direct contact */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface, #ffffff)',
                  border: '1px solid var(--color-border, #e5e0d8)',
                  borderRadius: '4px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted, #6b7280)', marginBottom: '1rem' }}>
                  Direct Contact
                </h2>
                <dl style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
                  {[
                    ['Phone', agent.phone, 'tel'],
                    ['Email', agent.email, 'mailto'],
                  ].map(([label, value, scheme]) => (
                    <div key={label as string}>
                      <dt style={{ fontWeight: 600, color: 'var(--color-text-muted, #6b7280)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.125rem' }}>
                        {label as string}
                      </dt>
                      <dd>
                        <a
                          href={`${scheme as string}:${value as string}`}
                          style={{ color: 'var(--color-primary, #1a2e4a)', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {value as string}
                        </a>
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt style={{ fontWeight: 600, color: 'var(--color-text-muted, #6b7280)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.125rem' }}>
                      Market
                    </dt>
                    <dd style={{ color: 'var(--color-text, #1a1a1a)' }}>{agent.market}</dd>
                  </div>
                </dl>
              </div>

              {/* Office hours */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface, #ffffff)',
                  border: '1px solid var(--color-border, #e5e0d8)',
                  borderRadius: '4px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted, #6b7280)', marginBottom: '1rem' }}>
                  Office Hours
                </h2>
                <dl style={{ display: 'grid', gap: '0.4rem', fontSize: '0.875rem' }}>
                  {[
                    ['Monday – Friday', '8:30 AM – 6:00 PM'],
                    ['Saturday', '9:00 AM – 4:00 PM'],
                    ['Sunday', 'By appointment'],
                  ].map(([day, hours]) => (
                    <div key={day} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt style={{ color: 'var(--color-text-muted, #6b7280)' }}>{day}</dt>
                      <dd style={{ fontWeight: 500, color: 'var(--color-text, #1a1a1a)' }}>{hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Map placeholder */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="agent-map-placeholder">
                  <div style={{ textAlign: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Map view</span>
                  </div>
                </div>
              </div>

              {/* Preferred lender */}
              <div className="agent-lender-card">
                <div>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-primary, #1a2e4a)', fontSize: '0.875rem' }}>
                    Need financing?
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: '0.75rem' }}>
                    Contact Jeremy McDonald, RCRE preferred lender. You may choose any lender.
                  </p>
                  <a
                    href="tel:+19045320068"
                    style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent, #c9a84c)', textDecoration: 'none' }}
                  >
                    (904) 532-0068
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </AgentWebsiteLayout>
  )
}
