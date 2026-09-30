import 'server-only'
import { dataMode, env, isProduction } from '@/lib/config/env'
import { MemoryRepository, type Repository } from './repository'
import { repositoryBackend } from './selection'

let cached: Repository | null = null

/**
 * Resolve the repository for the current runtime.
 *
 * In production this MUST be the Postgres repository. Fixtures are refused —
 * rendering synthetic insights to a real agent would be worse than an outage,
 * because the agent would act on them.
 */
export async function getRepository(): Promise<Repository> {
  if (cached) return cached
  const backend = repositoryBackend({
    isTest: process.env.NODE_ENV === 'test' || process.env.VITEST === 'true',
    isProduction,
    dataMode: dataMode(),
    hasDatabaseUrl: Boolean(env.databaseUrl),
  })
  if (backend === 'postgres') {
    const { PgRepository } = await import('./pg')
    const repo: Repository = new PgRepository()
    cached = repo
    return repo
  }
  if (backend === 'unavailable') {
    throw new Error('PostgreSQL is required for live RCRE data; refusing to open fixture storage')
  }
  if (backend === 'fixtures') {
    const { buildSeed } = await import('../../../tests/fixtures/seed')
    const repo: Repository = new MemoryRepository(buildSeed())
    cached = repo
    return repo
  }
  throw new Error('No RCRE data repository is available')
}

export function resetRepositoryCache(): void { cached = null }
