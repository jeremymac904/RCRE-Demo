'use client'
/**
 * LuxuryContactForm — Lead capture for RCRE Luxury theme.
 *
 * Minimal, single-column, source attribution dropdown.
 * Uses captureLead() — no real comms.
 */

import { useState, type FormEvent } from 'react'
import type { AgentProfile } from '@/lib/agent-website/types'
import { captureLead } from '@/lib/agent-website/capture-lead'

interface Props {
  agent: AgentProfile
}

export function LuxuryContactForm({ agent }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [source, setSource] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = e.currentTarget
    const f = new FormData(form)

    const result = captureLead({
      agentSlug: agent.slug,
      type: 'general',
      name: f.get('name') as string || undefined,
      email: f.get('email') as string || undefined,
      phone: f.get('phone') as string || undefined,
      message: f.get('message') as string || undefined,
      propertyInterest: source || undefined,
      landingPage: '/agent/jacksonville-luxury/contact',
    })

    if (result.accepted) {
      setReferenceId(result.referenceId)
      setDone(true)
      form.reset()
      setSource('')
    } else {
      setError('Your inquiry could not be recorded. Please try again.')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="lux-success" role="status">
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
            border: '1px solid var(--lux-border)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: 'var(--lux-muted)',
          }}
        >
          Submit another inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="lux-form">
      <h2 className="lux-form-title">Begin a Quiet Conversation</h2>
      <p className="lux-form-sub">
        Questions about a property, a market, or a transaction? Share a few details and I will follow
        up directly. I work with a small number of clients — your inquiry will not be routed through a
        call center.
      </p>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--lux-text)' }}>
            Full name <span aria-hidden="true">*</span>
          </label>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            className="lux-input"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--lux-text)' }}>
            Email address <span aria-hidden="true">*</span>
          </label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            className="lux-input"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--lux-text)' }}>
            Phone (optional)
          </label>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            className="lux-input"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--lux-text)' }}>
            How did you find us?
          </label>
          <select
            name="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="lux-select"
          >
            <option value="">— Select —</option>
            <option value="architect-referral">Architect referral</option>
            <option value="wealth-advisor">Wealth advisor</option>
            <option value="private-banker">Private banker</option>
            <option value="press">Press or editorial</option>
            <option value="search">Search</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--lux-text)' }}>
            Tell us about your search <span aria-hidden="true">*</span>
          </label>
          <textarea
            name="message"
            rows={4}
            maxLength={2500}
            required
            placeholder="Property type, market, timeline, and any specific requirements."
            className="lux-textarea"
          />
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--lux-cta)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="lux-submit">
        {busy ? 'Sending…' : 'Request a Private Showing'}
      </button>

      <p className="lux-privacy">
        We&apos;ll only use this to reach you about properties and quiet correspondence. No newsletters,
        no third-party sharing, no automated sequences.
      </p>
    </form>
  )
}
