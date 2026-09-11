import {requireActor,AccessError} from '@/lib/platform/auth'
import {hermesLifecycle} from '@/lib/services/hermes-runtime'
import {aiConfig} from '@/lib/services/ai'
import {audit} from '@/lib/platform/service'
export const dynamic='force-dynamic'
export async function GET(){try{return Response.json(await hermesLifecycle(await requireActor(),'status'))}catch(e){return fail(e)}}
export async function POST(req:Request){try{const a=await requireActor(),origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)throw new AccessError('Origin mismatch');const {action}=await req.json();if(!['start','stop'].includes(action))throw new AccessError('Choose start or stop',400);const result=await hermesLifecycle(a,action,aiConfig(a).model);audit(a,'hermes.'+action,result.state);return Response.json(result)}catch(e){return fail(e)}}
function fail(e:unknown){return Response.json({error:e instanceof Error?e.message:'Runtime unavailable'},{status:e instanceof AccessError?e.status:500})}
