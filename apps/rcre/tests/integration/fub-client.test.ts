import { describe, expect, it, vi } from 'vitest'
import { FubClient, FubError } from '@/lib/fub/client'

function response(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

const opts = (fetchImpl: typeof fetch) => ({
  apiKey: 'test-key', system: 'RCRE', systemKey: 'sys-key',
  fetchImpl, sleep: async () => {},
})

describe('FUB client authentication', () => {
  it('uses Basic auth with the API key as username and blank password', async () => {
    let seen: Headers | undefined
    const f = vi.fn(async (_u: string, init?: RequestInit) => {
      seen = new Headers(init?.headers); return response({ ok: true })
    }) as unknown as typeof fetch

    await new FubClient(opts(f)).me()
    const expected = 'Basic ' + Buffer.from('test-key:').toString('base64')
    expect(seen?.get('Authorization')).toBe(expected)
  })

  it('sends X-System and X-System-Key for the higher rate-limit tier', async () => {
    let seen: Headers | undefined
    const f = vi.fn(async (_u: string, init?: RequestInit) => {
      seen = new Headers(init?.headers); return response({})
    }) as unknown as typeof fetch

    await new FubClient(opts(f)).me()
    expect(seen?.get('X-System')).toBe('RCRE')
    expect(seen?.get('X-System-Key')).toBe('sys-key')
  })

  it('requests custom fields when fetching a person', async () => {
    let url = ''
    const f = vi.fn(async (u: string) => { url = u; return response({ id: 1 }) }) as unknown as typeof fetch
    await new FubClient(opts(f)).getPerson(1234)
    expect(url).toContain('/people/1234')
    expect(url).toContain('fields=allFields')
  })
})

describe('FUB client rate limiting', () => {
  it('honours Retry-After on 429 and then succeeds', async () => {
    const waits: number[] = []
    let call = 0
    const f = vi.fn(async () => {
      call += 1
      return call === 1
        ? response({ error: 'rate limited' }, { status: 429, headers: { 'Retry-After': '3' } })
        : response({ ok: true })
    }) as unknown as typeof fetch

    const client = new FubClient({
      ...opts(f), sleep: async (ms: number) => { waits.push(ms) },
    })
    await expect(client.me()).resolves.toEqual({ ok: true })
    expect(waits).toEqual([3000])
    expect(call).toBe(2)
  })

  it('captures rate-limit headers for monitoring', async () => {
    const f = vi.fn(async () => response({}, { headers: {
      'X-RateLimit-Limit': '250', 'X-RateLimit-Remaining': '156',
      'X-RateLimit-Window': '10', 'X-RateLimit-Context': 'global',
    }})) as unknown as typeof fetch
    const c = new FubClient(opts(f))
    await c.me()
    expect(c.rateLimit).toEqual({ limit: 250, remaining: 156, window: 10, context: 'global' })
  })

  it('gives up after maxRetries and surfaces a typed error', async () => {
    const f = vi.fn(async () => response({}, { status: 500 })) as unknown as typeof fetch
    const client = new FubClient({ ...opts(f), maxRetries: 2 })
    await expect(client.me()).rejects.toBeInstanceOf(FubError)
    expect(f).toHaveBeenCalledTimes(3)   // initial + 2 retries
  })

  it('does NOT retry a 4xx that is not 429', async () => {
    const f = vi.fn(async () => response({}, { status: 404 })) as unknown as typeof fetch
    await expect(new FubClient(opts(f)).getPerson(1)).rejects.toBeInstanceOf(FubError)
    expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('FUB client pagination', () => {
  it('uses keyset `next` rather than offset', async () => {
    const urls: string[] = []
    const f = vi.fn(async (u: string) => {
      urls.push(u)
      return urls.length === 1
        ? response({ _metadata: { next: 'CURSOR1' }, people: [{ id: 1 }, { id: 2 }] })
        : response({ _metadata: {}, people: [{ id: 3 }] })
    }) as unknown as typeof fetch

    const out: unknown[] = []
    for await (const p of new FubClient(opts(f)).paginate('/people', 'people')) out.push(p)

    expect(out).toHaveLength(3)
    expect(urls[1]).toContain('next=CURSOR1')
    expect(urls.join(' ')).not.toContain('offset=')
  })

  it('stops on an empty page rather than looping forever', async () => {
    const f = vi.fn(async () =>
      response({ _metadata: { next: 'ALWAYS' }, people: [] })) as unknown as typeof fetch
    const out: unknown[] = []
    for await (const p of new FubClient(opts(f)).paginate('/people', 'people')) out.push(p)
    expect(out).toHaveLength(0)
    expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('FUB write safety gate', () => {
  it('refuses to send a lead while RCRE_ALLOW_FUB_WRITES is off', async () => {
    const f = vi.fn(async () => response({})) as unknown as typeof fetch
    const client = new FubClient(opts(f))
    await expect(client.sendLeadEvent({
      type: 'Registration', source: 'RCRE Website',
      person: { firstName: 'Test', lastName: 'Fixture' },
    })).rejects.toThrow(/FUB writes are disabled/)
    expect(f).not.toHaveBeenCalled()
  })
})
