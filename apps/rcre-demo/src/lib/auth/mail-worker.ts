import 'server-only'
import { getAuthPersistence } from './persistence'
import { configuredMailTransport, decryptMailPayload, MailDeliveryError } from './mail'

/** Process a bounded batch. The worker is a separate authorized job; enqueueing never implies delivery. */
export async function processAuthMailBatch(limit = 20) {
  const transport = configuredMailTransport()
  if (!transport) return { processed: 0, state: 'waiting_for_mail_configuration' as const }
  const persistence = await getAuthPersistence()
  const messages = await persistence.claimMail(limit)
  let sent = 0, retried = 0, failed = 0
  for (const row of messages) {
    try {
      const message = decryptMailPayload({ ciphertext: row.ciphertext, nonce: row.nonce, tag: row.tag })
      const result = await transport.send(message)
      await persistence.finishMail(row.id, { success: true, providerMessageId: result.providerMessageId })
      sent++
    } catch (error) {
      const attempt = Math.max(1, row.attemptCount)
      const retryAt = new Date(Date.now() + Math.min(6 * 60 * 60_000, 30_000 * (2 ** (attempt - 1))))
      const errorCode = error instanceof MailDeliveryError ? error.code : error instanceof Error && error.message.startsWith('RCRE_MAIL_OUTBOX_KEY') ? 'outbox_key_unavailable' : 'delivery_error'
      await persistence.finishMail(row.id, { success: false, errorCode, retryAt })
      if (attempt >= 5) failed++
      else retried++
    }
  }
  return { processed: messages.length, sent, retried, failed, state: 'processed' as const }
}
