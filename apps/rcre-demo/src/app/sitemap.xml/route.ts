import {sitemapXml} from '@/lib/public/sitemap'
import {publicAgentDirectorySlugs,publishedPages,archivedPublicPaths} from '@/lib/public/server'
export const dynamic='force-dynamic'
export async function GET(){
  const [cms,archived]=await Promise.all([publishedPages(),archivedPublicPaths()])
  const visible=await publicAgentDirectorySlugs()
  // RCRE production routes and profiles come from the reviewed static registry plus
  // published PostgreSQL projections; this endpoint never reads the SQLite store.
  const xml=sitemapXml(cms,archived,visible)
  return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}})
}
