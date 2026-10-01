import { dependencyReadiness, coreReadinessConfigured } from '@/lib/operations/readiness'
import { getPgPool } from '@/lib/db/pg'
import { isProduction } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

/** Readiness is intentionally dependency-only and never returns configuration values. */
export async function GET() {
  const dependencies = dependencyReadiness()
  let database: string = dependencies.core.database.state
  let databaseReachable = false
  if (process.env.DATABASE_URL) {
    try {
      await getPgPool().query('select 1')
      database = 'reachable'
      databaseReachable = true
    } catch {
      database = 'unavailable'
    }
  }
  const configured = coreReadinessConfigured(dependencies)
  const ready = isProduction ? configured && databaseReachable : true
  const components = {
    database,
    sessions: dependencies.core.sessions.state,
    authentication: dependencies.core.authentication.state,
    storage: dependencies.core.storage.state,
  }
  return Response.json({
    status: ready ? 'ready' : 'not_ready',
    checkedAt: new Date().toISOString(),
    components,
  }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
