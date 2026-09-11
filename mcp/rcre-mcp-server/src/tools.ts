// RCRE MCP tool registry.
//
// THE CENTRAL RULE
//   Hermes never receives raw database access. There is no query_database,
//   no execute_sql, no generic admin tool. Prohibited capability is absent by
//   construction, which is the strongest control available — a tool that does
//   not exist cannot be invoked, jailbroken, or argued into running.
//
//   Authority is resolved SERVER-SIDE from the authenticated credential.
//   A user id or role supplied in tool arguments is never authoritative and is
//   rejected outright (see assertNoIdentityArgs).

export type ToolEffect = 'read' | 'draft' | 'write'
export type UserRole =
  | 'owner' | 'broker' | 'team_lead' | 'agent' | 'staff' | 'recruiter' | 'viewer'

export interface ToolDefinition {
  name: string
  description: string
  effect: ToolEffect
  /** Roles permitted to call it. Enforced server-side, not by the model. */
  allowedRoles: readonly UserRole[]
  /** Write tools always require a recorded human approval before executing. */
  requiresApproval: boolean
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required?: string[]
    additionalProperties: false
  }
}

const AGENT_ROLES: readonly UserRole[] = ['owner', 'broker', 'team_lead', 'agent']
const BROKER_ROLES: readonly UserRole[] = ['owner', 'broker']

/**
 * Argument names that would let a model assert its own identity or scope.
 * Their presence is a hard rejection, not a silent ignore — a caller sending
 * them is either buggy or probing, and both deserve an audit entry.
 */
export const FORBIDDEN_ARG_NAMES: readonly string[] = [
  'userId', 'user_id', 'agentId', 'agent_id', 'organizationId', 'organization_id',
  'role', 'actorId', 'actor_id', 'onBehalfOf', 'impersonate', 'orgId', 'org_id',
]

export const TOOLS: readonly ToolDefinition[] = [
  {
    name: 'get_my_today',
    description:
      'Returns the calling agent\'s prioritised list for today — unanswered leads, new leads, ' +
      'appointments, due tasks, hot opportunities and stalled deals. Each item includes the ' +
      'specific reasons it surfaced. Scope is the caller\'s own book only.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_hot_leads',
    description:
      'Contacts showing repeated inbound engagement with no recent outbound contact. ' +
      'Ranked only on behaviour and recency — never on location, name, or any demographic signal.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Maximum results (default 10, max 50).' } },
      additionalProperties: false,
    },
  },
  {
    name: 'get_unanswered_leads',
    description:
      'Leads received but never contacted outbound, past the brokerage response threshold. ' +
      'Includes how long each has been waiting.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_stale_leads',
    description: 'Contacts with no activity in either direction beyond the stale threshold.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Maximum results (default 25, max 100).' } },
      additionalProperties: false,
    },
  },
  {
    name: 'get_contact',
    description:
      'One contact the caller is entitled to see. Returns stage, source, assignment, and the ' +
      'RCRE-derived timestamps. Never returns message bodies.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: { personId: { type: 'string', description: 'RCRE person id.' } },
      required: ['personId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_contact_history',
    description:
      'Activity timeline for one contact — calls, texts, emails, appointments, property ' +
      'activity. SUMMARIES ONLY; message content is never exposed.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'RCRE person id.' },
        limit: { type: 'number', description: 'Maximum events (default 50, max 200).' },
      },
      required: ['personId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_tasks',
    description: 'The caller\'s open tasks, with due dates and overdue status.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        window: { type: 'string', description: 'Which tasks to return.', enum: ['overdue', 'today', 'week', 'all'] },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_appointments',
    description: 'The caller\'s appointments within a window.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        window: { type: 'string', description: 'Time window.', enum: ['today', 'week'] },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_pipeline',
    description: 'The caller\'s active deals with stage and days since last stage change.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_my_performance',
    description:
      'The calling agent\'s OWN activity and conversion figures over a window — leads received, ' +
      'first-response times, contacts made, appointments set, stage transitions. Self-scope only; ' +
      'an agent cannot read another agent\'s figures through this or any other tool. Metrics with ' +
      'no underlying data are reported as unavailable rather than zero.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Lookback window in days (default 30, max 365).' } },
      additionalProperties: false,
    },
  },
  {
    name: 'get_academy_progress',
    description:
      "The calling agent's OWN progress through the RCRE Academy — courses completed, lessons " +
      'completed, last lesson viewed. Self-scope only. Training progress is performance-adjacent ' +
      'data about a named person, so an agent cannot read a colleague\'s progress through this or ' +
      'any other tool; a broker reads the roster view through get_broker_exceptions instead.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_next_lesson',
    description:
      'The next incomplete lesson in course order for the calling agent, with its course, title, ' +
      'description and attached resources. This is DETERMINISTIC ORDERING over course metadata — ' +
      'it is not a search over lesson content, and it must not be described as one. Lesson ' +
      'transcripts and video are not indexed and are not retrievable through any tool today.',
    effect: 'read',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Optional — restrict to one course.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_broker_exceptions',
    description:
      'BROKER ONLY. Brokerage-wide exceptions: new and unanswered leads, median first ' +
      'response time, agents with overdue follow-up, stalled deals. Metrics without data are ' +
      'reported as unavailable rather than zero.',
    effect: 'read',
    allowedRoles: BROKER_ROLES,
    requiresApproval: false,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_source_performance',
    description: 'BROKER ONLY. Lead volume by source and campaign over a window.',
    effect: 'read',
    allowedRoles: BROKER_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Lookback window in days (default 30, max 365).' } },
      additionalProperties: false,
    },
  },
  {
    name: 'draft_follow_up',
    description:
      'Draft a follow-up message for a contact. RETURNS A DRAFT ONLY — it does not send, ' +
      'queue, or schedule anything. Sending is a separate, human-approved action outside this tool.',
    effect: 'draft',
    allowedRoles: AGENT_ROLES,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'RCRE person id.' },
        channel: { type: 'string', description: 'Intended channel.', enum: ['email', 'sms', 'call_script'] },
        intent: { type: 'string', description: 'What the message should accomplish.' },
      },
      required: ['personId', 'channel'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_follow_up_task',
    description:
      'Create a follow-up task for the caller against one of their own contacts. ' +
      'Writes to RCRE only — it does not create a task in Follow Up Boss.',
    effect: 'write',
    allowedRoles: AGENT_ROLES,
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'RCRE person id.' },
        title: { type: 'string', description: 'Task title.' },
        dueAt: { type: 'string', description: 'ISO 8601 due timestamp.' },
      },
      required: ['personId', 'title'],
      additionalProperties: false,
    },
  },
  {
    name: 'request_stage_update',
    description:
      'REQUEST a stage change for a contact. Creates an approval request; it does NOT change ' +
      'the stage and does NOT write to Follow Up Boss. A human approves and applies it.',
    effect: 'write',
    allowedRoles: AGENT_ROLES,
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'RCRE person id.' },
        requestedStage: { type: 'string', description: 'Proposed stage name.' },
        reason: { type: 'string', description: 'Why the change is proposed.' },
      },
      required: ['personId', 'requestedStage'],
      additionalProperties: false,
    },
  },
] as const

export function findTool(name: string): ToolDefinition | undefined {
  return TOOLS.find(t => t.name === name)
}

/** Tool names that must never exist. Asserted by tests. */
export const PROHIBITED_TOOL_NAMES: readonly string[] = [
  // Unrestricted data access. goal.md and GOVERNANCE.md forbid these outright.
  'query_database', 'execute_sql', 'run_query', 'raw_query', 'sql', 'db_query',
  'admin', 'export_database', 'export_contacts', 'bulk_export', 'read_table',
  // Anything that reaches a client without a human in front of it.
  'send_email', 'send_sms', 'send_message', 'send_text', 'send_campaign',
  'schedule_send', 'queue_message', 'publish_post', 'publish_listing',
  'post_to_social', 'call_contact',
  // Anything that changes brokerage state autonomously.
  'update_stage', 'set_stage', 'change_stage', 'update_listing_price',
  'update_commission', 'update_contact', 'write_to_follow_up_boss',
  'sync_to_follow_up_boss', 'create_listing',
  // Destructive.
  'delete_person', 'delete_contact', 'delete_task', 'delete_deal', 'purge',
  // Legal, financial and identity.
  'execute_contract', 'sign_document', 'move_funds', 'impersonate_user',
  'assume_role', 'set_role', 'grant_permission',
  // Message content. get_contact_history returns summaries, never bodies.
  'read_messages', 'get_message_body', 'read_email_body',
]

/**
 * Verbs that would make a tool client-facing or state-changing. A tool whose
 * name carries one of these must not exist at all unless it is explicitly a
 * draft-or-request tool. Asserted by tests so a future tool cannot quietly
 * acquire send or write semantics by being named its way past review.
 */
export const PROHIBITED_NAME_VERBS: readonly RegExp[] = [
  /^send_/, /^publish_/, /^post_/, /^delete_/, /^execute_/, /^sql/, /^query_/,
  /_sql$/, /^admin/, /^export_/, /^impersonate/, /^assume_/, /^grant_/,
]

/** Tools whose effect reaches a client or changes brokerage state. */
export const CLIENT_FACING_OR_STATEFUL: readonly ToolEffect[] = ['write']
