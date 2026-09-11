import {requireActor,AccessError} from '@/lib/platform/auth'
import {dayPlan,acceptDayBlock} from '@/lib/platform/day-plan'
export const dynamic='force-dynamic'
export async function GET(req:Request){try{return Response.json(dayPlan(await requireActor(),new URL(req.url).searchParams.get('day')??''))}catch(e){return fail(e)}}
export async function POST(req:Request){try{const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)throw new AccessError('Origin mismatch');const b=await req.json();return Response.json(acceptDayBlock(await requireActor(),b.day,b.key))}catch(e){return fail(e)}}
function fail(e:unknown){return Response.json({error:e instanceof Error?e.message:'Unable to plan day'},{status:e instanceof AccessError?e.status:400})}
