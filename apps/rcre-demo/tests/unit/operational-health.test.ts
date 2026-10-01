import { describe, expect, it } from 'vitest'
import { MemoryRepository, emptySeed, type Actor } from '@/lib/db/repository'
import { productionHealthSnapshot } from '@/lib/operations/production-health'
import { recordOperationalFailure } from '@/lib/operations/operational-errors'
import type { PlatformActor } from '@/lib/platform/auth'

const org = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const owner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const agent = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const platformActor: PlatformActor = { id: owner, userId: owner, organizationId: org, role: 'broker_owner', name: 'Broker', market: 'Both', teamId: 'all', officeId: 'all' }
const dbActor: Actor = { userId: owner, organizationId: org, role: 'owner' }

function repository() {
  const repo = new MemoryRepository({ ...emptySeed(), organizations: [{ id: org, name: 'RCRE', slug: 'rcre' }], users: [{ id: owner, organizationId: org, email: 'broker@example.test', fullName: 'Broker', role: 'owner', fubUserId: null, isActive: true, officeId: 'all' }, { id: agent, organizationId: org, email: 'agent@example.test', fullName: 'Agent', role: 'agent', fubUserId: null, isActive: true, officeId: 'fl' }] })
  return repo
}

describe('production operations health and durable error records', () => {
  it('reports only visible database-backed notification and audit state', async () => {
    const repo = repository()
    await repo.putDomainRecord(dbActor, { collection: 'notification_inbox', recordId: 'notice-1', ownerUserId: owner, data: { title: 'private title', createdAt: '2026-09-30T12:00:00Z' } })
    await repo.putDomainRecord(dbActor, { collection: 'notification_outbox', recordId: 'mail-1', ownerUserId: owner, data: { state: 'failed', lastFailureCode: 'provider_unavailable', recipient: 'private@example.test' } })
    await repo.putDomainRecord(dbActor, { collection: 'platform_settings', recordId: 'audit:organization', ownerUserId: owner, data: { reviewDays: 90, retentionNote: 'approved internal retention note' } })
    await repo.putDomainRecord(dbActor, { collection: 'operational_errors', recordId: 'e-1', ownerUserId: owner, data: { category: 'route_failure', errorCode: 'DATABASEERROR', route: '/api/crm/[id]', status: 500, occurredAt: '2026-09-30T12:00:00Z', email: 'private@example.test' } })
    const snapshot = await productionHealthSnapshot(platformActor, repo, new Date('2026-09-30T12:01:00Z'))
    expect(snapshot.worker.status).toBe('not_configured')
    expect(snapshot.notifications.inApp.visibleRecords).toBe(1)
    expect(snapshot.notifications.email).toMatchObject({ status: 'outbox_only', failed: 1, deliveryVerified: false })
    expect(snapshot.auditPolicy).toMatchObject({ status: 'configured', reviewDays: 90, retentionExecution: 'not_verified' })
    expect(snapshot.backups.status).toBe('not_verified')
    expect(snapshot.operationalErrors.records[0]).toMatchObject({ route: '/api/crm/[id]', errorCode: 'DATABASEERROR', status: 500 })
    expect(JSON.stringify(snapshot)).not.toContain('private@example.test')
    expect(JSON.stringify(snapshot)).not.toContain('private title')
  })

  it('stores a sanitized, owner-scoped durable error record without the exception message', async () => {
    const repo = repository()
    const result = await recordOperationalFailure(repo, dbActor, {
      category: 'route_failure', route: '/api/crm/[id]', method: 'POST', status: 500,
      requestId: '01234567-89ab-cdef-0123-456789abcdef',
    }, new Error('SQL details include private@example.test and a customer address'), new Date('2026-09-30T12:00:00Z'))
    expect(result.recorded).toBe(true)
    const records = await repo.listDomainRecords(dbActor, 'operational_errors')
    expect(records).toHaveLength(1)
    expect(records[0].ownerUserId).toBe(owner)
    expect(records[0].data).toMatchObject({ category: 'route_failure', route: '/api/crm/[id]', errorCode: 'ERROR', status: 500 })
    expect(JSON.stringify(records[0].data)).not.toContain('private@example.test')
    expect(JSON.stringify(records[0].data)).not.toContain('customer address')
    const agentRows = await repo.listDomainRecords({ userId: agent, organizationId: org, role: 'agent' }, 'operational_errors')
    expect(agentRows).toHaveLength(0)
  })

  it('rejects unbounded or PII-bearing metadata instead of storing it', async () => {
    const repo = repository()
    const result = await recordOperationalFailure(repo, dbActor, { category: 'route_failure', route: '/api/contact/customer@example.test', detail: 'PII' }, new Error('secret'))
    expect(result.recorded).toBe(false)
    expect(await repo.listDomainRecords(dbActor, 'operational_errors')).toHaveLength(0)
  })
})
