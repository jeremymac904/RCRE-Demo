export type StorageVisibility = 'private' | 'public'
export type StorageCategory = 'agent-headshot' | 'transaction-document' | 'training-resource' | 'community-attachment' | 'marketing-asset' | 'knowledge-file'
export type StorageAction = 'upload' | 'download' | 'delete' | 'sign'

export interface StorageActor {
  id: string
  organizationId: string
  role: string
}

export interface StorageAsset {
  id: string
  organizationId: string
  ownerId: string
  category: StorageCategory
  visibility: StorageVisibility
  filename: string
  contentType: string
  size: number
  sha256: string
  createdAt: string
  provider: 'local' | 'supabase'
}

export interface StorageUpload {
  actor: StorageActor
  category: StorageCategory
  visibility?: StorageVisibility
  filename: string
  contentType: string
  bytes: Buffer
  /** Server-side metadata commit; storage deletes the just-written blob if it fails. */
  persistMetadata?: (asset: StorageAsset) => Promise<void>
}

export interface StorageAuthorization {
  authorize(actor: StorageActor, action: StorageAction, asset: StorageAsset): boolean | Promise<boolean>
}

export interface MalwareScanner {
  scan(input: { bytes: Buffer; filename: string; contentType: string }): Promise<{ clean: boolean; reason?: string }>
}

export class StorageError extends Error {
  constructor(message: string, readonly status = 400, readonly code = 'STORAGE_ERROR') {
    super(message)
    this.name = 'StorageError'
  }
}

export class StorageUnavailableError extends StorageError {
  constructor(message = 'File storage is not configured') {
    super(message, 503, 'STORAGE_UNAVAILABLE')
    this.name = 'StorageUnavailableError'
  }
}

export class StorageAuthorizationError extends StorageError {
  constructor() {
    super('File access denied', 403, 'STORAGE_FORBIDDEN')
    this.name = 'StorageAuthorizationError'
  }
}
