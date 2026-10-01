import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySeed, MemoryRepository } from '@/lib/db/repository'
import type { PlatformActor } from '@/lib/platform/auth'
import { configureAuthPersistenceForTests, type AuthPersistence } from '@/lib/auth/persistence'
import {
  cancelAIJobDurable, clearAIHistoryDurable, createAITextAttachmentDurable, deleteAIConversationDurable, deleteAIJobDurable, deleteAITextAttachmentDurable, getAIConfigDurable,
  getAITextAttachmentDurable, listAIConversationsDurable, listAIJobsDurable, listAITextAttachmentsDurable, queueAIJobDurable,
  testAIConnectionDurable, runAIJobDurable, saveAIConfigDurable, updateAIConversationDurable, updateAIJobDurable,
} from '@/lib/services/ai-durable'

const agent: PlatformActor = {
  id: '11111111-1111-4111-8111-111111111111', userId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222', role: 'agent', name: 'Agent', market: 'Florida', teamId: 'fl', officeId: 'fl',
}
const other: PlatformActor = { ...agent, id: '33333333-3333-4333-8333-333333333333', userId: '33333333-3333-4333-8333-333333333333', name: 'Other' }
let repository: MemoryRepository
beforeEach(() => { repository = new MemoryRepository(emptySeed()) })
afterEach(() => { vi.unstubAllGlobals(); delete process.env.OPENROUTER_API_KEY; configureAuthPersistenceForTests(null) })

describe('durable RCRE AI state', () => {
  it('stores actor configuration privately and only permits openrouter/free', async () => {
    expect((await getAIConfigDurable(agent, repository)).provider).toBe('deterministic')
    const config = await saveAIConfigDurable(agent, { provider: 'cloud', endpoint: 'https://openrouter.ai/api/v1', model: 'openrouter/free', sharing: false, paused: false, requestCap: 10 }, repository)
    expect(config).toMatchObject({ provider: 'cloud', model: 'openrouter/free', health: 'OpenRouter Free selected; connection not tested.' })
    expect((await getAIConfigDurable(agent, repository)).model).toBe('openrouter/free')
    await expect(saveAIConfigDurable(other, { provider: 'cloud', endpoint: 'https://openrouter.ai/api/v1', model: 'openrouter/auto', sharing: false, paused: false, requestCap: 10 }, repository)).rejects.toThrow(/free/i)
    expect(await getAIConfigDurable(other, repository)).toMatchObject({ provider: 'deterministic', endpoint: '', model: '' })
  })

  it('verifies only the fixed free OpenRouter route with a synthetic no-PII request', async () => {
    await saveAIConfigDurable(agent, { provider: 'cloud', endpoint: 'https://openrouter.ai/api/v1', model: 'openrouter/free', sharing: false, paused: false, requestCap: 10 }, repository)
    process.env.OPENROUTER_API_KEY = 'test-key-never-real'
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body))
      expect(request.model).toBe('openrouter/free')
      expect(request.provider).toEqual({ allow_fallbacks: false, data_collection: 'deny', max_price: { prompt: 0, completion: 0 } })
      expect(JSON.stringify(request)).not.toMatch(/customer|address|phone|email/i)
      return new Response('data: {"choices":[{"delta":{"content":"OK"},"finish_reason":"stop"}]}\ndata: [DONE]\n', { status: 200, headers: { 'content-type': 'text/event-stream' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const verified = await testAIConnectionDurable(agent, repository)
    expect(verified.verifiedAt).toBeTruthy()
    expect(verified.health).toMatch(/OpenRouter Free verified/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not mark a failed provider test verified', async () => {
    await saveAIConfigDurable(agent, { provider: 'cloud', endpoint: 'https://openrouter.ai/api/v1', model: 'openrouter/free', sharing: false, paused: false, requestCap: 10 }, repository)
    await expect(testAIConnectionDurable(agent, repository)).rejects.toThrow(/not configured/i)
    expect((await getAIConfigDurable(agent, repository)).verifiedAt).toBeUndefined()
  })

  it('atomically queues jobs, creates a conversation and returns an idempotent retry', async () => {
    const input = { prompt: 'Summarize my synthetic day', idempotencyKey: 'request-unique-0001' }
    const first = await queueAIJobDurable(agent, input, repository)
    const retry = await queueAIJobDurable(agent, input, repository)
    expect(retry).toEqual(first)
    expect(first).toMatchObject({ state: 'queued', provider: 'deterministic', ownerId: agent.id })
    expect(await listAIJobsDurable(agent, repository)).toHaveLength(1)
    expect(await listAIConversationsDurable(agent, repository)).toHaveLength(1)
    await expect(queueAIJobDurable(agent, { ...input, prompt: 'Different payload' }, repository)).rejects.toThrow(/already used/i)
    await expect(queueAIJobDurable(other, input, repository)).resolves.toMatchObject({ ownerId: other.id })
  })

  it('enforces owner scope for conversations, jobs, and private text attachments', async () => {
    const attachment = await createAITextAttachmentDurable(agent, { name: 'Context.txt', text: 'private synthetic notes' }, repository)
    expect(attachment).not.toHaveProperty('text')
    expect((await getAITextAttachmentDurable(agent, attachment.id, repository)).text).toBe('private synthetic notes')
    const job = await queueAIJobDurable(agent, { prompt: 'Review context', attachmentId: attachment.id }, repository)
    await expect(getAITextAttachmentDurable(other, attachment.id, repository)).rejects.toThrow(/access denied/i)
    await expect(updateAIConversationDurable(other, job.conversationId, 1, { title: 'Nope' }, repository)).rejects.toThrow(/not found/i)
    await expect(cancelAIJobDurable(other, job.id, job.version, repository)).rejects.toThrow(/not found/i)
    await expect(queueAIJobDurable(other, { prompt: 'Try attachment', attachmentId: attachment.id }, repository)).rejects.toThrow(/access denied/i)
  })

  it('runs deterministic assistance from durable authorized records without external inference', async () => {
    const job = await queueAIJobDurable(agent, { prompt: 'Plan my day from approved data' }, repository)
    const chunks: string[] = []
    const completed = await runAIJobDurable(agent, job.id, chunk => chunks.push(chunk), repository)
    expect(completed).toMatchObject({ state: 'completed_locally', provider: 'deterministic' })
    expect(completed.answer).toContain('Deterministic local summary')
    expect(chunks.join('')).toContain('current records only')
  })

  it('limits managing-broker AI aggregates to active users in the verified office', async () => {
    const manager: PlatformActor = { ...agent, id: '44444444-4444-4444-8444-444444444444', userId: '44444444-4444-4444-8444-444444444444', role: 'managing_broker', officeId: 'office-al' }
    const ownOfficeUser = '55555555-5555-4555-8555-555555555555'
    const otherOfficeUser = '66666666-6666-4666-8666-666666666666'
    configureAuthPersistenceForTests({ listMembers: async () => [
      { userId: ownOfficeUser, organizationId: agent.organizationId, canonicalPersonId: null, email: '', name: '', platformRole: 'agent', active: true, accountStatus: 'active', officeId: 'office-al', teamId: '', market: 'Alabama', lastLoginAt: null },
      { userId: otherOfficeUser, organizationId: agent.organizationId, canonicalPersonId: null, email: '', name: '', platformRole: 'agent', active: true, accountStatus: 'active', officeId: 'office-fl', teamId: '', market: 'Florida', lastLoginAt: null },
    ] } as unknown as AuthPersistence)
    const seed = emptySeed()
    seed.users.push(
      { id: manager.id, organizationId: manager.organizationId, email: 'manager@example.test', fullName: 'Managing Broker', role: 'managing_broker', fubUserId: null, isActive: true, officeId: 'office-al' },
      { id: ownOfficeUser, organizationId: manager.organizationId, email: 'al@example.test', fullName: 'Alabama Agent', role: 'agent', fubUserId: 1, isActive: true, officeId: 'office-al' },
      { id: otherOfficeUser, organizationId: manager.organizationId, email: 'fl@example.test', fullName: 'Florida Agent', role: 'agent', fubUserId: 2, isActive: true, officeId: 'office-fl' },
    )
    seed.people.push(
      { id: 'p-al', organizationId: agent.organizationId, fubPersonId: 1, firstName: 'Local', lastName: 'Lead', emails: [], phones: [], stage: 'Lead', source: 'Referral', assignedUserId: ownOfficeUser, assignedFubUserId: 1, tags: [], price: null, firstReceivedAt: null, firstAssignedAt: null, firstTouchAt: null, lastTouchAt: null, lastInboundAt: null, lastOutboundAt: null, isBuyer: null, isSeller: null, budgetMin: null, budgetMax: null, birthday: null, deletedInFub: false },
      { id: 'p-fl', organizationId: agent.organizationId, fubPersonId: 2, firstName: 'Remote', lastName: 'Lead', emails: [], phones: [], stage: 'Lead', source: 'Zillow', assignedUserId: otherOfficeUser, assignedFubUserId: 2, tags: [], price: null, firstReceivedAt: null, firstAssignedAt: null, firstTouchAt: null, lastTouchAt: null, lastInboundAt: null, lastOutboundAt: null, isBuyer: null, isSeller: null, budgetMin: null, budgetMax: null, birthday: null, deletedInFub: false },
    )
    repository = new MemoryRepository(seed)
    await saveAIConfigDurable(manager, { provider: 'deterministic', endpoint: '', model: '', sharing: false, paused: false, requestCap: 10 }, repository)
    const job = await queueAIJobDurable(manager, { prompt: 'Summarize office performance' }, repository)
    const result = await runAIJobDurable(manager, job.id, () => undefined, repository)
    expect(result.answer).toContain('contains 1 CRM people')
  })

  it('enforces optimistic versions, valid job transitions, and cancellation', async () => {
    const job = await queueAIJobDurable(agent, { prompt: 'Local task' }, repository)
    await expect(updateAIJobDurable(agent, job.id, 3, { state: 'running' }, repository)).rejects.toThrow(/changed/i)
    const running = await updateAIJobDurable(agent, job.id, job.version, { state: 'running' }, repository)
    await expect(updateAIJobDurable(agent, running.id, running.version, { state: 'completed_external' }, repository)).rejects.toThrow(/cannot be marked externally/i)
    const canceled = await cancelAIJobDurable(agent, running.id, running.version, repository)
    expect(canceled.state).toBe('canceled')
    await expect(cancelAIJobDurable(agent, canceled.id, canceled.version, repository)).rejects.toThrow(/already finished/i)
  })

  it('redacts and hides owned history on clear while preserving another user history', async () => {
    const attachment = await createAITextAttachmentDurable(agent, { name: 'Notes.txt', text: 'secret local text' }, repository)
    const job = await queueAIJobDurable(agent, { prompt: 'Private prompt', attachmentId: attachment.id }, repository)
    await queueAIJobDurable(other, { prompt: 'Other user prompt' }, repository)
    expect(await clearAIHistoryDurable(agent, repository)).toEqual({ clearedJobs: 1, clearedConversations: 1, clearedAttachments: 1 })
    expect(await listAIJobsDurable(agent, repository)).toEqual([])
    expect(await listAIConversationsDurable(agent, repository)).toEqual([])
    await expect(getAITextAttachmentDurable(agent, attachment.id, repository)).rejects.toThrow(/not found/i)
    expect(await listAIJobsDurable(other, repository)).toHaveLength(1)
    expect((await repository.getDomainRecord({ userId: agent.id, organizationId: agent.organizationId, role: 'agent' }, 'ai_jobs', job.id))?.data.state).toBe('canceled')
  })


  it('supports scoped soft-delete for individual conversations, jobs, and attachments', async () => {
    const attachment = await createAITextAttachmentDurable(agent, { name: 'Context.txt', text: 'private text' }, repository)
    expect(await listAITextAttachmentsDurable(agent, repository)).toHaveLength(1)
    const job = await queueAIJobDurable(agent, { prompt: 'Delete this', attachmentId: attachment.id }, repository)
    await expect(deleteAIJobDurable(other, job.id, job.version, repository)).rejects.toThrow(/not found/i)
    await deleteAIJobDurable(agent, job.id, job.version, repository)
    expect(await listAIJobsDurable(agent, repository)).toEqual([])
    const convo = (await listAIConversationsDurable(agent, repository))[0]
    await deleteAIConversationDurable(agent, convo.id, 1, repository)
    expect(await listAIConversationsDurable(agent, repository)).toEqual([])
    const currentAttachment = await getAITextAttachmentDurable(agent, attachment.id, repository)
    await deleteAITextAttachmentDurable(agent, attachment.id, currentAttachment.version, repository)
    expect(await listAITextAttachmentsDurable(agent, repository)).toEqual([])
    await expect(getAITextAttachmentDurable(agent, attachment.id, repository)).rejects.toThrow(/not found/i)
  })

  it('refuses excessive text and malformed records', async () => {
    await expect(createAITextAttachmentDurable(agent, { name: 'empty', text: '  ' }, repository)).rejects.toThrow()
    await expect(queueAIJobDurable(agent, { prompt: '', idempotencyKey: 'short' }, repository)).rejects.toThrow()
  })
})
