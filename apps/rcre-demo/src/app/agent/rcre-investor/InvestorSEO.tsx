/**
 * InvestorSEO — SEO metadata renderer for RCRE Investor theme.
 */
import type { SEOMetadata } from '@/lib/agent-website/types'

interface Props {
  seo: SEOMetadata
}

export function InvestorSEO({ seo }: Props) {
  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={seo.canonical} />
      <meta property="og:title" content={seo.ogTitle} />
      <meta property="og:description" content={seo.ogDescription} />
      {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
      {seo.structuredData.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  )
}
