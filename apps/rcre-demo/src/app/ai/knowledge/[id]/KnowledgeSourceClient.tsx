'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { KnowledgeDocument } from '@/lib/services/ai-knowledge'

export function KnowledgeSourceClient({ id }: { id: string }) {
  const [document, setDocument] = useState<KnowledgeDocument | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  useEffect(() => {
    let active = true
    void fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, { cache: 'no-store' }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error('Source unavailable')
      if (active) { setDocument(result.document); setState('ready') }
    }).catch(() => { if (active) setState('unavailable') })
    return () => { active = false }
  }, [id])
  return <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
    <Link href="/ai" className="text-sm text-brass hover:underline">Back to RCRE AI</Link>
    {state === 'loading' ? <p className="mt-8 text-chalk-muted" role="status">Loading verified source…</p> : state === 'unavailable' || !document ? <section className="mt-8 rounded-panel border border-hair bg-ink-raised p-6"><h1 className="font-display text-h2">Source unavailable</h1><p className="mt-3 text-chalk-muted">This source is not available to your account or has been archived.</p></section> : <article className="mt-8 rounded-panel border border-hair bg-ink-raised p-6 sm:p-8"><p className="eyebrow text-brass">Verified knowledge source</p><h1 className="mt-2 font-display text-h1">{document.title}</h1><p className="mt-3 text-sm text-chalk-muted">{document.category}{document.state ? ` · ${document.state}` : ''} · version {document.version}</p><dl className="mt-6 grid gap-4 border-y border-hair py-4 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-chalk-muted">Source</dt><dd className="mt-1 text-sm text-chalk">{document.source}</dd></div><div><dt className="text-xs uppercase tracking-wide text-chalk-muted">Updated</dt><dd className="mt-1 text-sm text-chalk">{new Date(document.updatedAt).toLocaleDateString()}</dd></div></dl><div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-chalk">{document.content}</div></article>}
  </main>
}
