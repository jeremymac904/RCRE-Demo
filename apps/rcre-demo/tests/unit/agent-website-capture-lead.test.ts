import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureLead } from '@/lib/agent-website/capture-lead'

afterEach(() => vi.unstubAllGlobals())

describe('agent website lead submission', () => {
  it('posts agent and campaign attribution and accepts only a confirmed local save', async () => {
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      expect(body.agentSlug).toBe('sarah-brockner')
      expect(body.utmSource).toBe('newsletter')
      expect(body.landingPage).toBe('/agent/sarah-brockner/contact')
      expect(body.submissionId).toMatch(/^[0-9a-f-]{36}$/i)
      return Response.json({ id: 'inq-1', status: 'saved_locally', persistence: 'local_review_only' }, { status: 201 })
    })
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('window', { location: { search: '?utm_source=newsletter', pathname: '/agent/sarah-brockner/contact' } })
    vi.stubGlobal('document', { referrer: 'https://rcregroup.com/team' })

    await expect(captureLead({ agentSlug: 'sarah-brockner', type: 'buyer', name: 'Demo User', email: 'demo@example.com' }))
      .resolves.toMatchObject({ accepted: true, referenceId: 'inq-1', persistence: 'local_review_only' })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('does not claim success when the server returns unavailable or malformed data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Requests are temporarily unavailable.' }, { status: 503 })))
    vi.stubGlobal('window', { location: { search: '', pathname: '/agent/urban/contact' } })
    vi.stubGlobal('document', { referrer: '' })
    await expect(captureLead({ agentSlug: 'urban', type: 'general', name: 'Demo User', email: 'demo@example.net' }))
      .resolves.toMatchObject({ accepted: false, error: 'Requests are temporarily unavailable.' })
  })
})
