import { describe, expect, it } from 'vitest'
import { coreReadinessConfigured, dependencyReadiness } from '@/lib/operations/readiness'

const complete = {
  NODE_ENV: 'production', DATABASE_URL: 'postgres://db.example/rcre', RCRE_SESSION_SECRET: 'x'.repeat(48),
  GOOGLE_CLIENT_ID: 'client.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REDIRECT_URI: 'https://rcre.example/api/auth/google/callback',
  SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret',
  RCRE_STORAGE_BUCKET: 'rcre-private', RCRE_STORAGE_BUCKET_PRIVATE: 'true', RCRE_CLAMAV_HOST: 'clamav.internal', RCRE_CLAMAV_PORT: '3310',
} as const satisfies NodeJS.ProcessEnv

describe('production dependency contract', () => {
  it('requires all core services without exposing secret values', () => {
    const status = dependencyReadiness(complete)
    expect(coreReadinessConfigured(status)).toBe(true)
    expect(JSON.stringify(status)).not.toContain('secret')
    expect(status.core.database.state).toBe('needs_verification')
    expect(status.core.authentication.state).toBe('needs_verification')
    expect(status.core.storage.state).toBe('needs_verification')
    expect(status.optional.malwareScanning.state).toBe('needs_verification')
  })

  it('fails closed when any core dependency is absent or malformed', () => {
    for (const env of [
      { ...complete, DATABASE_URL: '' },
      { ...complete, RCRE_SESSION_SECRET: 'short' },
      { ...complete, GOOGLE_REDIRECT_URI: 'http://rcre.example/api/auth/google/callback' },
      { ...complete, RCRE_STORAGE_BUCKET_PRIVATE: 'false' },
      { ...complete, RCRE_CLAMAV_HOST: '' },
    ]) expect(coreReadinessConfigured(dependencyReadiness(env))).toBe(false)
  })

  it('keeps optional services independently disabled instead of blocking core setup', () => {
    const status = dependencyReadiness(complete)
    expect(status.optional.followUpBoss.state).toBe('disabled')
    expect(status.optional.googleWorkspace.state).toBe('disabled')
    expect(status.optional.mls.state).toBe('disabled')
    expect(coreReadinessConfigured(status)).toBe(true)
  })
})
