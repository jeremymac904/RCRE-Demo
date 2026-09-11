import { describe, expect, it, beforeEach } from 'vitest'
import { computeFubSignature, verifyFubSignature } from '@/lib/fub/signature'
import {
  ingestWebhook, parseWebhookPayload, routeEvent, isSupportedEvent,
  type WebhookLedger,
} from '@/lib/fub/webhook'

const SYSTEM_KEY = 'test-system-key-560270f7914b5b4a'

/** Ledger backed by a Set, mimicking the unique index on fub_event_id. */
class FakeLedger implements WebhookLedger {
  seen = new Set<string>()
  records: unknown[] = []
  async insertIfNew(r: Parameters<WebhookLedger['insertIfNew']>[0]) {
    if (this.seen.has(r.fubEventId)) return { inserted: false }
    this.seen.add(r.fubEventId)
    this.records.push(r)
    return { inserted: true }
  }
}

const payload = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  eventId: 'evt-1', eventCreated: '2026-08-19T15:19:21+00:00',
  event: 'peopleCreated', resourceIds: [1234], uri: 'https://api.followupboss.com/v1/people?id=1234',
  ...overrides,
})

describe('FUB signature verification', () => {
  it('accepts a correctly computed signature', () => {
    const body = payload()
    expect(verifyFubSignature(body, computeFubSignature(body, SYSTEM_KEY), SYSTEM_KEY)).toBe(true)
  })

  it('base64-encodes the body BEFORE hashing, per FUB docs', () => {
    // The documented construction is hash_hmac('sha256', base64_encode(body), key).
    // HMACing the raw body directly is a common mistake and must not validate.
    const body = payload()
    const { createHmac } = require('node:crypto') as typeof import('node:crypto')
    const naive = createHmac('sha256', SYSTEM_KEY).update(body).digest('hex')
    expect(computeFubSignature(body, SYSTEM_KEY)).not.toBe(naive)
  })

  it('rejects a tampered body', () => {
    const sig = computeFubSignature(payload(), SYSTEM_KEY)
    expect(verifyFubSignature(payload({ resourceIds: [9999] }), sig, SYSTEM_KEY)).toBe(false)
  })

  it('rejects a signature made with the wrong key', () => {
    const body = payload()
    expect(verifyFubSignature(body, computeFubSignature(body, 'wrong-key'), SYSTEM_KEY)).toBe(false)
  })

  it('rejects missing signature or missing key', () => {
    const body = payload()
    expect(verifyFubSignature(body, null, SYSTEM_KEY)).toBe(false)
    expect(verifyFubSignature(body, computeFubSignature(body, SYSTEM_KEY), undefined)).toBe(false)
  })

  it('rejects a signature of the wrong length without throwing', () => {
    expect(verifyFubSignature(payload(), 'abc', SYSTEM_KEY)).toBe(false)
  })
})

describe('webhook payload parsing', () => {
  it('parses a valid payload', () => {
    const p = parseWebhookPayload(payload())
    expect(p?.eventId).toBe('evt-1')
    expect(p?.resourceIds).toEqual([1234])
  })

  it('returns null for malformed JSON', () => {
    expect(parseWebhookPayload('{not json')).toBeNull()
    expect(parseWebhookPayload('')).toBeNull()
  })

  it('returns null when required fields are missing', () => {
    expect(parseWebhookPayload(JSON.stringify({ event: 'peopleCreated' }))).toBeNull()
    expect(parseWebhookPayload(JSON.stringify({ eventId: 'x' }))).toBeNull()
  })

  it('survives a non-array resourceIds without throwing', () => {
    const p = parseWebhookPayload(payload({ resourceIds: 'nope' }))
    expect(p?.resourceIds).toEqual([])
  })

  it('filters non-numeric resource ids', () => {
    const p = parseWebhookPayload(payload({ resourceIds: [1, 'two', 3, null] }))
    expect(p?.resourceIds).toEqual([1, 3])
  })
})

describe('webhook ingestion — idempotency', () => {
  let ledger: FakeLedger
  beforeEach(() => { ledger = new FakeLedger() })

  it('accepts a first delivery', async () => {
    const r = await ingestWebhook(payload(), true, ledger)
    expect(r).toEqual({ status: 'accepted', eventId: 'evt-1' })
    expect(ledger.records).toHaveLength(1)
  })

  it('reports a repeat delivery as duplicate and does not re-record it', async () => {
    await ingestWebhook(payload(), true, ledger)
    const second = await ingestWebhook(payload(), true, ledger)
    expect(second.status).toBe('duplicate')
    expect(ledger.records).toHaveLength(1)
  })

  it('treats distinct eventIds for the same resource as distinct events', async () => {
    await ingestWebhook(payload({ eventId: 'evt-1' }), true, ledger)
    await ingestWebhook(payload({ eventId: 'evt-2' }), true, ledger)
    expect(ledger.records).toHaveLength(2)
  })

  it('rejects a malformed payload without touching the ledger', async () => {
    const r = await ingestWebhook('{bad', true, ledger)
    expect(r.status).toBe('rejected')
    expect(ledger.records).toHaveLength(0)
  })

  it('records an unverified delivery rather than dropping it silently', async () => {
    // Dropping it would hide a misconfiguration or an attack.
    const r = await ingestWebhook(payload(), false, ledger)
    expect(r.status).toBe('accepted')
    expect((ledger.records[0] as { signatureValid: boolean }).signatureValid).toBe(false)
  })
})

describe('event routing', () => {
  it('maps event names to resources', () => {
    expect(routeEvent('peopleCreated')).toEqual({ kind: 'people', deleted: false })
    expect(routeEvent('peopleDeleted')).toEqual({ kind: 'people', deleted: true })
    expect(routeEvent('textMessagesCreated').kind).toBe('textMessages')
    expect(routeEvent('dealsUpdated').kind).toBe('deals')
    expect(routeEvent('somethingElse').kind).toBe('unknown')
  })

  it('knows which events the MVP handles', () => {
    expect(isSupportedEvent('peopleCreated')).toBe(true)
    expect(isSupportedEvent('reactionCreated')).toBe(false)
  })
})
