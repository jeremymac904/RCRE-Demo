import {z} from 'zod'
import {requireActor,AccessError} from '@/lib/platform/auth'
import {canEditMarketing} from '@/lib/platform/service'
import {listAssets,saveAsset,localDispatch} from '@/lib/platform/library'
export const dynamic='force-dynamic'
export async function GET(){try{const actor=await requireActor();return Response.json(listAssets(actor).map(a=>({...a,editable:canEditMarketing(actor,a)})))}catch(e){return fail(e)}}
export async function POST(req:Request){try{const a=await requireActor();const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)throw new AccessError('Origin mismatch');if(req.headers.get('content-type')?.includes('application/json'))return Response.json(localDispatch(a));if(Number(req.headers.get('content-length'))>21*1024*1024)throw new AccessError('File exceeds 20 MB',413);const data=await req.formData();const file=data.get('file');if(!(file instanceof File))throw new AccessError('Choose a file',400);return Response.json(saveAsset(a,file.name,file.type,Buffer.from(await file.arrayBuffer()),String(data.get('previousId')??'')||undefined,Object.fromEntries(['source','license','tags','market','audience','contentId'].filter(k=>data.has(k)).map(k=>[k,String(data.get(k))]))),{status:201})}catch(e){return fail(e)}}
function fail(e:unknown){return Response.json({error:e instanceof Error?e.message:'Request failed'},{status:e instanceof AccessError?e.status:e instanceof z.ZodError?400:500})}
