import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { Pool } from 'pg'

const MIGRATIONS_DIR = new URL('../../../supabase/migrations/', import.meta.url)
const LOCK_KEY_1 = 524341
const LOCK_KEY_2 = 2026

export async function discoverMigrations(directory = MIGRATIONS_DIR) {
  const names = (await readdir(directory)).filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort()
  const seen = new Set()
  const results = []
  for (const name of names) {
    const version = name.slice(0, 4)
    if (seen.has(version)) throw new Error(`Duplicate migration version ${version}`)
    seen.add(version)
    const sql = await readFile(new URL(name, directory), 'utf8')
    results.push({ name, version, sql, checksum: createHash('sha256').update(sql).digest('hex') })
  }
  return results
}

export async function runMigrations({ connectionString = process.env.DATABASE_URL, apply = false } = {}) {
  if (!connectionString) throw new Error('DATABASE_URL is required to inspect migrations')
  if (apply && process.env.RCRE_MIGRATIONS_APPROVED !== '1') {
    throw new Error('Set RCRE_MIGRATIONS_APPROVED=1 to apply the checked migration plan')
  }

  const migrations = await discoverMigrations()
  const pool = new Pool({ connectionString, max: 1, application_name: 'rcre-migration-runner' })
  const client = await pool.connect()
  try {
    await client.query('select pg_advisory_lock($1, $2)', [LOCK_KEY_1, LOCK_KEY_2])
    if (apply) {
      await client.query(`create table if not exists public.rcre_schema_migrations (
        version text primary key,
        name text not null unique,
        checksum text not null,
        applied_at timestamptz not null default now()
      )`)
    } else {
      const exists = await client.query(`select to_regclass('public.rcre_schema_migrations') as table_name`)
      if (!exists.rows[0]?.table_name) {
        return { applied: [], pending: migrations.map(({ version, name }) => ({ version, name })), drift: [] }
      }
    }

    const existing = apply
      ? await client.query('select version, name, checksum from public.rcre_schema_migrations')
      : await client.query('select version, name, checksum from public.rcre_schema_migrations')
    const byVersion = new Map(existing.rows.map(row => [row.version, row]))
    const drift = []
    const pending = []
    for (const migration of migrations) {
      const prior = byVersion.get(migration.version)
      if (!prior) pending.push(migration)
      else if (prior.name !== migration.name || prior.checksum !== migration.checksum) {
        drift.push({ version: migration.version, expected: prior.checksum, actual: migration.checksum })
      }
    }
    if (drift.length) throw new Error(`Applied migration checksum changed: ${drift.map(d => d.version).join(', ')}`)

    const applied = []
    if (apply) {
      for (const migration of pending) {
        await client.query('begin')
        try {
          await client.query(migration.sql)
          await client.query(
            'insert into public.rcre_schema_migrations(version, name, checksum) values ($1, $2, $3)',
            [migration.version, migration.name, migration.checksum],
          )
          await client.query('commit')
          applied.push({ version: migration.version, name: migration.name })
        } catch (error) {
          await client.query('rollback').catch(() => undefined)
          throw error
        }
      }
    }
    return {
      applied,
      pending: apply ? [] : pending.map(({ version, name }) => ({ version, name })),
      drift,
    }
  } finally {
    await client.query('select pg_advisory_unlock($1, $2)', [LOCK_KEY_1, LOCK_KEY_2]).catch(() => undefined)
    client.release()
    await pool.end()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const apply = process.argv.includes('--apply')
  runMigrations({ apply }).then(result => {
    for (const item of result.applied) console.log(`applied ${item.version} ${item.name}`)
    for (const item of result.pending) console.log(`pending ${item.version} ${item.name}`)
    if (!result.pending.length && !result.applied.length) console.log('All migrations are applied and checksums match.')
  }).catch(error => {
    console.error(error instanceof Error ? error.message : 'Migration runner failed')
    process.exitCode = 1
  })
}
