// Repository interface + in-memory implementation.
//
// Two implementations share this interface:
//   MemoryRepository — fixtures, tests, and local development
//   PgRepository     — real Postgres (see pg.ts)
//
// Scoping is enforced HERE, in the repository, not in the UI. Every read takes
// a resolved Actor and the repository decides what that actor may see. A UI bug
// therefore cannot leak another agent's book.

import type {
  Activity, Appointment, AuditEvent, Deal, Organization, Person,
  RecruitingProspect, Task, User, UserRole,
} from '@/lib/domain-types'

/**
 * A resolved, trusted actor.
 *
 * Constructed ONLY from a verified session or verified MCP credential. Never
 * from a request parameter and never from anything a model supplied.
 */
export interface Actor {
  userId: string
  organizationId: string
  role: UserRole
  /** Test/local repositories may receive verified team scope; Postgres resolves it from RLS membership. */
  teamIds?: string[]
  /** Verified office scope for Managing Broker repository operations. */
  officeId?: string
}

/** Roles that may see the whole brokerage book. */
const BROKER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['owner', 'broker'])

export function canSeeWholeBrokerage(role: UserRole): boolean {
  return BROKER_ROLES.has(role)
}

/** Roles permitted to read the recruiting pipeline. */
const RECRUITING_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['owner', 'broker', 'recruiter'])

export function canSeeRecruiting(role: UserRole): boolean {
  return RECRUITING_ROLES.has(role)
}

export interface PublicContentProjection {
  id: string
  status: 'published' | 'archived'
  revision: number
  published?: Record<string, unknown>
}

export interface PublicAgentProfileProjection {
  verifiedPersonId: string
  profile: Record<string, unknown>
}

export interface DomainRecord<T extends Record<string, unknown> = Record<string, unknown>> {
  organizationId: string
  collection: string
  recordId: string
  /** Null means organization-visible data, writable only by brokerage administrators. */
  ownerUserId: string | null
  data: T
  version: number
  createdAt: string
  updatedAt: string
}

export interface DomainRecordInput<T extends Record<string, unknown> = Record<string, unknown>> {
  collection: string
  recordId: string
  ownerUserId?: string | null
  data: T
  /** Optional optimistic concurrency check; omit only for create-or-replace operations. */
  expectedVersion?: number
  /** Insert only; used for race-safe idempotency keys. */
  createOnly?: boolean
}

export interface TransactionDomainRecordInput<T extends Record<string, unknown> = Record<string, unknown>> extends DomainRecordInput<T> {
  collection: 'transactions' | `transaction_${string}`
}

const TRANSACTION_COLLECTION = /^(transactions|transaction_[A-Za-z0-9_.-]{1,72})$/
function isTransactionCollection(value: string): boolean { return TRANSACTION_COLLECTION.test(value) }

export interface DomainRecordListOptions {
  limit?: number
  offset?: number
}

export interface DomainRecordQueryOptions extends DomainRecordListOptions {
  search?: string
  stage?: string
  source?: string
  ownerId?: string
  officeId?: string
  sort?: 'newest' | 'oldest' | 'name' | 'stage' | 'source'
}

export interface Repository {
  /** Narrow anonymous-read projection: returns only public published content and archived path tombstones. */
  getPublicContentProjection(organizationId: string, path: string): Promise<PublicContentProjection | null>
  listPublicContentProjections(organizationId: string): Promise<PublicContentProjection[]>
  /** Narrow anonymous projection of active, public canonical agent profiles. */
  listPublicAgentProfiles?(organizationId: string): Promise<PublicAgentProfileProjection[]>

  getOrganization(actor: Actor, id: string): Promise<Organization | null>
  getUser(actor: Actor, id: string): Promise<User | null>
  listUsers(actor: Actor): Promise<User[]>

  /** People visible to this actor. Agents see only their own assigned book. */
  listPeople(actor: Actor): Promise<Person[]>
  getPerson(actor: Actor, personId: string): Promise<Person | null>
  listActivity(actor: Actor, personId: string): Promise<Activity[]>
  listActivityForPeople(actor: Actor, personIds: string[]): Promise<Map<string, Activity[]>>
  listTasks(actor: Actor): Promise<Task[]>
  listAppointments(actor: Actor): Promise<Appointment[]>
  listDeals(actor: Actor): Promise<Deal[]>
  listRecruitingProspects(actor: Actor): Promise<RecruitingProspect[]>

  recordAudit(actor: Actor, event: AuditEvent): Promise<void>
  listAudit(actor: Actor, limit?: number): Promise<(AuditEvent & { occurredAt: string })[]>

  /** Durable JSONB bridge for domain services migrating from the legacy platform store. */
  getDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, collection: string, recordId: string,
  ): Promise<DomainRecord<T> | null>
  listDomainRecords<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, collection: string, options?: DomainRecordListOptions,
  ): Promise<DomainRecord<T>[]>
  /** Database-side filtering/count/paging for operational collections; optional for legacy test adapters. */
  queryDomainRecords?<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, collection: string, options: DomainRecordQueryOptions,
  ): Promise<{ records: DomainRecord<T>[]; total: number }>
  putDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, input: DomainRecordInput<T>,
  ): Promise<DomainRecord<T>>
  /** Commit a set of domain records in one database transaction or not at all. */
  putDomainRecordsAtomic(
    actor: Actor, inputs: DomainRecordInput[], auditEvents?: AuditEvent[],
  ): Promise<DomainRecord[]>
  deleteDomainRecord(actor: Actor, collection: string, recordId: string): Promise<boolean>
  /** Transaction-only write path enforces participant scope and immutable assignment fields. */
  putTransactionDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, input: TransactionDomainRecordInput<T>, auditEvents?: AuditEvent[],
  ): Promise<DomainRecord<T>>
}

export class DomainRecordConflictError extends Error {
  constructor(readonly collection: string, readonly recordId: string) {
    super('Domain record version conflict or create-only collision')
    this.name = 'DomainRecordConflictError'
  }
}

/** Thrown when an actor requests something outside their scope. */
export class PermissionDeniedError extends Error {
  constructor(readonly action: string, readonly reason: string) {
    super(`Permission denied: ${action} — ${reason}`)
    this.name = 'PermissionDeniedError'
  }
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

export interface MemorySeed {
  organizations: Organization[]
  users: User[]
  people: Person[]
  activity: Activity[]
  tasks: Task[]
  appointments: Appointment[]
  deals: Deal[]
  recruitingProspects: RecruitingProspect[]
}

export function emptySeed(): MemorySeed {
  return {
    organizations: [], users: [], people: [], activity: [],
    tasks: [], appointments: [], deals: [], recruitingProspects: [],
  }
}

export class MemoryRepository implements Repository {
  private audit: (AuditEvent & { occurredAt: string })[] = []
  private domainRecords = new Map<string, DomainRecord>()

  constructor(private seed: MemorySeed) {}

  private sameOrg<T extends { organizationId: string }>(actor: Actor, rows: T[]): T[] {
    return rows.filter(r => r.organizationId === actor.organizationId)
  }

  /** Resolve office scope from the canonical seeded user, never from caller input alone. */
  private managingOfficeId(actor: Actor): string | null {
    if (actor.role !== 'managing_broker') return null
    const canonical = this.seed.users.find(user => user.id === actor.userId && user.organizationId === actor.organizationId)
    if (!canonical?.officeId || (actor.officeId && actor.officeId !== canonical.officeId)) return null
    return canonical.officeId
  }

  private officeUserIds(actor: Actor): Set<string> {
    const officeId = this.managingOfficeId(actor)
    if (!officeId) return new Set()
    return new Set(this.seed.users.filter(user => user.organizationId === actor.organizationId && user.officeId === officeId).map(user => user.id))
  }

  async getPublicContentProjection(organizationId: string, path: string): Promise<PublicContentProjection | null> {
    if (!path.startsWith('/') || path.length > 240) return null
    const row = this.domainRecords.get(this.domainKey(organizationId, 'public_content', path))
    const data = row?.data
    if (!data || !['published', 'archived'].includes(String(data.status))) return null
    return { id: path, status: data.status as 'published' | 'archived', revision: Number(data.revision) || 0,
      ...(data.status === 'published' && data.published && typeof data.published === 'object' ? { published: structuredClone(data.published) as Record<string, unknown> } : {}) }
  }

  async listPublicContentProjections(organizationId: string): Promise<PublicContentProjection[]> {
    return [...this.domainRecords.values()].filter(row => row.organizationId === organizationId && row.collection === 'public_content' && ['published', 'archived'].includes(String(row.data.status)))
      .map(row => ({ id: row.recordId, status: row.data.status as 'published' | 'archived', revision: Number(row.data.revision) || 0,
        ...(row.data.status === 'published' && row.data.published && typeof row.data.published === 'object' ? { published: structuredClone(row.data.published) as Record<string, unknown> } : {}) }))
  }

  async listPublicAgentProfiles(organizationId: string): Promise<PublicAgentProfileProjection[]> {
    if (!organizationId) return []
    const out: PublicAgentProfileProjection[] = []
    for (const row of this.domainRecords.values()) {
      if (row.organizationId !== organizationId || row.collection !== 'member_profiles' || row.data.publicVisible !== true) continue
      const user = this.seed.users.find(member => member.id === row.recordId && member.organizationId === organizationId)
      const slug = row.data.verifiedPersonId
      if (!user || !user.isActive || typeof slug !== 'string' || !slug) continue
      out.push({ verifiedPersonId: slug, profile: structuredClone(row.data) })
    }
    return out
  }

  async getOrganization(actor: Actor, id: string) {
    if (id !== actor.organizationId) return null
    return this.seed.organizations.find(o => o.id === id) ?? null
  }

  async getUser(actor: Actor, id: string) {
    const user = this.seed.users.find(u => u.id === id && u.organizationId === actor.organizationId)
    if (!user) return null
    const officeId = this.managingOfficeId(actor)
    if (!canSeeWholeBrokerage(actor.role) && !(officeId && user.officeId === officeId) && user.id !== actor.userId) return null
    return user
  }

  async listUsers(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.users)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
    const officeId = this.managingOfficeId(actor)
    if (officeId) return inOrg.filter(u => u.officeId === officeId)
    return inOrg.filter(u => u.id === actor.userId)
  }

  async listPeople(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.people).filter(p => !p.deletedInFub)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
    if (actor.role === 'managing_broker') {
      const officeUserIds = this.officeUserIds(actor)
      return inOrg.filter(person => person.assignedUserId !== null && officeUserIds.has(person.assignedUserId))
    }
    // An agent sees ONLY the people assigned to them. This mirrors FUB's own
    // permission model, where an agent's API key reaches only their contacts.
    return inOrg.filter(p => p.assignedUserId === actor.userId)
  }

  async getPerson(actor: Actor, personId: string) {
    const visible = await this.listPeople(actor)
    return visible.find(p => p.id === personId) ?? null
  }

  async listActivity(actor: Actor, personId: string) {
    // Authorization flows through getPerson — no person, no activity.
    const person = await this.getPerson(actor, personId)
    if (!person) throw new PermissionDeniedError('listActivity', 'person not visible to this actor')
    return this.seed.activity
      .filter(a => a.personId === personId)
      .sort((x, y) => x.occurredAt.localeCompare(y.occurredAt))
  }

  async listActivityForPeople(actor: Actor, personIds: string[]) {
    const visible = new Set((await this.listPeople(actor)).map(p => p.id))
    const map = new Map<string, Activity[]>()
    for (const a of this.seed.activity) {
      if (!a.personId || !visible.has(a.personId)) continue
      if (personIds.length > 0 && !personIds.includes(a.personId)) continue
      const list = map.get(a.personId) ?? []
      list.push(a)
      map.set(a.personId, list)
    }
    for (const list of map.values()) list.sort((x, y) => x.occurredAt.localeCompare(y.occurredAt))
    return map
  }

  async listTasks(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.tasks)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
    if (actor.role === 'managing_broker') {
      const officeUserIds = this.officeUserIds(actor)
      return inOrg.filter(task => task.assignedUserId !== null && officeUserIds.has(task.assignedUserId))
    }
    return inOrg.filter(t => t.assignedUserId === actor.userId)
  }

  async listAppointments(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.appointments)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
    if (actor.role === 'managing_broker') {
      const officeUserIds = this.officeUserIds(actor)
      return inOrg.filter(item => item.assignedUserId !== null && officeUserIds.has(item.assignedUserId))
    }
    return inOrg.filter(a => a.assignedUserId === actor.userId)
  }

  async listDeals(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.deals)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
    if (actor.role === 'managing_broker') {
      const officeUserIds = this.officeUserIds(actor)
      return inOrg.filter(deal => deal.ownerUserId !== null && officeUserIds.has(deal.ownerUserId))
    }
    return inOrg.filter(d => d.ownerUserId === actor.userId)
  }

  async listRecruitingProspects(actor: Actor) {
    if (!canSeeRecruiting(actor.role)) {
      throw new PermissionDeniedError('listRecruitingProspects', `role '${actor.role}' may not read recruiting data`)
    }
    const inOrg = this.sameOrg(actor, this.seed.recruitingProspects)
    return inOrg
  }

  async recordAudit(actor: Actor, event: AuditEvent) {
    if (event.organizationId !== actor.organizationId || event.actorUserId !== actor.userId) {
      throw new PermissionDeniedError('recordAudit', 'audit identity must match the trusted actor')
    }
    this.audit.push({ ...event, occurredAt: new Date().toISOString() })
  }

  async listAudit(actor: Actor, limit = 100) {
    if (!canSeeWholeBrokerage(actor.role) && actor.role !== 'managing_broker') {
      throw new PermissionDeniedError('listAudit', 'only brokerage leadership may read the audit log')
    }
    const officeUserIds = actor.role === 'managing_broker' ? this.officeUserIds(actor) : null
    return this.audit
      .filter(a => a.organizationId === actor.organizationId && (!officeUserIds || (a.actorUserId !== null && officeUserIds.has(a.actorUserId))))
      .slice(-limit)
      .reverse()
  }


  private domainKey(organizationId: string, collection: string, recordId: string): string {
    return `${organizationId}\u0000${collection}\u0000${recordId}`
  }

  private canSeeDomainRecord(actor: Actor, record: DomainRecord): boolean {
    if (actor.organizationId !== record.organizationId) return false
    if (canSeeWholeBrokerage(actor.role) || actor.role === 'staff') return true
    if (actor.role === 'managing_broker') {
      const officeId = this.managingOfficeId(actor)
      if (!officeId) return record.ownerUserId === actor.userId
      if (isTransactionCollection(record.collection)) {
        if (record.collection === 'transactions') return record.data.officeId === officeId
        const parentId = String(record.data.transactionId ?? '')
        if (!parentId || (record.data.officeId !== undefined && record.data.officeId !== officeId)) return false
        const parent = this.domainRecords.get(this.domainKey(actor.organizationId, 'transactions', parentId))
        return parent?.data.officeId === officeId
      }
      if (record.ownerUserId === null) return !record.data.officeId || record.data.officeId === officeId
      const owner = this.seed.users.find(user => user.id === record.ownerUserId && user.organizationId === actor.organizationId)
      return owner?.officeId === officeId || record.ownerUserId === actor.userId
    }
    if (actor.role === 'marketing_admin' && ['marketing_campaigns', 'marketing_batches', 'marketing_schedule'].includes(record.collection)) return true
    // Discussion is shared only when its parent post is published. Private
    // drafts never expose comments or reactions to other members.
    if (record.collection === 'community_comments' || record.collection === 'community_reactions') {
      const post = this.domainRecords.get(this.domainKey(actor.organizationId, 'community_posts', String(record.data.postId ?? '')))
      if (post && post.ownerUserId === null && post.data.draft !== true && post.data.deleted !== true) return true
    }
    if (record.ownerUserId === null) return true
    if (record.ownerUserId === actor.userId) return true
    if (isTransactionCollection(record.collection)) {
      if (record.data.ownerId === actor.userId) return true
      if (actor.role === 'transaction_coordinator' && record.data.tcId === actor.userId) return true
      if (actor.role === 'team_lead' && actor.teamIds?.includes(String(record.data.teamId))) return true
    }
    // Team lead scope is intentionally not widened in this generic bridge. A
    // future caller may supply an explicit allowed-owner list after team policy.
    return false
  }

  async getDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, collection: string, recordId: string,
  ): Promise<DomainRecord<T> | null> {
    const record = this.domainRecords.get(this.domainKey(actor.organizationId, collection, recordId))
    if (!record || !this.canSeeDomainRecord(actor, record)) return null
    return structuredClone(record) as DomainRecord<T>
  }

  async listDomainRecords<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, collection: string, options: DomainRecordListOptions = {},
  ): Promise<DomainRecord<T>[]> {
    const limit = Math.max(1, Math.min(options.limit ?? 50, 200))
    const offset = Math.max(0, options.offset ?? 0)
    return [...this.domainRecords.values()]
      .filter(record => record.collection === collection && this.canSeeDomainRecord(actor, record))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.recordId.localeCompare(b.recordId))
      .slice(offset, offset + limit)
      .map(record => structuredClone(record) as DomainRecord<T>)
  }

  async putDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, input: DomainRecordInput<T>,
  ): Promise<DomainRecord<T>> {
    if (isTransactionCollection(input.collection)) throw new PermissionDeniedError('putDomainRecord', 'transaction records require the participant-checked transaction write API')
    const ownerUserId = input.ownerUserId ?? null
    const owner = ownerUserId ? this.seed.users.find(user => user.id === ownerUserId && user.organizationId === actor.organizationId) : null
    const officeId = this.managingOfficeId(actor)
    const officeManaged = Boolean(officeId) && owner?.officeId === officeId
    const mayWriteShared = ownerUserId === null && canSeeWholeBrokerage(actor.role)
    const mayWriteCms = actor.role === 'marketing_admin' && input.collection === 'public_content'
    const mayWriteOwned = mayWriteCms || ownerUserId === actor.userId
      || officeManaged
      || (['owner', 'broker', 'staff'].includes(actor.role) && ownerUserId !== null)
    if (!mayWriteShared && !mayWriteOwned) {
      throw new PermissionDeniedError('putDomainRecord', 'record owner is outside this actor scope')
    }
    const key = this.domainKey(actor.organizationId, input.collection, input.recordId)
    const prior = this.domainRecords.get(key)
    if (prior && !this.canSeeDomainRecord(actor, prior)) throw new PermissionDeniedError('putDomainRecord', 'existing record is outside this actor scope')
    if (input.createOnly && prior) throw new DomainRecordConflictError(input.collection, input.recordId)
    if (input.expectedVersion !== undefined && (!prior || input.expectedVersion !== prior.version)) {
      throw new DomainRecordConflictError(input.collection, input.recordId)
    }
    const now = new Date().toISOString()
    const record: DomainRecord<T> = {
      organizationId: actor.organizationId, collection: input.collection,
      recordId: input.recordId, ownerUserId, data: structuredClone(input.data),
      version: (prior?.version ?? 0) + 1, createdAt: prior?.createdAt ?? now, updatedAt: now,
    }
    this.domainRecords.set(key, record as DomainRecord)
    return structuredClone(record)
  }

  async putDomainRecordsAtomic(
    actor: Actor, inputs: DomainRecordInput[], auditEvents: AuditEvent[] = [],
  ): Promise<DomainRecord[]> {
    if (inputs.some(input => isTransactionCollection(input.collection))) throw new PermissionDeniedError('putDomainRecordsAtomic', 'transaction records require the participant-checked transaction write API')
    if (inputs.length < 1 || inputs.length > 100) throw new RangeError('Atomic write must contain 1 to 100 records')
    const now = new Date().toISOString()
    const staged = inputs.map(input => {
      const ownerUserId = input.ownerUserId ?? null
      const owner = ownerUserId ? this.seed.users.find(user => user.id === ownerUserId && user.organizationId === actor.organizationId) : null
      const officeId = this.managingOfficeId(actor)
      const officeManaged = Boolean(officeId) && owner?.officeId === officeId
      const mayWriteShared = ownerUserId === null && canSeeWholeBrokerage(actor.role)
      const mayWriteCms = actor.role === 'marketing_admin' && input.collection === 'public_content'
      const mayWriteOwned = mayWriteCms || ownerUserId === actor.userId || officeManaged || (['owner', 'broker', 'staff'].includes(actor.role) && ownerUserId !== null)
      if (!mayWriteShared && !mayWriteOwned) throw new PermissionDeniedError('putDomainRecordsAtomic', 'record owner is outside this actor scope')
      const key = this.domainKey(actor.organizationId, input.collection, input.recordId)
      const prior = this.domainRecords.get(key)
      if (prior && !this.canSeeDomainRecord(actor, prior)) throw new PermissionDeniedError('putDomainRecordsAtomic', 'existing record is outside this actor scope')
      if (input.createOnly && prior) throw new DomainRecordConflictError(input.collection, input.recordId)
      if (input.expectedVersion !== undefined && (!prior || input.expectedVersion !== prior.version)) throw new DomainRecordConflictError(input.collection, input.recordId)
      return { key, prior, input, ownerUserId }
    })
    if (new Set(staged.map(item => item.key)).size !== staged.length) throw new TypeError('Atomic write contains duplicate record identities')
    const records: DomainRecord[] = staged.map(({ prior, input, ownerUserId }) => ({
      organizationId: actor.organizationId, collection: input.collection, recordId: input.recordId,
      ownerUserId, data: structuredClone(input.data), version: (prior?.version ?? 0) + 1,
      createdAt: prior?.createdAt ?? now, updatedAt: now,
    } as DomainRecord))
    for (const event of auditEvents) {
      if (event.organizationId !== actor.organizationId || event.actorUserId !== actor.userId) throw new PermissionDeniedError('putDomainRecordsAtomic', 'audit identity must match the trusted actor')
    }
    for (let index = 0; index < staged.length; index++) this.domainRecords.set(staged[index].key, records[index])
    this.audit.push(...auditEvents.map(event => ({ ...event, occurredAt: now })))
    return records.map(record => structuredClone(record))
  }

  async putTransactionDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, input: TransactionDomainRecordInput<T>, auditEvents: AuditEvent[] = [],
  ): Promise<DomainRecord<T>> {
    if (!isTransactionCollection(input.collection) || input.data.organizationId !== actor.organizationId) throw new PermissionDeniedError('putTransactionDomainRecord', 'invalid transaction record scope')
    const ownerUserId = input.ownerUserId ?? null
    if (input.collection === 'transactions' && input.data.ownerId !== ownerUserId) throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction owner and repository owner must match')
    const key = this.domainKey(actor.organizationId, input.collection, input.recordId)
    const prior = this.domainRecords.get(key)
    if (input.createOnly && prior) throw new DomainRecordConflictError(input.collection, input.recordId)
    if (input.expectedVersion !== undefined && (!prior || prior.version !== input.expectedVersion)) throw new DomainRecordConflictError(input.collection, input.recordId)
    const broker = canSeeWholeBrokerage(actor.role)
    const officeId = this.managingOfficeId(actor)
    const officeManager = Boolean(officeId)
    if (officeManager) {
      const assignedIds = [String(input.data.ownerId ?? ''), String(input.data.tcId ?? '')].filter(Boolean)
      const officeUsers = this.seed.users.filter(user => user.organizationId === actor.organizationId && user.officeId === officeId)
      const officeUserIds = new Set(officeUsers.map(user => user.id))
      if (input.data.officeId !== officeId || assignedIds.some(id => !officeUserIds.has(id))) {
        throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction assignment must remain within the managing broker office')
      }
      if (input.data.tcId && !officeUsers.some(user => user.id === input.data.tcId && user.role === 'transaction_coordinator')) {
        throw new PermissionDeniedError('putTransactionDomainRecord', 'only an office transaction coordinator may be assigned')
      }
    }
    if (prior) {
      const existing = prior.data
      const isOwner = existing.ownerId === actor.userId
      const isAssignedTc = existing.tcId === actor.userId && actor.role === 'transaction_coordinator'
      const isTeamLead = actor.role === 'team_lead' && actor.teamIds?.includes(String(existing.teamId))
      if (officeManager && existing.officeId !== officeId) throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction is outside the managing broker office')
      if (!broker && !officeManager && !isOwner && !isAssignedTc && !isTeamLead) throw new PermissionDeniedError('putTransactionDomainRecord', 'actor is not a transaction participant')
      if (!broker && !officeManager && (input.data.ownerId !== existing.ownerId || input.data.tcId !== existing.tcId || input.data.teamId !== existing.teamId || ownerUserId !== prior.ownerUserId)) {
        throw new PermissionDeniedError('putTransactionDomainRecord', 'only brokerage administrators may reassign transaction ownership or participants')
      }
    } else {
      if (officeManager && input.data.officeId !== officeId) throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction is outside the managing broker office')
      if (ownerUserId !== actor.userId && !broker && !officeManager) throw new PermissionDeniedError('putTransactionDomainRecord', 'new transaction records must be owned by the actor')
      const transactionId = input.collection === 'transactions' ? input.recordId : String(input.data.transactionId ?? '')
      if (input.collection !== 'transactions') {
        const parent = this.domainRecords.get(this.domainKey(actor.organizationId, 'transactions', transactionId))
        if (!parent) throw new PermissionDeniedError('putTransactionDomainRecord', 'parent transaction is unavailable')
        const data = parent.data
        const participant = data.ownerId === actor.userId || (actor.role === 'transaction_coordinator' && data.tcId === actor.userId) || (actor.role === 'team_lead' && actor.teamIds?.includes(String(data.teamId)))
        if (!broker && !officeManager && !participant) throw new PermissionDeniedError('putTransactionDomainRecord', 'actor is not a transaction participant')
        for (const field of ['ownerId', 'tcId', 'teamId'] as const) if (input.data[field] !== data[field]) throw new PermissionDeniedError('putTransactionDomainRecord', 'child record participant fields must match the parent transaction')
      } else if (!broker && !officeManager && (input.data.ownerId !== actor.userId || input.data.tcId)) {
        throw new PermissionDeniedError('putTransactionDomainRecord', 'agents may create only transactions they own; only brokerage administrators may assign a coordinator')
      }
    }
    const now = new Date().toISOString()
    const record: DomainRecord<T> = { organizationId: actor.organizationId, collection: input.collection, recordId: input.recordId, ownerUserId, data: structuredClone(input.data), version: (prior?.version ?? 0) + 1, createdAt: prior?.createdAt ?? now, updatedAt: now }
    for (const event of auditEvents) if (event.organizationId !== actor.organizationId || event.actorUserId !== actor.userId) throw new PermissionDeniedError('putTransactionDomainRecord', 'audit identity must match the trusted actor')
    this.domainRecords.set(key, record as DomainRecord)
    this.audit.push(...auditEvents.map(event => ({ ...event, occurredAt: now })))
    return structuredClone(record)
  }

  async deleteDomainRecord(actor: Actor, collection: string, recordId: string): Promise<boolean> {
    if (isTransactionCollection(collection)) throw new PermissionDeniedError('deleteDomainRecord', 'transaction history is retained; archive the transaction instead')
    const key = this.domainKey(actor.organizationId, collection, recordId)
    const prior = this.domainRecords.get(key)
    if (!prior || !this.canSeeDomainRecord(actor, prior)) return false
    if (prior.ownerUserId !== actor.userId && !canSeeWholeBrokerage(actor.role)) {
      throw new PermissionDeniedError('deleteDomainRecord', 'record owner is outside this actor scope')
    }
    return this.domainRecords.delete(key)
  }

  /** Test helper — direct access to the seed for assertions. */
  raw(): MemorySeed { return this.seed }
}
