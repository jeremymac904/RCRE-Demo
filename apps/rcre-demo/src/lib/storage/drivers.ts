import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { StorageUnavailableError, type StorageAsset } from './types'

export interface ObjectDriver {
  readonly name: 'local' | 'supabase'
  put(asset: StorageAsset, bytes: Buffer): Promise<void>
  get(asset: StorageAsset): Promise<Buffer>
  getMetadata(id: string): Promise<StorageAsset | null>
  delete(asset: StorageAsset): Promise<void>
  sign(asset: StorageAsset, expiresAt: number): Promise<string>
}

const metadataJSON = (asset: StorageAsset) => Buffer.from(JSON.stringify(asset), 'utf8')
const validCategory = (value: string) => ['agent-headshot', 'transaction-document', 'training-resource', 'community-attachment', 'marketing-asset', 'knowledge-file'].includes(value)
const objectPath = (asset: StorageAsset) => {
  if (!validCategory(asset.category) || !/^[a-f0-9-]{36}$/i.test(asset.id)) throw new StorageUnavailableError('Invalid storage object identity')
  return `${segment(asset.organizationId)}/${asset.category}/${asset.id}`
}
const metadataPath = (asset: StorageAsset) => `.rcre-metadata/${asset.id}.json`
function segment(value: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error('Invalid storage path segment')
  return value
}

function localRoot(): string {
  const root = path.resolve(process.cwd(), '../..')
  if (!['RCRE', 'RCRE-Demo'].includes(path.basename(root))) throw new StorageUnavailableError('Local storage must be contained in the RCRE project')
  return path.join(root, 'runtime', 'object-storage')
}

/** Filesystem driver is restricted to <RCRE>/runtime/object-storage. */
export class LocalObjectDriver implements ObjectDriver {
  readonly name = 'local' as const
  private root = localRoot()

  private blob(asset: StorageAsset): string { return path.join(this.root, 'objects', objectPath(asset)) }
  private manifest(asset: StorageAsset): string { return path.join(this.root, 'metadata', `${asset.id}.json`) }

  async put(asset: StorageAsset, bytes: Buffer): Promise<void> {
    const blob = this.blob(asset)
    const manifest = this.manifest(asset)
    await mkdir(path.dirname(blob), { recursive: true, mode: 0o700 })
    await mkdir(path.dirname(manifest), { recursive: true, mode: 0o700 })
    await writeFile(blob, bytes, { flag: 'wx', mode: 0o600 })
    try {
      await writeFile(manifest, metadataJSON(asset), { flag: 'wx', mode: 0o600 })
    } catch (error) {
      await rm(blob, { force: true })
      throw error
    }
  }

  async get(asset: StorageAsset): Promise<Buffer> {
    const stored = await this.getMetadata(asset.id)
    if (!stored) throw new StorageUnavailableError('Stored file metadata was not found')
    if (stored.id !== asset.id || stored.organizationId !== asset.organizationId) throw new StorageUnavailableError('Stored file metadata did not match the requested file')
    return readFile(this.blob(asset))
  }

  async getMetadata(id: string): Promise<StorageAsset | null> {
    if (!/^[a-f0-9-]{36}$/i.test(id)) return null
    try { return JSON.parse(await readFile(path.join(this.root, 'metadata', `${id}.json`), 'utf8')) as StorageAsset }
    catch { return null }
  }

  async delete(asset: StorageAsset): Promise<void> {
    await rm(this.blob(asset), { force: true })
    await rm(this.manifest(asset), { force: true })
  }

  async sign(asset: StorageAsset, expiresAt: number): Promise<string> {
    const secret = process.env.RCRE_STORAGE_SIGNING_SECRET
    if (!secret || secret.length < 32) throw new StorageUnavailableError('A storage signing secret of at least 32 characters is required')
    const payload = `${asset.id}.${expiresAt}`
    const signature = createHmac('sha256', secret).update(payload).digest('base64url')
    return `/api/storage/local/${encodeURIComponent(asset.id)}?expires=${expiresAt}&signature=${encodeURIComponent(signature)}`
  }
}

export function verifyLocalSignature(id: string, expiresAt: number, signature: string, now = Date.now()): boolean {
  const secret = process.env.RCRE_STORAGE_SIGNING_SECRET
  if (!secret || secret.length < 32 || !Number.isSafeInteger(expiresAt) || expiresAt <= now) return false
  const payload = `${id}.${expiresAt}`
  const expected = createHmac('sha256', secret).update(payload).digest()
  let actual: Buffer
  try { actual = Buffer.from(signature, 'base64url') } catch { return false }
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function localAssetForSignedId(id: string): Promise<StorageAsset | null> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null
  try {
    const raw = await readFile(path.join(localRoot(), 'metadata', `${id}.json`), 'utf8')
    const asset = JSON.parse(raw) as StorageAsset
    return asset.id === id && asset.provider === 'local' ? asset : null
  } catch { return null }
}

export class SupabaseObjectDriver implements ObjectDriver {
  readonly name = 'supabase' as const
  private url: string
  private key: string
  private bucket: string

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const url = env.SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    const bucket = env.RCRE_STORAGE_BUCKET
    if (!url || !key || !bucket) throw new StorageUnavailableError('Supabase Storage URL, server key, and bucket are required')
    this.url = url.replace(/\/$/, '')
    this.key = key
    this.bucket = segment(bucket)
    if (env.RCRE_STORAGE_BUCKET_PRIVATE !== 'true') throw new StorageUnavailableError('The configured Supabase Storage bucket must be confirmed private')
    if (!/^https:\/\//.test(this.url) && process.env.NODE_ENV === 'production') throw new StorageUnavailableError('Production Supabase Storage requires HTTPS')
  }

  private endpoint(pathname: string): string { return `${this.url}/storage/v1/${pathname}` }
  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { authorization: `Bearer ${this.key}`, apikey: this.key, ...extra }
  }

  async put(asset: StorageAsset, bytes: Buffer): Promise<void> {
    const pathName = encodeURIComponent(objectPath(asset)).replace(/%2F/g, '/')
    const response = await fetch(this.endpoint(`object/${encodeURIComponent(this.bucket)}/${pathName}`), {
      method: 'POST', headers: this.headers({ 'content-type': asset.contentType, 'x-upsert': 'false', 'cache-control': 'private, max-age=0' }), body: new Uint8Array(bytes),
    })
    if (!response.ok) throw new StorageUnavailableError(`Supabase Storage upload failed (${response.status})`)
    const metaPath = encodeURIComponent(metadataPath(asset)).replace(/%2F/g, '/')
    const manifest = await fetch(this.endpoint(`object/${encodeURIComponent(this.bucket)}/${metaPath}`), {
      method: 'POST', headers: this.headers({ 'content-type': 'application/json', 'x-upsert': 'false', 'cache-control': 'private, max-age=0' }), body: new Uint8Array(metadataJSON(asset)),
    })
    if (!manifest.ok) {
      await this.deleteObject(pathName)
      throw new StorageUnavailableError(`Supabase Storage metadata write failed (${manifest.status})`)
    }
  }

  private async deleteObject(pathName: string): Promise<void> {
    await fetch(this.endpoint(`object/${encodeURIComponent(this.bucket)}/${pathName}`), { method: 'DELETE', headers: this.headers() })
  }

  async get(asset: StorageAsset): Promise<Buffer> {
    const pathName = encodeURIComponent(objectPath(asset)).replace(/%2F/g, '/')
    const response = await fetch(this.endpoint(`object/${encodeURIComponent(this.bucket)}/${pathName}`), { headers: this.headers(), cache: 'no-store' })
    if (!response.ok) throw new StorageUnavailableError(`Supabase Storage download failed (${response.status})`)
    return Buffer.from(await response.arrayBuffer())
  }

  async getMetadata(id: string): Promise<StorageAsset | null> {
    if (!/^[a-f0-9-]{36}$/i.test(id)) return null
    const pathName = encodeURIComponent(`.rcre-metadata/${id}.json`).replace(/%2F/g, '/')
    const response = await fetch(this.endpoint(`object/${encodeURIComponent(this.bucket)}/${pathName}`), { headers: this.headers(), cache: 'no-store' })
    if (response.status === 404) return null
    if (!response.ok) throw new StorageUnavailableError(`Supabase Storage metadata read failed (${response.status})`)
    try { return await response.json() as StorageAsset } catch { throw new StorageUnavailableError('Supabase Storage metadata is invalid') }
  }

  async delete(asset: StorageAsset): Promise<void> {
    const pathName = encodeURIComponent(objectPath(asset)).replace(/%2F/g, '/')
    const metaPath = encodeURIComponent(metadataPath(asset)).replace(/%2F/g, '/')
    await this.deleteObject(pathName)
    const response = await fetch(this.endpoint(`object/${encodeURIComponent(this.bucket)}/${metaPath}`), { method: 'DELETE', headers: this.headers() })
    if (!response.ok && response.status !== 404) throw new StorageUnavailableError(`Supabase Storage metadata deletion failed (${response.status})`)
  }

  async sign(asset: StorageAsset, expiresAt: number): Promise<string> {
    const pathName = objectPath(asset)
    const response = await fetch(this.endpoint(`object/sign/${encodeURIComponent(this.bucket)}/${pathName.split('/').map(encodeURIComponent).join('/')}`), {
      method: 'POST', headers: this.headers({ 'content-type': 'application/json' }), body: JSON.stringify({ expiresIn: Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)) }),
    })
    if (!response.ok) throw new StorageUnavailableError(`Supabase signed URL request failed (${response.status})`)
    const body = await response.json() as { signedURL?: string }
    if (!body.signedURL) throw new StorageUnavailableError('Supabase did not return a signed URL')
    const signed = new URL(body.signedURL, this.url)
    if (signed.origin !== new URL(this.url).origin) throw new StorageUnavailableError('Supabase returned a signed URL for an unexpected host')
    return signed.toString()
  }
}

export function createObjectDriver(env: NodeJS.ProcessEnv = process.env): ObjectDriver {
  const provider = env.RCRE_OBJECT_STORAGE_PROVIDER ?? (env.NODE_ENV === 'production' ? 'supabase' : 'local')
  if (provider === 'local') {
    if (env.NODE_ENV === 'production') throw new StorageUnavailableError('Local object storage is disabled in production')
    return new LocalObjectDriver()
  }
  if (provider === 'supabase') return new SupabaseObjectDriver(env)
  throw new StorageUnavailableError('RCRE_OBJECT_STORAGE_PROVIDER must be local or supabase')
}
