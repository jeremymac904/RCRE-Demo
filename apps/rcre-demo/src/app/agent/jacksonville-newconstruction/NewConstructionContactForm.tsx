'use client'
/**
 * NewConstructionContactForm — Lead capture for RCRE New Construction theme.
 *
 * Precise, timeline-driven form with lender status and community interest.
 * Uses captureLead() — no real comms.
 */

import { useState, type FormEvent } from 'react'
import type { AgentProfile } from '@/lib/agent-website/types'
import { captureLead } from '@/lib/agent-website/capture-lead'

interface Props {
  agent: AgentProfile
}

const COMMUNITIES = [
  'Nocatee',
  'Silverleaf',
  'Durbin Creek',
  'Jacksonville New Development',
  'St. Johns County',
  'Not sure yet',
]

const TIMELINES = [
  'Ready to buy now',
  'Within 3 months',
  '3 – 6 months',
  '6 – 12 months',
  'Just exploring',
]

const LENDER_STATUS = [
  'Pre-approved',
  'In process with a lender',
  'Not started yet',
]

export function NewConstructionContactForm({ agent }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([])
  const [selectedTimeline, setSelectedTimeline] = useState<string>('')
  const [selectedLender, setSelectedLender] = useState<string>('')

  function toggleCommunity(v: string) {
    setSelectedCommunities((prev) =>
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
          selectedCommunities.length ? `Communities: ${selectedCommunities.join(', ')}` : null,
          selectedTimeline ? `Timeline: ${selectedTimeline}` : null,
          selectedLender ? `Lender status: ${selectedLender}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || undefined,
      budget: f.get('budget') as string || undefined,
      landingPage: '/agent/jacksonville-newconstruction/contact',
    })

    if (result.accepted) {
      setReferenceId(result.referenceId)
      setDone(true)
      form.reset()
      setSelectedCommunities([])
      setSelectedTimeline('')
      setSelectedLender('')
    } else {
      setError('Your inquiry could not be recorded. Please try again.')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="nc-success" role="status">
        <h3>Your inquiry is on its way.</h3>
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
            border: '1px solid var(--nc-border)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: 'var(--nc-muted)',
            fontFamily: 'var(--nc-font-body)',
          }}
        >
          Submit another inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="nc-form">
      <h2 className="nc-form-title">Start Your New Home Search</h2>
      <p className="nc-form-sub">
        Tell us which communities interest you, your timeline, and your financing status.
        I follow up personally — usually within one business day.
      </p>

      <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Name + Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--nc-text)' }}>
              Full name <span aria-hidden="true">*</span>
            </label>
            <input name="name" type="text" autoComplete="name" required maxLength={120} className="nc-input" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--nc-text)' }}>
              Email address <span aria-hidden="true">*</span>
            </label>
            <input name="email" type="email" autoComplete="email" required maxLength={200} className="nc-input" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--nc-text)' }}>
            Phone
          </label>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} className="nc-input" />
        </div>

        {/* Communities */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.625rem', color: 'var(--nc-text)' }}>
            Community interest
          </label>
          <div className="nc-checkbox-group">
            {COMMUNITIES.map((c) => (
              <label key={c} className="nc-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedCommunities.includes(c)}
                  onChange={() => toggleCommunity(c)}
                />
                {c}
              </label>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--nc-text)' }}>
            Purchase timeline
          </label>
          <select
            className="nc-select"
            value={selectedTimeline}
            onChange={(e) => setSelectedTimeline(e.target.value)}
          >
            <option value="">— Select —</option>
            {TIMELINES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Budget */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--nc-text)' }}>
            Budget range
          </label>
          <select name="budget" className="nc-select">
            <option value="">— Select —</option>
            <option>Under $400K</option>
            <option>$400K – $600K</option>
            <option>$600K – $800K</option>
            <option>$800K – $1M</option>
            <option>$1M+</option>
            <option>Flexible</option>
          </select>
        </div>

        {/* Lender status */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.625rem', color: 'var(--nc-text)' }}>
            Pre-approval status
          </label>
          <div className="nc-checkbox-group">
            {LENDER_STATUS.map((s) => (
              <label key={s} className="nc-checkbox-label">
                <input
                  type="radio"
                  name="lender_status"
                  value={s}
                  checked={selectedLender === s}
                  onChange={() => setSelectedLender(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--nc-text)' }}>
            Anything specific? <span aria-hidden="true">*</span>
          </label>
          <textarea
            name="message"
            rows={4}
            maxLength={2500}
            required
            placeholder="Lot preference, floorplan, specific features, design center questions, or builder questions."
            className="nc-textarea"
          />
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--nc-cta)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="nc-submit">
        {busy ? 'Sending…' : 'Explore New Homes'}
      </button>

      <p className="nc-privacy">
        We&apos;ll only use this to reach you about new construction opportunities in Northeast Florida. No spam.
      </p>
    </form>
  )
}
