/** Central repository selection contract. Test and fixture modes never select live data. */
export type RepositoryBackend = 'postgres' | 'fixtures' | 'unavailable'

export function repositoryBackend(input: {
  isTest: boolean
  isProduction: boolean
  dataMode: 'live' | 'fixtures'
  hasDatabaseUrl: boolean
}): RepositoryBackend {
  if (input.isTest) return 'fixtures'
  if (input.hasDatabaseUrl) return 'postgres'
  if (input.isProduction || input.dataMode === 'live') return 'unavailable'
  return 'fixtures'
}
