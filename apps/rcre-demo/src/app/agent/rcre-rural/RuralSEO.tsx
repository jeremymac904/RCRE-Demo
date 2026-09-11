'use client'
/**
 * RuralSEO — JSON-LD and meta for RCRE Rural theme pages.
 */

import type { SEOMetadata } from '@/lib/agent-website/types'

export function RuralSEO({ seo }: { seo: SEOMetadata }) {
  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={seo.canonical} />
      <meta property="og:title" content={seo.ogTitle} />
      <meta property="og:description" content={seo.ogDescription} />
      <meta property="og:type" content={seo.ogType} />
      <meta property="og:url" content={seo.canonical} />
      {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
      <meta property="og:site_name" content="RCRE Group — Rural & Land Division" />
      <meta name="twitter:card" content={seo.twitterCard} />
      <meta name="twitter:title" content={seo.ogTitle} />
      <meta name="twitter:description" content={seo.ogDescription} />
      {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}
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
