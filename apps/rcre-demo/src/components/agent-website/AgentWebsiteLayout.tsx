'use client'
/**
 * Agent Website Layout
 *
 * Shared shell for all agent website pages.
 * Includes sticky header with RCRE branding, nav, and CTA,
 * plus footer with disclosures and EHO mark.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { useAgentTheme } from '@/components/agent-website/theme-context'
import type { AgentProfile } from '@/lib/agent-website/types'

export const SIGNATURE_NAV = ['Buy', 'Sell', 'Listings', 'About', 'Markets', 'Resources', 'Contact']

interface Props {
  agent: AgentProfile
  children: React.ReactNode
}

export function AgentWebsiteLayout({ agent, children }: Props) {
  const { cssVars } = useAgentTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div
      style={{
        fontFamily: cssVars['--font-body'] || 'DM Sans, system-ui, sans-serif',
        backgroundColor: cssVars['--color-bg'] || '#faf8f5',
        color: cssVars['--color-text'] || '#1a1a1a',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: cssVars['--color-surface'] || '#ffffff',
          borderBottom: `1px solid ${cssVars['--color-border'] || '#e5e0d8'}`,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '72px',
            gap: '2rem',
          }}
        >
          {/* RCRE Branding */}
          <Link
            href={`/agent/${agent.slug}`}
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}
            aria-label={`${agent.name} — RCRE home`}
          >
            <span
              style={{
                fontFamily: cssVars['--font-display'] || 'Georgia, serif',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: cssVars['--color-primary'] || '#1a2e4a',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              RCRE
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                color: cssVars['--color-text-muted'] || '#6b7280',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Powered by RCRE
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="Agent website navigation"
            style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}
            className="hidden-mobile"
          >
            {SIGNATURE_NAV.map((item) => (
              <Link
                key={item}
                href={`/agent/${agent.slug}/${item.toLowerCase()}`}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: cssVars['--color-text'] || '#1a1a1a',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                className="agent-nav-link"
              >
                {item}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              href={`/agent/${agent.slug}/contact`}
              style={{
                backgroundColor: cssVars['--color-cta'] || '#c9a84c',
                color: '#ffffff',
                padding: '0.5rem 1.25rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: `background-color 0.15s`,
                whiteSpace: 'nowrap',
              }}
              className="agent-cta-btn"
            >
              Get in Touch
            </Link>

            {/* Mobile hamburger */}
            <button
              aria-label="Toggle mobile menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                color: cssVars['--color-text'],
              }}
              className="mobile-menu-btn"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            style={{
              backgroundColor: cssVars['--color-surface'] || '#ffffff',
              borderTop: `1px solid ${cssVars['--color-border'] || '#e5e0d8'}`,
              padding: '1rem 1.5rem 1.5rem',
            }}
          >
            {SIGNATURE_NAV.map((item) => (
              <Link
                key={item}
                href={`/agent/${agent.slug}/${item.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.875rem 0',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: cssVars['--color-text'] || '#1a1a1a',
                  textDecoration: 'none',
                  borderBottom: `1px solid ${cssVars['--color-border'] || '#e5e0d8'}`,
                }}
              >
                {item}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Page content */}
      <main>{children}</main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: cssVars['--color-primary'] || '#1a2e4a',
          color: '#ffffff',
          padding: '3rem 1.5rem 2rem',
          marginTop: '4rem',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              marginBottom: '2rem',
            }}
          >
            {/* Brand */}
            <div>
              <p
                style={{
                  fontFamily: cssVars['--font-display'] || 'Georgia, serif',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  marginBottom: '0.5rem',
                }}
              >
                RCRE
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.6 }}>
                River City Real Estate Group
                <br />
                Alabama & Florida
              </p>
            </div>

            {/* Agent contact */}
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {agent.name}
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>{agent.title}</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                <a
                  href={`tel:${agent.phone.replace(/\D/g, '')}`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {agent.phone}
                </a>
                {' · '}
                <a
                  href={`mailto:${agent.email}`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {agent.email}
                </a>
              </p>
            </div>

            {/* Quick links */}
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Quick Links</p>
              <nav aria-label="Footer navigation">
                {SIGNATURE_NAV.map((item) => (
                  <a
                    key={item}
                    href={`/agent/${agent.slug}/${item.toLowerCase()}`}
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      opacity: 0.7,
                      marginBottom: '0.25rem',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    {item}
                  </a>
                ))}
              </nav>
            </div>

            {/* Financing */}
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Preferred Lender
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.6 }}>
                Financing questions? Contact Jeremy McDonald, RCRE&apos;s preferred lender partner.
              </p>
              <a
                href="tel:+19045320068"
                style={{ fontSize: '0.8rem', color: 'inherit', textDecoration: 'none', marginTop: '0.5rem', display: 'block' }}
              >
                (904) 532-0068
              </a>
            </div>
          </div>

          {/* Divider */}
          <hr style={{ borderColor: 'rgba(255,255,255,0.15)', marginBottom: '1.5rem' }} />

          {/* Disclosures */}
          <div style={{ fontSize: '0.72rem', opacity: 0.6, lineHeight: 1.6, marginBottom: '1rem' }}>
            <p>
              {agent.name}, {agent.title}, is a licensed real estate professional with River City Real Estate Group.{' '}
              {agent.license ? `License: ${agent.license}.` : ''} RCRE Group operates in Alabama and Florida. All
              transactions are subject to applicable state real estate licensing requirements.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              This website is for informational purposes and does not constitute legal, financial, or investment advice.
              Equal Housing Opportunity. Licensed in Alabama (#REB-XXXX) and Florida (#SLXXXXXXX).
            </p>
          </div>

          {/* EHO + Legal links */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              opacity: 0.6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {/* EHO Mark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
                  <rect x="0" y="0" width="20" height="14" rx="2" fill="white" />
                  <rect x="3" y="4" width="3" height="3" fill="#1a2e4a" />
                  <rect x="9" y="4" width="3" height="3" fill="#1a2e4a" />
                  <rect x="15" y="4" width="2" height="3" fill="#1a2e4a" />
                  <rect x="3" y="8" width="2" height="3" fill="#1a2e4a" />
                  <rect x="6" y="8" width="3" height="3" fill="#1a2e4a" />
                  <rect x="10" y="8" width="2" height="3" fill="#1a2e4a" />
                  <rect x="14" y="8" width="3" height="3" fill="#1a2e4a" />
                </svg>
                <span>Equal Housing Opportunity</span>
              </div>

              <span>© {new Date().getFullYear()} River City Real Estate Group</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link
                href="/privacy"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                Privacy Policy
              </Link>
              <Link
                href="/accessibility"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                Accessibility
              </Link>
              <Link
                href="/terms-and-conditions"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
