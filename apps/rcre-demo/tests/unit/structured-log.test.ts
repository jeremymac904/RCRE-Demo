import { describe, expect, it } from 'vitest'
import { requestIdFrom, safeErrorCode, structuredLogRecord } from '@/lib/operations/structured-log'

describe('production-safe structured logs', () => {
  it('keeps bounded operational fields and drops PII-shaped keys and values', () => {
    const record = structuredLogRecord('error', 'http.request_failed', {
      requestId: '01234567-89ab-cdef-0123-456789abcdef', method: 'POST', route: '/api/contacts/[id]', status: 500,
      email: 'agent@example.com', authorization: 'Bearer private-token', detail: 'customer phone 904-555-0111', errorCode: 'DATABASEERROR',
    }, new Date('2026-09-30T12:00:00.000Z'))
    expect(record).toMatchObject({ level: 'error', event: 'http.request_failed', method: 'POST', route: '/api/contacts/[id]', status: 500 })
    expect(record).not.toHaveProperty('email')
    expect(record).not.toHaveProperty('authorization')
    expect(record).not.toHaveProperty('detail')
  })

  it('does not accept arbitrary request IDs from clients', () => {
    expect(requestIdFrom('not-a-trace-id?email=person@example.com')).toMatch(/^[a-f0-9-]{36}$/i)
    expect(requestIdFrom('01234567-89ab-cdef-0123-456789abcdef')).toBe('01234567-89ab-cdef-0123-456789abcdef')
  })

  it('reports an error class without serializing an exception message', () => {
    const error = new Error('private SQL query and customer@example.com')
    expect(safeErrorCode(error)).toBe('ERROR')
    expect(JSON.stringify(structuredLogRecord('error', 'request.failed', { code: safeErrorCode(error) }))).not.toContain('customer@example.com')
  })
})
