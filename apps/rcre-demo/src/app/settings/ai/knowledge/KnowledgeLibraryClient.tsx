'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { KnowledgeAudience, KnowledgeDocument } from '@/lib/services/ai-knowledge'

const field = 'w-full rounded-control border border-hair bg-ink px-3 py-2 text-chalk'
const button = 'rounded-control border border-hair px-4 py-2 text-sm text-chalk hover:border-brass-fill disabled:opacity-50'
const primary = 'rounded-control border border-brass-fill bg-brass-fill px-4 py-2 text-sm font-medium text-brass-ink disabled:opacity-50'
const categories = ['RCRE', 'Alabama', 'Florida', 'Compliance and Forms', 'Zillow', 'CRM', 'Transactions', 'Marketing', 'Training', 'Recruiting', 'Agent Websites', 'Technology', 'FAQ', 'Other'] as const

type FormState = {
  id: string; title: string; category: string; source: string; state: string; audience: KnowledgeAudience['kind']; roles: string[]; allowedUserIds: string; visibility: KnowledgeDocument['visibility']; classification: KnowledgeDocument['classification']; externalUseAllowed: boolean; tags: string; content: string
}
const emptyForm = (): FormState => ({ id: '', title: '', category: 'RCRE', source: '', state: '', audience: 'all', roles: ['owner', 'broker', 'agent'], allowedUserIds: '', visibility: 'organization', classification: 'internal', externalUseAllowed: false, tags: '', content: '' })

export function KnowledgeLibraryClient() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    const response = await fetch('/api/knowledge', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? 'Could not load the knowledge library')
    setDocuments(result.documents)
  }, [])
  useEffect(() => { void load().catch(e => setError((e as Error).message)) }, [load])

  const edit = (document: KnowledgeDocument) => {
    setEditing(document)
    setForm({ id: document.id, title: document.title, category: document.category, source: document.source, state: document.state ?? '', audience: document.audience.kind, roles: document.audience.kind === 'roles' ? document.audience.roles : [], allowedUserIds: document.allowedUserIds?.join(', ') ?? '', visibility: document.visibility, classification: document.classification, externalUseAllowed: document.externalUseAllowed, tags: document.tags.join(', '), content: document.content })
  }
  const reset = () => { setEditing(null); setForm(emptyForm()) }
  const payload = () => ({
    ...(editing ? {} : { id: form.id.trim() || crypto.randomUUID() }), title: form.title, category: form.category, source: form.source,
    state: form.state || null,
    audience: form.audience === 'roles' ? { kind: 'roles', roles: form.roles } : { kind: 'all' },
    visibility: form.visibility, classification: form.classification,
    externalUseAllowed: form.classification === 'public' && form.externalUseAllowed,
    ...(form.visibility === 'restricted' ? { allowedUserIds: form.allowedUserIds.split(',').map(v => v.trim()).filter(Boolean) } : {}),
    tags: form.tags.split(',').map(v => v.trim()).filter(Boolean), content: form.content,
  })
  const save = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/knowledge', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, expectedVersion: editing.version, patch: payload() } : payload()) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not save the source')
      setNotice('Knowledge source saved with a new version.')
      reset(); await load()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const archive = async (document: KnowledgeDocument) => {
    if (!window.confirm(`Archive “${document.title}”? It will stop appearing in retrieval while its record is retained.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/knowledge', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: document.id, expectedVersion: document.version }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not archive the source')
      setNotice('Knowledge source archived; history retained.')
      reset(); await load()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(old => ({ ...old, [key]: value }))

  return <main className="mx-auto max-w-6xl p-5 sm:p-8 lg:p-10">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow text-brass">RCRE AI</p><h1 className="mt-2 font-display text-h1">Knowledge Library</h1><p className="mt-3 max-w-3xl text-chalk-muted">Add only verified RCRE materials. Each source retains its citation, jurisdiction, audience, visibility, version, and review date. No brokerage procedures are prefilled.</p></div>
      <Link href="/settings/ai" className={button}>Back to AI Preferences</Link>
    </div>
    {error && <p role="alert" className="mb-4 rounded-panel border border-signal-hot p-3 text-signal-hot">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-panel border border-signal-calm p-3 text-signal-calm">{notice}</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
      <section className="rounded-panel border border-hair bg-ink-raised p-5" aria-labelledby="knowledge-sources-title">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="knowledge-sources-title" className="font-display text-xl">Verified sources</h2><span className="text-sm text-chalk-muted">{documents.length} active</span></div>
        {documents.length === 0 ? <div className="rounded-control border border-dashed border-hair p-5 text-sm text-chalk-muted">The library is empty. Upload or enter an approved source before asking RCRE AI to answer brokerage-specific questions.</div> : <ul className="space-y-3">{documents.map(document => <li key={document.id} className="rounded-control border border-hair p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-medium text-chalk">{document.title}</h3><p className="mt-1 text-xs text-chalk-muted">{document.category}{document.state ? ` · ${document.state}` : ''} · v{document.version}</p><p className="mt-1 break-words text-xs text-chalk-muted">Source: {document.source}</p><p className="mt-1 text-xs text-chalk-muted">Updated {new Date(document.updatedAt).toLocaleDateString()} · {document.visibility} · {document.classification}</p></div><div className="flex gap-2"><button className={button} onClick={() => edit(document)}>Edit</button><button className={button} disabled={busy} onClick={() => void archive(document)}>Archive</button></div></div>
          </li>)}</ul>}
      </section>
      <section className="rounded-panel border border-hair bg-ink-raised p-5" aria-labelledby="knowledge-form-title">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="knowledge-form-title" className="font-display text-xl">{editing ? 'Edit source' : 'Add source'}</h2>{editing && <button className={button} onClick={reset}>Cancel</button>}</div>
        <p className="mb-4 text-xs text-chalk-muted">Brokerage managers are responsible for verifying accuracy, scope, and currency before saving. Sensitive and internal sources stay local to authorized use.</p>
        <div className="space-y-3">
          {!editing && <label className="block text-sm text-chalk-muted">Record key<input className={field} value={form.id} onChange={e => set('id', e.target.value)} placeholder="Optional; generated if empty" /></label>}
          <label className="block text-sm text-chalk-muted">Title<input className={field} value={form.title} onChange={e => set('title', e.target.value)} maxLength={180} required /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm text-chalk-muted">Category<select className={field} value={form.category} onChange={e => set('category', e.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label className="block text-sm text-chalk-muted">State<select className={field} value={form.state} onChange={e => set('state', e.target.value)}><option value="">Brokerage-wide</option><option value="AL">Alabama</option><option value="FL">Florida</option></select></label></div>
          <label className="block text-sm text-chalk-muted">Source<input className={field} value={form.source} onChange={e => set('source', e.target.value)} placeholder="Approved file, official reference, or owner" maxLength={500} required /></label>
          <label className="block text-sm text-chalk-muted">Tags<input className={field} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Comma-separated search terms" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm text-chalk-muted">Visibility<select className={field} value={form.visibility} onChange={e => set('visibility', e.target.value as FormState['visibility'])}><option value="organization">Organization</option><option value="state">State</option><option value="restricted">Restricted</option></select></label><label className="block text-sm text-chalk-muted">Classification<select className={field} value={form.classification} onChange={e => { const classification = e.target.value as FormState['classification']; set('classification', classification); if (classification !== 'public') set('externalUseAllowed', false) }}><option value="internal">Internal</option><option value="sensitive">Sensitive</option><option value="public">Public</option></select></label></div>
          {form.visibility === 'restricted' && <label className="block text-sm text-chalk-muted">Allowed user IDs<input className={field} value={form.allowedUserIds} onChange={e => set('allowedUserIds', e.target.value)} placeholder="Comma-separated authenticated user IDs" /></label>}
          <label className="block text-sm text-chalk-muted">Audience<select className={field} value={form.audience} onChange={e => set('audience', e.target.value as FormState['audience'])}><option value="all">All roles</option><option value="roles">Selected roles</option></select></label>
          {form.audience === 'roles' && <fieldset className="rounded-control border border-hair p-3"><legend className="px-1 text-xs text-chalk-muted">Allowed roles</legend><div className="grid grid-cols-2 gap-2">{[['owner','Broker owner'],['broker','Managing broker'],['team_lead','Team leader'],['agent','Agent'],['staff','Staff'],['recruiter','Recruiter'],['viewer','Viewer']].map(([role, label]) => <label key={role} className="flex items-center gap-2 text-xs text-chalk"><input type="checkbox" checked={form.roles.includes(role)} onChange={e => set('roles', e.target.checked ? [...form.roles, role] : form.roles.filter(value => value !== role))} />{label}</label>)}</div></fieldset>}
          {form.classification === 'public' && <label className="flex items-start gap-2 text-sm text-chalk"><input type="checkbox" className="mt-1" checked={form.externalUseAllowed} onChange={e => set('externalUseAllowed', e.target.checked)} /><span>Approved for external inference. Only short matching excerpts are eligible; contact details and street addresses are redacted.</span></label>}
          <label className="block text-sm text-chalk-muted">Verified content<textarea className={`${field} min-h-44`} value={form.content} onChange={e => set('content', e.target.value)} maxLength={180000} required /></label>
          <button className={primary} disabled={busy || !form.title.trim() || !form.source.trim() || !form.content.trim()} onClick={() => void save()}>{busy ? 'Saving…' : editing ? 'Save new version' : 'Add verified source'}</button>
        </div>
      </section>
    </div>
  </main>
}
