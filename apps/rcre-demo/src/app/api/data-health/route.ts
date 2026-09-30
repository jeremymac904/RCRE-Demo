import { statSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { requireActor, assertCapability, AccessError } from '@/lib/platform/auth'
import { DurableStoreUnavailableError, readRecords, getRecord, storageRoot } from '@/lib/platform/store'
import { getSetting } from '@/lib/platform/service'

export const dynamic = 'force-dynamic'

const countKinds = ['contacts', 'tasks', 'appointments', 'recruits', 'marketing', 'library_assets', 'transaction_records', 'transaction_drafts', 'academy_progress', 'community_post']

export async function GET() {
  try {
    const actor = await requireActor()
    assertCapability(actor, 'settings.audit')
    if (!storageRoot) throw new DurableStoreUnavailableError()

    const workerRecord = getRecord<any>('local_worker', actor.organizationId)
    const lastRun = typeof workerRecord?.lastRun === 'string' ? workerRecord.lastRun : null
    const lastRunMs = lastRun ? Date.parse(lastRun) : NaN
    const worker = workerRecord ? {
      status: workerRecord.status === 'healthy' ? 'healthy' : workerRecord.status === 'failed' ? 'failed' : 'unknown',
      lastRun,
      fresh: Number.isFinite(lastRunMs) && Date.now() - lastRunMs < 45000,
      processed: Number.isFinite(workerRecord.processed) ? workerRecord.processed : null,
      reminders: workerRecord.reminders && typeof workerRecord.reminders === 'object'
        ? { created: Number(workerRecord.reminders.created) || 0, suppressed: Number(workerRecord.reminders.suppressed) || 0 }
        : null,
      errorCode: workerRecord.status === 'failed' ? String(workerRecord.errorCode ?? 'LOCAL_WORKER_FAILED') : null,
    } : null

    const backupDir = storageRoot ? path.join(storageRoot, 'backups') : ''
    const backups = backupDir && existsSync(backupDir)
      ? readdirSync(backupDir).filter(name => /^platform-\d+\.sqlite$/.test(name)).map(name => ({
          name,
          bytes: statSync(path.join(backupDir, name)).size,
          assetBundle: existsSync(path.join(backupDir, name.replace(/\.sqlite$/, '.files'), 'manifest.json')),
        }))
      : []

    return Response.json({
      mode: 'local synthetic data',
      checkedAt: new Date().toISOString(),
      externalWritesEnabled: false,
      database: {
        status: storageRoot ? 'local_sqlite' : 'not_configured',
        durable: false,
        note: storageRoot ? 'This health check is reading the local SQLite adapter; it does not verify hosted PostgreSQL.' : 'Durable brokerage storage is not configured for this runtime.',
      },
      counts: Object.fromEntries(countKinds.map(kind => [kind, readRecords<any>(kind).filter(record => record.organizationId === actor.organizationId).length])),
      worker,
      notifications: { inApp: 'available_locally', email: 'not_configured' },
      auditPolicy: getSetting(actor, 'audit').value,
      backups,
      databaseParity: 'Local SQLite adapter. Hosted PostgreSQL health and role/schema parity are not verified by this endpoint.',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const status = error instanceof AccessError ? error.status
      : error instanceof DurableStoreUnavailableError ? 503
      : typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status
      : 500
    const message = error instanceof AccessError ? error.message
      : status === 503 ? 'Operational health is unavailable because durable storage is not configured.'
      : 'Operational health could not be read.'
    return Response.json({ error: message, status: status === 503 ? 'unavailable' : 'error' }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
