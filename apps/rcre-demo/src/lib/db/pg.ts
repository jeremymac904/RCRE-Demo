import 'server-only'
import { Pool, type PoolClient } from 'pg'
import { env } from '@/lib/config/env'
import {
  DomainRecordConflictError, PermissionDeniedError, canSeeRecruiting, canSeeWholeBrokerage,
  type Actor, type DomainRecord, type DomainRecordInput, type DomainRecordListOptions, type DomainRecordQueryOptions, type PublicContentProjection, type Repository, type TransactionDomainRecordInput,
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
 * There are no unscoped bootstrap reads. Identity-provider claims must resolve
 * to a trusted actor before repository access; every query, including identity
 * lookups, is scoped through RLS.
 *
 * NOT YET EXERCISED against a real database — no Postgres instance is
 * provisioned and doing so is outside the current authorization. Structure and
 * SQL are written; the MemoryRepository is what the MVP currently runs on.
 */
let pool: Pool | null = null
export function getPgPool(): Pool {
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
  if (actor.role === 'managing_broker') {
    return { sql: `${alias}.organization_id = $1 and ${alias}.assigned_user_id in (select rcre_scoped_user_ids())`, params: [actor.organizationId] }
  }
  return {
    sql: `${alias}.organization_id = $1 and ${alias}.assigned_user_id = $2`,
    params: [actor.organizationId, actor.userId],
  }
}

const MAX_DOMAIN_JSON_BYTES = 256 * 1024

function validateDomainKey(collection: string, recordId: string): void {
  if (!/^[a-z][a-z0-9_.-]{0,79}$/i.test(collection)) {
    throw new TypeError('Domain collection must be 1-80 safe characters')
  }
  if (typeof recordId !== 'string' || recordId.length < 1 || recordId.length > 200) {
    throw new TypeError('Domain record id must be 1-200 characters')
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
}

function transactionCollection(value: string): boolean { return /^(transactions|transaction_[A-Za-z0-9_.-]{1,72})$/.test(value) }

function canWriteDomainOwner(actor: Actor, ownerUserId: string | null): boolean {
  const admin = ['owner', 'broker', 'staff', 'managing_broker'].includes(actor.role)
  return ownerUserId === null ? ['owner', 'broker'].includes(actor.role)
    : ownerUserId === actor.userId || admin
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
    actor: Actor,
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const client: PoolClient = await getPgPool().connect()
    try {
      return await withRlsSession<T[]>(client, actor, async c => {
        const res = (await c.query(text, params)) as { rows?: unknown[] }
        return (res.rows ?? []) as T[]
      })
    } finally {
      client.release()
    }
  }

  async getPublicContentProjection(organizationId: string, path: string): Promise<PublicContentProjection | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId) || !path.startsWith('/') || path.length > 240) return null
    const rows = (await getPgPool().query(
      `select id, status, revision, published from rcre_public_content_projection($1::uuid, $2::text)`,
      [organizationId, path],
    ) as { rows?: PublicContentProjection[] }).rows ?? []
    return rows[0] ?? null
  }

  async listPublicContentProjections(organizationId: string): Promise<PublicContentProjection[]> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) return []
    return (await getPgPool().query(
      `select id, status, revision, published from rcre_public_content_projection($1::uuid, null::text)`,
      [organizationId],
    ) as { rows?: PublicContentProjection[] }).rows ?? []
  }

  async getOrganization(actor: Actor, id: string): Promise<Organization | null> {
    if (id !== actor.organizationId) return null
    const rows = await this.q<Organization>(actor,
      `select id, name, slug, fub_account_id as "fubAccountId"
         from organizations where id = $1 and id = $2`, [actor.organizationId, id])
    return rows[0] ?? null
  }

  async getUser(actor: Actor, id: string): Promise<User | null> {
    const scopeByRls = canSeeWholeBrokerage(actor.role) || actor.role === 'managing_broker'
    const own = scopeByRls ? '' : ' and id = $3'
    const params = scopeByRls ? [actor.organizationId, id] : [actor.organizationId, id, actor.userId]
    const rows = await this.q<User>(actor,
      `select id, organization_id as "organizationId", email, full_name as "fullName",
              role, fub_user_id as "fubUserId", is_active as "isActive", office_id as "officeId"
         from users where organization_id = $1 and id = $2${own}`, params)
    return rows[0] ?? null
  }

  async listUsers(actor: Actor): Promise<User[]> {
    if (canSeeWholeBrokerage(actor.role) || actor.role === 'managing_broker') {
      return this.q<User>(actor, 
        `select id, organization_id as "organizationId", email, full_name as "fullName",
                role, fub_user_id as "fubUserId", is_active as "isActive", office_id as "officeId"
           from users where organization_id = $1 order by full_name`,
        [actor.organizationId])
    }
    return this.q<User>(actor, 
      `select id, organization_id as "organizationId", email, full_name as "fullName",
              role, fub_user_id as "fubUserId", is_active as "isActive", office_id as "officeId"
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

  async recordAudit(actor: Actor, e: AuditEvent): Promise<void> {
    if (e.organizationId !== actor.organizationId || e.actorUserId !== actor.userId) {
      throw new PermissionDeniedError('recordAudit', 'audit identity must match the trusted actor')
    }
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
        order by occurred_at desc limit $2`, [actor.organizationId, Math.max(1, Math.min(limit, 500))])
  }

  private domainRecordColumns = `organization_id as "organizationId", collection,
    record_id as "recordId", owner_user_id as "ownerUserId", data, version,
    created_at as "createdAt", updated_at as "updatedAt"`

  async getDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, collection: string, recordId: string,
  ): Promise<DomainRecord<T> | null> {
    validateDomainKey(collection, recordId)
    const rows = await this.q<DomainRecord<T>>(actor,
      `select ${this.domainRecordColumns} from rcre_domain_records
        where organization_id = $1 and collection = $2 and record_id = $3`,
      [actor.organizationId, collection, recordId])
    return rows[0] ?? null
  }

  async listDomainRecords<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, collection: string, options: DomainRecordListOptions = {},
  ): Promise<DomainRecord<T>[]> {
    validateDomainKey(collection, 'list')
    const limit = Math.max(1, Math.min(Math.trunc(options.limit ?? 50), 200))
    const offset = Math.max(0, Math.trunc(options.offset ?? 0))
    return this.q<DomainRecord<T>>(actor,
      `select ${this.domainRecordColumns} from rcre_domain_records
        where organization_id = $1 and collection = $2
        order by updated_at desc, record_id asc limit $3 offset $4`,
      [actor.organizationId, collection, limit, offset])
  }

  async queryDomainRecords<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, collection: string, options: DomainRecordQueryOptions,
  ): Promise<{ records: DomainRecord<T>[]; total: number }> {
    validateDomainKey(collection, 'query')
    const limit = Math.max(1, Math.min(Math.trunc(options.limit ?? 50), 100))
    const offset = Math.max(0, Math.trunc(options.offset ?? 0))
    const search = String(options.search ?? '').trim().slice(0, 200).toLocaleLowerCase()
    const stage = options.stage?.slice(0, 100) || null
    const source = options.source?.slice(0, 200) || null
    const ownerId = options.ownerId?.slice(0, 100) || null
    const officeId = options.officeId?.slice(0, 100) || null
    const sort = options.sort ?? 'newest'
    const orderBy: Record<NonNullable<DomainRecordQueryOptions['sort']>, string> = {
      newest: `data->>'receivedAt' desc nulls last, record_id asc`,
      oldest: `data->>'receivedAt' asc nulls last, record_id asc`,
      name: `lower(coalesce(data->>'firstName','')), lower(coalesce(data->>'lastName','')), record_id asc`,
      stage: `lower(coalesce(data->>'stage','')), record_id asc`,
      source: `lower(coalesce(data->>'source','')), record_id asc`,
    }
    const order = orderBy[sort] ?? orderBy.newest
    const result = await this.q<{ total: number | string; records: DomainRecord<T>[] }>(actor,
      `with filtered as materialized (
         select ${this.domainRecordColumns}
           from rcre_domain_records
          where organization_id = $1 and collection = $2
            and (
              $3::text = ''
              or position($3 in lower(concat_ws(' ', data->>'firstName', data->>'lastName', data->>'email', data->>'phone', data->>'source', data->>'location', data->>'stage'))) > 0
              or exists (select 1 from jsonb_array_elements_text(
                case when jsonb_typeof(data->'tags') = 'array' then data->'tags' else '[]'::jsonb end) tag where position($3 in lower(tag)) > 0)
            )
            and coalesce(data->>'sourceDeleted', 'false') <> 'true'
            and ($4::text is null or data->>'stage' = $4)
            and ($5::text is null or data->>'source' = $5)
            and ($6::text is null or data->>'ownerId' = $6)
            and ($7::text is null or data->>'officeId' = $7)
       )
       select (select count(*)::int from filtered) as total,
              coalesce((select jsonb_agg(to_jsonb(page_row)) from (select * from filtered order by ${order} limit $8 offset $9) page_row), '[]'::jsonb) as records`,
      [actor.organizationId, collection, search, stage, source, ownerId, officeId, limit, offset])
    return { records: result[0]?.records ?? [], total: Number(result[0]?.total ?? 0) }
  }

  async putDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, input: DomainRecordInput<T>,
  ): Promise<DomainRecord<T>> {
    if (transactionCollection(input.collection)) throw new PermissionDeniedError('putDomainRecord', 'transaction records require the participant-checked transaction write API')
    validateDomainKey(input.collection, input.recordId)
    const ownerUserId = input.ownerUserId ?? null
    if (!canWriteDomainOwner(actor, ownerUserId) && !(actor.role === 'marketing_admin' && input.collection === 'public_content')) {
      throw new PermissionDeniedError('putDomainRecord', 'record owner is outside this actor scope')
    }
    if (!isPlainRecord(input.data)) throw new TypeError('Domain data must be a JSON object')
    const json = JSON.stringify(input.data)
    if (Buffer.byteLength(json, 'utf8') > MAX_DOMAIN_JSON_BYTES) {
      throw new RangeError('Domain record exceeds the 256 KB limit')
    }
    const rows = input.createOnly
      ? await this.q<DomainRecord<T>>(actor,
        `insert into rcre_domain_records (organization_id, collection, record_id, owner_user_id, data)
         values ($1, $2, $3, $4, $5::jsonb)
         on conflict (organization_id, collection, record_id) do nothing
         returning ${this.domainRecordColumns}`,
        [actor.organizationId, input.collection, input.recordId, ownerUserId, json])
      : input.expectedVersion === undefined
        ? await this.q<DomainRecord<T>>(actor,
          `insert into rcre_domain_records (organization_id, collection, record_id, owner_user_id, data)
           values ($1, $2, $3, $4, $5::jsonb)
           on conflict (organization_id, collection, record_id) do update
             set owner_user_id = excluded.owner_user_id, data = excluded.data,
                 version = rcre_domain_records.version + 1, updated_at = now()
           returning ${this.domainRecordColumns}`,
          [actor.organizationId, input.collection, input.recordId, ownerUserId, json])
        : await this.q<DomainRecord<T>>(actor,
        `update rcre_domain_records set owner_user_id = $4, data = $5::jsonb,
             version = version + 1, updated_at = now()
         where organization_id = $1 and collection = $2 and record_id = $3 and version = $6
         returning ${this.domainRecordColumns}`,
        [actor.organizationId, input.collection, input.recordId, ownerUserId, json, input.expectedVersion])
    if (!rows[0]) throw new DomainRecordConflictError(input.collection, input.recordId)
    return rows[0]
  }

  async putDomainRecordsAtomic(
    actor: Actor, inputs: DomainRecordInput[], auditEvents: AuditEvent[] = [],
  ): Promise<DomainRecord[]> {
    if (inputs.length < 1 || inputs.length > 100) throw new RangeError('Atomic write must contain 1 to 100 records')
    const keys = new Set<string>()
    for (const input of inputs) {
      validateDomainKey(input.collection, input.recordId)
      const key = `${input.collection}\u0000${input.recordId}`
      if (keys.has(key)) throw new TypeError('Atomic write contains duplicate record identities')
      keys.add(key)
      const ownerUserId = input.ownerUserId ?? null
      if (!canWriteDomainOwner(actor, ownerUserId) && !(actor.role === 'marketing_admin' && input.collection === 'public_content')) throw new PermissionDeniedError('putDomainRecordsAtomic', 'record owner is outside this actor scope')
      if (!isPlainRecord(input.data)) throw new TypeError('Domain data must be a JSON object')
      if (Buffer.byteLength(JSON.stringify(input.data), 'utf8') > MAX_DOMAIN_JSON_BYTES) throw new RangeError('Domain record exceeds the 256 KB limit')
      if (input.createOnly && input.expectedVersion !== undefined) throw new TypeError('Insert-only records cannot specify an expected version')
    }
    const client = await getPgPool().connect()
    try {
      return await withRlsSession(client, actor, async scoped => {
        const result: DomainRecord[] = []
        for (const input of inputs) {
          const ownerUserId = input.ownerUserId ?? null
          let rows: DomainRecord[]
          try {
            if (input.createOnly) {
              rows = (await scoped.query(
                `insert into rcre_domain_records (organization_id, collection, record_id, owner_user_id, data)
                 values ($1, $2, $3, $4, $5::jsonb) returning ${this.domainRecordColumns}`,
                [actor.organizationId, input.collection, input.recordId, ownerUserId, JSON.stringify(input.data)],
              ) as { rows?: DomainRecord[] }).rows ?? []
            } else if (input.expectedVersion !== undefined) {
              rows = (await scoped.query(
                `update rcre_domain_records set owner_user_id = $4, data = $5::jsonb,
                   version = version + 1, updated_at = now()
                 where organization_id = $1 and collection = $2 and record_id = $3 and version = $6
                 returning ${this.domainRecordColumns}`,
                [actor.organizationId, input.collection, input.recordId, ownerUserId, JSON.stringify(input.data), input.expectedVersion],
              ) as { rows?: DomainRecord[] }).rows ?? []
            } else {
              rows = (await scoped.query(
                `insert into rcre_domain_records (organization_id, collection, record_id, owner_user_id, data)
                 values ($1, $2, $3, $4, $5::jsonb)
                 on conflict (organization_id, collection, record_id) do update
                   set owner_user_id = excluded.owner_user_id, data = excluded.data,
                       version = rcre_domain_records.version + 1, updated_at = now()
                 returning ${this.domainRecordColumns}`,
                [actor.organizationId, input.collection, input.recordId, ownerUserId, JSON.stringify(input.data)],
              ) as { rows?: DomainRecord[] }).rows ?? []
            }
          } catch (error) {
            if (input.createOnly && typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
              throw new DomainRecordConflictError(input.collection, input.recordId)
            }
            throw error
          }
          if (!rows[0]) throw new DomainRecordConflictError(input.collection, input.recordId)
          result.push(rows[0])
        }
        for (const event of auditEvents) {
          if (event.organizationId !== actor.organizationId || event.actorUserId !== actor.userId) {
            throw new PermissionDeniedError('putDomainRecordsAtomic', 'audit identity must match the trusted actor')
          }
          await scoped.query(
            `insert into audit_events
              (organization_id, actor_user_id, actor_kind, action, target_type, target_id,
               effect, allowed, denied_reason, detail)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [event.organizationId, event.actorUserId, event.actorKind, event.action, event.targetType ?? null,
              event.targetId ?? null, event.effect, event.allowed, event.deniedReason ?? null,
              JSON.stringify(event.detail ?? {})],
          )
        }
        return result
      })
    } finally {
      client.release()
    }
  }

  async putTransactionDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    actor: Actor, input: TransactionDomainRecordInput<T>, auditEvents: AuditEvent[] = [],
  ): Promise<DomainRecord<T>> {
    if (!transactionCollection(input.collection) || input.data.organizationId !== actor.organizationId) {
      throw new PermissionDeniedError('putTransactionDomainRecord', 'invalid transaction record scope')
    }
    validateDomainKey(input.collection, input.recordId)
    if (!isPlainRecord(input.data) || Buffer.byteLength(JSON.stringify(input.data), 'utf8') > MAX_DOMAIN_JSON_BYTES) throw new TypeError('Transaction domain data is invalid or too large')
    const broker = canSeeWholeBrokerage(actor.role)
    const managingBroker = actor.role === 'managing_broker'
    const client = await getPgPool().connect()
    try {
      return await withRlsSession(client, actor, async scoped => {
        let officeId: string | null = null
        if (managingBroker) {
          const officeRows = (await scoped.query(
            `select office_id as "officeId" from users where organization_id = $1 and id = $2`,
            [actor.organizationId, actor.userId],
          ) as { rows?: { officeId: string | null }[] }).rows ?? []
          officeId = officeRows[0]?.officeId ?? null
          if (!officeId) throw new PermissionDeniedError('putTransactionDomainRecord', 'managing broker has no authorized office')
          const assignedIds = [String(input.data.ownerId ?? ''), String(input.data.tcId ?? '')].filter(Boolean)
          if (input.data.officeId !== officeId) throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction is outside the managing broker office')
          if (assignedIds.length) {
            const assignmentRows = (await scoped.query(
              `select id, platform_role as role from users where organization_id = $1 and office_id = $2 and id = any($3::uuid[])`,
              [actor.organizationId, officeId, assignedIds],
            ) as { rows?: { id: string; role: string }[] }).rows ?? []
            if (assignmentRows.length !== new Set(assignedIds).size) throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction assignment must remain within the managing broker office')
            if (input.data.tcId && !assignmentRows.some(user => user.id === input.data.tcId && user.role === 'transaction_coordinator')) {
              throw new PermissionDeniedError('putTransactionDomainRecord', 'only an office transaction coordinator may be assigned')
            }
          }
        }
        const parentId = input.collection === 'transactions' ? input.recordId : String(input.data.transactionId ?? '')
        let parent: Record<string, unknown> | null = null
        if (input.collection !== 'transactions') {
          if (!parentId) throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction child record requires a parent')
          const parentRows = (await scoped.query(
            `select data from rcre_domain_records where organization_id = $1 and collection = 'transactions' and record_id = $2 for share`,
            [actor.organizationId, parentId],
          ) as { rows?: { data: Record<string, unknown> }[] }).rows ?? []
          parent = parentRows[0]?.data ?? null
          if (!parent) throw new PermissionDeniedError('putTransactionDomainRecord', 'parent transaction is not visible')
          for (const field of ['ownerId', 'tcId', 'teamId'] as const) {
            if (input.data[field] !== parent[field]) throw new PermissionDeniedError('putTransactionDomainRecord', 'child participant fields must match the parent transaction')
          }
          const participant = parent.ownerId === actor.userId || (actor.role === 'transaction_coordinator' && parent.tcId === actor.userId)
          if (!broker && !participant && actor.role !== 'team_lead') throw new PermissionDeniedError('putTransactionDomainRecord', 'actor is not an authorized transaction participant')
        }
        const existingRows = (await scoped.query(
          `select ${this.domainRecordColumns} from rcre_domain_records where organization_id = $1 and collection = $2 and record_id = $3 for update`,
          [actor.organizationId, input.collection, input.recordId],
        ) as { rows?: DomainRecord<T>[] }).rows ?? []
        const existing = existingRows[0]
        if (input.createOnly && existing) throw new DomainRecordConflictError(input.collection, input.recordId)
        if (input.expectedVersion !== undefined && (!existing || input.expectedVersion !== existing.version)) throw new DomainRecordConflictError(input.collection, input.recordId)
        const ownerUserId = input.ownerUserId ?? null
        if (input.collection === 'transactions' && input.data.ownerId !== ownerUserId) throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction owner and repository owner must match')
        if (existing) {
          const old = existing.data as Record<string, unknown>
          const isOwner = old.ownerId === actor.userId
          const isTc = actor.role === 'transaction_coordinator' && old.tcId === actor.userId
          const isTeamScoped = actor.role === 'team_lead'
          if (managingBroker && old.officeId !== officeId) throw new PermissionDeniedError('putTransactionDomainRecord', 'transaction is outside the managing broker office')
          if (!broker && !managingBroker && !isOwner && !isTc && !isTeamScoped) throw new PermissionDeniedError('putTransactionDomainRecord', 'actor is not a transaction participant')
          if (!broker && !managingBroker && (input.data.ownerId !== old.ownerId || input.data.tcId !== old.tcId || input.data.teamId !== old.teamId || ownerUserId !== existing.ownerUserId)) {
            throw new PermissionDeniedError('putTransactionDomainRecord', 'only brokerage administrators may change transaction ownership or participant assignment')
          }
        } else if (input.collection === 'transactions' && !broker && !managingBroker && (input.data.ownerId !== actor.userId || input.data.tcId)) {
          throw new PermissionDeniedError('putTransactionDomainRecord', 'agents may create only transactions they own; coordinator assignment is a broker action')
        } else if (ownerUserId !== actor.userId && !broker && !managingBroker) {
          throw new PermissionDeniedError('putTransactionDomainRecord', 'new transaction records must be owned by the actor')
        }
        let rows: DomainRecord<T>[]
        if (existing) {
          rows = (await scoped.query(
            `update rcre_domain_records set owner_user_id = $4, data = $5::jsonb, version = version + 1, updated_at = now()
             where organization_id = $1 and collection = $2 and record_id = $3 and version = $6 returning ${this.domainRecordColumns}`,
            [actor.organizationId, input.collection, input.recordId, ownerUserId, JSON.stringify(input.data), existing.version],
          ) as { rows?: DomainRecord<T>[] }).rows ?? []
        } else {
          rows = (await scoped.query(
            `insert into rcre_domain_records (organization_id, collection, record_id, owner_user_id, data)
             values ($1,$2,$3,$4,$5::jsonb) returning ${this.domainRecordColumns}`,
            [actor.organizationId, input.collection, input.recordId, ownerUserId, JSON.stringify(input.data)],
          ) as { rows?: DomainRecord<T>[] }).rows ?? []
        }
        if (!rows[0]) throw new DomainRecordConflictError(input.collection, input.recordId)
        for (const event of auditEvents) {
          if (event.organizationId !== actor.organizationId || event.actorUserId !== actor.userId) throw new PermissionDeniedError('putTransactionDomainRecord', 'audit identity must match the trusted actor')
          await scoped.query(
            `insert into audit_events (organization_id, actor_user_id, actor_kind, action, target_type, target_id, effect, allowed, denied_reason, detail)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [event.organizationId, event.actorUserId, event.actorKind, event.action, event.targetType ?? null, event.targetId ?? null, event.effect, event.allowed, event.deniedReason ?? null, JSON.stringify(event.detail ?? {})],
          )
        }
        return rows[0]
      })
    } finally { client.release() }
  }

  async deleteDomainRecord(actor: Actor, collection: string, recordId: string): Promise<boolean> {
    if (transactionCollection(collection)) throw new PermissionDeniedError('deleteDomainRecord', 'transaction history is retained; archive the transaction instead')
    validateDomainKey(collection, recordId)
    const rows = await this.q<{ recordId: string }>(actor,
      `delete from rcre_domain_records
        where organization_id = $1 and collection = $2 and record_id = $3
        returning record_id as "recordId"`, [actor.organizationId, collection, recordId])
    return rows.length > 0
  }
}
