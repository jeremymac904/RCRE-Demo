import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { createObjectDriver, type ObjectDriver } from './drivers'
import { createClamAvScanner } from './clamav'
import {
  StorageAuthorizationError, StorageError, StorageUnavailableError,
  type MalwareScanner, type StorageAction, type StorageAsset, type StorageAuthorization,
  type StorageCategory, type StorageUpload, type StorageVisibility,
} from './types'
export * from './types'
export { LocalObjectDriver, SupabaseObjectDriver, verifyLocalSignature, localAssetForSignedId } from './drivers'
export { ClamAvScanner, createClamAvScanner } from './clamav'

const maxBytes: Record<StorageCategory, number> = {
  'agent-headshot': 8 * 1024 * 1024,
  'transaction-document': 15 * 1024 * 1024,
  'training-resource': 100 * 1024 * 1024,
  'community-attachment': 25 * 1024 * 1024,
  'marketing-asset': 20 * 1024 * 1024,
  'knowledge-file': 20 * 1024 * 1024,
}
const mimeByCategory: Record<StorageCategory, Set<string>> = {
  'agent-headshot': new Set(['image/jpeg', 'image/png', 'image/webp']),
  'transaction-document': new Set(['application/pdf', 'text/plain']),
  'training-resource': new Set(['application/pdf', 'text/plain', 'text/vtt', 'image/jpeg', 'image/png', 'video/mp4']),
  'community-attachment': new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  'marketing-asset': new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']),
  'knowledge-file': new Set(['application/pdf', 'text/plain']),
}

function validMagic(type: string, bytes: Buffer): boolean {
  if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (type === 'image/webp') return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (type === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-'
  if (type === 'video/mp4') return bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp'
  if (type === 'text/vtt') return bytes.subarray(0, 6).toString() === 'WEBVTT'
  if (type === 'text/plain') return !bytes.includes(0)
  return false
}
const storageCategories = new Set<StorageCategory>(['agent-headshot', 'transaction-document', 'training-resource', 'community-attachment', 'marketing-asset', 'knowledge-file'])

function safeFilename(value: string): string {
  const name = value.normalize('NFKC').replace(/[\\/\r\n\x00-\x1f\x7f]/g, '_').trim().slice(0, 180)
  if (!name || name === '.' || name === '..') throw new StorageError('A valid file name is required')
  return name
}

function validManifest(value: unknown, provider: ObjectDriver['name']): value is StorageAsset {
  if (!value || typeof value !== 'object') return false
  const asset = value as Partial<StorageAsset>
  if (typeof asset.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(asset.id)) return false
  if (typeof asset.organizationId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(asset.organizationId)) return false
  if (typeof asset.ownerId !== 'string' || !asset.ownerId || asset.ownerId.length > 200) return false
  if (!asset.category || !storageCategories.has(asset.category)) return false
  if (asset.visibility !== 'private' && asset.visibility !== 'public') return false
  if (typeof asset.filename !== 'string' || !asset.filename) return false
  try { if (safeFilename(asset.filename) !== asset.filename) return false } catch { return false }
  if (typeof asset.contentType !== 'string' || !mimeByCategory[asset.category].has(asset.contentType)) return false
  if (!Number.isSafeInteger(asset.size) || (asset.size ?? 0) < 1 || (asset.size ?? Infinity) > maxBytes[asset.category]) return false
  if (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256)) return false
  if (typeof asset.createdAt !== 'string' || !Number.isFinite(Date.parse(asset.createdAt))) return false
  return asset.provider === provider
}

export class StorageService {
  constructor(
    private readonly driver: ObjectDriver,
    private readonly authorization: StorageAuthorization,
    private readonly scanner?: MalwareScanner,
    private readonly production = process.env.NODE_ENV === 'production',
  ) {}

  private async authorize(actor: StorageUpload['actor'], action: StorageAction, asset: StorageAsset): Promise<void> {
    if (!actor || typeof actor.id !== 'string' || !actor.id || typeof actor.organizationId !== 'string' || !actor.organizationId || typeof actor.role !== 'string' || !actor.role) throw new StorageAuthorizationError()
    // Tenant membership is a storage invariant, not merely a policy callback
    // convention. This prevents an overly broad caller policy from turning a
    // valid identity into cross-organization file access.
    if (actor.organizationId !== asset.organizationId) throw new StorageAuthorizationError()
    if (!await this.authorization.authorize(actor, action, asset)) throw new StorageAuthorizationError()
  }

  async upload(input: StorageUpload): Promise<StorageAsset> {
    if (!input?.actor || !input.actor.id || !input.actor.organizationId || !input.actor.role) throw new StorageAuthorizationError()
    if (!input.category || !storageCategories.has(input.category)) throw new StorageError('Unsupported file category')
    if (input.visibility !== undefined && input.visibility !== 'private' && input.visibility !== 'public') throw new StorageError('Unsupported file visibility')
    if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1) throw new StorageError('File must not be empty')
    if (input.bytes.length > maxBytes[input.category]) throw new StorageError(`File exceeds the ${Math.floor(maxBytes[input.category] / 1024 / 1024)} MB limit`)
    if (!mimeByCategory[input.category]?.has(input.contentType) || !validMagic(input.contentType, input.bytes)) throw new StorageError('File type or content does not match an allowed format')
    const filename = safeFilename(input.filename)
    const asset: StorageAsset = {
      id: randomUUID(), organizationId: input.actor.organizationId, ownerId: input.actor.id,
      category: input.category, visibility: input.visibility ?? 'private', filename,
      contentType: input.contentType, size: input.bytes.length,
      sha256: createHash('sha256').update(input.bytes).digest('hex'),
      createdAt: new Date().toISOString(), provider: this.driver.name,
    }
    await this.authorize(input.actor, 'upload', asset)
    if (this.production && !this.scanner) throw new StorageUnavailableError('Production uploads are disabled until a malware scanner is configured')
    if (this.scanner) {
      let result: { clean: boolean; reason?: string }
      try { result = await this.scanner.scan({ bytes: input.bytes, filename, contentType: input.contentType }) }
      catch { throw new StorageUnavailableError('Malware scan could not be completed; upload was rejected') }
      if (!result.clean) throw new StorageError('File was rejected by the malware scanner', 422, 'MALWARE_DETECTED')
    }
    await this.driver.put(asset, input.bytes)
    try {
      await input.persistMetadata?.(asset)
    } catch (error) {
      await this.driver.delete(asset).catch(() => undefined)
      throw error
    }
    return asset
  }

  async metadata(actor: StorageUpload['actor'], id: string): Promise<StorageAsset> {
    const asset = await this.driver.getMetadata(id)
    if (!asset) throw new StorageError('File not found', 404, 'STORAGE_NOT_FOUND')
    if (asset.id !== id || !validManifest(asset, this.driver.name)) throw new StorageUnavailableError('Stored file manifest is invalid')
    await this.authorize(actor, 'download', asset)
    return asset
  }

  async download(actor: StorageUpload['actor'], id: string): Promise<{ asset: StorageAsset; bytes: Buffer }> {
    const asset = await this.metadata(actor, id)
    const bytes = await this.driver.get(asset)
    if (bytes.length !== asset.size || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new StorageUnavailableError('Stored file integrity check failed')
    return { asset, bytes }
  }

  async signedUrl(actor: StorageUpload['actor'], id: string, ttlSeconds = 300): Promise<{ asset: StorageAsset; url: string; expiresAt: number }> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 900) throw new StorageError('Signed URL lifetime must be between 1 and 900 seconds')
    const asset = await this.metadata(actor, id)
    await this.authorize(actor, 'sign', asset)
    const expiresAt = Date.now() + ttlSeconds * 1000
    return { asset, url: await this.driver.sign(asset, expiresAt), expiresAt }
  }

  async delete(actor: StorageUpload['actor'], id: string): Promise<void> {
    const asset = await this.driver.getMetadata(id)
    if (!asset) return
    await this.authorize(actor, 'delete', asset)
    await this.driver.delete(asset)
  }
}

export function createStorageService(authorization: StorageAuthorization, scanner?: MalwareScanner, driver?: ObjectDriver): StorageService {
  return new StorageService(driver ?? createObjectDriver(), authorization, scanner ?? createClamAvScanner())
}
