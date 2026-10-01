import 'server-only'
import { publicAgents } from '@/lib/public/content'
import { agentProfileFor, visiblePublicAgentSlugs } from '@/lib/platform/agent-profiles'
import type { BrandAgent } from './shared'
export * from './shared'

export function listBrandAgents(organizationId: string): BrandAgent[] {
  const visible = new Set(visiblePublicAgentSlugs(organizationId))
  return publicAgents.filter((person) => visible.has(person.slug)).flatMap((person) => {
    const profile = agentProfileFor(person.slug, organizationId)
    if (!profile || profile.publicVisible === false) return []
    return [{
      slug: person.slug,
      name: person.name,
      title: profile.publicTitle,
      phone: profile.phone,
      email: profile.email,
      license: profile.license,
      market: profile.market,
      website: 'https://rcregroup.com/agent/' + person.slug,
      socialLinks: profile.socialLinks,
    }]
  })
}

