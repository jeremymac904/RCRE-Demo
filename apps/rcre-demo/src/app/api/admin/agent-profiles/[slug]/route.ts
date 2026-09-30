import {requireActor,AccessError} from '@/lib/platform/auth'
import {saveAdminAgentProfile} from '@/lib/platform/agent-profiles'
export const dynamic='force-dynamic'
function fail(error:unknown){return Response.json({error:error instanceof Error?error.message:'Request failed'},{status:error instanceof AccessError?error.status:(error as {issues?:unknown})?.issues?400:503})}
export async function PATCH(request:Request,{params}:{params:Promise<{slug:string}>}){
  try{
    if(Number(request.headers.get('content-length')??0)>20000)throw new AccessError('Payload too large',413)
    const origin=request.headers.get('origin')
    if(origin&&new URL(origin).host!==request.headers.get('host'))throw new AccessError('Origin mismatch')
    const actor=await requireActor(),{slug}=await params,body=await request.json()
    return Response.json({profile:saveAdminAgentProfile(actor,slug,body),persistence:'local-development-only'})
  }catch(error){return fail(error)}
}
