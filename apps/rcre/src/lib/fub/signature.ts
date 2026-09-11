// FUB webhook signature verification.
//
// Verified from https://docs.followupboss.com/reference/webhooks-guide (2026-08-19):
//   "we pass along a FUB-Signature header ... base64 encode the JSON payload
//    you received from the request (non-prettified), then produce a SHA256 hash
//    with this base64 encoded value and your X-System-Key"
//
// Reference implementation given in the docs (PHP):
//   hash_hmac('sha256', base64_encode($context), YOUR_X_SYSTEM_KEY)
//
// Note the unusual construction: the RAW BODY is base64-encoded FIRST, then
// that base64 string is the HMAC message. Do not HMAC the raw body directly.
import { createHmac, timingSafeEqual } from 'node:crypto'

export function computeFubSignature(rawBody: string, systemKey: string): string {
  const b64 = Buffer.from(rawBody, 'utf8').toString('base64')
  return createHmac('sha256', systemKey).update(b64).digest('hex')
}

/** Constant-time comparison. Returns false on any length/format mismatch. */
export function verifyFubSignature(
  rawBody: string,
  signature: string | null | undefined,
  systemKey: string | undefined,
): boolean {
  if (!signature || !systemKey) return false
  const expected = computeFubSignature(rawBody, systemKey)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
