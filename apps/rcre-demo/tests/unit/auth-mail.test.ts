import { afterEach, describe, expect, it } from 'vitest'
import { decryptMailPayload, DevelopmentMailCapture, encryptMailPayload } from '@/lib/auth/mail'

afterEach(() => { delete process.env.RCRE_MAIL_OUTBOX_KEY })

describe('invitation mail outbox payload protection', () => {
  it('encrypts bearer invitation links before durable outbox storage', () => {
    process.env.RCRE_MAIL_OUTBOX_KEY = Buffer.alloc(32, 7).toString('base64url')
    const message = { to: 'agent@example.com', subject: 'RCRE invitation', text: 'https://rcre.example/access/private-token', idempotencyKey: 'invite:1' }
    const encrypted = encryptMailPayload(message)
    expect(encrypted.ciphertext.toString('utf8')).not.toContain('private-token')
    expect(decryptMailPayload(encrypted)).toEqual(message)
  })

  it('refuses to encrypt if a production outbox key is absent or malformed', () => {
    expect(() => encryptMailPayload({ to: 'agent@example.com', subject: 'x', text: 'x', idempotencyKey: 'x' })).toThrow('RCRE_MAIL_OUTBOX_KEY')
    process.env.RCRE_MAIL_OUTBOX_KEY = Buffer.alloc(16).toString('base64url')
    expect(() => encryptMailPayload({ to: 'agent@example.com', subject: 'x', text: 'x', idempotencyKey: 'x' })).toThrow('32-byte')
  })

  it('captures mail only in local memory and does not claim provider delivery', async () => {
    const capture = new DevelopmentMailCapture()
    const accepted = await capture.send({ to: 'agent@example.com', subject: 'test', text: 'captured', idempotencyKey: 'local-1' })
    expect(accepted.providerMessageId).toBe('local-capture-1')
    expect(capture.messages).toHaveLength(1)
  })
})
