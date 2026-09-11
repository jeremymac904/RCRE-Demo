// Server-only configuration. Importing this from a client component is a build
// error by design — nothing here may ever reach a browser.
import 'server-only'

function optional(name: string): string | undefined {
  const v = process.env[name]
  return v && v.length > 0 ? v : undefined
}

export const isProduction = process.env.NODE_ENV === 'production'

/**
 * Data mode.
 *
 * `fixtures` is ONLY honoured outside production. In production the app always
 * runs against live data — if the database is not configured it fails loudly
 * rather than silently rendering fake insights (ADR-0006: no stubs, and no fake
 * data in production mode).
 */
export type DataMode = 'live' | 'fixtures'

export function dataMode(): DataMode {
  const requested = process.env.RCRE_DATA_MODE
  if (isProduction) return 'live'
  return requested === 'live' ? 'live' : 'fixtures'
}

export const env = {
  databaseUrl: optional('DATABASE_URL'),
  fub: {
    apiKey: optional('FUB_API_KEY'),
    system: optional('FUB_SYSTEM'),
    systemKey: optional('FUB_SYSTEM_KEY'),
    baseUrl: process.env.FUB_API_BASE_URL ?? 'https://api.followupboss.com/v1',
  },
  mcpSharedSecret: optional('RCRE_MCP_SHARED_SECRET'),
  gates: {
    // Both default OFF. Nothing writes to FUB and nothing sends outbound
    // unless explicitly enabled AND separately approved.
    allowFubWrites: process.env.RCRE_ALLOW_FUB_WRITES === 'true',
    allowOutboundSend: process.env.RCRE_ALLOW_OUTBOUND_SEND === 'true',
  },
} as const

export function assertLiveConfig(): void {
  if (dataMode() !== 'live') return
  if (!env.databaseUrl) throw new Error('DATABASE_URL is required in live mode')
  if (!env.fub.apiKey) throw new Error('FUB_API_KEY is required in live mode')
}
