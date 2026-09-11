// Follow Up Boss API client. SERVER-ONLY — never import from a client component.
//
// Verified against current FUB docs (fetched 2026-08-19):
//   https://docs.followupboss.com/reference/authentication
//   https://docs.followupboss.com/reference/rate-limiting
//   https://docs.followupboss.com/reference/pagination
//   https://docs.followupboss.com/reference/send-in-a-lead
//
// Facts this implementation depends on:
//   * Basic auth — API key is the USERNAME, password blank.
//   * X-System / X-System-Key identify a registered system and unlock the
//     higher rate-limit tier (global 250/10s vs 125/10s unregistered).
//   * Rate limits use a sliding 10s window; 429 returns Retry-After (seconds).
//     "make sure your system respects the 429 header even if
//      X-RateLimit-Remaining shows you should have requests remaining."
//   * Pagination: `next` (keyset) is strongly preferred over `offset`;
//     max limit is 100; responses carry a `_metadata` block.
//   * Leads MUST be sent via POST /v1/events, never POST /v1/people.
import 'server-only'
import { env } from '@/lib/config/env'

export class FubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'FubError'
  }
  get isRateLimited() { return this.status === 429 }
  get isRetryable() { return this.status === 429 || this.status >= 500 }
}

export interface FubMetadata {
  collection?: string
  offset?: number
  limit?: number
  total?: number
  next?: string
  nextLink?: string
}

export interface FubListResponse<T> { _metadata?: FubMetadata; items: T[] }

export interface FubClientOptions {
  apiKey?: string
  system?: string
  systemKey?: string
  baseUrl?: string
  /** Injected for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch
  maxRetries?: number
  /** Injected for tests so retry backoff does not actually sleep. */
  sleep?: (ms: number) => Promise<void>
}

const DEFAULT_SLEEP = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export class FubClient {
  private readonly apiKey: string
  private readonly system?: string
  private readonly systemKey?: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly maxRetries: number
  private readonly sleep: (ms: number) => Promise<void>

  /** Last observed rate-limit headers, for monitoring. */
  rateLimit: { limit?: number; remaining?: number; window?: number; context?: string } = {}

  constructor(opts: FubClientOptions = {}) {
    const apiKey = opts.apiKey ?? env.fub.apiKey
    if (!apiKey) throw new Error('FUB_API_KEY is not configured')
    this.apiKey = apiKey
    this.system = opts.system ?? env.fub.system
    this.systemKey = opts.systemKey ?? env.fub.systemKey
    this.baseUrl = (opts.baseUrl ?? env.fub.baseUrl).replace(/\/$/, '')
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.maxRetries = opts.maxRetries ?? 3
    this.sleep = opts.sleep ?? DEFAULT_SLEEP
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    // Basic auth: API key as username, blank password.
    const basic = Buffer.from(`${this.apiKey}:`).toString('base64')
    const h: Record<string, string> = {
      Authorization: `Basic ${basic}`,
      Accept: 'application/json',
      ...extra,
    }
    if (this.system) h['X-System'] = this.system
    if (this.systemKey) h['X-System-Key'] = this.systemKey
    return h
  }

  private captureRateLimit(res: Response) {
    const num = (k: string) => {
      const v = res.headers.get(k)
      return v == null ? undefined : Number(v)
    }
    this.rateLimit = {
      limit: num('X-RateLimit-Limit'),
      remaining: num('X-RateLimit-Remaining'),
      window: num('X-RateLimit-Window'),
      context: res.headers.get('X-RateLimit-Context') ?? undefined,
    }
  }

  async request<T = unknown>(
    path: string,
    init: { method?: string; query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(this.baseUrl + (path.startsWith('/') ? path : `/${path}`))
    for (const [k, v] of Object.entries(init.query ?? {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }

    let attempt = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await this.fetchImpl(url.toString(), {
        method: init.method ?? 'GET',
        headers: this.headers(
          init.body !== undefined ? { 'Content-Type': 'application/json' } : {},
        ),
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      })
      this.captureRateLimit(res)

      if (res.ok) {
        if (res.status === 204) return undefined as T
        const text = await res.text()
        return (text ? JSON.parse(text) : undefined) as T
      }

      const retryAfter = Number(res.headers.get('Retry-After') ?? '') || undefined
      let body: unknown
      try { body = await res.json() } catch { body = undefined }
      const err = new FubError(
        `FUB ${init.method ?? 'GET'} ${path} failed: ${res.status}`,
        res.status, body, retryAfter,
      )

      // Respect 429 Retry-After even when X-RateLimit-Remaining looks healthy.
      if (err.isRetryable && attempt < this.maxRetries) {
        const waitMs = retryAfter != null
          ? retryAfter * 1000
          : Math.min(30_000, 500 * 2 ** attempt)
        await this.sleep(waitMs)
        attempt += 1
        continue
      }
      throw err
    }
  }

  /**
   * Keyset pagination. Uses `next` rather than `offset` — FUB enforces this for
   * deep result sets and recommends it universally.
   */
  async *paginate<T = unknown>(
    path: string,
    collection: string,
    query: Record<string, string | number | undefined> = {},
    limit = 100,
  ): AsyncGenerator<T, void, unknown> {
    let next: string | undefined
    for (;;) {
      const res = await this.request<Record<string, unknown>>(path, {
        query: { ...query, limit, ...(next ? { next } : {}) },
      })
      const items = (res?.[collection] as T[] | undefined) ?? []
      for (const item of items) yield item
      const meta = res?._metadata as FubMetadata | undefined
      if (!meta?.next || items.length === 0) return
      next = meta.next
    }
  }

  // ---- Read helpers -------------------------------------------------------
  identity() { return this.request('/identity') }
  me() { return this.request('/me') }
  getPerson(id: number, allFields = true) {
    // Custom fields are not returned unless fields=allFields is requested.
    return this.request(`/people/${id}`, { query: allFields ? { fields: 'allFields' } : {} })
  }
  getPeopleByIds(ids: number[]) {
    return this.request('/people', { query: { id: ids.join(','), fields: 'allFields', limit: 100 } })
  }
  getTask(id: number)        { return this.request(`/tasks/${id}`) }
  getAppointment(id: number) { return this.request(`/appointments/${id}`) }
  getDeal(id: number)        { return this.request(`/deals/${id}`) }
  getNote(id: number)        { return this.request(`/notes/${id}`) }
  getCall(id: number)        { return this.request(`/calls/${id}`) }
  getTextMessage(id: number) { return this.request(`/textMessages/${id}`) }
  listUsers()                { return this.request('/users', { query: { limit: 100 } }) }
  listStages()               { return this.request('/stages') }

  /**
   * Send a lead into FUB.
   *
   * MUST be POST /v1/events — never POST /v1/people. The docs are explicit:
   * "/people ... will create a person but WILL NOT run any automations".
   * Only /events triggers lead-flow assignment, agent notification, action
   * plans, dedupe and social lookup.
   *
   * Types that trigger action plans AND automations:
   *   Registration | Property Inquiry | Seller Inquiry | General Inquiry
   * ("Inquiry" is shorthand and resolves to Property/General automatically.)
   *
   * Status codes: 200 = event created against existing person,
   *               201 = new person created, 204 = lead flow archived/ignored.
   */
  async sendLeadEvent(event: FubEventPayload): Promise<{ status: 'created' | 'updated' | 'ignored'; person?: unknown }> {
    if (!env.gates.allowFubWrites) {
      throw new Error(
        'FUB writes are disabled. Set RCRE_ALLOW_FUB_WRITES=true and obtain explicit authorization first.',
      )
    }
    const res = await this.request<unknown>('/events', { method: 'POST', body: event })
    if (res === undefined) return { status: 'ignored' }
    return { status: 'created', person: res }
  }
}

export interface FubEventPayload {
  /** Registration | Property Inquiry | Seller Inquiry | General Inquiry | Viewed Open House | ... */
  type: string
  /** Marketing/brand name of the lead source (distinct from X-System). */
  source: string
  system?: string
  message?: string
  description?: string
  person: {
    id?: number
    firstName?: string
    lastName?: string
    emails?: { value: string; type?: string }[]
    phones?: { value: string; type?: string }[]
    tags?: string[]
    stage?: string
    sourceUrl?: string
    [k: string]: unknown
  }
  property?: Record<string, unknown>
  /** `source` inside campaign is REQUIRED when the campaign object is sent. */
  campaign?: { source: string; medium?: string; name?: string; term?: string; content?: string }
}
