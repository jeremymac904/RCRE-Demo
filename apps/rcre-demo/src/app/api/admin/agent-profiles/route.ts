import {requireActor,AccessError} from '@/lib/platform/auth'
import type { PlatformActor } from '@/lib/platform/auth'
import { recordCaughtRouteFailure } from '@/lib/operations/caught-route-failure'
import {listAdminAgentProfiles} from '@/lib/platform/agent-profiles'
import {listAdminAgentProfilesDurable} from '@/lib/platform/agent-profiles-durable'
import {isProduction} from '@/lib/config/env'
export const dynamic='force-dynamic'
export async function GET(request: Request){
  let actor: PlatformActor | null = null
  try{actor=await requireActor();const profiles=isProduction?await listAdminAgentProfilesDurable(actor):listAdminAgentProfiles(actor);return Response.json({profiles,persistence:isProduction?'postgres':'local-development-only'},{headers:{'Cache-Control':'private, no-store'}})}
  catch(error){const status=error instanceof AccessError?error.status:503;const response=Response.json({error:error instanceof Error?error.message:'Request failed'},{status});await recordCaughtRouteFailure(request,'/api/admin/agent-profiles',actor,status,error);return response}
}
