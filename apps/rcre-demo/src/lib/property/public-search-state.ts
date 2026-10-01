import 'server-only'
import { createHmac } from 'node:crypto'
import { z } from 'zod'
import { getPgPool } from '@/lib/db/pg'

const uuid = z.string().uuid()
export const savedSearchSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(80),
  filters: z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,31}$/), z.string().max(160)).refine(value => Object.keys(value).length <= 36),
}).strict()
const favoritesSchema = z.array(z.string().regex(/^[a-zA-Z0-9:_-]{1,160}$/)).max(100).refine(values => new Set(values).size === values.length, 'Saved properties must be unique')
export const publicSearchStateSchema = z.object({
  favorites: favoritesSchema,
  searches: z.array(savedSearchSchema).max(50).refine(values => new Set(values.map(value => value.id)).size === values.length, 'Saved searches must be unique'),
}).strict()
export const durablePublicSearchStateSchema = publicSearchStateSchema.extend({ favorites: z.array(uuid).max(100).refine(values => new Set(values).size === values.length, 'Saved properties must be unique') })
export type PublicSearchState = z.infer<typeof publicSearchStateSchema>

type QueryResult = { rows: unknown[] }
export interface PublicSearchStateQueryable { query(sql: string, values?: unknown[]): Promise<QueryResult> }

const organizationUuid = z.string().uuid()
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)

/** Raw visitor bearer tokens are high entropy and never persisted; only this HMAC is sent to PostgreSQL. */
export function hashPublicVisitorToken(token: string, secret: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || Buffer.from(token, 'base64url').length !== 32) throw new TypeError('Invalid public visitor token')
  if (secret.length < 32) throw new Error('Public visitor protection is not configured')
  return createHmac('sha256', secret).update(`rcre-public-search\0${token}`).digest('hex')
}

function validateScope(organizationId: string, subjectHash: string) {
  organizationUuid.parse(organizationId)
  hashSchema.parse(subjectHash)
}

/** Reads a single anonymous consumer's saved state through a restricted SQL function. */
export async function readPublicSearchState(
  organizationId: string, subjectHash: string, queryable: PublicSearchStateQueryable = getPgPool(),
): Promise<PublicSearchState> {
  validateScope(organizationId, subjectHash)
  const result = await queryable.query('select rcre_public_search_state_read($1::uuid, $2::text) as state', [organizationId, subjectHash])
  const row = result.rows[0] as { state?: unknown } | undefined
  if (!row || !row.state || typeof row.state !== 'object') throw new Error('Property search persistence is unavailable')
  return durablePublicSearchStateSchema.parse(row.state)
}

/** Replaces visitor state in one database transaction; alerts remain disabled. */
export async function replacePublicSearchState(
  organizationId: string, subjectHash: string, raw: unknown, queryable: PublicSearchStateQueryable = getPgPool(),
): Promise<PublicSearchState> {
  validateScope(organizationId, subjectHash)
  const state = durablePublicSearchStateSchema.parse(raw)
  const result = await queryable.query(
    'select rcre_public_search_state_replace($1::uuid, $2::text, $3::jsonb, $4::jsonb) as state',
    [organizationId, subjectHash, JSON.stringify(state.favorites), JSON.stringify(state.searches)],
  )
  const row = result.rows[0] as { state?: unknown } | undefined
  if (!row || !row.state || typeof row.state !== 'object') throw new Error('Property search persistence is unavailable')
  return durablePublicSearchStateSchema.parse(row.state)
}
