import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const instrumentedRoutes = [
  ['auth/google/callback/route.ts', '/api/auth/google/callback'],
  ['auth/invitations/start/route.ts', '/api/auth/invitations/start'],
  ['auth/session/rotate/route.ts', '/api/auth/session/rotate'],
  ['integrations/google/callback/route.ts', '/api/integrations/google/callback'],
  ['integrations/google/connect/route.ts', '/api/integrations/google/connect'],
  ['integrations/google/disconnect/route.ts', '/api/integrations/google/disconnect'],
  ['integrations/google/route.ts', '/api/integrations/google'],
  ['integrations/google/drive/files/[id]/route.ts', '/api/integrations/google/drive/files/[id]'],
  ['integrations/google/gmail/messages/[id]/route.ts', '/api/integrations/google/gmail/messages/[id]'],
  ['academy/manage/route.ts', '/api/academy/manage'],
  ['academy/progress/route.ts', '/api/academy/progress'],
  ['academy/uploads/route.ts', '/api/academy/uploads'],
  ['academy/uploads/[id]/route.ts', '/api/academy/uploads/[id]'],
  ['admin/agent-profiles/route.ts', '/api/admin/agent-profiles'],
  ['admin/agent-profiles/[slug]/route.ts', '/api/admin/agent-profiles/[slug]'],
  ['admin/agents/route.ts', '/api/admin/agents'],
  ['admin/agents/[id]/route.ts', '/api/admin/agents/[id]'],
  ['admin/agents/[id]/revoke-sessions/route.ts', '/api/admin/agents/[id]/revoke-sessions'],
  ['onboarding/route.ts', '/api/onboarding'],
  ['public/chat/route.ts', '/api/public/chat'],
  ['properties/route.ts', '/api/properties'],
  ['mls/providers/route.ts', '/api/mls/providers'],
  ['mls/providers/[id]/test/route.ts', '/api/mls/providers/[id]/test'],
  ['data-health/route.ts', '/api/data-health'],
  ['health/ready/route.ts', '/api/health/ready'],
  ['internal/jobs/auth-mail/route.ts', '/api/internal/jobs/auth-mail'],
  ['academy/media/[...asset]/route.ts', '/api/academy/media/[...asset]'],
  ['assistant/route.ts', '/api/assistant'],
] as const

describe('production route failure instrumentation coverage', () => {
  it.each(instrumentedRoutes)('%s uses the safe route-failure recorder and a static route template', (route, template) => {
    const sourcePath = fileURLToPath(new URL(`../../src/app/api/${route}`, import.meta.url))
    const source = readFileSync(sourcePath, 'utf8')
    expect(source).toContain('recordCaughtRouteFailure')
    expect(source).toContain(`'${template}'`)
  })

  it('keeps the cloud validation endpoint on typed validation results rather than recording client input errors as server failures', () => {
    const sourcePath = fileURLToPath(new URL('../../src/app/api/cloud-ai/validate/route.ts', import.meta.url))
    const source = readFileSync(sourcePath, 'utf8')
    expect(source).toContain("provider: z.literal('openrouter')")
    expect(source).toContain("model: z.literal('openrouter/free')")
    expect(source).toContain('validateCloudConfig(config)')
    expect(source).toContain("{ valid: false, error: message }")
  })
})
