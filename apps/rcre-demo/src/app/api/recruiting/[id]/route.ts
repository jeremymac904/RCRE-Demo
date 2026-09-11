import {requireActor,AccessError} from '@/lib/platform/auth'
import {prospect,recruitAction} from '@/lib/platform/recruiting'
import {ZodError} from 'zod'
export const dynamic='force-dynamic'
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{return Response.json(prospect(await requireActor(),(await params).id))}catch(e){return fail(e)}}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)throw new AccessError('Origin mismatch');return Response.json(recruitAction(await requireActor(),(await params).id,await req.json()))}catch(e){return fail(e)}}
function fail(e:unknown){return Response.json({error:e instanceof Error?e.message:'Request failed'},{status:e instanceof AccessError?e.status:e instanceof ZodError?400:500})}
