import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  MissingRlsContextError, assertRlsContext, clearRlsContext,
  rlsContextFromActor, setRlsContextStatement, withRlsSession,
  type RlsQueryable,
} from '@/lib/db/rls'

/**
 * Row Level Security, checked statically.
 *
 * There is no Postgres instance here and provisioning one is outside current
 * authorization, so these tests cannot prove that a policy returns the right
 * rows. What they CAN prove is the class of mistake that actually happens:
 * someone adds a table in migration 0004 and never writes a policy for it, and
 * the table quietly serves every tenant to every caller.
 *
 * So the coverage test does not hold a hand-written list. It reads the tables
 * out of 0001 and 0002 and demands that 0003 accounts for each one. Add a
 * table, and this suite fails until you have said what may read it.
 *
 * A failure here is a tenant-isolation regression, not a broken query.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations')
const sql = (f: string) => readFileSync(join(MIGRATIONS, f), 'utf8')

const CORE = sql('0001_rcre_mvp_core.sql')
const REPORTING = sql('0002_reporting_and_routing.sql')

/**
 * Tables are enumerated from EVERY migration, not from 0001 and 0002 by name.
 * A table added in 0004 is therefore covered by this suite on the day it is
 * written, without anyone remembering to come back here — which is the whole
 * point, because nobody remembers.
 */
const ALL_MIGRATIONS = readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()
const ALL_SQL = ALL_MIGRATIONS.map(sql).join('\n')

/** The RLS migration itself. Policy-level assertions read this. */
const RLS = sql('0003_row_level_security.sql')

/** Table names declared by a migration, in file order. */
function declaredTables(migration: string): string[] {
  return [...migration.matchAll(/create table if not exists (\w+)\s*\(/g)].map(m => m[1])
}

/**
 * Every table in 0001 and 0002 is tenant-scoped:
 *  - `organizations` IS the tenant, scoped by its own id
 *  - `integration_state` is keyed by organization_id
 *  - `person_engagement` is keyed by person_id but carries organization_id
 *  - everything else carries organization_id outright
 * There is deliberately no exemption list. If a genuinely global table is ever
 * added, exempting it must be an argued edit to this file.
 */
const TENANT_TABLES = declaredTables(ALL_SQL)

interface ParsedPolicy {
  name: string
  table: string
  command: string
  body: string
}

function parsePolicies(migration: string): ParsedPolicy[] {
  return [...migration.matchAll(/create\s+policy\s+(\w+)\s+on\s+(\w+)\s+for\s+(\w+)([\s\S]*?);/g)]
    .map(m => ({ name: m[1], table: m[2], command: m[3].toLowerCase(), body: m[4] }))
}

const POLICIES = parsePolicies(ALL_SQL)
const policiesFor = (table: string) => POLICIES.filter(p => p.table === table)

describe('coverage — no table may miss RLS', () => {
  it('0001 and 0002 declare the tables this suite checks', () => {
    // Guards the parser itself. If the regex stops matching, the coverage tests
    // below would pass vacuously, which is the worst possible failure mode for
    // a test whose entire job is to catch omissions.
    expect(declaredTables(CORE).length).toBe(13)
    expect(declaredTables(REPORTING).length).toBe(9)
    expect(TENANT_TABLES.length).toBeGreaterThanOrEqual(22)
    expect(POLICIES.length).toBeGreaterThan(20)
    expect(TENANT_TABLES).toContain('recruiting_prospects')
    expect(TENANT_TABLES).toContain('integration_state')
  })

  it('every tenant-scoped table has RLS enabled in 0003', () => {
    const missing = TENANT_TABLES.filter(
      t => !new RegExp(`alter table\\s+${t}\\s+enable row level security`).test(ALL_SQL),
    )
    expect(missing, 'tables added without enabling RLS').toEqual([])
  })

  it('every tenant-scoped table also FORCES RLS', () => {
    // Without FORCE, connecting as the table owner bypasses every policy in the
    // file and nothing looks wrong. That is a silent total failure, so it is
    // asserted rather than assumed.
    const missing = TENANT_TABLES.filter(
      t => !new RegExp(`alter table\\s+${t}\\s+force\\s+row level security`).test(ALL_SQL),
    )
    expect(missing, 'tables where the owner would bypass RLS').toEqual([])
  })

  it('every tenant-scoped table has at least one policy', () => {
    // RLS enabled with no policy denies everything — safe, but it means the
    // table is unreadable and someone will "fix" it in a hurry. Say what may
    // read it, deliberately, at the time the table is added.
    const unpoliced = TENANT_TABLES.filter(t => policiesFor(t).length === 0)
    expect(unpoliced).toEqual([])
  })
})

describe('organization isolation is absolute', () => {
  it('every policy constrains the organization', () => {
    // The single rule the whole design rests on: role may subtract visibility
    // inside a tenant, never cross the boundary. A policy that forgot this
    // would serve another brokerage's book to whoever asked.
    const offenders = POLICIES
      .filter(p => !p.body.includes('rcre_current_org()'))
      .map(p => p.name)
    expect(offenders, 'policies with no organization predicate').toEqual([])
  })

  it('the organizations table is scoped by its own id', () => {
    const [policy] = policiesFor('organizations')
    expect(policy.body).toMatch(/id\s*=\s*rcre_current_org\(\)/)
  })

  it('every write policy carries a WITH CHECK, not only a USING', () => {
    // A USING clause says which rows may be touched. Only WITH CHECK says what
    // they may become — without it, an update could move a row into another
    // organization or reassign it to another user.
    const offenders = POLICIES
      .filter(p => p.command === 'insert' || p.command === 'update')
      .filter(p => !p.body.includes('with check'))
      .map(p => p.name)
    expect(offenders).toEqual([])
  })

  it('every WITH CHECK also constrains the organization', () => {
    const offenders = POLICIES
      .filter(p => p.body.includes('with check'))
      .filter(p => !p.body.slice(p.body.indexOf('with check')).includes('rcre_current_org()'))
      .map(p => p.name)
    expect(offenders).toEqual([])
  })

  it('the context accessor fails closed when the setting is absent', () => {
    // current_setting(..., true) returns NULL rather than raising, and NULL
    // propagates through every predicate as non-TRUE. "No context" must mean
    // "no rows", never "all rows".
    expect(RLS).toMatch(/current_setting\('rcre\.organization_id',\s*true\)/)
    expect(RLS).toMatch(/nullif\(current_setting\('rcre\.organization_id',\s*true\),\s*''\)/)
  })
})

describe('deny by default', () => {
  it('no policy is permissive with USING (true)', () => {
    const offenders = POLICIES
      .filter(p => /using\s*\(\s*true\s*\)/i.test(p.body) || /with check\s*\(\s*true\s*\)/i.test(p.body))
      .map(p => p.name)
    expect(offenders, 'a tenant table policy that admits every row').toEqual([])
  })

  it('no policy is written FOR ALL', () => {
    // One FOR ALL policy hides four decisions behind one predicate, and the
    // read rule is almost never the right write rule.
    expect(ALL_SQL).not.toMatch(/create\s+policy\s+\w+\s+on\s+\w+\s+for\s+all/i)
    const commands = new Set(POLICIES.map(p => p.command))
    expect([...commands].sort()).toEqual(['delete', 'insert', 'select', 'update'])
  })

  it('append-only ledgers have no UPDATE or DELETE policy', () => {
    // These tables are the evidence. first_touch_at, the audit trail, the stage
    // intervals, the routing chain — if the subject of a measurement can edit
    // it after the fact, the measurement is an opinion.
    const APPEND_ONLY = [
      'activity', 'audit_events', 'lead_snapshots', 'webhook_events',
      'assignment_history', 'stage_transitions',
    ]
    const mutable = APPEND_ONLY.flatMap(t =>
      policiesFor(t)
        .filter(p => p.command === 'update' || p.command === 'delete')
        .map(p => p.name),
    )
    expect(mutable, 'history became editable').toEqual([])
  })

  it('the FUB mirror tables are not writable by a user session', () => {
    // ADR-0012: FUB is the system of record and RCRE never blind-overwrites it.
    // Ingestion writes these; an interactive user has no write path at all.
    const mirrors = ['people', 'appointments', 'deals']
    const writable = mirrors.flatMap(t =>
      policiesFor(t).filter(p => p.command !== 'select').map(p => p.name),
    )
    expect(writable).toEqual([])
  })

  it('audit rows can only be inserted in the caller’s own name', () => {
    const insert = policiesFor('audit_events').find(p => p.command === 'insert')
    expect(insert).toBeDefined()
    expect(insert!.body).toMatch(/actor_user_id\s*=\s*rcre_current_user_id\(\)/)
  })
})

describe('recruiting data is confidential to brokers and recruiters', () => {
  const recruiting = policiesFor('recruiting_prospects')

  it('has policies at all', () => {
    expect(recruiting.length).toBeGreaterThan(0)
  })

  it('no policy on recruiting_prospects grants the agent role', () => {
    // A recruiting prospect is usually an agent licensed at another brokerage
    // who spoke to RCRE in confidence. Leaking that list costs a real person
    // their job — the industry is small and it travels. This is the test that
    // must never be relaxed for convenience.
    const offenders = recruiting.filter(p => /'agent'/.test(p.body)).map(p => p.name)
    expect(offenders).toEqual([])
  })

  it('the role list is written out inline so it can be audited at a glance', () => {
    const select = recruiting.find(p => p.command === 'select')
    expect(select).toBeDefined()
    expect(select!.body).toMatch(
      /rcre_current_role\(\)\s+in\s*\(\s*'owner',\s*'broker',\s*'recruiter'\s*\)/,
    )
  })

  it('only a broker may delete a prospect', () => {
    const del = recruiting.find(p => p.command === 'delete')
    expect(del).toBeDefined()
    expect(del!.body).toContain('rcre_is_broker()')
    expect(del!.body).not.toMatch(/'recruiter'/)
  })

  it('no other table exposes recruiting rows to a wider audience', () => {
    // attribution is the one table that reaches into recruiting_prospects. It
    // may do so only for a recruiter, never as a side door for everyone else.
    const attribution = policiesFor('attribution').find(p => p.command === 'select')
    expect(attribution!.body).toMatch(/rcre_current_role\(\)\s*=\s*'recruiter'/)
  })
})

describe('role visibility rules referenced by the policies', () => {
  it('whole-brokerage read is limited to owner and broker', () => {
    // Mirrors canSeeWholeBrokerage() in repository.ts. Two enforcement layers,
    // one rule — they must not drift.
    expect(RLS).toMatch(
      /function rcre_is_broker\(\)[\s\S]*?rcre_current_role\(\) in \('owner', 'broker'\)/,
    )
  })

  it('staff read the client book but never deals, recruiting or the audit log', () => {
    expect(RLS).toMatch(
      /function rcre_is_org_wide_reader\(\)[\s\S]*?in \('owner', 'broker', 'staff'\)/,
    )
    const deals = policiesFor('deals').find(p => p.command === 'select')
    expect(deals!.body).toContain('rcre_is_broker()')
    expect(deals!.body).not.toContain('rcre_is_org_wide_reader()')

    const audit = policiesFor('audit_events').find(p => p.command === 'select')
    expect(audit!.body).toContain('rcre_is_broker()')
    expect(audit!.body).not.toContain('rcre_is_org_wide_reader()')
  })

  it('a team lead sees their team through teams they LEAD, not merely join', () => {
    expect(RLS).toMatch(/function rcre_led_team_ids\(\)[\s\S]*?is_leader = true/)
    expect(RLS).toMatch(/function rcre_scoped_user_ids\(\)[\s\S]*?rcre_led_team_ids\(\)/)
  })

  it('team membership is broker-written, since is_leader grants visibility', () => {
    for (const p of policiesFor('team_members').filter(x => x.command !== 'select')) {
      expect(p.body, `${p.name} must be broker-only`).toContain('rcre_is_broker()')
    }
  })

  it('the team_members read policy does not recurse into itself', () => {
    // A policy on team_members that sub-selects team_members is infinite
    // recursion in Postgres. The SECURITY DEFINER helper is what avoids it.
    const select = policiesFor('team_members').find(p => p.command === 'select')
    expect(select!.body).toContain('rcre_my_team_ids()')
    expect(select!.body).not.toMatch(/from\s+team_members/)
    expect(RLS).toMatch(/function rcre_my_team_ids\(\)[\s\S]*?security definer/)
  })

  it('the SECURITY DEFINER helpers still filter by organization', () => {
    // Elevated privilege must buy them no reach outside the tenant.
    for (const fn of ['rcre_my_team_ids', 'rcre_led_team_ids', 'rcre_can_see_person']) {
      const match = RLS.match(new RegExp(`function ${fn}\\([^)]*\\)[\\s\\S]*?\\$fn\\$([\\s\\S]*?)\\$fn\\$`))
      expect(match, `${fn} must exist`).not.toBeNull()
      expect(match![1], `${fn} must be organization scoped`).toContain('rcre_current_org()')
    }
  })

  it('the ingestion path is a database role, not a policy exemption', () => {
    // The alternative — a synthetic "system user" with an exemption inside a
    // policy — would put a hole in the tenant boundary that a bug could reach.
    expect(RLS).toMatch(/rcre_ingest/)
    expect(RLS).toMatch(/bypassrls/i)
    const exempted = POLICIES.filter(p => /rcre_ingest|service_role|bypass/i.test(p.body))
    expect(exempted.map(p => p.name)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The application-side guard
// ---------------------------------------------------------------------------

const ORG = '00000000-0000-4000-8000-000000000001'
const USER = '00000000-0000-4000-8000-000000000002'

class RecordingClient implements RlsQueryable {
  calls: { text: string; values?: unknown[] }[] = []
  constructor(private failOn?: string) {}
  async query(text: string, values?: unknown[]): Promise<unknown> {
    this.calls.push({ text, values })
    if (this.failOn && text.includes(this.failOn)) throw new Error('boom')
    return { rows: [] }
  }
}

describe('rls.ts refuses to open a session without an organization', () => {
  it('throws when no actor is supplied at all', () => {
    expect(() => rlsContextFromActor(null)).toThrow(MissingRlsContextError)
    expect(() => rlsContextFromActor(undefined)).toThrow(MissingRlsContextError)
  })

  it('throws when the organization is missing or empty', () => {
    expect(() => rlsContextFromActor({ userId: USER, role: 'agent' }))
      .toThrow(MissingRlsContextError)
    expect(() => rlsContextFromActor({ organizationId: '', userId: USER, role: 'agent' }))
      .toThrow(/rcre\.organization_id/)
    expect(() => rlsContextFromActor({ organizationId: '   ', userId: USER, role: 'agent' }))
      .toThrow(/rcre\.organization_id/)
  })

  it('throws rather than accepting a malformed organization id', () => {
    expect(() => rlsContextFromActor({ organizationId: 'all', userId: USER, role: 'agent' }))
      .toThrow(/not a uuid/)
  })

  it('throws when the user or role is missing', () => {
    expect(() => rlsContextFromActor({ organizationId: ORG, role: 'agent' }))
      .toThrow(/rcre\.user_id/)
    expect(() => rlsContextFromActor({ organizationId: ORG, userId: USER }))
      .toThrow(/rcre\.role/)
  })

  it('throws on a role the policies would not recognise', () => {
    // An unknown role fails closed in the database, but silently — the user
    // just sees nothing. Rejecting it here turns a mystery into a stack trace.
    expect(() => rlsContextFromActor(
      { organizationId: ORG, userId: USER, role: 'superuser' as never },
    )).toThrow(/unknown role/)
  })

  it('accepts a well-formed actor', () => {
    expect(rlsContextFromActor({ organizationId: ORG, userId: USER, role: 'agent' }))
      .toEqual({ organizationId: ORG, userId: USER, role: 'agent' })
  })

  it('assertRlsContext rejects a context with no organization', () => {
    expect(() => assertRlsContext(null)).toThrow(MissingRlsContextError)
    expect(() => assertRlsContext({ userId: USER, role: 'broker' }))
      .toThrow(MissingRlsContextError)
  })
})

describe('rls.ts session mechanics', () => {
  it('binds the settings as parameters rather than interpolating them', () => {
    const { text, values } = setRlsContextStatement(
      { organizationId: ORG, userId: USER, role: 'broker' },
    )
    expect(text).not.toContain(ORG)
    expect(text.match(/set_config/g)).toHaveLength(3)
    expect(values).toEqual([
      'rcre.organization_id', ORG, 'rcre.user_id', USER, 'rcre.role', 'broker',
    ])
  })

  it('sets the settings transaction-locally', () => {
    // `true` is set_config's is_local argument. Without it the identity would
    // outlive the request on a pooled connection and be inherited by whoever
    // borrows that connection next.
    const { text } = setRlsContextStatement({ organizationId: ORG, userId: USER, role: 'agent' })
    expect(text).toMatch(/set_config\(\$1, \$2, true\)/)
  })

  it('withRlsSession scopes the connection before running the callback', async () => {
    const client = new RecordingClient()
    await withRlsSession(client, { organizationId: ORG, userId: USER, role: 'agent' },
      async c => { await c.query('select 1') })

    const order = client.calls.map(c => c.text)
    expect(order[0]).toBe('begin')
    expect(order[1]).toContain('set_config')
    expect(order[2]).toBe('select 1')
    expect(order[3]).toBe('commit')
  })

  it('withRlsSession never begins a transaction for an unscoped actor', async () => {
    const client = new RecordingClient()
    await expect(
      withRlsSession(client, { userId: USER, role: 'agent' }, async () => 'unreachable'),
    ).rejects.toBeInstanceOf(MissingRlsContextError)
    expect(client.calls).toEqual([])
  })

  it('withRlsSession rolls back and rethrows when the callback fails', async () => {
    const client = new RecordingClient()
    await expect(
      withRlsSession(client, { organizationId: ORG, userId: USER, role: 'agent' },
        async () => { throw new Error('callback failed') }),
    ).rejects.toThrow('callback failed')
    expect(client.calls.map(c => c.text)).toContain('rollback')
    expect(client.calls.map(c => c.text)).not.toContain('commit')
  })

  it('a failed rollback does not mask the original error', async () => {
    const client = new RecordingClient('rollback')
    await expect(
      withRlsSession(client, { organizationId: ORG, userId: USER, role: 'agent' },
        async () => { throw new Error('the real problem') }),
    ).rejects.toThrow('the real problem')
  })

  it('clearRlsContext blanks all three settings', async () => {
    const client = new RecordingClient()
    await clearRlsContext(client)
    expect(client.calls[0].values).toEqual([
      'rcre.organization_id', '', 'rcre.user_id', '', 'rcre.role', '',
    ])
  })
})

describe('PgRepository actually opens an RLS session', () => {
  /**
   * Migration 0003 is ~954 lines of policies that read three transaction-local
   * settings. Those settings do not set themselves. Until 2026-08-26 no
   * production code path called `withRlsSession`, so every policy read NULL —
   * meaning either every query returned nothing, or the connection held a
   * BYPASSRLS role and the policies enforced nothing at all.
   *
   * The second failure is silent, which is what made it dangerous: the app
   * would look correct while one agent could see the whole brokerage's client
   * data. These tests pin the wiring so it cannot be quietly removed.
   */
  const pg = readFileSync(join(process.cwd(), 'src', 'lib', 'db', 'pg.ts'), 'utf8')

  it('imports and uses withRlsSession', () => {
    expect(pg).toMatch(/import \{ withRlsSession \} from '\.\/rls'/)
    expect(pg).toMatch(/withRlsSession<T\[\]>\(client, actor,/)
  })

  it('runs every query through the scoped helper, never the raw client', () => {
    // A direct `client.query(` inside the repository would bypass the session.
    const direct = pg
      .split('\n')
      .filter(l => /\bclient\.query\(/.test(l) && !l.trim().startsWith('*'))
    expect(direct).toEqual([])
  })

  it('makes the actor a required first argument, so omitting it is a type error', () => {
    expect(pg).toMatch(/private async q<T>\(\s*\n\s*actor: Actor \| null,/)
  })

  it('passes null context only where an actor cannot yet exist', () => {
    // getOrganization and getUser are how an Actor is built, so they precede it.
    // Any other null context is a scoping hole.
    const nullCalls = [...pg.matchAll(/this\.q<[^>]+>\(null,/g)]
    expect(nullCalls).toHaveLength(2)
    for (const m of nullCalls) {
      const before = pg.slice(Math.max(0, m.index! - 400), m.index!)
      expect(before).toMatch(/getOrganization|getUser/)
    }
  })

  it('does not invent a tenant for a system-level audit row', () => {
    // audit_events.organization_id is nullable by design in 0003. Fabricating
    // an org id would make a cross-tenant row look like it belonged to someone.
    expect(pg).toMatch(/const actor: Actor \| null = e\.organizationId/)
  })
})
