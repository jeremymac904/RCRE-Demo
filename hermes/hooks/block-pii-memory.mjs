#!/usr/bin/env node
// RCRE PII memory guard — Hermes `pre_tool_call` shell hook.
//
// CONTRACT (Hermes shell hooks, per 01-research/hermes/HERMES-CAPABILITY-AUDIT.md §6
// and HERMES-SECURITY-GUARDRAILS.md Layer C):
//   * the hook receives the pending tool call as JSON on stdin
//   * to BLOCK: emit {"action":"block","message":"…"} on stdout AND exit 2
//     (both signals are honoured; emitting both removes any dependence on
//     which one a given Hermes build reads)
//   * to ALLOW: emit {"action":"allow"} and exit 0
//   * `fail_closed: true` in config.yaml means a hook that errors or times out
//     blocks the call
//
// This hook is registered in both RCRE profiles. It is the technical
// enforcement of goal.md's "no PII in Hermes long term memory". It does not
// ask the model to behave; it stops the tool call.
//
// Rules come from rcre-pii-rules.json in this directory — the same file the
// tested TypeScript implementation imports.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

const READ_VERBS = /^(?:get|read|search|list|find|recall|query|show|load)[_.-]/i
const MEMORY_NOUN = /(?:memory|memories|remember|soul|journal|scratchpad|knowledge_?base)/i
const FILE_WRITE_TOOL = /(?:write|edit|append|create|update|save|patch)[_.-]?file|^(?:write|edit)$/i
const MEMORY_PATH = /(?:MEMORY\.md|SOUL\.md|MEMORIES?\/|\.hermes[\/\\])/i

function block(message) {
  process.stdout.write(JSON.stringify({ action: 'block', message }) + '\n')
  process.exit(2)
}

function allow() {
  process.stdout.write(JSON.stringify({ action: 'allow' }) + '\n')
  process.exit(0)
}

function collectStrings(value, depth = 0, out = []) {
  if (depth > 8 || out.length > 5000) return out
  if (typeof value === 'string') { out.push(value); return out }
  if (typeof value === 'number' || typeof value === 'boolean') { out.push(String(value)); return out }
  if (Array.isArray(value)) { for (const v of value) collectStrings(v, depth + 1, out); return out }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) { out.push(k); collectStrings(v, depth + 1, out) }
  }
  return out
}

function classify(toolName, args) {
  if (MEMORY_NOUN.test(toolName)) return READ_VERBS.test(toolName) ? 'memory_read' : 'memory_write'
  if (FILE_WRITE_TOOL.test(toolName)) {
    if (collectStrings(args).some(s => MEMORY_PATH.test(s))) return 'memory_write'
  }
  return 'not_memory'
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

function main() {
  let rules
  try {
    rules = JSON.parse(readFileSync(join(HERE, 'rcre-pii-rules.json'), 'utf8')).rules
  } catch {
    // The guard cannot run. Fail closed.
    block('RCRE PII guard: rule table could not be loaded, so the call was blocked. This guard fails closed by design.')
    return
  }

  const raw = readStdin()
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    block('RCRE PII guard: the tool call could not be parsed, so it was blocked. This guard fails closed by design.')
    return
  }

  // Envelope shapes differ between Hermes builds; accept the documented and
  // the obvious alternatives rather than silently allowing an unrecognised one.
  const toolName =
    payload?.tool_name ?? payload?.toolName ?? payload?.tool?.name ?? payload?.name
  const args =
    payload?.tool_input ?? payload?.args ?? payload?.arguments ?? payload?.input ?? payload?.parameters ?? {}

  if (typeof toolName !== 'string' || toolName.trim() === '') {
    block('RCRE PII guard: the tool call could not be identified, so it was blocked. This guard fails closed by design.')
    return
  }

  if (classify(toolName, args) !== 'memory_write') { allow(); return }

  const haystack = collectStrings(args).join('\n')
  const categories = []
  for (const rule of rules) {
    let re
    try {
      re = new RegExp(rule.pattern, String(rule.flags || '').replace(/g/g, ''))
    } catch {
      categories.push('unparseable rule — guard is broken')
      continue
    }
    if (re.test(haystack) && !categories.includes(rule.category)) categories.push(rule.category)
  }

  if (categories.length === 0) { allow(); return }

  categories.sort()
  block(
    'RCRE PII guard: blocked a write to long-term memory containing ' +
    categories.join(', ') +
    '. Client and agent records stay in RCRE and are retrieved per question ' +
    "through the RCRE MCP tools. Memory is for this agent's own preferences " +
    'and working style only.',
  )
}

try {
  main()
} catch {
  block('RCRE PII guard: the guard itself failed, so the call was blocked. This guard fails closed by design.')
}
