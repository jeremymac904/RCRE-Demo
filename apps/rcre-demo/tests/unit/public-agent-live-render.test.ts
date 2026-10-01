import { afterEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({ listPublicAgentProfiles: vi.fn() }))
vi.mock('@/lib/db', () => ({ getRepository: vi.fn(async () => repository) }))

describe('production public roster reads', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks() })

  it('renders only rows returned by the active public profile projection', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_ORGANIZATION_ID', '22222222-2222-4222-8222-222222222222')
    repository.listPublicAgentProfiles.mockResolvedValue([{
      verifiedPersonId: 'sarah-brockner',
      profile: { publicVisible: true, professionalTitle: 'REALTOR®', phone: 'verified', markets: ['Florida'], licenses: [{ state: 'Florida', number: 'FL-123' }], biography: 'Verified public biography.' },
    }])
    vi.resetModules()
    const { publicAgentProfiles, publicAgentProfileFor } = await import('@/lib/public/server')
    const profiles = await publicAgentProfiles()
    expect(profiles.map(profile => profile.slug)).toEqual(['sarah-brockner'])
    expect(profiles[0]).toMatchObject({ role: 'REALTOR®', phone: 'verified', bio: 'Verified public biography.' })
    expect(await publicAgentProfileFor('taquilla-allen')).toBeUndefined()
    expect(repository.listPublicAgentProfiles).toHaveBeenCalledTimes(2)
  })
})
