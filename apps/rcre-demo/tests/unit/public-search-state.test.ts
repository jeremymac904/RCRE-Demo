import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getState, PUT as putState } from '@/app/api/public/search-state/route'
import { hashPublicVisitorToken, readPublicSearchState, replacePublicSearchState, type PublicSearchStateQueryable } from '@/lib/property/public-search-state'

const organizationId = '11111111-1111-4111-8111-111111111111'
const visitorToken = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const secret = 'local-only-test-secret-at-least-32-characters'
const saved = {
  favorites: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  searches: [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Jacksonville', filters: { q: 'Jacksonville', market: 'Florida', beds: '3', max: '500000', sort: 'price-asc' } }],
}

class ConsumerStateDb implements PublicSearchStateQueryable {
  state = { favorites: [] as string[], searches: [] as typeof saved.searches }
  rows: Array<{ state: unknown }> = []
  async query(sql: string, values: unknown[] = []) {
    if (sql.includes('rcre_public_search_state_read')) {
      expect(values).toHaveLength(2)
      this.rows = [{ state: this.state }]
      return { rows: this.rows }
    }
    if (sql.includes('rcre_public_search_state_replace')) {
      expect(values).toHaveLength(4)
      this.state = { favorites: JSON.parse(String(values[2])), searches: JSON.parse(String(values[3])) }
      return { rows: [{ state: this.state }] }
    }
    throw new Error('unexpected query')
  }
}

describe('durable consumer property-search state', () => {
  it('HMACs the unguessable visitor token and rejects malformed or weak secrets', () => {
    const digest = hashPublicVisitorToken(visitorToken, secret)
    expect(digest).toMatch(/^[a-f0-9]{64}$/)
    expect(digest).not.toContain(visitorToken)
    expect(() => hashPublicVisitorToken('attacker-controlled', secret)).toThrow(/token/i)
    expect(() => hashPublicVisitorToken(visitorToken, 'weak')).toThrow(/configured/i)
  })

  it('reads and atomically replaces saved state using only org and HMAC subject', async () => {
    const db = new ConsumerStateDb(), digest = hashPublicVisitorToken(visitorToken, secret)
    expect(await readPublicSearchState(organizationId, digest, db)).toEqual({ favorites: [], searches: [] })
    expect(await replacePublicSearchState(organizationId, digest, saved, db)).toEqual(saved)
    expect(await readPublicSearchState(organizationId, digest, db)).toEqual(saved)
    await replacePublicSearchState(organizationId, digest, saved, db)
    expect(db.state).toEqual(saved)
    expect(JSON.stringify(db.rows)).not.toContain(visitorToken)
  })

  it('rejects malformed favorites, duplicate identities, invalid organizations and hashes before SQL', async () => {
    const db = new ConsumerStateDb(), digest = hashPublicVisitorToken(visitorToken, secret)
    await expect(replacePublicSearchState(organizationId, digest, { ...saved, favorites: ['demo-river-house'] }, db)).rejects.toThrow()
    await expect(replacePublicSearchState(organizationId, digest, { ...saved, favorites: [...saved.favorites, ...saved.favorites] }, db)).rejects.toThrow(/unique/i)
    await expect(readPublicSearchState('not-an-org', digest, db)).rejects.toThrow()
    await expect(readPublicSearchState(organizationId, '1'.repeat(63), db)).rejects.toThrow()
    expect(db.rows).toEqual([])
  })

  it('issues an HttpOnly SameSite cookie and uses repeatable state replacement in fixture mode', async () => {
    const get = await getState(new NextRequest('http://rcre.test/api/public/search-state', { headers: { 'x-forwarded-for': '192.0.2.14' } }))
    expect(get.status).toBe(200)
    const cookie = get.cookies.get('rcre-public-visitor')
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('strict')
    const payload = { favorites: ['demo-river-house'], searches: saved.searches }
    const makePut = () => new NextRequest('http://rcre.test/api/public/search-state', {
      method: 'PUT', headers: { origin: 'http://rcre.test', cookie: `rcre-public-visitor=${cookie!.value}`, 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.14' }, body: JSON.stringify(payload),
    })
    const first = await putState(makePut()), second = await putState(makePut())
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual(payload)
  })

  it('rejects cross-origin writes and missing same-origin signals', async () => {
    const bad = await putState(new NextRequest('https://rcre.test/api/public/search-state', {
      method: 'PUT', headers: { origin: 'https://attacker.test', 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.15' }, body: JSON.stringify({ favorites: [], searches: [] }),
    }))
    const missing = await putState(new NextRequest('https://rcre.test/api/public/search-state', {
      method: 'PUT', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.16' }, body: JSON.stringify({ favorites: [], searches: [] }),
    }))
    expect(bad.status).toBe(403)
    expect(missing.status).toBe(403)
  })
})
