'use client'
/**
 * LuxuryLayout — Shared shell for RCRE Luxury theme pages.
 *
 * Sticky header with RCRE branding + brass nav + oxblood CTA,
 * footer with disclosures and EHO mark.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import type { AgentProfile } from '@/lib/agent-website/types'

const LUXURY_NAV = [
  { label: 'Buy', href: 'buy' },
  { label: 'Listings', href: 'listings' },
  { label: 'Markets', href: 'markets' },
  { label: 'About', href: 'about' },
  { label: 'Contact', href: 'contact' },
]

interface Props {
  agent: AgentProfile
  children: React.ReactNode
}

export function LuxuryLayout({ agent, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="lux-root">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="lux-header">
        <div className="lux-header-inner">
          <Link href={`/agent/jacksonville-luxury`} className="lux-brand" aria-label="RCRE Luxury home">
            <span className="lux-brand-name">RCRE</span>
            <span className="lux-brand-sub">Luxury Division</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Luxury agent navigation" className="lux-nav hidden-nav">
            {LUXURY_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/jacksonville-luxury/${item.href}`}
                className="lux-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href={`/agent/jacksonville-luxury/contact`} className="lux-cta-btn">
              Schedule a Private Showing
            </Link>
            <button
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--lux-text)',
              }}
              className="mobile-toggle"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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

        {/* Mobile drawer */}
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            style={{
              backgroundColor: 'var(--lux-surface)',
              borderTop: '1px solid var(--lux-border)',
              padding: '1rem 2rem 1.5rem',
            }}
          >
            {LUXURY_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/jacksonville-luxury/${item.href}`}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.875rem 0',
                  fontSize: '1rem',
                  color: 'var(--lux-text)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--lux-border)',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="lux-footer">
        <div className="lux-footer-inner">
          <p className="lux-footer-brand">RCRE</p>
          <p style={{ fontSize: '0.8rem', color: 'rgba(250,247,240,0.5)', lineHeight: 1.6 }}>
            River City Real Estate Group · Luxury Division<br />
            {agent.name} · {agent.title} · {agent.market}
          </p>

          <hr className="lux-footer-divider" />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '2rem',
              marginBottom: '2rem',
            }}
          >
            {/* Direct contact */}
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.75rem', color: '#faf7f0' }}>Contact</p>
              <p style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>{agent.phone}</p>
              <p style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>{agent.email}</p>
              <p style={{ fontSize: '0.78rem' }}>By appointment</p>
            </div>

            {/* Quick links */}
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.75rem', color: '#faf7f0' }}>Navigate</p>
              {LUXURY_NAV.map((item) => (
                <a
                  key={item.label}
                  href={`/agent/jacksonville-luxury/${item.href}`}
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    marginBottom: '0.375rem',
                    color: 'rgba(250,247,240,0.6)',
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Preferred lender */}
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.75rem', color: '#faf7f0' }}>Preferred Lender</p>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'rgba(250,247,240,0.6)' }}>
                Jeremy McDonald<br />
                RCRE Financial Services
              </p>
              <a href="tel:+19045320068" style={{ fontSize: '0.78rem', color: 'rgba(250,247,240,0.6)', textDecoration: 'none' }}>
                (904) 532-0068
              </a>
            </div>
          </div>

          <hr className="lux-footer-divider" />

          <div className="lux-footer-disclosure">
            <p>
              {agent.name}, {agent.title}, is a licensed real estate professional with River City Real Estate Group.
              {agent.license ? ` License: ${agent.license}.` : ''} RCRE Group operates in Alabama and Florida.
              This website is for informational purposes and does not constitute legal, financial, or investment advice.
              Equal Housing Opportunity. Licensed in Alabama (#REB-XXXX) and Florida (#SLXXXXXXX).
            </p>
          </div>

          <div className="lux-footer-bottom">
            <div className="lux-eho">
              <svg width="18" height="13" viewBox="0 0 20 14" fill="none" aria-hidden="true">
                <rect x="0" y="0" width="20" height="14" rx="2" fill="white" />
                <rect x="3" y="4" width="3" height="3" fill="#1c1c1c" />
                <rect x="9" y="4" width="3" height="3" fill="#1c1c1c" />
                <rect x="15" y="4" width="2" height="3" fill="#1c1c1c" />
                <rect x="3" y="8" width="2" height="3" fill="#1c1c1c" />
                <rect x="6" y="8" width="3" height="3" fill="#1c1c1c" />
                <rect x="10" y="8" width="2" height="3" fill="#1c1c1c" />
                <rect x="14" y="8" width="3" height="3" fill="#1c1c1c" />
              </svg>
              <span>Equal Housing Opportunity</span>
            </div>
            <span>© {new Date().getFullYear()} River City Real Estate Group</span>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hidden-nav { display: none !important; }
          .mobile-toggle { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </div>
  )
}
