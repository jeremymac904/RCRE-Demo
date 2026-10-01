import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { EncryptedMailPayload } from './persistence'

const AAD = Buffer.from('rcre-auth-mail:v1', 'utf8')

function keyFromEnv(): Buffer {
  const raw = process.env.RCRE_MAIL_OUTBOX_KEY
  if (!raw) throw new Error('RCRE_MAIL_OUTBOX_KEY is required to queue production mail')
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) throw new Error('RCRE_MAIL_OUTBOX_KEY must be a 32-byte base64url value')
  let key: Buffer
  try { key = Buffer.from(raw, 'base64url') } catch { throw new Error('RCRE_MAIL_OUTBOX_KEY must be base64url encoded') }
  if (key.length !== 32) throw new Error('RCRE_MAIL_OUTBOX_KEY must decode to 32 bytes')
  return key
}

export interface MailMessage { to: string; subject: string; text: string; html?: string; idempotencyKey: string }
export interface MailTransport { send(message: MailMessage): Promise<{ providerMessageId: string }> }

/** Encrypt bearer links before they enter the durable outbox. */
export function encryptMailPayload(value: MailMessage): EncryptedMailPayload {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFromEnv(), nonce)
  cipher.setAAD(AAD)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return { ciphertext, nonce, tag: cipher.getAuthTag() }
}

export function decryptMailPayload(value: EncryptedMailPayload): MailMessage {
  const decipher = createDecipheriv('aes-256-gcm', keyFromEnv(), value.nonce)
  decipher.setAAD(AAD)
  decipher.setAuthTag(value.tag)
  return JSON.parse(Buffer.concat([decipher.update(value.ciphertext), decipher.final()]).toString('utf8')) as MailMessage
}

/** Test/local capture only: does not send, persist, or log token-bearing mail. */
export class DevelopmentMailCapture implements MailTransport {
  readonly messages: MailMessage[] = []
  async send(message: MailMessage) {
    this.messages.push(structuredClone(message))
    return { providerMessageId: `local-capture-${this.messages.length}` }
  }
}

export class ResendMailTransport implements MailTransport {
  constructor(private readonly apiKey: string, private readonly from: string, private readonly fetcher: typeof fetch = fetch) {}
  async send(message: MailMessage) {
    const response = await this.fetcher('https://api.resend.com/emails', {
      method: 'POST', redirect: 'error', cache: 'no-store',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json', 'idempotency-key': message.idempotencyKey },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new MailDeliveryError(`provider_${response.status}`)
    const result = await response.json() as { id?: string }
    if (!result.id) throw new MailDeliveryError('provider_missing_receipt')
    return { providerMessageId: result.id }
  }
}

export class MailDeliveryError extends Error { constructor(readonly code: string) { super(code); this.name = 'MailDeliveryError' } }

export function configuredMailTransport(): MailTransport | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RCRE_MAIL_FROM
  if (!apiKey || !from) return null
  return new ResendMailTransport(apiKey, from)
}
