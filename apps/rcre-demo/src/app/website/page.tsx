/**
 * Website Management Landing
 * Route: /website
 *
 * Agent-facing portal for managing their personal agent website.
 * Shows status, completeness score, and navigation to gallery + settings.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@/lib/session'
import { actorOrNull } from '@/lib/platform/auth'
import { AppShell } from '@/components/AppShell'
import { THEME_CATALOG, type AgentWebsiteTheme } from '@/lib/agent-website/types'
import { getWebsiteState, getAgentProfile } from '@/lib/agent-website/agent-service'
import { completenessScore } from '@/lib/agent-website/seo'
import { getWebsiteConfig } from '@/lib/agent-website/agent-service'
import './website.css'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default async function WebsitePortalPage() {
  const actor = await actorOrNull()
  const user = await currentUser()
  if (!actor || !user) redirect('/login')

  // Get current agent's website state
  const state = getWebsiteState(user.id)
  const profile = getAgentProfile(user.id)
  const config = state?.config

  const score = state?.config ? completenessScore(profile!, config!).score : 0
  const issues = state?.completenessIssues ?? []
  const publishState = state?.publishState ?? 'draft'
  const currentTheme = config?.theme ?? 'rcre-signature'
  const themeMeta = THEME_CATALOG[currentTheme as AgentWebsiteTheme]

  return (
    <AppShell user={user}>
      <div className="wp-root">
        {/* Header */}
        <div className="wp-header">
          <div className="wp-header-inner">
            <div>
              <p className="wp-eyebrow">Website Management</p>
              <h1 className="wp-title">My Agent Website</h1>
            </div>
            <div className="wp-header-actions">
              <Link href={`/agent/${user.id}`} target="_blank" className="wp-btn-outline">
                Preview Site
              </Link>
            </div>
          </div>
        </div>

        <div className="wp-content">
          {/* Status card */}
          <section className="wp-card wp-status-card">
            <div className="wp-status-header">
              <div>
                <h2 className="wp-card-title">{profile?.name ?? user.name}</h2>
                <p className="wp-card-subtitle">{profile?.title ?? user.title} · {profile?.market ?? user.market}</p>
              </div>
              <div className={`wp-publish-badge wp-publish-${publishState}`}>
                {publishState === 'published' ? 'Published' : publishState === 'draft' ? 'Draft' : publishState}
              </div>
            </div>

            {/* Completeness score */}
            <div className="wp-score-section">
              <div className="wp-score-header">
                <span className="wp-score-label">Profile completeness</span>
                <span className="wp-score-value">{score}%</span>
              </div>
              <div className="wp-score-bar">
                <div
                  className="wp-score-fill"
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="wp-score-hint">
                {score === 100
                  ? 'Your profile is complete.'
                  : `${issues.length} item${issues.length === 1 ? '' : 's'} to complete before publishing.`}
              </p>
            </div>

            {/* Action buttons */}
            <div className="wp-actions">
              <Link href={`/website/gallery`} className="wp-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                Template Gallery
              </Link>
              <Link href={`/website/settings`} className="wp-btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                Edit Website Settings
              </Link>
              <Link href={`/agent/${user.id}`} target="_blank" className="wp-btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Preview Website
              </Link>
              <button className="wp-btn-disabled" disabled title="Coming soon — configure your domain first">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                Publish (Coming Soon)
              </button>
            </div>
          </section>

          <div className="wp-grid">
            {/* Theme card */}
            <section className="wp-card">
              <h3 className="wp-card-title-sm">Current Template</h3>
              <div className="wp-theme-preview" style={{ background: themeMeta?.cssVars['--color-bg'], color: themeMeta?.cssVars['--color-text'] }}>
                <div className="wp-theme-preview-header" style={{ background: themeMeta?.cssVars['--color-surface'], borderBottom: `1px solid ${themeMeta?.cssVars['--color-border']}` }}>
                  <span style={{ background: themeMeta?.cssVars['--color-accent'], width: '32px', height: '8px', borderRadius: '4px', display: 'block' }} />
                  <span style={{ background: themeMeta?.cssVars['--color-border'], width: '60px', height: '4px', borderRadius: '2px', display: 'block' }} />
                </div>
                <div style={{ padding: '12px', flex: 1 }}>
                  <div style={{ background: themeMeta?.cssVars['--color-surface'], height: '40px', borderRadius: themeMeta?.cssVars['--radius-card'], marginBottom: '8px' }} />
                  <div style={{ background: themeMeta?.cssVars['--color-surface'], height: '24px', borderRadius: themeMeta?.cssVars['--radius-card'], width: '70%', marginBottom: '4px' }} />
                  <div style={{ background: themeMeta?.cssVars['--color-surface'], height: '16px', borderRadius: themeMeta?.cssVars['--radius-card'], width: '50%', marginBottom: '12px' }} />
                  <div style={{ background: themeMeta?.cssVars['--color-accent'], opacity: 0.2, height: '28px', borderRadius: themeMeta?.cssVars['--radius-card'] }} />
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.75rem' }}>
                {themeMeta?.name ?? 'RCRE Signature'}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                {themeMeta?.tagline}
              </p>
              <Link href={`/website/gallery`} className="wp-change-link">
                Change template →
              </Link>
            </section>

            {/* Completeness checklist */}
            <section className="wp-card">
              <h3 className="wp-card-title-sm">Profile Checklist</h3>
              <ul className="wp-checklist">
                {[
                  { label: 'Profile photo', done: !!profile?.headshot },
                  { label: 'Name', done: !!profile?.name },
                  { label: 'Bio (100+ characters)', done: !!(profile?.bio && profile.bio.length >= 100) },
                  { label: 'Phone number', done: !!profile?.phone },
                  { label: 'Email address', done: !!profile?.email },
                  { label: 'Tagline', done: !!config?.tagline },
                  { label: 'Hero image', done: !!config?.heroImage },
                  { label: 'At least one market', done: !!(config?.markets?.length) },
                  { label: 'SEO description', done: !!config?.seoDescription },
                  { label: 'SEO title', done: !!config?.seoTitle },
                ].map((item) => (
                  <li key={item.label} className={`wp-checklist-item ${item.done ? 'wp-done' : 'wp-missing'}`}>
                    {item.done ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-label="Complete">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-label="Incomplete">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                    {item.label}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* SEO status */}
          <section className="wp-card">
            <h3 className="wp-card-title-sm">SEO Status</h3>
            <div className="wp-seo-grid">
              <div>
                <p className="wp-seo-label">SEO Title</p>
                <p className="wp-seo-value">
                  {config?.seoTitle
                    ? config.seoTitle
                    : <span className="wp-seo-missing">Not set — using default</span>}
                </p>
              </div>
              <div>
                <p className="wp-seo-label">SEO Description</p>
                <p className="wp-seo-value">
                  {config?.seoDescription
                    ? config.seoDescription.slice(0, 120) + (config.seoDescription.length > 120 ? '…' : '')
                    : <span className="wp-seo-missing">Not set — using default</span>}
                </p>
              </div>
              <div>
                <p className="wp-seo-label">Canonical URL</p>
                <p className="wp-seo-value" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8rem' }}>
                  {profile?.slug ? `/agent/${profile.slug}` : '—'}
                </p>
              </div>
            </div>
            <Link href={`/website/settings`} className="wp-change-link">
              Edit SEO settings →
            </Link>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
