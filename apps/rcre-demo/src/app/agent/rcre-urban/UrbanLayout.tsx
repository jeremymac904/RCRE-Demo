'use client'
/**
 * UrbanLayout — Shared shell for RCRE Urban Modern theme pages.
 *
 * Sticky charcoal header, transit-blue nav, neon-amber CTA,
 * footer with disclosures and EHO mark.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import type { AgentProfile } from '@/lib/agent-website/types'

const URBAN_NAV = [
  { label: 'Find a Home', href: 'buy' },
  { label: 'Listings', href: 'listings' },
  { label: 'Neighborhoods', href: 'markets' },
  { label: 'About', href: 'about' },
  { label: 'Contact', href: 'contact' },
]

interface Props {
  agent: AgentProfile
  children: React.ReactNode
}

export function UrbanLayout({ agent, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="urban-root">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="urban-header">
        <div className="urban-header-inner">
          <Link href={`/agent/${agent.slug}`} className="urban-brand" aria-label="RCRE Urban home">
            <span className="urban-brand-name">RCRE</span>
            <span className="urban-brand-sub">Urban Modern Division</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Urban agent navigation" className="urban-nav">
            {URBAN_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/${agent.slug}/${item.href}`}
                className="urban-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href={`/agent/${agent.slug}/contact`} className="urban-cta-btn">
              Schedule a Tour
            </Link>
            <button
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'none',
                color: '#ffffff',
              }}
              className="mobile-menu-btn"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div
            style={{
              backgroundColor: 'var(--urban-primary)',
              borderTop: '1px solid rgba(154,154,154,0.15)',
              padding: '1rem 2rem',
            }}
          >
            {URBAN_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/${agent.slug}/${item.href}`}
                className="urban-nav-link"
                style={{ display: 'block', padding: '0.6rem 0' }}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="urban-footer">
        <div className="urban-footer-inner">
          <div className="urban-footer-brand">
            <span className="urban-footer-brand-name">RCRE</span>
            <span className="urban-footer-brand-sub">Urban Modern Division · River City Real Estate Group</span>
          </div>

          <div>
            <p className="urban-footer-disclaimer">
              {agent.name} is a licensed real estate professional with River City Real Estate Group.
              {agent.license ? ` License: ${agent.license}.` : ''} All data sourced from publicly available
              MLS or county records. Walkability claims reflect third-party data sources and may vary.
              Equal Housing Opportunity.{' '}
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>
                Source: Walk Score®, GreatSchools.org — data as of available reporting period.
              </span>
            </p>
            <p className="urban-footer-eho" style={{ marginTop: '0.75rem' }}>
              Equal Housing Opportunity · EHO
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
