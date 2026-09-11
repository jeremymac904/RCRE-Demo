'use client'
/**
 * RuralContactForm — Lead capture for RCRE Rural theme.
 *
 * Warm, neighborly form with acreage range checkboxes.
 * Uses captureLead() — no real comms.
 */

import { useState, type FormEvent } from 'react'
import type { AgentProfile } from '@/lib/agent-website/types'
import { captureLead } from '@/lib/agent-website/capture-lead'

interface Props {
  agent: AgentProfile
}

const ACREAGE_RANGES = [
  'Under 10 acres',
  '10 – 50 acres',
  '50 – 200 acres',
  '200 – 500 acres',
  '500+ acres',
]

const LAND_USE = [
  'Livestock / cattle',
  'Equestrian',
  'Timber / managed forest',
  'Farming / row crop',
  'Hunting / recreation',
  'Investment / 1031 exchange',
  'Primary residence on acreage',
  'Other',
]

export function RuralContactForm({ agent }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [selectedAcreage, setSelectedAcreage] = useState<string[]>([])
  const [selectedUse, setSelectedUse] = useState<string[]>([])

  function toggleAcreage(v: string) {
    setSelectedAcreage((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
  }

  function toggleUse(v: string) {
    setSelectedUse((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = e.currentTarget
    const f = new FormData(form)

    const result = captureLead({
      agentSlug: agent.slug,
      type: 'buyer',
      name: f.get('name') as string || undefined,
      email: f.get('email') as string || undefined,
      phone: f.get('phone') as string || undefined,
      message: f.get('message') as string || undefined,
      propertyInterest:
        [selectedAcreage.length ? `Acreage: ${selectedAcreage.join(', ')}` : null]
          .concat(selectedUse.length ? [`Use: ${selectedUse.join(', ')}`] : [])
          .filter(Boolean)
          .join(' | ') || undefined,
      budget: f.get('budget') as string || undefined,
      landingPage: '/agent/alabama-rural/contact',
    })

    if (result.accepted) {
      setReferenceId(result.referenceId)
      setDone(true)
      form.reset()
      setSelectedAcreage([])
      setSelectedUse([])
    } else {
      setError('Your inquiry could not be recorded. Please try again.')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="rural-success" role="status">
        <h3>Thank you — your inquiry is recorded.</h3>
        <p>
          Reference: <code>{referenceId}</code>
        </p>
        <p style={{ marginTop: '0.75rem' }}>
          This is a review environment. No appointment is confirmed and no message has been sent.
        </p>
        <button
          onClick={() => { setDone(false); setReferenceId('') }}
          style={{
            marginTop: '1.25rem',
            background: 'none',
            border: '1px solid var(--rural-border)',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: 'var(--rural-muted)',
            fontFamily: 'var(--rural-font-body)',
          }}
        >
          Submit another inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rural-form">
      <h2 className="rural-form-title">Tell Us About Your Land Search</h2>
      <p className="rural-form-sub">
        Acreage range, intended use, and any particular conditions you are looking for.
        I follow up personally — usually within one to two business days.
      </p>

      <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Name + Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--rural-text)' }}>
              Full name <span aria-hidden="true">*</span>
            </label>
            <input name="name" type="text" autoComplete="name" required maxLength={120} className="rural-input" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--rural-text)' }}>
              Email address <span aria-hidden="true">*</span>
            </label>
            <input name="email" type="email" autoComplete="email" required maxLength={200} className="rural-input" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--rural-text)' }}>
            Phone (optional)
          </label>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} className="rural-input" />
        </div>

        {/* Acreage range */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.625rem', color: 'var(--rural-text)' }}>
            Target acreage range
          </label>
          <div className="rural-checkbox-group">
            {ACREAGE_RANGES.map((r) => (
              <label key={r} className="rural-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedAcreage.includes(r)}
                  onChange={() => toggleAcreage(r)}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        {/* Land use */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.625rem', color: 'var(--rural-text)' }}>
            Intended land use
          </label>
          <div className="rural-checkbox-group">
            {LAND_USE.map((u) => (
              <label key={u} className="rural-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedUse.includes(u)}
                  onChange={() => toggleUse(u)}
                />
                {u}
              </label>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--rural-text)' }}>
            Budget range
          </label>
          <select name="budget" className="rural-select">
            <option value="">— Select —</option>
            <option>Under $200K</option>
            <option>$200K – $400K</option>
            <option>$400K – $700K</option>
            <option>$700K – $1M</option>
            <option>$1M+</option>
            <option>Flexible</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--rural-text)' }}>
            Additional details <span aria-hidden="true">*</span>
          </label>
          <textarea
            name="message"
            rows={4}
            maxLength={2500}
            required
            placeholder="Location preferences, timeline, specific conditions, USDA financing questions."
            className="rural-textarea"
          />
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--rural-cta)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="rural-submit">
        {busy ? 'Sending…' : 'Schedule a Land Tour'}
      </button>

      <p className="rural-privacy">
        We&apos;ll only use this to reach you about rural properties. No spam — the mail run doesn&apos;t do spam.
      </p>
    </form>
  )
}
