// MCP authorization.
//
// Every call passes through authorizeCall() before any handler runs. The order
// of checks is deliberate: cheapest and most absolute first, so a probing
// caller is rejected before touching anything expensive.
//
//   1. Does the tool exist?                        (absent tool = absent capability)
//   2. Is the credential valid?                    (server-side identity)
//   3. Is the actor active and in an organization? (revocation takes effect here)
//   4. Does the actor's ROLE permit this tool?     (never the model's claim)
//   5. Do the arguments try to assert identity?    (hard reject)
//   6. Does a write tool have a recorded approval? (fail closed)
//
// Every outcome — allowed or denied — is audited. Denials are the interesting
// ones and must never be silent.

import { FORBIDDEN_ARG_NAMES, findTool, type ToolDefinition, type UserRole } from './tools'

export interface ResolvedActor {
  userId: string
  organizationId: string
  role: UserRole
  isActive: boolean
}

export interface AuthorizationRequest {
  toolName: string
  args: Record<string, unknown>
  /** Resolved from the credential by the caller. NEVER from `args`. */
  actor: ResolvedActor | null
  /** Approval token for write tools, recorded by the RCRE backend. */
  approvalId?: string | null
  /**
   * The approval RECORD as stored by RCRE. When supplied it is validated
   * strictly: an approval is bound to one tool, one actor, one organization,
   * and one use. Production callers always supply it — an opaque id on its own
   * proves only that the caller had a string.
   */
  approval?: ApprovalRecord | null
  /** Current time, injectable for tests. */
  now?: Date
}

/** A human approval as recorded by the RCRE backend. */
export interface ApprovalRecord {
  id: string
  /** The tool this approval was granted for. Approvals are not transferable. */
  toolName: string
  /** The actor the approval was granted to. */
  actorUserId: string
  organizationId: string
  /** ISO timestamp after which the approval is dead. */
  expiresAt?: string | null
  /** Set once the approval has been spent. An approval is single-use. */
  consumedAt?: string | null
}

export type AuthorizationResult =
  | { allowed: true; tool: ToolDefinition; actor: ResolvedActor }
  | { allowed: false; reason: string; code: AuthDenialCode }

export type AuthDenialCode =
  | 'unknown_tool' | 'unauthenticated' | 'inactive_user'
  | 'role_not_permitted' | 'identity_in_arguments' | 'approval_required'
  | 'approval_not_bound' | 'approval_expired' | 'approval_already_used'

export function authorizeCall(req: AuthorizationRequest): AuthorizationResult {
  // 1. Unknown tool. Also catches any attempt to invoke a prohibited name.
  const tool = findTool(req.toolName)
  if (!tool) {
    return { allowed: false, code: 'unknown_tool', reason: `no such tool: ${req.toolName}` }
  }

  // 2. Authentication.
  if (!req.actor) {
    return { allowed: false, code: 'unauthenticated', reason: 'no verified credential' }
  }

  // 3. Revocation. An offboarded agent's profile becomes inert here.
  if (!req.actor.isActive || !req.actor.organizationId) {
    return { allowed: false, code: 'inactive_user', reason: 'actor is not an active member of an organization' }
  }

  // 4. Role. Resolved server-side; the model has no say.
  if (!tool.allowedRoles.includes(req.actor.role)) {
    return {
      allowed: false, code: 'role_not_permitted',
      reason: `role '${req.actor.role}' may not call '${tool.name}'`,
    }
  }

  // 5. Identity assertion in arguments — reject rather than ignore.
  const offending = assertNoIdentityArgs(req.args)
  if (offending) {
    return {
      allowed: false, code: 'identity_in_arguments',
      reason: `argument '${offending}' cannot be supplied by the caller; identity is resolved server-side`,
    }
  }

  // 6. Writes fail closed without a recorded approval.
  if (tool.requiresApproval) {
    if (!req.approvalId && !req.approval) {
      return {
        allowed: false, code: 'approval_required',
        reason: `'${tool.name}' changes data and requires a recorded human approval`,
      }
    }
    // 6b. When the approval record is supplied it must actually bind to this
    // call. A model that guesses or replays an id gets nowhere.
    if (req.approval) {
      const denial = validateApproval(req.approval, tool.name, req.actor, req.now ?? new Date())
      if (denial) return denial
      if (req.approvalId && req.approvalId !== req.approval.id) {
        return {
          allowed: false, code: 'approval_not_bound',
          reason: 'approval id does not match the supplied approval record',
        }
      }
    }
  }

  return { allowed: true, tool, actor: req.actor }
}

/**
 * Validate that an approval record binds to this exact call. Returns a denial,
 * or null when the approval is good.
 *
 * An approval is bound to ONE tool, ONE actor, ONE organization and ONE use.
 * None of those come from the model.
 */
export function validateApproval(
  approval: ApprovalRecord,
  toolName: string,
  actor: ResolvedActor,
  now: Date,
): (AuthorizationResult & { allowed: false }) | null {
  if (approval.toolName !== toolName) {
    return {
      allowed: false, code: 'approval_not_bound',
      reason: `approval was granted for '${approval.toolName}', not '${toolName}'`,
    }
  }
  if (approval.actorUserId !== actor.userId) {
    return {
      allowed: false, code: 'approval_not_bound',
      reason: 'approval was granted to a different actor',
    }
  }
  if (approval.organizationId !== actor.organizationId) {
    return {
      allowed: false, code: 'approval_not_bound',
      reason: 'approval belongs to a different organization',
    }
  }
  if (approval.consumedAt) {
    return {
      allowed: false, code: 'approval_already_used',
      reason: 'approval has already been used; approvals are single-use',
    }
  }
  if (approval.expiresAt) {
    const expiry = new Date(approval.expiresAt)
    if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now.getTime()) {
      return {
        allowed: false, code: 'approval_expired',
        reason: 'approval has expired',
      }
    }
  }
  return null
}

/** Returns the first forbidden argument name found, or null. */
export function assertNoIdentityArgs(args: Record<string, unknown>): string | null {
  for (const key of Object.keys(args ?? {})) {
    if (FORBIDDEN_ARG_NAMES.includes(key)) return key
  }
  return null
}

/** Clamp numeric limits so a caller cannot request an unbounded result set. */
export function clampLimit(value: unknown, fallback: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback
  return Math.max(1, Math.min(n, max))
}

export interface AuditRecord {
  organizationId: string | null
  actorUserId: string | null
  actorKind: 'mcp'
  action: string
  effect: ToolDefinition['effect'] | 'read'
  allowed: boolean
  deniedReason?: string
  detail: Record<string, unknown>
}

/**
 * Build the audit record for a call.
 *
 * `detail` carries argument KEYS only, never values — arguments routinely
 * contain person ids and free text, and the audit log must not become a
 * secondary PII store.
 */
export function buildAuditRecord(
  req: AuthorizationRequest,
  result: AuthorizationResult,
): AuditRecord {
  return {
    organizationId: req.actor?.organizationId ?? null,
    actorUserId: req.actor?.userId ?? null,
    actorKind: 'mcp',
    action: req.toolName,
    effect: result.allowed ? result.tool.effect : 'read',
    allowed: result.allowed,
    deniedReason: result.allowed ? undefined : result.reason,
    detail: { argKeys: Object.keys(req.args ?? {}) },
  }
}
