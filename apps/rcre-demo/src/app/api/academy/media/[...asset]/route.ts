import { createReadStream, statSync, realpathSync } from 'node:fs'
import { Readable } from 'node:stream'
import path from 'node:path'
import { actorOrNull } from '@/lib/platform/auth'
import { academy } from '@/data/academy'
import { academyAssetPath, byteRange } from '@/lib/academy-media'
import { courseAllowed,publicCourseAllowed } from '@/lib/academy-service'
export const runtime='nodejs'
export async function GET(req:Request,{params}:{params:Promise<{asset:string[]}>}) {
 const a=await actorOrNull()
 const {asset}=await params;const href='/academy/'+asset.join('/')
 const lessons=academy.lessons.filter(l=>l.resources.some(r=>r.href===href)||l.video?.src===href||l.video?.captions===href)
 if(!lessons.some(l=>a?courseAllowed(a,l.courseId):(publicCourseAllowed(l.courseId)&&(l.video?.src===href||l.video?.captions===href))))return Response.json({error:a?'Resource access denied':'Sign in required'},{status:a?403:401})
 try {const file=realpathSync(academyAssetPath(href)),root=realpathSync(path.resolve(process.cwd(),'../../training-assets/protected'));if(!file.startsWith(root+path.sep))throw new Error('Invalid path');const size=statSync(file).size;let range;try{range=byteRange(req.headers.get('range'),size)}catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}})}
 const ext=path.extname(file),types:Record<string,string>={'.mp4':'video/mp4','.vtt':'text/vtt','.pdf':'application/pdf','.zip':'application/zip','.md':'text/plain; charset=utf-8'}
 const headers:Record<string,string>={'Content-Type':types[ext]||'application/octet-stream','Content-Length':String(range?range.end-range.start+1:size),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
 if(range)headers['Content-Range']=`bytes ${range.start}-${range.end}/${size}`
 return new Response(Readable.toWeb(createReadStream(file,range??undefined)) as ReadableStream,{status:range?206:200,headers})
 }catch{return Response.json({error:'Resource unavailable'},{status:404})}
}
