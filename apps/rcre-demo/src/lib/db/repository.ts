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

export interface DomainRecordListOptions {
  limit?: number
  offset?: number
}

export interface Repository {
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
  putDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, input: DomainRecordInput<T>,
  ): Promise<DomainRecord<T>>
  /** Commit a set of domain records in one database transaction or not at all. */
  putDomainRecordsAtomic<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, inputs: DomainRecordInput<T>[], auditEvents?: AuditEvent[],
  ): Promise<DomainRecord<T>[]>
  deleteDomainRecord(actor: Actor, collection: string, recordId: string): Promise<boolean>
}

export class DomainRecordConflictError extends Error {
  constructor(readonly collection: string, readonly recordId: string) {
    super('Domain record changed or already exists')
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

  async getOrganization(actor: Actor, id: string) {
    if (id !== actor.organizationId) return null
    return this.seed.organizations.find(o => o.id === id) ?? null
  }

  async getUser(actor: Actor, id: string) {
    const user = this.seed.users.find(u => u.id === id && u.organizationId === actor.organizationId)
    if (!user) return null
    if (!canSeeWholeBrokerage(actor.role) && user.id !== actor.userId) return null
    return user
  }

  async listUsers(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.users)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
    return inOrg.filter(u => u.id === actor.userId)
  }

  async listPeople(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.people).filter(p => !p.deletedInFub)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
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
    return inOrg.filter(t => t.assignedUserId === actor.userId)
  }

  async listAppointments(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.appointments)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
    return inOrg.filter(a => a.assignedUserId === actor.userId)
  }

  async listDeals(actor: Actor) {
    const inOrg = this.sameOrg(actor, this.seed.deals)
    if (canSeeWholeBrokerage(actor.role)) return inOrg
    return inOrg.filter(d => d.ownerUserId === actor.userId)
  }

  async listRecruitingProspects(actor: Actor) {
    if (!canSeeRecruiting(actor.role)) {
      throw new PermissionDeniedError('listRecruitingProspects', `role '${actor.role}' may not read recruiting data`)
    }
    return this.sameOrg(actor, this.seed.recruitingProspects)
  }

  async recordAudit(actor: Actor, event: AuditEvent) {
    if (event.organizationId !== actor.organizationId || event.actorUserId !== actor.userId) {
      throw new PermissionDeniedError('recordAudit', 'audit identity must match the trusted actor')
    }
    this.audit.push({ ...event, occurredAt: new Date().toISOString() })
  }

  async listAudit(actor: Actor, limit = 100) {
    if (!canSeeWholeBrokerage(actor.role)) {
      throw new PermissionDeniedError('listAudit', 'only owners and brokers may read the audit log')
    }
    return this.audit
      .filter(a => a.organizationId === actor.organizationId)
      .slice(-limit)
      .reverse()
  }


  private domainKey(organizationId: string, collection: string, recordId: string): string {
    return `${organizationId}\u0000${collection}\u0000${recordId}`
  }

  private canSeeDomainRecord(actor: Actor, record: DomainRecord): boolean {
    if (actor.organizationId !== record.organizationId) return false
    if (canSeeWholeBrokerage(actor.role) || actor.role === 'staff') return true
    if (record.ownerUserId === null) return true
    if (record.ownerUserId === actor.userId) return true
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
    const ownerUserId = input.ownerUserId ?? null
    const mayWriteShared = ownerUserId === null && canSeeWholeBrokerage(actor.role)
    const mayWriteOwned = ownerUserId === actor.userId
      || (['owner', 'broker', 'staff'].includes(actor.role) && ownerUserId !== null)
    if (!mayWriteShared && !mayWriteOwned) {
      throw new PermissionDeniedError('putDomainRecord', 'record owner is outside this actor scope')
    }
    const key = this.domainKey(actor.organizationId, input.collection, input.recordId)
    const prior = this.domainRecords.get(key)
    if (prior && input.expectedVersion !== undefined && input.expectedVersion !== prior.version) {
      throw new Error('Domain record version conflict')
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

  async putDomainRecordsAtomic<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, inputs: DomainRecordInput<T>[], auditEvents: AuditEvent[] = [],
  ): Promise<DomainRecord<T>[]> {
    if (inputs.length < 1 || inputs.length > 100) throw new RangeError('Atomic write must contain 1 to 100 records')
    const now = new Date().toISOString()
    const staged = inputs.map(input => {
      const ownerUserId = input.ownerUserId ?? null
      const mayWriteShared = ownerUserId === null && canSeeWholeBrokerage(actor.role)
      const mayWriteOwned = ownerUserId === actor.userId || (['owner', 'broker', 'staff'].includes(actor.role) && ownerUserId !== null)
      if (!mayWriteShared && !mayWriteOwned) throw new PermissionDeniedError('putDomainRecordsAtomic', 'record owner is outside this actor scope')
      const key = this.domainKey(actor.organizationId, input.collection, input.recordId)
      const prior = this.domainRecords.get(key)
      if (input.createOnly && prior) throw new DomainRecordConflictError(input.collection, input.recordId)
      if (input.expectedVersion !== undefined && (!prior || input.expectedVersion !== prior.version)) throw new DomainRecordConflictError(input.collection, input.recordId)
      return { key, prior, input, ownerUserId }
    })
    if (new Set(staged.map(item => item.key)).size !== staged.length) throw new TypeError('Atomic write contains duplicate record identities')
    const records = staged.map(({ prior, input, ownerUserId }) => ({
      organizationId: actor.organizationId, collection: input.collection, recordId: input.recordId,
      ownerUserId, data: structuredClone(input.data), version: (prior?.version ?? 0) + 1,
      createdAt: prior?.createdAt ?? now, updatedAt: now,
    } as DomainRecord<T>))
    for (const event of auditEvents) {
      if (event.organizationId !== actor.organizationId || event.actorUserId !== actor.userId) throw new PermissionDeniedError('putDomainRecordsAtomic', 'audit identity must match the trusted actor')
    }
    for (let index = 0; index < staged.length; index++) this.domainRecords.set(staged[index].key, records[index] as DomainRecord)
    this.audit.push(...auditEvents.map(event => ({ ...event, occurredAt: now })))
    return records.map(record => structuredClone(record))
  }

  async deleteDomainRecord(actor: Actor, collection: string, recordId: string): Promise<boolean> {
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
