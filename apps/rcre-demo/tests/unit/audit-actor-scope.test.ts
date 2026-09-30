import { afterEach, describe, expect, it } from 'vitest'
import { PERSONAS } from '../../src/lib/platform/auth'
import { audit } from '../../src/lib/platform/service'
import { deleteRecord, readRecords } from '../../src/lib/platform/store'

const actor = PERSONAS.find(person => person.id === 'u-sarah')!
const originalAppMode = process.env.RCRE_APP_MODE
const createdIds: string[] = []

afterEach(() => {
  for (const row of readRecords<any>('audit')) {
    if (createdIds.includes(row.id)) deleteRecord('audit', row.id)
  }
  createdIds.length = 0
  if (originalAppMode === undefined) delete process.env.RCRE_APP_MODE
  else process.env.RCRE_APP_MODE = originalAppMode
})

describe('actor-scoped audit records', () => {
  it('records the authenticated actor, organization, role, and office', () => {
    process.env.RCRE_APP_MODE = 'production'
    audit(actor, 'test.action', 'resource-1')
    const row = readRecords<any>('audit').find(item => item.action === 'test.action' && item.resource === 'resource-1')!
    createdIds.push(row.id)
    expect(row).toMatchObject({
      organizationId: actor.organizationId,
      actorId: actor.id,
      actorType: 'user',
      actorRole: actor.role,
      officeId: actor.officeId,
      action: 'test.action',
    })
  })

  it('rejects incomplete or mismatched identities before creating an audit event', () => {
    const before = readRecords<any>('audit').length
    expect(() => audit({ ...actor, userId: 'different-user' }, 'test.action', 'resource-2')).toThrow(/scoped actor identity/i)
    expect(() => audit({ ...actor, organizationId: '' }, 'test.action', 'resource-3')).toThrow(/scoped actor identity/i)
    expect(readRecords<any>('audit')).toHaveLength(before)
  })

  it('records a local worker as an explicitly scoped system actor only in local mode', () => {
    process.env.RCRE_APP_MODE = 'local'
    const localWorker = { ...actor, id: 'local-worker', userId: 'local-worker', role: 'broker_owner' as const }
    audit(localWorker, 'worker.completed', 'local-batch')
    const row = readRecords<any>('audit').find(item => item.action === 'worker.completed' && item.resource === 'local-batch')!
    createdIds.push(row.id)
    expect(row).toMatchObject({ organizationId: 'rcre-local', actorId: 'system:local-worker', actorType: 'system', actorRole: 'system', officeId: null })
  })
})
