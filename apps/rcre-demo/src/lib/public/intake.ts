import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { publicAgents } from '@/lib/public/content'
import { directory } from '@/lib/platform/auth'
import { getRecord, putRecord, readRecords, transaction } from '@/lib/platform/store'
import * as crm from '@/lib/platform/service'

export class IntakeError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

const requests = new Map<string, number[]>()
function digest(value: string) { return createHash('sha256').update(value).digest('hex') }

export function assertIntakeAllowed(request: Request, submissionId: string, honeypot = '') {
  // The current public routes have no durable PostgreSQL write adapter. Never
  // report a successful production lead until one is connected.
  if (process.env.NODE_ENV === 'production') throw new IntakeError('We cannot receive requests right now. Please contact the office directly.', 503)
  if (honeypot.trim()) throw new IntakeError('Request could not be accepted.', 400)
  const origin = request.headers.get('origin')
  if (origin) {
    try { if (new URL(origin).host !== request.headers.get('host')) throw new IntakeError('Cross-origin request denied.', 403) }
    catch (error) { if (error instanceof IntakeError) throw error; throw new IntakeError('Cross-origin request denied.', 403) }
  }
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) throw new IntakeError('A valid submission ID is required.', 400)
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  const key = digest(forwarded)
  const now = Date.now()
  const recent = (requests.get(key) ?? []).filter(time => now - time < 60_000)
  if (recent.length >= 8) throw new IntakeError('Please wait a moment before trying again.', 429)
  recent.push(now); requests.set(key, recent)
}

function verifiedSiteOwner(slug: string | undefined) {
  if (!slug) return null
  const profile = publicAgents.find(agent => agent.slug === slug)
  if (!profile?.email) return null
  const email = profile.email.trim().toLowerCase()
  const member = readRecords<any>('members').find(row => row.email?.trim().toLowerCase() === email && row.actor && !row.disabled)
  if (!member) return null
  const actor = directory(member.actor.organizationId).find(person => person.id === member.id && !person.disabled && ['agent', 'team_leader', 'managing_broker', 'broker_owner'].includes(person.role))
  return actor && actor.organizationId === member.actor.organizationId ? { actor, profile } : null
}

function explicitBrokerageOwner(officeId: string) {
  const routing = getRecord<any>('settings', `leads:${officeId}`)?.value?.routing?.[officeId]
    ?? getRecord<any>('settings', 'leads')?.value?.routing?.[officeId]
  if (!routing) return null
  const member = readRecords<any>('members').find(row => row.id === routing && row.actor && !row.disabled)
  if (!member) return null
  const agentEmail = String(member.email ?? '').trim().toLowerCase()
  const profile = publicAgents.find(person => person.email?.trim().toLowerCase() === agentEmail)
  if (!profile) return null
  const actor = directory(member.actor.organizationId).find(person => person.id === member.id && !person.disabled && person.officeId === officeId && ['agent', 'team_leader', 'managing_broker', 'broker_owner'].includes(person.role))
  return actor ? { actor, profile } : null
}

export type IntakeFields = {
  submissionId: string; kind: string; name: string; email: string; phone?: string; message?: string
  market?: string; referrer?: string; recipient?: string; consent: boolean; agentSlug?: string
  listingId?: string; providerId?: string; mlsListingId?: string; landingPage?: string
  utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string
  propertyAddress?: string; honeypot?: string
}

export function persistLocalIntake(input: IntakeFields) {
  const hintedOffice = input.market?.toLowerCase().includes('alabama') ? 'al' : input.market?.toLowerCase().includes('florida') ? 'fl' : undefined
  const owner = input.agentSlug ? verifiedSiteOwner(input.agentSlug) : hintedOffice ? explicitBrokerageOwner(hintedOffice) : null
  if (!owner) throw new IntakeError('We cannot assign this request to a verified RCRE representative right now. Please contact the office directly.', 503)
  const officeId = owner.actor.officeId
  const bodyHash = digest(JSON.stringify({ ...input, email: input.email.trim().toLowerCase() }))
  const idempotencyKey = digest(`${owner.actor.organizationId}:${input.submissionId}`)
  const previous = getRecord<any>('public_intake_idempotency', idempotencyKey)
  if (previous) {
    if (previous.bodyHash !== bodyHash) throw new IntakeError('This submission ID was already used for different information.', 409)
    return { id: previous.inquiryId, status: 'saved_locally' as const, persistence: 'local_review_only' as const, duplicate: true }
  }
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const source = input.agentSlug ? 'Agent Website' : input.listingId ? 'Property Search' : 'RCRE Website'
  const inquiry = {
    id, organizationId: owner.actor.organizationId, officeId: owner.actor.officeId, ownerId: owner.actor.id,
    kind: input.kind, name: input.name, email: input.email.trim().toLowerCase(), phone: input.phone ?? '',
    message: input.message ?? '', market: input.market ?? owner.profile.market, source, consent: input.consent,
    agentWebsiteSlug: input.agentSlug, listingId: input.listingId, providerId: input.providerId,
    mlsListingId: input.mlsListingId, propertyAddress: input.propertyAddress,
    recipient: owner.profile.email, referrer: input.referrer, landingPage: input.landingPage,
    utmSource: input.utmSource, utmMedium: input.utmMedium, utmCampaign: input.utmCampaign,
    utmContent: input.utmContent, utmTerm: input.utmTerm, createdAt, status: 'saved locally',
  }
  return transaction(() => {
    putRecord('inquiries', inquiry)
    const duplicate = readRecords<any>('contacts').find(contact => contact.organizationId === owner.actor.organizationId && contact.ownerId === owner.actor.id && contact.email?.trim().toLowerCase() === inquiry.email && inquiry.email)
    const contact = duplicate ?? crm.createContact(owner.actor, {
      firstName: input.name.trim().split(/\s+/)[0], lastName: input.name.trim().split(/\s+/).slice(1).join(' '),
      email: inquiry.email, phone: inquiry.phone, market: inquiry.market ?? owner.profile.market,
      officeId: owner.actor.officeId, ownerId: owner.actor.id, source, consent: input.consent,
    })
    putRecord('contacts', { ...contact, propertyAttribution: input.listingId ? {
      listingId: input.listingId, providerId: input.providerId, mlsListingId: input.mlsListingId, source,
      agentWebsiteSlug: input.agentSlug, landingPage: input.landingPage, referrer: input.referrer,
      utmSource: input.utmSource, utmMedium: input.utmMedium, utmCampaign: input.utmCampaign,
      utmContent: input.utmContent, utmTerm: input.utmTerm, receivedAt: createdAt,
    } : undefined })
    putRecord('public_intake_idempotency', { id: idempotencyKey, organizationId: owner.actor.organizationId, inquiryId: id, bodyHash, createdAt })
    return { id, status: 'saved_locally' as const, persistence: 'local_review_only' as const, duplicate: false }
  })
}
