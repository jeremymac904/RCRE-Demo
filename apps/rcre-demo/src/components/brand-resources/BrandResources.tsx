'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import type { BrandAgent, BrandState } from '@/lib/brand-resources/shared'
import { BRAND_ITEMS, brandComplianceReadiness, licenseForState } from '@/lib/brand-resources/shared'

type PageMode = 'catalog' | 'cards' | 'signatures'
const panel = 'border border-hair bg-ink-raised rounded-panel'
const button = 'inline-flex min-h-11 items-center justify-center rounded-control border border-hair px-4 py-2 text-sm font-medium text-chalk hover:border-brass-fill hover:text-brass-ink focus:outline-none focus:ring-2 focus:ring-brass-fill'
const input = 'min-h-11 w-full rounded-control border border-hair bg-ink px-3 py-2 text-chalk focus:outline-none focus:ring-2 focus:ring-brass-fill'
const stateOptions = (agent: BrandAgent): BrandState[] => {
  const available = new Set<BrandState>()
  for (const license of agent.licenses ?? []) available.add(license.state)
  const markets = agent.markets ?? [agent.market]
  if (markets.some(market => /\bAlabama\b/i.test(market))) available.add('Alabama')
  if (markets.some(market => /\bFlorida\b/i.test(market))) available.add('Florida')
  return [...available]
}
const html = (value: string) => value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' })[char] ?? char)
function signatureHtml(agent: BrandAgent, state: BrandState, origin: string) {
  const license = licenseForState(agent, state)
  const social = Object.entries(agent.socialLinks).filter(([, url]) => url.startsWith('https://')).map(([name, url]) => '<a href="' + html(url) + '" style="color:#9b7740;text-decoration:none">' + html(name) + '</a>').join(' &nbsp; ')
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;color:#18232c;border-collapse:collapse"><tr><td style="padding-right:16px;border-right:2px solid #b99559"><a href="' + html(agent.website) + '"><img src="' + html(origin + '/brand/rcre-logo-dark.png') + '" width="112" alt="River City Real Estate Group" style="display:block;border:0"></a></td><td style="padding-left:16px"><strong style="font-size:16px">' + html(agent.name) + '</strong><br><span>' + html(agent.title) + '</span><br><span>River City Real Estate Group · ' + html(state) + '</span><br><a href="tel:' + html(agent.phone.replace(/[^+\d]/g, '')) + '" style="color:#435968">' + html(agent.phone) + '</a> &nbsp; <a href="mailto:' + html(agent.email) + '" style="color:#435968">' + html(agent.email) + '</a>' + (license ? '<br><span>License: ' + html(license) + '</span>' : '') + '<br><a href="' + html(agent.website) + '" style="color:#435968">' + html(agent.website.replace(/^https?:\/\//, '')) + '</a>' + (social ? '<br>' + social : '') + '</td></tr></table>'
}
function signatureText(agent: BrandAgent, state: BrandState) {
  const license = licenseForState(agent, state)
  return [agent.name, agent.title, 'River City Real Estate Group · ' + state, agent.phone, agent.email, ...(license ? ['License: ' + license] : []), agent.website, ...Object.entries(agent.socialLinks).filter(([, url]) => url.startsWith('https://')).map(([name, url]) => name + ': ' + url)].join('\n')
}
function downloadSvg(id: string, filename: string) {
  const node = document.getElementById(id)
  if (!node) return
  const source = new XMLSerializer().serializeToString(node)
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
function BrandMark({ x, y, dark = false, origin }: { x: number; y: number; dark?: boolean; origin: string }) {
  return <image href={origin + (dark ? '/brand/rcre-logo-dark.png' : '/brand/rcre-logo-light.png')} x={x} y={y} width="250" height="78" preserveAspectRatio="xMinYMid meet" />
}
function CardConcept({ agent, state, side, origin, selected }: { agent: BrandAgent; state: BrandState; side: 'front' | 'back'; origin: string; selected: boolean }) {
  const id = 'business-card-' + side
  return <svg id={id} viewBox="0 0 1050 600" role="img" aria-label={'Business card ' + side + ' concept for ' + agent.name + ' in ' + state} className={selected ? 'w-full rounded-xl shadow-xl' : 'hidden'} aria-hidden={!selected}>
    <rect width="1050" height="600" rx="28" fill={side === 'front' ? '#f6f3ed' : '#17232c'} />
    {side === 'front' ? <>
      <rect x="0" y="0" width="24" height="600" fill="#b99559" />
      <BrandMark x={58} y={55} dark origin={origin} />
      <text x="58" y="330" fill="#17232c" fontFamily="Arial, sans-serif" fontSize="43" fontWeight="700">{agent.name}</text>
      <text x="58" y="387" fill="#52606a" fontFamily="Arial, sans-serif" fontSize="28">{agent.title}</text>
      <text x="58" y="458" fill="#52606a" fontFamily="Arial, sans-serif" fontSize="24">{agent.phone}</text>
      <text x="58" y="502" fill="#52606a" fontFamily="Arial, sans-serif" fontSize="24">{agent.email}</text>
      <text x="58" y="553" fill="#52606a" fontFamily="Arial, sans-serif" fontSize="20">{state} · Concept preview</text>
    </> : <>
      <BrandMark x={58} y={62} origin={origin} />
      <rect x="58" y="178" width="125" height="5" fill="#b99559" />
      <text x="58" y="259" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="28">{agent.name}</text>
      <text x="58" y="322" fill="#d9d5cd" fontFamily="Arial, sans-serif" fontSize="24">{agent.phone}</text>
      <text x="58" y="372" fill="#d9d5cd" fontFamily="Arial, sans-serif" fontSize="24">{agent.email}</text>
      <text x="58" y="448" fill="#d6bb88" fontFamily="Arial, sans-serif" fontSize="22">{agent.website.replace(/^https?:\/\//, '')}</text>
    </>}
  </svg>
}

export function BrandResources({ mode, agents, admin }: { mode: PageMode; agents: BrandAgent[]; admin: boolean }) {
  const [selected, setSelected] = useState(agents[0]?.slug ?? '')
  const agent = useMemo(() => agents.find((item) => item.slug === selected) ?? agents[0], [agents, selected])
  const [state, setState] = useState<BrandState>('Florida')
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front')
  const [copied, setCopied] = useState('')
  const [copyError, setCopyError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  if (!agent) return <main className="mx-auto max-w-5xl p-6 lg:p-10"><h1 className="font-display text-3xl">Brand resources</h1><p className="mt-4 text-chalk-muted">No active, visible canonical agent profiles are available to populate these tools.</p></main>
  const options = stateOptions(agent)
  const activeState = options.includes(state) ? state : (options[0] ?? 'Florida')
  const readiness = brandComplianceReadiness(activeState)
  const currentSide = cardSide
  const origin = 'https://rcregroup.com'

  async function copy(kind: 'rich' | 'html' | 'text') {
    setCopyError('')
    try {
      const markup = signatureHtml(agent, activeState, origin)
      const plain = signatureText(agent, activeState)
      if (kind === 'rich' && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([markup], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        })])
      } else await navigator.clipboard.writeText(kind === 'text' ? plain : markup)
      setCopied(kind === 'text' ? 'Plain text signature copied.' : kind === 'html' ? 'Signature HTML copied.' : 'Formatted signature copied. Paste into Gmail Settings.')
    } catch {
      setCopyError('Clipboard access was unavailable. Select and copy the preview manually.')
    }
  }

  return <main className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div><p className="text-sm uppercase tracking-[.16em] text-brass-ink">RCRE · Brand Resources</p><h1 className="mt-2 font-display text-3xl sm:text-4xl">{mode === 'catalog' ? 'Make the brand yours.' : mode === 'cards' ? 'Business card concepts' : 'Email signature'}</h1><p className="mt-3 max-w-3xl text-chalk-muted">{mode === 'catalog' ? 'A shared resource center for the details agents use in the field and in client conversations.' : mode === 'cards' ? 'Create a state-specific visual concept using the current visible RCRE profile.' : 'Create a Gmail signature with verified profile information. Copy it into Gmail yourself.'}</p></div>
      {mode !== 'catalog' && <Link className={button} href="/swag">← All brand resources</Link>}
    </header>
    <nav aria-label="Brand resource sections" className="mb-8 flex flex-wrap gap-3"><Link className={button} href="/swag">Swag catalog</Link><Link className={button} href="/swag/business-cards">Business cards</Link><Link className={button} href="/swag/email-signatures">Email signatures</Link></nav>

    {mode === 'catalog' && <>
      <section className={panel + ' mb-8 grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8'}>
        <div><p className="text-sm uppercase tracking-[.14em] text-brass-ink">Brand resource center</p><h2 className="mt-2 font-display text-2xl">A consistent RCRE presence, wherever business happens.</h2><p className="mt-3 max-w-2xl text-sm text-chalk-muted">Explore the resources and concepts available to the team. This catalog has no checkout, supplier, or pricing configured.</p></div>
        <Image src="/brand/rcre-logo-light.png" width={208} height={64} alt="River City Real Estate Group" className="max-h-16 w-auto object-contain" />
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{BRAND_ITEMS.map((item) => <article key={item.id} className={panel + ' flex min-h-60 flex-col p-5'}>
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.14em] text-brass-ink">{item.tag}</p><h2 className="mt-2 font-display text-xl">{item.title}</h2><p className="mt-1 text-sm text-chalk-muted">{item.kinds}</p></div><span aria-hidden className="grid h-12 w-12 place-items-center rounded-full border border-brass-fill/40 text-brass-ink">{item.id === 'business-cards' ? 'BC' : item.id === 'email-signatures' ? '@' : 'R'}</span></div>
        <p className="mt-5 flex-1 text-sm leading-6 text-chalk-muted">{item.description}</p>
        {item.id === 'business-cards' && <Link href="/swag/business-cards" className={button + ' mt-5'}>Open card concepts</Link>}
        {item.id === 'email-signatures' && <Link href="/swag/email-signatures" className={button + ' mt-5'}>Build a Gmail signature</Link>}
        {!['business-cards','email-signatures'].includes(item.id) && <><button className="mt-5 min-h-11 text-left text-sm text-brass-ink underline underline-offset-4" aria-expanded={expanded === item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>{expanded === item.id ? 'Hide details' : 'View resource details'}</button>{expanded === item.id && <p className="mt-2 border-t border-hair pt-3 text-sm text-chalk-muted">Availability and ordering details are not configured. Check with RCRE leadership before producing or purchasing branded materials.</p>}</>}
      </article>)}</div>
    </>}

    {mode === 'cards' && <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className={panel + ' space-y-5 p-5'}>
        <h2 className="font-display text-xl">Build a concept</h2>
        <label className="block text-sm">Canonical RCRE agent<select className={input + ' mt-2'} value={agent.slug} onChange={(event) => { setSelected(event.target.value); const next = agents.find((item) => item.slug === event.target.value); if (next) setState(stateOptions(next)[0] ?? 'Florida') }}>{agents.map((person) => <option key={person.slug} value={person.slug}>{person.name}</option>)}</select></label>
        <label className="block text-sm">Market and card jurisdiction<select className={input + ' mt-2'} value={activeState} onChange={(event) => setState(event.target.value as BrandState)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
        <div className="rounded-control border border-hair p-4 text-sm"><p className="font-medium">{agent.name}</p><p className="mt-1 text-chalk-muted">{agent.title} · {activeState}</p><p className="mt-3 text-chalk-muted">{licenseForState(agent, activeState) ? 'A public license value is mapped to this state.' : 'State-specific license value is not mapped; no license number will be shown.'}</p></div>
        <div role="status" className="rounded-control border border-amber-400/50 bg-amber-950/20 p-4 text-sm"><p className="font-medium text-amber-200">Concept only · not print-ready</p><p className="mt-2 text-chalk-muted">Approved {activeState} brokerage identity and required compliance wording are pending. Print-ready output is blocked.</p></div>
        {admin && <div className="rounded-control border border-amber-400/40 p-4 text-sm"><p className="font-semibold">Admin review required</p><p className="mt-1 text-chalk-muted">{readiness.reason} Supply approved identity, brokerage marks, and compliance wording before enabling print production.</p></div>}
      </section>
      <section className={panel + ' p-5 sm:p-7'}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-chalk-muted">{agent.name} · {activeState}</p><h2 className="mt-1 font-display text-xl">{currentSide === 'front' ? 'Front' : 'Back'} preview</h2></div><div role="group" aria-label="Card side" className="flex gap-2"><button type="button" aria-pressed={cardSide === 'front'} className={button} onClick={() => setCardSide('front')}>Front</button><button type="button" aria-pressed={cardSide === 'back'} className={button} onClick={() => setCardSide('back')}>Back</button></div></div>
        <div className="mx-auto max-w-3xl"><CardConcept agent={agent} state={activeState} side="front" origin={origin} selected={currentSide === 'front'} /><CardConcept agent={agent} state={activeState} side="back" origin={origin} selected={currentSide === 'back'} /></div>
        <div className="mt-5 flex flex-wrap gap-3"><button className={button} onClick={() => downloadSvg('business-card-front', agent.slug + '-' + activeState.toLowerCase() + '-front-concept-not-print-ready.svg')}>Download front concept</button><button className={button} onClick={() => downloadSvg('business-card-back', agent.slug + '-' + activeState.toLowerCase() + '-back-concept-not-print-ready.svg')}>Download back concept</button></div>
        <p className="mt-4 text-xs leading-5 text-chalk-muted">Concept artwork uses canonical contact fields. Do not send to a printer; required state text, marks, and any license mapping need approval first.</p>
      </section>
    </div>}

    {mode === 'signatures' && <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className={panel + ' space-y-5 p-5'}>
        <h2 className="font-display text-xl">Signature details</h2>
        <label className="block text-sm">Canonical RCRE agent<select className={input + ' mt-2'} value={agent.slug} onChange={(event) => { setSelected(event.target.value); const next = agents.find((item) => item.slug === event.target.value); if (next) setState(stateOptions(next)[0] ?? 'Florida') }}>{agents.map((person) => <option key={person.slug} value={person.slug}>{person.name}</option>)}</select></label>
        <label className="block text-sm">Market<select className={input + ' mt-2'} value={activeState} onChange={(event) => setState(event.target.value as BrandState)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
        <div className="border-t border-hair pt-4"><h3 className="font-medium">Install in Gmail</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-chalk-muted"><li>Copy the formatted signature below.</li><li>In Gmail, open Settings, then See all settings.</li><li>Under General, find Signature and create a new signature.</li><li>Paste the signature, choose its default behavior, then save changes.</li></ol></div>
        <p className="text-sm text-chalk-muted">This tool only copies content in your browser. It does not connect to Gmail or send email.</p>
        {admin && <p className="rounded-control border border-amber-400/40 p-3 text-sm text-amber-100">State compliance text remains pending. Unverified legal text and unmapped license numbers are omitted.</p>}
      </section>
      <section className={panel + ' p-5 sm:p-7'}>
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-chalk-muted">Preview · {activeState}</p><h2 className="mt-1 font-display text-xl">Gmail signature</h2></div><span className="text-xs text-chalk-muted">No email action</span></div>
        <div className="my-6 overflow-x-auto rounded-control border border-hair bg-white p-5 text-[#18232c]" dangerouslySetInnerHTML={{ __html: signatureHtml(agent, activeState, origin) }} />
        <div className="flex flex-wrap gap-3"><button className={button} onClick={() => void copy('rich')}>Copy formatted signature</button><button className={button} onClick={() => void copy('html')}>Copy HTML</button><button className={button} onClick={() => void copy('text')}>Copy plain text</button></div>
        {copied && <p role="status" className="mt-3 text-sm text-emerald-300">{copied}</p>}{copyError && <p role="alert" className="mt-3 text-sm text-rose-300">{copyError}</p>}
        <div className="mt-6 rounded-control border border-hair p-4 text-sm"><p className="font-medium">Fields included</p><p className="mt-2 text-chalk-muted">Name, public title, phone, email, RCRE identity, public agent website, and approved profile social links when present. A license number is included only when its state relationship is explicit. Required state-specific legal copy is omitted until verified.</p></div>
      </section>
    </div>}
  </main>
}

export function BrandResourcesUnavailable() {
  return <main className="mx-auto max-w-3xl p-6 sm:p-12"><div className={panel + ' p-8 sm:p-10'}><p className="text-sm uppercase tracking-[.14em] text-brass-ink">Brand resources</p><h1 className="mt-3 font-display text-3xl">This workspace is not connected to durable storage.</h1><p className="mt-4 text-chalk-muted">Business card and signature tools are unavailable in this production runtime. The production application currently has no durable Postgres-backed portal session and profile store configured. No card file or signature has been generated here.</p></div></main>
}

