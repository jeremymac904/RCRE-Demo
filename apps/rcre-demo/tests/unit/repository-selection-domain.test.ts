import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryBackend } from '@/lib/db/selection'
import { MemoryRepository, PermissionDeniedError, emptySeed, type Actor } from '@/lib/db/repository'

const agent: Actor = { organizationId: 'org-a', userId: 'user-a', role: 'agent' }
const peer: Actor = { organizationId: 'org-a', userId: 'user-b', role: 'agent' }
const otherTenant: Actor = { organizationId: 'org-b', userId: 'user-c', role: 'agent' }
const dbMigrationDir = join(process.cwd(), 'supabase', 'migrations')

describe('repository selection boundary', () => {
  it('uses test fixtures in tests even if a database URL is present', () => {
    expect(repositoryBackend({ isTest: true, isProduction: false, dataMode: 'live', hasDatabaseUrl: true })).toBe('fixtures')
  })
  it('uses PostgreSQL whenever the database is configured outside tests', () => {
    expect(repositoryBackend({ isTest: false, isProduction: false, dataMode: 'fixtures', hasDatabaseUrl: true })).toBe('postgres')
  })
  it('fails closed instead of selecting fixture data for live or production mode', () => {
    expect(repositoryBackend({ isTest: false, isProduction: true, dataMode: 'live', hasDatabaseUrl: false })).toBe('unavailable')
    expect(repositoryBackend({ isTest: false, isProduction: false, dataMode: 'live', hasDatabaseUrl: false })).toBe('unavailable')
  })
  it('keeps the local development adapter when no live database is requested', () => {
    expect(repositoryBackend({ isTest: false, isProduction: false, dataMode: 'fixtures', hasDatabaseUrl: false })).toBe('fixtures')
  })
})

describe('durable repository bridge contract', () => {
  it('scopes generic records by organization and actor and supports optimistic versions', async () => {
    const repo = new MemoryRepository(emptySeed())
    const first = await repo.putDomainRecord(agent, {
      collection: 'contacts', recordId: 'lead-1', ownerUserId: agent.userId,
      data: { name: 'Synthetic Lead', source: 'RCRE Website' },
    })
    expect(first.version).toBe(1)
    expect(await repo.getDomainRecord(peer, 'contacts', 'lead-1')).toBeNull()
    expect(await repo.getDomainRecord(otherTenant, 'contacts', 'lead-1')).toBeNull()
    expect((await repo.listDomainRecords(agent, 'contacts')).map(row => row.recordId)).toEqual(['lead-1'])
    await expect(repo.putDomainRecord(agent, {
      collection: 'contacts', recordId: 'lead-1', ownerUserId: agent.userId,
      data: { name: 'Conflict' }, expectedVersion: 9,
    })).rejects.toThrow('Domain record version conflict')
    const next = await repo.putDomainRecord(agent, {
      collection: 'contacts', recordId: 'lead-1', ownerUserId: agent.userId,
      data: { name: 'Synthetic Lead Updated' }, expectedVersion: 1,
    })
    expect(next.version).toBe(2)
    expect(await repo.deleteDomainRecord(peer, 'contacts', 'lead-1')).toBe(false)
    expect(await repo.deleteDomainRecord(agent, 'contacts', 'lead-1')).toBe(true)
  })

  it('allows an agent to create owned records but not shared or peer-owned records', async () => {
    const repo = new MemoryRepository(emptySeed())
    await expect(repo.putDomainRecord(agent, {
      collection: 'knowledge', recordId: 'shared', data: { title: 'Shared' },
    })).rejects.toBeInstanceOf(PermissionDeniedError)
    await expect(repo.putDomainRecord(agent, {
      collection: 'contacts', recordId: 'peer-lead', ownerUserId: peer.userId, data: { name: 'Peer' },
    })).rejects.toBeInstanceOf(PermissionDeniedError)
    const broker: Actor = { ...agent, role: 'broker' }
    await repo.putDomainRecord(broker, {
      collection: 'knowledge', recordId: 'shared', data: { title: 'Shared' },
    })
    expect(await repo.getDomainRecord(peer, 'knowledge', 'shared')).not.toBeNull()
  })

  it('applies bounded server pagination in the memory contract', async () => {
    const repo = new MemoryRepository(emptySeed())
    for (let index = 0; index < 7; index++) {
      await repo.putDomainRecord(agent, { collection: 'tasks', recordId: `t-${index}`, ownerUserId: agent.userId, data: { index } })
    }
    expect(await repo.listDomainRecords(agent, 'tasks', { limit: 2, offset: 1 })).toHaveLength(2)
    expect(await repo.listDomainRecords(agent, 'tasks', { limit: 10000 })).toHaveLength(7)
  })

  it('has an additive, tenant-scoped JSONB table with FORCED RLS and actor write checks', () => {
    const migration = readFileSync(join(dbMigrationDir, '0006_durable_domain_records.sql'), 'utf8')
    expect(migration).toMatch(/create table if not exists rcre_domain_records/)
    expect(migration).toMatch(/primary key \(organization_id, collection, record_id\)/)
    expect(migration).toMatch(/alter table rcre_domain_records enable row level security/)
    expect(migration).toMatch(/alter table rcre_domain_records force row level security/)
    expect(migration).toMatch(/owner_user_id in \(select rcre_scoped_user_ids\(\)\)/)
    expect(migration).toMatch(/with check \([\s\S]*?organization_id = rcre_current_org\(\)/)
  })

  it('tracks migrations in order and the runner guards checksums and repeat runs', () => {
    const names = readdirSync(dbMigrationDir).filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort()
    expect(names.slice(0, 4)).toEqual([
      '0001_rcre_mvp_core.sql', '0002_reporting_and_routing.sql',
      '0003_row_level_security.sql', '0004_mls_property_search.sql',
    ])
    const runner = readFileSync(join(process.cwd(), 'src/lib/db/migrate.mjs'), 'utf8')
    expect(runner).toMatch(/sha256/)
    expect(runner).toMatch(/pg_advisory_lock/)
    expect(runner).toMatch(/Applied migration checksum changed/)
    expect(runner).toMatch(/RCRE_MIGRATIONS_APPROVED/)
    expect(runner).toMatch(/begin[\s\S]*?migration\.sql[\s\S]*?commit/)
  })
})

const adminUrl = process.env.RCRE_PG_ADMIN_INTEGRATION_URL
const appUrl = process.env.RCRE_PG_INTEGRATION_URL
const localUrl = (value?: string) => {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
      && /^rcre_(local|test)/.test(parsed.pathname.slice(1))
  } catch { return false }
}

describe.skipIf(!localUrl(adminUrl) || !localUrl(appUrl))('optional real PostgreSQL integration', () => {
  it('can query schema through the least-privilege app connection', async () => {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: appUrl, max: 1 })
    try {
      const result = await pool.query(`select
        to_regclass('public.rcre_domain_records') is not null as domain_store,
        to_regclass('public.rcre_schema_migrations') is not null as migration_ledger,
        current_user as database_role`)
      expect(result.rows[0].domain_store).toBe(true)
      expect(result.rows[0].migration_ledger).toBe(true)
      expect(result.rows[0].database_role).not.toBe('postgres')
    } finally { await pool.end() }
  })
})
