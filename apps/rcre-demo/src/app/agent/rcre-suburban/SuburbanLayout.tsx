'use client'
/**
 * SuburbanLayout — Shared shell for RCRE Suburban Family theme pages.
 *
 * Sticky white header, deep-green nav, terracotta CTA,
 * footer with disclosures and EHO mark.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import type { AgentProfile } from '@/lib/agent-website/types'

const SUBURBAN_NAV = [
  { label: 'Find a Home', href: 'buy' },
  { label: 'Listings', href: 'listings' },
  { label: 'Schools & Areas', href: 'markets' },
  { label: 'About', href: 'about' },
  { label: 'Contact', href: 'contact' },
]

interface Props {
  agent: AgentProfile
  children: React.ReactNode
}

export function SuburbanLayout({ agent, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="sub-root">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sub-header">
        <div className="sub-header-inner">
          <Link href={`/agent/family`} className="sub-brand" aria-label="RCRE Suburban home">
            <span className="sub-brand-name">RCRE</span>
            <span className="sub-brand-sub">Suburban Family Division</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Suburban agent navigation" className="sub-nav">
            {SUBURBAN_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/family/${item.href}`}
                className="sub-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href={`/agent/family/contact`} className="sub-cta-btn">
              Start Your Search
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
                color: 'var(--sub-primary)',
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
              backgroundColor: 'var(--sub-surface)',
              borderTop: '1px solid var(--sub-border)',
              padding: '1rem 2rem',
            }}
          >
            {SUBURBAN_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/family/${item.href}`}
                className="sub-nav-link"
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
      <footer className="sub-footer">
        <div className="sub-footer-inner">
          <div className="sub-footer-brand">
            <span className="sub-footer-brand-name">RCRE</span>
            <span className="sub-footer-brand-sub">Suburban Family Division · River City Real Estate Group</span>
          </div>

          <div>
            <p className="sub-footer-disclaimer">
              {agent.name} is a licensed real estate professional with River City Real Estate Group.
              {agent.license ? ` License: ${agent.license}.` : ''} School ratings referenced on this site are
              sourced from GreatSchools.org or the respective school district and are provided for
              informational purposes only — they are not endorsed by the agent or RCRE and may change.
              Equal Housing Opportunity.
            </p>
            <p className="sub-footer-eho" style={{ marginTop: '0.75rem' }}>
              Equal Housing Opportunity · EHO
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
