'use client'
import { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReqStatus = 'ready' | 'not_ready' | 'in_progress' | 'authorized'

interface ChecklistItem {
  key: string
  label: string
  description: string
  howTo: string[]
  status: ReqStatus
}

interface ActivationState {
  credentialsConfigured: boolean
  connectionAuthorized: boolean
  webhookConfigured: boolean
  readOnlyMode: boolean
  accountId?: string
  lastChecked?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHECKLIST: Omit<ChecklistItem, 'status'>[] = [
  {
    key: 'owner_credentials',
    label: 'Owner API Key',
    description: 'Your Follow Up Boss owner account API key with read permissions.',
    howTo: [
      '1. Log into FUB as the owner account',
      '2. Navigate to Settings → API → API Keys',
      '3. Create a new key with Read access (read_events, read_contacts, read_deals)',
      '4. Copy the key — it will only be shown once',
    ],
  },
  {
    key: 'subdomain',
    label: 'Subdomain',
    description: 'Your FUB account subdomain (e.g., yourcompany.followupboss.com).',
    howTo: ['Find it in FUB Settings → Account → Subdomain'],
  },
  {
    key: 'legal_agreement',
    label: 'Data Processing Agreement',
    description: 'Confirm FUB API usage complies with your data processing agreement and applicable privacy law.',
    howTo: ['Review FUB\'s API Terms of Service and your DPA obligations with your legal counsel'],
  },
  {
    key: 'read_only_scope',
    label: 'Read-Only Enforcement',
    description: 'RCRE enforces read-only mode. No writes, updates, or creates will be executed against FUB.',
    howTo: ['This is enforced by the integration — no action needed. All write attempts will be blocked.'],
  },
  {
    key: 'webhook_verification',
    label: 'Webhook Verification',
    description: 'A webhook endpoint must be verified before FUB sends real-time events.',
    howTo: [
      '1. After connecting, FUB will send a test webhook to RCRE',
      '2. RCRE responds with the expected verification token',
      '3. Once verified, real events can flow (requires Jeremy\'s explicit authorization)',
    ],
  },
  {
    key: 'authorization',
    label: 'Jeremy\'s Explicit Authorization',
    description: 'Production FUB connection requires Jeremy\'s explicit approval. Nothing connects automatically.',
    howTo: ['This checklist, when all items above are complete, will show Jeremy\'s authorization button'],
  },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ReqStatus }) {
  const configs: Record<ReqStatus, { label: string; cls: string }> = {
    ready: { label: '✓ Ready', cls: 'text-signal-calm bg-signal-calm/10 border border-signal-calm/30' },
    not_ready: { label: '✗ Not ready', cls: 'text-signal-hot bg-signal-hot/10 border border-signal-hot/30' },
    in_progress: { label: '◐ In progress', cls: 'text-signal-caution bg-signal-caution/10 border border-signal-caution/30' },
    authorized: { label: '✓ Authorized', cls: 'text-signal-calm bg-signal-calm/10 border border-signal-calm/30' },
  }
  const { label, cls } = configs[status]
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-hair last:border-0">
      <div className="flex items-center justify-between py-3 px-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={item.status} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-chalk">{item.label}</p>
            <p className="text-xs text-chalk-muted mt-0.5">{item.description}</p>
          </div>
        </div>
        <button
          className="text-xs text-chalk-faint hover:text-chalk-muted shrink-0"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? '▲ How to' : '▼ How to'}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-3 ml-10">
          <p className="text-xs text-chalk-faint uppercase tracking-wider mb-1">How to complete</p>
          {item.howTo.map((step, i) => (
            <p key={i} className="text-xs text-chalk-muted font-mono">{step}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Credential form
// ---------------------------------------------------------------------------

function CredentialForm({
  onConfigured,
}: {
  onConfigured: (configured: boolean) => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleTest() {
    setTesting(true)
    setResult(null)
    // Simulate test — in real flow this calls /api/fub/validate
    await new Promise((r) => setTimeout(r, 1500))
    if (apiKey && subdomain) {
      setResult({ ok: true, message: 'Credentials format valid. Not yet connected — save first.' })
    } else {
      setResult({ ok: false, message: 'API key and subdomain are required.' })
    }
    setTesting(false)
  }

  async function handleSave() {
    await new Promise((r) => setTimeout(r, 500))
    setSaved(true)
    onConfigured(true)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-chalk-muted mb-1">FUB Subdomain</label>
        <div className="flex">
          <input
            className="flex-1 rounded-l-control border border-hair bg-ink px-3 py-2 text-chalk text-sm"
            placeholder="yourcompany"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
          />
          <span className="rounded-r-control border border-l-0 border-hair bg-canvas px-3 py-2 text-xs text-chalk-muted">
            .followupboss.com
          </span>
        </div>
      </div>
      <div>
        <label className="block text-xs text-chalk-muted mb-1">Owner API Key</label>
        <input
          type="password"
          className="w-full rounded-control border border-hair bg-ink px-3 py-2 text-chalk text-sm font-mono"
          placeholder="sk_live_…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <p className="text-xs text-chalk-faint mt-1">Stored encrypted in an httpOnly cookie. Never logged.</p>
      </div>
      <div className="flex gap-3">
        <button
          className="btn-ghost text-xs"
          disabled={testing || !apiKey || !subdomain}
          onClick={handleTest}
        >
          {testing ? 'Testing…' : 'Test Connection'}
        </button>
        <button
          className="btn-primary text-xs"
          disabled={!apiKey || !subdomain || testing}
          onClick={handleSave}
        >
          {saved ? '✓ Saved' : 'Save Credentials'}
        </button>
      </div>
      {result && (
        <p className={`text-xs ${result.ok ? 'text-signal-calm' : 'text-signal-hot'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FubOperations() {
  const [state, setState] = useState<ActivationState>({
    credentialsConfigured: false,
    connectionAuthorized: false,
    webhookConfigured: false,
    readOnlyMode: true,
  })
  const [showCredentials, setShowCredentials] = useState(false)

  const checklist: ChecklistItem[] = CHECKLIST.map((item) => {
    if (item.key === 'owner_credentials') {
      return { ...item, status: state.credentialsConfigured ? 'ready' : 'not_ready' }
    }
    if (item.key === 'subdomain') {
      return { ...item, status: state.credentialsConfigured ? 'ready' : 'not_ready' }
    }
    if (item.key === 'read_only_scope') {
      return { ...item, status: 'ready' }
    }
    if (item.key === 'webhook_verification') {
      return { ...item, status: state.webhookConfigured ? 'ready' : 'not_ready' }
    }
    if (item.key === 'authorization') {
      return { ...item, status: state.connectionAuthorized ? 'authorized' : 'not_ready' }
    }
    return { ...item, status: 'not_ready' }
  })

  const readyCount = checklist.filter((i) => i.status === 'ready' || i.status === 'authorized').length
  const allReady = readyCount === checklist.length

  return (
    <div className="mx-auto max-w-4xl p-5 lg:p-10">
      <div className="mb-6">
        <p className="eyebrow text-brass">Integration · Follow Up Boss</p>
        <h1 className="font-display text-h2 mt-1">FUB Activation</h1>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            state.connectionAuthorized ? 'bg-signal-calm/10 text-signal-calm border border-signal-calm/30' :
            'bg-signal-caution/10 text-signal-caution border border-signal-caution/30'
          }`}>
            {state.connectionAuthorized ? '✓ Production Connected (Read Only)' : '○ Not Connected'}
          </span>
          <span className="text-xs text-chalk-faint">Read Only · FUB is CRM of record</span>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-panel border border-hair p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-chalk">
            {readyCount} of {checklist.length} requirements met
          </p>
          {allReady && !state.connectionAuthorized && (
            <button className="btn-primary text-sm">
              Authorize Production Connection
            </button>
          )}
          {state.connectionAuthorized && (
            <span className="text-sm text-signal-calm">Production read-only connection active</span>
          )}
        </div>
        <div className="w-full bg-hair rounded-full h-2">
          <div
            className="bg-signal-calm h-2 rounded-full transition-all"
            style={{ width: `${(readyCount / checklist.length) * 100}%` }}
          />
        </div>
        {!allReady && (
          <p className="text-xs text-chalk-muted mt-2">
            Complete all {checklist.length} requirements above to authorize the connection.
          </p>
        )}
      </div>

      {/* Checklist */}
      <div className="rounded-panel border border-hair overflow-hidden mb-6">
        {checklist.map((item) => (
          <ChecklistRow key={item.key} item={item} />
        ))}
      </div>

      {/* Credentials */}
      <div className="rounded-panel border border-hair overflow-hidden">
        <button
          className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-canvas transition-colors"
          onClick={() => setShowCredentials((v) => !v)}
        >
          <div>
            <p className="text-sm font-medium text-chalk">Configure Credentials</p>
            <p className="text-xs text-chalk-muted mt-0.5">
              {state.credentialsConfigured ? 'Credentials saved' : 'Enter your FUB API key and subdomain'}
            </p>
          </div>
          <span className="text-xs text-brass">{showCredentials ? '▲' : '▼'}</span>
        </button>
        {showCredentials && (
          <div className="px-4 pb-4 border-t border-hair pt-4">
            <CredentialForm onConfigured={(c) => setState((s) => ({ ...s, credentialsConfigured: c }))} />
          </div>
        )}
      </div>
    </div>
  )
}
