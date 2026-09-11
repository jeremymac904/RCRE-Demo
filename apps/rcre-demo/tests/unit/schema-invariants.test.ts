import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Schema invariants that carry a decision.
 *
 * These are not tests of behaviour — they are tests of a promise. Each one
 * corresponds to a commitment made to RCRE in writing, and each is the kind of
 * commitment that erodes quietly: someone adds a column, someone widens an
 * enum, and six months later the system is doing something a document says it
 * does not do.
 *
 * A failing test here means an ADR is being contradicted, not that a query
 * broke.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations')
const sql = (f: string) => readFileSync(join(MIGRATIONS, f), 'utf8')

describe('ADR-0014 — SMS read receipts do not exist', () => {
  const core = sql('0002_reporting_and_routing.sql')

  it('the delivery status type has no read state', () => {
    const match = core.match(/create type rcre_delivery_status as enum\s*\(([^)]*)\)/)
    expect(match, 'rcre_delivery_status must exist').not.toBeNull()

    const values = match![1]
    // SMS carries no read event at the protocol level. A 'read' value could
    // only ever be populated by inference from something else — an email open,
    // a site visit — and management would then evaluate agents on a label that
    // is not true. Absence from the type is what makes that impossible rather
    // than merely discouraged.
    expect(values).not.toMatch(/'read'/)
    expect(values).toMatch(/'delivered'/)
  })

  it('no table stores a read timestamp or flag for messages', () => {
    const offenders = core
      .split('\n')
      .filter(line => /^\s+\w*read\w*(_at)?\s+(boolean|timestamptz)/i.test(line))
    expect(offenders).toEqual([])
  })
})

describe('storage commitments made to RCRE', () => {
  const core = sql('0001_rcre_mvp_core.sql')

  it('activity stores a summary, not message bodies', () => {
    // The commitment is in the activation checklist §8: this table feeds AI
    // context, and full client correspondence should not be in it.
    expect(core).toMatch(/summary\s+text/)
    expect(core).not.toMatch(/^\s+body\s+text/m)
    expect(core).not.toMatch(/message_body/)
  })

  it('no recording URLs are stored', () => {
    expect(core).not.toMatch(/recording_url/i)
    expect(sql('0002_reporting_and_routing.sql')).not.toMatch(/recording_url/i)
  })
})

describe('ADR-0013 — organisation scoping is retained', () => {
  const core = sql('0002_reporting_and_routing.sql')

  it('every new tenant-scoped table carries organization_id', () => {
    // Keeping the tenant key cheap today is the whole of ADR-0013's Rule 2.
    // person_engagement is keyed by person but still carries the column.
    const tables = [...core.matchAll(/create table if not exists (\w+) \(([\s\S]*?)\n\);/g)]
    expect(tables.length).toBeGreaterThan(0)

    const missing = tables
      .filter(([, name]) => name !== 'team_members')       // scoped via team_id, and carries it anyway
      .filter(([, , body]) => !body.includes('organization_id'))
      .map(([, name]) => name)

    expect(missing).toEqual([])
  })
})

describe('read-only enforcement is represented in data, not only in env', () => {
  const core = sql('0002_reporting_and_routing.sql')

  it('integration_state carries a writes_enabled flag defaulting to false', () => {
    // Two independent switches. An env var alone means disabling writes needs a
    // deploy; a database flag alone means a config mistake could enable them.
    expect(core).toMatch(/writes_enabled\s+boolean not null default false/)
  })

  it('integration_state records when history began', () => {
    // Forward-only metrics must clamp their window to this. A report that
    // silently starts where its data starts implies a history it does not have.
    expect(core).toMatch(/webhook_activated_at\s+timestamptz/)
  })
})

describe('the two enforcement layers must not drift', () => {
  /**
   * RLS in Postgres and Actor scoping in repository.ts enforce the same rules
   * twice, in two languages. Defence in depth is why — but two copies of a rule
   * is also two places to change it, and the failure is silent: nothing breaks
   * when they disagree, the database simply becomes stricter or looser than the
   * application believes it is.
   *
   * These tests pin the role lists together. If someone grants a role broker
   * visibility in one layer, they must do it in the other or this fails.
   */
  const rls = readFileSync(join(MIGRATIONS, '0003_row_level_security.sql'), 'utf8')
  const repo = readFileSync(join(process.cwd(), 'src', 'lib', 'db', 'repository.ts'), 'utf8')

  const rolesFrom = (source: string, marker: RegExp): string[] => {
    const m = source.match(marker)
    expect(m, `could not locate role list: ${marker}`).not.toBeNull()
    return [...m![1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]).sort()
  }

  it('broker-level roles agree between SQL and TypeScript', () => {
    // Anchored on the function name so a reformat of the SQL does not silently
    // turn this test into a no-op.
    const sqlRoles = rolesFrom(
      rls,
      /function rcre_is_broker\(\)[\s\S]*?rcre_current_role\(\) in \(([^)]*)\)/,
    )
    const tsRoles = rolesFrom(repo, /const BROKER_ROLES[^=]*=\s*new Set<UserRole>\(\[([^\]]*)\]/)
    expect(sqlRoles).toEqual(tsRoles)
  })

  it('recruiting visibility excludes agents in BOTH layers', () => {
    const tsRoles = rolesFrom(repo, /const RECRUITING_ROLES[^=]*=\s*new Set<UserRole>\(\[([^\]]*)\]/)
    expect(tsRoles).not.toContain('agent')
    expect(tsRoles).not.toContain('team_lead')

    // A prospective agent is usually licensed at another brokerage. Leaking the
    // recruiting pipeline to the agent roster is a real-world harm, not a bug
    // class — so it is asserted separately in each layer rather than inferred.
    // Only the policy STATEMENTS, not the surrounding prose — the file's
    // commentary legitimately discusses the agent role, and matching on that
    // would make this test fail for the wrong reason.
    const statements = [...rls.matchAll(
      /create policy\s+(recruiting_prospects\w*)\s+on\s+recruiting_prospects([\s\S]*?);/g,
    )]
    expect(statements.length).toBeGreaterThan(0)
    for (const [, name, body] of statements) {
      const code = body.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
      expect(code, `${name} must not grant the agent role`).not.toMatch(/'agent'/)
      expect(code, `${name} must not grant the team_lead role`).not.toMatch(/'team_lead'/)
    }
  })
})

describe('the ingestion path matches the published event subscription set', () => {
  /**
   * FUB-EVENT-SUBSCRIPTION-SET.md tells RCRE exactly which of the 37 available
   * events we subscribe to, and the activation checklist tells them what we
   * will never store. Those are commitments, and until now nothing checked that
   * the code agreed with them — the handler accepted `notesCreated` for weeks
   * while the document said we do not read notes.
   *
   * A document and a Set that must agree, with nothing tying them together, is
   * exactly the drift this file exists to catch.
   */
  // The activation checklist is what Jeremy reads before authorising, so its
  // fenced list is the one the code must match.
  const doc = readFileSync(
    join(process.cwd(), '..', '..', '08-mvp', 'PRODUCTION-READONLY-ACTIVATION-CHECKLIST.md'),
    'utf8',
  )

  it('rejects notes events — the privacy commitment', async () => {
    const { isSupportedEvent } = await import('@/lib/fub/webhook')
    for (const e of ['notesCreated', 'notesUpdated', 'notesDeleted']) {
      expect(isSupportedEvent(e), `${e} must not be ingested`).toBe(false)
    }
  })

  it('accepts the engagement events the reporting model depends on', async () => {
    const { isSupportedEvent } = await import('@/lib/fub/webhook')
    for (const e of ['emEventsOpened', 'emEventsClicked', 'eventsCreated']) {
      expect(isSupportedEvent(e), `${e} is required for engagement signals`).toBe(true)
    }
  })

  it('ingests exactly the events the published set names', async () => {
    const { SUPPORTED_EVENTS } = await import('@/lib/fub/webhook')

    // The document's fenced block is the source of truth RCRE was shown.
    const fence = doc.match(/## 5\. Which events[\s\S]*?```\n([\s\S]*?)```/)
    expect(fence, 'activation checklist must contain the event fence').not.toBeNull()
    const documented = new Set(fence![1].split(/\s+/).filter(Boolean))

    const code = new Set(SUPPORTED_EVENTS)
    const inCodeOnly = [...code].filter(e => !documented.has(e)).sort()
    const inDocOnly = [...documented].filter(e => !code.has(e)).sort()

    expect({ inCodeOnly, inDocOnly }).toEqual({ inCodeOnly: [], inDocOnly: [] })
  })
})
