import 'server-only'
import { Pool, type PoolClient } from 'pg'
import { env } from '@/lib/config/env'
import {
  PermissionDeniedError, canSeeRecruiting, canSeeWholeBrokerage,
  type Actor, type Repository,
} from './repository'
import { withRlsSession } from './rls'
import type {
  Activity, Appointment, AuditEvent, Deal, Organization, Person,
  RecruitingProspect, Task, User,
} from '@/lib/domain-types'

/**
 * Postgres repository.
 *
 * Scoping is applied in SQL, not after the fact. Every query that returns
 * person-scoped rows carries the ownership predicate inline, so a caller
 * cannot receive rows they are not entitled to even if the caller has a bug.
 *
 * TWO LAYERS, AND BOTH ARE LOAD-BEARING. The inline predicates below are the
 * first. The second is row-level security in the database (migration 0003),
 * which reads three transaction-local settings — `rcre.organization_id`,
 * `rcre.user_id`, `rcre.role`. **Those settings do not set themselves.**
 *
 * Every query therefore runs inside `withRlsSession`, which opens a
 * transaction, applies the actor's context and only then hands over the
 * client. Without it, 0003's policies read NULL: either every query returns
 * nothing, or — if the connection happens to hold a BYPASSRLS role — the
 * policies enforce nothing at all and the only protection left is the
 * application predicates. The second failure is silent, which is what makes it
 * dangerous.
 *
 * Reads that legitimately precede an actor — `getOrganization`, `getUser`,
 * which are how an actor is resolved in the first place — pass `null` context
 * explicitly and are marked at the call site. They must stay few and obvious.
 *
 * NOT YET EXERCISED against a real database — no Postgres instance is
 * provisioned and doing so is outside the current authorization. Structure and
 * SQL are written; the MemoryRepository is what the MVP currently runs on.
 */
/**
 * Stand-in user id for audit rows a human did not cause — webhook ingestion,
 * scheduled jobs. It is a real UUID rather than an empty string so the RLS
 * context validator cannot mistake a system write for a missing context, which
 * is the failure that would silently drop the row.
 */
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000'

let pool: Pool | null = null
function getPool(): Pool {
  if (!pool) {
    if (!env.databaseUrl) throw new Error('DATABASE_URL is not configured')
    pool = new Pool({ connectionString: env.databaseUrl, max: 10 })
  }
  return pool
}

/** Predicate restricting person rows to what the actor may see. */
function personScope(actor: Actor, alias = 'p'): { sql: string; params: unknown[] } {
  if (canSeeWholeBrokerage(actor.role)) {
    return { sql: `${alias}.organization_id = $1`, params: [actor.organizationId] }
  }
  return {
    sql: `${alias}.organization_id = $1 and ${alias}.assigned_user_id = $2`,
    params: [actor.organizationId, actor.userId],
  }
}

export class PgRepository implements Repository {
  /**
   * Run one query as `actor`.
   *
   * The actor is a REQUIRED argument rather than an optional one so that
   * forgetting it is a type error rather than a silent loss of row-level
   * security. Bootstrap reads that genuinely precede an actor pass `null`
   * deliberately.
   */
  private async q<T>(
    actor: Actor | null,
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const client: PoolClient = await getPool().connect()
    try {
      return await withRlsSession<T[]>(client, actor, async c => {
        const res = (await c.query(text, params)) as { rows?: unknown[] }
        return (res.rows ?? []) as T[]
      })
    } finally {
      client.release()
    }
  }

  async getOrganization(id: string): Promise<Organization | null> {
    // Bootstrap read: resolves the org an actor belongs to, so it precedes the
    // actor. Returns one row by primary key; carries no person-scoped data.
    const rows = await this.q<Organization>(null,
      `select id, name, slug, fub_account_id as "fubAccountId"
         from organizations where id = $1`, [id])
    return rows[0] ?? null
  }

  async getUser(id: string): Promise<User | null> {
    // Bootstrap read: this is how an Actor is built. Same reasoning as above.
    const rows = await this.q<User>(null,
      `select id, organization_id as "organizationId", email, full_name as "fullName",
              role, fub_user_id as "fubUserId", is_active as "isActive"
         from users where id = $1`, [id])
    return rows[0] ?? null
  }

  async listUsers(actor: Actor): Promise<User[]> {
    if (canSeeWholeBrokerage(actor.role)) {
      return this.q<User>(actor, 
        `select id, organization_id as "organizationId", email, full_name as "fullName",
                role, fub_user_id as "fubUserId", is_active as "isActive"
           from users where organization_id = $1 order by full_name`,
        [actor.organizationId])
    }
    return this.q<User>(actor, 
      `select id, organization_id as "organizationId", email, full_name as "fullName",
              role, fub_user_id as "fubUserId", is_active as "isActive"
         from users where organization_id = $1 and id = $2`,
      [actor.organizationId, actor.userId])
  }

  private personColumns = `
    p.id, p.organization_id as "organizationId", p.fub_person_id as "fubPersonId",
    p.first_name as "firstName", p.last_name as "lastName", p.emails, p.phones,
    p.stage, p.source, p.assigned_user_id as "assignedUserId",
    p.assigned_fub_user_id as "assignedFubUserId", p.tags, p.price,
    p.first_received_at as "firstReceivedAt", p.first_assigned_at as "firstAssignedAt",
    p.first_touch_at as "firstTouchAt", p.last_touch_at as "lastTouchAt",
    p.last_inbound_at as "lastInboundAt", p.last_outbound_at as "lastOutboundAt",
    p.is_buyer as "isBuyer", p.is_seller as "isSeller",
    p.budget_min as "budgetMin", p.budget_max as "budgetMax",
    p.birthday, p.deleted_in_fub as "deletedInFub"`

  async listPeople(actor: Actor): Promise<Person[]> {
    const s = personScope(actor)
    return this.q<Person>(actor, 
      `select ${this.personColumns} from people p
        where ${s.sql} and p.deleted_in_fub = false
        order by p.first_received_at desc nulls last`, s.params)
  }

  async getPerson(actor: Actor, personId: string): Promise<Person | null> {
    const s = personScope(actor)
    const rows = await this.q<Person>(actor,
      `select ${this.personColumns} from people p
        where ${s.sql} and p.id = $${s.params.length + 1} and p.deleted_in_fub = false`,
      [...s.params, personId])
    return rows[0] ?? null
  }

  async listActivity(actor: Actor, personId: string): Promise<Activity[]> {
    const person = await this.getPerson(actor, personId)
    if (!person) throw new PermissionDeniedError('listActivity', 'person not visible to this actor')
    return this.q<Activity>(actor, 
      `select a.id, a.organization_id as "organizationId", a.person_id as "personId",
              a.user_id as "userId", a.kind, a.direction, a.occurred_at as "occurredAt",
              a.summary, a.source_system as "sourceSystem",
              a.fub_resource_type as "fubResourceType", a.fub_resource_id as "fubResourceId",
              a.metadata
         from activity a where a.person_id = $1 order by a.occurred_at asc`, [personId])
  }

  async listActivityForPeople(actor: Actor, personIds: string[]): Promise<Map<string, Activity[]>> {
    const s = personScope(actor)
    const rows = await this.q<Activity>(actor,
      `select a.id, a.organization_id as "organizationId", a.person_id as "personId",
              a.user_id as "userId", a.kind, a.direction, a.occurred_at as "occurredAt",
              a.summary, a.source_system as "sourceSystem",
              a.fub_resource_type as "fubResourceType", a.fub_resource_id as "fubResourceId",
              a.metadata
         from activity a
         join people p on p.id = a.person_id
        where ${s.sql}
          and ($${s.params.length + 1}::uuid[] is null
               or a.person_id = any($${s.params.length + 1}::uuid[]))
        order by a.occurred_at asc`,
      [...s.params, personIds.length > 0 ? personIds : null])
    const map = new Map<string, Activity[]>()
    for (const r of rows) {
      if (!r.personId) continue
      const list = map.get(r.personId) ?? []
      list.push(r)
      map.set(r.personId, list)
    }
    return map
  }

  async listTasks(actor: Actor): Promise<Task[]> {
    const own = canSeeWholeBrokerage(actor.role)
      ? '' : ' and t.assigned_user_id = $2'
    const params = canSeeWholeBrokerage(actor.role)
      ? [actor.organizationId] : [actor.organizationId, actor.userId]
    return this.q<Task>(actor, 
      `select t.id, t.organization_id as "organizationId", t.person_id as "personId",
              t.assigned_user_id as "assignedUserId", t.fub_task_id as "fubTaskId",
              t.title, t.due_at as "dueAt", t.is_completed as "isCompleted"
         from tasks t where t.organization_id = $1${own} order by t.due_at asc nulls last`,
      params)
  }

  async listAppointments(actor: Actor): Promise<Appointment[]> {
    const own = canSeeWholeBrokerage(actor.role) ? '' : ' and a.assigned_user_id = $2'
    const params = canSeeWholeBrokerage(actor.role)
      ? [actor.organizationId] : [actor.organizationId, actor.userId]
    return this.q<Appointment>(actor, 
      `select a.id, a.organization_id as "organizationId", a.person_id as "personId",
              a.assigned_user_id as "assignedUserId", a.fub_appointment_id as "fubAppointmentId",
              a.title, a.starts_at as "startsAt", a.ends_at as "endsAt", a.location, a.outcome
         from appointments a where a.organization_id = $1${own} order by a.starts_at asc`,
      params)
  }

  async listDeals(actor: Actor): Promise<Deal[]> {
    const own = canSeeWholeBrokerage(actor.role) ? '' : ' and d.owner_user_id = $2'
    const params = canSeeWholeBrokerage(actor.role)
      ? [actor.organizationId] : [actor.organizationId, actor.userId]
    return this.q<Deal>(actor, 
      `select d.id, d.organization_id as "organizationId", d.person_id as "personId",
              d.owner_user_id as "ownerUserId", d.fub_deal_id as "fubDealId",
              d.name, d.stage, d.price, d.projected_close_on as "projectedCloseOn",
              d.closed_at as "closedAt", d.status,
              d.last_stage_change_at as "lastStageChangeAt"
         from deals d where d.organization_id = $1${own}`, params)
  }

  async listRecruitingProspects(actor: Actor): Promise<RecruitingProspect[]> {
    if (!canSeeRecruiting(actor.role)) {
      throw new PermissionDeniedError('listRecruitingProspects',
        `role '${actor.role}' may not read recruiting data`)
    }
    return this.q<RecruitingProspect>(actor, 
      `select id, organization_id as "organizationId", full_name as "fullName",
              email, phone, current_brokerage as "currentBrokerage", market, stage,
              is_confidential as "isConfidential", owner_user_id as "ownerUserId",
              first_received_at as "firstReceivedAt", first_touch_at as "firstTouchAt",
              last_touch_at as "lastTouchAt"
         from recruiting_prospects where organization_id = $1 order by first_received_at desc`,
      [actor.organizationId])
  }

  async recordAudit(e: AuditEvent): Promise<void> {
    // The audit row carries its own actor, so reconstruct the context the RLS
    // insert policy checks rather than writing outside a session.
    //
    // `organizationId` is legitimately null for system-level events — migration
    // 0003 makes the column nullable for exactly this case and notes those rows
    // are reachable only by the ingestion role. We pass a null context there
    // rather than inventing a tenant: under RLS the insert will be refused
    // unless the connection genuinely holds that role, which is the correct
    // and visible outcome. Fabricating an org id would make a cross-tenant
    // audit row look like it belonged to someone.
    const actor: Actor | null = e.organizationId
      ? {
          userId: e.actorUserId ?? SYSTEM_ACTOR_ID,
          organizationId: e.organizationId,
          role: 'owner',
        }
      : null
    await this.q(actor,
      `insert into audit_events
         (organization_id, actor_user_id, actor_kind, action, target_type, target_id,
          effect, allowed, denied_reason, detail)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [e.organizationId, e.actorUserId, e.actorKind, e.action, e.targetType ?? null,
       e.targetId ?? null, e.effect, e.allowed, e.deniedReason ?? null,
       JSON.stringify(e.detail ?? {})])
  }

  async listAudit(actor: Actor, limit = 100) {
    if (!canSeeWholeBrokerage(actor.role)) {
      throw new PermissionDeniedError('listAudit', 'only owners and brokers may read the audit log')
    }
    return this.q<AuditEvent & { occurredAt: string }>(actor, 
      `select organization_id as "organizationId", actor_user_id as "actorUserId",
              actor_kind as "actorKind", action, target_type as "targetType",
              target_id as "targetId", effect, allowed, denied_reason as "deniedReason",
              detail, occurred_at as "occurredAt"
         from audit_events where organization_id = $1
        order by occurred_at desc limit $2`, [actor.organizationId, limit])
  }
}
