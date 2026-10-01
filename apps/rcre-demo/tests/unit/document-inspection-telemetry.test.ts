import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireActor: vi.fn(),
  inspectDocument: vi.fn(),
  previewPDF: vi.fn(),
  signingPreparations: vi.fn(),
  recordCaughtRouteFailure: vi.fn(),
}))

vi.mock('@/lib/platform/auth', () => ({
  requireActor: mocks.requireActor,
  AccessError: class AccessError extends Error {
    status: number
    constructor(message: string, status = 403) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/services/document-services', () => ({
  inspectDocument: mocks.inspectDocument,
  previewPDF: mocks.previewPDF,
  signingPreparations: mocks.signingPreparations,
}))
vi.mock('@/lib/operations/caught-route-failure', () => ({ recordCaughtRouteFailure: mocks.recordCaughtRouteFailure }))

import { GET } from '@/app/api/document-inspection/route'

const actor = { id: 'user-1', userId: 'user-1', organizationId: 'org-1', role: 'agent', name: 'Agent', market: 'Florida', teamId: 'team-1', officeId: 'fl' }

describe('document inspection failure telemetry', () => {
  it('preserves a service 5xx and reports only its static route template', async () => {
    mocks.requireActor.mockResolvedValue(actor)
    mocks.inspectDocument.mockRejectedValue(Object.assign(new Error('private document backend detail'), { status: 503 }))
    const request = new Request('https://rcre.example/api/document-inspection?transactionId=private-id&documentId=private-file')

    const response = await GET(request)

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'private document backend detail' })
    expect(mocks.recordCaughtRouteFailure).toHaveBeenCalledWith(request, '/api/document-inspection', actor, 503, expect.any(Error))
  })
})
