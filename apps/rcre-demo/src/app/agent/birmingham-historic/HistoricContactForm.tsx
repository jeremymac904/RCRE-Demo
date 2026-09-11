'use client'
/**
 * HistoricContactForm — Lead capture for RCRE Historic Heritage theme.
 *
 * Editorial, unhurried form with architectural style and legacy inquiry options.
 * Uses captureLead() — no real comms.
 */

import { useState, type FormEvent } from 'react'
import type { AgentProfile } from '@/lib/agent-website/types'
import { captureLead } from '@/lib/agent-website/capture-lead'

interface Props {
  agent: AgentProfile
}

const ARCH_STYLES = [
  'Tudor Revival',
  'Craftsman / Bungalow',
  'Colonial Revival',
  'Victorian',
  'Mid-Century Modern',
  'Mediterranean Revival',
  'Not sure — needs assessment',
  'Other',
]

const INQUIRY_TYPES = [
  'Buying a historic home',
  'Selling a historic property',
  'Estate / trust sale',
  'Renovation feasibility',
  'Preservation consultation',
  'General inquiry',
]

export function HistoricContactForm({ agent }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedInquiry, setSelectedInquiry] = useState<string[]>([])

  function toggleStyle(v: string) {
    setSelectedStyles((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
  }

  function toggleInquiry(v: string) {
    setSelectedInquiry((prev) =>
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
        [
          selectedStyles.length ? `Architectural styles: ${selectedStyles.join(', ')}` : null,
          selectedInquiry.length ? `Inquiry type: ${selectedInquiry.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || undefined,
      landingPage: '/agent/birmingham-historic/contact',
    })

    if (result.accepted) {
      setReferenceId(result.referenceId)
      setDone(true)
      form.reset()
      setSelectedStyles([])
      setSelectedInquiry([])
    } else {
      setError('Your inquiry could not be recorded. Please try again.')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="hh-success" role="status">
        <h3>Thank you — your inquiry is received.</h3>
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
            border: '1px solid var(--hh-border)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: 'var(--hh-muted)',
            fontFamily: 'var(--hh-font-body)',
          }}
        >
          Submit another inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="hh-form">
      <h2 className="hh-form-title">Tell us about the property you&apos;re considering.</h2>
      <p className="hh-form-sub">
        Share the address or neighborhood, the architectural style that interests you,
        and the nature of your inquiry. I follow up personally — usually within one to two business days.
      </p>

      <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Name + Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--hh-font-body)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--hh-text)' }}>
              Full name <span aria-hidden="true">*</span>
            </label>
            <input name="name" type="text" autoComplete="name" required maxLength={120} className="hh-input" />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--hh-font-body)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--hh-text)' }}>
              Email address <span aria-hidden="true">*</span>
            </label>
            <input name="email" type="email" autoComplete="email" required maxLength={200} className="hh-input" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--hh-font-body)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--hh-text)' }}>
            Phone
          </label>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} className="hh-input" />
        </div>

        {/* Inquiry type */}
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--hh-font-body)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.625rem', color: 'var(--hh-text)' }}>
            Nature of inquiry
          </label>
          <div className="hh-checkbox-group">
            {INQUIRY_TYPES.map((t) => (
              <label key={t} className="hh-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedInquiry.includes(t)}
                  onChange={() => toggleInquiry(t)}
                />
                {t}
              </label>
            ))}
          </div>
        </div>

        {/* Architectural style */}
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--hh-font-body)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.625rem', color: 'var(--hh-text)' }}>
            Architectural style interest
          </label>
          <div className="hh-checkbox-group">
            {ARCH_STYLES.map((s) => (
              <label key={s} className="hh-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedStyles.includes(s)}
                  onChange={() => toggleStyle(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--hh-font-body)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--hh-text)' }}>
            Property or neighborhood details <span aria-hidden="true">*</span>
          </label>
          <textarea
            name="message"
            rows={5}
            maxLength={2500}
            required
            placeholder="Address or neighborhood of interest, known history of the property, renovation plans, or questions about a specific structure."
            className="hh-textarea"
          />
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--hh-cta)', fontFamily: 'var(--hh-font-body)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="hh-submit">
        {busy ? 'Sending…' : 'Schedule a Consultation'}
      </button>

      <p className="hh-privacy">
        We&apos;ll only use this to follow up about historic properties and preservation in Birmingham.
      </p>
    </form>
  )
}
