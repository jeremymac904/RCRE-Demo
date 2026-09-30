import {requireActor,AccessError} from '@/lib/platform/auth'
import {listAdminAgentProfiles} from '@/lib/platform/agent-profiles'
export const dynamic='force-dynamic'
export async function GET(){
  try{const actor=await requireActor();return Response.json({profiles:listAdminAgentProfiles(actor),persistence:'local-development-only'},{headers:{'Cache-Control':'private, no-store'}})}
  catch(error){return Response.json({error:error instanceof Error?error.message:'Request failed'},{status:error instanceof AccessError?error.status:503})}
}
