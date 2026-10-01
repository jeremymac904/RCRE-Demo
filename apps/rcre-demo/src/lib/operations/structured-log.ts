/** A deliberately small log contract: callers cannot attach arbitrary payloads. */
export type SafeLogLevel = 'info' | 'warn' | 'error'
export type SafeLogField = string | number | boolean | null

const SAFE_FIELDS = new Set(['requestId', 'method', 'route', 'router', 'routeType', 'errorCode', 'status', 'eventType', 'channel'])
const SAFE_VALUE = /^[a-zA-Z0-9_ .:/\-\[\]$()]{0,160}$/

export function requestIdFrom(value?: string | null): string {
  // Only accept opaque IDs. Never reflect arbitrary client input into logs.
  return value && /^[a-f0-9-]{16,64}$/i.test(value) ? value : globalThis.crypto.randomUUID()
}

export function structuredLogRecord(
  level: SafeLogLevel,
  event: string,
  fields: Record<string, SafeLogField> = {},
  now = new Date(),
) {
  const safeFields: Record<string, SafeLogField> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (!SAFE_FIELDS.has(key)) continue
    if (typeof value === 'string') {
      if (SAFE_VALUE.test(value)) safeFields[key] = value
    } else if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
      safeFields[key] = value
    }
  }
  return { timestamp: now.toISOString(), level, event: event.slice(0, 80), ...safeFields }
}

export function logStructured(
  level: SafeLogLevel,
  event: string,
  fields: Record<string, SafeLogField> = {},
): void {
  const line = JSON.stringify(structuredLogRecord(level, event, fields))
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

/** Converts thrown values to non-sensitive diagnostic codes, never messages. */
export function safeErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN_ERROR'
  const name = (error as { name?: unknown }).name
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,49}$/.test(name)
    ? name.toUpperCase()
    : 'UNKNOWN_ERROR'
}
