// RCRE PII memory guard — the tested implementation.
//
// WHY THIS FILE EXISTS
//   goal.md requires "no PII in Hermes long term memory". A SOUL.md sentence
//   asking the model not to do it is guidance, not a control. This module is
//   the decision function behind a Hermes `pre_tool_call` shell hook
//   (hermes/hooks/block-pii-memory.mjs), which blocks the tool call before it
//   runs. Block, not warn; fail closed, not fail open.
//
//   The rule table lives in hermes/hooks/rcre-pii-rules.json and is the single
//   source of truth shared with the deployed hook. Behavioural parity between
//   this module and the hook is asserted by the test suite.

import ruleTable from '../../../hermes/hooks/rcre-pii-rules.json'

export interface PiiRule {
  id: string
  category: string
  pattern: string
  flags: string
}

export const PII_RULES: readonly PiiRule[] = ruleTable.rules as PiiRule[]
export const PII_RULES_VERSION: string = ruleTable.version

/** How a tool call relates to Hermes long-term memory. */
export type MemorySurface = 'memory_write' | 'memory_read' | 'not_memory'

export interface PiiFinding {
  ruleId: string
  category: string
}

export type MemoryWriteDecision =
  | { decision: 'allow'; surface: MemorySurface; categories: [] }
  | { decision: 'block'; surface: MemorySurface | 'unknown'; categories: string[]; reason: string; message: string }

/** Read-only memory verbs. Recall is fine; persistence is the risk. */
const READ_VERBS = /^(?:get|read|search|list|find|recall|query|show|load)[_.-]/i

/** Anything that names the long-term memory surface. */
const MEMORY_NOUN = /(?:memory|memories|remember|soul|journal|scratchpad|knowledge_?base)/i

/** File-writing tools become memory writes when they target a memory artefact. */
const FILE_WRITE_TOOL = /(?:write|edit|append|create|update|save|patch)[_.-]?file|^(?:write|edit)$/i
const MEMORY_PATH = /(?:MEMORY\.md|SOUL\.md|MEMORIES?\/|\.hermes[\/\\])/i

/**
 * Classify a tool call. `unknown` is never returned — callers that cannot
 * establish a tool name get a block from evaluateMemoryWrite instead.
 */
export function classifyMemorySurface(toolName: string, args: unknown): MemorySurface {
  if (MEMORY_NOUN.test(toolName)) {
    return READ_VERBS.test(toolName) ? 'memory_read' : 'memory_write'
  }
  if (FILE_WRITE_TOOL.test(toolName)) {
    const strings = collectStrings(args)
    if (strings.some(s => MEMORY_PATH.test(s))) return 'memory_write'
  }
  return 'not_memory'
}

/** Depth- and volume-bounded collection of every string inside a value. */
export function collectStrings(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 8 || out.length > 5000) return out
  if (typeof value === 'string') {
    out.push(value)
    return out
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    out.push(String(value))
    return out
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, depth + 1, out)
    return out
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out.push(k)
      collectStrings(v, depth + 1, out)
    }
  }
  return out
}

/** Every rule that matches. Returns rule identity only — never the matched text. */
export function scanForPii(text: string): PiiFinding[] {
  const findings: PiiFinding[] = []
  for (const rule of PII_RULES) {
    let re: RegExp
    try {
      re = new RegExp(rule.pattern, rule.flags.replace(/g/g, ''))
    } catch {
      // An unparseable rule is a broken guard. Fail closed by reporting it.
      findings.push({ ruleId: rule.id, category: 'unparseable rule — guard is broken' })
      continue
    }
    if (re.test(text)) findings.push({ ruleId: rule.id, category: rule.category })
  }
  return findings
}

export interface MemoryToolCall {
  toolName?: unknown
  args?: unknown
}

/**
 * The enforcement decision.
 *
 * FAIL CLOSED: a call whose tool name cannot be read is blocked, because a
 * guard that cannot classify a call cannot claim the call is safe.
 *
 * The returned message names CATEGORIES, never the matched values — a block
 * message is surfaced to the model and logged, and must not itself become a
 * copy of the PII it just refused to store.
 */
export function evaluateMemoryWrite(call: MemoryToolCall): MemoryWriteDecision {
  const toolName = call?.toolName
  if (typeof toolName !== 'string' || toolName.trim() === '') {
    return {
      decision: 'block',
      surface: 'unknown',
      categories: [],
      reason: 'malformed_tool_call',
      message:
        'RCRE PII guard: the tool call could not be identified, so it was blocked. ' +
        'This guard fails closed by design.',
    }
  }

  const surface = classifyMemorySurface(toolName, call.args)
  if (surface !== 'memory_write') {
    return { decision: 'allow', surface, categories: [] }
  }

  const haystack = collectStrings(call.args).join('\n')
  const findings = scanForPii(haystack)
  if (findings.length === 0) {
    return { decision: 'allow', surface, categories: [] }
  }

  const categories = [...new Set(findings.map(f => f.category))].sort()
  return {
    decision: 'block',
    surface,
    categories,
    reason: 'pii_in_memory_write',
    message:
      'RCRE PII guard: blocked a write to long-term memory containing ' +
      categories.join(', ') +
      '. Client and agent records stay in RCRE and are retrieved per question ' +
      'through the RCRE MCP tools. Memory is for this agent\'s own preferences ' +
      'and working style only.',
  }
}
