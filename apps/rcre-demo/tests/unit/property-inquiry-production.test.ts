import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/property-inquiries/route'
import { deleteRecord, getRecord, putRecord, readRecords } from '@/lib/platform/store'
import { makeSyntheticProperty } from '@/lib/property/fixtures'

afterEach(() => vi.unstubAllEnvs())

describe('property inquiry capture', () => {
  it('fails with a truthful unavailable response in production before touching fixture storage', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_APP_MODE', 'local')
    const req = new NextRequest('https://rcre.test/api/property-inquiries', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        submissionId: '2f0ad67a-9539-48ba-81f3-508f276f08cc', name: 'Demo User', email: 'demo@example.com',
        message: 'Please share more information.', listingId: 'fixture-property-0000001', providerId: 'rcre-demo-fixtures',
        mlsListingId: 'DEMO-000001', market: 'Florida', landingPage: '/homes/demo', consent: true,
      }),
    })
    const response = await POST(req)
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('cannot receive requests') })
  })

  it('persists an attributed local inquiry once and keeps the agent owner', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('RCRE_APP_MODE', 'local')
    const member = {
      id: 'property-test-molly', email: 'molly@rcregroup.com', organizationId: 'rcre-local', officeId: 'fl', role: 'agent',
      actor: { id: 'property-test-molly', userId: 'property-test-molly', organizationId: 'rcre-local', role: 'agent', name: 'Molly Plude', market: 'Florida', teamId: 'fl', officeId: 'fl' },
    }
    putRecord('members', member)
    const property = makeSyntheticProperty(0)
    const payload = {
      submissionId: '2f0ad67a-9539-48ba-81f3-508f276f08cd', name: 'Demo User', email: 'property@example.com',
      message: 'Please share more information.', listingId: property.id, providerId: property.providerId,
      mlsListingId: property.mlsListingId, market: 'Florida', agentWebsiteSlug: 'molly-plude',
      landingPage: '/agent/molly-plude/listings', utmSource: 'newsletter', utmCampaign: 'fall', consent: true,
    }
    const makeRequest = () => new NextRequest('http://rcre.test/api/property-inquiries', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    })
    const first = await POST(makeRequest())
    const firstBody = await first.json()
    expect(first.status).toBe(201)
    expect(firstBody).toMatchObject({ status: 'saved_locally', persistence: 'local_review_only' })
    expect(getRecord<any>('inquiries', firstBody.id)).toMatchObject({ ownerId: member.id, source: 'Agent Website', listingId: property.id, providerId: property.providerId, utmSource: 'newsletter', utmCampaign: 'fall' })
    const second = await POST(makeRequest())
    expect(second.status).toBe(200)
    expect(await second.json()).toMatchObject({ id: firstBody.id, duplicate: true })
    expect(readRecords<any>('inquiries').filter(record => record.id === firstBody.id)).toHaveLength(1)
    expect(readRecords<any>('contacts').filter(record => record.email === payload.email)).toHaveLength(1)
    deleteRecord('members', member.id)
  })

})
