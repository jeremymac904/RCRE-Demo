'use client'
/**
 * Lead Form Component
 *
 * Generic lead capture form for agent websites.
 * Calls captureLead() via internal API route.
 * Reads UTM params from the current URL.
 */

import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { captureLead } from '@/lib/agent-website/capture-lead'

type InquiryType = 'buyer' | 'seller' | 'valuation' | 'relocation' | 'general' | 'investor' | 'preferred_lender'

interface Props {
  agentSlug: string
  type?: InquiryType
  title?: string
  subtitle?: string
  showTypeSelect?: boolean
}

export function LeadForm({
  agentSlug,
  type: initialType = 'general',
  title = 'Get in Touch',
  subtitle,
  showTypeSelect = true,
}: Props) {
  const searchParams = useSearchParams()
  const [type, setType] = useState<InquiryType>(initialType)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')

  function getUtmParams() {
    return {
      utmSource: searchParams.get('utm_source') || undefined,
      utmMedium: searchParams.get('utm_medium') || undefined,
      utmCampaign: searchParams.get('utm_campaign') || undefined,
      utmContent: searchParams.get('utm_content') || undefined,
      utmTerm: searchParams.get('utm_term') || undefined,
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const form = e.currentTarget
    const f = new FormData(form)

    try {
      const result = captureLead({
        agentSlug,
        type,
        name: f.get('name') as string || undefined,
        email: f.get('email') as string || undefined,
        phone: f.get('phone') as string || undefined,
        message: f.get('message') as string || undefined,
        propertyInterest: f.get('propertyInterest') as string || undefined,
        budget: f.get('budget') as string || undefined,
        timeline: f.get('timeline') as string || undefined,
        landingPage: typeof window !== 'undefined' ? window.location.pathname : undefined,
        ...getUtmParams(),
      })

      if (result.accepted) {
        setReferenceId(result.referenceId)
        setDone(true)
        form.reset()
        setType(initialType)
      } else {
        setError('Your inquiry could not be saved. Please try again.')
      }
    } catch {
      setError('Connection unavailable. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div
        role="status"
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '4px',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#166534' }}>
          Thank you — your inquiry is recorded.
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '1rem' }}>
          Reference: {referenceId}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>
          This is a local review environment. No message has been sent and no appointment is confirmed.
        </p>
        <button
          onClick={() => { setDone(false); setReferenceId('') }}
          style={{
            backgroundColor: '#e5e0d8',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Submit another inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {title && <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{title}</h3>}
      {subtitle && <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.25rem' }}>{subtitle}</p>}

      {showTypeSelect && (
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="inquiry-type"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}
          >
            Inquiry type
          </label>
          <select
            id="inquiry-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as InquiryType)}
            required
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              border: '1px solid #e5e0d8',
              borderRadius: '4px',
              fontSize: '0.9rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="general">General inquiry</option>
            <option value="buyer">I am looking to buy</option>
            <option value="seller">I am looking to sell</option>
            <option value="valuation">Home valuation request</option>
            <option value="relocation">Relocation assistance</option>
            <option value="investor">Investment inquiry</option>
            <option value="preferred_lender">Preferred lender inquiry</option>
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label htmlFor="lf-name" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Full name <span aria-hidden="true">*</span>
          </label>
          <input
            id="lf-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            style={inputStyle()}
          />
        </div>

        <div>
          <label htmlFor="lf-email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Email address <span aria-hidden="true">*</span>
          </label>
          <input
            id="lf-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            style={inputStyle()}
          />
        </div>

        <div>
          <label htmlFor="lf-phone" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Phone (optional)
          </label>
          <input
            id="lf-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            style={inputStyle()}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="lf-message" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="lf-message"
          name="message"
          rows={4}
          maxLength={2500}
          required
          placeholder="Share your timeline and what you're looking for."
          style={{ ...inputStyle(), resize: 'vertical' }}
        />
      </div>

      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
        Do not include SSNs, account credentials, tax returns, or other sensitive financial information in this form.
      </p>

      {error && (
        <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        style={{
          backgroundColor: '#c9a84c',
          color: '#ffffff',
          border: 'none',
          padding: '0.75rem 2rem',
          borderRadius: '4px',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.7 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {busy ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #e5e0d8',
    borderRadius: '4px',
    fontSize: '0.9rem',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  }
}
