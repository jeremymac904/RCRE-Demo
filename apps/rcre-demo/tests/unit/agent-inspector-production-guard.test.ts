import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ inspectAgents: vi.fn(), recordCaughtRouteFailure: vi.fn() }))

vi.mock('../../src/lib/platform/auth', () => ({
  requireActor: vi.fn(async () => ({ id: 'actor', userId: 'actor', organizationId: 'org', role: 'broker_owner', name: 'Broker', market: 'Alabama', officeId: 'al', teamId: 'al' })),
  AccessError: class AccessError extends Error { constructor(message = 'Access denied', public status = 403) { super(message) } },
}))
vi.mock('../../src/lib/agent-inspector', () => ({ inspectAgents: mocks.inspectAgents }))
vi.mock('../../src/lib/operations/caught-route-failure', () => ({ recordCaughtRouteFailure: mocks.recordCaughtRouteFailure }))

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks() })

describe('production Command agent inspection', () => {
  it('does not expose synthetic SQLite inspection data in live mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const { GET } = await import('../../src/app/api/agent-inspector/route')
    const response = await GET(new Request('https://rcre.example/api/agent-inspector'))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Agent activity details are temporarily unavailable.' })
    expect(mocks.inspectAgents).not.toHaveBeenCalled()
    expect(mocks.recordCaughtRouteFailure).toHaveBeenCalledWith(expect.any(Request), '/api/agent-inspector', expect.objectContaining({ id: 'actor' }), 503, expect.any(Error))
  })
})
