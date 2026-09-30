'use client'

import { useEffect, useState } from 'react'
import type { CommunityYoutubeConfig, CommunityYoutubeRun } from '@/lib/community-youtube'

interface State { config: CommunityYoutubeConfig; runs: CommunityYoutubeRun[] }

export function CommunityYoutubeAutomation({ categories }: { categories: string[] }) {
  const [state, setState] = useState<State | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const input = 'w-full rounded border border-hair bg-ink-raised p-3 text-chalk'

  async function load() {
    const response = await fetch('/api/community/youtube')
    const body = await response.json()
    if (!response.ok) throw new Error(body.error ?? 'Community video settings are unavailable')
    setState(body)
  }
  useEffect(() => { void load().catch((reason) => setError(reason.message)) }, [])

  async function post(payload: Record<string, unknown>) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/community/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Unable to save the community draft')
      await load()
      setNotice(body.duplicate ? 'That video already has a Community draft; no duplicate was created.' : payload.action === 'run-demo' ? 'Private Community draft created from the metadata you supplied. Nothing was fetched or published.' : 'Source preferences saved. Connection remains off.')
      return body
    } catch (reason) { setError((reason as Error).message); return null }
    finally { setBusy(false) }
  }

  return <section className="my-8 rounded-panel border border-hair bg-ink-raised p-5 sm:p-7" aria-labelledby="community-video-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">Internal workflow · draft only</p><h2 id="community-video-title" className="mt-2 font-display text-h3">YouTube to Community</h2><p className="mt-2 max-w-2xl text-body text-chalk-muted">Prepare an internal Community draft from approved video details. This demo does not connect to YouTube, fetch thumbnails, publish externally, or auto-detect new videos.</p></div>
      <span className="rounded-full border border-hair px-3 py-1 text-label">Not connected</span>
    </div>
    {error && <p role="alert" className="mt-4 text-label text-red-700">{error}</p>}{notice && <p role="status" className="mt-4 text-label text-chalk-muted">{notice}</p>}
    {!state ? <p className="mt-5 text-label text-chalk-muted">Loading workflow settings…</p> : <>
      <form className="mt-6 grid gap-4 border-t border-hair pt-5 md:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); await post({ action: 'config', version: state.config.version, sourceType: data.get('sourceType'), sourceUrl: data.get('sourceUrl'), category: data.get('category') }) }}>
        <label className="block text-label">Future source type<select className={input} name="sourceType" defaultValue={state.config.sourceType}><option value="channel">Channel</option><option value="playlist">Playlist</option></select></label>
        <label className="block text-label">Optional source URL<input className={input} name="sourceUrl" defaultValue={state.config.sourceUrl} placeholder="Add an approved channel or playlist URL" /></label>
        <label className="block text-label">Community category<select className={input} name="category" defaultValue={state.config.category}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <div className="flex items-end"><button className="btn-quiet" disabled={busy}>Save preferences</button></div>
      </form>
      <form className="mt-7 grid gap-4 border-t border-hair pt-5 md:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await post({ action: 'run-demo', title: data.get('title'), summary: data.get('summary'), watchUrl: data.get('watchUrl'), discussionPrompt: data.get('discussionPrompt'), category: data.get('category') }); if (result) event.currentTarget.reset() }}>
        <h3 className="font-display text-h4 md:col-span-2">Create a review draft</h3>
        <label className="block text-label">Approved video watch URL<input className={input} name="watchUrl" type="url" required placeholder="Paste the approved YouTube watch link" /></label>
        <label className="block text-label">Post title<input className={input} name="title" required maxLength={180} /></label>
        <label className="block text-label md:col-span-2">Short summary<textarea className={input} name="summary" required maxLength={5000} rows={3} /></label>
        <label className="block text-label">Discussion prompt<input className={input} name="discussionPrompt" required maxLength={500} /></label>
        <label className="block text-label">Draft category<select className={input} name="category" defaultValue={state.config.category}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <div className="md:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Run Demo Automation'}</button><p className="mt-2 text-label text-chalk-muted">Saves a private, deduplicated Community draft using only the details entered here. No external requests or publication occur.</p></div>
      </form>
      {!!state.runs.length && <div className="mt-7 border-t border-hair pt-5"><h3 className="font-display text-h4">Recent runs</h3><ul className="mt-3 space-y-2">{state.runs.map(run => <li key={run.id} className="text-label">{run.title} · private draft · {new Date(run.createdAt).toLocaleString()}</li>)}</ul></div>}
    </>}
  </section>
}
