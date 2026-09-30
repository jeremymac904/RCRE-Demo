import { notFound } from 'next/navigation'
import { publicAgents } from '@/lib/public/content'
import { getWebsiteConfig } from '@/lib/agent-website/agent-service'

/** Public personal sites require a canonical public agent and an explicitly
 * published website configuration. Drafts and demo identities stay private. */
export default async function AgentWebsiteGate({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (process.env.NODE_ENV === 'production') {
    if (!publicAgents.some(agent => agent.slug === slug)) notFound()
    try {
      const config = getWebsiteConfig(slug)
      if (!config?.published) notFound()
    } catch { notFound() }
  }
  return children
}
