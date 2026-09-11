// Row Level Security session context.
//
// Companion to supabase/migrations/0003_row_level_security.sql. That file
// decides what a given (organization, user, role) may see. This file is the
// only supported way to tell Postgres who is asking.
//
// The contract, in one line:
//
//     No organization context  ->  an error. Never an unscoped query.
//
// Both halves matter. The database already fails closed — an unset
// `rcre.organization_id` makes every policy predicate NULL and returns zero
// rows — but zero rows is a confusing, late failure that looks like "the data
// is missing". So the guard here fails FIRST, loudly, at the point the mistake
// was actually made. The database backstop stays in place regardless; this is
// the error message, not the enforcement.
//
// Three GUCs are set, always together, always as bound parameters, always
// transaction-local:
//
//     rcre.organization_id   rcre.user_id   rcre.role
//
// Transaction-local (`set_config(..., true)`) is what makes this safe on a
// pooled connection: the settings are discarded at COMMIT or ROLLBACK, so one
// request's identity cannot survive into the next request that borrows the same
// physical connection.

import type { Actor } from './repository'
import type { UserRole } from '@/lib/types'

/** The three settings the policies in 0003 read. */
export const RLS_ORG_SETTING = 'rcre.organization_id'
export const RLS_USER_SETTING = 'rcre.user_id'
export const RLS_ROLE_SETTING = 'rcre.role'

/**
 * The minimum surface of a Postgres client this module needs.
 *
 * Deliberately not `pg.PoolClient`: session context is a property of a
 * transaction, not of a particular driver, and keeping the dependency this thin
 * means the guard can be exercised without a database.
 */
export interface RlsQueryable {
  query(text: string, values?: unknown[]): Promise<unknown>
}

/** The resolved session context, validated. */
export interface RlsContext {
  organizationId: string
  userId: string
  role: UserRole
}

/**
 * Thrown when a database session is opened without a usable identity.
 *
 * Distinct from PermissionDeniedError: that one means "you asked for something
 * you may not have". This one means "we do not know who you are", which is a
 * programming error, not an authorization outcome, and must never be handled by
 * falling back to an unscoped read.
 */
export class MissingRlsContextError extends Error {
  constructor(readonly field: string, readonly reason: string) {
    super(`Refusing to open a database session: ${field} — ${reason}`)
    this.name = 'MissingRlsContextError'
  }
}

const VALID_ROLES: ReadonlySet<string> = new Set<UserRole>([
  'owner', 'broker', 'team_lead', 'agent', 'staff', 'recruiter', 'viewer',
])

// Shape check only. It exists so a malformed id fails here with a clear message
// rather than as a cast error inside rcre_current_org(); it is not a security
// control, because the values are always sent as bound parameters.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new MissingRlsContextError(field, 'missing or empty')
  }
  const trimmed = value.trim()
  if (!UUID_RE.test(trimmed)) {
    throw new MissingRlsContextError(field, 'not a uuid')
  }
  return trimmed
}

/**
 * Validate an actor and produce the context the policies expect.
 *
 * Throws rather than defaulting. There is no sensible default for "which
 * brokerage is this" — every candidate default is either wrong or catastrophic.
 */
export function rlsContextFromActor(actor: Partial<Actor> | null | undefined): RlsContext {
  if (!actor) {
    throw new MissingRlsContextError('actor', 'no actor supplied')
  }
  const organizationId = requireUuid(actor.organizationId, RLS_ORG_SETTING)
  const userId = requireUuid(actor.userId, RLS_USER_SETTING)

  if (typeof actor.role !== 'string' || !VALID_ROLES.has(actor.role)) {
    // An unknown role would land in the GUC and match no branch of any policy,
    // which fails closed — but silently. Rejecting it here means a bad role
    // shows up as a bug report rather than as "the app shows me nothing".
    throw new MissingRlsContextError(RLS_ROLE_SETTING, `unknown role '${String(actor.role)}'`)
  }

  return { organizationId, userId, role: actor.role as UserRole }
}

/**
 * Guard for any code path about to run a query.
 *
 * Call it wherever a context is carried around loosely. It exists so that the
 * absence of an organization can never be mistaken for "no filter needed".
 */
export function assertRlsContext(
  context: Partial<RlsContext> | null | undefined,
): asserts context is RlsContext {
  if (!context) {
    throw new MissingRlsContextError('context', 'no session context set')
  }
  requireUuid(context.organizationId, RLS_ORG_SETTING)
  requireUuid(context.userId, RLS_USER_SETTING)
  if (typeof context.role !== 'string' || !VALID_ROLES.has(context.role)) {
    throw new MissingRlsContextError(RLS_ROLE_SETTING, 'missing or unknown role')
  }
}

/**
 * The statement that installs the context, with its bound parameters.
 *
 * One round trip, three settings, no string interpolation. `true` is the
 * is_local argument to set_config: the values live only until the surrounding
 * transaction ends.
 */
export function setRlsContextStatement(context: RlsContext): { text: string; values: string[] } {
  assertRlsContext(context)
  return {
    text:
      'select set_config($1, $2, true), set_config($3, $4, true), set_config($5, $6, true)',
    values: [
      RLS_ORG_SETTING, context.organizationId,
      RLS_USER_SETTING, context.userId,
      RLS_ROLE_SETTING, context.role,
    ],
  }
}

/** Applies the context to an open transaction. */
export async function applyRlsContext(
  client: RlsQueryable,
  context: RlsContext,
): Promise<void> {
  const { text, values } = setRlsContextStatement(context)
  await client.query(text, values)
}

/**
 * Blank the three settings on a connection.
 *
 * Not needed for the transactional path — COMMIT/ROLLBACK already discards
 * transaction-local settings — but session-scoped tooling (a migration console,
 * a one-off script) should be able to put a connection back to "nobody".
 * Setting them to '' rather than resetting is deliberate: nullif(..., '') in
 * rcre_current_org() turns an empty string into NULL, which is the same
 * fail-closed state as never having been set.
 */
export async function clearRlsContext(client: RlsQueryable): Promise<void> {
  await client.query(
    'select set_config($1, $2, false), set_config($3, $4, false), set_config($5, $6, false)',
    [RLS_ORG_SETTING, '', RLS_USER_SETTING, '', RLS_ROLE_SETTING, ''],
  )
}

/**
 * Run `fn` inside a transaction that carries this actor's identity.
 *
 * The transaction is not an optimisation. `set_config(..., true)` is
 * transaction-local, so the BEGIN is what bounds the identity — without it the
 * setting would either not apply or, worse, leak onto the pooled connection for
 * whoever borrows it next.
 *
 * Ordering is load-bearing: BEGIN, then context, then the caller's work. The
 * caller never gets a client that has not already been scoped.
 */
export async function withRlsSession<T>(
  client: RlsQueryable,
  actor: Partial<Actor> | null | undefined,
  fn: (client: RlsQueryable) => Promise<T>,
): Promise<T> {
  const context = rlsContextFromActor(actor)
  await client.query('begin')
  try {
    await applyRlsContext(client, context)
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (error) {
    try {
      await client.query('rollback')
    } catch {
      // A failed rollback must not mask the original error — that error is the
      // one that explains what happened.
    }
    throw error
  }
}
