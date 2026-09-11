import 'server-only'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, realpathSync, existsSync } from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Storage root resolution
// ---------------------------------------------------------------------------
// The platform store keeps SQLite under a "runtime/" directory. Locally, this
// lives next to the RCRE workspace boundary for governance. On serverless
// (Netlify, Vercel functions, etc.) the cwd is not "RCRE" and the project
// directory is read-only, so we fall back to /tmp. The boundary check is
// skipped when RCRE_DEPLOY_BYPASS_BOUNDARY=1 (set by netlify.toml).

function resolveStorageRoot(): string {
  if (process.env.RCRE_STORAGE_ROOT) {
    const override = process.env.RCRE_STORAGE_ROOT
    mkdirSync(override, { recursive: true, mode: 0o700 })
    return override
  }
  if (process.env.RCRE_DEPLOY_BYPASS_BOUNDARY === '1' || process.env.RCRE_TEST_DB) {
    const fallback = '/tmp/rcre-runtime'
    mkdirSync(fallback, { recursive: true, mode: 0o700 })
    return fallback
  }
  try {
    const root = realpathSync(path.resolve(process.cwd(), '../..'))
    if (path.basename(root) !== 'RCRE') throw new Error('RCRE workspace boundary required')
    const local = path.join(root, 'runtime')
    mkdirSync(path.join(local, 'data'), { recursive: true, mode: 0o700 })
    return local
  } catch (e) {
    if (process.env.NODE_ENV === 'production') {
      const fallback = '/tmp/rcre-runtime'
      mkdirSync(fallback, { recursive: true, mode: 0o700 })
      return fallback
    }
    throw e
  }
}

export const storageRoot = resolveStorageRoot()
const filename = process.env.RCRE_TEST_DB ?? path.join(storageRoot, 'data', 'platform.sqlite')

// ---------------------------------------------------------------------------
// SQLite handle
// ---------------------------------------------------------------------------
// On serverless cold starts, /tmp is wiped. The seed() helper in service.ts
// will re-seed demo data on the first read, so cold starts always have a
// usable fixture state. Sessions are stored in signed cookies (see auth.ts)
// so they survive cold starts without needing /tmp persistence.

if (!existsSync(path.dirname(filename))) {
  mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 })
}
const db = new DatabaseSync(filename)
db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL, PRIMARY KEY(kind,id));')

export function readRecords<T>(kind: string): T[] {
  return db.prepare('SELECT body FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r => JSON.parse(String(r.body)) as T)
}
export function getRecord<T>(kind: string, id: string): T | null {
  const r = db.prepare('SELECT body FROM records WHERE kind=? AND id=?').get(kind, id)
  return r ? JSON.parse(String(r.body)) as T : null
}
export function putRecord<T extends { id: string }>(kind: string, value: T): T {
  db.prepare('INSERT INTO records(kind,id,body) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body').run(kind, value.id, JSON.stringify(value))
  return value
}
export function deleteRecord(kind: string, id: string): void {
  db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind, id)
}
let nested = 0
export function transaction<T>(fn: () => T): T {
  if (nested) return fn()
  db.exec('BEGIN IMMEDIATE')
  nested++
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  } finally {
    nested--
  }
}
