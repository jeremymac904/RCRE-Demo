import 'server-only'
import { dataMode } from '@/lib/config/env'
import { MemoryRepository, type Repository } from './repository'

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
  if (dataMode() === 'fixtures') {
    const { buildSeed } = await import('../../../tests/fixtures/seed')
    const repo: Repository = new MemoryRepository(buildSeed())
    cached = repo
    return repo
  }
  const { PgRepository } = await import('./pg')
  const repo: Repository = new PgRepository()
  cached = repo
  return repo
}

export function resetRepositoryCache(): void { cached = null }
