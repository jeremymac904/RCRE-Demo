import 'server-only'
import { googleConfig } from '@/lib/auth/google-oidc'

export type DependencyState = 'configured' | 'not_configured' | 'needs_verification' | 'disabled'
export interface DependencyCheck { state: DependencyState; note: string }

/** Reports only dependency state; never returns secret values or secret names. */
export function dependencyReadiness(source: NodeJS.ProcessEnv = process.env) {
  const localStorage = source.RCRE_OBJECT_STORAGE_PROVIDER === 'local' && source.NODE_ENV !== 'production'
  const objectStorageConfigured = Boolean(source.SUPABASE_URL && source.SUPABASE_SERVICE_ROLE_KEY && source.RCRE_STORAGE_BUCKET && source.RCRE_STORAGE_BUCKET_PRIVATE === 'true')
  const malwareScannerConfigured = Boolean(source.RCRE_CLAMAV_HOST && /^\d{1,5}$/.test(source.RCRE_CLAMAV_PORT ?? '3310') && Number(source.RCRE_CLAMAV_PORT ?? '3310') > 0 && Number(source.RCRE_CLAMAV_PORT ?? '3310') <= 65535)
  const storage = localStorage
    ? { state: 'configured' as const, note: 'Project-local development storage' }
    : objectStorageConfigured && malwareScannerConfigured
      ? { state: 'needs_verification' as const, note: 'Private object storage and ClamAV scanner are configured; verify upload and clean/infected scan paths' }
      : { state: 'not_configured' as const, note: objectStorageConfigured ? 'Production uploads remain disabled until a private ClamAV scanner endpoint is configured' : 'Private object storage is required for production uploads' }
  const mail = source.RESEND_API_KEY
    ? { state: 'needs_verification' as const, note: 'Delivery provider is configured; deliverability has not been tested' }
    : { state: 'not_configured' as const, note: 'Invitation and notification email will remain queued' }
  return {
    core: {
      database: source.DATABASE_URL ? { state: 'needs_verification' as const, note: 'Database URL configured; live readiness probe required' } : { state: 'not_configured' as const, note: 'PostgreSQL is required for durable brokerage state' },
      sessions: source.RCRE_SESSION_SECRET && source.RCRE_SESSION_SECRET.length >= 32
        ? { state: 'configured' as const, note: 'Session signing key meets the minimum length' }
        : { state: 'not_configured' as const, note: 'A private session signing key of at least 32 characters is required' },
      authentication: googleConfig(source)
        ? { state: 'needs_verification' as const, note: 'Google OIDC configuration is present; real authorization is unverified' }
        : { state: 'not_configured' as const, note: 'Google Sign In configuration is required for production access' },
      storage,
    },
    optional: {
      email: mail,
      malwareScanning: malwareScannerConfigured ? { state: 'needs_verification' as const, note: 'Private ClamAV endpoint configured; clean and infected test files must be verified' } : { state: 'not_configured' as const, note: 'No malware scanner endpoint is configured; production uploads fail closed' },
      openRouterFree: source.OPENROUTER_API_KEY
        ? { state: 'needs_verification' as const, note: 'Free-only server route can be smoke-tested; no model is selected from environment' }
        : { state: 'not_configured' as const, note: 'Deterministic local assistant remains available' },
      googleWorkspace: source.RCRE_GOOGLE_WORKSPACE_ENABLED === 'true'
        ? { state: 'needs_verification' as const, note: 'Per-user OAuth/API scopes need live consent verification' }
        : { state: 'disabled' as const, note: 'Optional Gmail, Calendar, and Drive connections are not enabled' },
      followUpBoss: source.FUB_API_KEY
        ? { state: 'needs_verification' as const, note: 'Read-only credentials are present; account capability must be verified separately' }
        : { state: 'disabled' as const, note: 'CRM does not require Follow Up Boss' },
      mls: { state: 'disabled' as const, note: 'Provider activation requires approved agreements and credentials' },
      errorMonitoring: source.SENTRY_DSN
        ? { state: 'needs_verification' as const, note: 'Error monitoring is configured; event delivery is unverified' }
        : { state: 'not_configured' as const, note: 'External error monitoring is optional and not connected' },
    },
  }
}

export function coreReadinessConfigured(value: ReturnType<typeof dependencyReadiness>): boolean {
  return Object.values(value.core).every(item => item.state === 'configured' || item.state === 'needs_verification')
}
