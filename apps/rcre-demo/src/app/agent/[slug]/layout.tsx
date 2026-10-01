import { notFound } from 'next/navigation'
import { resolveAgentWebsite } from '@/lib/agent-website/lifecycle'

/** Public personal sites require an active canonical member, public visibility,
 * and an explicitly published configuration. Drafts and demo identities stay private. */
export default async function AgentWebsiteGate({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (process.env.NODE_ENV === 'production') {
    try {
      const website = await resolveAgentWebsite(slug)
      if (!website || website.profile.slug !== slug) notFound()
    } catch { notFound() }
  }
  return children
}
