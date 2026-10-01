import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertFreeOnlyConfig, OPENROUTER_API_BASE, OPENROUTER_FREE_MODEL } from '@/lib/services/cloud-ai/providers'
import { CloudTransport } from '@/lib/services/cloud-ai/cloud-transport'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const freeConfig = { provider: 'openrouter' as const, model: OPENROUTER_FREE_MODEL }

describe('OpenRouter free-only boundary', () => {
  it.each([
    { candidate: { provider: 'openai', model: 'gpt-4o' } },
    { candidate: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' } },
    { candidate: { provider: 'openrouter', model: 'openrouter/auto' } },
    { candidate: { provider: 'openrouter', model: 'openrouter/free:online' } },
    { candidate: { provider: 'openrouter', model: OPENROUTER_FREE_MODEL, baseUrl: 'https://attacker.example/v1' } },
    { candidate: { provider: 'openrouter', model: OPENROUTER_FREE_MODEL, apiKey: 'user-supplied-secret' } },
  ])('rejects disallowed configuration before any request', ({ candidate }) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(() => assertFreeOnlyConfig(candidate as never)).toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends only the fixed model with zero price ceiling and no provider fallback', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'server-test-key')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await new CloudTransport(freeConfig).complete([{ role: 'user', content: 'synthetic test' }])
    expect(result.text).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${OPENROUTER_API_BASE}/chat/completions`)
    expect(init.method).toBe('POST')
    expect(init.redirect).toBe('error')
    const body = JSON.parse(String(init.body))
    expect(body.model).toBe('openrouter/free')
    expect(body.provider).toEqual({ allow_fallbacks: false, data_collection: 'deny', max_price: { prompt: 0, completion: 0 } })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer server-test-key')
  })

  it('makes no request when the server key is absent', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(new CloudTransport(freeConfig).complete([{ role: 'user', content: 'test' }])).rejects.toThrow('not configured on the server')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('credential validation is a read-only models GET and never falls back to a completion', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'server-test-key')
    const fetchMock = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await new CloudTransport(freeConfig).validateCredentials()
    expect(result.valid).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${OPENROUTER_API_BASE}/models`)
    expect(init.method).toBeUndefined()
    expect(init.redirect).toBe('error')
  })
})

import { PERSONAS } from '@/lib/platform/auth'
import * as ai from '@/lib/services/ai'

describe('RCRE assistant OpenRouter path', () => {
  it('sends only a fixed intent and aggregate counts, never user text, identity, or attachments', async () => {
    const actor = PERSONAS.find(person => person.id === 'u-sarah')!
    const original = ai.aiConfig(actor)
    vi.stubEnv('OPENROUTER_API_KEY', 'server-test-key')
    let completionBody: Record<string, unknown> | undefined
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/models')) return Response.json({ data: [{ id: 'openrouter/free' }] })
      completionBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response('data: {"choices":[{"delta":{"content":"Consider the recorded follow-up counts."},"finish_reason":null}]}\n\ndata: [DONE]\n', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    try {
      ai.saveAIConfig(actor, { ...original, provider: 'cloud', endpoint: OPENROUTER_API_BASE, model: OPENROUTER_FREE_MODEL, sharing: true })
      await ai.testAI(actor)
      const job = ai.queue(actor, 'Why should I contact Dana at dana@example.com?')
      const result = await ai.run(actor, job.id, () => {})
      expect(result.state).toBe('completed_external')
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const messages = completionBody?.messages as Array<{ content: string }>
      const sent = JSON.stringify(messages)
      expect(completionBody?.model).toBe('openrouter/free')
      expect(sent).not.toContain('Dana')
      expect(sent).not.toContain('dana@example.com')
      expect(sent).not.toContain('200 Example Avenue')
      expect(sent).not.toContain('follow-up counts?')
      expect(JSON.parse(messages[1].content)).toHaveProperty('signals.peopleCount')
    } finally {
      ai.saveAIConfig(actor, original)
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('rejects a paid cloud model before saving configuration', () => {
    const actor = PERSONAS.find(person => person.id === 'u-sarah')!
    const original = ai.aiConfig(actor)
    expect(() => ai.saveAIConfig(actor, { ...original, provider: 'cloud', endpoint: OPENROUTER_API_BASE, model: 'openai/gpt-4o' })).toThrow('openrouter/free')
    expect(ai.aiConfig(actor).provider).toBe(original.provider)
  })
})
