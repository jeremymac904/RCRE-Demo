import { describe, expect, it } from 'vitest'
import { deleteRecord, getRecord, putRecord, readRecords } from '@/lib/platform/store'
import { IntakeError, persistLocalIntake } from '@/lib/public/intake'

const molly = {
  id: 'test-member-molly', email: 'molly@rcregroup.com', organizationId: 'rcre-local', officeId: 'fl', role: 'agent',
  actor: { id: 'test-member-molly', userId: 'test-member-molly', organizationId: 'rcre-local', role: 'agent', name: 'Molly Plude', market: 'Florida', teamId: 'fl', officeId: 'fl' },
}
const input = {
  submissionId: 'a0a8b2a4-f352-49cf-b4c0-6ea4a71b9a00', kind: 'buyer', name: 'Demo Client', email: 'client@example.com',
  message: 'Looking for a home.', market: 'Florida', agentSlug: 'molly-plude', consent: false,
  landingPage: '/agent/molly-plude/contact', utmSource: 'test-campaign',
}

describe('public intake persistence contract', () => {
  it('requires an active member whose email exactly matches the canonical public agent', () => {
    expect(() => persistLocalIntake(input)).toThrowError(IntakeError)
    putRecord('members', molly)
    const result = persistLocalIntake(input)
    expect(result).toMatchObject({ status: 'saved_locally', persistence: 'local_review_only', duplicate: false })
    expect(getRecord<any>('inquiries', result.id)).toMatchObject({ ownerId: molly.id, agentWebsiteSlug: 'molly-plude', utmSource: 'test-campaign' })
    expect(readRecords<any>('contacts').filter(row => row.email === input.email)).toHaveLength(1)
    deleteRecord('members', molly.id)
  })

  it('retries with the same submission key without duplicate inquiry or contact rows', () => {
    putRecord('members', molly)
    const first = persistLocalIntake(input)
    const second = persistLocalIntake(input)
    expect(second).toMatchObject({ id: first.id, duplicate: true })
    expect(readRecords<any>('inquiries').filter(row => row.id === first.id)).toHaveLength(1)
    expect(readRecords<any>('contacts').filter(row => row.email === input.email)).toHaveLength(1)
    deleteRecord('members', molly.id)
  })
})
