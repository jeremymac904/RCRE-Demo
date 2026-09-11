import {publicRoutes} from '@/lib/public/content'
import {publishedPages} from '@/lib/public/server'
import {readRecords} from '@/lib/platform/store'
import type {PublicContent} from '@/lib/public/content'
export const dynamic='force-dynamic'
const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
export async function GET(){const cms=await publishedPages();const archived=new Set(readRecords<PublicContent>('public_content').filter(r=>r.status==='archived').map(r=>r.id));const paths=[...new Set([...publicRoutes,...cms.map(p=>p.id).filter(p=>/^\/(blog|resources|pages)\/[a-z0-9-/]+$/.test(p))])].filter(p=>!cms.some(c=>c.id===p&&(c.published?.redirectTo||c.published?.noIndex===true||c.published?.canonical&&c.published.canonical!=='https://rcregroup.com'+p))&&!p.startsWith('/academy-preview')&&!archived.has(p)&&!p.startsWith('/home-search')&&!p.startsWith('/properties/demo-')&&!p.startsWith('/api/')&&p!=='/testimonials');const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+escape('https://rcregroup.com'+path)+'</loc><changefreq>monthly</changefreq></url>').join('')+'</urlset>';return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}})}
