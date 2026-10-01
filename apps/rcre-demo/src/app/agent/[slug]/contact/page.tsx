/**
 * Agent Contact Page
 * Route: /agent/[slug]/contact
 *
 * Server wrapper — fetches agent data, passes to client component.
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getExampleAgent } from '@/lib/agent-website/agent-service'
import { resolveAgentWebsite } from '@/lib/agent-website/lifecycle'
import { buildContactSEO } from '@/lib/agent-website/seo'
import { AgentWebsiteThemeProvider } from '@/components/agent-website/theme-context'
import { SEOMetadata } from '@/components/agent-website/SEOMetadata'
import AgentContactClient from './AgentContactClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const website = await resolveAgentWebsite(slug)
  const agent = website?.profile || getExampleAgent(slug as keyof typeof import('@/lib/agent-website/agent-service').EXAMPLE_AGENTS)
  if (!agent) return { title: 'Agent Not Found' }
  const config = website?.config
  if (!config) return { title: 'Agent Not Found' }
  const seo = buildContactSEO(agent as Parameters<typeof buildContactSEO>[0], config)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
  }
}

export default async function AgentContactPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const website = await resolveAgentWebsite(slug)
  const agent = website?.profile || getExampleAgent(slug as keyof typeof import('@/lib/agent-website/agent-service').EXAMPLE_AGENTS)
  if (!agent) notFound()

  const config = website?.config
  if (!config) notFound()

  const seo = buildContactSEO(agent, config)

  return (
    <AgentWebsiteThemeProvider
      theme={config.theme || 'rcre-signature'}
      profile={agent}
      config={config}
    >
      <head>
        <SEOMetadata seo={seo} />
      </head>
      <Suspense>
        <AgentContactClient agent={agent} config={config} />
      </Suspense>
    </AgentWebsiteThemeProvider>
  )
}
