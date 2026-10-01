import 'server-only'
import net from 'node:net'
import type { MalwareScanner } from './types'
import { StorageUnavailableError } from './types'

export interface ClamAvConfig { host: string; port: number; timeoutMs?: number }

/** Sends bytes to a private, self-hosted clamd daemon using INSTREAM. No file data is logged or retained. */
export class ClamAvScanner implements MalwareScanner {
  constructor(private readonly config: ClamAvConfig, private readonly connect: (options: net.NetConnectOpts) => net.Socket = options => net.createConnection(options)) {
    if (!config.host || /[\s/]/.test(config.host)) throw new StorageUnavailableError('A valid private ClamAV host is required')
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new StorageUnavailableError('A valid ClamAV port is required')
  }

  async scan({ bytes }: { bytes: Buffer; filename: string; contentType: string }): Promise<{ clean: boolean; reason?: string }> {
    if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 100 * 1024 * 1024) throw new StorageUnavailableError('File size is outside the scanner limit')
    return new Promise((resolve, reject) => {
      const socket = this.connect({ host: this.config.host, port: this.config.port })
      const timeout = setTimeout(() => socket.destroy(new Error('timeout')), this.config.timeoutMs ?? 20_000)
      let response = ''
      let settled = false
      const finish = (error?: Error, result?: { clean: boolean; reason?: string }) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        socket.destroy()
        if (error) reject(new StorageUnavailableError(error.message === 'timeout' ? 'Malware scanning timed out; upload was rejected' : 'Malware scanner could not complete the scan'))
        else if (result) resolve(result)
        else reject(new StorageUnavailableError('Malware scanner returned no result; upload was rejected'))
      }
      socket.setNoDelay(true)
      socket.on('connect', () => {
        void (async () => {
          const write = async (chunk: Buffer) => {
            if (settled) return
            if (!socket.write(chunk)) await new Promise<void>(resolve => socket.once('drain', resolve))
          }
          await write(Buffer.from('zINSTREAM\0', 'utf8'))
          const chunkSize = 64 * 1024
          for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
            const length = Buffer.alloc(4)
            length.writeUInt32BE(chunk.length)
            await write(length)
            await write(chunk)
          }
          await write(Buffer.alloc(4))
        })().catch(error => finish(error instanceof Error ? error : new Error('scanner write failed')))
      })
      socket.on('data', chunk => {
        response += chunk.toString('utf8')
        if (response.length > 1024) return finish(new Error('invalid scanner response'))
        if (!response.includes('\0') && !response.endsWith('\n')) return
        const result = response.trim().replace(/\0$/, '')
        if (/^stream: OK$/.test(result)) return finish(undefined, { clean: true })
        const found = result.match(/^stream: (.+) FOUND$/)
        if (found) return finish(undefined, { clean: false, reason: 'MALWARE_DETECTED' })
        finish(new Error('invalid scanner response'))
      })
      socket.on('error', error => finish(error))
      socket.on('end', () => { if (!settled) finish() })
    })
  }
}

export function createClamAvScanner(env: NodeJS.ProcessEnv = process.env): ClamAvScanner | undefined {
  const host = env.RCRE_CLAMAV_HOST
  if (!host) return undefined
  const rawPort = env.RCRE_CLAMAV_PORT ?? '3310'
  const port = Number(rawPort)
  if (!/^\d{1,5}$/.test(rawPort)) throw new StorageUnavailableError('RCRE_CLAMAV_PORT must be a valid port')
  return new ClamAvScanner({ host, port })
}
