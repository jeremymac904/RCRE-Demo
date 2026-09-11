'use client'
/**
 * SEO Metadata Component
 *
 * Renders all structured metadata for agent website pages:
 * title, meta description, canonical, Open Graph, Twitter Card,
 * and JSON-LD structured data scripts.
 */

import type { SEOMetadata } from '@/lib/agent-website/types'

export function SEOMetadata({ seo }: { seo: SEOMetadata }) {
  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={seo.canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={seo.ogTitle} />
      <meta property="og:description" content={seo.ogDescription} />
      <meta property="og:type" content={seo.ogType} />
      <meta property="og:url" content={seo.canonical} />
      {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
      <meta property="og:site_name" content="RCRE Group" />

      {/* Twitter Card */}
      <meta name="twitter:card" content={seo.twitterCard} />
      <meta name="twitter:title" content={seo.ogTitle} />
      <meta name="twitter:description" content={seo.ogDescription} />
      {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}

      {/* JSON-LD Structured Data */}
      {seo.structuredData.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  )
}
