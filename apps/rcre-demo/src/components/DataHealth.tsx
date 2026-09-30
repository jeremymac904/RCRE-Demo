'use client'

import { useEffect, useState } from 'react'

type HealthData = {
  mode?: string
  database?: { status?: string; healthy?: boolean; durable?: boolean; note?: string }
  databaseParity?: string
  dependencies?: {
    core: Record<string, { state: string; note: string }>
    optional: Record<string, { state: string; note: string }>
  }
  counts?: Record<string, number> | null
  worker?: { fresh?: boolean; status?: string; lastRun?: string | null }
  notifications?: { email?: string }
  auditPolicy?: { reviewDays?: number; retentionNote?: string } | null
  backups?: { name: string; bytes: number; assetBundle: boolean }[] | null
}

export function DataHealth() {
  const [data, setData] = useState<HealthData | null>(null)
  const [error, setError] = useState('')
  const load = async () => {
    try {
      const response = await fetch('/api/data-health', { cache: 'no-store' })
      const value = await response.json() as HealthData & { error?: string }
      if (!response.ok) throw new Error(value.error ?? 'Health check failed')
      setData(value)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Health check failed')
    }
  }
  useEffect(() => { void load() }, [])
  const exportAudit = async () => {
    const response = await fetch('/api/platform/audit')
    if (!response.ok) { setError('Audit export denied'); return }
    const url = URL.createObjectURL(new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'rcre-scoped-audit.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <section className="border border-hair p-5 mb-8">
    <h2 className="font-display text-2xl">System health</h2>
    {error && <p role="alert">{error}</p>}
    {data && <>
      <p className="text-sm text-chalk-muted my-4">{data.databaseParity}</p>
      <p>Database: {data.database?.status ?? 'unknown'}{data.database?.healthy ? ' · reachable' : ' · unavailable or unverified'}</p>
      {data.dependencies && <>
        <h3 className="font-semibold mt-5">Core services</h3>
        <ul className="grid gap-2 sm:grid-cols-2 mt-2">{Object.entries(data.dependencies.core).map(([name, item]) => <li key={name} className="rounded-control border border-hair p-3">
          <strong className="capitalize">{name.replaceAll(/([A-Z])/g, ' $1')}</strong><span className="ml-2 text-sm">{item.state.replaceAll('_', ' ')}</span><p className="text-sm text-chalk-muted mt-1">{item.note}</p>
        </li>)}</ul>
        <h3 className="font-semibold mt-5">Optional integrations</h3>
        <ul className="grid gap-2 sm:grid-cols-2 mt-2">{Object.entries(data.dependencies.optional).map(([name, item]) => <li key={name} className="rounded-control border border-hair p-3">
          <strong className="capitalize">{name.replaceAll(/([A-Z])/g, ' $1')}</strong><span className="ml-2 text-sm">{item.state.replaceAll('_', ' ')}</span><p className="text-sm text-chalk-muted mt-1">{item.note}</p>
        </li>)}</ul>
      </>}
      {data.mode !== 'production' && <>
        <p className="text-sm text-chalk-muted">Notifications: in-app only · Email: {data.notifications?.email === 'not_configured' ? 'not configured' : 'status unknown'}</p>
        <p>Schedule worker: {data.worker?.fresh && data.worker.status === 'healthy' ? 'Healthy local heartbeat' : data.worker?.status === 'failed' ? 'Last run failed' : 'No recent healthy heartbeat'}</p>
        <p className="text-sm text-chalk-muted">Last run: {data.worker?.lastRun ? new Date(data.worker.lastRun).toLocaleString() : 'Not recorded'} · External messages are not sent</p>
        {data.counts && <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-5">{Object.entries(data.counts).map(([key, value]) => <div key={key}><dt className="text-sm text-chalk-muted">{key.replaceAll('_', ' ')}</dt><dd className="text-xl">{String(value)}</dd></div>)}</dl>}
        <p>Audit review: {data.auditPolicy?.reviewDays ?? 90} days</p>
        <p className="text-sm text-chalk-muted">{data.auditPolicy?.retentionNote ?? 'Records retained. No automatic deletion authorized.'}</p>
        <h3 className="font-semibold mt-5">Database snapshots</h3>
        {(data.backups ?? []).map(backup => <p className="text-sm my-2" key={backup.name}>{backup.name} · {(backup.bytes / 1024 / 1024).toFixed(2)} MB · {backup.assetBundle ? 'Mutable uploads bundled' : 'Database only'}</p>)}
        {!data.backups?.length && <p>No local database backup yet.</p>}
        <p className="text-sm text-chalk-muted mt-3">Retain paired .files bundles with each local snapshot. Keep imported training assets separately.</p>
      </>}
    </>}
    <div className="flex flex-wrap gap-3 mt-5">
      <button className="border border-hair px-4 py-2 min-h-11" onClick={() => void load()}>Refresh health</button>
      <button className="border border-hair px-4 py-2 min-h-11" onClick={() => void exportAudit()}>Export audit review window</button>
    </div>
  </section>
}
