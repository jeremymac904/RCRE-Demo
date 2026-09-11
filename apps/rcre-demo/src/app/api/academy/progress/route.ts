import { actorOrNull } from '@/lib/platform/auth'
import { progressFor, updateProgress } from '@/lib/academy-service'
export async function GET(){const a=await actorOrNull();return a?Response.json(progressFor(a)):Response.json({error:'Sign in required'},{status:401})}
export async function POST(req:Request){const a=await actorOrNull();if(!a)return Response.json({error:'Sign in required'},{status:401});try{return Response.json(updateProgress(a,await req.json()))}catch(e){return Response.json({error:(e as Error).message},{status:/unavailable/.test((e as Error).message)?403:400})}}
