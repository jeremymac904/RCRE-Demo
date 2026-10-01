import { describe, expect, it, vi } from 'vitest'
import { PERSONAS } from '../../src/lib/platform/auth'
import { createTransaction, documents, permitted, transactionPolicy, uploadDocument, updateTransaction } from '../../src/lib/services/transactions'
import { listTransactionExceptions, resolveTransactionException } from '../../src/lib/services/transaction-exceptions'
import { putRecord, readRecords } from '../../src/lib/platform/store'
import { NextRequest } from 'next/server'
import * as auth from '../../src/lib/platform/auth'
import { POST as transactionsPost } from '../../src/app/api/transactions/route'
import { UnconfiguredDocumenso, UnconfiguredStirling } from '../../src/lib/services/document-services'
import { assignTransaction } from '../../src/lib/services/transactions'

const agent = PERSONAS.find((person) => person.id === 'u-sarah')!
const otherAgent = PERSONAS.find((person) => person.id === 'u-vito')!
const teamLead = PERSONAS.find((person) => person.id === 'u-leader')!
const managingBroker = PERSONAS.find((person) => person.id === 'u-taquilla')!
const brokerOwner = PERSONAS.find((person) => person.id === 'u-julio')!
const coordinator = PERSONAS.find((person) => person.id === 'u-tc')!

describe('transaction authorization boundaries', () => {
  it('scopes agent, coordinator, team lead, managing broker, and broker owner to their intended transaction sets', () => {
    const own = createTransaction(agent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    const otherOffice = createTransaction(otherAgent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    const alTeam = createTransaction(teamLead, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    expect(permitted(agent, own)).toBe(true)
    expect(permitted(agent, otherOffice)).toBe(false)
    expect(permitted(coordinator, own)).toBe(false)
    expect(permitted(managingBroker, own)).toBe(false)
    expect(permitted(managingBroker, alTeam)).toBe(true)
    expect(permitted(teamLead, alTeam)).toBe(true)
    expect(permitted(teamLead, own)).toBe(false)
    expect(permitted(brokerOwner, otherOffice)).toBe(true)
    expect(permitted({ ...agent, organizationId: 'another-org' }, own)).toBe(false)
    const outsideTeamId = `synthetic-outside-team-${crypto.randomUUID()}`
    putRecord('members', {
      id: outsideTeamId,
      role: 'agent',
      officeId: teamLead.officeId,
      teamId: 'another-alabama-team',
      actor: { ...agent, id: outsideTeamId, userId: outsideTeamId, role: 'agent', organizationId: teamLead.organizationId, officeId: teamLead.officeId, teamId: 'another-alabama-team' },
    })
    expect(() => assignTransaction(teamLead, alTeam.id, outsideTeamId, '')).toThrow(/outside authorized scope/i)
  })

  it('refuses to set a pending-signature state while no verified signing provider exists', () => {
    const record = createTransaction(agent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    expect(() => updateTransaction(agent, record.id, record.version, { status: 'pending_signature' })).toThrow(/signing provider/i)
    expect(createTransaction(agent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' }).status).toBe('active')
  })

  it('validates calendar dates, duplicate checklist IDs, and transaction version before persisting', () => {
    const record = createTransaction(agent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    expect(() => updateTransaction(agent, record.id, record.version, { closingDate: '2026-02-30' })).toThrow(/valid calendar date/i)
    expect(() => updateTransaction(agent, record.id, record.version, { checklist: [{ id: 'same', label: 'One', done: false }, { id: 'same', label: 'Two', done: false }] })).toThrow(/identifiers must be unique/i)
    expect(() => updateTransaction(agent, record.id, record.version + 1, { client: 'Changed' })).toThrow(/Conflict/i)
  })
})

describe('transaction document upload safety', () => {
  it('reduces traversal names to safe download names without writing user paths', () => {
    const record = createTransaction(agent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    const document = uploadDocument(agent, record.id, '..\\..\\private\\report.txt', 'text/plain', Buffer.from('1. Synthetic finding', 'utf8'))
    expect(document.name).toBe('report.txt')
    expect(/[\\/\r\n\"']/.test(document.name)).toBe(false)
    expect(documents(agent, record.id).some((item) => item.id === document.id)).toBe(true)
  })

  it('rejects binary masquerading as text, bad PDF magic, and unsupported MIME types', () => {
    const record = createTransaction(agent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    expect(() => uploadDocument(agent, record.id, 'binary.txt', 'text/plain', Buffer.from([0, 1, 2]))).toThrow(/binary data/i)
    expect(() => uploadDocument(agent, record.id, 'bad.pdf', 'application/pdf', Buffer.from('not PDF'))).toThrow(/PDF header/i)
    expect(() => uploadDocument(agent, record.id, 'evil.html', 'text/html', Buffer.from('<script/>'))).toThrow(/Only PDF and plain text/i)
    expect(() => uploadDocument(agent, record.id, 'too-large.txt', 'text/plain', Buffer.alloc(5 * 1024 * 1024 + 1, 65))).toThrow(/5 MB/i)
  })

  it('does not allow another agent to inspect or replace a transaction document', () => {
    const record = createTransaction(agent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    const document = uploadDocument(agent, record.id, 'report.txt', 'text/plain', Buffer.from('1. Finding'))
    expect(() => documents(otherAgent, record.id)).toThrow(/not found|access denied/i)
    expect(() => uploadDocument(otherAgent, record.id, 'replacement.txt', 'text/plain', Buffer.from('1. Replacement'), document.id)).toThrow(/not found|access denied/i)
  })
})

describe('transaction exception resolution', () => {
  it('records only a real scoped exception and preserves resolution evidence', () => {
    const record = createTransaction(agent, { address: `Synthetic ${crypto.randomUUID()}`, client: 'Synthetic client' })
    const deadline = {
      id: crypto.randomUUID(), label: 'Synthetic review', sourceTerm: 'Synthetic fixture term', effectiveDate: '2020-01-01',
      days: 1, convention: 'calendar' as const, timezone: 'America/New_York', holidays: [], confirmed: true,
    }
    const policy = transactionPolicy(agent)
    updateTransaction(agent, record.id, record.version, { deadlines: [deadline] })
    const exception = listTransactionExceptions(brokerOwner).find((item) => item.id === `exc-${record.id}-${deadline.id}`)!
    expect(exception).toBeTruthy()
    expect(() => resolveTransactionException(otherAgent, exception.id, 'Reviewed')).toThrow(/Broker access denied/i)
    expect(() => resolveTransactionException(brokerOwner, 'exc-not-a-real-transaction', 'Reviewed')).toThrow(/not found/i)
    expect(() => resolveTransactionException(brokerOwner, exception.id, '   ')).toThrow(/resolution note/i)
    const resolution = resolveTransactionException(brokerOwner, exception.id, 'Reviewed the synthetic deadline and recorded the follow-up.')
    expect(resolution).toMatchObject({ id: exception.id, transactionId: record.id, organizationId: brokerOwner.organizationId, actorId: brokerOwner.userId })
    expect(listTransactionExceptions(brokerOwner).find((item) => item.id === exception.id)).toMatchObject({ resolved: true, resolvedBy: brokerOwner.name })
    expect(() => resolveTransactionException(brokerOwner, exception.id, 'Trying replay')).toThrow(/already resolved/i)
    expect(policy.organizationId).toBe(agent.organizationId)
  })
})


describe('unconfigured document providers', () => {
  it('keeps signing and PDF text extraction explicitly unavailable without provider calls', async () => {
    const signing = new UnconfiguredDocumenso()
    const processing = new UnconfiguredStirling()
    expect(await signing.status()).toMatchObject({ available: false })
    await expect(signing.createRequest({} as never)).rejects.toThrow(/Actual signing is blocked/i)
    expect(await signing.verifyCompletion('not-a-real-request')).toEqual({ completed: false, evidenceHash: null })
    await expect(processing.extractText(Buffer.from('%PDF-'))).rejects.toThrow(/unavailable/i)
  })
})

describe('transaction API provider boundary', () => {
  it('returns 503 and creates no signature state when signing is unconfigured', async () => {
    const actorSpy = vi.spyOn(auth, 'requireActor').mockResolvedValue(agent)
    try {
      for (const action of ['prepare-signing', 'review-signing', 'signature']) {
        const body = JSON.stringify({ action, id: `missing-${crypto.randomUUID()}` })
        const response = await transactionsPost(new NextRequest('http://rcre.test/api/transactions', {
          method: 'POST',
          headers: { host: 'rcre.test', origin: 'http://rcre.test', 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) },
          body,
        }))
        expect(response.status).toBe(503)
        expect(await response.json()).toMatchObject({ error: expect.stringMatching(/Signing unavailable/i) })
      }
      expect(readRecords('document_signatures')).toEqual([])
    } finally {
      actorSpy.mockRestore()
    }
  })
})
