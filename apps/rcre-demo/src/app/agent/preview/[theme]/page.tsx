import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { actorOrNull } from '@/lib/platform/auth'
import { loadAgentWebsite } from '@/lib/agent-website/lifecycle'
import { THEME_CATALOG, type AgentWebsiteTheme } from '@/lib/agent-website/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Website Theme Preview | RCRE',
  robots: { index: false, follow: false },
}

export default async function ThemePreviewPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme: rawTheme } = await params
  if (!Object.hasOwn(THEME_CATALOG, rawTheme)) notFound()
  const theme = rawTheme as AgentWebsiteTheme
  const actor = await actorOrNull()
  if (!actor) redirect(`/login?next=${encodeURIComponent(`/agent/preview/${theme}`)}`)

  const website = await loadAgentWebsite(actor)
  if (!website.member?.active) notFound()
  const meta = THEME_CATALOG[theme]
  const canonical = website.canonical
  const name = canonical?.name || actor.name
  const title = canonical?.title || actor.role.replaceAll('_', ' ')
  const markets = canonical?.markets ?? []
  const bio = canonical?.bio?.trim() || ''
  const photo = website.profile?.headshotAssetId ? '/api/profile/photo' : canonical?.image
  const headline = website.website?.headline?.trim() || meta.tagline
  const candidateHeroImage = website.website?.heroImage?.trim()
  const heroImage = candidateHeroImage && (candidateHeroImage.startsWith('/') && !candidateHeroImage.startsWith('//') || /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:[/?#]|$)/i.test(candidateHeroImage)) ? candidateHeroImage : ''
  const colors = meta.cssVars

  return (
    <main style={{ minHeight: '100vh', background: colors['--color-bg'], color: colors['--color-text'], fontFamily: colors['--font-body'] }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px clamp(16px, 4vw, 48px)', background: colors['--color-surface'], borderBottom: `1px solid ${colors['--color-border']}` }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{meta.name} · Private preview</p>
        <Link href="/website/gallery" style={{ color: colors['--color-text'], fontSize: 14, fontWeight: 700 }}>Back to templates</Link>
      </div>
      <header style={{ padding: '18px clamp(16px, 5vw, 72px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: colors['--color-surface'] }}>
        <div><strong style={{ color: colors['--color-primary'], letterSpacing: '.08em' }}>RCRE</strong><div style={{ fontSize: 12, marginTop: 3 }}>{name}</div></div>
        <Link href="/website/settings" style={{ background: colors['--color-cta'], color: '#fff', padding: '11px 17px', borderRadius: 5, textDecoration: 'none', fontWeight: 700 }}>Configure website</Link>
      </header>
      <section style={{ minHeight: 420, position: 'relative', display: 'grid', alignItems: 'end', padding: 'clamp(28px, 8vw, 96px)', background: heroImage ? `linear-gradient(90deg, rgba(0,0,0,.62), rgba(0,0,0,.12)), url("${heroImage}") center/cover` : `linear-gradient(135deg, ${colors['--color-primary']}, ${colors['--color-accent']})`, color: '#fff' }}>
        <div style={{ maxWidth: 760 }}>
          <p style={{ textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 12, fontWeight: 700 }}>{markets.length ? markets.join(' · ') : 'River City Real Estate Group'}</p>
          <h1 style={{ fontFamily: colors['--font-display'], fontSize: 'clamp(38px, 7vw, 76px)', lineHeight: 1.02, margin: '16px 0' }}>{headline}</h1>
          <p style={{ fontSize: 18, maxWidth: 640 }}>{title} · {name}</p>
          <Link href="/website/settings" style={{ display: 'inline-block', marginTop: 12, padding: '13px 19px', background: colors['--color-cta'], color: '#fff', borderRadius: 5, textDecoration: 'none', fontWeight: 700 }}>Personalize this design</Link>
        </div>
      </section>
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(32px, 7vw, 84px) 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 40, alignItems: 'center' }}>
        {photo ? <img src={photo} alt={name} style={{ width: '100%', maxWidth: 380, aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 6 }} /> : <div aria-hidden="true" style={{ width: '100%', maxWidth: 380, aspectRatio: '4 / 5', background: colors['--color-surface'], border: `1px solid ${colors['--color-border']}`, borderRadius: 6 }} />}
        <div>
          <p style={{ textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 12, color: colors['--color-accent'], fontWeight: 700 }}>Your website preview</p>
          <h2 style={{ fontFamily: colors['--font-display'], fontSize: 'clamp(30px, 4vw, 48px)', margin: '12px 0' }}>{name}</h2>
          <p style={{ lineHeight: 1.8 }}>{bio || 'Your professional biography will appear here when your profile is complete.'}</p>
          {markets.length > 0 && <p style={{ lineHeight: 1.7 }}><strong>Markets:</strong> {markets.join(' · ')}</p>}
          <p style={{ marginTop: 24, fontSize: 14, opacity: .8 }}>This private preview uses your saved profile information. No listing or transaction metrics are displayed unless verified data is connected.</p>
        </div>
      </section>
      <footer style={{ padding: 28, textAlign: 'center', background: colors['--color-primary'], color: '#fff' }}>River City Real Estate Group · Alabama &amp; Florida</footer>
    </main>
  )
}
