/**
 * Cloud AI Transport Layer
 * 
 * OpenAI-compatible HTTP transport for cloud LLM providers.
 * Handles streaming, retries, auth, rate limiting, and structured responses.
 * No `openai` npm package — uses native fetch throughout.
 */

import { type CloudProviderConfig, resolveEndpoint, assertFreeOnlyConfig, OPENROUTER_FREE_MODEL } from './providers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIResponse {
  text: string
  model: string
  provider: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latencyMs: number
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | 'cancelled'
  error?: AIError
}

export interface AIError {
  code: 'auth' | 'rate_limit' | 'server_error' | 'client_error' | 'network' | 'timeout' | 'unknown'
  message: string
  retryable: boolean
  statusCode?: number
}

export interface AIStreamChunk {
  delta: string
  finishReason?: AIResponse['finishReason']
  done: boolean
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
}

interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  max_tokens?: number
  temperature?: number
  top_p?: number
  stop?: string | string[]
  user?: string
  provider?: { allow_fallbacks: false; data_collection: 'deny'; max_price: { prompt: number; completion: number } }
  // Tool calling
  tools?: Array<{
    type: 'function'
    function: { name: string; description?: string; parameters: Record<string, unknown> }
  }>
  // Azure-specific
  azure_domain_extension?: string
}

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetry<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, delayMs: number, error: AIError) => void
): Promise<T> {
  let lastError: AIError | null = null

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const aiError = normalizeError(err)
      lastError = aiError

      if (!aiError.retryable || attempt === RETRY_CONFIG.maxAttempts) {
        throw aiError
      }

      const delayMs = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelayMs
      )

      onRetry?.(attempt, delayMs, aiError)
      await sleep(delayMs)
    }
  }

  throw lastError ?? new Error('Retry exhausted without error')
}

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

function normalizeError(err: unknown): AIError {
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.message.includes('aborted')) {
      return { code: 'network', message: 'Request was cancelled or timed out', retryable: false }
    }
  }

  if (err instanceof Response) {
    const status = err.status
    const body = '' // body read deferred to avoid blocking; error message uses status only

    switch (status) {
      case 401:
      case 403:
        return {
          code: 'auth',
          message: `Authentication failed (HTTP ${status}). Check your API key.`,
          retryable: false,
          statusCode: status,
        }
      case 429:
        return {
          code: 'rate_limit',
          message: `Rate limited (HTTP 429). ${getRetryAfter(err)}`,
          retryable: true,
          statusCode: status,
        }
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: 'server_error',
          message: `Server error (HTTP ${status}). Retrying…`,
          retryable: true,
          statusCode: status,
        }
      case 400:
        return {
          code: 'client_error',
          message: `Bad request (HTTP 400): ${body.slice(0, 200)}`,
          retryable: false,
          statusCode: status,
        }
      default:
        return {
          code: 'unknown',
          message: `HTTP ${status}: ${body.slice(0, 200)}`,
          retryable: status >= 500,
          statusCode: status,
        }
    }
  }

  if (err instanceof TypeError && err.message.includes('fetch')) {
    return {
      code: 'network',
      message: 'Network error — check connectivity and CORS settings.',
      retryable: true,
    }
  }

  const msg = err instanceof Error ? err.message : String(err)
  return { code: 'unknown', message: msg, retryable: false }
}

function getRetryAfter(response: Response): string {
  const retryAfter = response.headers.get('Retry-After')
  if (retryAfter) return `Retry-After: ${retryAfter}s`
  return 'Back off before retrying.'
}

// ---------------------------------------------------------------------------
// CloudTransport
// ---------------------------------------------------------------------------

export class CloudTransport {
  private config: CloudProviderConfig
  private timeoutMs: number

  constructor(config: CloudProviderConfig, timeoutMs = 120_000) {
    assertFreeOnlyConfig(config)
    this.config = config
    this.timeoutMs = timeoutMs
  }

  /**
   * Update the active configuration (e.g., after settings save).
   */
  updateConfig(config: CloudProviderConfig): void {
    assertFreeOnlyConfig(config)
    this.config = config
  }

  /**
   * Sends a non-streaming chat completion and returns a structured AIResponse.
   */
  async complete(
    messages: ChatMessage[],
    options?: { signal?: AbortSignal; user?: string }
  ): Promise<AIResponse> {
    const start = Date.now()

    return withRetry(async () => {
      const response = await this.request(messages, { ...options, stream: false })
      const data = await response.json()

      if (!response.ok) {
        const err = new Error((data as { error?: { message?: string } })?.error?.message ?? 'Unknown error')
        Object.assign(err, { status: response.status })
        throw err
      }

      const completion = (data as { choices?: Array<{ message: { content: string }; finish_reason: string }> })
        .choices?.[0]

      return {
        text: completion?.message?.content ?? '',
        model: this.config.model,
        provider: this.config.provider,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        } : undefined,
        latencyMs: Date.now() - start,
        finishReason: normalizeFinishReason(completion?.finish_reason),
      }
    })
  }

  /**
   * Sends a streaming chat completion and yields chunks via ReadableStream.
   */
  stream(
    messages: ChatMessage[],
    options?: { signal?: AbortSignal; user?: string }
  ): ReadableStream<AIStreamChunk> {
    // Note: retries are not applied to streaming — partial responses cannot be recovered
    let controllerRef: ReadableStreamDefaultController<AIStreamChunk> | null = null
    let aborted = false

    const streamController = new ReadableStream<AIStreamChunk>({
      start(c) {
        controllerRef = c
      },
      cancel() {
        aborted = true
      },
    })

    // Fire the actual request (controllerRef is set synchronously by start())
    if (controllerRef) {
      this.executeStream(messages, options, controllerRef, () => aborted)
    }

    return streamController
  }

  private async executeStream(
    messages: ChatMessage[],
    options: { signal?: AbortSignal; user?: string } | undefined,
    controller: ReadableStreamDefaultController<AIStreamChunk>,
    isAborted: () => boolean
  ): Promise<void> {
    const start = Date.now()
    let latencyMs = 0

    try {
      const response = await this.request(messages, { ...options, stream: true })
      latencyMs = Date.now() - start

      if (!response.ok) {
        const body = await response.clone().text()
        const err = this.parseErrorResponse(response.status, body)
        controller.enqueue({ delta: '', finishReason: 'error', done: true })
        controller.error(err)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        controller.error(new Error('Response body is not readable'))
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        if (isAborted()) {
          reader.cancel()
          break
        }

        const { done, value } = await Promise.race([
          reader.read(),
          new Promise<{ done: boolean; value?: Uint8Array }>((_, reject) => {
            const t = setTimeout(() => reject(new Error('timeout')), this.timeoutMs)
            options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
          }),
        ]).catch(() => ({ done: true, value: undefined }))

        if (done || !value) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (isAborted()) break

          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]' || trimmed === '[DONE]') continue

          if (trimmed.startsWith('data: ')) {
            const json = trimmed.slice(6)
            try {
              const data = JSON.parse(json)
              const delta = data.choices?.[0]?.delta?.content ?? ''
              const finishReason = data.choices?.[0]?.finish_reason

              if (delta) {
                controller.enqueue({ delta, done: false })
              }

              if (finishReason && finishReason !== 'tool_calls') {
                controller.enqueue({
                  delta: '',
                  finishReason: normalizeFinishReason(finishReason),
                  done: true,
                })
                break
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }

      controller.enqueue({ delta: '', done: true })
      controller.close()
    } catch (err) {
      const aiError = normalizeError(err)
      controller.enqueue({ delta: '', finishReason: 'error', done: true })
      if (!isAborted()) {
        controller.error(aiError)
      }
    }
  }

  private async request(
    messages: ChatMessage[],
    options: { stream?: boolean; signal?: AbortSignal; user?: string }
  ): Promise<Response> {
    assertFreeOnlyConfig(this.config)
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OpenRouter is not configured on the server')
    const endpoint = resolveEndpoint(this.config)
    const body: ChatCompletionRequest = {
      model: OPENROUTER_FREE_MODEL,
      messages,
      stream: options.stream ?? false,
      max_tokens: this.config.maxTokens ?? 1200,
      ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
      ...(options.user ? { user: options.user } : {}),
      provider: { allow_fallbacks: false, data_collection: 'deny', max_price: { prompt: 0, completion: 0 } },
    }
    return fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.any([options.signal ?? new AbortController().signal, AbortSignal.timeout(this.timeoutMs)]),
      redirect: 'error',
    })
  }

  private parseErrorResponse(status: number, body: string): AIError {
    try {
      const json = JSON.parse(body)
      const message = json.error?.message ?? json.message ?? body.slice(0, 200)
      return normalizeError(Object.assign(new Error(message), { status }))
    } catch {
      return normalizeError(Object.assign(new Error(`HTTP ${status}`), { status }))
    }
  }

  /**
   * Checks server credentials with a read-only models catalogue request. It never
   * sends a completion during validation.
   */
  async validateCredentials(): Promise<{ valid: true; models: string[] } | { valid: false; error: string }> {
    try {
      assertFreeOnlyConfig(this.config)
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) return { valid: false, error: 'OpenRouter is not configured on the server' }
      const response = await fetch(`${resolveEndpoint(this.config)}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      })
      if (!response.ok) return { valid: false, error: `OpenRouter connection check failed (HTTP ${response.status})` }
      return { valid: true, models: [OPENROUTER_FREE_MODEL] }
    } catch (err) {
      const aiError = normalizeError(err)
      return { valid: false, error: aiError.message }
    }
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function normalizeFinishReason(
  reason: string | undefined
): AIResponse['finishReason'] {
  switch (reason) {
    case 'stop':
    case 'STOP':
      return 'stop'
    case 'length':
    case 'LENGTH':
    case 'max_tokens':
      return 'length'
    case 'content_filter':
    case 'CONTENT_FILTER':
      return 'content_filter'
    case 'cancelled':
    case 'CANCELLED':
      return 'cancelled'
    default:
      return 'error'
  }
}
