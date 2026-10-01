import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  actorOrNull: vi.fn(),
  academyManageData: vi.fn(),
  recordCaughtRouteFailure: vi.fn(),
  getProperty: vi.fn(),
  fixturesEnabled: vi.fn(),
  assertIntakeAllowed: vi.fn(),
  persistIntake: vi.fn(),
}))

vi.mock('@/lib/platform/auth', () => ({ actorOrNull: mocks.actorOrNull, AccessError: class AccessError extends Error { status = 403 } }))
vi.mock('@/lib/academy-durable', () => ({ academyManageData: mocks.academyManageData }))
vi.mock('@/lib/operations/caught-route-failure', () => ({ recordCaughtRouteFailure: mocks.recordCaughtRouteFailure }))
vi.mock('@/lib/property/service', () => ({ getProperty: mocks.getProperty, fixturesEnabled: mocks.fixturesEnabled }))
vi.mock('@/lib/public/intake', () => ({
  IntakeError: class IntakeError extends Error { status = 400 },
  assertIntakeAllowed: mocks.assertIntakeAllowed,
  persistIntake: mocks.persistIntake,
}))

import { GET as academyManageGet } from '@/app/api/academy/manage/route'
import { POST as propertyInquiryPost } from '@/app/api/property-inquiries/route'

const actor = { id: 'agent-1', userId: 'agent-1', organizationId: 'org-1', role: 'agent', name: 'Agent', market: 'Florida', officeId: 'fl', teamId: 'fl' }
const listing = { id: 'listing-1', providerId: 'provider-1', mlsListingId: 'mls-1', fixture: false, streetNumber: '1', streetName: 'Main St', city: 'Jacksonville', stateOrProvince: 'FL', postalCode: '32202' }

afterEach(() => vi.clearAllMocks())

describe('route-local failure telemetry wiring', () => {
  it('captures an authenticated Academy service failure while preserving the route response', async () => {
    mocks.actorOrNull.mockResolvedValue(actor)
    mocks.academyManageData.mockRejectedValue(new Error('db detail with private content'))
    const request = new Request('https://rcre.test/api/academy/manage')
    const response = await academyManageGet(request)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Training data is temporarily unavailable. No changes were saved.' })
    expect(mocks.recordCaughtRouteFailure).toHaveBeenCalledWith(request, '/api/academy/manage', actor, 503, expect.any(Error))
  })

  it('captures anonymous property persistence failures but skips validation failures', async () => {
    mocks.getProperty.mockResolvedValue(listing)
    mocks.fixturesEnabled.mockReturnValue(false)
    mocks.assertIntakeAllowed.mockResolvedValue(undefined)
    mocks.persistIntake.mockRejectedValue(new Error('database detail'))
    const input = {
      submissionId: '11111111-1111-4111-8111-111111111111', name: 'Demo Consumer', email: 'consumer@example.test', message: 'Please share details.',
      listingId: 'listing-1', providerId: 'provider-1', mlsListingId: 'mls-1', market: 'Florida', landingPage: '/homes/listing-1', consent: true,
    }
    const request = new Request('https://rcre.test/api/property-inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
    const response = await propertyInquiryPost(request as never)
    expect(response.status).toBe(503)
    expect(mocks.recordCaughtRouteFailure).toHaveBeenCalledWith(request, '/api/property-inquiries', null, 503, expect.any(Error))

    mocks.recordCaughtRouteFailure.mockClear()
    const invalid = await propertyInquiryPost(new Request('https://rcre.test/api/property-inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }) as never)
    expect(invalid.status).toBe(400)
    expect(mocks.recordCaughtRouteFailure).not.toHaveBeenCalled()
  })
})
