'use client'
/**
 * SuburbanContactForm — Lead capture for RCRE Suburban Family theme.
 *
 * Warm, neighborly form with school district preference.
 * Uses captureLead() — no real comms.
 */

import { useState, type FormEvent } from 'react'
import type { AgentProfile } from '@/lib/agent-website/types'
import { captureLead } from '@/lib/agent-website/capture-lead'

interface Props {
  agent: AgentProfile
}

const SCHOOL_DISTRICTS = [
  { value: 'st-johns', label: 'St. Johns County' },
  { value: 'duval', label: 'Duval County' },
  { value: 'clay', label: 'Clay County' },
  { value: 'birmingham', label: 'Birmingham / Jefferson County' },
  { value: 'not-sure', label: 'Not sure yet' },
]

export function SuburbanContactForm({ agent }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')

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
      propertyInterest: f.get('schoolDistrict') as string || undefined,
      budget: f.get('budget') as string || undefined,
      landingPage: '/agent/family/contact',
    })

    if (result.accepted) {
      setReferenceId(result.referenceId)
      setDone(true)
      form.reset()
    } else {
      setError('Your inquiry could not be recorded. Please try again.')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="sub-success" role="status">
        <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--sub-primary)' }}>
          Thank you — we&apos;ll be in touch soon.
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--sub-muted)', marginBottom: '0.5rem' }}>
          Reference: <strong>{referenceId}</strong>
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--sub-muted)' }}>
          This is a local review environment. No appointment is confirmed.
        </p>
        <button
          onClick={() => { setDone(false); setReferenceId('') }}
          style={{
            marginTop: '1.25rem',
            background: 'none',
            border: '1px solid var(--sub-border)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: 'var(--sub-muted)',
            fontFamily: 'var(--sub-font-body)',
            borderRadius: 'var(--sub-radius)',
          }}
        >
          Submit another inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="sub-form">
      <h2
        style={{
          fontFamily: 'var(--sub-font-display)',
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--sub-primary)',
          marginBottom: '0.5rem',
        }}
      >
        Tell Us About Your Family
      </h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--sub-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Share a bit about what you&apos;re looking for and we&apos;ll follow up with the right information for your search.
      </p>

      <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '0.375rem',
              color: 'var(--sub-primary)',
            }}
          >
            Full name <span aria-hidden="true">*</span>
          </label>
          <input name="name" type="text" autoComplete="name" required maxLength={120} className="sub-input" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '0.375rem',
                color: 'var(--sub-primary)',
              }}
            >
              Email address <span aria-hidden="true">*</span>
            </label>
            <input name="email" type="email" autoComplete="email" required maxLength={200} className="sub-input" />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '0.375rem',
                color: 'var(--sub-primary)',
              }}
            >
              Phone (optional)
            </label>
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} className="sub-input" />
          </div>
        </div>

        {/* School district */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '0.375rem',
              color: 'var(--sub-primary)',
            }}
          >
            School district preference
          </label>
          <select name="schoolDistrict" className="sub-select">
            <option value="">— Select district —</option>
            {SCHOOL_DISTRICTS.map((d) => (
              <option key={d.value} value={d.label}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Budget */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '0.375rem',
              color: 'var(--sub-primary)',
            }}
          >
            Budget range
          </label>
          <select name="budget" className="sub-select">
            <option value="">— Select range —</option>
            <option>Under $300K</option>
            <option>$300K – $450K</option>
            <option>$450K – $600K</option>
            <option>$600K – $800K</option>
            <option>$800K – $1M</option>
            <option>$1M+</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '0.375rem',
              color: 'var(--sub-primary)',
            }}
          >
            What are you looking for? <span aria-hidden="true">*</span>
          </label>
          <textarea
            name="message"
            rows={4}
            maxLength={2500}
            required
            placeholder="Family size, bedroom/bathroom needs, community preferences, timeline."
            className="sub-textarea"
          />
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="sub-submit">
        {busy ? 'Sending…' : 'Start Our Search'}
      </button>

      <p className="sub-privacy">
        No spam. No third-party sharing. I follow up personally within one to two business days.
      </p>
    </form>
  )
}
