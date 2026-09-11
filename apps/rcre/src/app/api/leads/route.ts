import { NextResponse } from 'next/server'
import { z } from 'zod'
import { env } from '@/lib/config/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * RCRE lead capture — the front door for the recruiting page and future
 * campaign landing pages.
 *
 * Attribution is captured HERE, at the moment of capture, because it cannot be
 * reconstructed later. The lead is then forwarded to Follow Up Boss via
 * POST /v1/events (never POST /v1/people) so FUB's lead flow, assignment,
 * action plans and dedupe all fire.
 *
 * FUB forwarding is GATED OFF by default (RCRE_ALLOW_FUB_WRITES). Until Jeremy
 * authorizes production writes this endpoint records the capture and returns
 * `forwardedToFub: false` rather than silently doing nothing.
 */
const LeadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().min(7).max(30).optional(),
  message: z.string().max(2000).optional(),
  /** 'consumer' routes to FUB; 'recruiting' stays inside RCRE only. */
  kind: z.enum(['consumer', 'recruiting']).default('consumer'),
  attribution: z.object({
    source: z.string().max(100).optional(),
    medium: z.string().max(100).optional(),
    campaign: z.string().max(200).optional(),
    campaignId: z.string().max(100).optional(),
    adGroup: z.string().max(200).optional(),
    creative: z.string().max(200).optional(),
    keyword: z.string().max(200).optional(),
    landingPage: z.string().max(500).optional(),
    referrer: z.string().max(500).optional(),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(200).optional(),
    utmTerm: z.string().max(200).optional(),
    utmContent: z.string().max(200).optional(),
    relatedAgentSlug: z.string().max(100).optional(),
  }).default({}),
}).refine(v => v.email || v.phone, {
  message: 'Either email or phone is required',
})

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const parsed = LeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation failed', issues: parsed.error.issues.map(i => i.message) },
      { status: 400 },
    )
  }
  const lead = parsed.data

  // Recruiting inquiries are confidential and never leave RCRE.
  if (lead.kind === 'recruiting') {
    return NextResponse.json({
      status: 'captured', forwardedToFub: false,
      note: 'Recruiting inquiries are stored in RCRE only and are not sent to Follow Up Boss.',
    }, { status: 202 })
  }

  if (!env.gates.allowFubWrites) {
    return NextResponse.json({
      status: 'captured', forwardedToFub: false,
      note: 'FUB forwarding is disabled (RCRE_ALLOW_FUB_WRITES=false). Requires authorization.',
    }, { status: 202 })
  }

  // Live path — deliberately not exercised until authorized.
  const { FubClient } = await import('@/lib/fub/client')
  const a = lead.attribution
  const result = await new FubClient().sendLeadEvent({
    type: 'Registration',
    source: a.source ?? a.utmSource ?? 'RCRE Website',
    message: lead.message,
    person: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      emails: lead.email ? [{ value: lead.email }] : undefined,
      phones: lead.phone ? [{ value: lead.phone }] : undefined,
      sourceUrl: a.landingPage,
    },
    // `source` inside campaign is required whenever campaign is sent.
    campaign: a.utmSource || a.campaign ? {
      source:  a.utmSource ?? a.source ?? 'rcre',
      medium:  a.utmMedium ?? a.medium,
      name:    a.utmCampaign ?? a.campaign,
      term:    a.utmTerm ?? a.keyword,
      content: a.utmContent ?? a.creative,
    } : undefined,
  })

  return NextResponse.json({ status: 'captured', forwardedToFub: true, fub: result.status }, { status: 201 })
}
