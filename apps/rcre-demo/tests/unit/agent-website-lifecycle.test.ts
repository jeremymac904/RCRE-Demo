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
    expect((await setAgentWebsitePublication(actor, actor.id, true, site.version, repo)).published).toBe(true)
  })
  it('publishes a tenant-scoped projection only for active, visible, verified members', () => {
    const sql = readFileSync('supabase/migrations/0010_agent_website_lifecycle.sql', 'utf8')
    expect(sql).toMatch(/organization_id = p_organization_id/)
    expect(sql).toMatch(/nullif\(mp\.data->>'verifiedPersonId', ''\) is not null/)
    expect(sql).toMatch(/data->'publicVisible' = 'true'/)
    expect(sql).toMatch(/u\.is_active = true/)
    expect(sql).toMatch(/site\.data->>'published' = 'true'/)
    expect(sql).toMatch(/grant execute on function rcre_public_agent_website\(uuid, text\) to anon/)
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
})
