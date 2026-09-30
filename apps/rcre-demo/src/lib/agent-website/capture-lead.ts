/** Client-side transport for an agent-site inquiry. A success value is returned
 * only after the server confirms that the local review record was persisted. */
export type LeadType = 'buyer' | 'seller' | 'valuation' | 'relocation' | 'general' | 'investor' | 'preferred_lender'

export interface CreateLeadInput {
  agentSlug: string
  type: LeadType
  name?: string
  email?: string
  phone?: string
  message?: string
  propertyInterest?: string
  budget?: string
  timeline?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  landingPage?: string
  honeypot?: string
}

export interface CapturedLead { referenceId: string; accepted: boolean; persistence?: 'local_review_only'; error?: string }
const pending = new Map<string, string>()

export async function captureLead(input: CreateLeadInput): Promise<CapturedLead> {
  const key = JSON.stringify(input)
  const submissionId = pending.get(key) ?? crypto.randomUUID()
  pending.set(key, submissionId)
  try {
  const params = new URLSearchParams(window.location.search)
  const response = await fetch('/api/platform/inquiries', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId, kind: input.type, name: input.name, email: input.email, phone: input.phone,
      message: [input.message, input.propertyInterest && `Property interest: ${input.propertyInterest}`,
        input.budget && `Price range: ${input.budget}`, input.timeline && `Timeline: ${input.timeline}`].filter(Boolean).join('\n'),
      market: params.get('market') || undefined, agentSlug: input.agentSlug,
      referrer: document.referrer || undefined,
      landingPage: input.landingPage || window.location.pathname,
      utmSource: input.utmSource ?? params.get('utm_source') ?? undefined,
      utmMedium: input.utmMedium ?? params.get('utm_medium') ?? undefined,
      utmCampaign: input.utmCampaign ?? params.get('utm_campaign') ?? undefined,
      utmContent: input.utmContent ?? params.get('utm_content') ?? undefined,
      utmTerm: input.utmTerm ?? params.get('utm_term') ?? undefined,
      consent: false, website: input.honeypot ?? '',
    }),
  })
  let result: { id?: string; status?: string; persistence?: string; error?: string }
  try { result = await response.json() } catch { throw new Error('Your request could not be confirmed. Please try again.') }
  if (!response.ok || result.status !== 'saved_locally' || result.persistence !== 'local_review_only' || !result.id) {
    throw new Error(result.error || 'Your request could not be saved. Please try again later.')
  }
  pending.delete(key)
  return { referenceId: result.id, accepted: true, persistence: 'local_review_only' }
  } catch (error) {
    return { referenceId: '', accepted: false, error: error instanceof Error ? error.message : 'Your request could not be saved. Please try again.' }
  }
}
