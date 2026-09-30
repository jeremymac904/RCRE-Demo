import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { EncryptedSecret } from './types'

function encryptionKey(): Buffer {
  const raw = process.env.RCRE_GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) throw new Error('Google token encryption is not configured')
  const key = Buffer.from(raw, 'base64url')
  if (key.length !== 32) throw new Error('Google token encryption key is invalid')
  return key
}

export function encryptRefreshToken(token: string): EncryptedSecret {
  if (!token || token.length > 8192) throw new Error('Google refresh token is invalid')
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce)
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return { ciphertext: ciphertext.toString('base64url'), nonce: nonce.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') }
}

export function decryptRefreshToken(encrypted: EncryptedSecret): string {
  try {
    const nonce = Buffer.from(encrypted.nonce, 'base64url')
    const tag = Buffer.from(encrypted.tag, 'base64url')
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64url')
    if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length < 1 || ciphertext.length > 8192) throw new Error('Invalid ciphertext')
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), nonce)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch { throw new Error('Google authorization must be reconnected') }
}
