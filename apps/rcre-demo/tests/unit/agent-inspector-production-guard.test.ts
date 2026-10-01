import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  inspectAgents: vi.fn(), inspectAgentsDurable: vi.fn(), getRepository: vi.fn(), recordCaughtRouteFailure: vi.fn(),
}))

vi.mock('../../src/lib/platform/auth', () => ({
  requireActor: vi.fn(async () => ({ id: 'actor', userId: 'actor', organizationId: 'org', role: 'broker_owner', name: 'Broker', market: 'Alabama', officeId: 'al', teamId: 'al' })),
  AccessError: class AccessError extends Error { constructor(message = 'Access denied', public status = 403) { super(message) } },
}))
vi.mock('../../src/lib/agent-inspector', () => ({ inspectAgents: mocks.inspectAgents }))
vi.mock('../../src/lib/services/agent-inspector-durable', () => ({ inspectAgentsDurable: mocks.inspectAgentsDurable }))
vi.mock('../../src/lib/db', () => ({ getRepository: mocks.getRepository }))
vi.mock('../../src/lib/operations/caught-route-failure', () => ({ recordCaughtRouteFailure: mocks.recordCaughtRouteFailure }))

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks() })

describe('production Command agent inspection', () => {
  it('uses durable repository projection in live mode and never invokes fixture inspector', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const repository = { marker: 'durable repository' }
    mocks.getRepository.mockResolvedValue(repository)
    mocks.inspectAgentsDurable.mockResolvedValue({ roster: [{ id: 'agent-1' }], agent: null, coverage: { source: 'durable CRM' } })
    vi.resetModules()
    const { GET } = await import('../../src/app/api/agent-inspector/route')

    const response = await GET(new Request('https://rcre.example/api/agent-inspector'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ roster: [{ id: 'agent-1' }], agent: null, coverage: { source: 'durable CRM' } })
    expect(mocks.getRepository).toHaveBeenCalledOnce()
    expect(mocks.inspectAgentsDurable).toHaveBeenCalledWith(expect.objectContaining({ id: 'actor' }), undefined, repository)
    expect(mocks.inspectAgents).not.toHaveBeenCalled()
    expect(mocks.recordCaughtRouteFailure).not.toHaveBeenCalled()
  })

  it('keeps download scoped to the requested selected agent in live mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const repository = { marker: 'durable repository' }
    mocks.getRepository.mockResolvedValue(repository)
    mocks.inspectAgentsDurable.mockResolvedValue({ roster: [], agent: { id: 'agent-1', name: 'Agent One' }, coverage: {} })
    vi.resetModules()
    const { GET } = await import('../../src/app/api/agent-inspector/route')

    const response = await GET(new Request('https://rcre.example/api/agent-inspector?agentId=agent-1&download=1'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-disposition')).toContain('rcre-scoped-agent-inspection.json')
    expect(await response.json()).toEqual({ id: 'agent-1', name: 'Agent One' })
    expect(mocks.inspectAgentsDurable).toHaveBeenCalledWith(expect.objectContaining({ id: 'actor' }), 'agent-1', repository)
    expect(mocks.inspectAgents).not.toHaveBeenCalled()
  })
})
