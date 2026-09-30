import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getProperty, fixturesEnabled } from '@/lib/property/service'
import { assertIntakeAllowed, IntakeError, persistLocalIntake } from '@/lib/public/intake'

export const runtime = 'nodejs'

const schema = z.object({
  submissionId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(250),
  phone: z.string().trim().max(80).optional(),
  message: z.string().trim().min(3).max(3000),
  listingId: z.string().trim().min(1).max(120),
  providerId: z.string().trim().min(1).max(100),
  mlsListingId: z.string().trim().min(1).max(120),
  market: z.enum(['Alabama', 'Florida']),
  agentWebsiteSlug: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
  landingPage: z.string().trim().min(1).max(500),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  utmTerm: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
})

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  try {
    const length = Number(req.headers.get('content-length') ?? 0)
    if (length > 20_000) return fail('Request is too large.', 413)
    const input = schema.parse(await req.json())
    assertIntakeAllowed(req, input.submissionId, input.website)
    const listing = await getProperty(input.listingId)
    if (!listing || listing.providerId !== input.providerId || listing.mlsListingId !== input.mlsListingId) {
      return fail('Property details changed. Reload the property and try again.', 409)
    }
    if (!fixturesEnabled() && listing.fixture) return fail('This property is not available.', 404)
    const propertyAddress = [listing.streetNumber, listing.streetName, listing.unitNumber, listing.city, listing.stateOrProvince, listing.postalCode].filter(Boolean).join(' ')
    const saved = persistLocalIntake({
      ...input,
      kind: 'property',
      agentSlug: input.agentWebsiteSlug,
      propertyAddress,
    })
    return NextResponse.json({
      ...saved,
      message: 'Your request has been saved locally. No message was sent and no appointment is confirmed.',
    }, { status: saved.duplicate ? 200 : 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof IntakeError) return fail(error.message, error.status)
    if (error instanceof z.ZodError) return fail('Complete the required contact fields and consent to be contacted.', 400)
    return fail('We cannot receive requests right now. Please try again later.', 503)
  }
}
