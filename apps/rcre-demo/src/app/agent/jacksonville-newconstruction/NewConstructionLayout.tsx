'use client'
/**
 * NewConstructionLayout — Shared shell for RCRE New Construction theme pages.
 *
 * Clean header with RCRE branding + blue nav + blue CTA,
 * footer with disclosures and EHO mark.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import type { AgentProfile } from '@/lib/agent-website/types'

const NC_NAV = [
  { label: 'Find a Home', href: 'buy' },
  { label: 'Communities', href: 'listings' },
  { label: 'How I Help', href: '#how-i-help' },
  { label: 'About', href: 'about' },
  { label: 'Contact', href: 'contact' },
]

interface Props {
  agent: AgentProfile
  children: React.ReactNode
}

export function NewConstructionLayout({ agent, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="nc-root">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="nc-header">
        <div className="nc-header-inner">
          <Link href={`/agent/jacksonville-newconstruction`} className="nc-brand" aria-label="RCRE New Construction home">
            <span className="nc-brand-name">RCRE</span>
            <span className="nc-brand-sub">New Construction Division</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="New Construction navigation" className="nc-nav">
            {NC_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/jacksonville-newconstruction/${item.href}`}
                className="nc-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href={`/agent/jacksonville-newconstruction/contact`} className="nc-cta-btn">
              Explore New Homes
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
                color: 'var(--nc-text)',
              }}
              className="mobile-toggle-nc"
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
              backgroundColor: 'var(--nc-bg)',
              borderTop: '1px solid var(--nc-border)',
              padding: '1rem 2rem 1.5rem',
            }}
          >
            {NC_NAV.map((item) => (
              <Link
                key={item.label}
                href={`/agent/jacksonville-newconstruction/${item.href}`}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.875rem 0',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: 'var(--nc-text)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--nc-border)',
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
      <footer className="nc-footer">
        <div className="nc-footer-inner">
          <p className="nc-footer-brand">RCRE New Construction</p>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            River City Real Estate Group · New Construction Division<br />
            {agent.name} · {agent.title} · {agent.market}
          </p>

          <hr className="nc-footer-divider" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Contact */}
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Contact</p>
              <p style={{ fontSize: '0.78rem', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.45)' }}>{agent.phone}</p>
              <p style={{ fontSize: '0.78rem', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.45)' }}>{agent.email}</p>
            </div>
            {/* Navigate */}
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Navigate</p>
              {NC_NAV.map((item) => (
                <a
                  key={item.label}
                  href={`/agent/jacksonville-newconstruction/${item.href}`}
                  style={{ display: 'block', fontSize: '0.78rem', marginBottom: '0.375rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
                >
                  {item.label}
                </a>
              ))}
            </div>
            {/* Preferred lender */}
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Preferred Lender</p>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.45)' }}>
                Jeremy McDonald<br />RCRE Financial Services
              </p>
              <a href="tel:+19045320068" style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
                (904) 532-0068
              </a>
            </div>
          </div>

          <hr className="nc-footer-divider" />

          <div className="nc-footer-disclosure">
            <p>
              {agent.name}, {agent.title}, is a licensed real estate professional with River City Real Estate Group.
              {agent.license ? ` License: ${agent.license}.` : ''} RCRE Group operates in Alabama and Florida.
              This website is for informational purposes and does not constitute legal, financial, or investment advice.
              New construction specifications, pricing, and availability are subject to change by the builder —
              verify all details independently. Equal Housing Opportunity.
              Licensed in Alabama (#REB-XXXX) and Florida (#SLXXXXXXX).
            </p>
          </div>

          <div className="nc-footer-bottom">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="13" viewBox="0 0 20 14" fill="none" aria-hidden="true">
                <rect x="0" y="0" width="20" height="14" rx="2" fill="rgba(255,255,255,0.15)" />
                <rect x="3" y="4" width="3" height="3" fill="rgba(255,255,255,0.6)" />
                <rect x="9" y="4" width="3" height="3" fill="rgba(255,255,255,0.6)" />
                <rect x="15" y="4" width="2" height="3" fill="rgba(255,255,255,0.6)" />
                <rect x="3" y="8" width="2" height="3" fill="rgba(255,255,255,0.6)" />
                <rect x="6" y="8" width="3" height="3" fill="rgba(255,255,255,0.6)" />
                <rect x="10" y="8" width="2" height="3" fill="rgba(255,255,255,0.6)" />
                <rect x="14" y="8" width="3" height="3" fill="rgba(255,255,255,0.6)" />
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
          .nc-nav { display: none !important; }
          .mobile-toggle-nc { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-toggle-nc { display: none !important; }
        }
      `}</style>
    </div>
  )
}
