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
  it('includes approved dynamic agent websites in directory routes and sitemap slugs', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RCRE_ORGANIZATION_ID', '22222222-2222-4222-8222-222222222222')
    repository.listPublicAgentProfiles.mockResolvedValue([{
      verifiedPersonId: 'new-agent-42',
      websiteSlug: 'new-agent-jacksonville',
      profile: { publicVisible: true, phone: '(904) 555-0199', professionalTitle: 'REALTOR®', markets: ['Jacksonville'], licenses: [{ state: 'Florida', number: 'SL-42' }], biography: 'Approved agent biography.', headshotAssetId: 'asset-42' },
      person: { id: 'new-agent-42', slug: 'new-agent-42', name: 'New Agent', email: 'new@example.test', phone: '(904) 555-0199', professionalTitle: 'REALTOR®', markets: ['Jacksonville'], specialties: ['Residential'], licenses: [{ state: 'Florida', number: 'SL-42' }], biography: 'Approved agent biography.', publicVisible: true },
    }])
    vi.resetModules()
    const { publicAgentProfiles, publicAgentProfileFor, publicAgentDirectorySlugs } = await import('@/lib/public/server')
    const profiles = await publicAgentProfiles()
    expect(profiles).toHaveLength(1)
    expect(profiles[0]).toMatchObject({ slug: 'new-agent-jacksonville', canonicalPersonId: 'new-agent-42', name: 'New Agent', image: '/api/public/agent-photo/new-agent-jacksonville' })
    expect((await publicAgentProfileFor('new-agent-jacksonville'))?.email).toBe('new@example.test')
    expect(await publicAgentDirectorySlugs()).toEqual(['new-agent-jacksonville'])
  })

})
