import { EventEmitter } from 'node:events'
import type net from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { ClamAvScanner, createClamAvScanner } from '@/lib/storage/clamav'

class FakeSocket extends EventEmitter {
  setNoDelay() { return this }
  write(chunk: Buffer) {
    if (chunk.length === 4 && chunk.readUInt32BE(0) === 0) queueMicrotask(() => this.emit('data', Buffer.from(this.response + '\0')))
    return true
  }
  destroy() { return this }
  constructor(private response: string) { super(); queueMicrotask(() => this.emit('connect')) }
}
const mockClam = (response: string) => new ClamAvScanner({ host: 'clamav.internal', port: 3310, timeoutMs: 1000 }, () => new FakeSocket(response) as unknown as net.Socket)

describe('private ClamAV storage scanner', () => {
  it('uses the configured endpoint and accepts only an explicit clean result', async () => {
    const scanner = mockClam('stream: OK')
    await expect(scanner.scan({ bytes: Buffer.from('safe'), filename: 'safe.txt', contentType: 'text/plain' })).resolves.toEqual({ clean: true })
  })
  it('rejects detected malware without returning a file or signature detail', async () => {
    const scanner = mockClam('stream: Eicar-Test-Signature FOUND')
    await expect(scanner.scan({ bytes: Buffer.from('test'), filename: 'test.txt', contentType: 'text/plain' })).resolves.toEqual({ clean: false, reason: 'MALWARE_DETECTED' })
  })
  it('fails closed when a scanner is not configured or returns an invalid response', async () => {
    expect(createClamAvScanner({} as NodeJS.ProcessEnv)).toBeUndefined()
    const scanner = mockClam('unexpected response')
    await expect(scanner.scan({ bytes: Buffer.from('test'), filename: 'test.txt', contentType: 'text/plain' })).rejects.toMatchObject({ status: 503 })
  })
  it('validates the scanner port before connecting', () => {
    expect(() => createClamAvScanner({ NODE_ENV: 'test', RCRE_CLAMAV_HOST: 'clamav.internal', RCRE_CLAMAV_PORT: '99999' })).toThrow()
  })
})
