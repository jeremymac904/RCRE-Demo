/**
 * Agent Website SEO / AEO / GEO Utilities
 *
 * Generates structured metadata, Open Graph, and JSON-LD for every
 * agent website page. Each theme uses these utilities — SEO is shared,
 * presentation is theme-specific.
 */

import type { AgentProfile, AgentWebsiteConfig, SEOMetadata } from './types'

// ---------------------------------------------------------------------------
// Page-level SEO helpers
// ---------------------------------------------------------------------------

export function buildHomeSEO(
  agent: AgentProfile,
  config: AgentWebsiteConfig
): SEOMetadata {
  const title = config.seoTitle || `${agent.name} | RCRE Real Estate, ${agent.market}`
  const description =
    config.seoDescription ||
    `${agent.name} is a trusted RCRE ${agent.title} serving ${agent.market}. ${agent.bio.slice(0, 140)}…`
  const canonical = canonicalFor(agent.slug, config)

  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogImage: agent.headshot || config.heroImage,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    structuredData: [
      buildPersonSchema(agent, config),
      buildRealEstateAgentSchema(agent),
      buildOrganizationSchema(),
      buildWebSiteSchema(agent, config),
    ],
  }
}

export function buildAboutSEO(agent: AgentProfile, config: AgentWebsiteConfig): SEOMetadata {
  const title = `About ${agent.name} | ${agent.market} REALTOR®`
  const description = `${agent.name} — ${agent.title} with RCRE Group. ${agent.bio.slice(0, 160)}`
  return genericPageSEO(title, description, agent.slug, config, 'profile', agent.headshot)
}

export function buildContactSEO(agent: AgentProfile, config: AgentWebsiteConfig): SEOMetadata {
  const title = `Contact ${agent.name} | ${agent.market} Real Estate`
  const description = `Reach ${agent.name} at RCRE Group — ${agent.phone} or ${agent.email}`
  return genericPageSEO(title, description, agent.slug, config, 'website', agent.headshot)
}

export function buildMarketSEO(
  agent: AgentProfile,
  config: AgentWebsiteConfig,
  market: string
): SEOMetadata {
  const title = `${market} Real Estate | ${agent.name} | RCRE`
  const description = `${agent.name} specializes in ${market} real estate. Serving buyers and sellers in ${agent.market} with expert guidance and local market knowledge.`
  return genericPageSEO(title, description, agent.slug, config, 'website', config.heroImage)
}

export function buildListingsSEO(agent: AgentProfile, config: AgentWebsiteConfig): SEOMetadata {
  const title = `Properties for Sale | ${agent.name} | RCRE`
  const description = `Browse active listings represented by ${agent.name} in ${agent.market}. Expert buyer and seller representation through RCRE Group.`
  return genericPageSEO(title, description, agent.slug, config, 'website', config.heroImage)
}

export function buildBlogSEO(
  agent: AgentProfile,
  config: AgentWebsiteConfig,
  articleTitle: string,
  articleExcerpt: string,
  publishedDate?: string,
  ogImage?: string
): SEOMetadata {
  const title = `${articleTitle} | ${agent.name} Blog`
  const description = articleExcerpt.slice(0, 160)
  const canonical = `${canonicalFor(agent.slug, config)}blog/${slugify(articleTitle)}`
  return {
    title,
    description,
    canonical,
    ogTitle: articleTitle,
    ogDescription: description,
    ogImage: ogImage || agent.headshot,
    ogType: 'article',
    twitterCard: 'summary_large_image',
    structuredData: [
      buildArticleSchema(agent, articleTitle, articleExcerpt, canonical, publishedDate),
      buildPersonSchema(agent, config),
      buildOrganizationSchema(),
    ],
  }
}

export function buildResourcesSEO(agent: AgentProfile, config: AgentWebsiteConfig): SEOMetadata {
  const title = `Buyer & Seller Resources | ${agent.name} | RCRE`
  const description = `Free buyer and seller resources from ${agent.name} — market guides, financing tools, and expert advice for ${agent.market} real estate.`
  return genericPageSEO(title, description, agent.slug, config, 'website', config.heroImage)
}

// ---------------------------------------------------------------------------
// Canonical URL
// ---------------------------------------------------------------------------

export function canonicalFor(slug: string, config: AgentWebsiteConfig): string {
  if (config.customDomain) {
    return `https://${config.customDomain}`
  }
  if (config.subdomain) {
    return `https://${config.subdomain}.rcregroup.com`
  }
  // Default: platform path
  return `https://rcregroup.com/agent/${slug}`
}

// ---------------------------------------------------------------------------
// JSON-LD Schema builders
// ---------------------------------------------------------------------------

function buildPersonSchema(agent: AgentProfile, config: AgentWebsiteConfig): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: agent.name,
    jobTitle: agent.title,
    email: agent.email,
    telephone: agent.phone,
    url: canonicalFor(agent.slug, config),
    image: agent.headshot,
    description: agent.bio.slice(0, 500),
    worksFor: {
      '@type': 'Organization',
      name: 'River City Real Estate Group',
      url: 'https://rcregroup.com',
    },
    areaServed: agent.markets || agent.market,
    knowsAbout: (agent as AgentProfile & { markets?: string[] }).markets || [],
    ...(agent.socialLinks?.linkedin && {
      sameAs: [
        `https://linkedin.com/in/${agent.socialLinks.linkedin.replace('https://linkedin.com/in/', '')}`,
      ],
    }),
  }
}

function buildRealEstateAgentSchema(agent: AgentProfile): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: agent.name,
    telephone: agent.phone,
    email: agent.email,
    license: agent.license,
    areaServed: agent.market,
    knowsAbout: [
      'Residential real estate',
      'Buyer representation',
      'Seller representation',
      'Investment properties',
      ...(agent.website?.markets || []),
    ],
  }
}

function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://rcregroup.com/#organization',
    name: 'River City Real Estate Group',
    url: 'https://rcregroup.com',
    logo: 'https://rcregroup.com/brand/logo.svg',
    description: 'RCRE Group — Alabama and Florida real estate, powered by AI and expert agents.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-904-XXX-XXXX',
      contactType: 'customer service',
      availableLanguage: 'English',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Jacksonville',
      addressRegion: 'FL',
      addressCountry: 'US',
    },
  }
}

function buildWebSiteSchema(agent: AgentProfile, config: AgentWebsiteConfig): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${canonicalFor(agent.slug, config)}/#website`,
    url: canonicalFor(agent.slug, config),
    name: `${agent.name} | RCRE`,
    description: config.seoDescription || `${agent.name} — ${agent.title} with RCRE Group, ${agent.market}`,
    publisher: { '@id': 'https://rcregroup.com/#organization' },
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${canonicalFor(agent.slug, config)}/listings?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

function buildArticleSchema(
  agent: AgentProfile,
  title: string,
  excerpt: string,
  url: string,
  publishedDate?: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    url,
    author: {
      '@type': 'Person',
      name: agent.name,
      url: canonicalFor(agent.slug, agent.website as AgentWebsiteConfig || { theme: 'rcre-signature' } as AgentWebsiteConfig),
    },
    publisher: { '@id': 'https://rcregroup.com/#organization' },
    ...(publishedDate && { datePublished: publishedDate }),
    image: agent.headshot,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }
}

function genericPageSEO(
  title: string,
  description: string,
  slug: string,
  config: AgentWebsiteConfig,
  ogType: SEOMetadata['ogType'],
  ogImage?: string
): SEOMetadata {
  return {
    title,
    description,
    canonical: canonicalFor(slug, config),
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType,
    twitterCard: 'summary_large_image',
    structuredData: [
      buildPersonSchema(
        { slug, name: '', title: '', phone: '', email: '', license: '', market: '', bio: '' },
        config
      ),
      buildOrganizationSchema(),
    ],
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function completenessScore(profile: AgentProfile, config: AgentWebsiteConfig): {
  score: number
  issues: string[]
} {
  const issues: string[] = []
  let score = 100

  if (!profile.name) { issues.push('Missing name'); score -= 15 }
  if (!profile.bio || profile.bio.length < 100) { issues.push('Bio missing or too short (<100 chars)'); score -= 15 }
  if (!profile.headshot) { issues.push('Missing headshot'); score -= 10 }
  if (!profile.phone) { issues.push('Missing phone'); score -= 5 }
  if (!profile.email) { issues.push('Missing email'); score -= 5 }
  if (!config.tagline) { issues.push('Missing tagline'); score -= 10 }
  if (!config.heroImage) { issues.push('Missing hero image'); score -= 10 }
  if (!config.markets?.length) { issues.push('No markets selected'); score -= 10 }
  if (!config.seoDescription) { issues.push('Missing SEO description'); score -= 5 }
  if (!config.seoTitle) { issues.push('Missing SEO title'); score -= 5 }
  if (config.markets?.length === 0) { issues.push('No markets — SEO is impaired'); score -= 10 }

  return { score: Math.max(0, score), issues }
}
