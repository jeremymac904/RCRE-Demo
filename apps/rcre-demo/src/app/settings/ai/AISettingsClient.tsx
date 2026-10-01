'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { PlatformActor } from '@/lib/platform/auth'
import { OPENROUTER_FREE_MODEL } from '@/lib/services/cloud-ai/providers'
import type { FullAIConfig, ValidationResult } from '@/lib/services/cloud-ai/shared-types'
import { buildCloudConfig } from '@/lib/services/cloud-ai/shared-types'

const field = 'w-full rounded-control border border-hair bg-ink px-3 py-2 text-chalk'
const label = 'block text-sm text-chalk-muted mb-1'
const button = 'border border-hair rounded-control px-4 py-2 hover:border-brass-fill text-sm text-chalk'
const buttonPrimary = 'bg-brass-fill text-brass-ink border border-brass-fill rounded-control px-4 py-2 hover:opacity-90 text-sm font-medium'

type ProviderId = 'deterministic' | 'cloud'

interface Props {
  actor: PlatformActor
}

export function AISettingsClient({ actor }: Props) {
  const [config, setConfig] = useState<FullAIConfig>({
    provider: 'deterministic',
    sharing: false,
    paused: false,
    requestCap: 30,
  })
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'validating' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Load current config on mount
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/assistant')
        const data = await r.json()
        if (!r.ok) throw new Error(data.error)
        if (data.config) {
          setConfig({
            provider: data.config.provider,
            model: data.config.model,
            sharing: data.config.sharing,
            paused: data.config.paused,
            requestCap: data.config.requestCap,
          })
        }
      } catch (e) {
        setError((e as Error).message)
      }
    }
    void load()
  }, [])

  const request = async (body: unknown) => {
    const r = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error)
    return data
  }

  const handleProviderChange = useCallback((id: ProviderId) => {
    setConfig(c => ({ ...c, provider: id, ...(id === 'cloud' ? { model: OPENROUTER_FREE_MODEL } : {}) }))
    setValidation(null)
    setNotice('')
    setError('')
  }, [])

  const handleSave = async (doValidate = false) => {
    setStatus('saving')
    setError('')
    setNotice('')

    try {
      const cloudConfig = config.provider === 'cloud'
        ? buildCloudConfig({ provider: 'openrouter', model: OPENROUTER_FREE_MODEL })
        : undefined

      if (config.provider === 'cloud' && doValidate) {
        setStatus('validating')
        const r = await fetch('/api/cloud-ai/validate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { provider: 'openrouter', model: OPENROUTER_FREE_MODEL } }),
        })
        const result = await r.json() as ValidationResult
        setValidation(result)
        if (!result.valid) { setStatus('error'); setError(result.error || 'OpenRouter connection check failed'); return }
        setNotice('Server-side OpenRouter connection verified. Model is fixed to openrouter/free; no paid fallback is permitted.')
        setStatus('saved')
        return
      }

      // Save to assistant config store
      await request({
        action: 'config',
        config: {
          provider: config.provider,
          endpoint: config.provider === 'cloud' ? 'https://openrouter.ai/api/v1' : '',
          model: config.provider === 'cloud' ? OPENROUTER_FREE_MODEL : config.model ?? '',
          sharing: config.sharing,
          paused: config.paused,
          requestCap: config.requestCap,
        },
      })

      setConfig(c => ({ ...c, cloud: cloudConfig, model: config.provider === 'cloud' ? OPENROUTER_FREE_MODEL : c.model }))
      setStatus('saved')
      setNotice('Provider settings saved. Test the connection before using the model.')
    } catch (e) {
      setStatus('error')
      setError((e as Error).message)
    }
  }

  const status_ = config.provider === 'cloud'
    ? validation?.valid
      ? { label: 'Server connection verified', color: 'text-signal-calm' }
      : validation?.valid === false
        ? { label: 'Connection check failed', color: 'text-signal-hot' }
        : { label: 'Not verified', color: 'text-chalk-muted' }
    : null

  return (
    <div className="p-5 sm:p-8 lg:p-10 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow text-brass">RCRE Platform</p>
          <h1 className="font-display text-h1 mt-2">AI Preferences</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {['broker_owner', 'managing_broker'].includes(actor.role) && <Link href="/settings/ai/knowledge" className={button}>Knowledge Library</Link>}
          <Link href="/assistant" className={button}>Open Assistant →</Link>
        </div>
      </div>

      <p className="text-chalk-muted mb-8 max-w-2xl">
        Configure your AI provider. RCRE uses deterministic analysis by default; optional remote inference is limited to the free OpenRouter router.
        Remote inference is fixed to OpenRouter&apos;s free-model router. The server key is never exposed to agents, and no paid fallback is allowed.
      </p>

      {error && (
        <div role="alert" className="mb-6 border border-signal-hot rounded-panel p-4 text-signal-hot">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="mb-6 rounded-panel bg-ink-raised border border-hair px-4 py-3 text-signal-calm">
          {notice}
        </div>
      )}

      {/* Provider selector */}
      <section className="mb-10">
        <h2 className="font-display text-2xl mb-4">Provider</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { id: 'deterministic', label: 'Deterministic (No AI)', desc: 'Rule-based analysis. Zero cost. No model.', badge: 'Free', badgeColor: 'bg-signal-calm' },
            { id: 'cloud', label: 'OpenRouter Free', desc: 'Fixed openrouter/free model. No paid model or fallback.', badge: 'Free only', badgeColor: 'bg-signal-calm' },
          ] as const).map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`rounded-panel border p-4 text-left transition-colors ${
                config.provider === p.id
                  ? 'border-brass-fill bg-ink-raised'
                  : 'border-hair bg-ink hover:border-hair-brass'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-chalk">{p.label}</p>
                  <p className="text-sm text-chalk-muted mt-1">{p.desc}</p>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${p.badgeColor}`}>
                  {p.badge}
                </span>
              </div>
              {config.provider === p.id && (
                <span className="mt-2 block text-brass text-sm">✓ Selected</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {config.provider === 'cloud' && (
        <section className="mb-10 rounded-panel border border-hair bg-ink-raised p-6">
          <h2 className="font-display text-xl mb-3">OpenRouter Free</h2>
          <p className="text-sm text-chalk-muted">Model: <code>openrouter/free</code>. The endpoint and server credential are fixed outside the browser. Requests prohibit paid fallback, online routing, and provider fallback. If the free route cannot serve a request, it fails without switching models.</p>
          {status_ && <p className={`mt-4 text-sm ${status_.color}`} role="status">{status_.label}</p>}
        </section>
      )}

      {config.provider === 'deterministic' && (
        <section className="mb-10 rounded-panel border border-hair bg-ink-raised p-6">
          <h2 className="font-display text-xl mb-3">Deterministic mode</h2>
          <p className="text-sm text-chalk-muted">Rule-based analysis over authorized records. No model inference or provider request is made.</p>
        </section>
      )}

      {/* Behavior controls */}
      <section className="mb-10">
        <h2 className="font-display text-xl mb-4">Behavior</h2>
        <div className="grid gap-4 sm:grid-cols-2 rounded-panel border border-hair bg-ink-raised p-6">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={config.sharing}
              onChange={e => setConfig(c => ({ ...c, sharing: e.target.checked }))}
              className="mt-1 accent-brass"
            />
            <div>
              <p className="text-sm font-medium text-chalk">Permit aggregate counts for remote requests</p>
              <p className="text-xs text-chalk-muted mt-1">
                Allow only counts and stage totals to reach the remote model. Contact details, messages, notes, addresses, documents and free-text prompts stay local.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={config.paused}
              onChange={e => setConfig(c => ({ ...c, paused: e.target.checked }))}
              className="mt-1 accent-brass"
            />
            <div>
              <p className="text-sm font-medium text-chalk">Pause assistant requests</p>
              <p className="text-xs text-chalk-muted mt-1">
                Prevents new AI requests. In-progress jobs complete normally.
              </p>
            </div>
          </label>
          <div>
            <label className={label}>Daily request cap</label>
            <input
              className={field}
              type="number"
              min={1}
              max={200}
              value={config.requestCap}
              onChange={e => setConfig(c => ({ ...c, requestCap: Number(e.target.value) }))}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="flex flex-wrap gap-3">
        <button
          className={buttonPrimary}
          onClick={() => handleSave(false)}
          disabled={status === 'saving' || status === 'validating'}
        >
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </button>

        {config.provider === 'cloud' && (
          <button
            className={button}
            onClick={() => handleSave(true)}
            disabled={status === 'saving' || status === 'validating'}
          >
            {status === 'validating' ? 'Validating…' : 'Save & validate credentials'}
          </button>
        )}

        <Link href="/assistant" className={button}>
          Test in Assistant →
        </Link>
      </section>

      {/* Info */}
      <section className="mt-10 rounded-panel border border-hair p-5">
        <h2 className="font-display text-lg mb-3">How RCRE handles AI</h2>
        <ul className="text-sm text-chalk-muted space-y-2">
          <li>• Portal inference is either deterministic or fixed to the OpenRouter free model router</li>
          <li>• Cloud API keys are encrypted with Web Crypto AES-256-GCM before storage</li>
          <li>• No AI request content is logged — only provider, model, role, timestamp, latency, and token count</li>
          <li>• AI may extract, summarize, draft, coach, and recommend — never decide compliance or execute contracts</li>
          <li>• Deterministic, identity, permissions, records, compliance, approvals, and money remain with the backend</li>
          <li>• Paid models, paid fallbacks, online routing, and other portal providers are rejected</li>
        </ul>
      </section>
    </div>
  )
}
