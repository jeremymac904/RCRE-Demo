'use client'
/**
 * InvestorLayout — Shared shell for RCRE Investor theme pages.
 *
 * Sticky dark-green header, green-accented nav, signal-green CTA,
 * footer with disclosures and investment disclaimer.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import type { AgentProfile } from '@/lib/agent-website/types'

const INVESTOR_NAV = [
  { label: 'Find Deals', href: 'listings' },
  { label: 'Markets', href: 'markets' },
  { label: 'Resources', href: 'resources' },
  { label: 'About', href: 'about' },
  { label: 'Contact', href: 'contact' },
]

interface Props {
  agent: AgentProfile
  children: React.ReactNode
}

export function InvestorLayout({ agent, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="inv-root">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="inv-header">
        <div className="inv-header-inner">
          <Link href={`/agent/investor`} className="inv-brand" aria-label="RCRE Investor home">
            <span className="inv-brand-name">RCRE</span>
            <span className="inv-brand-sub">Investment Division</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Investor agent navigation" className="inv-nav">
            {INVESTOR_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/investor/${item.href}`}
                className="inv-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href={`/agent/investor/contact`} className="inv-cta-btn">
              Run the Numbers
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
              backgroundColor: 'var(--inv-primary)',
              borderTop: '1px solid rgba(34, 197, 94, 0.15)',
              padding: '1rem 2rem',
            }}
          >
            {INVESTOR_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/investor/${item.href}`}
                className="inv-nav-link"
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
      <footer className="inv-footer">
        <div className="inv-footer-inner">
          <div className="inv-footer-brand">
            <span className="inv-footer-brand-name">RCRE</span>
            <span className="inv-footer-brand-sub">Investment Division · River City Real Estate Group</span>
          </div>

          <div>
            <p className="inv-footer-disclaimer">
              {agent.name} is a licensed real estate professional with River City Real Estate Group.
              {agent.license ? ` License: ${agent.license}.` : ''} All market data sourced from publicly
              available MLS records, county assessor data, or noted third-party sources. Cap rates, cash-on-cash
              returns, and IRR projections are estimates only — actual results will vary. Past performance is not
              indicative of future results. Nothing on this site constitutes investment advice.{' '}
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>
                Source: FRED HPI, CoStar, Zillow Research — data as of available reporting period.
              </span>
            </p>
            <p className="inv-footer-eho" style={{ marginTop: '0.75rem' }}>
              Equal Housing Opportunity · EHO
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
