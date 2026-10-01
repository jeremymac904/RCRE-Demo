import {requireActor,AccessError} from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import {saveAdminAgentProfile} from '@/lib/platform/agent-profiles'
import {saveAdminAgentProfileDurable} from '@/lib/platform/agent-profiles-durable'
import {isProduction} from '@/lib/config/env'
export const dynamic='force-dynamic'
function fail(error:unknown){return Response.json({error:error instanceof Error?error.message:'Request failed'},{status:error instanceof AccessError?error.status:(error as {issues?:unknown})?.issues?400:503})}
export async function PATCH(request:Request,{params}:{params:Promise<{slug:string}>}){
  let actor: PlatformActor | null = null
  try{
    if(Number(request.headers.get('content-length')??0)>20000)throw new AccessError('Payload too large',413)
    const origin=request.headers.get('origin')
    if(origin&&new URL(origin).host!==request.headers.get('host'))throw new AccessError('Origin mismatch')
    actor=await requireActor();const {slug}=await params,body=await request.json()
    const profile=isProduction?await saveAdminAgentProfileDurable(actor,slug,body):saveAdminAgentProfile(actor,slug,body)
    return Response.json({profile,persistence:isProduction?'postgres':'local-development-only'})
  }catch(error){const response=fail(error);await recordCaughtRouteFailure(request,'/api/admin/agent-profiles/[slug]',actor,response.status,error);return response}
}
