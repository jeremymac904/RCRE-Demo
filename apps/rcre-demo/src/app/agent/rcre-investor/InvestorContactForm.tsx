'use client'
/**
 * InvestorContactForm — Lead capture for RCRE Investor theme.
 *
 * Numbers-forward form with budget field (required), strategy dropdown,
 * and investment timeline. Uses captureLead() — no real comms.
 */

import { useState, type FormEvent } from 'react'
import type { AgentProfile } from '@/lib/agent-website/types'
import { captureLead } from '@/lib/agent-website/capture-lead'

interface Props {
  agent: AgentProfile
}

const STRATEGIES = [
  { value: 'brrrr', label: 'BRRRR (Buy, Rehab, Rent, Refinance, Repeat)' },
  { value: 'long-term', label: 'Long-Term Rental' },
  { value: 'short-term', label: 'Short-Term Rental (STR)' },
  { value: 'fix-and-flip', label: 'Fix-and-Flip' },
  { value: 'multi-family', label: 'Multi-Family' },
  { value: 'portfolio', label: 'Portfolio Build' },
  { value: 'other', label: 'Other / Not Sure Yet' },
]

const TIMELINES = [
  { value: 'immediate', label: 'Immediately (under 30 days)' },
  { value: '30-90', label: '30 – 90 days' },
  { value: '90-180', label: '90 – 180 days' },
  { value: 'exploring', label: 'Just exploring' },
]

export function InvestorContactForm({ agent }: Props) {
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
      type: 'investor',
      name: f.get('name') as string || undefined,
      email: f.get('email') as string || undefined,
      phone: f.get('phone') as string || undefined,
      message: f.get('message') as string || undefined,
      budget: f.get('budget') as string || undefined,
      timeline: f.get('timeline') as string || undefined,
      propertyInterest: f.get('strategy') as string || undefined,
      landingPage: '/agent/investor/contact',
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
      <div className="inv-success" role="status">
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--inv-primary)' }}>
          Inquiry recorded.
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--inv-muted)', marginBottom: '0.5rem' }}>
          Reference: <span style={{ fontFamily: 'var(--inv-font-mono)' }}>{referenceId}</span>
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--inv-muted)' }}>
          This is a local review environment. No investment consultation is confirmed.
        </p>
        <button
          onClick={() => { setDone(false); setReferenceId('') }}
          style={{
            marginTop: '1.25rem',
            background: 'none',
            border: '1px solid var(--inv-border)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: 'var(--inv-muted)',
            fontFamily: 'var(--inv-font-body)',
            borderRadius: 'var(--inv-radius)',
          }}
        >
          Submit another inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="inv-form">
      <h2
        style={{
          fontFamily: 'var(--inv-font-display)',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--inv-primary)',
          letterSpacing: '-0.015em',
          marginBottom: '0.5rem',
        }}
      >
        Pre-Qualify for Deals
      </h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--inv-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        I share current deals with pre-qualified investors first. Share a few details to get started.
      </p>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Budget — required */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--inv-primary)',
            }}
          >
            Investment budget (required) <span aria-hidden="true">*</span>
          </label>
          <select name="budget" required className="inv-select">
            <option value="">— Select budget range —</option>
            <option>$50K – $100K</option>
            <option>$100K – $200K</option>
            <option>$200K – $350K</option>
            <option>$350K – $500K</option>
            <option>$500K – $1M</option>
            <option>$1M+</option>
          </select>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--inv-primary)',
            }}
          >
            Full name <span aria-hidden="true">*</span>
          </label>
          <input name="name" type="text" autoComplete="name" required maxLength={120} className="inv-input" />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--inv-primary)',
            }}
          >
            Email address <span aria-hidden="true">*</span>
          </label>
          <input name="email" type="email" autoComplete="email" required maxLength={200} className="inv-input" />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--inv-primary)',
            }}
          >
            Phone (optional)
          </label>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} className="inv-input" />
        </div>

        {/* Strategy */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--inv-primary)',
            }}
          >
            Investment strategy
          </label>
          <select name="strategy" className="inv-select">
            <option value="">— Select strategy —</option>
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Timeline */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--inv-primary)',
            }}
          >
            Acquisition timeline
          </label>
          <select name="timeline" className="inv-select">
            <option value="">— Select timeline —</option>
            {TIMELINES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
              color: 'var(--inv-primary)',
            }}
          >
            Notes <span aria-hidden="true">*</span>
          </label>
          <textarea
            name="message"
            rows={4}
            maxLength={2500}
            required
            placeholder="Target markets, property types, specific goals."
            className="inv-textarea"
          />
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="inv-submit">
        {busy ? 'Sending…' : 'Submit for Deal Access'}
      </button>

      <p className="inv-privacy">
        Cap rates, cash-on-cash, and IRR projections are estimates only. Past performance is not
        indicative of future results. Nothing here constitutes investment advice.
      </p>
    </form>
  )
}
