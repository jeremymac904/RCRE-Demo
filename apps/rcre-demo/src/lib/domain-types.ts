// RCRE MVP domain types. Mirrors supabase/migrations/0001_rcre_mvp_core.sql.

export type UserRole =
  | 'owner' | 'broker' | 'team_lead' | 'agent' | 'staff' | 'recruiter' | 'viewer'

export type ActivityDirection = 'inbound' | 'outbound' | 'system'

export type ActivityKind =
  | 'call' | 'text' | 'email' | 'note' | 'appointment' | 'task' | 'stage_change'
  | 'property_view' | 'property_saved' | 'inquiry' | 'registration'
  | 'em_open' | 'em_click' | 'assignment' | 'other'

export type ToolEffect = 'read' | 'draft' | 'write'

export interface Organization { id: string; name: string; slug: string; fubAccountId?: string | null }

export interface User {
  id: string
  organizationId: string
  email: string
  fullName: string | null
  role: UserRole
  fubUserId: number | null
  isActive: boolean
}

export interface Person {
  id: string
  organizationId: string
  fubPersonId: number
  firstName: string | null
  lastName: string | null
  emails: { value: string; type?: string }[]
  phones: { value: string; type?: string }[]
  stage: string | null
  source: string | null
  assignedUserId: string | null
  assignedFubUserId: number | null
  tags: string[]
  price: number | null
  // RCRE-owned timestamps
  firstReceivedAt: string | null
  firstAssignedAt: string | null
  firstTouchAt: string | null
  lastTouchAt: string | null
  lastInboundAt: string | null
  lastOutboundAt: string | null
  // RCRE-owned intelligence
  isBuyer: boolean | null
  isSeller: boolean | null
  budgetMin: number | null
  budgetMax: number | null
  birthday: string | null
  deletedInFub: boolean
}

export interface Activity {
  id: string
  organizationId: string
  personId: string | null
  userId: string | null
  kind: ActivityKind
  direction: ActivityDirection
  occurredAt: string
  summary: string | null
  sourceSystem: string
  fubResourceType: string | null
  fubResourceId: number | null
  metadata: Record<string, unknown>
}

export interface Task {
  id: string; organizationId: string; personId: string | null
  assignedUserId: string | null; fubTaskId: number | null
  title: string; dueAt: string | null; isCompleted: boolean
}

export interface Appointment {
  id: string; organizationId: string; personId: string | null
  assignedUserId: string | null; fubAppointmentId: number | null
  title: string | null; startsAt: string | null; endsAt: string | null
  location: string | null; outcome: string | null
}

export interface Deal {
  id: string; organizationId: string; personId: string | null
  ownerUserId: string | null; fubDealId: number | null
  name: string | null; stage: string | null; price: number | null
  projectedCloseOn: string | null; closedAt: string | null; status: string | null
  lastStageChangeAt: string | null
}

export interface Attribution {
  id: string; organizationId: string; personId: string | null
  source: string | null; medium: string | null; campaign: string | null
  campaignId: string | null; adGroup: string | null; creative: string | null
  keyword: string | null; audience: string | null; landingPage: string | null
  referrer: string | null; utm: Record<string, string>
  relatedAgentId: string | null; platformLeadId: string | null
  capturedAt: string
}

export interface RecruitingProspect {
  id: string; organizationId: string
  fullName: string | null; email: string | null; phone: string | null
  currentBrokerage: string | null; market: string | null
  stage: string; isConfidential: boolean; ownerUserId: string | null
  firstReceivedAt: string; firstTouchAt: string | null; lastTouchAt: string | null
}

export interface AuditEvent {
  organizationId: string | null
  actorUserId: string | null
  actorKind: 'user' | 'mcp' | 'system'
  action: string
  targetType?: string | null
  targetId?: string | null
  effect: ToolEffect
  allowed: boolean
  deniedReason?: string | null
  detail?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Reporting / routing history — mirrors migration 0002.
//
// These rows are RCRE-OWNED. FUB keeps no stage history and no assignment
// history, so anything below that is not captured as it happens is gone. The
// `detectedVia` discriminator is what stops a report from averaging a measured
// interval together with a stage we merely found on connection day.
// ---------------------------------------------------------------------------

/** How a history row came to exist. Load-bearing — see stage_transitions comment in 0002. */
export type DetectedVia = 'webhook' | 'backfill' | 'manual'

export type AssignmentReason =
  | 'initial' | 'round_robin' | 'leadership_routed' | 'team_lead_distributed'
  | 'manual_reassignment' | 'pond_claim' | 'agent_offboarded' | 'unknown'

export interface StageTransition {
  id?: string
  organizationId: string
  personId: string
  fromStage: string | null
  toStage: string
  fromStageId: number | null
  toStageId: number | null
  /** Denormalised on purpose: reassignment must not rewrite who was responsible then. */
  ownerUserId: string | null
  teamId: string | null
  occurredAt: string
  /** Null whenever we did not observe entry into `fromStage`. Never inferred. */
  secondsInFrom: number | null
  detectedVia: DetectedVia
}

export interface AssignmentHistoryRow {
  id?: string
  organizationId: string
  personId: string
  fromUserId: string | null
  toUserId: string | null
  fromFubUserId: number | null
  toFubUserId: number | null
  /** INFERRED from the roles either side of the hop. The timestamps are facts; this is not. */
  reason: AssignmentReason
  teamId: string | null
  assignedPondId: number | null
  assignedAt: string
  releasedAt: string | null
  isCurrent: boolean
  isInitialReceipt: boolean
  /** Response time is measured against the row where this is true. */
  isFinalAgent: boolean
  detectedVia: DetectedVia
}

export interface SyncStateRow {
  organizationId: string
  resource: string
  lastCursor: string | null
  lastOffset: number | null
  lastSyncedAt: string | null
  lastSeenFubUpdated: string | null
  recordsSeen: number
  backfillStatus: 'pending' | 'running' | 'complete' | 'failed'
  backfillStartedAt: string | null
  backfillCompletedAt: string | null
  lastError: string | null
}

export interface FollowUpPolicy {
  id: string
  organizationId: string
  leadCategory: string
  /** FUB source values this category covers. Empty/null = the fallback rule. */
  sourceMatch: string[] | null
  firstAttemptMinutes: number | null
  minAttempts24h: number | null
  minAttempts7d: number | null
  requiredChannels: ActivityKind[] | null
  requireDistinctChannels: boolean
  nurtureAfterDays: number | null
  isActive: boolean
  effectiveFrom: string
}

export interface StageAgingPolicy {
  id: string
  organizationId: string
  stage: string
  maxDays: number
  alertAudience: ('agent' | 'team_lead' | 'managing_broker' | 'owner')[]
  isActive: boolean
}
