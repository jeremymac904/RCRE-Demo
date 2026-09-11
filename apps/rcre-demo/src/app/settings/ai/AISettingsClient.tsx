'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { PlatformActor } from '@/lib/platform/auth'
import { listCloudProviders, costRankLabel, defaultModelFor } from '@/lib/services/cloud-ai/providers'
import type { CloudProvider } from '@/lib/services/cloud-ai/providers'
import type { FullAIConfig, ValidationResult } from '@/lib/services/cloud-ai/shared-types'
import { buildCloudConfig } from '@/lib/services/cloud-ai/shared-types'

const field = 'w-full rounded-control border border-hair bg-ink px-3 py-2 text-chalk'
const label = 'block text-sm text-chalk-muted mb-1'
const button = 'border border-hair rounded-control px-4 py-2 hover:border-brass-fill text-sm text-chalk'
const buttonPrimary = 'bg-brass-fill text-brass-ink border border-brass-fill rounded-control px-4 py-2 hover:opacity-90 text-sm font-medium'

type ProviderId = 'deterministic' | 'ollama' | 'hermes' | 'cloud'

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
  const [cloudProviders] = useState(() => listCloudProviders())
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<CloudProvider>('openrouter')
  const [cloudForm, setCloudForm] = useState({
    baseUrl: '',
    apiKey: '',
    model: '',
    maxTokens: '',
    temperature: '',
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
    setConfig(c => ({ ...c, provider: id }))
    setValidation(null)
    setNotice('')
    setError('')

    // Reset cloud form when switching to cloud
    if (id === 'cloud') {
      const defaultModel = defaultModelFor(selectedCloudProvider)
      setCloudForm(f => ({
        ...f,
        model: config.cloud?.model || defaultModel,
        baseUrl: config.cloud?.baseUrl || '',
        // Never pre-fill API key from state
        apiKey: '',
        maxTokens: config.cloud?.maxTokens?.toString() || '',
        temperature: config.cloud?.temperature?.toString() || '',
      }))
    }
  }, [selectedCloudProvider, config.cloud])

  const handleCloudProviderChange = useCallback((p: CloudProvider) => {
    setSelectedCloudProvider(p)
    setCloudForm(f => ({
      ...f,
      model: defaultModelFor(p),
      baseUrl: '',
      apiKey: '',
    }))
    setValidation(null)
  }, [])

  const handleSave = async (doValidate = false) => {
    setStatus('saving')
    setError('')
    setNotice('')

    try {
      let cloudConfig = config.cloud

      if (config.provider === 'cloud') {
        cloudConfig = buildCloudConfig({
          provider: selectedCloudProvider,
          baseUrl: cloudForm.baseUrl || undefined,
          apiKey: cloudForm.apiKey || undefined,
          model: cloudForm.model,
          maxTokens: cloudForm.maxTokens ? Number(cloudForm.maxTokens) : undefined,
          temperature: cloudForm.temperature ? Number(cloudForm.temperature) : undefined,
        })

        if (doValidate) {
          setStatus('validating')
          const r = await fetch('/api/cloud-ai/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: cloudConfig }),
          })
          const result = await r.json() as ValidationResult
          setValidation(result)
          if (!result.valid) {
            setStatus('error')
            return
          }
          setNotice(`Credentials valid. Available models: ${result.models?.join(', ') ?? 'unknown'}`)
          setStatus('saved')
          return
        }
      }

      // Save to assistant config store
      await request({
        action: 'config',
        config: {
          provider: config.provider,
          endpoint: config.provider === 'cloud' ? cloudConfig?.baseUrl ?? 'https://api.openrouter.ai/v1' : 'http://127.0.0.1:11434',
          model: config.provider === 'cloud' ? cloudForm.model : config.model ?? '',
          sharing: config.sharing,
          paused: config.paused,
          requestCap: config.requestCap,
        },
      })

      setConfig(c => ({ ...c, cloud: cloudConfig }))
      setStatus('saved')
      setNotice('Provider settings saved. Test the connection before using the model.')
    } catch (e) {
      setStatus('error')
      setError((e as Error).message)
    }
  }

  const credentialStatus = () => {
    if (config.provider !== 'cloud') return null
    if (!config.cloud?.apiKey && !cloudForm.apiKey) {
      return { label: 'Not configured', color: 'text-chalk-muted' }
    }
    if (validation?.valid) return { label: 'Credentials valid', color: 'text-signal-calm' }
    if (validation?.valid === false) return { label: `Validation failed: ${validation.error}`, color: 'text-signal-hot' }
    return { label: 'Configured — validate to confirm', color: 'text-brass' }
  }

  const status_ = credentialStatus()

  return (
    <div className="p-5 sm:p-8 lg:p-10 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow text-brass">RCRE Platform</p>
          <h1 className="font-display text-h1 mt-2">AI Preferences</h1>
        </div>
        <Link href="/assistant" className={button}>
          Open Assistant →
        </Link>
      </div>

      <p className="text-chalk-muted mb-8 max-w-2xl">
        Configure your AI provider. RCRE does not pay for inference by default — local and free options are first-class.
        Cloud providers require your own API key and billing. No model credentials are logged.
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
            { id: 'ollama', label: 'Local Ollama', desc: 'Ollama on this machine. Fully offline.', badge: 'Free', badgeColor: 'bg-signal-calm' },
            { id: 'hermes', label: 'RCRE Hermes Runtime', desc: 'OS-isolated agent worker. Reasoning, drafting, coaching.', badge: 'Free', badgeColor: 'bg-signal-calm' },
            { id: 'cloud', label: 'Cloud Provider', desc: 'OpenAI, Anthropic, OpenRouter, Groq, DeepSeek, and more.', badge: 'Cost varies', badgeColor: 'bg-brass-fill text-brass-ink' },
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

      {/* Cloud provider sub-form */}
      {config.provider === 'cloud' && (
        <section className="mb-10 rounded-panel border border-hair bg-ink-raised p-6">
          <h2 className="font-display text-xl mb-4">Cloud Provider Configuration</h2>

          {/* Provider type selector */}
          <div className="mb-6">
            <label className={label}>Provider</label>
            <select
              className={field}
              value={selectedCloudProvider}
              onChange={e => handleCloudProviderChange(e.target.value as CloudProvider)}
            >
              {cloudProviders.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label} — {costRankLabel(p.capabilities.costRank)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-chalk-muted">
              {cloudProviders.find(p => p.id === selectedCloudProvider)?.description}
            </p>
          </div>

          {/* Base URL (for self-hosted) */}
          {(selectedCloudProvider === 'ollama-remote' || selectedCloudProvider === 'azure-openai') && (
            <div className="mb-4">
              <label className={label}>
                {selectedCloudProvider === 'azure-openai' ? 'Azure endpoint URL *' : 'Remote Ollama base URL'}
              </label>
              <input
                className={field}
                type="url"
                placeholder={
                  selectedCloudProvider === 'ollama-remote'
                    ? 'http://your-gpu-server:11434'
                    : 'https://your-resource.openai.azure.com/openai/deployments/your-deployment'
                }
                value={cloudForm.baseUrl}
                onChange={e => setCloudForm(f => ({ ...f, baseUrl: e.target.value }))}
              />
            </div>
          )}

          {/* API Key */}
          <div className="mb-4">
            <label className={label}>
              API Key
              {selectedCloudProvider !== 'ollama-remote' && ' *'}
            </label>
            <input
              className={field}
              type="password"
              placeholder={
                config.cloud?.apiKey
                  ? '•••••••• (key stored)'
                  : `Your ${cloudProviders.find(p => p.id === selectedCloudProvider)?.label} API key`
              }
              value={cloudForm.apiKey}
              onChange={e => setCloudForm(f => ({ ...f, apiKey: e.target.value }))}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-chalk-muted">
              Stored encrypted. Never logged.{' '}
              {selectedCloudProvider === 'openrouter'
                ? 'Get a key at openrouter.ai/keys'
                : selectedCloudProvider === 'groq'
                  ? 'Get a key at console.groq.com'
                  : selectedCloudProvider === 'deepseek'
                    ? 'Get a key at platform.deepseek.com'
                    : ''}
            </p>
          </div>

          {/* Model */}
          <div className="mb-4">
            <label className={label}>Model *</label>
            <input
              className={field}
              type="text"
              placeholder={defaultModelFor(selectedCloudProvider)}
              value={cloudForm.model}
              onChange={e => setCloudForm(f => ({ ...f, model: e.target.value }))}
            />
            <p className="mt-1 text-xs text-chalk-muted">
              {selectedCloudProvider === 'openrouter'
                ? 'Examples: anthropic/claude-3.5-sonnet, openai/gpt-4o, google/gemini-2.0-flash-exp'
                : selectedCloudProvider === 'groq'
                  ? 'Examples: llama-3.3-70b-versatile, mixtral-8x7b-32768'
                  : ''}
            </p>
          </div>

          {/* Advanced controls */}
          <details className="group">
            <summary className="cursor-pointer text-brass text-sm mb-3 hover:underline">
              Advanced: max tokens and temperature
            </summary>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Max tokens (completion limit)</label>
                <input
                  className={field}
                  type="number"
                  placeholder="1400"
                  min={1}
                  max={100000}
                  value={cloudForm.maxTokens}
                  onChange={e => setCloudForm(f => ({ ...f, maxTokens: e.target.value }))}
                />
              </div>
              <div>
                <label className={label}>Temperature (creativity vs precision)</label>
                <input
                  className={field}
                  type="number"
                  placeholder="0.7"
                  min={0}
                  max={2}
                  step={0.1}
                  value={cloudForm.temperature}
                  onChange={e => setCloudForm(f => ({ ...f, temperature: e.target.value }))}
                />
                <p className="mt-1 text-xs text-chalk-muted">0.0 = precise, 1.0+ = creative</p>
              </div>
            </div>
          </details>

          {/* Credential status */}
          {status_ && (
            <div className="mt-4 text-sm">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status_.color === 'text-signal-calm' ? 'bg-signal-calm' : status_.color === 'text-signal-hot' ? 'bg-signal-hot' : 'bg-brass'}`} />
              {status_.label}
            </div>
          )}
        </section>
      )}

      {/* Non-cloud provider config */}
      {config.provider !== 'cloud' && (
        <section className="mb-10 rounded-panel border border-hair bg-ink-raised p-6">
          <h2 className="font-display text-xl mb-4">Local Provider Settings</h2>
          {config.provider === 'ollama' && (
            <div className="mb-4">
              <label className={label}>Local Ollama endpoint</label>
              <input className={field} type="url" placeholder="http://127.0.0.1:11434" defaultValue="http://127.0.0.1:11434" />
              <p className="mt-1 text-xs text-chalk-muted">
                Configure the endpoint in the Assistant panel and test the connection.
              </p>
            </div>
          )}
          {config.provider === 'hermes' && (
            <div className="text-sm text-chalk-muted">
              <p>Hermes uses an OS-isolated worker started from the Assistant panel.</p>
              <p className="mt-1">Start and verify the worker there before using it here.</p>
            </div>
          )}
          {config.provider === 'deterministic' && (
            <div className="text-sm text-chalk-muted">
              <p>Deterministic mode uses rule-based analysis over your authorized records.</p>
              <p className="mt-1">No model inference — zero cost, fully offline.</p>
            </div>
          )}
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
              <p className="text-sm font-medium text-chalk">Permit scoped synthetic context</p>
              <p className="text-xs text-chalk-muted mt-1">
                Allow the model to see your CRM priorities, transaction deadlines, and calendar when answering.
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
            disabled={status === 'saving' || status === 'validating' || !cloudForm.model}
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
          <li>• RCRE never pays for AI inference by default — local and free options are first-class</li>
          <li>• Cloud API keys are encrypted with Web Crypto AES-256-GCM before storage</li>
          <li>• No AI request content is logged — only provider, model, role, timestamp, latency, and token count</li>
          <li>• AI may extract, summarize, draft, coach, and recommend — never decide compliance or execute contracts</li>
          <li>• Deterministic, identity, permissions, records, compliance, approvals, and money remain with the backend</li>
          <li>• Provider routing is configurable without code changes — add new providers to the catalog</li>
        </ul>
      </section>
    </div>
  )
}
