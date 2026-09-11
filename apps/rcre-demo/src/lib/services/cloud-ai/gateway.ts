/**
 * RCRE Cloud AI Gateway
 * 
 * Unified AI request router that dispatches to the correct provider
 * based on configuration and enriches requests with role context.
 * 
 * - Routes to deterministic, Ollama, Hermes, or cloud providers
 * - Injects role-based system prompt context
 * - Maintains conversation history per session
 * - Produces audit trail (metadata only — no content)
 */

import type { PlatformActor, PlatformRole } from '@/lib/platform/auth'
import type { AIConfig } from '@/lib/services/ai'
import { CloudTransport, type AIStreamChunk } from './cloud-transport'
import type { CloudProviderConfig, AIProviderCapabilities } from './providers'
import { resolveProvider, listAllProviders, costRankLabel } from './providers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RCREProviderType = 'deterministic' | 'ollama' | 'hermes' | 'cloud'

export interface RCRECloudAIConfig {
  provider: RCREProviderType
  cloud?: CloudProviderConfig
  role: PlatformRole
  userId: string
  sessionId: string
}

export interface AuditEntry {
  timestamp: string
  userId: string
  sessionId: string
  role: PlatformRole
  provider: string
  model: string
  latencyMs: number
  finishReason: string
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export interface RoleContext {
  roleName: string
  roleLabel: string
  permissions: string[]
  approvedTools: string[]
  businessContext: string
}

export interface RCREChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
}

export interface GatewayResult {
  text: string
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | 'cancelled'
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  latencyMs: number
  auditEntry: AuditEntry
}

// ---------------------------------------------------------------------------
// Role context definitions
// ---------------------------------------------------------------------------

const ROLE_CONTEXT: Record<PlatformRole, RoleContext> = {
  agent: {
    roleName: 'agent',
    roleLabel: 'Licensed Real Estate Agent',
    permissions: ['crm', 'calendar', 'pipeline', 'transactions.read', 'marketing.read', 'ai'],
    approvedTools: ['contact_lookup', 'task_list', 'calendar_view', 'transaction_summary', 'market_info', 'draft_followup', 'deadline_check'],
    businessContext: 'RCRE agent working in Alabama or Florida. Focus on lead follow-up, transaction coordination, and client service. No legal advice, no contract execution, no compliance approval.',
  },
  team_leader: {
    roleName: 'team_leader',
    roleLabel: 'Team Leader',
    permissions: ['crm', 'calendar', 'pipeline', 'transactions.read', 'marketing.read', 'command', 'reporting', 'recruiting', 'ai'],
    approvedTools: ['contact_lookup', 'task_list', 'calendar_view', 'transaction_summary', 'market_info', 'draft_followup', 'deadline_check', 'team_report', 'lead_routing'],
    businessContext: 'RCRE team leader overseeing agents and leads in their market. Focus on team performance, lead routing, recruiting, and reporting. Compliance decisions require human review.',
  },
  managing_broker: {
    roleName: 'managing_broker',
    roleLabel: 'Managing Broker',
    permissions: ['crm', 'calendar', 'pipeline', 'transactions.read', 'marketing.read', 'command', 'reporting', 'recruiting', 'ai'],
    approvedTools: ['contact_lookup', 'task_list', 'calendar_view', 'transaction_summary', 'market_info', 'draft_followup', 'deadline_check', 'team_report', 'lead_routing', 'policy_reminder'],
    businessContext: 'RCRE managing broker responsible for compliance, agent supervision, and market operations. All compliance approvals require explicit human sign-off.',
  },
  broker_owner: {
    roleName: 'broker_owner',
    roleLabel: 'Broker Owner',
    permissions: ['*'], // full access
    approvedTools: ['*'], // all tools
    businessContext: 'RCRE broker owner with full access to the platform. Responsible for policy, integrations, and strategic decisions. AI assists with research, drafting, and analysis.',
  },
  transaction_coordinator: {
    roleName: 'transaction_coordinator',
    roleLabel: 'Transaction Coordinator',
    permissions: ['transactions.read', 'transactions.write', 'crm', 'calendar', 'ai'],
    approvedTools: ['transaction_summary', 'deadline_check', 'document_reminder', 'task_list', 'calendar_view'],
    businessContext: 'RCRE transaction coordinator (Florida, Margie\'s team) managing contract timelines and document flow. No legal advice, no contract modification authority.',
  },
  marketing_admin: {
    roleName: 'marketing_admin',
    roleLabel: 'Marketing Admin',
    permissions: ['marketing.read', 'marketing.write', 'cms', 'approvals', 'calendar', 'ai'],
    approvedTools: ['content_library', 'draft_content', 'approval_queue', 'social_preview'],
    businessContext: 'RCRE marketing administrator managing content creation, approval workflows, and brand consistency. Publish actions require approval; AI drafts only.',
  },
  trainer: {
    roleName: 'trainer',
    roleLabel: 'RCRE Trainer / AI Academy Instructor',
    permissions: ['academy.read', 'academy.write', 'community.read', 'community.write', 'ai'],
    approvedTools: ['course_catalog', 'lesson_content', 'enrollment_report', 'community_posts'],
    businessContext: 'RCRE trainer facilitating the AI Academy and community. AI assists with curriculum questions and agent development. No brokerage compliance authority.',
  },
}

// ---------------------------------------------------------------------------
// Conversation history management
// ---------------------------------------------------------------------------

const MAX_CONTEXT_MESSAGES = 20
const MAX_CHARS_PER_MESSAGE = 4000

interface ConversationState {
  messages: RCREChatMessage[]
  lastUpdated: string
}

const sessions = new Map<string, ConversationState>()

function getOrCreateConversation(sessionId: string): ConversationState {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], lastUpdated: new Date().toISOString() })
  }
  const state = sessions.get(sessionId)!
  state.lastUpdated = new Date().toISOString()
  return state
}

/**
 * Trims conversation to the last N messages and summarizes if too long.
 */
function pruneConversation(state: ConversationState, maxMessages = MAX_CONTEXT_MESSAGES): RCREChatMessage[] {
  const msgs = state.messages
  if (msgs.length <= maxMessages) return msgs

  // Keep system + last N messages, truncate oldest user/assistant pairs
  const system = msgs.filter(m => m.role === 'system')
  const rest = msgs.filter(m => m.role !== 'system')
  const kept = rest.slice(-maxMessages)

  return [
    ...system,
    {
      role: 'assistant' as const,
      content: '[Previous conversation summarized — see prior messages for detail]',
    },
    ...kept,
  ]
}

/**
 * Truncate a message string to max chars, preserving meaning.
 */
function truncateMessage(content: string, max = MAX_CHARS_PER_MESSAGE): string {
  if (content.length <= max) return content
  return content.slice(0, max - 20) + '\n…[truncated]'
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

const auditLog: AuditEntry[] = []

/**
 * Returns the in-memory audit log for this process.
 * In production this would write to a durable audit store.
 */
export function getAuditLog(): ReadonlyArray<AuditEntry> {
  return auditLog
}

function appendAudit(entry: AuditEntry): void {
  auditLog.push(entry)
  // Keep in-memory log bounded
  if (auditLog.length > 1000) {
    auditLog.splice(0, auditLog.length - 1000)
  }
}

// ---------------------------------------------------------------------------
// RCRECloudAI Gateway
// ---------------------------------------------------------------------------

export class RCRECloudAI {
  private config: RCRECloudAIConfig
  private actor: PlatformActor
  private transport: CloudTransport | null = null
  private sessionId: string

  constructor(actor: PlatformActor, aiConfig: AIConfig, cloudConfig?: CloudProviderConfig) {
    this.actor = actor
    this.sessionId = `${actor.organizationId}:${actor.userId}:${Date.now()}`
    this.config = {
      provider: aiConfig.provider as RCREProviderType,
      cloud: cloudConfig,
      role: actor.role,
      userId: actor.userId,
      sessionId: this.sessionId,
    }

    if (this.config.provider === 'cloud' && cloudConfig) {
      this.transport = new CloudTransport(cloudConfig)
    }
  }

  /**
   * Returns the current session ID for this gateway instance.
   */
  get session(): string {
    return this.sessionId
  }

  /**
   * Returns the effective provider id and model for display.
   */
  get currentProvider(): { id: string; model: string; capabilities?: AIProviderCapabilities } {
    if (this.config.provider === 'cloud') {
      const meta = resolveProvider('cloud', this.config.cloud)
      return {
        id: this.config.cloud?.provider ?? 'cloud',
        model: this.config.cloud?.model ?? '',
        capabilities: meta?.capabilities,
      }
    }
    const meta = resolveProvider(this.config.provider)
    return {
      id: this.config.provider,
      model: '',
      capabilities: meta?.capabilities,
    }
  }

  /**
   * Returns role context for the current actor.
   */
  get roleContext(): RoleContext {
    return ROLE_CONTEXT[this.actor.role] ?? ROLE_CONTEXT.agent
  }

  /**
   * Builds the enriched system prompt with role context.
   */
  buildSystemPrompt(extraContext?: string): string {
    const ctx = this.roleContext
    const parts: string[] = [
      `You are the RCRE AI assistant.`,
      `Your role: ${ctx.roleLabel} (${ctx.roleName})`,
      `Organization: River City Real Estate Group (RCRE) — Alabama and Florida markets.`,
      `Session: ${this.sessionId}`,
      `User: ${this.actor.name} (${this.actor.userId})`,
      ``,
      `Your permissions: ${ctx.permissions.join(', ')}.`,
      `Approved tools: ${ctx.approvedTools.join(', ')}.`,
      ``,
      `Business context: ${ctx.businessContext}`,
      ``,
      `AI guardrails (non-negotiable):`,
      `- Never invent facts, legal clauses, compliance approval, executed actions, or private records`,
      `- Never send messages, execute contracts, or make commitments`,
      `- Never store PII in long-term memory`,
      `- Drafts require human review before any consequential action`,
      `- When uncertain, say so and defer to the authorized human`,
      `- No fake compliance passes — if review is required, say so`,
    ]

    if (extraContext) {
      parts.push('', extraContext)
    }

    return parts.join('\n')
  }

  /**
   * Adds a message to the conversation history.
   */
  addMessage(role: RCREChatMessage['role'], content: string): void {
    const state = getOrCreateConversation(this.sessionId)
    state.messages.push({
      role,
      content: truncateMessage(content),
    })
    // Prune immediately
    state.messages = pruneConversation(state)
  }

  /**
   * Sends a chat completion request to the configured provider.
   * Returns structured result + updates audit trail.
   */
  async complete(
    userMessage: string,
    options?: { signal?: AbortSignal; extraSystemContext?: string }
  ): Promise<GatewayResult> {
    const start = Date.now()

    if (this.config.provider === 'cloud' && this.transport) {
      return this.cloudComplete(userMessage, options)
    }

    if (this.config.provider === 'deterministic') {
      // Deterministic is handled by scopedEvidence in the existing ai.ts service
      // This path should not be called directly; use ai.run() instead
      throw new Error('Deterministic provider must use ai.run() from services/ai.ts — do not call gateway directly')
    }

    if (this.config.provider === 'ollama' || this.config.provider === 'hermes') {
      // These are handled by the existing ai.ts service via HTTP to local endpoints
      throw new Error(
        `Provider '${this.config.provider}' must use ai.run() from services/ai.ts — the gateway routes cloud only`
      )
    }

    throw new Error(`Unsupported provider: ${this.config.provider}`)
  }

  private async cloudComplete(
    userMessage: string,
    options?: { signal?: AbortSignal; extraSystemContext?: string }
  ): Promise<GatewayResult> {
    if (!this.transport || !this.config.cloud) {
      throw new Error('Cloud transport not initialized — provide cloud config')
    }

    const state = getOrCreateConversation(this.sessionId)

    // Build messages: system + conversation history + new user message
    const systemPrompt = this.buildSystemPrompt(options?.extraSystemContext)
    const messages: RCREChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...pruneConversation(state),
      { role: 'user', content: truncateMessage(userMessage) },
    ]

    // Record user message in history
    this.addMessage('user', userMessage)

    const response = await this.transport.complete(messages, {
      signal: options?.signal,
      user: `${this.actor.organizationId}:${this.actor.userId}`,
    })

    const text = response.text

    // Record assistant message in history
    this.addMessage('assistant', text)

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      userId: this.actor.userId,
      sessionId: this.sessionId,
      role: this.actor.role,
      provider: this.config.cloud?.provider ?? 'cloud',
      model: response.model,
      latencyMs: response.latencyMs,
      finishReason: response.finishReason,
      tokenUsage: response.usage,
    }
    appendAudit(entry)

    return {
      text,
      finishReason: response.finishReason,
      usage: response.usage,
      latencyMs: response.latencyMs,
      auditEntry: entry,
    }
  }

  /**
   * Streams a chat completion to the configured provider.
   * Yields text chunks via ReadableStream.
   */
  stream(
    userMessage: string,
    options?: { signal?: AbortSignal; extraSystemContext?: string }
  ): ReadableStream<AIStreamChunk> & { auditEntry: AuditEntry } {
    if (this.config.provider !== 'cloud' || !this.transport || !this.config.cloud) {
      throw new Error('Streaming requires cloud provider with initialized transport')
    }

    const state = getOrCreateConversation(this.sessionId)
    const systemPrompt = this.buildSystemPrompt(options?.extraSystemContext)

    const messages: RCREChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...pruneConversation(state),
      { role: 'user', content: truncateMessage(userMessage) },
    ]

    this.addMessage('user', userMessage)

    const start = Date.now()
    let finishReason: AuditEntry['finishReason'] = 'stop'
    let totalTokens = 0

    const stream = this.transport.stream(messages, {
      signal: options?.signal,
      user: `${this.actor.organizationId}:${this.actor.userId}`,
    })

    // Wrap to capture finish reason and tokens
    const wrapped = new ReadableStream<AIStreamChunk>({
      start(controller) {
        const reader = stream.getReader()
        ;(async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value.finishReason) finishReason = value.finishReason
              controller.enqueue(value)
              if (value.done) break
            }
            controller.close()
          } catch (err) {
            controller.error(err)
          }
        })()
      },
    })

    const auditEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      userId: this.actor.userId,
      sessionId: this.sessionId,
      role: this.actor.role,
      provider: this.config.cloud.provider,
      model: this.config.cloud.model,
      latencyMs: 0, // will be updated
      finishReason,
    }

    // Note: latency and tokens are approximate for streaming
    // A full audit would need chunk-level accumulation
    auditEntry.latencyMs = Date.now() - start

    // Defer appending audit until stream completes
    void this.waitForStreamEnd(wrapped, (entry) => {
      entry.finishReason = finishReason
      entry.latencyMs = Date.now() - start
      appendAudit(entry)
    }, auditEntry)

    // Record assistant message once stream ends
    void this.waitForStreamEnd(wrapped, (_entry, fullText) => {
      if (fullText) this.addMessage('assistant', fullText)
    }, {} as AuditEntry)

    Object.defineProperty(wrapped, 'auditEntry', { value: auditEntry, writable: false })

    return wrapped as ReadableStream<AIStreamChunk> & { auditEntry: AuditEntry }
  }

  private async waitForStreamEnd(
    stream: ReadableStream<AIStreamChunk>,
    onEnd: (entry: AuditEntry, fullText?: string) => void,
    entry: AuditEntry
  ): Promise<void> {
    const reader = stream.getReader()
    let fullText = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += value.delta
      }
      onEnd(entry, fullText)
    } catch {
      // Stream error — still record audit
      onEnd(entry, fullText)
    }
  }

  /**
   * Validates cloud credentials and returns availability info.
   */
  async validateCloudCredentials(): Promise<{ valid: boolean; models?: string[]; error?: string }> {
    if (!this.transport) {
      return { valid: false, error: 'Transport not initialized' }
    }
    return this.transport.validateCredentials()
  }

  /**
   * Clears the conversation history for this session.
   */
  clearHistory(): void {
    sessions.delete(this.sessionId)
  }

  /**
   * Returns all providers available for the current actor's role.
   */
  static availableProviders(
    actor: PlatformActor,
    cloudConfig?: CloudProviderConfig
  ): Array<{ id: string; label: string; description: string; costRank: string; recommended: boolean }> {
    const ctx = ROLE_CONTEXT[actor.role]
    const all = listAllProviders(cloudConfig)

    return all.map(p => ({
      id: p.id,
      label: p.label,
      description: p.description,
      costRank: costRankLabel(p.capabilities.costRank),
      recommended: p.capabilities.recommendedFor.includes(actor.role),
    }))
  }
}

// ---------------------------------------------------------------------------
// Convenience: check if a provider requires cloud
// ---------------------------------------------------------------------------

export function isCloudProvider(provider: string): boolean {
  return provider === 'cloud'
}

export function providerRequiresCredentials(provider: string): boolean {
  const meta = resolveProvider(provider)
  return meta?.requiresCredentials ?? false
}
