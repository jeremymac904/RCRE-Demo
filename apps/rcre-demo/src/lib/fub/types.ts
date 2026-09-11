// Shapes of the FUB payloads we consume. Deliberately partial — we normalize
// only what the MVP needs and keep the raw payload for anything else.

export interface FubWebhookPayload {
  eventId: string
  eventCreated: string
  event: string
  resourceIds: number[]
  uri: string | null
  data?: Record<string, unknown>
}

export interface FubPerson {
  id: number
  created?: string
  updated?: string
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  emails?: { value: string; type?: string; isPrimary?: boolean }[]
  phones?: { value: string; type?: string; isPrimary?: boolean }[]
  stage?: string | null
  stageId?: number | null
  source?: string | null
  sourceUrl?: string | null
  assignedTo?: string | null
  assignedUserId?: number | null
  tags?: string[]
  price?: number | null
  contacted?: number | boolean | null
  lastActivity?: string | null
  [k: string]: unknown
}

export interface FubTask {
  id: number; personId?: number | null; assignedUserId?: number | null
  name?: string | null; dueDate?: string | null; isCompleted?: boolean | null
  completedDate?: string | null; [k: string]: unknown
}

export interface FubAppointment {
  id: number; personId?: number | null; invitees?: unknown[]
  title?: string | null; start?: string | null; end?: string | null
  location?: string | null; outcome?: string | null
  createdById?: number | null; [k: string]: unknown
}

export interface FubDeal {
  id: number; pipelineId?: number | null; personId?: number | null
  ownerId?: number | null; name?: string | null; stageId?: number | null
  stageName?: string | null; price?: number | null
  projectedCloseDate?: string | null; closedDate?: string | null
  status?: string | null; [k: string]: unknown
}

export interface FubCall {
  id: number; personId?: number | null; userId?: number | null
  isIncoming?: boolean | null; outcome?: string | null; note?: string | null
  duration?: number | null; created?: string | null; [k: string]: unknown
}

export interface FubTextMessage {
  id: number; personId?: number | null; userId?: number | null
  isIncoming?: boolean | null; message?: string | null
  created?: string | null; [k: string]: unknown
}

export interface FubEmail {
  id: number; personId?: number | null; userId?: number | null
  isIncoming?: boolean | null; subject?: string | null
  created?: string | null; [k: string]: unknown
}

export interface FubNote {
  id: number; personId?: number | null; createdById?: number | null
  subject?: string | null; body?: string | null; created?: string | null
  [k: string]: unknown
}

export interface FubUser {
  id: number; name?: string | null; firstName?: string | null
  lastName?: string | null; email?: string | null; role?: string | null
  [k: string]: unknown
}
