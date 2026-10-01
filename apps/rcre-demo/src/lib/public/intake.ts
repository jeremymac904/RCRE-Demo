import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { publicAgents } from '@/lib/public/content'
import { directory } from '@/lib/platform/auth'
import { getRecord, putRecord, readRecords, transaction } from '@/lib/platform/store'
import * as crm from '@/lib/platform/service'
import { getRepository } from '@/lib/db'
import { DomainRecordConflictError, type Actor, type Repository } from '@/lib/db/repository'
import { rateLimitRequest, SharedRateLimitUnavailableError } from '@/lib/services/rate-limit'

export class IntakeError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

function digest(value: string) { return createHash('sha256').update(value).digest('hex') }

export async function assertIntakeAllowed(request: Request, submissionId: string, honeypot = '') {
  if (honeypot.trim()) throw new IntakeError('Request could not be accepted.', 400)
  const origin = request.headers.get('origin')
  if (origin) {
    try { if (new URL(origin).host !== request.headers.get('host')) throw new IntakeError('Cross-origin request denied.', 403) }
    catch (error) { if (error instanceof IntakeError) throw error; throw new IntakeError('Cross-origin request denied.', 403) }
  }
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) throw new IntakeError('A valid submission ID is required.', 400)
  try {
    const decision = await rateLimitRequest('public_form', request.headers, 8, 60)
    if (!decision.allowed) throw new IntakeError('Please wait a moment before trying again.', 429)
  } catch (error) {
    if (error instanceof IntakeError) throw error
    if (error instanceof SharedRateLimitUnavailableError) throw new IntakeError('We cannot receive requests right now. Please contact the office directly.', 503)
    throw error
  }
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


function deterministicUuid(value: string) {
  const hex = digest(value).slice(0, 32).split('')
  hex[12] = '5'
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16)
  const raw = hex.join('')
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`
}

function leadAttribution(input: IntakeFields, source: string, inquiryId: string, capturedAt: string, siteOwnerId?: string) {
  return {
    id: inquiryId, source, kind: input.kind, agentWebsiteSlug: input.agentSlug, siteOwnerId,
    listingId: input.listingId, providerId: input.providerId, mlsListingId: input.mlsListingId,
    propertyAddress: input.propertyAddress, landingPage: input.landingPage, referrer: input.referrer,
    utmSource: input.utmSource, utmMedium: input.utmMedium, utmCampaign: input.utmCampaign,
    utmContent: input.utmContent, utmTerm: input.utmTerm, capturedAt,
  }
}

function publicIntakeActor(): Actor {
  const organizationId = process.env.RCRE_ORGANIZATION_ID ?? ''
  const userId = process.env.RCRE_PUBLIC_INTAKE_ACTOR_ID ?? ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new IntakeError('We cannot receive requests right now. Please contact the office directly.', 503)
  }
  return { organizationId, userId, role: 'broker' }
}

async function durableOwner(input: IntakeFields, repository: Repository, actor: Actor) {
  const serviceUser = await repository.getUser(actor, actor.userId)
  if (!serviceUser?.isActive || serviceUser.organizationId !== actor.organizationId || serviceUser.role !== 'broker') {
    throw new IntakeError('We cannot receive requests right now. Please contact the office directly.', 503)
  }
  const users = await repository.listUsers(actor)
  let rosterMatch = null as (typeof publicAgents)[number] | null
  let candidate = undefined as (typeof users)[number] | undefined
  let candidateProfile: Record<string, any> | undefined

  // A personal website slug is configurable and is not the canonical person ID.
  // Resolve it only through a published site owned by an active member whose
  // profile is linked to a verified public RCRE person. Never fall back to the
  // brokerage's default routing when an agent-site slug is unknown or stale.
  if (input.agentSlug) {
    const slug = input.agentSlug.trim().toLowerCase()
    for (let offset = 0; ; offset += 200) {
      const profiles = await repository.listDomainRecords<Record<string, any>>(actor, 'member_profiles', { limit: 200, offset })
      for (const profileRow of profiles) {
        const profile = profileRow.data
        if (String(profile.websiteSlug ?? '').trim().toLowerCase() !== slug || profile.publicVisible !== true
          || profile.active === false || profile.disabled === true || profileRow.ownerUserId !== profileRow.recordId
          || profileRow.organizationId !== actor.organizationId) continue
        const verifiedPersonId = typeof profile.verifiedPersonId === 'string' ? profile.verifiedPersonId : ''
        if (!verifiedPersonId) continue
        const canonicalRow = await repository.getDomainRecord<Record<string, any>>(actor, 'canonical_people', verifiedPersonId)
        const staticCanonical = !canonicalRow ? publicAgents.find(person => person.slug === verifiedPersonId) : undefined
        // Dynamic identities require their owner-bound canonical row to be approved.
        // Existing roster records remain compatible while their canonical rows migrate.
        const dynamicCanonical = canonicalRow?.data
        if (canonicalRow && (canonicalRow.organizationId !== actor.organizationId
          || canonicalRow.ownerUserId !== profileRow.recordId
          || dynamicCanonical?.id !== verifiedPersonId || dynamicCanonical?.slug !== verifiedPersonId
          || dynamicCanonical?.userId !== profileRow.recordId
          || dynamicCanonical?.organizationId !== actor.organizationId
          || dynamicCanonical?.status !== 'active' || dynamicCanonical?.publicVisible !== true)) continue
        if (!canonicalRow && !staticCanonical) continue
        const site = await repository.getDomainRecord<Record<string, any>>(actor, 'agent_websites', profileRow.recordId)
        if (!site || site.organizationId !== actor.organizationId || site.ownerUserId !== profileRow.recordId
          || (site.data.ownerUserId && site.data.ownerUserId !== profileRow.recordId)
          || (site.data.organizationId && site.data.organizationId !== actor.organizationId)
          || site.data.published !== true
          || String(site.data.slug ?? '').trim().toLowerCase() !== slug) continue
        const member = users.find(user => user.id === profileRow.recordId && user.isActive
          && user.organizationId === actor.organizationId
          && ['agent', 'team_lead', 'managing_broker', 'broker', 'owner'].includes(user.role))
        if (!member) continue
        rosterMatch = staticCanonical ?? null
        candidate = member
        candidateProfile = profile
        break
      }
      if (candidate || profiles.length < 200) break
    }
    if (!candidate) throw new IntakeError('We cannot assign this request to a verified RCRE representative right now. Please contact the office directly.', 503)
  }
  const marketOffice = input.market?.toLowerCase().includes('alabama') ? 'al' : input.market?.toLowerCase().includes('florida') ? 'fl' : ''
  // Durable settings use an explicit organization/office key. Resolve office
  // routing first and only use the organization policy for an unknown market.
  // Never consult the legacy SQLite `settings/leads` record in production.
  const policy = marketOffice
    ? await repository.getDomainRecord<Record<string, any>>(actor, 'platform_settings', `leads:${marketOffice}`)
      ?? await repository.getDomainRecord<Record<string, any>>(actor, 'platform_settings', 'leads:organization')
    : await repository.getDomainRecord<Record<string, any>>(actor, 'platform_settings', 'leads:organization')
  const routeId = input.agentSlug ? candidate?.id : (marketOffice ? policy?.data.routing?.[marketOffice] : undefined)
    ?? policy?.data.routing?.[input.kind] ?? policy?.data.defaultOwnerId
  if (!routeId) throw new IntakeError('We cannot assign this request to a verified RCRE representative right now. Please contact the office directly.', 503)
  const owner = users.find(user => user.id === routeId && user.isActive)
  const profileRecord = owner && !candidateProfile ? await repository.getDomainRecord<Record<string, any>>(actor, 'member_profiles', owner.id) : null
  const profile = candidateProfile ?? profileRecord?.data
  const allowedRoles = ['agent', 'team_lead', 'managing_broker', 'broker', 'owner']
  if (!owner || !profile || !allowedRoles.includes(String(profile.role ?? owner.role))
    || profile.active === false || profile.disabled === true
    || (input.agentSlug && (profile.publicVisible !== true || profile.websiteSlug?.trim().toLowerCase() !== input.agentSlug.trim().toLowerCase()))
    || (marketOffice && profile.officeId !== marketOffice && !input.agentSlug)) {
    throw new IntakeError('We cannot assign this request to a verified RCRE representative right now. Please contact the office directly.', 503)
  }
  return { owner, profile, rosterMatch }
}

/** Durable public intake. A request is successful only after its inquiry and CRM lead are committed to the shared repository. */
export async function persistIntakeDurable(input: IntakeFields, repository: Repository, actor: Actor = publicIntakeActor(), retry = 0) {
  if (input.honeypot?.trim()) throw new IntakeError('Request could not be accepted.', 400)
  const { owner, profile, rosterMatch } = await durableOwner(input, repository, actor)
  const bodyHash = digest(JSON.stringify({ ...input, email: input.email.trim().toLowerCase() }))
  const idempotencyKey = digest(`${actor.organizationId}:${input.submissionId}`)
  const idempotencyRecord = await repository.getDomainRecord<Record<string, any>>(actor, 'public_intake_idempotency', idempotencyKey)
  if (idempotencyRecord) {
    if (idempotencyRecord.data.bodyHash !== bodyHash) throw new IntakeError('This submission ID was already used for different information.', 409)
    return { id: String(idempotencyRecord.data.inquiryId), status: 'saved' as const, persistence: 'postgres' as const, duplicate: true }
  }
  const inquiryId = deterministicUuid(`rcre-public-inquiry:${actor.organizationId}:${input.submissionId}`)
  const now = new Date().toISOString()
  const source = input.agentSlug ? 'Agent Website' : input.listingId ? 'Property Search' : (input.kind === 'recruiting' ? 'Join RCRE' : 'RCRE Website')
  const inquiry = {
    id: inquiryId, organizationId: actor.organizationId, ownerId: owner.id, sourceOwnerId: owner.id, siteOwnerId: input.agentSlug ? owner.id : undefined, officeId: profile.officeId,
    kind: input.kind, name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone?.trim() ?? '',
    message: input.message?.trim() ?? '', market: input.market ?? rosterMatch?.market ?? profile.market ?? '', source,
    consent: input.consent === true, agentWebsiteSlug: input.agentSlug, listingId: input.listingId,
    providerId: input.providerId, mlsListingId: input.mlsListingId, propertyAddress: input.propertyAddress,
    recipient: owner.email, referrer: input.referrer, landingPage: input.landingPage,
    utmSource: input.utmSource, utmMedium: input.utmMedium, utmCampaign: input.utmCampaign,
    utmContent: input.utmContent, utmTerm: input.utmTerm, createdAt: now, status: 'saved',
  }
  const priorInquiry = await repository.getDomainRecord<Record<string, any>>(actor, 'public_inquiries', inquiryId)
  if (priorInquiry && priorInquiry.data.bodyHash !== bodyHash) throw new IntakeError('This submission ID was already used for different information.', 409)


  const email = inquiry.email
  let existing: Awaited<ReturnType<Repository['listDomainRecords']>>[number] | undefined
  if (email) {
    for (let offset = 0; ; offset += 200) {
      const page = await repository.listDomainRecords<Record<string, any>>(actor, 'crm_contacts', { limit: 200, offset })
      existing = page.find(record => String(record.data.email ?? '').trim().toLowerCase() === email)
      if (existing || page.length < 200) break
    }
  }
  const contactId = existing?.recordId ?? deterministicUuid(`rcre-public-contact:${actor.organizationId}:${email}`)
  const contactOwnerId = String(existing?.data.ownerId ?? owner.id)
  const contactOfficeId = String(existing?.data.officeId ?? profile.officeId)
  const contact: Record<string, any> = existing ? existing.data : {
    id: contactId, organizationId: actor.organizationId, officeId: contactOfficeId, ownerId: contactOwnerId,
    version: 1, firstName: input.name.trim().split(/\s+/)[0], lastName: input.name.trim().split(/\s+/).slice(1).join(' '),
    initials: input.name.trim().split(/\s+/).map(part => part[0] ?? '').join('').slice(0, 2),
    stage: 'New Lead', source, email, phone: inquiry.phone, location: inquiry.market,
    receivedAt: now, stageEnteredAt: now, firstTouchAt: null, lastTouchAt: null, lastInboundAt: now,
    lastOutboundAt: null, timeline: [], priority: null, reasons: [], tags: [], consent: inquiry.consent,
  }
  const attribution = leadAttribution(input, source, inquiryId, now, input.agentSlug ? owner.id : undefined)
  const event = { id: `inquiry:${inquiryId}`, at: now, kind: 'inquiry', direction: 'inbound', label: `New ${source} inquiry`, source: 'RCRE' }
  const priorTimeline = Array.isArray(contact.timeline) ? contact.timeline : []
  const priorTouches = Array.isArray(contact.leadAttribution?.touches) ? contact.leadAttribution.touches : []
  const touches = [...priorTouches.filter((item: any) => item.id !== inquiryId), attribution].slice(-50)
  const nextContact = {
    ...contact, lastInboundAt: now,
    timeline: [...priorTimeline.filter((item: any) => item.id !== event.id), event],
    leadAttribution: { firstTouch: contact.leadAttribution?.firstTouch ?? attribution, latestTouch: attribution, touches },
    ...(input.listingId ? { propertyAttribution: attribution } : {}),
  }
  // Keep public lead alerts on the same durable notification contract used by
  // the portal. These IDs deliberately match DurableNotificationService's
  // stable IDs so retries and later service reads resolve to the same records.
  const notificationKey = `website-lead:${inquiryId}`
  // Duplicate emails keep their existing CRM assignment. That assigned owner is
  // the authorized recipient for this inquiry and its notification; website
  // attribution is retained separately on the inquiry and contact timeline.
  const notificationId = digest(`inbox\0${actor.organizationId}\0${contactOwnerId}\0${notificationKey}`)
  const outboxId = digest(`outbox\0${actor.organizationId}\0${contactOwnerId}\0${notificationKey}`)
  const idempotencyKeyHash = digest(`idempotency\0${actor.organizationId}\0${contactOwnerId}\0${notificationKey}`)
  const [preferences, personalSettings] = await Promise.all([
    repository.getDomainRecord<Record<string, any>>(actor, 'notification_preferences', contactOwnerId),
    repository.getDomainRecord<Record<string, any>>(actor, 'platform_settings', `personal:${contactOwnerId}`),
  ])
  const preferenceData = preferences?.data
  const notificationEnabled = preferenceData?.eventTypes?.website_lead !== false
    && preferenceData?.inAppEnabled !== false && personalSettings?.data.inAppNotifications !== false
  const notificationState = notificationEnabled ? 'queued' : 'suppressed'
  const notification = {
    id: notificationId, organizationId: actor.organizationId, ownerUserId: contactOwnerId,
    eventType: 'website_lead', channel: 'in_app', title: 'New website lead received',
    href: `/crm/${contactId}`, source: 'RCRE', createdAt: now, readAt: null,
    deliveryState: notificationState, idempotencyKeyHash,
  }
  const notificationOutbox = {
    id: outboxId, organizationId: actor.organizationId, ownerUserId: contactOwnerId,
    notificationId, eventType: 'website_lead', channel: 'in_app', state: notificationState,
    attempts: 0, maxAttempts: 5, nextAttemptAt: now, lastFailureCode: null,
    providerReceipt: null, createdAt: now, updatedAt: now,
  }
  try {
    await repository.putDomainRecordsAtomic(actor, [
      { collection: 'public_inquiries', recordId: inquiryId, ownerUserId: contactOwnerId,
        data: { ...inquiry, ownerId: contactOwnerId, routedOwnerId: contactOwnerId, sourceOwnerId: owner.id, siteOwnerId: input.agentSlug ? owner.id : undefined, officeId: contactOfficeId, contactId, bodyHash }, ...(priorInquiry ? { expectedVersion: priorInquiry.version } : { createOnly: true }) },
      { collection: 'crm_contacts', recordId: contactId, ownerUserId: contactOwnerId,
        data: nextContact, ...(existing ? { expectedVersion: existing.version } : { createOnly: true }) },
      { collection: 'notification_inbox', recordId: notificationId, ownerUserId: contactOwnerId,
        data: notification, createOnly: true },
      { collection: 'notification_outbox', recordId: outboxId, ownerUserId: contactOwnerId,
        data: notificationOutbox, createOnly: true },
      { collection: 'public_intake_idempotency', recordId: idempotencyKey, ownerUserId: contactOwnerId,
        data: { inquiryId, contactId, bodyHash, createdAt: now }, createOnly: true },
    ], [
      { organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'system', action: 'public.lead_received', targetType: 'contact', targetId: contactId, effect: 'write', allowed: true, detail: { source, inquiryId } },
      { organizationId: actor.organizationId, actorUserId: actor.userId, actorKind: 'system', action: notificationEnabled ? 'notification.queued' : 'notification.suppressed', targetType: 'notification', targetId: notificationId, effect: 'write', allowed: true, detail: { channel: 'in_app', eventType: 'website_lead' } },
    ])
  } catch (error) {
    if (!(error instanceof DomainRecordConflictError)) throw error
    const winner = await repository.getDomainRecord<Record<string, any>>(actor, 'public_intake_idempotency', idempotencyKey)
    if (winner) {
      if (winner.data.bodyHash !== bodyHash) throw new IntakeError('This submission ID was already used for different information.', 409)
      return { id: String(winner.data.inquiryId), contactId: String(winner.data.contactId ?? contactId), status: 'saved' as const, persistence: 'postgres' as const, duplicate: true }
    }
    // Another distinct request with this exact email may have created or
    // updated the deterministic contact between the lookup and commit. Retry
    // from the latest version a bounded number of times so neither inquiry is
    // lost and no duplicate contact is created.
    const contactWinner = await repository.getDomainRecord<Record<string, any>>(actor, 'crm_contacts', contactId)
    if (contactWinner && retry < 2) return persistIntakeDurable(input, repository, actor, retry + 1)
    throw error
  }
  return { id: inquiryId, contactId, status: 'saved' as const, persistence: 'postgres' as const, duplicate: false }
}

export async function persistIntake(input: IntakeFields, repository?: Repository) {
  if (process.env.NODE_ENV !== 'production') return persistLocalIntake(input)
  repository ??= await getRepository()
  return persistIntakeDurable(input, repository)
}
