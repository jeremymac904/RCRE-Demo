import { publicAgents } from '@/lib/public/content'
import { agentProfileFor, visiblePublicAgentSlugs } from '@/lib/platform/agent-profiles'
import type { PlatformRole } from '@/lib/platform/auth'

export type BrandState = 'Alabama' | 'Florida'
export type BrandAgent = {
  slug: string
  name: string
  title: string
  phone: string
  email: string
  license: string
  market: string
  website: string
  socialLinks: { instagram: string; facebook: string; linkedin: string }
}
const ALLOWED_ROLES: readonly PlatformRole[] = ['agent', 'team_leader', 'managing_broker', 'broker_owner', 'transaction_coordinator', 'marketing_admin', 'trainer']
export function canAccessBrandResources(role: string): role is PlatformRole {
  return ALLOWED_ROLES.includes(role as PlatformRole)
}
export function isBrandAdmin(role: string): boolean {
  return role === 'managing_broker' || role === 'broker_owner'
}
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

/** A combined license string does not establish which license belongs to which state. */
export function licenseForState(agent: Pick<BrandAgent, 'license' | 'market'>, state: BrandState): string | null {
  if (agent.market !== state) return null
  return agent.license.trim() || null
}
export function brandComplianceReadiness(_state: BrandState) {
  return {
    ready: false as const,
    status: 'pending' as const,
    reason: 'State-specific brokerage identity and approved compliance copy have not been configured.',
  }
}
export const BRAND_ITEMS = [
  { id: 'apparel', title: 'Apparel', kinds: 'Shirts and polos', description: 'Branded clothing concepts for team events and everyday brokerage use.', tag: 'Brand resource' },
  { id: 'headwear', title: 'Headwear', kinds: 'Hats and caps', description: 'A simple branded option for open houses, community events, and team wear.', tag: 'Brand resource' },
  { id: 'signage', title: 'Signage', kinds: 'Open house and directional signs', description: 'Sign concepts for review. State and brokerage requirements must be approved before ordering.', tag: 'Approval required' },
  { id: 'identity', title: 'Agent identification', kinds: 'Name badges and desk cards', description: 'Use verified agent contact information and an approved state-specific brokerage line.', tag: 'Approval required' },
  { id: 'client-gifts', title: 'Client appreciation', kinds: 'Closing and thank-you gifts', description: 'Ideas for client appreciation; no supplier, stock, or pricing is configured.', tag: 'Planning resource' },
  { id: 'business-cards', title: 'Business cards', kinds: 'Alabama and Florida concepts', description: 'Generate a front-and-back concept from a visible canonical RCRE profile.', tag: 'Concept preview' },
  { id: 'email-signatures', title: 'Email signatures', kinds: 'Gmail copy-and-install', description: 'Build a copyable signature from a visible canonical RCRE profile. No email is sent.', tag: 'Ready to copy' },
] as const

