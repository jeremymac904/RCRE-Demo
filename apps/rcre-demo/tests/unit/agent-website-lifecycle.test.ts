import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { THEME_CATALOG } from '@/lib/agent-website/types'
import { publicAgents } from '@/lib/public/content'
import { MemoryRepository, emptySeed } from '@/lib/db/repository'
import { repositoryActor } from '@/lib/platform/onboarding'
import { configureAuthPersistenceForTests, type AuthPersistence, type MemberSummary } from '@/lib/auth/persistence'
import type { PlatformActor } from '@/lib/platform/auth'
import { saveAgentWebsite, setAgentWebsitePublication } from '@/lib/agent-website/lifecycle'

const actor: PlatformActor = { id: 'agent-1', userId: 'agent-1', organizationId: 'org-1', name: 'Sarah Brockner', role: 'agent', officeId: 'fl', teamId: 'fl', market: 'Florida' }
const member: MemberSummary = { userId: actor.id, organizationId: actor.organizationId, canonicalPersonId: 'sarah-brockner', email: 'sarah@example.test', name: actor.name, platformRole: 'agent', active: true, accountStatus: 'active', officeId: 'fl', teamId: 'fl', market: 'Florida', lastLoginAt: null }
function installAuth(rows: MemberSummary[] = [member]) {
  configureAuthPersistenceForTests({ listMembers: async () => rows } as unknown as AuthPersistence)
}
function repository() { return new MemoryRepository(emptySeed()) }
function payload(version = 0) {
  return { slug: 'sarah-brockner', theme: 'rcre-signature', markets: ['Jacksonville'], specialties: ['Residential'], headline: 'Jacksonville homes', tagline: 'Local perspective', seoTitle: 'Sarah Brockner | RCRE', seoDescription: 'Jacksonville real estate', version }
}
function profile(visible = true) {
  return { id: actor.id, memberId: actor.id, organizationId: actor.organizationId, verifiedPersonId: 'sarah-brockner', publicVisible: visible, phone: '(904) 555-0100', professionalTitle: 'REALTOR®', biography: 'A verified local agent profile.', licenses: [{ state: 'Florida', number: 'SL123456' }], markets: ['Jacksonville'], specialties: ['Residential'], socialLinks: {}, websiteTemplate: 'signature', websiteSlug: 'sarah-brockner', steps: {}, version: 1, savedAt: new Date().toISOString() } as unknown as Record<string, unknown> & { verifiedPersonId: string; publicVisible: boolean }
}
afterEach(() => configureAuthPersistenceForTests(null))

describe('durable agent website lifecycle', () => {
  it('saves owner-scoped website configuration with optimistic versions and audit', async () => {
    installAuth()
    const repo = repository()
    await repo.putDomainRecord({ userId: actor.id, organizationId: actor.organizationId, role: 'agent' }, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: profile() })
    const saved = await saveAgentWebsite(actor, payload(), repo)
    expect(saved).toMatchObject({ slug: 'sarah-brockner', published: false, theme: 'rcre-signature', version: 1 })
    await expect(saveAgentWebsite(actor, payload(), repo)).rejects.toThrow(/changed in another session/i)
    const row = await repo.getDomainRecord<any>({ userId: actor.id, organizationId: actor.organizationId, role: 'agent' }, 'agent_websites', actor.id)
    expect(row?.ownerUserId).toBe(actor.id)
    expect((await repo.listAudit({ userId: actor.id, organizationId: actor.organizationId, role: 'owner' }))).toHaveLength(1)
  })
  it('requires a verified, visible profile before publishing and supports unpublishing', async () => {
    installAuth()
    const repo = repository()
    const context = { userId: actor.id, organizationId: actor.organizationId, role: 'agent' as const }
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: profile(false) })
    await saveAgentWebsite(actor, payload(), repo)
    await expect(setAgentWebsitePublication(actor, actor.id, true, 1, repo)).rejects.toThrow(/public visibility/i)
    const row = await repo.getDomainRecord<any>(context, 'agent_websites', actor.id)
    const profileRow = await repo.getDomainRecord<any>(context, 'member_profiles', actor.id)
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: profile(true), expectedVersion: profileRow!.version })
    await expect(setAgentWebsitePublication(actor, actor.id, true, row!.version + 1, repo)).rejects.toThrow(/changed in another session/i)
    const published = await setAgentWebsitePublication(actor, actor.id, true, row!.version, repo)
    expect(published.published).toBe(true)
    const unpublished = await setAgentWebsitePublication(actor, actor.id, false, row!.version + 1, repo)
    expect(unpublished.published).toBe(false)
  })

  it('persists each of the eight approved website templates through the same website record', async () => {
    installAuth()
    const themes = Object.keys(THEME_CATALOG)
    expect(themes).toHaveLength(8)
    for (const [index, theme] of themes.entries()) {
      const repo = repository()
      const context = { userId: actor.id, organizationId: actor.organizationId, role: 'agent' as const }
      await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: profile() })
      const config = await saveAgentWebsite(actor, { ...payload(), slug: 'sarah-brockner', theme, version: 0 }, repo)
      expect(config.theme).toBe(theme)
    }
  })
  it('uses an owned canonical_people record for a newly onboarded agent and gates publication on broker approval', async () => {
    installAuth([{ ...member, canonicalPersonId: 'new-agent-42', name: 'New Agent', email: 'new@example.test' }])
    const repo = repository()
    const context = { userId: actor.id, organizationId: actor.organizationId, role: 'agent' as const }
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: { ...profile(false), verifiedPersonId: 'new-agent-42', headshotAssetId: undefined } })
    const canonical = { id: 'new-agent-42', slug: 'new-agent-42', userId: actor.id, organizationId: actor.organizationId, name: 'New Agent', email: 'new@example.test', phone: '(904) 555-0199', professionalTitle: 'REALTOR®', biography: 'A new agent profile.', markets: ['Jacksonville'], specialties: ['Residential'], licenses: [{ state: 'Florida', number: 'SL000042' }], socialLinks: {}, status: 'pending_review', publicVisible: false }
    await repo.putDomainRecord(context, { collection: 'canonical_people', recordId: canonical.slug, ownerUserId: actor.id, data: canonical })
    const site = await saveAgentWebsite(actor, { ...payload(), slug: 'new-agent-42', markets: ['Jacksonville', 'Clay County'], specialties: ['Residential', 'First-time buyers'] }, repo)
    const savedCanonical = await repo.getDomainRecord<any>(context, 'canonical_people', canonical.slug)
    expect(savedCanonical?.data).toMatchObject({ name: 'New Agent', markets: ['Jacksonville', 'Clay County'], specialties: ['Residential', 'First-time buyers'], status: 'pending_review', publicVisible: false })
    await expect(setAgentWebsitePublication(actor, actor.id, true, site.version, repo)).rejects.toThrow(/active canonical profile/i)

    const profileRow = await repo.getDomainRecord<any>(context, 'member_profiles', actor.id)
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: { ...profileRow!.data, publicVisible: true, headshotAssetId: 'asset-new-agent' }, expectedVersion: profileRow!.version })
    const canonicalRow = await repo.getDomainRecord<any>(context, 'canonical_people', canonical.slug)
    await repo.putDomainRecord(context, { collection: 'canonical_people', recordId: canonical.slug, ownerUserId: actor.id, data: { ...canonicalRow!.data, status: 'active', publicVisible: true }, expectedVersion: canonicalRow!.version })
    expect((await setAgentWebsitePublication(actor, actor.id, true, site.version, repo)).published).toBe(true)
  })

  it('lists dynamic canonical people only when the owned profile and site are approved and published', async () => {
    const seed = emptySeed()
    seed.users.push({ id: actor.id, organizationId: actor.organizationId, email: member.email, fullName: member.name, role: 'agent', fubUserId: null, isActive: true, officeId: 'fl' })
    const repo = new MemoryRepository(seed)
    const context = { userId: actor.id, organizationId: actor.organizationId, role: 'agent' as const }
    const canonical = { id: 'sarah-brockner', slug: 'sarah-brockner', userId: actor.id, organizationId: actor.organizationId, name: actor.name, email: member.email, status: 'pending_review', publicVisible: false, licenses: [{ state: 'Florida', number: 'SL123456' }], biography: 'Approved profile.' }
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: { ...profile(), headshotAssetId: 'asset-sarah' } })
    await repo.putDomainRecord(context, { collection: 'canonical_people', recordId: canonical.slug, ownerUserId: actor.id, data: canonical })
    await repo.putDomainRecord(context, { collection: 'agent_websites', recordId: actor.id, ownerUserId: actor.id, data: { ...payload(), ownerUserId: actor.id, organizationId: actor.organizationId, published: false, updatedAt: new Date().toISOString() } })
    expect(await repo.listPublicAgentProfiles(actor.organizationId)).toEqual([])
    const personRow = await repo.getDomainRecord<any>(context, 'canonical_people', canonical.slug)
    await repo.putDomainRecord(context, { collection: 'canonical_people', recordId: canonical.slug, ownerUserId: actor.id, data: { ...personRow!.data, status: 'active', publicVisible: true }, expectedVersion: personRow!.version })
    expect(await repo.listPublicAgentProfiles(actor.organizationId)).toEqual([])
    const siteRow = await repo.getDomainRecord<any>(context, 'agent_websites', actor.id)
    await repo.putDomainRecord(context, { collection: 'agent_websites', recordId: actor.id, ownerUserId: actor.id, data: { ...siteRow!.data, published: true }, expectedVersion: siteRow!.version })
    expect(await repo.listPublicAgentProfiles(actor.organizationId)).toEqual([expect.objectContaining({ verifiedPersonId: 'sarah-brockner', websiteSlug: 'sarah-brockner', person: expect.objectContaining({ status: 'active', publicVisible: true }) })])
  })

  it('does not allow a linked slug to load a canonical record owned by another member', async () => {
    installAuth([{ ...member, canonicalPersonId: 'foreign-person' }])
    const repo = repository()
    const context = { userId: actor.id, organizationId: actor.organizationId, role: 'agent' as const }
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: { ...profile(), verifiedPersonId: 'foreign-person' } })
    await repo.putDomainRecord({ userId: 'other-agent', organizationId: actor.organizationId, role: 'agent' }, { collection: 'canonical_people', recordId: 'foreign-person', ownerUserId: 'other-agent', data: { id: 'foreign-person', slug: 'foreign-person', userId: 'other-agent', organizationId: actor.organizationId, name: 'Other', email: 'other@example.test', status: 'active', publicVisible: true } })
    await expect(saveAgentWebsite(actor, payload(), repo)).rejects.toThrow(/canonical Realtor profile is not available/i)
  })

  it('does not self-link canonical identity from email while saving a website', async () => {
    const canonicalEmail = publicAgents.find(person => person.slug === 'sarah-brockner')?.email
    expect(canonicalEmail).toBeTruthy()
    installAuth([{ ...member, canonicalPersonId: null, email: canonicalEmail! }])
    const repo = repository()
    const context = { userId: actor.id, organizationId: actor.organizationId, role: 'agent' as const }
    const unlinkedProfile = { ...profile(), verifiedPersonId: undefined }
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: unlinkedProfile })
    await saveAgentWebsite(actor, payload(), repo)
    const saved = await repo.getDomainRecord<any>(context, 'member_profiles', actor.id)
    expect(saved?.data.verifiedPersonId).toBeUndefined()
  })

  it('supports a public URL slug distinct from the canonical person key', async () => {
    installAuth()
    const repo = repository()
    const context = { userId: actor.id, organizationId: actor.organizationId, role: 'agent' as const }
    await repo.putDomainRecord(context, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: { ...profile(), websiteSlug: '' } })
    const site = await saveAgentWebsite(actor, { ...payload(), slug: 'sarah-northeast-florida', version: 0 }, repo)
    const storedProfile = await repo.getDomainRecord<any>(context, 'member_profiles', actor.id)
    expect(site.slug).toBe('sarah-northeast-florida')
    expect(storedProfile?.data.websiteSlug).toBe(site.slug)
    expect(storedProfile?.data.verifiedPersonId).toBe('sarah-brockner')
    const renamed = await saveAgentWebsite(actor, { ...payload(1), slug: 'sarah-jacksonville-homes' }, repo)
    expect(renamed.slug).toBe('sarah-jacksonville-homes')
    expect((await setAgentWebsitePublication(actor, actor.id, true, renamed.version, repo)).published).toBe(true)
    await expect(saveAgentWebsite(actor, { ...payload(3), slug: 'another-sarah-site' }, repo)).rejects.toThrow(/published website URL is locked/i)
  })
  it('publishes a tenant-scoped projection only for active, visible, verified members', () => {
    const sql = readFileSync('supabase/migrations/0024_canonical_agent_website_projection.sql', 'utf8')
    expect(sql).toMatch(/organization_id = p_organization_id/)
    expect(sql).toMatch(/collection = 'canonical_people'/)
    expect(sql).toMatch(/cp\.data->>'status' = 'active'/)
    expect(sql).toMatch(/cp\.data->'publicVisible' = 'true'/)
    expect(sql).toMatch(/cp\.owner_user_id = u\.id/)
    expect(sql).toMatch(/u\.is_active = true/)
    expect(sql).toMatch(/site\.data->>'published' = 'true'/)
    expect(sql).toMatch(/grant execute on function rcre_public_agent_website\(uuid, text\) to anon/)
    expect(sql).not.toContain("'lekeshia-jones'")
  })

  it('exposes approved canonical identities to roster and sitemap only after publication', () => {
    const sql = readFileSync('supabase/migrations/0026_canonical_public_agent_directory.sql', 'utf8')
    expect(sql).toContain('rcre_public_agent_profiles_v2')
    expect(sql).toMatch(/cp\.collection = 'canonical_people'/)
    expect(sql).toMatch(/cp\.data->>'status' = 'active'/)
    expect(sql).toMatch(/cp\.data->'publicVisible' = 'true'/)
    expect(sql).toMatch(/site\.data->>'published' = 'true'/)
    expect(sql).toMatch(/u\.is_active = true/)
    expect(sql).not.toContain("'lekeshia-jones'")
    const rosterSql = readFileSync('supabase/migrations/0026_canonical_public_agent_directory.sql', 'utf8')
    expect(rosterSql).toContain('rcre_public_agent_profiles_v2')
    expect(rosterSql).toContain('rcre_public_agent_headshot')
    expect(rosterSql).toMatch(/cp\.data->>'status' = 'active'/)
    expect(rosterSql).toMatch(/cp\.data->'publicVisible' = 'true'/)
    expect(rosterSql).not.toContain("'lekeshia-jones'")
    const expectedLegacy = publicAgents.map(person => person.slug).filter(slug => slug !== 'lekeshia-jones').sort()
    const legacyArrays = [...rosterSql.matchAll(/mp\.data->>'verifiedPersonId' = any\(array\[([\s\S]*?)\]::text\[\]\)/g)]
    expect(legacyArrays).toHaveLength(3)
    for (const [, arrayText] of legacyArrays) {
      expect([...arrayText.matchAll(/'([a-z0-9-]+)'/g)].map(match => match[1]).sort()).toEqual(expectedLegacy)
    }
  })
  it('blocks a Realtor from publishing or managing another member site', async () => {
    installAuth([{ ...member, userId: 'other-agent' }])
    await expect(setAgentWebsitePublication(actor, 'other-agent', true, 0, repository())).rejects.toThrow(/access denied/i)
  })

  it('lets a Florida Managing Broker publish an agent website in the same verified office and state', async () => {
    const manager: PlatformActor = { id: 'manager-fl', userId: 'manager-fl', organizationId: 'org-1', name: 'Managing Broker', role: 'managing_broker', officeId: 'fl', teamId: 'fl', market: 'Florida' }
    const target: MemberSummary = { ...member, userId: 'agent-2', canonicalPersonId: 'sarah-brockner', email: 'sarah@example.test', platformRole: 'agent', officeId: 'fl', teamId: 'fl', market: 'Florida' }
    installAuth([{ ...member, userId: manager.id, platformRole: 'managing_broker', officeId: 'fl', teamId: 'fl', market: 'Florida' }, target])
    const seed = emptySeed()
    seed.users.push({ id: manager.id, organizationId: manager.organizationId, email: 'manager@example.test', fullName: manager.name, role: 'managing_broker', fubUserId: null, isActive: true, officeId: 'fl' }, { id: target.userId, organizationId: target.organizationId, email: target.email, fullName: target.name, role: 'agent', fubUserId: null, isActive: true, officeId: 'fl' })
    const repo = new MemoryRepository(seed)
    const targetContext = { userId: target.userId, organizationId: target.organizationId, role: 'agent' as const }
    await repo.putDomainRecord(targetContext, { collection: 'member_profiles', recordId: target.userId, ownerUserId: target.userId, data: { ...profile(), id: target.userId, memberId: target.userId, organizationId: target.organizationId } })
    await repo.putDomainRecord(targetContext, { collection: 'agent_websites', recordId: target.userId, ownerUserId: target.userId, data: { ...payload(), published: false, ownerUserId: target.userId, organizationId: target.organizationId, updatedAt: new Date().toISOString() } })
    const row = await repo.getDomainRecord<any>(repositoryActor(manager), 'agent_websites', target.userId)
    const result = await setAgentWebsitePublication(manager, target.userId, true, row!.version, repo)
    expect(result.published).toBe(true)
  })

  it('denies a Managing Broker publication across state or office scope', async () => {
    const manager: PlatformActor = { id: 'manager-al', userId: 'manager-al', organizationId: 'org-1', name: 'Managing Broker', role: 'managing_broker', officeId: 'al', teamId: 'al', market: 'Alabama' }
    const target: MemberSummary = { ...member, userId: 'agent-2', canonicalPersonId: 'sarah-brockner', email: 'sarah@example.test', platformRole: 'agent', officeId: 'fl', teamId: 'fl', market: 'Florida' }
    installAuth([{ ...member, userId: manager.id, platformRole: 'managing_broker', officeId: 'al', teamId: 'al', market: 'Alabama' }, target])
    await expect(setAgentWebsitePublication(manager, target.userId, true, 1, repository())).rejects.toThrow(/outside your authorized scope/i)
  })
  it('rejects unsafe hero image URLs before durable storage', async () => {
    installAuth()
    const repo = repository()
    await repo.putDomainRecord({ userId: actor.id, organizationId: actor.organizationId, role: 'agent' }, { collection: 'member_profiles', recordId: actor.id, ownerUserId: actor.id, data: profile() })
    await expect(saveAgentWebsite(actor, { ...payload(), heroImage: 'javascript:alert(1)' }, repo)).rejects.toThrow(/secure image URL/i)
  })
  it('does not publish for inactive members or drafts without website settings', async () => {
    installAuth([{ ...member, active: false }])
    await expect(setAgentWebsitePublication(actor, actor.id, true, 0, repository())).rejects.toThrow(/active RCRE membership/i)
  })
  it('does not expose demo agent personas from public routes in production', async () => {
    const { readFileSync } = await import('node:fs')
    const page = readFileSync(new URL('../../src/app/agent/[slug]/page.tsx', import.meta.url), 'utf8')
    expect(page).toContain("process.env.NODE_ENV === 'production' ? null : getExampleAgent(")
  })

  it('blocks every static agent-template sample subtree in production and reserves those slugs', async () => {
    const { readFileSync } = await import('node:fs')
    const { existsSync } = await import('node:fs')
    const samples = ['birmingham-historic','family','jacksonville-newconstruction','jacksonville-urban','rcre-investor','rcre-luxury','rcre-rural','rcre-suburban','rcre-urban']
    for (const slug of samples) {
      const layout = readFileSync(new URL(`../../src/app/agent/${slug}/layout.tsx`, import.meta.url), 'utf8')
      expect(layout).toContain("process.env.NODE_ENV === 'production'")
      expect(layout).toContain('notFound()')
      expect(layout).toContain('index: false')
      expect(existsSync(new URL(`../../src/app/agent/${slug}/page.tsx`, import.meta.url))).toBe(true)
    }
    const lifecycle = readFileSync(new URL('../../src/lib/agent-website/lifecycle.ts', import.meta.url), 'utf8')
    expect(lifecycle).toContain('reservedTemplateSlugs')
    expect(lifecycle).toContain('This address is reserved for a website preview.')
  })

})
