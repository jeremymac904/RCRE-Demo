import type {PublicContent} from './content'
import {publicRoutes} from './content'
export const escapeSitemapValue=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
export function sitemapXml(cms:PublicContent[],archivedPaths:string[],visibleAgentSlugs:string[]){
  const archived=new Set(archivedPaths),visible=new Set(visibleAgentSlugs)
  const paths=[...new Set([...publicRoutes.filter(p=>!p.startsWith('/agent/')||visible.has(p.slice('/agent/'.length))),...cms.map(p=>p.id).filter(p=>/^\/(blog|resources|pages)\/[a-z0-9-/]+$/.test(p))])].filter(p=>!cms.some(c=>c.id===p&&(c.published?.redirectTo||c.published?.noIndex===true||c.published?.canonical&&c.published.canonical!=='https://rcregroup.com'+p))&&!p.startsWith('/academy-preview')&&!archived.has(p)&&!p.startsWith('/home-search')&&!p.startsWith('/properties/demo-')&&!p.startsWith('/api/')&&p!=='/testimonials')
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+escapeSitemapValue('https://rcregroup.com'+path)+'</loc><changefreq>monthly</changefreq></url>').join('')+'</urlset>'
}
