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
} from '@/lib/types'

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

export interface Repository {
  getOrganization(id: string): Promise<Organization | null>
  getUser(id: string): Promise<User | null>
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

  recordAudit(event: AuditEvent): Promise<void>
  listAudit(actor: Actor, limit?: number): Promise<(AuditEvent & { occurredAt: string })[]>
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

  constructor(private seed: MemorySeed) {}

  private sameOrg<T extends { organizationId: string }>(actor: Actor, rows: T[]): T[] {
    return rows.filter(r => r.organizationId === actor.organizationId)
  }

  async getOrganization(id: string) {
    return this.seed.organizations.find(o => o.id === id) ?? null
  }

  async getUser(id: string) {
    return this.seed.users.find(u => u.id === id) ?? null
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

  async recordAudit(event: AuditEvent) {
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

  /** Test helper — direct access to the seed for assertions. */
  raw(): MemorySeed { return this.seed }
}
