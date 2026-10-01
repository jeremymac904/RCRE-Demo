import 'server-only'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { actorOrNull } from '@/lib/platform/auth'
import { isLocalStoreAllowed } from '@/lib/platform/storage-mode'
import { getAuthPersistence } from '@/lib/auth/persistence'
import { getRepository } from '@/lib/db'
import { repositoryActor } from '@/lib/platform/onboarding'
import { publicAgents } from '@/lib/public/content'
import { canAccessBrandResources, isBrandAdmin, listBrandAgents } from './index'
import type { BrandAgent, BrandState } from './shared'

function profileBrandAgent(profile: Record<string, unknown>, allowPrivate = false): BrandAgent | null {
  const canonical = typeof profile.verifiedPersonId === 'string'
    ? publicAgents.find(person => person.slug === profile.verifiedPersonId)
    : undefined
  if (!canonical || (profile.publicVisible !== true && !allowPrivate)) return null
  const markets = Array.isArray(profile.markets) ? profile.markets.filter((value): value is string => typeof value === 'string') : []
  const licenses = Array.isArray(profile.licenses) ? profile.licenses.flatMap(value => {
    if (!value || typeof value !== 'object') return []
    const license = value as { state?: unknown; number?: unknown }
    if ((license.state !== 'Alabama' && license.state !== 'Florida') || typeof license.number !== 'string') return []
    return [{ state: license.state as BrandState, number: license.number }]
  }) : []
  const social = profile.socialLinks && typeof profile.socialLinks === 'object' ? profile.socialLinks as Record<string, unknown> : {}
  const slug = typeof profile.websiteSlug === 'string' && /^[a-z0-9-]{3,80}$/.test(profile.websiteSlug) ? profile.websiteSlug : canonical.slug
  return {
    slug,
    canonicalSlug: canonical.slug,
    name: canonical.name,
    title: typeof profile.professionalTitle === 'string' && profile.professionalTitle.trim() ? profile.professionalTitle.trim() : canonical.role,
    phone: typeof profile.phone === 'string' && profile.phone.trim() ? profile.phone.trim() : canonical.phone,
    email: typeof profile.email === 'string' && profile.email.trim() ? profile.email.trim() : canonical.email,
    license: licenses.length === 1 ? licenses[0].number : '',
    licenses,
    market: markets.length === 1 ? markets[0] : markets.join(', '),
    markets,
    website: 'https://rcregroup.com/agent/' + slug,
    socialLinks: {
      instagram: typeof social.instagram === 'string' ? social.instagram : '',
      facebook: typeof social.facebook === 'string' ? social.facebook : '',
      linkedin: typeof social.linkedin === 'string' ? social.linkedin : '',
    },
  }
}

async function listDurableBrandAgents(actor: NonNullable<Awaited<ReturnType<typeof actorOrNull>>>): Promise<BrandAgent[]> {
  const [auth, repository] = await Promise.all([getAuthPersistence(), getRepository()])
  const members = await auth.listMembers(actor)
  const context = repositoryActor(actor)
  const rows = await Promise.all(members.filter(member => member.active && ['agent','team_leader','managing_broker','broker_owner'].includes(member.platformRole)).map(async member => {
    const profile = await repository.getDomainRecord<Record<string, unknown>>(context, 'member_profiles', member.userId)
    return profile ? profileBrandAgent(profile.data, member.userId === actor.id) : null
  }))
  return rows.filter((row): row is BrandAgent => row !== null)
}

export async function getBrandResourceContext() {
  const local = isLocalStoreAllowed(process.env.NODE_ENV, process.env.NEXT_PHASE)
  if (!local && process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) return { kind: 'unavailable' as const }
  const actor = await actorOrNull()
  if (!actor) redirect('/login')
  if (!canAccessBrandResources(actor.role)) redirect('/forbidden')
  if (local) {
    const user = await currentUser()
    if (!user) redirect('/login')
    return { kind: 'available' as const, actor, user, admin: isBrandAdmin(actor.role), agents: listBrandAgents(actor.organizationId) }
  }
  const agents = await listDurableBrandAgents(actor)
  const user = {
    id: actor.id, name: actor.name, firstName: actor.name.split(/\s+/)[0], role: ['broker_owner','managing_broker','team_leader'].includes(actor.role) ? 'broker' as const : 'agent' as const,
    platformRole: actor.role, title: actor.role.replaceAll('_',' '), market: actor.market,
    initials: actor.name.split(/\s+/).map(part => part[0] ?? '').join('').slice(0, 2), stats: { activeClients: 0, pipelineValue: 0, ytdClosings: 0, avgResponseMinutes: 0, trainingPct: 0 },
  }
  return { kind: 'available' as const, actor, user, admin: isBrandAdmin(actor.role), agents }
}
