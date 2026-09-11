'use client'
/**
 * Website Settings
 * Route: /website/settings
 *
 * Agent-facing website configuration form.
 * No actual persistence — console.log + mock save feedback.
 * Tabs: Profile | Template | Markets | SEO | Domain
 */

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { THEME_CATALOG, type AgentWebsiteTheme } from '@/lib/agent-website/types'
import '../website.css'

const TABS = ['Profile', 'Template', 'Markets', 'SEO', 'Domain'] as const
type Tab = typeof TABS[number]

const MARKETS_OPTIONS = [
  'Jacksonville', 'Northeast Florida', 'Ponte Vedra', 'Nocatee', 'St. Johns County',
  'Birmingham', 'Central Alabama', 'Alabama Gulf Coast', 'Mountain Brook', 'Highland Park',
  'Wiregrass Alabama', 'Black Belt', 'Lake Martin', 'Tuscaloosa County',
  'Jacksonville Urban Core', 'Birmingham Historic Districts',
]

const SPECIALTIES_OPTIONS = [
  'Residential', 'First-Time Buyers', 'Luxury', 'Waterfront', 'Historic Homes',
  'New Construction', 'Land', 'Acreage', 'Investment', 'Commercial',
  'Relocation', 'Military Moves', 'Buyer Representation', 'Seller Representation',
]

interface SettingsValues {
  name: string
  title: string
  tagline: string
  bio: string
  phone: string
  email: string
  markets: string[]
  specialties: string[]
  theme: AgentWebsiteTheme
  seoTitle: string
  seoDescription: string
  heroImage: string
  customDomain: string
  linkedin: string
  instagram: string
  facebook: string
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile')
  const [saved, setSaved] = useState(false)
  const [values, setValues] = useState<SettingsValues>({
    name: 'Marcus Webb',
    title: 'New Construction REALTOR®',
    tagline: 'New construction, without the surprises.',
    bio: 'Marcus Webb has closed over forty new construction transactions in the Jacksonville market.',
    phone: '(904) 555-0287',
    email: 'marcus.webb@rcregroup.com',
    markets: ['Nocatee', 'Silverleaf', 'Durbin Creek', 'Jacksonville New Development', 'St. Johns County'],
    specialties: ['New Construction', 'Builder Representation', 'Pre-Construction', 'Design Center', 'Warranty Review'],
    theme: 'rcre-new-construction',
    seoTitle: 'Marcus Webb | RCRE New Construction, Northeast Florida',
    seoDescription: 'Marcus Webb — New Construction REALTOR® with RCRE Group, specializing in builder representation in Nocatee, Silverleaf, and Durbin Creek.',
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80',
    customDomain: '',
    linkedin: 'https://linkedin.com/in/marcus-webb-rcre',
    instagram: '',
    facebook: '',
  })

  function handleSave(e: FormEvent) {
    e.preventDefault()
    // In production: PATCH /api/agent/website/settings
    console.log('Settings saved:', values)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function toggleMarket(m: string) {
    setValues((v) => ({
      ...v,
      markets: v.markets.includes(m) ? v.markets.filter((x) => x !== m) : [...v.markets, m],
    }))
  }

  function toggleSpecialty(s: string) {
    setValues((v) => ({
      ...v,
      specialties: v.specialties.includes(s) ? v.specialties.filter((x) => x !== s) : [...v.specialties, s],
    }))
  }

  return (
    <div className="wp-root">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.25rem' }}>
          Website Management
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Website Settings
          </h1>
          <Link href="/website" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', textDecoration: 'none' }}>
            ← Back to My Website
          </Link>
        </div>
      </div>

      {/* Toast */}
      {saved && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#065f46', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Settings saved successfully.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-muted)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* ── Profile Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'Profile' && (
          <div className="wp-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '1.5rem' }}>
              Profile Information
            </h2>

            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Full name</label>
                  <input
                    type="text"
                    value={values.name}
                    onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                    className="wp-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Title / Headline</label>
                  <input
                    type="text"
                    value={values.title}
                    onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                    className="wp-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Tagline</label>
                <input
                  type="text"
                  value={values.tagline}
                  onChange={(e) => setValues((v) => ({ ...v, tagline: e.target.value }))}
                  className="wp-input"
                  maxLength={100}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Bio</label>
                <textarea
                  value={values.bio}
                  onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
                  className="wp-textarea"
                  rows={5}
                  maxLength={1500}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                  {values.bio.length}/1500 characters
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Phone</label>
                  <input type="tel" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} className="wp-input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Email</label>
                  <input type="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} className="wp-input" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.625rem', color: 'var(--color-text)' }}>Specialties</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {SPECIALTIES_OPTIONS.map((s) => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', padding: '0.375rem 0.75rem', background: values.specialties.includes(s) ? 'var(--color-primary)' : 'var(--color-surface)', color: values.specialties.includes(s) ? '#fff' : 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={values.specialties.includes(s)} onChange={() => toggleSpecialty(s)} style={{ display: 'none' }} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.625rem', color: 'var(--color-text)' }}>Social Links</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>LinkedIn</p>
                    <input type="url" value={values.linkedin} onChange={(e) => setValues((v) => ({ ...v, linkedin: e.target.value }))} className="wp-input" placeholder="linkedin.com/in/…" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Instagram</p>
                    <input type="url" value={values.instagram} onChange={(e) => setValues((v) => ({ ...v, instagram: e.target.value }))} className="wp-input" placeholder="@username" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Facebook</p>
                    <input type="url" value={values.facebook} onChange={(e) => setValues((v) => ({ ...v, facebook: e.target.value }))} className="wp-input" placeholder="facebook.com/…" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Template Tab ────────────────────────────────────────────────── */}
        {activeTab === 'Template' && (
          <div className="wp-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Choose Your Template
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
              Select a theme to preview your website. Your current selection is highlighted.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {Object.values(THEME_CATALOG).map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, theme: theme.id }))}
                  style={{
                    border: `2px solid ${values.theme === theme.id ? theme.cssVars['--color-accent'] : 'var(--color-border)'}`,
                    borderRadius: '8px',
                    padding: '0',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Mini preview */}
                  <div style={{ background: theme.cssVars['--color-bg'], height: '100px', position: 'relative', borderBottom: `1px solid ${theme.cssVars['--color-border']}` }}>
                    <div style={{ background: theme.cssVars['--color-primary'], height: '40px', margin: '12px 16px', borderRadius: theme.cssVars['--radius-card'], opacity: 0.8 }} />
                    <div style={{ background: theme.cssVars['--color-cta'], height: '16px', width: '50%', margin: '0 16px', borderRadius: theme.cssVars['--radius-card'] }} />
                    {values.theme === theme.id && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: theme.cssVars['--color-accent'], color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '3px' }}>
                        Active
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.875rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.125rem' }}>
                      {theme.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                      {theme.tagline}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 600, marginBottom: '0.375rem' }}>
                Selected: {THEME_CATALOG[values.theme]?.name}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                Click &quot;Save Settings&quot; to apply this template to your website.
              </p>
            </div>
          </div>
        )}

        {/* ── Markets Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'Markets' && (
          <div className="wp-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Markets Served
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
              Select the markets you serve. These appear on your website and affect SEO.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {MARKETS_OPTIONS.map((m) => (
                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', padding: '0.375rem 0.75rem', background: values.markets.includes(m) ? 'var(--color-primary)' : 'var(--color-surface)', color: values.markets.includes(m) ? '#fff' : 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={values.markets.includes(m)} onChange={() => toggleMarket(m)} style={{ display: 'none' }} />
                  {m}
                </label>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.625rem', color: 'var(--color-text)' }}>
                Selected markets ({values.markets.length})
              </p>
              {values.markets.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {values.markets.map((m) => (
                    <span key={m} style={{ fontSize: '0.78rem', background: 'var(--color-primary)', color: '#fff', padding: '0.25rem 0.625rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {m}
                      <button type="button" onClick={() => toggleMarket(m)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.875rem', lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>No markets selected</p>
              )}
            </div>
          </div>
        )}

        {/* ── SEO Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'SEO' && (
          <div className="wp-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              SEO Settings
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
              Control how your website appears in search engines and social sharing.
            </p>

            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
                  SEO Title <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>({values.seoTitle.length}/60)</span>
                </label>
                <input
                  type="text"
                  value={values.seoTitle}
                  onChange={(e) => setValues((v) => ({ ...v, seoTitle: e.target.value }))}
                  className="wp-input"
                  maxLength={60}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                  Recommended: 50–60 characters. Currently used as the &lt;title&gt; tag.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>
                  SEO Description <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>({values.seoDescription.length}/160)</span>
                </label>
                <textarea
                  value={values.seoDescription}
                  onChange={(e) => setValues((v) => ({ ...v, seoDescription: e.target.value }))}
                  className="wp-textarea"
                  rows={3}
                  maxLength={160}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                  Recommended: 150–160 characters. Shown in search snippets and social previews.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Hero Image URL</label>
                <input
                  type="url"
                  value={values.heroImage}
                  onChange={(e) => setValues((v) => ({ ...v, heroImage: e.target.value }))}
                  className="wp-input"
                  placeholder="https://..."
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                  Used as the Open Graph (social sharing) image. Recommended size: 1200×630px.
                </p>
                {values.heroImage && (
                  <img src={values.heroImage} alt="Hero preview" style={{ marginTop: '0.75rem', width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Canonical URL (preview)</label>
                <div style={{ padding: '0.625rem 0.875rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>
                  rcregroup.com/agent/marcus-webb
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                  Your canonical URL is determined by your agent profile slug. It cannot be changed here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Domain Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'Domain' && (
          <div className="wp-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Domain Configuration
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
              Connect your own domain name, or use your free RCRE subdomain.
            </p>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Status */}
              <div style={{ padding: '1rem 1.25rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                  Status: Not configured
                </p>
                <p style={{ fontSize: '0.8rem', color: '#b45309' }}>
                  Your website is using the default RCRE platform URL. Configure a custom domain to publish on your own URL.
                </p>
              </div>

              {/* Subdomain preview */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Your free subdomain</label>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>https://</span>
                  <span style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 700 }}>marcus-webb</span>
                  <span style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>.rcregroup.com</span>
                </div>
              </div>

              {/* Custom domain */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Custom domain</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={values.customDomain}
                    onChange={(e) => setValues((v) => ({ ...v, customDomain: e.target.value }))}
                    className="wp-input"
                    placeholder="agents.yourdomain.com"
                  />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.375rem' }}>
                  Point your domain&apos;s CNAME record to <code style={{ background: 'var(--color-bg)', padding: '1px 4px', borderRadius: '3px' }}>platform.rcregroup.com</code>.
                  Allow up to 24 hours for DNS propagation.
                </p>
              </div>

              {/* DNS instructions */}
              <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}>
                  DNS Setup Instructions
                </p>
                <ol style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.8, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                  <li>Navigate to DNS settings for your domain</li>
                  <li>Add a CNAME record: Host = <code style={{ background: 'var(--color-surface)', padding: '1px 4px', borderRadius: '3px' }}>agents</code>, Points to = <code style={{ background: 'var(--color-surface)', padding: '1px 4px', borderRadius: '3px' }}>platform.rcregroup.com</code>, TTL = 3600</li>
                  <li>Save and wait for propagation (up to 24 hours)</li>
                  <li>Return here and enter your custom domain above</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="wp-btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem' }}>
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SettingsPageWrapper() {
  return <SettingsPage />
}
