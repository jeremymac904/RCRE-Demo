import { describe, expect, it } from 'vitest'
import {
  authorizeCall, assertNoIdentityArgs, buildAuditRecord, clampLimit,
  type ResolvedActor,
} from '../../../../mcp/rcre-mcp-server/src/authorize'
import { TOOLS, PROHIBITED_TOOL_NAMES, findTool } from '../../../../mcp/rcre-mcp-server/src/tools'

const agent: ResolvedActor  = { userId: 'u-agent',  organizationId: 'org-1', role: 'agent',  isActive: true }
const broker: ResolvedActor = { userId: 'u-broker', organizationId: 'org-1', role: 'broker', isActive: true }

describe('tool surface', () => {
  it('exposes NO generic database or admin tool', () => {
    const names = TOOLS.map(t => t.name)
    for (const forbidden of PROHIBITED_TOOL_NAMES) {
      expect(names).not.toContain(forbidden)
    }
  })

  it('exposes no tool whose name suggests raw query access', () => {
    for (const t of TOOLS) {
      expect(t.name).not.toMatch(/sql|query_database|raw|admin|execute/i)
    }
  })

  it('marks every data-changing tool as requiring approval', () => {
    for (const t of TOOLS.filter(t => t.effect === 'write')) {
      expect(t.requiresApproval).toBe(true)
    }
  })

  it('read and draft tools do not require approval', () => {
    for (const t of TOOLS.filter(t => t.effect !== 'write')) {
      expect(t.requiresApproval).toBe(false)
    }
  })

  it('every tool schema rejects unknown properties', () => {
    for (const t of TOOLS) expect(t.inputSchema.additionalProperties).toBe(false)
  })

  it('no tool schema accepts an identity argument', () => {
    for (const t of TOOLS) {
      for (const key of Object.keys(t.inputSchema.properties)) {
        expect(assertNoIdentityArgs({ [key]: 'x' })).toBeNull()
      }
    }
  })
})

describe('authorizeCall — unknown tools', () => {
  it('rejects an unregistered tool', () => {
    const r = authorizeCall({ toolName: 'query_database', args: {}, actor: broker })
    expect(r.allowed).toBe(false)
    expect(r.allowed === false && r.code).toBe('unknown_tool')
  })
})

describe('authorizeCall — authentication and revocation', () => {
  it('rejects an unauthenticated call', () => {
    const r = authorizeCall({ toolName: 'get_my_today', args: {}, actor: null })
    expect(r.allowed === false && r.code).toBe('unauthenticated')
  })

  it('rejects a deactivated user — offboarding takes effect here', () => {
    const r = authorizeCall({
      toolName: 'get_my_today', args: {},
      actor: { ...agent, isActive: false },
    })
    expect(r.allowed === false && r.code).toBe('inactive_user')
  })

  it('rejects an actor with no organization', () => {
    const r = authorizeCall({
      toolName: 'get_my_today', args: {},
      actor: { ...agent, organizationId: '' },
    })
    expect(r.allowed === false && r.code).toBe('inactive_user')
  })
})

describe('authorizeCall — role enforcement', () => {
  it('permits an agent to read their own day', () => {
    expect(authorizeCall({ toolName: 'get_my_today', args: {}, actor: agent }).allowed).toBe(true)
  })

  it('REFUSES an agent access to broker exceptions', () => {
    const r = authorizeCall({ toolName: 'get_broker_exceptions', args: {}, actor: agent })
    expect(r.allowed).toBe(false)
    expect(r.allowed === false && r.code).toBe('role_not_permitted')
  })

  it('REFUSES an agent access to source performance', () => {
    expect(authorizeCall({ toolName: 'get_source_performance', args: {}, actor: agent }).allowed).toBe(false)
  })

  it('permits a broker', () => {
    expect(authorizeCall({ toolName: 'get_broker_exceptions', args: {}, actor: broker }).allowed).toBe(true)
  })

  it('refuses a viewer every agent tool', () => {
    const viewer: ResolvedActor = { ...agent, role: 'viewer' }
    for (const t of TOOLS) {
      expect(authorizeCall({ toolName: t.name, args: {}, actor: viewer, approvalId: 'a' }).allowed).toBe(false)
    }
  })
})

describe('authorizeCall — model-supplied identity is never authoritative', () => {
  it.each([
    'userId', 'user_id', 'organizationId', 'organization_id',
    'role', 'agentId', 'impersonate', 'onBehalfOf',
  ])('rejects a call carrying %s in its arguments', (key) => {
    const r = authorizeCall({
      toolName: 'get_my_today', args: { [key]: 'u-broker' }, actor: agent,
    })
    expect(r.allowed).toBe(false)
    expect(r.allowed === false && r.code).toBe('identity_in_arguments')
  })

  it('an agent cannot escalate by claiming a broker role in arguments', () => {
    const r = authorizeCall({
      toolName: 'get_broker_exceptions', args: { role: 'broker' }, actor: agent,
    })
    expect(r.allowed).toBe(false)
    // Role check fires before argument inspection — either denial is correct,
    // but it must NOT be allowed.
    expect(r.allowed === false && ['role_not_permitted', 'identity_in_arguments'])
      .toContain(r.allowed === false ? r.code : '')
  })

  it('allows legitimate arguments through', () => {
    expect(assertNoIdentityArgs({ personId: 'p1', limit: 10 })).toBeNull()
  })
})

describe('authorizeCall — write approval', () => {
  it('refuses a write tool without an approval id', () => {
    const r = authorizeCall({
      toolName: 'create_follow_up_task',
      args: { personId: 'p1', title: 'Call back' }, actor: agent,
    })
    expect(r.allowed).toBe(false)
    expect(r.allowed === false && r.code).toBe('approval_required')
  })

  it('permits a write tool with a recorded approval', () => {
    const r = authorizeCall({
      toolName: 'create_follow_up_task',
      args: { personId: 'p1', title: 'Call back' }, actor: agent, approvalId: 'appr-123',
    })
    expect(r.allowed).toBe(true)
  })

  it('request_stage_update does not write through to FUB', () => {
    expect(findTool('request_stage_update')!.description).toMatch(/does NOT write to Follow Up Boss/i)
  })
})

describe('audit records', () => {
  it('records allowed calls', () => {
    const req = { toolName: 'get_my_today', args: {}, actor: agent }
    const rec = buildAuditRecord(req, authorizeCall(req))
    expect(rec).toMatchObject({ actorKind: 'mcp', action: 'get_my_today', allowed: true })
  })

  it('records denials WITH the reason', () => {
    const req = { toolName: 'get_broker_exceptions', args: {}, actor: agent }
    const rec = buildAuditRecord(req, authorizeCall(req))
    expect(rec.allowed).toBe(false)
    expect(rec.deniedReason).toMatch(/may not call/)
  })

  it('logs argument KEYS only — never values', () => {
    const req = {
      toolName: 'get_contact',
      args: { personId: 'p-secret-12345' },
      actor: agent,
    }
    const rec = buildAuditRecord(req, authorizeCall(req))
    expect(JSON.stringify(rec)).not.toContain('p-secret-12345')
    expect(rec.detail.argKeys).toEqual(['personId'])
  })
})

describe('clampLimit', () => {
  it('clamps to the maximum and floors at 1', () => {
    expect(clampLimit(9999, 10, 50)).toBe(50)
    expect(clampLimit(0, 10, 50)).toBe(1)
    expect(clampLimit(-5, 10, 50)).toBe(1)
  })

  it('falls back for non-numeric input', () => {
    expect(clampLimit('lots', 10, 50)).toBe(10)
    expect(clampLimit(undefined, 10, 50)).toBe(10)
    expect(clampLimit(NaN, 10, 50)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// Everything below was added to cover the assets strengthened for pilot
// readiness: the PII memory guard (technical enforcement, not prompt text),
// approval binding, the widened prohibited-tool surface, and the Hermes
// profile and skill templates.
// ---------------------------------------------------------------------------

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  PROHIBITED_NAME_VERBS,
} from '../../../../mcp/rcre-mcp-server/src/tools'
import {
  evaluateMemoryWrite, scanForPii, classifyMemorySurface, collectStrings,
  PII_RULES,
} from '../../../../mcp/rcre-mcp-server/src/pii-guard'

const repoPath = (rel: string) => fileURLToPath(new URL(`../../../../${rel}`, import.meta.url))
const HOOK = repoPath('hermes/hooks/block-pii-memory.mjs')
const PROFILE_DIR = repoPath('hermes/profiles')
const SKILL_DIR = repoPath('hermes/skills')

/** Run the real deployed hook exactly as Hermes would. */
function runHook(payload: unknown): { exitCode: number; action: string; message: string } {
  try {
    const out = execFileSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' })
    return { exitCode: 0, ...JSON.parse(out) }
  } catch (err) {
    const e = err as { status?: number; stdout?: string }
    return { exitCode: e.status ?? -1, ...JSON.parse(e.stdout || '{}') }
  }
}

/** Same input, run through the raw hook binary with no JSON envelope. */
function runHookRaw(input: string): number {
  try {
    execFileSync('node', [HOOK], { input, encoding: 'utf8' })
    return 0
  } catch (err) {
    return (err as { status?: number }).status ?? -1
  }
}

// ---------------------------------------------------------------------------

describe('PII memory guard — classification', () => {
  it.each([
    'memory_write', 'save_memory', 'remember', 'memory', 'update_soul',
    'append_journal', 'scratchpad_write',
  ])('treats %s as a memory write', (name) => {
    expect(classifyMemorySurface(name, {})).toBe('memory_write')
  })

  it.each(['get_memory', 'search_memory', 'recall_memories', 'list_memory'])(
    'treats %s as a read, not a write',
    (name) => { expect(classifyMemorySurface(name, {})).toBe('memory_read') },
  )

  it('treats RCRE MCP tools as outside the memory surface', () => {
    for (const t of TOOLS) expect(classifyMemorySurface(t.name, {})).toBe('not_memory')
  })

  it('catches the file-path route into memory', () => {
    expect(classifyMemorySurface('write_file', { path: '~/.hermes/profiles/rcre-agent/MEMORY.md' }))
      .toBe('memory_write')
    expect(classifyMemorySurface('write_file', { path: '/tmp/notes.txt' })).toBe('not_memory')
  })
})

describe('PII memory guard — what it actually blocks', () => {
  const blocked: Array<[string, string]> = [
    ['email address', 'Reach her at dana.reid@example.com when the listing goes live.'],
    ['phone number', 'Call 205-555-0134 back tomorrow.'],
    ['phone number', 'Best number is (205) 555 0134.'],
    ['government identifier', 'SSN on file 412-88-9021.'],
    ['street address', 'Showing at 1420 Magnolia Avenue on Saturday.'],
    ['financial figure', 'Budget is $450,000 all in.'],
    ['financial figure', 'Budget is $450k all in.'],
    ['account or licence number', 'Loan file 3049128776 is with underwriting.'],
    ['date of birth', 'Date of birth needed for the application.'],
    ['client financial status', 'She is pre-approved and ready to write.'],
    ['client identity', 'The buyer Sarah Chen is touring on Sunday.'],
    ['client identity', 'Sarah Chen is a seller in Fairhope.'],
    ['CRM record identifier', 'Keep person_id handy for next time.'],
  ]

  it.each(blocked)('blocks %s', (category, content) => {
    const d = evaluateMemoryWrite({ toolName: 'memory_write', args: { content } })
    expect(d.decision).toBe('block')
    expect(d.decision === 'block' && d.categories).toContain(category)
  })

  it('blocks PII nested deep inside structured arguments', () => {
    const d = evaluateMemoryWrite({
      toolName: 'memory_write',
      args: { entries: [{ note: { detail: ['budget is $450,000'] } }] },
    })
    expect(d.decision).toBe('block')
  })

  it('blocks PII hidden in an argument KEY, not only a value', () => {
    const d = evaluateMemoryWrite({
      toolName: 'memory_write',
      args: { 'dana.reid@example.com': 'follow up' },
    })
    expect(d.decision).toBe('block')
  })

  it('allows the memory this product actually wants — working style', () => {
    for (const content of [
      'Prefers concise drafts with one clear next step.',
      'Works listing appointments on Tuesdays and Thursdays.',
      'Wants a planning block before the first showing of the day.',
      'Dislikes exclamation marks in outbound copy.',
    ]) {
      const d = evaluateMemoryWrite({ toolName: 'memory_write', args: { content } })
      expect(d.decision, content).toBe('allow')
    }
  })

  it('does not police non-memory tools', () => {
    const d = evaluateMemoryWrite({
      toolName: 'draft_follow_up',
      args: { personId: 'p1', intent: 'Call 205-555-0134 about $450,000 budget' },
    })
    expect(d.decision).toBe('allow')
  })
})

describe('PII memory guard — fails closed', () => {
  it('blocks a call whose tool name cannot be read', () => {
    expect(evaluateMemoryWrite({ args: { content: 'anything' } }).decision).toBe('block')
    expect(evaluateMemoryWrite({ toolName: 42, args: {} }).decision).toBe('block')
    expect(evaluateMemoryWrite({ toolName: '  ', args: {} }).decision).toBe('block')
  })

  it('every rule in the table compiles — an unparseable rule would break the guard', () => {
    expect(PII_RULES.length).toBeGreaterThan(0)
    for (const rule of PII_RULES) {
      expect(() => new RegExp(rule.pattern, rule.flags.replace(/g/g, ''))).not.toThrow()
    }
    expect(scanForPii('nothing sensitive here at all')).toEqual([])
  })

  it('bounds traversal so a hostile payload cannot hang the guard', () => {
    const deep: Record<string, unknown> = {}
    let cursor = deep
    for (let i = 0; i < 200; i++) { cursor.next = {}; cursor = cursor.next as Record<string, unknown> }
    expect(() => collectStrings(deep)).not.toThrow()
  })
})

describe('PII memory guard — the refusal leaks nothing', () => {
  it('names categories, never the matched values', () => {
    const d = evaluateMemoryWrite({
      toolName: 'memory_write',
      args: { content: 'Sarah Chen, dana.reid@example.com, 205-555-0134, $450,000' },
    })
    expect(d.decision).toBe('block')
    const serialized = JSON.stringify(d)
    expect(serialized).not.toContain('dana.reid@example.com')
    expect(serialized).not.toContain('205-555-0134')
    expect(serialized).not.toContain('450,000')
    expect(serialized).not.toContain('Sarah Chen')
  })
})

describe('PII memory guard — the DEPLOYED hook, run as Hermes runs it', () => {
  it('exists and is the artefact the profiles point at', () => {
    expect(existsSync(HOOK)).toBe(true)
    for (const profile of ['rcre-agent', 'rcre-broker']) {
      const cfg = readFileSync(`${PROFILE_DIR}/${profile}/config.yaml`, 'utf8')
      expect(cfg).toMatch(/pre_tool_call:/)
      expect(cfg).toMatch(/block-pii-memory\.mjs/)
      // Every registered hook must fail closed.
      const failClosed = cfg.match(/fail_closed:\s*(\w+)/g) ?? []
      expect(failClosed.length).toBeGreaterThan(0)
      for (const f of failClosed) expect(f).toMatch(/true/)
    }
  })

  it('BLOCKS a PII memory write with exit code 2 and a block directive', () => {
    const r = runHook({
      tool_name: 'memory_write',
      tool_input: { content: 'Buyer Sarah Chen is pre-approved to $450,000 — 205-555-0134' },
    })
    expect(r.exitCode).toBe(2)
    expect(r.action).toBe('block')
    expect(r.message).not.toContain('205-555-0134')
    expect(r.message).not.toContain('Sarah Chen')
  })

  it('allows a working-style memory write', () => {
    const r = runHook({ tool_name: 'memory_write', tool_input: { content: 'Prefers concise drafts.' } })
    expect(r.exitCode).toBe(0)
    expect(r.action).toBe('allow')
  })

  it('allows RCRE MCP tool calls untouched', () => {
    const r = runHook({ tool_name: 'get_my_today', tool_input: {} })
    expect(r.exitCode).toBe(0)
  })

  it('blocks unparseable input rather than waving it through', () => {
    expect(runHookRaw('not json at all')).toBe(2)
    expect(runHookRaw('')).toBe(2)
  })

  it('blocks an envelope whose tool name it cannot find', () => {
    expect(runHook({ something: 'else' }).exitCode).toBe(2)
  })

  it.each(['tool_name', 'toolName', 'name'])('reads the %s envelope field', (field) => {
    const r = runHook({ [field]: 'memory_write', tool_input: { content: 'budget $450,000' } })
    expect(r.exitCode).toBe(2)
  })

  it('agrees with the tested implementation on every case — no drift', () => {
    const cases: Array<{ tool_name: string; tool_input: unknown }> = [
      { tool_name: 'memory_write', tool_input: { content: 'Prefers concise drafts.' } },
      { tool_name: 'memory_write', tool_input: { content: 'Call 205-555-0134' } },
      { tool_name: 'memory_write', tool_input: { content: 'dana.reid@example.com' } },
      { tool_name: 'memory_write', tool_input: { content: 'Budget $450k' } },
      { tool_name: 'memory_write', tool_input: { content: '1420 Magnolia Avenue' } },
      { tool_name: 'search_memory', tool_input: { q: 'Call 205-555-0134' } },
      { tool_name: 'get_my_today', tool_input: {} },
      { tool_name: 'write_file', tool_input: { path: '~/.hermes/MEMORY.md', content: 'buyer Sarah Chen' } },
      { tool_name: 'write_file', tool_input: { path: '/tmp/x.txt', content: 'buyer Sarah Chen' } },
    ]
    for (const c of cases) {
      const hook = runHook(c)
      const local = evaluateMemoryWrite({ toolName: c.tool_name, args: c.tool_input })
      expect(hook.action, JSON.stringify(c)).toBe(local.decision === 'block' ? 'block' : 'allow')
    }
  })
})

// ---------------------------------------------------------------------------

describe('tool surface — absence is the control', () => {
  it('has no tool name carrying a send, publish, delete or query verb', () => {
    for (const t of TOOLS) {
      for (const verb of PROHIBITED_NAME_VERBS) {
        expect(verb.test(t.name), `${t.name} matches ${verb}`).toBe(false)
      }
    }
  })

  it('has no tool that claims to send, publish or post', () => {
    for (const t of TOOLS) {
      // Descriptions may say a tool does NOT send. They may not say it does.
      expect(t.description, t.name).not.toMatch(/\b(?:sends|publishes|posts to|delivers) (?:the |a |an )?(?:message|email|text|post)/i)
    }
  })

  it('exposes no unrestricted database access under any name', () => {
    for (const t of TOOLS) {
      expect(t.name).not.toMatch(/sql|database|\bdb\b|table|schema|migration/i)
      expect(t.description).not.toMatch(/\bSQL\b|arbitrary quer/i)
    }
  })

  it('every client-facing or state-changing tool is draft-then-approve', () => {
    for (const t of TOOLS) {
      if (t.effect === 'write') expect(t.requiresApproval, t.name).toBe(true)
      if (t.effect === 'draft') expect(t.description, t.name).toMatch(/draft/i)
    }
  })

  it('the stage-change path is a request, never an act', () => {
    const t = findTool('request_stage_update')!
    expect(t.effect).toBe('write')
    expect(t.requiresApproval).toBe(true)
    expect(t.description).toMatch(/does NOT change/i)
    expect(TOOLS.map(x => x.name)).not.toContain('update_stage')
    expect(TOOLS.map(x => x.name)).not.toContain('set_stage')
  })

  it('never exposes message bodies', () => {
    const history = findTool('get_contact_history')!
    expect(history.description).toMatch(/SUMMARIES ONLY|never exposed/i)
    for (const t of TOOLS) expect(t.name).not.toMatch(/message_body|read_messages/i)
  })

  it('the agent performance tool is self-scope only', () => {
    const t = findTool('get_my_performance')!
    expect(t.effect).toBe('read')
    expect(t.requiresApproval).toBe(false)
    expect(t.description).toMatch(/self-scope only/i)
    expect(Object.keys(t.inputSchema.properties)).not.toContain('agentId')
  })
})

describe('role separation between the two profiles', () => {
  const brokerOnly = TOOLS.filter(t => !t.allowedRoles.includes('agent'))

  it('there are broker-only tools, and an agent actor is denied every one', () => {
    expect(brokerOnly.length).toBeGreaterThan(0)
    for (const t of brokerOnly) {
      const r = authorizeCall({ toolName: t.name, args: {}, actor: agent, approvalId: 'a' })
      expect(r.allowed, t.name).toBe(false)
      expect(r.allowed === false && r.code).toBe('role_not_permitted')
    }
  })

  it('a team lead is an agent, not a broker', () => {
    const lead: ResolvedActor = { ...agent, role: 'team_lead' }
    expect(authorizeCall({ toolName: 'get_my_today', args: {}, actor: lead }).allowed).toBe(true)
    expect(authorizeCall({ toolName: 'get_broker_exceptions', args: {}, actor: lead }).allowed).toBe(false)
  })

  it.each(['staff', 'recruiter', 'viewer'] as const)('denies %s every tool in the registry', (role) => {
    const actor: ResolvedActor = { ...agent, role }
    for (const t of TOOLS) {
      expect(authorizeCall({ toolName: t.name, args: {}, actor, approvalId: 'a' }).allowed, `${role}:${t.name}`)
        .toBe(false)
    }
  })
})

describe('approval binding — an id is not a permission', () => {
  const goodApproval = {
    id: 'appr-1', toolName: 'create_follow_up_task',
    actorUserId: 'u-agent', organizationId: 'org-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(), consumedAt: null,
  }
  const call = (approval: unknown, actor: ResolvedActor = agent) => authorizeCall({
    toolName: 'create_follow_up_task',
    args: { personId: 'p1', title: 'Call back' },
    actor,
    approvalId: (approval as { id: string }).id,
    approval: approval as never,
  })

  it('accepts an approval bound to this tool, actor and organization', () => {
    expect(call(goodApproval).allowed).toBe(true)
  })

  it('refuses an approval granted for a different tool', () => {
    const r = call({ ...goodApproval, toolName: 'request_stage_update' })
    expect(r.allowed === false && r.code).toBe('approval_not_bound')
  })

  it('refuses an approval granted to a different actor', () => {
    const r = call({ ...goodApproval, actorUserId: 'u-someone-else' })
    expect(r.allowed === false && r.code).toBe('approval_not_bound')
  })

  it('refuses an approval from a different organization', () => {
    const r = call({ ...goodApproval, organizationId: 'org-2' })
    expect(r.allowed === false && r.code).toBe('approval_not_bound')
  })

  it('refuses an expired approval', () => {
    const r = call({ ...goodApproval, expiresAt: new Date(Date.now() - 1000).toISOString() })
    expect(r.allowed === false && r.code).toBe('approval_expired')
  })

  it('refuses a replayed approval — approvals are single use', () => {
    const r = call({ ...goodApproval, consumedAt: new Date().toISOString() })
    expect(r.allowed === false && r.code).toBe('approval_already_used')
  })

  it('refuses when the supplied id does not match the record', () => {
    const r = authorizeCall({
      toolName: 'create_follow_up_task', args: { personId: 'p1', title: 'x' },
      actor: agent, approvalId: 'appr-other', approval: goodApproval,
    })
    expect(r.allowed === false && r.code).toBe('approval_not_bound')
  })

  it('still refuses every write tool with no approval at all', () => {
    for (const t of TOOLS.filter(t => t.requiresApproval)) {
      const r = authorizeCall({ toolName: t.name, args: {}, actor: agent })
      expect(r.allowed, t.name).toBe(false)
      expect(r.allowed === false && r.code).toBe('approval_required')
    }
  })
})

describe('escalation is impossible from the model side', () => {
  it('no combination of arguments turns an agent into a broker', () => {
    for (const attempt of [
      { role: 'broker' }, { user_id: 'u-broker' }, { impersonate: 'u-broker' },
      { organizationId: 'org-2' }, { actor_id: 'u-broker' }, { onBehalfOf: 'u-broker' },
    ]) {
      for (const t of TOOLS) {
        const r = authorizeCall({ toolName: t.name, args: attempt, actor: agent, approvalId: 'a' })
        if (!t.allowedRoles.includes('agent')) {
          expect(r.allowed, t.name).toBe(false)
        } else {
          expect(r.allowed === false && r.code, t.name).toBe('identity_in_arguments')
        }
      }
    }
  })

  it('an approval record cannot be used to assert a different actor', () => {
    const r = authorizeCall({
      toolName: 'create_follow_up_task', args: { personId: 'p1', title: 'x' },
      actor: agent, approvalId: 'appr-1',
      approval: {
        id: 'appr-1', toolName: 'create_follow_up_task',
        actorUserId: 'u-broker', organizationId: 'org-1',
      },
    })
    expect(r.allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------

describe('Hermes profile templates', () => {
  const profiles = ['rcre-agent', 'rcre-broker'] as const
  const cfg = (p: string) => readFileSync(`${PROFILE_DIR}/${p}/config.yaml`, 'utf8')
  const mcpTools = (p: string) => {
    const body = cfg(p).split('mcp_servers:')[1] ?? ''
    return [...body.matchAll(/^\s+- (\w+)$/gm)].map(m => m[1])
  }

  it('there are exactly two profiles — not seven bots', () => {
    expect(readdirSync(PROFILE_DIR).filter(d => !d.startsWith('.')).sort())
      .toEqual(['rcre-agent', 'rcre-broker'])
  })

  it.each(profiles)('%s is provider-agnostic — no vendor or model is named', (p) => {
    const text = cfg(p) + readFileSync(`${PROFILE_DIR}/${p}/SOUL.md`, 'utf8')
    expect(text).not.toMatch(/anthropic|openai|\bclaude\b|\bgpt-?\d|gemini|llama|mistral/i)
    expect(cfg(p)).toMatch(/^model:\s*\{\}\s*$/m)
  })

  it.each(profiles)('%s keeps approvals on and dangerous toolsets off', (p) => {
    expect(cfg(p)).toMatch(/mode:\s*smart/)
    expect(cfg(p)).not.toMatch(/mode:\s*off/)
    for (const toolset of ['terminal', 'code', 'computer', 'browser']) {
      expect(cfg(p).split('disabled:')[1] ?? '').toContain(toolset)
    }
  })

  it.each(profiles)('%s only lists tools that actually exist in the registry', (p) => {
    const names = TOOLS.map(t => t.name)
    for (const listed of mcpTools(p)) expect(names, `${p}: ${listed}`).toContain(listed)
  })

  it('the AGENT profile does not list a single broker-only tool', () => {
    const brokerOnly = TOOLS.filter(t => !t.allowedRoles.includes('agent')).map(t => t.name)
    expect(brokerOnly.length).toBeGreaterThan(0)
    for (const name of brokerOnly) expect(mcpTools('rcre-agent')).not.toContain(name)
  })

  it('the broker profile listing broker tools grants nothing on its own', () => {
    // Listing is a client-side allowlist. Authority is the server-side role.
    for (const name of mcpTools('rcre-broker')) {
      const r = authorizeCall({ toolName: name, args: {}, actor: { ...agent, role: 'viewer' }, approvalId: 'a' })
      expect(r.allowed, name).toBe(false)
    }
  })

  it('neither profile can be reconfigured into a database tool', () => {
    for (const p of profiles) {
      for (const listed of mcpTools(p)) {
        expect(PROHIBITED_TOOL_NAMES).not.toContain(listed)
      }
    }
  })
})

describe('Hermes skill templates', () => {
  const skills = readdirSync(SKILL_DIR).filter(d => !d.startsWith('.'))
  const body = (s: string) => readFileSync(`${SKILL_DIR}/${s}/SKILL.md`, 'utf8')

  it('covers all three confirmed product functions', () => {
    expect(skills).toContain('rcre-lead-prioritization')       // function 1
    expect(skills).toContain('rcre-pipeline-accountability')   // function 2
    expect(skills).toContain('rcre-business-coach')            // function 3
  })

  it.each(skills)('%s has usable frontmatter', (s) => {
    const text = body(s)
    expect(text.startsWith('---\n')).toBe(true)
    expect(text).toMatch(/^name: /m)
    expect(text).toMatch(/^description: .{20,}/m)
  })

  it.each(skills)('%s is instructional, not data-bearing', (s) => {
    // A skill carrying real contact data would ship PII into a git tap.
    const text = body(s)
      // Illustrative quoted examples of what NOT to write are instruction.
      .replace(/^>.*$/gm, '')
    const findings = scanForPii(text).map(f => f.category)
    expect(findings, `${s}: ${findings.join(', ')}`).toEqual([])
  })

  it.each(skills)('%s names no AI vendor', (s) => {
    expect(body(s)).not.toMatch(/anthropic|openai|\bclaude\b|\bgpt-?\d|gemini/i)
  })

  it.each(skills)('%s only references tools that exist', (s) => {
    const names = TOOLS.map(t => t.name)
    for (const [, ref] of body(s).matchAll(/`(get_[a-z_]+|draft_[a-z_]+|create_[a-z_]+|request_[a-z_]+)`/g)) {
      expect(names, `${s}: ${ref}`).toContain(ref)
    }
  })

  it('the broker skill states that its tools are broker-only', () => {
    expect(body('rcre-broker-command')).toMatch(/broker profiles only/i)
  })

  it('the placeholder skill is labelled as one rather than implying a corpus', () => {
    expect(body('rcre-procedures')).toMatch(/PLACEHOLDER/)
  })
})
