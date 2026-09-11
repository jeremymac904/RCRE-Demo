/**
 * Template Gallery
 * Route: /website/gallery
 *
 * Shows all 8 themes with visual preview cards.
 * Each card links to /agent/preview/[theme] for a full preview.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@/lib/session'
import { actorOrNull } from '@/lib/platform/auth'
import { AppShell } from '@/components/AppShell'
import { listThemes } from '@/lib/agent-website/agent-service'
import { THEME_CATALOG, type AgentWebsiteTheme } from '@/lib/agent-website/types'
import '../website.css'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

const ALL_THEMES = listThemes()

export default async function TemplateGalleryPage() {
  const actor = await actorOrNull()
  const user = await currentUser()
  if (!actor || !user) redirect('/login')

  return (
    <AppShell user={user}>
      <div className="wp-root">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.25rem' }}>
            Website Management
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Template Gallery
            </h1>
            <Link href="/website" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', textDecoration: 'none', flexShrink: 0 }}>
              ← Back to My Website
            </Link>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-muted)', lineHeight: 1.65, maxWidth: '560px' }}>
            Choose a template for your agent website. Click &quot;Preview&quot; to see the full theme with
            a demo profile. Select a template to apply it to your website.
          </p>
        </div>

        {/* Theme grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {ALL_THEMES.map((theme) => (
            <article key={theme.id} className="wp-card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Visual preview */}
              <ThemePreview themeId={theme.id} />

              {/* Meta */}
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                    {theme.name}
                  </h2>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontStyle: 'italic', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  {theme.tagline}
                </p>

                {/* Best for */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.375rem' }}>
                    Best for
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {theme.bestFor.slice(0, 3).map((b) => (
                      <span key={b} style={{ fontSize: '0.7rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0.125rem 0.5rem', color: 'var(--color-text)' }}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Markets */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.375rem' }}>
                    Markets
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
                    {theme.recommendedMarkets.slice(0, 3).join(' · ')}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href={`/agent/preview/${theme.id}`}
                    target="_blank"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', background: 'var(--color-surface)', color: 'var(--color-text)', padding: '0.5rem 0.875rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', borderRadius: '6px', border: '1px solid var(--color-border)', transition: 'border-color 0.15s' }}
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/website/settings?theme=${theme.id}`}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', background: 'var(--color-primary)', color: '#ffffff', padding: '0.5rem 0.875rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', borderRadius: '6px', transition: 'opacity 0.15s' }}
                  >
                    Select Template
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

// Client component for interactive preview card
function ThemePreview({ themeId }: { themeId: AgentWebsiteTheme }) {
  const meta = THEME_CATALOG[themeId]
  const css = meta.cssVars

  return (
    <div
      style={{
        background: css['--color-bg'],
        color: css['--color-text'],
        fontFamily: css['--font-body'],
        borderRadius: '8px 8px 0 0',
        height: '180px',
        overflow: 'hidden',
        position: 'relative',
        borderBottom: `1px solid ${css['--color-border']}`,
      }}
    >
      {/* Fake browser chrome */}
      <div style={{ background: css['--color-surface'], padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1px solid ${css['--color-border']}` }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: css['--color-border'], display: 'block' }} />
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: css['--color-border'], display: 'block' }} />
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: css['--color-border'], display: 'block' }} />
        <span style={{ flex: 1, height: '16px', background: css['--color-bg'], borderRadius: '3px', marginLeft: '8px', maxWidth: '120px' }} />
      </div>

      {/* Theme content simulation */}
      <div style={{ padding: '12px 16px', height: 'calc(100% - 36px)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Hero bar */}
        <div style={{ background: css['--color-primary'], height: '48px', borderRadius: css['--radius-card'], opacity: 0.85 }} />
        {/* CTA */}
        <div style={{ background: css['--color-cta'], height: '24px', borderRadius: css['--radius-card'], width: '40%' }} />
        {/* Cards */}
        <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1, background: css['--color-surface'], borderRadius: css['--radius-card'], border: `1px solid ${css['--color-border']}` }} />
          ))}
        </div>
      </div>

      {/* Theme label */}
      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: css['--color-accent'], color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.04em' }}>
        {meta.name}
      </div>
    </div>
  )
}
