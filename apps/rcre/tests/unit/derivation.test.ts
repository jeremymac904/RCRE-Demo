import { describe, expect, it } from 'vitest'
import {
  deriveTimestamps, firstResponseMinutes, isTouch,
  normalizeCall, normalizeNote, normalizeTextMessage,
} from '@/lib/fub/normalize'
import type { Activity } from '@/lib/types'

const ORG = 'org-1'
const A = (kind: Activity['kind'], direction: Activity['direction'], occurredAt: string) =>
  ({ kind, direction, occurredAt })

describe('isTouch', () => {
  it('counts calls, texts, emails and appointments as touches', () => {
    expect(isTouch(A('call', 'outbound', ''))).toBe(true)
    expect(isTouch(A('text', 'inbound', ''))).toBe(true)
    expect(isTouch(A('email', 'outbound', ''))).toBe(true)
    expect(isTouch(A('appointment', 'outbound', ''))).toBe(true)
  })

  it('does NOT count a note as a touch', () => {
    // A note records thinking about someone, not contacting them. If notes
    // counted, "I wrote a note" would satisfy first-response metrics that are
    // used to evaluate agents.
    expect(isTouch(A('note', 'system', ''))).toBe(false)
    expect(isTouch(A('note', 'outbound', ''))).toBe(false)
  })

  it('does NOT count property views, opens, or stage changes', () => {
    expect(isTouch(A('property_view', 'inbound', ''))).toBe(false)
    expect(isTouch(A('em_open', 'inbound', ''))).toBe(false)
    expect(isTouch(A('stage_change', 'system', ''))).toBe(false)
    expect(isTouch(A('assignment', 'system', ''))).toBe(false)
  })
})

describe('deriveTimestamps — first_touch_at', () => {
  it('is the earliest OUTBOUND touch', () => {
    const r = deriveTimestamps([
      A('call',  'outbound', '2026-08-10T12:00:00.000Z'),
      A('email', 'outbound', '2026-08-05T09:00:00.000Z'),
      A('text',  'outbound', '2026-08-12T15:00:00.000Z'),
    ])
    expect(r.firstTouchAt).toBe('2026-08-05T09:00:00.000Z')
  })

  it('ignores inbound activity when computing first touch', () => {
    const r = deriveTimestamps([
      A('inquiry', 'inbound',  '2026-08-01T09:00:00.000Z'),
      A('text',    'inbound',  '2026-08-02T09:00:00.000Z'),
      A('call',    'outbound', '2026-08-03T09:00:00.000Z'),
    ])
    expect(r.firstTouchAt).toBe('2026-08-03T09:00:00.000Z')
  })

  it('ignores notes entirely', () => {
    const r = deriveTimestamps([
      A('note', 'system',   '2026-08-01T09:00:00.000Z'),
      A('call', 'outbound', '2026-08-04T09:00:00.000Z'),
    ])
    expect(r.firstTouchAt).toBe('2026-08-04T09:00:00.000Z')
  })

  it('is null when there has been no outbound touch', () => {
    const r = deriveTimestamps([
      A('inquiry',       'inbound', '2026-08-01T09:00:00.000Z'),
      A('property_view', 'inbound', '2026-08-02T09:00:00.000Z'),
    ])
    expect(r.firstTouchAt).toBeNull()
  })

  it('is ORDER-INDEPENDENT — webhooks arrive out of order routinely', () => {
    const chronological = [
      A('call',  'outbound', '2026-08-01T09:00:00.000Z'),
      A('email', 'outbound', '2026-08-05T09:00:00.000Z'),
      A('text',  'outbound', '2026-08-09T09:00:00.000Z'),
    ]
    const shuffled = [chronological[2], chronological[0], chronological[1]]
    expect(deriveTimestamps(shuffled).firstTouchAt)
      .toBe(deriveTimestamps(chronological).firstTouchAt)
  })

  it('a replay of newer activity can never erase or move first touch later', () => {
    const existing = { firstTouchAt: '2026-08-01T09:00:00.000Z' }
    const r = deriveTimestamps([A('call', 'outbound', '2026-08-20T09:00:00.000Z')], existing)
    expect(r.firstTouchAt).toBe('2026-08-01T09:00:00.000Z')
  })

  it('a backfill of OLDER activity CAN move first touch earlier', () => {
    // Correcting history downward is legitimate; the true first contact was
    // simply not yet ingested.
    const existing = { firstTouchAt: '2026-08-10T09:00:00.000Z' }
    const r = deriveTimestamps([A('call', 'outbound', '2026-08-02T09:00:00.000Z')], existing)
    expect(r.firstTouchAt).toBe('2026-08-02T09:00:00.000Z')
  })
})

describe('deriveTimestamps — recency fields', () => {
  it('tracks last inbound, last outbound and last touch separately', () => {
    const r = deriveTimestamps([
      A('call',          'outbound', '2026-08-01T09:00:00.000Z'),
      A('text',          'inbound',  '2026-08-06T09:00:00.000Z'),
      A('email',         'outbound', '2026-08-03T09:00:00.000Z'),
      A('property_view', 'inbound',  '2026-08-08T09:00:00.000Z'),
    ])
    expect(r.lastOutboundAt).toBe('2026-08-03T09:00:00.000Z')
    // Property view is inbound engagement but not a touch.
    expect(r.lastInboundAt).toBe('2026-08-08T09:00:00.000Z')
    expect(r.lastTouchAt).toBe('2026-08-06T09:00:00.000Z')
  })

  it('handles an empty activity set without inventing values', () => {
    const r = deriveTimestamps([])
    expect(r).toEqual({
      firstTouchAt: null, lastTouchAt: null, lastInboundAt: null,
      lastOutboundAt: null, firstAssignedAt: null,
    })
  })
})

describe('firstResponseMinutes', () => {
  it('computes minutes between receipt and first touch', () => {
    expect(firstResponseMinutes({
      firstReceivedAt: '2026-08-19T10:00:00.000Z',
      firstTouchAt:    '2026-08-19T10:14:00.000Z',
    })).toBe(14)
  })

  it('returns null — not zero — when never touched', () => {
    // Reporting 0 would tell a broker the team responds instantly.
    expect(firstResponseMinutes({
      firstReceivedAt: '2026-08-19T10:00:00.000Z', firstTouchAt: null,
    })).toBeNull()
  })

  it('returns null when receipt time is unknown', () => {
    expect(firstResponseMinutes({
      firstReceivedAt: null, firstTouchAt: '2026-08-19T10:00:00.000Z',
    })).toBeNull()
  })

  it('returns null for a negative interval rather than a nonsense number', () => {
    expect(firstResponseMinutes({
      firstReceivedAt: '2026-08-19T11:00:00.000Z',
      firstTouchAt:    '2026-08-19T10:00:00.000Z',
    })).toBeNull()
  })
})

describe('activity normalization', () => {
  it('maps isIncoming to direction', () => {
    const inbound  = normalizeCall(ORG, 'p1', null, { id: 1, created: '2026-08-19T10:00:00Z', isIncoming: true })
    const outbound = normalizeCall(ORG, 'p1', 'u1', { id: 2, created: '2026-08-19T11:00:00Z', isIncoming: false })
    expect(inbound?.direction).toBe('inbound')
    expect(outbound?.direction).toBe('outbound')
  })

  it('marks notes as system direction so they never count as contact', () => {
    const n = normalizeNote(ORG, 'p1', 'u1', { id: 3, created: '2026-08-19T10:00:00Z', subject: 'Internal' })
    expect(n?.direction).toBe('system')
  })

  it('never stores message bodies', () => {
    const sms = normalizeTextMessage(ORG, 'p1', 'u1', {
      id: 4, created: '2026-08-19T10:00:00Z', isIncoming: false,
      message: 'Hi Dana, the Mandarin Lakes place is still available — call me',
    })
    expect(sms?.summary).toBe('Text message')
    expect(JSON.stringify(sms)).not.toContain('Mandarin')
  })

  it('rejects records with an unusable timestamp instead of guessing', () => {
    expect(normalizeCall(ORG, 'p1', null, { id: 5, created: 'not-a-date' })).toBeNull()
    expect(normalizeCall(ORG, 'p1', null, { id: 6 })).toBeNull()
  })
})
