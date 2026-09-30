import 'server-only'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, realpathSync, existsSync } from 'node:fs'
import path from 'node:path'
import { isLocalStoreAllowed } from './storage-mode'

// ---------------------------------------------------------------------------
// Storage root resolution
// ---------------------------------------------------------------------------
// The SQLite adapter is reserved for local development, tests, and build-time
// rendering. It is deliberately unavailable during production function runtime.
// Production brokerage data must be wired to the hosted PostgreSQL repository.

export class DurableStoreUnavailableError extends Error {
  readonly code = 'DURABLE_STORE_UNAVAILABLE'
  readonly status = 503
  constructor() {
    super('Persistent brokerage storage is not configured for this deployment')
    this.name = 'DurableStoreUnavailableError'
  }
}

const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build'
const isProductionRuntime = !isLocalStoreAllowed(process.env.NODE_ENV, process.env.NEXT_PHASE)

// SQLite is a local/test adapter only. A serverless production instance must
// never silently redirect canonical brokerage state into /tmp. Until every
// service is backed by the hosted PostgreSQL repository, accesses fail closed.
function resolveStorageRoot(): string {
  if (isProductionRuntime) return ''
  if (process.env.RCRE_STORAGE_ROOT) {
    const override = process.env.RCRE_STORAGE_ROOT
    mkdirSync(override, { recursive: true, mode: 0o700 })
    return override
  }
  if (process.env.RCRE_TEST_DB) {
    return path.dirname(process.env.RCRE_TEST_DB)
  }
  try {
    const root = realpathSync(path.resolve(process.cwd(), '../..'))
    if (!['RCRE', 'RCRE-Demo'].includes(path.basename(root))) throw new Error('RCRE workspace boundary required')
    const local = path.join(root, 'runtime')
    mkdirSync(path.join(local, 'data'), { recursive: true, mode: 0o700 })
    return local
  } catch (e) {
    if (process.env.NODE_ENV === 'production' && isNextBuild) {
      const buildRoot = path.join(process.cwd(), '.next', 'rcre-build-runtime')
      mkdirSync(path.join(buildRoot, 'data'), { recursive: true, mode: 0o700 })
      return buildRoot
    }
    throw e
  }
}

export const storageRoot = resolveStorageRoot()
const filename = process.env.RCRE_TEST_DB ?? (storageRoot ? path.join(storageRoot, 'data', 'platform.sqlite') : '')

let db: DatabaseSync | null = null
function database(): DatabaseSync {
  if (isProductionRuntime) throw new DurableStoreUnavailableError()
  if (db) return db
  if (!filename) throw new DurableStoreUnavailableError()
  if (!existsSync(path.dirname(filename))) {
    mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 })
  }
  db = new DatabaseSync(filename)
  db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL, PRIMARY KEY(kind,id));')
  return db
}

export function readRecords<T>(kind: string): T[] {
  return database().prepare('SELECT body FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r => JSON.parse(String(r.body)) as T)
}
export function getRecord<T>(kind: string, id: string): T | null {
  const r = database().prepare('SELECT body FROM records WHERE kind=? AND id=?').get(kind, id)
  return r ? JSON.parse(String(r.body)) as T : null
}
export function putRecord<T extends { id: string }>(kind: string, value: T): T {
  database().prepare('INSERT INTO records(kind,id,body) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body').run(kind, value.id, JSON.stringify(value))
  return value
}
export function deleteRecord(kind: string, id: string): void {
  database().prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind, id)
}
let nested = 0
export function transaction<T>(fn: () => T): T {
  if (nested) return fn()
  const store = database()
  store.exec('BEGIN IMMEDIATE')
  nested++
  try {
    const result = fn()
    store.exec('COMMIT')
    return result
  } catch (e) {
    store.exec('ROLLBACK')
    throw e
  } finally {
    nested--
  }
}
