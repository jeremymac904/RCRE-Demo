import { describe, expect, it } from 'vitest'
import { trustedKnowledgeActor } from '@/app/api/knowledge/route'
import type { PlatformActor } from '@/lib/platform/auth'

function actor(overrides: Partial<PlatformActor> = {}): PlatformActor {
  return { id: '20000000-0000-4000-8000-000000000001', userId: '20000000-0000-4000-8000-000000000001', organizationId: '10000000-0000-4000-8000-000000000001', role: 'agent', name: 'Agent', market: 'Unknown', teamId: '', officeId: '', ...overrides }
}

describe('knowledge state scope', () => {
  it('fails closed for non-owner accounts without a verified state', () => {
    expect(trustedKnowledgeActor(actor()).states).toEqual([])
  })

  it('uses only the authenticated member state and reserves cross-state access for owner', () => {
    expect(trustedKnowledgeActor(actor({ officeId: 'fl' })).states).toEqual(['FL'])
    expect(trustedKnowledgeActor(actor({ role: 'broker_owner', officeId: 'all' })).states).toEqual(['AL', 'FL'])
  })
})
