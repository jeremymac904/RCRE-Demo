'use client'
/**
 * UrbanContactForm — Lead capture for RCRE Urban Modern theme.
 *
 * Technical, transit-blue accents, inquiry type dropdown.
 * Uses captureLead() — no real comms.
 */

import { useState, type FormEvent } from 'react'
import type { AgentProfile } from '@/lib/agent-website/types'
import { captureLead } from '@/lib/agent-website/capture-lead'

interface Props {
  agent: AgentProfile
}

const INQUIRY_TYPES = [
  { value: 'tour', label: 'Schedule a Tour' },
  { value: 'off-market', label: 'Off-Market Inquiry' },
  { value: 'investment', label: 'Investment Inquiry' },
  { value: 'general', label: 'General' },
]

export function UrbanContactForm({ agent }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [inquiryType, setInquiryType] = useState('general')

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
      propertyInterest: inquiryType || undefined,
      landingPage: `/agent/${agent.slug}/contact`,
    })

    if (result.accepted) {
      setReferenceId(result.referenceId)
      setDone(true)
      form.reset()
      setInquiryType('general')
    } else {
      setError('Your inquiry could not be recorded. Please try again.')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="urban-success" role="status">
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--urban-primary)' }}>
          Inquiry recorded.
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--urban-muted)', marginBottom: '0.5rem' }}>
          Reference: <span style={{ fontFamily: 'var(--urban-font-mono)' }}>{referenceId}</span>
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--urban-muted)' }}>
          This is a local review environment. No appointment is confirmed.
        </p>
        <button
          onClick={() => { setDone(false); setReferenceId('') }}
          style={{
            marginTop: '1.25rem',
            background: 'none',
            border: '1px solid var(--urban-border)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: 'var(--urban-muted)',
            fontFamily: 'var(--urban-font-body)',
            borderRadius: 'var(--urban-radius)',
          }}
        >
          Submit another inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="urban-form">
      <h2
        style={{
          fontFamily: 'var(--urban-font-display)',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--urban-primary)',
          letterSpacing: '-0.015em',
          marginBottom: '0.5rem',
        }}
      >
        Get in Touch
      </h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--urban-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        I respond personally to every inquiry — usually within one business day.
      </p>

      {/* Inquiry type */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            marginBottom: '0.375rem',
            color: 'var(--urban-primary)',
            letterSpacing: '0.02em',
          }}
        >
          Inquiry type
        </label>
        <select
          value={inquiryType}
          onChange={(e) => setInquiryType(e.target.value)}
          className="urban-select"
        >
          {INQUIRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--urban-primary)',
            }}
          >
            Full name <span aria-hidden="true">*</span>
          </label>
          <input name="name" type="text" autoComplete="name" required maxLength={120} className="urban-input" />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--urban-primary)',
            }}
          >
            Email address <span aria-hidden="true">*</span>
          </label>
          <input name="email" type="email" autoComplete="email" required maxLength={200} className="urban-input" />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--urban-primary)',
            }}
          >
            Phone (optional)
          </label>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} className="urban-input" />
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            marginBottom: '0.375rem',
            color: 'var(--urban-primary)',
          }}
        >
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          name="message"
          rows={4}
          maxLength={2500}
          required
          placeholder="Neighborhood, building, timeline, and what you're looking for."
          className="urban-textarea"
        />
      </div>

      {error && (
        <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="urban-submit">
        {busy ? 'Sending…' : 'Send Message'}
      </button>

      <p className="urban-privacy">
        No third-party sharing. No automated sequences. I follow up personally.
      </p>
    </form>
  )
}
